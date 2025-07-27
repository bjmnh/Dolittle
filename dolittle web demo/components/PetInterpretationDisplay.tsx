
import React from 'react';

interface PetInterpretationDisplayProps {
  interpretation: string | null;
  title?: string;
}

export const PetInterpretationDisplay: React.FC<PetInterpretationDisplayProps> = ({ interpretation, title = "Gemini's Insights:" }) => {
  if (!interpretation) {
    return null;
  }

  return (
    <section aria-labelledby="interpretation-heading" className="mt-6 p-4 sm:p-6 bg-green-50 dark:bg-gray-700 border border-green-200 dark:border-gray-600 rounded-lg shadow">
      <h2 id="interpretation-heading" className="text-xl sm:text-2xl font-semibold text-green-700 dark:text-green-300 mb-3 sm:mb-4">
        {title}
      </h2>
      <div className="prose prose-sm sm:prose-base lg:prose-lg dark:prose-invert max-w-none text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
        {interpretation}
      </div>
    </section>
  );
};
