
import { GoogleGenAI, Modality, Type, Content, Part } from "@google/genai";
import { decodeBase64, decodeAudioData, pcmToWav } from './audioUtils';
import { DialogueLine, StoryCharacter, StorySceneDraft, MangaCharacter, MangaPage } from '../types';

// Initialize Gemini Client
let ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getClient = () => {
  return ai;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function retryOperation<T>(operation: () => Promise<T>, retries = 3, baseWait = 4000): Promise<T> {
    for (let i = 0; i < retries; i++) {
        try {
            return await operation();
        } catch (error: any) {
            const isRateLimit = 
                error.status === 429 || 
                error.code === 429 || 
                error.message?.includes('429') || 
                error.message?.includes('quota') || 
                error.message?.includes('RESOURCE_EXHAUSTED') ||
                (error.error && (error.error.code === 429 || error.error.status === 'RESOURCE_EXHAUSTED')) ||
                error.status === 503;
            
            if (i === retries - 1 || !isRateLimit) {
                throw error;
            }
            
            const waitTime = baseWait * Math.pow(2, i);
            console.warn(`Rate limit hit (Attempt ${i + 1}/${retries}). Retrying in ${waitTime}ms...`);
            await delay(waitTime);
        }
    }
    throw new Error("Operation failed after retries");
}

// --- Text to Speech ---
export const generateSpeech = async (
  text: string,
  voiceName: string,
  emotion: string,
): Promise<string> => {
  const client = getClient();
  let promptText = text.replace(/[\*#`_]/g, '').trim(); 
  if (!promptText) throw new Error("No valid text to generate speech from.");

  try {
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: promptText }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data received.");

    return await processAudio(base64Audio);
  } catch (error: any) {
    console.error("Gemini TTS Error:", error);
    throw error;
  }
};

// --- Image Merging ---
export const mergeImages = async (base64Images: string[], prompt: string): Promise<string> => {
    const client = getClient();
    const parts: Part[] = [];

    // Add all images
    base64Images.forEach(img => {
        const matches = img.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
            parts.push({
                inlineData: {
                    data: matches[2],
                    mimeType: matches[1]
                }
            });
        }
    });

    // Add the instruction prompt
    parts.push({ text: `Merge these images together based on this instruction: ${prompt}. Aim for a seamless blend.` });

    try {
        const response = await retryOperation(async () => {
             return await client.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts }
            });
        }, 5, 5000); 

        const respParts = response.candidates?.[0]?.content?.parts;
        if (respParts) {
            for (const part of respParts) {
                if (part.inlineData && part.inlineData.data) {
                    return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
                }
            }
        }
        throw new Error("No merged image generated");
    } catch (error: any) {
        console.error("Merge Image Error", error);
        throw new Error(error.message || "Failed to merge images");
    }
}

// --- Translation for Dubbing ---
export const translateScript = async (text: string, targetLanguage: string): Promise<string> => {
    const client = getClient();
    const prompt = `Translate the following video script into ${targetLanguage}. Maintain tone. Only return text. Original: "${text}"`;
    try {
        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        return response.text?.trim() || "Translation failed";
    } catch (error) { throw error; }
}

export const extractScriptFromVideo = async (videoBase64: string, mimeType: string): Promise<string> => {
    const client = getClient();
    const base64Data = videoBase64.includes(',') ? videoBase64.split(',')[1] : videoBase64;
    const prompt = `Listen to the audio and provide a transcript. Text only.`;
    try {
        const response = await retryOperation(async () => {
             return await client.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [{ inlineData: { mimeType, data: base64Data } }, { text: prompt }] }
            });
        }, 3, 5000);
        return response.text?.trim() || "Could not extract text.";
    } catch (error) { throw error; }
}

// --- Dialogue Generation ---
export const generateDialogue = async (lines: DialogueLine[]): Promise<string> => {
  const client = getClient();
  const script = lines.map(l => `${l.speaker}: ${l.text}`).join('\n');
  const uniqueSpeakers = Array.from(new Set(lines.map(l => l.speaker)));
  const speakerVoiceConfigs = uniqueSpeakers.map(speakerName => ({
    speaker: speakerName,
    voiceConfig: { prebuiltVoiceConfig: { voiceName: speakerName } }
  }));

  try {
    const response = await client.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: script }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { multiSpeakerVoiceConfig: { speakerVoiceConfigs } }
        }
      });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data received.");
    return await processAudio(base64Audio);
  } catch (error) { throw error; }
}

// --- Image Generation ---
export const generateImages = async (prompt: string, aspectRatio: string = "1:1", numberOfImages: number = 1): Promise<string[]> => {
    const client = getClient();
    const images: string[] = [];
    for (let i = 0; i < numberOfImages; i++) {
        try {
            if (i > 0) await delay(4000);
            const response = await retryOperation(async () => {
                return await client.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: { parts: [{ text: prompt }] },
                    config: { imageConfig: { aspectRatio: aspectRatio as any } }
                });
            }, 5, 5000);
            const parts = response.candidates?.[0]?.content?.parts;
            if (parts) {
                for (const part of parts) {
                    if (part.inlineData && part.inlineData.data) {
                        images.push(`data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`);
                    }
                }
            }
        } catch (error: any) { throw error; }
    }
    if (images.length === 0) throw new Error("No images generated.");
    return images;
}

export const generateImage = async (prompt: string, aspectRatio: string = "1:1"): Promise<string> => {
    const images = await generateImages(prompt, aspectRatio, 1);
    return images[0];
}

// --- Image Editing ---
export const editImage = async (base64Image: string, maskImage: string | null, prompt: string): Promise<string> => {
    const client = getClient();
    const matches = base64Image.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) throw new Error("Invalid base64 image string");
    const mimeType = matches[1];
    const base64Data = matches[2];
    const parts: Part[] = [{ inlineData: { data: base64Data, mimeType } }];
    let finalPrompt = prompt;

    if (maskImage) {
        const maskMatches = maskImage.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
        if (maskMatches && maskMatches.length === 3) {
            parts.push({ inlineData: { data: maskMatches[2], mimeType: maskMatches[1] } });
            finalPrompt = `The second image is a mask (red area = edit). Instruction: ${prompt}`;
        }
    }
    parts.push({ text: finalPrompt });

    try {
        const response = await retryOperation(async () => {
             return await client.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts }
            });
        }, 5, 5000); 
        const respParts = response.candidates?.[0]?.content?.parts;
        if (respParts) {
            for (const part of respParts) {
                if (part.inlineData && part.inlineData.data) {
                    return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
                }
            }
        }
        throw new Error("No edited image generated");
    } catch (error: any) { throw error; }
}

// --- Story Board Analysis ---
export const analyzeStory = async (story: string): Promise<{ characters: StoryCharacter[], scenes: StorySceneDraft[] }> => {
  const client = getClient();
  const prompt = `Expert storyboard artist breakdown of story into scenes and characters. Story: "${story}"`;
  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
             characters: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, name: { type: Type.STRING }, visualDescription: { type: Type.STRING } }, required: ["id", "name", "visualDescription"] } },
             scenes: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.INTEGER }, description: { type: Type.STRING }, visualContext: { type: Type.STRING }, charactersInvolved: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["id", "description", "visualContext", "charactersInvolved"] } }
          },
          required: ["characters", "scenes"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) { throw error; }
}

// --- Manga Generation ---
export const generateMangaScript = async (concept: string, genre: string, pageCount: number): Promise<{ characters: MangaCharacter[], pages: MangaPage[] }> => {
    const client = getClient();
    const prompt = `Professional manga editor script. Concept: "${concept}", Genre: ${genre}, Length: ${pageCount} pages.`;
    try {
        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        characters: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, role: { type: Type.STRING }, appearance: { type: Type.STRING } }, required: ["name", "role", "appearance"] } },
                        pages: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { pageNumber: { type: Type.INTEGER }, panels: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { description: { type: Type.STRING }, dialogue: { type: Type.STRING }, speaker: { type: Type.STRING } }, required: ["description"] } } }, required: ["pageNumber", "panels"] } }
                    },
                    required: ["characters", "pages"]
                }
            }
        });
        return JSON.parse(response.text || "{}");
    } catch (error) { throw error; }
}

export const generateMangaPanelImage = async (panelDescription: string, style: string, aspectRatio: string, characters: MangaCharacter[]): Promise<string> => {
    const charContext = characters.map(c => `[Character: ${c.name}, Look: ${c.appearance}]`).join(' ');
    const fullPrompt = `Style: ${style}. Action: ${panelDescription}. Characters: ${charContext}.`;
    return await generateImage(fullPrompt, aspectRatio);
}

// --- Chat ---
export const createChat = (systemInstruction?: string, history?: Content[], options: any = {}) => {
    const client = getClient();
    const config: any = { systemInstruction };
    if (options.enableSearch) config.tools = [{ googleSearch: {} }];
    if (options.enableThinking) config.thinkingConfig = { thinkingBudget: 2048 };
    return client.chats.create({ model: 'gemini-2.5-flash', config, history });
}

// --- Video Generation ---
export const generateVideo = async (prompt: string): Promise<string> => {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        let operation = await ai.models.generateVideos({ model: 'veo-3.1-fast-generate-preview', prompt, config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' } });
        while (!operation.done) {
            await delay(5000);
            operation = await ai.operations.getVideosOperation({operation});
        }
        const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!videoUri) throw new Error("No video URI returned");
        const res = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
        const blob = await res.blob();
        return URL.createObjectURL(blob);
    } catch (error) { throw error; }
}

export const generateVideoFromImage = async (imageBase64: string, prompt: string = "Animate this image"): Promise<string> => {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const matches = imageBase64.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) throw new Error("Invalid base64 image data");
    try {
        let operation = await ai.models.generateVideos({ model: 'veo-3.1-fast-generate-preview', prompt, image: { imageBytes: matches[2], mimeType: matches[1] }, config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' } });
        while (!operation.done) {
            await delay(5000);
            operation = await ai.operations.getVideosOperation({operation});
        }
        const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!videoUri) throw new Error("No video URI returned");
        const res = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
        const blob = await res.blob();
        return URL.createObjectURL(blob);
    } catch (error) { throw error; }
}

async function processAudio(base64Audio: string): Promise<string> {
    const rawBytes = decodeBase64(base64Audio);
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const audioBuffer = await decodeAudioData(rawBytes, audioContext, 24000, 1);
    const channelData = audioBuffer.getChannelData(0);
    const wavBlob = pcmToWav(channelData, 24000, 1);
    audioContext.close();
    return URL.createObjectURL(wavBlob);
}
