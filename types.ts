export interface Voice {
  id: string;
  name: string;
  gender: 'Male' | 'Female';
  tags: string[];
  description: string;
  avatarColor: string;
}

export interface SpeechState {
  text: string;
  model: string;
  emotion: string;
  speed: number;
  selectedVoiceId: string;
  isGenerating: boolean;
  audioUrl: string | null;
  error: string | null;
}

export enum Emotion {
  Neutral = 'Neutral',
  Happy = 'Happy',
  Sad = 'Sad',
  Angry = 'Angry',
  Excited = 'Excited',
  Whisper = 'Whisper',
}

export type Tab = 'chat' | 'image' | 'video' | 'speech' | 'dialogue' | 'story' | 'editor' | 'manga' | 'dubbing';

export interface DialogueLine {
  id: string;
  speaker: 'Puck' | 'Kore' | 'Zephyr' | 'Charon' | 'Fenrir' | 'Aoede'; // Simplified set for dialogue
  text: string;
}

export interface StoryCharacter {
  id: string;
  name: string;
  visualDescription: string;
}

export interface StorySceneDraft {
  id: number;
  description: string;
  visualContext: string; // The setting/action without character details repeated
  charactersInvolved: string[]; // List of character names/ids involved
}

export interface StoryScene {
  id: number;
  description: string; // The part of the story
  visualPrompt: string; // The optimized prompt with consistent character details
  imageUrl?: string | null;
  isLoading?: boolean;
  error?: string | null;
}

export interface MangaCharacter {
  name: string;
  role: string;
  appearance: string;
}

export interface MangaPanel {
  description: string;
  dialogue?: string;
  speaker?: string;
  textPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  imageUrl?: string | null;
  error?: string | null;
}

export interface MangaPage {
  pageNumber: number;
  panels: MangaPanel[];
}

export interface MangaProject {
  title: string;
  genre: string;
  style: 'shonen' | 'shojo' | 'seinen' | 'horror' | 'webtoon';
  characters: MangaCharacter[];
  pages: MangaPage[];
}