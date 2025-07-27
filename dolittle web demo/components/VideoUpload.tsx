
import React, { useRef, useState, DragEvent } from 'react';

interface VideoUploadProps {
  onVideoSelect: (file: File) => void;
  disabled: boolean;
}

export const VideoUpload: React.FC<VideoUploadProps> = ({ onVideoSelect, disabled }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onVideoSelect(file);
    }
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const handleDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    if (!disabled) {
      setIsDragging(false);
      const file = event.dataTransfer.files?.[0];
      if (file) {
        onVideoSelect(file);
      }
    }
  };

  return (
    <div className="w-full">
      <label
        htmlFor="video-upload-input"
        className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer 
                    ${disabled ? 'bg-gray-200 dark:bg-gray-700 cursor-not-allowed' : 
                                 isDragging ? 'bg-blue-50 dark:bg-blue-900 border-blue-400 dark:border-blue-600' : 
                                            'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border-gray-300 dark:border-gray-500'}
                    transition-colors duration-150 ease-in-out`}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        aria-disabled={disabled}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick();}}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
          <svg className={`w-10 h-10 mb-3 ${disabled ? 'text-gray-400 dark:text-gray-500' : 'text-gray-500 dark:text-gray-400'}`} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
          <p className={`mb-2 text-sm ${disabled ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-300'}`}>
            <span className="font-semibold">Click to upload video</span> or drag and drop
          </p>
          <p className={`text-xs ${disabled ? 'text-gray-400 dark:text-gray-500' : 'text-gray-500 dark:text-gray-400'}`}>
            MP4, MOV, WEBM, AVI (Max 50MB recommended)
          </p>
        </div>
        <input
          id="video-upload-input"
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled}
        />
      </label>
    </div>
  );
};
