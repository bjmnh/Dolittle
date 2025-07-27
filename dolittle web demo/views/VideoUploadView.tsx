
import React, { useState, useEffect, useCallback } from 'react';
import { VideoUpload } from '../components/VideoUpload';
import { PetInterpretationDisplay } from '../components/PetInterpretationDisplay';
import { Loader } from '../components/Loader';
import { ErrorMessage } from '../components/ErrorMessage';
import { interpretPetVideo } from '../services/geminiService';
import { ViewName } from '../App';
import { Pet, InterpretationLogEntry } from '../types';

const DEFAULT_PROMPT = "Analyze this pet's behavior in the video. Describe its likely mood, interpret its body language, and suggest what it might be thinking or feeling. Focus on observable cues from the video. Provide a friendly and engaging summary.";

interface VideoUploadViewProps {
  navigateTo: (view: ViewName, petId?: string | null) => void;
  pets: Pet[];
  activePetId: string | null;
  addInterpretationToPet: (petId: string, entry: Omit<InterpretationLogEntry, 'id'|'timestamp'>) => void;
  addPet: (newPet: Omit<Pet, 'id' | 'interpretations' | 'createdAt'>) => Pet;
}

export const VideoUploadView: React.FC<VideoUploadViewProps> = ({ navigateTo, pets, activePetId, addInterpretationToPet, addPet }) => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState<string>(DEFAULT_PROMPT);
  const [interpretation, setInterpretation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPetIdForUpload, setSelectedPetIdForUpload] = useState<string | 'new'>(activePetId || 'new');


  useEffect(() => {
    if (videoFile) {
      const url = URL.createObjectURL(videoFile);
      setVideoPreviewUrl(url);
      // Try to infer pet if 'new' is selected and a video is uploaded (basic)
      // For a more robust solution, this would involve a call to identifyPetFromFrame
      // from a thumbnail of the video, and a modal to confirm.
      // For now, we'll keep it simple: user explicitly creates pets elsewhere or names it after interpretation.
      return () => URL.revokeObjectURL(url);
    }
    setVideoPreviewUrl(null);
  }, [videoFile]);

  const handleVideoSelect = useCallback((file: File) => {
    setVideoFile(file);
    setInterpretation(null);
    setError(null);
  }, []);

  const handleInterpretPet = useCallback(async () => {
    if (!videoFile) {
      setError("Please select a video file first.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setInterpretation(null);

    try {
      const result = await interpretPetVideo(videoFile, customPrompt);
      setInterpretation(result);

      // Basic association with pet - needs more robust UI for pet selection/creation
      if (selectedPetIdForUpload && selectedPetIdForUpload !== 'new') {
        addInterpretationToPet(selectedPetIdForUpload, {
          text: result,
          context: 'Uploaded Video',
          videoFileName: videoFile.name
        });
      } else if (selectedPetIdForUpload === 'new') {
        // Simplified: create a pet named "New Pet from Upload"
        // A proper flow would involve a modal to name and classify the pet.
        const newPet = addPet({ name: `Pet from ${videoFile.name.substring(0,20)}...` });
        addInterpretationToPet(newPet.id, {
          text: result,
          context: 'Uploaded Video',
          videoFileName: videoFile.name
        });
         // Optionally navigate or suggest navigating to the new pet's detail page
        // For now, just inform the user.
        console.log(`Interpretation for new pet ${newPet.name} saved.`);
      }

    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred during interpretation.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [videoFile, customPrompt, addInterpretationToPet, selectedPetIdForUpload, addPet]);

  return (
    <div className="container mx-auto w-full bg-white dark:bg-gray-800 shadow-2xl rounded-xl p-6 md:p-10 my-8 space-y-8">
      <button
        onClick={() => navigateTo('menu')}
        className="mb-6 text-blue-600 dark:text-blue-400 hover:underline flex items-center btn-focus-ring"
        aria-label="Back to Main Menu"
      >
        <ArrowLeftIcon className="w-5 h-5 mr-2" />
        Back to Menu
      </button>
      <header className="text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
          Interpret Uploaded Pet Video
        </h1>
        <p className="text-gray-600 dark:text-gray-300 text-lg">
          Upload a video of your pet and let Gemini reveal their secrets!
        </p>
      </header>

      {/* Simplified Pet Selection for now - will be expanded */}
      {pets.length > 0 && (
        <section className="space-y-3">
            <label htmlFor="petSelectionUpload" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Associate with Pet (Optional):
            </label>
            <select
                id="petSelectionUpload"
                value={selectedPetIdForUpload}
                onChange={(e) => setSelectedPetIdForUpload(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                disabled={isLoading}
            >
                <option value="new">New Pet (will be created)</option>
                {pets.map(pet => (
                    <option key={pet.id} value={pet.id}>{pet.name} ({pet.animalType || 'Unknown type'})</option>
                ))}
            </select>
        </section>
      )}


      <section className="space-y-4">
        <VideoUpload onVideoSelect={handleVideoSelect} disabled={isLoading} />
        {videoPreviewUrl && (
          <div className="mt-4 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden shadow-md">
            <video controls src={videoPreviewUrl} className="w-full max-h-96 aspect-video" title={videoFile?.name || 'Video preview'} aria-label="Video preview" />
          </div>
        )}
      </section>

      <section className="space-y-3">
        <label htmlFor="customPrompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          What do you want to ask about your pet in the video?
        </label>
        <textarea
          id="customPrompt"
          rows={4}
          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          disabled={isLoading}
          placeholder="e.g., What is my dog thinking?"
          aria-label="Custom prompt for Gemini AI"
        />
      </section>

      <button
        onClick={handleInterpretPet}
        disabled={!videoFile || isLoading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 flex items-center justify-center space-x-2 btn-focus-ring"
        aria-live="polite"
      >
        {isLoading ? (
          <>
            <Loader />
            <span>Interpreting Video...</span>
          </>
        ) : (
          <>
            <SparklesIcon className="w-5 h-5 mr-2"/>
            <span>Interpret Pet's Actions</span>
          </>
        )}
      </button>

      {error && <ErrorMessage message={error} />}
      {interpretation && !isLoading && (
        <PetInterpretationDisplay interpretation={interpretation} />
      )}
    </div>
  );
};


const ArrowLeftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

const SparklesIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L1.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09l2.846.813-.813 2.846a4.5 4.5 0 00-3.09 3.09zM18.25 12L17 13.75M18.25 12L17 10.25M18.25 12L19.5 11.25M18.25 12L19.5 12.75M12.75 15.5L12 18.25M12.75 15.5L13.5 14.25M12.75 15.5L11.25 14.75M12.75 15.5L12 12.75" />
    </svg>
);
