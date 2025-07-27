
import React, { useState, useEffect, useCallback } from 'react';
import { VideoUploadView } from './views/VideoUploadView'; // Renamed for clarity
import { MainMenu } from './views/MainMenu';
import { LiveVideoView } from './views/LiveVideoView';
import { PetCatalogView } from './views/PetCatalogView';
import { Pet, InterpretationLogEntry } from './types';
import { loadPets, savePets } from './services/localStorageService';

export type ViewName = 'menu' | 'upload' | 'live' | 'catalog' | 'petDetail';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewName>('menu');
  const [pets, setPets] = useState<Pet[]>([]);
  const [activePetId, setActivePetId] = useState<string | null>(null); // For context in views

  useEffect(() => {
    setPets(loadPets());
  }, []);

  const handleSavePets = useCallback((updatedPets: Pet[]) => {
    setPets(updatedPets);
    savePets(updatedPets);
  }, []);

  const addPet = useCallback((newPet: Omit<Pet, 'id' | 'interpretations' | 'createdAt'>) => {
    const petWithId: Pet = {
      ...newPet,
      id: Date.now().toString(),
      interpretations: [],
      createdAt: new Date().toISOString(),
    };
    const updatedPets = [...pets, petWithId];
    handleSavePets(updatedPets);
    return petWithId;
  }, [pets, handleSavePets]);

  const updatePet = useCallback((petId: string, updates: Partial<Pet>) => {
    const updatedPets = pets.map(p => p.id === petId ? { ...p, ...updates } : p);
    handleSavePets(updatedPets);
  }, [pets, handleSavePets]);

  const addInterpretationToPet = useCallback((petId: string, entry: Omit<InterpretationLogEntry, 'id' | 'timestamp'>) => {
    const newEntry: InterpretationLogEntry = {
      ...entry,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    };
    const updatedPets = pets.map(p => {
      if (p.id === petId) {
        return { ...p, interpretations: [...p.interpretations, newEntry] };
      }
      return p;
    });
    handleSavePets(updatedPets);
  }, [pets, handleSavePets]);


  const navigateTo = (view: ViewName, petId: string | null = null) => {
    setCurrentView(view);
    setActivePetId(petId);
  };

  const renderView = () => {
    switch (currentView) {
      case 'menu':
        return <MainMenu navigateTo={navigateTo} />;
      case 'upload':
        return <VideoUploadView navigateTo={navigateTo} pets={pets} activePetId={activePetId} addInterpretationToPet={addInterpretationToPet} addPet={addPet} />;
      case 'live':
        return <LiveVideoView navigateTo={navigateTo} pets={pets} activePetId={activePetId} addPet={addPet} updatePet={updatePet} addInterpretationToPet={addInterpretationToPet} />;
      case 'catalog':
        return <PetCatalogView navigateTo={navigateTo} pets={pets} />;
      // case 'petDetail':
      //   const pet = pets.find(p => p.id === activePetId);
      //   return pet ? <PetDetailView pet={pet} navigateTo={navigateTo} /> : <ErrorMessage message="Pet not found." />;
      default:
        return <MainMenu navigateTo={navigateTo} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-0 sm:p-4 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300 bg-pattern">
      {/* Header can be global or view-specific */}
      <div className="w-full max-w-4xl mx-auto">
         {renderView()}
      </div>
      <footer className="text-center py-6 text-sm text-gray-500 dark:text-gray-400 w-full">
        <p>&copy; {new Date().getFullYear()} Pet Interpreter AI. Powered by Gemini.</p>
      </footer>
    </div>
  );
};

export default App;
