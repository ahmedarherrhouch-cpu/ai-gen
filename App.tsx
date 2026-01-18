import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import VoiceList from './components/VoiceList';
import InputPanel from './components/InputPanel';
import ChatInterface from './components/ChatInterface';
import ImageGenInterface from './components/ImageGenInterface';
import DialogueInterface from './components/DialogueInterface';
import StoryInterface from './components/StoryInterface';
import ImageEditorInterface from './components/ImageEditorInterface';
import MangaInterface from './components/MangaInterface';
import DubbingInterface from './components/DubbingInterface';

import { SpeechState, Emotion, Tab } from './types';
import { generateSpeech } from './services/geminiService';
import { VOICES } from './constants';

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<Tab>('image');
  
  // Speech State
  const [speechState, setSpeechState] = useState<SpeechState>({
    text: '',
    model: 'gemini-2.5-flash',
    emotion: Emotion.Neutral,
    speed: 1.0,
    selectedVoiceId: 'Zephyr',
    isGenerating: false,
    audioUrl: null,
    error: null,
  });

  const handleSpeechStateChange = useCallback((updates: Partial<SpeechState>) => {
    setSpeechState(prev => ({ ...prev, ...updates, error: null }));
  }, []);

  const handleVoiceSelect = useCallback((id: string) => {
    setSpeechState(prev => ({ ...prev, selectedVoiceId: id }));
  }, []);

  const handleGenerateSpeech = useCallback(async () => {
    if (!speechState.text.trim()) return;

    setSpeechState(prev => ({ ...prev, isGenerating: true, error: null, audioUrl: null }));

    try {
      const voiceName = VOICES.find(v => v.id === speechState.selectedVoiceId)?.name || 'Zephyr';
      
      const url = await generateSpeech(
        speechState.text,
        voiceName,
        speechState.emotion
      );

      setSpeechState(prev => ({ ...prev, audioUrl: url, isGenerating: false }));
    } catch (err: any) {
      console.error(err);
      setSpeechState(prev => ({ 
        ...prev, 
        isGenerating: false, 
        error: err.message || "Failed to generate speech." 
      }));
    }
  }, [speechState.text, speechState.selectedVoiceId, speechState.emotion]);

  const renderContent = () => {
      switch (currentTab) {
          case 'chat':
              return (
                  <div className="w-full max-w-4xl mx-auto">
                      <ChatInterface />
                  </div>
              );
          case 'image':
              return (
                  <div className="w-full max-w-5xl mx-auto">
                      <ImageGenInterface />
                  </div>
              );
          case 'editor':
              return (
                  <div className="w-full max-w-6xl mx-auto">
                      <ImageEditorInterface />
                  </div>
              );
          case 'manga':
              return (
                  <div className="w-full max-w-6xl mx-auto">
                      <MangaInterface />
                  </div>
              );
          case 'dubbing':
              return (
                  <div className="w-full max-w-6xl mx-auto">
                      <DubbingInterface />
                  </div>
              );
          case 'dialogue':
              return (
                  <div className="w-full max-w-4xl mx-auto">
                      <DialogueInterface />
                  </div>
              );
          case 'story':
              return (
                  <div className="w-full max-w-6xl mx-auto">
                      <StoryInterface />
                  </div>
              );
          case 'speech':
          default:
              return (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Speech Gen Layout */}
                    <div className="lg:col-span-7">
                        <InputPanel 
                        state={speechState} 
                        onChange={handleSpeechStateChange}
                        onGenerate={handleGenerateSpeech}
                        />
                        {speechState.error && (
                            <div className="mt-4 p-4 bg-red-900/20 border border-red-800 text-red-200 rounded-lg text-sm">
                                {speechState.error}
                            </div>
                        )}
                    </div>
                    <div className="lg:col-span-5">
                        <VoiceList 
                        selectedVoiceId={speechState.selectedVoiceId}
                        onSelectVoice={handleVoiceSelect}
                        />
                    </div>
                  </div>
              );
      }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white selection:bg-orange-500/30">
      <Header currentTab={currentTab} onTabChange={setCurrentTab} />
      
      <main className="container mx-auto px-4 pb-12 max-w-7xl">
        <div className="animate-in fade-in duration-500">
            {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;