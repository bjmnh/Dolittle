
import { Pet, InterpretationLogEntry } from '../types';

const PETS_STORAGE_KEY = 'petInterpreterAi_pets';

export const loadPets = (): Pet[] => {
  try {
    const storedPets = localStorage.getItem(PETS_STORAGE_KEY);
    if (storedPets) {
      return JSON.parse(storedPets);
    }
  } catch (error) {
    console.error("Error loading pets from localStorage:", error);
  }
  return [];
};

export const savePets = (pets: Pet[]): void => {
  try {
    localStorage.setItem(PETS_STORAGE_KEY, JSON.stringify(pets));
  } catch (error)
    {
    console.error("Error saving pets to localStorage:", error);
  }
};

export const addPetToStorage = (newPetData: Omit<Pet, 'id' | 'interpretations' | 'createdAt' | 'thumbnailUrl'>): Pet => {
  const pets = loadPets();
  const newPet: Pet = {
    ...newPetData,
    id: Date.now().toString(),
    interpretations: [],
    createdAt: new Date().toISOString(),
  };
  const updatedPets = [...pets, newPet];
  savePets(updatedPets);
  return newPet;
};

export const updatePetInStorage = (petId: string, updates: Partial<Omit<Pet, 'id'>>): Pet | undefined => {
  let pets = loadPets();
  let updatedPet: Pet | undefined;
  const updatedPets = pets.map(p => {
    if (p.id === petId) {
      updatedPet = { ...p, ...updates };
      return updatedPet;
    }
    return p;
  });
  if (updatedPet) {
    savePets(updatedPets);
  }
  return updatedPet;
};


export const addInterpretationToPetInStorage = (petId: string, entryData: Omit<InterpretationLogEntry, 'id' | 'timestamp'>): Pet | undefined => {
  const pets = loadPets();
  let updatedPet: Pet | undefined;

  const newEntry: InterpretationLogEntry = {
    ...entryData,
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
  };

  const updatedPets = pets.map(p => {
    if (p.id === petId) {
      updatedPet = { ...p, interpretations: [...p.interpretations, newEntry].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) }; // Keep interpretations sorted
      return updatedPet;
    }
    return p;
  });

  if (updatedPet) {
    savePets(updatedPets);
  }
  return updatedPet;
};

export const getPetById = (petId: string): Pet | undefined => {
  const pets = loadPets();
  return pets.find(p => p.id === petId);
};

export const deletePetFromStorage = (petId: string): void => {
  const pets = loadPets();
  const updatedPets = pets.filter(p => p.id !== petId);
  savePets(updatedPets);
};
