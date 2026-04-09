
import { GoogleGenAI, Type, Modality, LiveServerMessage, FunctionDeclaration, Blob, LiveSessionCallbacks } from "@google/genai";
import type { AllAssetsTextResult } from '../types';

// Helper to create a new GoogleGenAI instance.
// A new instance is created for each call to ensure the latest API key is used,
// especially for Veo models where the user can select a key at runtime.
function getAi() {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("API_KEY environment variable is not set.");
    }
    return new GoogleGenAI({ apiKey });
}

// --- Audio Encoding/Decoding ---

function decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

function encode(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

export function createPcmBlob(data: Float32Array): Blob {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        int16[i] = data[i] * 32768;
    }
    return {
        data: encode(new Uint8Array(int16.buffer)),
        mimeType: 'audio/pcm;rate=16000',
    };
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

export async function playAudio(base64Audio: string, audioContext: AudioContext, onEnded?: () => void): Promise<AudioBufferSourceNode> {
    const audioBytes = decode(base64Audio);
    const audioBuffer = await decodeAudioData(audioBytes, audioContext, 24000, 1);
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    if (onEnded) {
        source.addEventListener('ended', onEnded);
    }
    return source;
}


// --- Text-to-Speech Generation ---

export async function generateSpeechFromText(text: string, systemInstruction?: string): Promise<string> {
    const ai = getAi();
    const contents = systemInstruction ? [{ parts: [{ text: `${systemInstruction}: ${text}` }] }] : [{ parts: [{ text }] }];
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents,
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
        },
    });

    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioData) {
        throw new Error("No audio data returned from API.");
    }
    return audioData;
}

export async function generateSpeechAudioUrl(text: string, systemInstruction?: string): Promise<string> {
    const base64Audio = await generateSpeechFromText(text, systemInstruction);
    const audioBytes = decode(base64Audio);
    const audioBlob = new window.Blob([audioBytes], { type: 'audio/pcm' });
    return URL.createObjectURL(audioBlob);
}


// --- Image Generation ---

export async function generateImageWithImagen(prompt: string): Promise<string> {
    const ai = getAi();
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: '9:16',
        },
    });

    const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
    if (!imageBytes) {
        throw new Error("Image generation failed to return data.");
    }
    return imageBytes;
}

export async function editImageWithNano(base64ImageData: string, mimeType: string, prompt: string): Promise<string> {
    const ai = getAi();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { inlineData: { data: base64ImageData, mimeType } },
                { text: prompt },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return part.inlineData.data;
        }
    }
    throw new Error("Image editing failed to return a new image.");
}

// --- Video Generation ---

async function pollVideoOperation(operation: any) {
    const ai = getAi();
    let polledOperation = operation;
    while (!polledOperation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        polledOperation = await ai.operations.getVideosOperation({ operation: polledOperation });
    }
    return polledOperation;
}

export async function generateVideoWithVeo(prompt: string, model: 'veo-3.1-fast-generate-preview' | 'veo-3.1-generate-preview', onProgress: (message: string) => void) {
    onProgress('Sending request to Veo...');
    const ai = getAi();
    let operation = await ai.models.generateVideos({
        model,
        prompt,
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: '9:16',
        }
    });

    onProgress('Generating video, this may take a few minutes...');
    operation = await pollVideoOperation(operation);

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
        const err = operation.error || {message: 'Video generation operation did not return a download link.'};
        throw new Error(err.message);
    }
    
    onProgress('Downloading video...');
    const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    if (!videoResponse.ok) {
        throw new Error(`Failed to download video: ${videoResponse.statusText}`);
    }
    const videoBlob = await videoResponse.blob();
    const file = new File([videoBlob], "generated-video.mp4", { type: "video/mp4" });
    const url = URL.createObjectURL(file);
    
    return {
        url,
        veoVideoObject: operation.response?.generatedVideos?.[0]?.video,
        file,
    };
}

export async function extendVideoWithVeo(previousVideo: any, prompt: string, onProgress: (message: string) => void) {
    onProgress('Sending remix request...');
    const ai = getAi();
    let operation = await ai.models.generateVideos({
        model: 'veo-3.1-generate-preview',
        prompt,
        video: previousVideo,
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: previousVideo?.aspectRatio || '9:16',
        }
    });

    onProgress('Remixing video, this may take a few minutes...');
    operation = await pollVideoOperation(operation);
    
    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
        const err = operation.error || {message: 'Video remix operation did not return a download link.'};
        throw new Error(err.message);
    }

    onProgress('Downloading remixed video...');
    const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    if (!videoResponse.ok) {
        throw new Error(`Failed to download video: ${videoResponse.statusText}`);
    }
    const videoBlob = await videoResponse.blob();
    const file = new File([videoBlob], "remixed-video.mp4", { type: "video/mp4" });
    const url = URL.createObjectURL(file);

    return {
        url,
        veoVideoObject: operation.response?.generatedVideos?.[0]?.video,
        file,
    };
}

// --- Complex Text Generation ---

export async function generateNextStepSuggestions(originalScript: string): Promise<{ nextScenePrompt: string; newProductAdConcept: string; }> {
    const ai = getAi();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Given the following ad script, generate two creative suggestions: 
        1. A prompt for a follow-up scene that continues the story.
        2. A completely new, short, high-level concept for a different ad for the same (unspecified) product.
        
        Original Script: "${originalScript}"
        
        Return a JSON object with keys "nextScenePrompt" and "newProductAdConcept".`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    nextScenePrompt: { type: Type.STRING },
                    newProductAdConcept: { type: Type.STRING },
                },
                required: ['nextScenePrompt', 'newProductAdConcept']
            }
        }
    });
    return JSON.parse(response.text.trim());
}

export async function generateSpokenExplanation(textToExplain: string, context: string): Promise<string> {
    const ai = getAi();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are an AI assistant. Briefly explain the following ${context} in a friendly, conversational tone, suitable for being spoken aloud. The explanation should be one or two sentences. Text to explain: "${textToExplain}"`,
    });
    
    const explanationText = response.text;
    return generateSpeechFromText(explanationText);
}


// --- Live Conversations ---

const commonLiveConfig = {
    responseModalities: [Modality.AUDIO],
    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
    inputAudioTranscription: {},
    outputAudioTranscription: {},
};

export function startConversation(callbacks: LiveSessionCallbacks) {
    const ai = getAi();
    const generateUGCAd: FunctionDeclaration = {
        name: 'generateUGCAd',
        parameters: {
            type: Type.OBJECT,
            description: 'The user has finished describing their concept. Generate the ad assets based on the provided concept.',
            properties: {
                concept: {
                    type: Type.STRING,
                    description: 'The user\'s full, high-level concept for the ad.',
                },
            },
            required: ['concept'],
        },
    };
    return ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks,
        config: {
            ...commonLiveConfig,
            systemInstruction: "You are a friendly and helpful AI creative director. Your goal is to brainstorm a concept for a UGC-style ad with the user. When the user says they are ready or done, you MUST call the `generateUGCAd` function with the full concept they described.",
            tools: [{ functionDeclarations: [generateUGCAd] }],
        },
    });
}

export function startDashboardConversation(callbacks: LiveSessionCallbacks) {
    const ai = getAi();
    const openProject: FunctionDeclaration = {
        name: 'openProject',
        parameters: { type: Type.OBJECT, properties: { projectName: { type: Type.STRING, description: 'The name of the project to open.' } }, required: ['projectName'] },
    };
    const deleteProject: FunctionDeclaration = {
        name: 'deleteProject',
        parameters: { type: Type.OBJECT, properties: { projectName: { type: Type.STRING, description: 'The name of the project to delete.' } }, required: ['projectName'] },
    };
    const startNewAd: FunctionDeclaration = { name: 'startNewAd', parameters: { type: Type.OBJECT, properties: {} } };
    return ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks,
        config: {
            ...commonLiveConfig,
            systemInstruction: "You are a dashboard assistant. You can open projects, delete projects, or navigate to the new ad generator page. Respond to user commands by calling the appropriate function.",
            tools: [{ functionDeclarations: [openProject, deleteProject, startNewAd] }],
        },
    });
}

export function startResultsConversation(callbacks: LiveSessionCallbacks) {
    const ai = getAi();
    const playOrPauseVideo: FunctionDeclaration = { name: 'playOrPauseVideo', parameters: { type: Type.OBJECT, properties: {} } };
    const explainThumbnail: FunctionDeclaration = { name: 'explainThumbnail', parameters: { type: Type.OBJECT, properties: {} } };
    const explainAnalysis: FunctionDeclaration = { name: 'explainAnalysis', parameters: { type: Type.OBJECT, properties: {} } };
    const startRemix: FunctionDeclaration = { name: 'startRemix', parameters: { type: Type.OBJECT, properties: { prompt: { type: Type.STRING, description: 'A prompt describing the desired remix or continuation.' } }, required: ['prompt'] } };
    const generateFollowUpScene: FunctionDeclaration = { name: 'generateFollowUpScene', parameters: { type: Type.OBJECT, properties: {} } };
    const generateNewAdConcept: FunctionDeclaration = { name: 'generateNewAdConcept', parameters: { type: Type.OBJECT, properties: {} } };
    
    return ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks,
        config: {
            ...commonLiveConfig,
            systemInstruction: "You are a results page assistant. You can play or pause the video, explain the thumbnail or virality analysis, or start a remix based on user instructions. You can also trigger a follow-up scene or a new ad concept if the user asks for the suggestions.",
            tools: [{ functionDeclarations: [playOrPauseVideo, explainThumbnail, explainAnalysis, startRemix, generateFollowUpScene, generateNewAdConcept] }],
        },
    });
}


const SYSTEM_INSTRUCTION_ALL_IN_ONE = `You are an expert creative director and AI prompt engineer. A user will provide a high-level concept for a UGC-style ad. Your task is to generate all the necessary assets to create a short video ad.

**CRITICAL INSTRUCTION FOR VISUAL CONSISTENCY:**
First, internally decide on a very detailed description for the main character(s) in the ad. This includes their appearance, clothing, and style.
Then, you MUST use this exact same detailed character description in both the 'soraPrompt' for the video and the 'imagenPrompt' for the thumbnail. This is crucial to ensure the person in the video looks identical to the person in the thumbnail.

Based on the user's concept, generate the following items in a single JSON object:

1.  **projectName:** A short, catchy project name (5-7 words max).
2.  **soraPrompt:** A highly detailed text-to-video prompt for the main video scene. This should be a single string, not a JSON object. It must be written for a 9:16 vertical video. Describe the scene, character actions, style, and cinematography.
3.  **imagenPrompt:** A concise, captivating prompt for an AI image model to generate a striking thumbnail image, also in a 9:16 vertical format.
4.  **transcript:** A short, engaging script (2-3 sentences) for a voiceover that complements the video.
5.  **viralityAnalysis:** A concise, one-sentence analysis of the concept's viral potential and one actionable tip for improvement.
6.  **viralityScore:** An object with three keys: "virality", "hookRate", and "engagementPotential". Each should have a numeric score from 0 to 100 representing its potential.`;

export async function generateAllAssetsFromText(userConcept: string): Promise<AllAssetsTextResult> {
    const ai = getAi();
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: `User concept: "${userConcept}"`,
        config: {
            systemInstruction: SYSTEM_INSTRUCTION_ALL_IN_ONE,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    projectName: { type: Type.STRING },
                    soraPrompt: { type: Type.STRING },
                    imagenPrompt: { type: Type.STRING },
                    transcript: { type: Type.STRING },
                    viralityAnalysis: { type: Type.STRING },
                    viralityScore: {
                        type: Type.OBJECT,
                        properties: {
                            virality: { type: Type.NUMBER },
                            hookRate: { type: Type.NUMBER },
                            engagementPotential: { type: Type.NUMBER },
                        },
                        required: ['virality', 'hookRate', 'engagementPotential']
                    }
                },
                required: ['projectName', 'soraPrompt', 'imagenPrompt', 'transcript', 'viralityAnalysis', 'viralityScore']
            }
        }
    });

    if (response.promptFeedback?.blockReason) {
        throw new Error(`Content generation was blocked. Reason: ${response.promptFeedback.blockReason}.`);
    }
    if (!response.text) {
        const finishReason = response.candidates?.[0]?.finishReason;
        if (finishReason && finishReason !== 'STOP') {
            throw new Error(`Content generation stopped unexpectedly. Reason: ${finishReason}`);
        }
        throw new Error("The AI returned an empty response. This might be due to safety filters or an issue with the prompt.");
    }

    const jsonString = response.text.trim();
    try {
        return JSON.parse(jsonString) as AllAssetsTextResult;
    } catch (e) {
        console.error("Failed to parse JSON from Gemini response:", jsonString);
        throw new Error("The AI returned an invalid response format. Please try again.");
    }
}
