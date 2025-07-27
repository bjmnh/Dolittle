
export interface InterpretationLogEntry {
  id: string;
  timestamp: string;
  text: string;
  context: 'Uploaded Video' | 'Live Interpretation' | 'Identification';
  videoFileName?: string; // For uploaded videos
}

export interface Pet {
  id: string;
  name: string;
  animalType?: string; // e.g., Dog, Cat
  breed?: string;      // e.g., Labrador Retriever
  thumbnailUrl?: string; // Base64 data URL for a representative image
  interpretations: InterpretationLogEntry[];
  createdAt: string;
}

// Ensures this file is treated as a module if no other exports exist.
// export {}; // Not needed if interfaces are exported
