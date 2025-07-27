
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ViewName } from '../App';
import { Pet, InterpretationLogEntry } from '../types';
import { identifyPetFromFrame, interpretLiveFrame } from '../services/geminiService';
import { speak, cancelSpeech, isSpeaking } from '../services/speechService';
import { Loader } from '../components/Loader';
import { ErrorMessage } from '../components/ErrorMessage';

interface LiveVideoViewProps {
  navigateTo: (view: ViewName, petId?: string | null) => void;
  pets: Pet[];
  activePetId: string | null;
  addPet: (newPetData: Omit<Pet, 'id' | 'interpretations' | 'createdAt'>) => Pet;
  updatePet: (petId: string, updates: Partial<Pet>) => void;
  addInterpretationToPet: (petId: string, entry: Omit<InterpretationLogEntry, 'id' | 'timestamp'>) => void;
}

const LIVE_INTERPRETATION_INTERVAL = 5000; // ms - How often to send a frame for interpretation
const PET_IDENTIFICATION_PROMPT = "Describe what this pet is doing or feeling right now. This is a live view. Be concise and friendly.";
const NEW_PET_PROMPT_LIVE = "I'm observing this pet live. What might it be doing or feeling right now? Give a short, friendly observation.";


export const LiveVideoView: React.FC<LiveVideoViewProps> = ({ navigateTo, pets, activePetId, addPet, updatePet, addInterpretationToPet }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraOn, setIsCameraOn] = useState<boolean>(false);
  const [currentLiveInterpretation, setCurrentLiveInterpretation] = useState<string>('');
  const [interpretationLog, setInterpretationLog] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isIdentifying, setIsIdentifying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [identifiedPetInfo, setIdentifiedPetInfo] = useState<{ animalType?: string; breed?: string; description?: string } | null>(null);
  const [petName, setPetName] = useState<string>('');
  const [currentManagingPetId, setCurrentManagingPetId] = useState<string | null>(activePetId);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const interpretationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startCamera = async () => {
    setError(null);
    setCurrentLiveInterpretation('');
    setInterpretationLog([]);
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setIsCameraOn(true);
        if (!currentManagingPetId) { // If no pet is selected, prompt for identification first
            // No automatic identification on start, user must click "Identify Pet"
        } else {
            startLiveInterpretation();
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setError("Could not access camera. Please ensure permission is granted and no other app is using it.");
        setIsCameraOn(false);
      }
    } else {
      setError("Camera access is not supported by your browser.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setStream(null);
    setIsCameraOn(false);
    if (interpretationIntervalRef.current) {
      clearInterval(interpretationIntervalRef.current);
      interpretationIntervalRef.current = null;
    }
    cancelSpeech(); // Stop any ongoing speech
    // Don't clear pet info here, user might still want to save
  };
  
  useEffect(() => {
    // Cleanup camera on component unmount
    return () => {
      stopCamera();
    };
  }, []);


  const captureFrameAsBase64 = (): string | null => {
    if (videoRef.current && canvasRef.current && isCameraOn) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.8).split(',')[1]; // Get base64 part
      }
    }
    return null;
  };

  const handleIdentifyPet = async () => {
    setError(null);
    setIdentifiedPetInfo(null);
    const frame = captureFrameAsBase64();
    if (!frame) {
      setError("Could not capture frame from video.");
      return;
    }
    setIsIdentifying(true);
    try {
      const result = await identifyPetFromFrame(frame);
      setIdentifiedPetInfo(result);
      // Pre-fill name if a simple description is available
      if (result.animalType && result.animalType !== "Unknown") {
        setPetName(result.animalType); // Default name proposal
      } else {
        setPetName("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to identify pet.");
    } finally {
      setIsIdentifying(false);
    }
  };
  
  const handleSaveIdentifiedPet = () => {
    if (!identifiedPetInfo || !petName.trim()) {
      setError("Please provide a name for your pet.");
      return;
    }
    setError(null);
    const newPet = addPet({
      name: petName.trim(),
      animalType: identifiedPetInfo.animalType,
      breed: identifiedPetInfo.breed,
      // thumbnailUrl: captureFrameAsBase64() // Optional: save current frame as thumbnail
    });
    addInterpretationToPet(newPet.id, {
        text: `Identified as ${identifiedPetInfo.animalType || 'Unknown type'}${identifiedPetInfo.breed ? ` (${identifiedPetInfo.breed})` : ''}. Description: ${identifiedPetInfo.description}`,
        context: 'Identification'
    });
    setCurrentManagingPetId(newPet.id);
    setIdentifiedPetInfo(null); // Clear identification form
    setPetName('');
    startLiveInterpretation(); // Start interpreting for the newly saved pet
  };

  const startLiveInterpretation = useCallback(() => {
    if (interpretationIntervalRef.current) {
      clearInterval(interpretationIntervalRef.current);
    }
    if (!currentManagingPetId && !identifiedPetInfo) { // Don't start if no pet and not actively identifying
        return;
    }

    interpretationIntervalRef.current = setInterval(async () => {
      if (!isCameraOn || !videoRef.current?.srcObject) {
        if(interpretationIntervalRef.current) clearInterval(interpretationIntervalRef.current);
        return;
      }
      const frame = captureFrameAsBase64();
      if (frame) {
        try {
          setIsLoading(true);
          const prompt = currentManagingPetId ? PET_IDENTIFICATION_PROMPT : NEW_PET_PROMPT_LIVE;
          const interpretationText = await interpretLiveFrame(frame, prompt);
          setCurrentLiveInterpretation(interpretationText);
          setInterpretationLog(prevLog => [interpretationText, ...prevLog.slice(0, 99)]); // Keep last 100 entries
          if (currentManagingPetId) {
            addInterpretationToPet(currentManagingPetId, { text: interpretationText, context: 'Live Interpretation' });
          }
          if (!isMuted) {
            speak(interpretationText);
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : "Error during live interpretation.";
          setCurrentLiveInterpretation(message);
          setError(message); // Show error for this frame
        } finally {
            setIsLoading(false);
        }
      }
    }, LIVE_INTERPRETATION_INTERVAL);
  }, [isCameraOn, currentManagingPetId, identifiedPetInfo, isMuted, addInterpretationToPet]);


  useEffect(() => {
    if (isCameraOn && (currentManagingPetId || identifiedPetInfo)) { // Start if camera on and pet selected or in identification process
        startLiveInterpretation();
    } else {
        if (interpretationIntervalRef.current) {
            clearInterval(interpretationIntervalRef.current);
            interpretationIntervalRef.current = null;
        }
    }
    return () => {
        if (interpretationIntervalRef.current) {
            clearInterval(interpretationIntervalRef.current);
        }
    };
  }, [isCameraOn, currentManagingPetId, identifiedPetInfo, startLiveInterpretation]);


  const selectExistingPet = (petId: string) => {
    setCurrentManagingPetId(petId);
    setIdentifiedPetInfo(null); // Clear any new pet identification flow
    setPetName('');
    setError(null);
    setInterpretationLog([]); // Clear log for new pet context
    setCurrentLiveInterpretation('');
    if (isCameraOn) {
        startLiveInterpretation();
    }
  };

  return (
    <div className="container mx-auto w-full bg-white dark:bg-gray-800 shadow-2xl rounded-xl p-6 md:p-10 my-8 space-y-6">
      <button onClick={() => { stopCamera(); navigateTo('menu');}} className="mb-4 text-blue-600 dark:text-blue-400 hover:underline flex items-center btn-focus-ring">
        <ArrowLeftIcon className="w-5 h-5 mr-2" /> Back to Menu
      </button>
      <header className="text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">Live Pet Cam</h1>
        <p className="text-gray-600 dark:text-gray-300 text-lg">Get real-time AI insights about your pet!</p>
      </header>

      {error && <ErrorMessage message={error} />}

      {/* Pet Selection/Creation Section */}
      {!isCameraOn && (
        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3">
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">Choose Pet for Live Session:</h2>
          <select
            value={currentManagingPetId || ""}
            onChange={(e) => e.target.value ? selectExistingPet(e.target.value) : setCurrentManagingPetId(null)}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">-- Select an Existing Pet --</option>
            {pets.map(p => <option key={p.id} value={p.id}>{p.name} ({p.animalType || 'Unknown'})</option>)}
          </select>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 my-2">Or, start the camera and click "Identify New Pet" below.</p>
        </div>
      )}


      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Video and Controls */}
        <div className="space-y-4">
          <div className="aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden shadow-inner relative">
            <video ref={videoRef} playsInline autoPlay muted={isCameraOn} className="w-full h-full object-cover" aria-label="Live camera feed of your pet"></video>
            {!isCameraOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <p className="text-white text-lg">Camera is off</p>
              </div>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" aria-hidden="true"></canvas>

          <div className="flex flex-wrap gap-2 justify-center">
            {!isCameraOn ? (
              <button onClick={startCamera} className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg shadow btn-focus-ring flex items-center">
                <CameraIcon className="w-5 h-5 mr-2"/> Start Camera
              </button>
            ) : (
              <button onClick={stopCamera} className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg shadow btn-focus-ring flex items-center">
                <NoCameraIcon className="w-5 h-5 mr-2"/> Stop Camera
              </button>
            )}
             {isCameraOn && (
                <button onClick={() => setIsMuted(!isMuted)} className={`${isMuted ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-indigo-500 hover:bg-indigo-600'} text-white font-semibold py-2 px-4 rounded-lg shadow btn-focus-ring flex items-center`} aria-pressed={isMuted}>
                {isMuted ? <VolumeOffIcon className="w-5 h-5 mr-2"/> : <VolumeUpIcon className="w-5 h-5 mr-2"/>}
                {isMuted ? 'Unmute Speech' : 'Mute Speech'}
              </button>
             )}
          </div>
           {isCameraOn && !currentManagingPetId && !identifiedPetInfo && (
             <button onClick={handleIdentifyPet} disabled={isIdentifying} className="w-full mt-2 bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg shadow btn-focus-ring flex items-center justify-center">
                {isIdentifying ? <><Loader/> Identifying...</> : <><SearchIcon className="w-5 h-5 mr-2"/>Identify New Pet</>}
            </button>
           )}
        </div>
        
        {/* Identification and Interpretation Log */}
        <div className="space-y-4">
          {identifiedPetInfo && !currentManagingPetId && (
            <div className="p-4 border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-gray-700 rounded-lg space-y-3 shadow">
              <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-300">New Pet Details:</h3>
              <p><strong>Type:</strong> {identifiedPetInfo.animalType || 'N/A'}</p>
              <p><strong>Breed:</strong> {identifiedPetInfo.breed || 'N/A'}</p>
              <p><strong>Description:</strong> {identifiedPetInfo.description || 'N/A'}</p>
              <input
                type="text"
                value={petName}
                onChange={(e) => setPetName(e.target.value)}
                placeholder="Enter Pet Name"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-600 dark:text-white"
                aria-label="Pet name input"
              />
              <button onClick={handleSaveIdentifiedPet} className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-3 rounded-lg shadow btn-focus-ring">
                Save Pet & Start Interpreting
              </button>
            </div>
          )}
          
          {(isCameraOn && (currentManagingPetId || identifiedPetInfo)) && (
            <div className="p-4 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 rounded-lg shadow h-96 flex flex-col">
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2 flex items-center">
                <SparklesIcon className="w-5 h-5 mr-2 text-yellow-500"/>
                Live Insights {currentManagingPetId && pets.find(p=>p.id === currentManagingPetId) ? `for ${pets.find(p=>p.id === currentManagingPetId)?.name}` : (petName ? `for ${petName}` : '')}
                {isLoading && <Loader/>}
              </h3>
              {currentLiveInterpretation && (
                <p className="text-blue-600 dark:text-blue-400 font-semibold text-md mb-2 p-2 bg-blue-50 dark:bg-gray-600 rounded">
                  {currentLiveInterpretation}
                </p>
              )}
              <div className="flex-grow overflow-y-auto space-y-2 text-sm pr-2">
                {interpretationLog.map((log, index) => (
                  <p key={index} className={`p-2 rounded ${index === 0 ? 'bg-opacity-20' : 'bg-opacity-5'} dark:bg-opacity-20 dark:text-gray-300 text-gray-600`}>
                    {log}
                  </p>
                ))}
                {interpretationLog.length === 0 && !currentLiveInterpretation && (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-10">Waiting for first interpretation...</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Icons (reuse or create new ones)
const ArrowLeftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);
const CameraIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
  </svg>
);
const NoCameraIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
 <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z" />
  <path stroke-linecap="round" stroke-linejoin="round" d="M1.5 1.5l21 21" />
</svg>
);
const VolumeUpIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
  </svg>
);
const VolumeOffIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
 <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" >
  <path stroke-linecap="round" stroke-linejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
</svg>
);
const SearchIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6" />
  </svg>
);
const SparklesIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L1.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09l2.846.813-.813 2.846a4.5 4.5 0 00-3.09 3.09zM18.25 12L17 13.75M18.25 12L17 10.25M18.25 12L19.5 11.25M18.25 12L19.5 12.75M12.75 15.5L12 18.25M12.75 15.5L13.5 14.25M12.75 15.5L11.25 14.75M12.75 15.5L12 12.75" />
    </svg>
);
