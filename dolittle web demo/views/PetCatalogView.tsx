
import React, { useState } from 'react';
import { ViewName } from '../App';
import { Pet } from '../types';
import { deletePetFromStorage } from '../services/localStorageService'; // For delete functionality

interface PetCatalogViewProps {
  navigateTo: (view: ViewName, petId?: string | null) => void;
  pets: Pet[];
}

export const PetCatalogView: React.FC<PetCatalogViewProps> = ({ navigateTo, pets: initialPets }) => {
  const [pets, setPets] = useState<Pet[]>(initialPets);
  const [searchTerm, setSearchTerm] = useState('');

  const handleDeletePet = (petId: string) => {
    if (window.confirm("Are you sure you want to delete this pet and all its interpretations? This action cannot be undone.")) {
      deletePetFromStorage(petId);
      setPets(currentPets => currentPets.filter(p => p.id !== petId));
    }
  };

  const filteredPets = pets.filter(pet =>
    pet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pet.animalType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pet.breed?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto w-full bg-white dark:bg-gray-800 shadow-2xl rounded-xl p-6 md:p-10 my-8 space-y-6">
      <button onClick={() => navigateTo('menu')} className="mb-4 text-blue-600 dark:text-blue-400 hover:underline flex items-center btn-focus-ring">
        <ArrowLeftIcon className="w-5 h-5 mr-2"/> Back to Menu
      </button>
      <header className="text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">My Pets Catalog</h1>
        <p className="text-gray-600 dark:text-gray-300 text-lg">View and manage your beloved pets and their AI insights.</p>
      </header>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search pets by name, type, or breed..."
          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Search pets"
        />
      </div>

      {filteredPets.length === 0 ? (
        <div className="text-center py-10">
          <NoPetsIcon className="w-24 h-24 mx-auto text-gray-400 dark:text-gray-500 mb-4"/>
          <p className="text-xl text-gray-500 dark:text-gray-400">No pets found in your catalog.</p>
          {pets.length > 0 && searchTerm && <p className="text-md text-gray-400 dark:text-gray-500 mt-2">Try a different search term.</p>}
          <p className="mt-4">
            You can add new pets through the <button onClick={() => navigateTo('live')} className="text-blue-500 hover:underline">Live Pet Cam</button> or when interpreting an <button onClick={() => navigateTo('upload')} className="text-blue-500 hover:underline">Uploaded Video</button>.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPets.map((pet) => (
            <div key={pet.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg shadow-md p-5 hover:shadow-lg transition-shadow duration-200 flex flex-col justify-between">
              <div>
                <h2 className="text-xl font-semibold text-blue-600 dark:text-blue-400 mb-1">{pet.name}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {pet.animalType || 'Unknown Type'}
                  {pet.breed && pet.breed !== 'Unknown' ? ` - ${pet.breed}` : ''}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Added: {new Date(pet.createdAt).toLocaleDateString()}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Interpretations: {pet.interpretations.length}
                </p>
              </div>
              <div className="mt-4 flex justify-between items-center space-x-2">
                <button
                  // onClick={() => navigateTo('petDetail', pet.id)} // Future: Navigate to detail view
                  onClick={() => alert(`Pet Detail View for ${pet.name} (ID: ${pet.id}) - To be implemented. Number of interpretations: ${pet.interpretations.length}`)}
                  className="flex-1 text-sm bg-blue-500 hover:bg-blue-600 text-white py-2 px-3 rounded-md transition-colors btn-focus-ring text-center"
                  aria-label={`View details for ${pet.name}`}
                >
                  View Details
                </button>
                 <button
                  onClick={() => handleDeletePet(pet.id)}
                  className="text-sm bg-red-500 hover:bg-red-600 text-white py-2 px-3 rounded-md transition-colors btn-focus-ring"
                  aria-label={`Delete ${pet.name}`}
                >
                  <TrashIcon className="w-4 h-4"/>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ArrowLeftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

const NoPetsIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 16.318A4.5 4.5 0 0018 15.75a4.5 4.5 0 00-3.956-4.434l-2.542-2.541M12.735 3.762A4.5 4.5 0 0118 6.75v2.96M6.318 15.182A4.5 4.5 0 013.75 12a4.5 4.5 0 013.139-4.238L12 12m0 0l6.861 6.861M21 3l-6 6m-3.45-3.45L3 13.05M21 21L3 3" />
  </svg>
);

const TrashIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props}  xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12.56 0c1.153 0 2.24.03 3.22.077m3.22-.077L10.879 3.282a1.5 1.5 0 00-1.348-.994H8.67c-.694 0-1.298.378-1.568.995L5.12 5.79m14.456 0H2.568" />
    </svg>
);
