
import { GoogleGenAI, Part, GenerateContentResponse } from "@google/genai";

// IMPORTANT: The API key MUST be available as process.env.API_KEY in the execution environment.
const API_KEY = process.env.API_KEY;

let ai: GoogleGenAI | null = null;
if (API_KEY) {
  ai = new GoogleGenAI({ apiKey: API_KEY });
} else {
  console.error("Gemini API Key (API_KEY) is not configured in environment variables. Some features will be unavailable.");
}

const fileToGenerativePart = async (file: File): Promise<Part> => {
  const base64EncodedDataPromise = new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result.split(',')[1]);
      } else {
        reject(new Error("Failed to read file as base64 string."));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });

  try {
    const base64Data = await base64EncodedDataPromise;
    return {
      inlineData: {
        mimeType: file.type,
        data: base64Data,
      },
    };
  } catch (error) {
    console.error("Error converting file to generative part:", error);
    throw new Error(`Failed to process video file: ${file.name}. Please ensure it's a valid video format.`);
  }
};

const imageBase64ToGenerativePart = (base64Data: string, mimeType: string = 'image/jpeg'): Part => {
  return {
    inlineData: {
      mimeType: mimeType,
      data: base64Data,
    },
  };
};

const handleGeminiError = (error: unknown, customPrefix?: string): string => {
  console.error(`${customPrefix || "Error calling Gemini API"}:`, error);
  let errorMessage = "An unknown error occurred while communicating with the Gemini API.";
  if (error instanceof Error) {
    if (error.message.toLowerCase().includes("quota")) {
      errorMessage = "API request failed due to quota limits. Please check your Gemini API plan or try again later.";
    } else if (error.message.toLowerCase().includes("api key not valid") || error.message.toLowerCase().includes("invalid api key")) {
      errorMessage = "Invalid Gemini API Key. Please ensure the API_KEY environment variable is set correctly.";
    } else if (error.message.includes("Failed to process") || error.message.includes("The AI returned an empty")) {
      errorMessage = error.message;
    } else {
      errorMessage = `Failed to get response from Gemini: ${error.message}`;
    }
  }
  return errorMessage;
};

export async function interpretPetVideo(videoFile: File, prompt: string): Promise<string> {
  if (!ai) {
    throw new Error("Gemini API client is not initialized. Check API_KEY configuration.");
  }

  try {
    const videoPart = await fileToGenerativePart(videoFile);
    const textPart: Part = { text: prompt };

    const model = 'gemini-2.5-flash-preview-04-17';
    
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: { parts: [videoPart, textPart] },
    });

    const interpretationText = response.text;

    if (typeof interpretationText !== 'string' || interpretationText.trim() === '') {
      console.warn("Gemini API returned an empty or non-string response:", response);
      throw new Error("The AI returned an empty or unexpected response. Please try a different video or prompt.");
    }
    return interpretationText;

  } catch (error) {
    throw new Error(handleGeminiError(error, "Error interpreting pet video"));
  }
}

export async function identifyPetFromFrame(
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<{ animalType: string; breed: string; description: string }> {
  if (!ai) {
    throw new Error("Gemini API client is not initialized. Check API_KEY configuration.");
  }

  const GREETING_PROMPT = `Analyze the animal in this image.
Respond with a JSON object containing 'animalType', 'breed', and 'description'.
'animalType': Broad category (e.g., "Dog", "Cat", "Bird", "Fish", "Reptile", "Small Mammal", "Other").
'breed': Specific breed if identifiable (e.g., "Labrador Retriever", "Siamese", "Parakeet"), or "Mixed Breed" or "Unknown" if not clear. For non-standard pets, this can be more general (e.g., "Goldfish", "Bearded Dragon").
'description': A short, friendly, one-sentence description of the animal seen in the image.

Example:
{
  "animalType": "Dog",
  "breed": "Golden Retriever",
  "description": "A fluffy Golden Retriever is looking curiously at the camera."
}

If the image does not clearly show an animal, return:
{
  "animalType": "Unknown",
  "breed": "Unknown",
  "description": "No animal clearly identifiable in the image."
}
`;

  try {
    const imagePart = imageBase64ToGenerativePart(imageBase64, mimeType);
    const textPart: Part = { text: GREETING_PROMPT };
    
    const model = 'gemini-2.5-flash-preview-04-17';

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: { parts: [imagePart, textPart] },
      config: { responseMimeType: "application/json" }
    });
    
    let jsonStr = response.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }

    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.animalType && parsed.breed && parsed.description) {
        return parsed;
      } else {
        console.warn("Gemini API returned unexpected JSON structure for identification:", parsed);
        throw new Error("AI returned an incomplete identification. Please try a clearer image.");
      }
    } catch (e) {
      console.error("Failed to parse JSON response for identification:", e, "\nRaw response:", jsonStr);
      throw new Error("The AI's response for identification was not in the expected format. Please try again.");
    }

  } catch (error) {
    throw new Error(handleGeminiError(error, "Error identifying pet from frame"));
  }
}

export async function interpretLiveFrame(
  imageBase64: string,
  prompt: string,
  mimeType: string = 'image/jpeg'
): Promise<string> {
  if (!ai) {
    throw new Error("Gemini API client is not initialized. Check API_KEY configuration.");
  }

  try {
    const imagePart = imageBase64ToGenerativePart(imageBase64, mimeType);
    const textPart: Part = { text: prompt };
    
    const model = 'gemini-2.5-flash-preview-04-17';
    // Disable thinking for lower latency in live mode
    const config = { thinkingConfig: { thinkingBudget: 0 } };


    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: { parts: [imagePart, textPart] },
      config: config
    });

    const interpretationText = response.text;

    if (typeof interpretationText !== 'string' || interpretationText.trim() === '') {
      console.warn("Gemini API returned an empty or non-string response for live frame:", response);
      return "The AI didn't provide a specific observation for this moment."; // Return a softer message for live mode
    }
    return interpretationText;

  } catch (error) {
     console.error("Error interpreting live frame:", error);
     // For live mode, we might not want to throw a blocking error for every frame.
     // Instead, return a message indicating an issue for that specific frame.
     return `Error from AI: ${error instanceof Error ? error.message.substring(0, 100) : "Communication issue"}`;
  }
}
