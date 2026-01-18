import { Voice, Emotion } from './types';

export const VOICES: Voice[] = [
  {
    id: 'Zephyr',
    name: 'Zephyr',
    gender: 'Female',
    tags: ['Young', 'Female', 'Bright'],
    description: 'Bright and clear female voice',
    avatarColor: 'bg-red-500',
  },
  {
    id: 'Puck',
    name: 'Puck',
    gender: 'Male',
    tags: ['Young', 'Male', 'Upbeat'],
    description: 'Upbeat and energetic male voice',
    avatarColor: 'bg-blue-500',
  },
  {
    id: 'Charon',
    name: 'Charon',
    gender: 'Male',
    tags: ['Young', 'Male', 'Informative'],
    description: 'Calm and informative male voice',
    avatarColor: 'bg-green-500',
  },
  {
    id: 'Kore',
    name: 'Kore',
    gender: 'Female',
    tags: ['Young', 'Female', 'Firm'],
    description: 'Firm and professional female voice',
    avatarColor: 'bg-purple-500',
  },
  {
    id: 'Fenrir',
    name: 'Fenrir',
    gender: 'Male',
    tags: ['Young', 'Male', 'Excitable'],
    description: 'Excited and dynamic male voice',
    avatarColor: 'bg-indigo-500',
  },
  {
    id: 'Leda',
    name: 'Leda',
    gender: 'Female',
    tags: ['Young', 'Female', 'Youthful'],
    description: 'Soft and youthful female voice',
    avatarColor: 'bg-cyan-500',
  },
  {
    id: 'Orus',
    name: 'Orus',
    gender: 'Male',
    tags: ['Young', 'Male', 'Firm'],
    description: 'Confident male voice',
    avatarColor: 'bg-lime-500',
  },
  {
    id: 'Aoede',
    name: 'Aoede',
    gender: 'Female',
    tags: ['Young', 'Female', 'Breezy'],
    description: 'Light and breezy female voice',
    avatarColor: 'bg-pink-500',
  },
];

export const EMOTIONS = [
  { value: Emotion.Neutral, label: 'Neutral' },
  { value: Emotion.Happy, label: 'Happy' },
  { value: Emotion.Sad, label: 'Sad' },
  { value: Emotion.Excited, label: 'Excited' },
  { value: Emotion.Whisper, label: 'Whisper' },
];
