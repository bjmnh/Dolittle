
let utterance: SpeechSynthesisUtterance | null = null;
let synth: SpeechSynthesis | null = null;

// Initialize synth only once and if supported
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  synth = window.speechSynthesis;
  utterance = new SpeechSynthesisUtterance();
  utterance.lang = 'en-US'; // Default language
  utterance.rate = 1.0; // Default rate
  utterance.pitch = 1.0; // Default pitch

  // Optional: Log available voices
  synth.onvoiceschanged = () => {
    const voices = synth?.getVoices();
    // console.log("Available voices:", voices);
    // You could set a preferred voice here if desired, e.g.:
    // const preferredVoice = voices.find(voice => voice.name === 'Google US English');
    // if (preferredVoice && utterance) utterance.voice = preferredVoice;
  };

} else {
  console.warn("Speech Synthesis not supported by this browser.");
}

export const speak = (text: string, lang: string = 'en-US', rate: number = 1.0): void => {
  if (!synth || !utterance) {
    console.warn("Speech synthesis not initialized or supported.");
    return;
  }

  // If speaking, cancel to avoid overlap, then speak new text
  if (synth.speaking) {
    synth.cancel(); 
  }

  utterance.text = text;
  utterance.lang = lang;
  utterance.rate = rate;
  
  // Workaround for a common issue where onvoiceschanged isn't fired reliably on some browsers
  // or voices are not immediately available.
  const voices = synth.getVoices();
  if (voices.length > 0 && utterance.voice == null) {
     const defaultVoice = voices.find(voice => voice.lang === lang && voice.default);
     if (defaultVoice) utterance.voice = defaultVoice;
     else {
        const firstVoiceForLang = voices.find(voice => voice.lang.startsWith(lang.substring(0,2))); // e.g. en-GB for en-US
        if(firstVoiceForLang) utterance.voice = firstVoiceForLang;
        // else console.log("No voice found for lang:", lang);
     }
  }


  synth.speak(utterance);
};

export const cancelSpeech = (): void => {
  if (synth && synth.speaking) {
    synth.cancel();
  }
};

export const isSpeaking = (): boolean => {
  return synth?.speaking || false;
};

// Optional: Functions to control speech parameters if needed later
export const setSpeechLang = (lang: string) => {
  if (utterance) utterance.lang = lang;
}

export const setSpeechRate = (rate: number) => {
  if (utterance) utterance.rate = Math.max(0.1, Math.min(rate, 10)); // Rate typically 0.1 to 10
}
