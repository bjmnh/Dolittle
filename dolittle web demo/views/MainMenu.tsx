
import React from 'react';
import { ViewName } from '../App'; // Assuming App exports ViewName

interface MainMenuProps {
  navigateTo: (view: ViewName) => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ navigateTo }) => {
  const menuItems = [
    { id: 'upload', label: 'Upload Pet Video', icon: UploadIcon, view: 'upload' as ViewName, description: "Analyze a pre-recorded video of your pet." },
    { id: 'live', label: 'Live Pet Cam', icon: LiveIcon, view: 'live' as ViewName, description: "Get real-time insights from your pet's camera feed." },
    { id: 'catalog', label: 'My Pets Catalog', icon: CatalogIcon, view: 'catalog' as ViewName, description: "View and manage your cataloged pets and their interpretation history." },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-150px)] p-4 sm:p-8">
      <header className="text-center mb-10 sm:mb-12">
        <h1 className="text-4xl sm:text-5xl font-bold text-blue-600 dark:text-blue-400 mb-3">
          Pet Interpreter AI
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-xl mx-auto">
          Unlock the secrets of your furry, scaly, or feathered friends! Choose an option below to get started.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 w-full max-w-4xl">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => navigateTo(item.view)}
            className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 btn-focus-ring"
            aria-label={`Navigate to ${item.label}`}
          >
            <div className="flex flex-col items-center text-center">
              <item.icon className="w-12 h-12 text-blue-500 dark:text-blue-400 mb-4" />
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">{item.label}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">{item.description}</p>
            </div>
          </button>
        ))}
      </div>
       <button
        onClick={() => {
            const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
            if (currentTheme === 'dark') {
                document.documentElement.classList.remove('dark');
                localStorage.theme = 'light';
            } else {
                document.documentElement.classList.add('dark');
                localStorage.theme = 'dark';
            }
        }}
        className="mt-12 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors btn-focus-ring"
        aria-label="Toggle dark mode"
        >
        Toggle Theme
        </button>
    </div>
  );
};

// SVG Icons (simple placeholders, consider more elaborate ones)
const UploadIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);

const LiveIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const CatalogIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
  </svg>
);
