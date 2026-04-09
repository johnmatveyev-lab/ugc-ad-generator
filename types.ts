// FIX: Add and export the User interface for authentication purposes.
export interface User {
  name: string;
  email: string;
  avatarUrl: string;
  usageCount: number;
  isPremium: boolean;
}

export interface SoraPromptObject {
  description: string;
  style: string;
  cinematography: string;
  lighting: string;
  mood: string;
  aspectRatio: string;
}

export interface ViralityScores {
  virality: number;
  hookRate: number;
  engagementPotential: number;
}

export interface GeneratedPrompts {
  soraPrompt: SoraPromptObject;
  imagenPrompt: string;
  transcript: string;
  suggestedRemix: string;
  viralityScore: ViralityScores;
  viralityAnalysis: string;
  transcriptContinuation: string;
  sunoPrompt: string;
}

// The full result from the initial analysis call
export interface InitialGenerationResult {
  projectName: string;
  soraPrompt: string;
  imagenPrompt: string;
  transcript: string;
  viralityAnalysis: string;
  viralityScore: ViralityScores;
}

export interface Scene {
  id: string;
  prompt: string;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  thumbnail: string | null; // base64 string
  prompts: GeneratedPrompts;
  
  previousScenes: Scene[];
  nextScenes: Scene[];

  music?: {
    prompt: string;
    url: string;
  }

  voiceover?: {
    transcript: string;
    url: string;
  }
  
  video?: {
    key: string; // Key to retrieve from IndexedDB
    veoVideoObject: any; // The raw video object from Veo API response, for extensions
  }
  
  // FIX: Add properties for tracking generated video assets.
  hasMainSceneVideo?: boolean;
  hasIntro?: boolean;
  hasOutro?: boolean;
}

export interface AllAssetsTextResult extends InitialGenerationResult {}

export interface GeneratedAssets {
  videoUrl: string;
  audioUrl: string;
  thumbnailUrl: string;
  script: string;
  projectName: string;
  transcript: string;
  analysis: string;
  veoVideoObject: any;
  viralityScore: ViralityScores;
  thumbnailB64: string;
}

export type TranscriptMessage = {
  speaker: 'user' | 'ai';
  text: string;
  isFinal?: boolean;
};
