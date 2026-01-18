import React, { useState, useRef, useEffect } from 'react';
import { SpeechState, Emotion } from '../types';
import { EMOTIONS } from '../constants';
import { Play, Download, Loader2, Sparkles, Volume2 } from 'lucide-react';

interface InputPanelProps {
  state: SpeechState;
  onChange: (updates: Partial<SpeechState>) => void;
  onGenerate: () => void;
}

const InputPanel: React.FC<InputPanelProps> = ({ state, onChange, onGenerate }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Update playback speed when state changes or audio generates
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = state.speed;
    }
  }, [state.speed, state.audioUrl]);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl flex flex-col h-[600px]">
      {/* Tabs */}
      <div className="flex border-b border-gray-800 bg-gray-900/50">
        <div className="flex-1 py-3 text-sm font-medium text-white border-b-2 border-white bg-gray-800/30 flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-500"></span>
          Text to Speech
        </div>
      </div>

      <div className="p-6 flex-1 flex flex-col overflow-y-auto">
        {/* Settings Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-400">Model</label>
            <div className="relative">
                <select 
                    className="w-full bg-gray-950 border border-gray-700 text-white text-sm rounded-lg px-3 py-2.5 appearance-none focus:outline-none focus:border-orange-500"
                    value={state.model}
                    disabled
                >
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                </select>
                <Sparkles className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-400">Emotion</label>
            <div className="relative">
                <select 
                    className="w-full bg-gray-950 border border-gray-700 text-white text-sm rounded-lg px-3 py-2.5 appearance-none focus:outline-none focus:border-orange-500 cursor-pointer"
                    value={state.emotion}
                    onChange={(e) => onChange({ emotion: e.target.value })}
                >
                    <option value="" disabled>Select Emotion</option>
                    {EMOTIONS.map(e => (
                        <option key={e.value} value={e.value}>{e.label}</option>
                    ))}
                </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-400">Custom Prompt</label>
            <input 
                type="text"
                placeholder="Optional style..."
                className="w-full bg-gray-950 border border-gray-700 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-orange-500 placeholder-gray-600"
            />
          </div>
        </div>

        {/* Text Area */}
        <div className="flex-1 relative mb-6">
          <label className="text-xs font-semibold text-gray-400 absolute -top-5 left-0">Text</label>
          <textarea
            className="w-full h-full bg-gray-950 border border-gray-700 rounded-xl p-4 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-500 resize-none text-base leading-relaxed"
            placeholder="Start writing or paste your text here to generate speech..."
            value={state.text}
            onChange={(e) => onChange({ text: e.target.value })}
            maxLength={1000}
          />
          <div className="absolute bottom-3 right-4 text-xs text-gray-500 font-medium">
            {state.text.length} / 1000
          </div>
        </div>

        {/* Controls */}
        <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 flex flex-col gap-4">
            
            {/* Speed Control */}
            <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-400 font-medium">
                    <span>Speed</span>
                    <span>{state.speed}x</span>
                </div>
                <input
                    type="range"
                    min="0.25"
                    max="4.0"
                    step="0.25"
                    value={state.speed}
                    onChange={(e) => onChange({ speed: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
                <div className="flex justify-between text-[10px] text-gray-600 px-1">
                    <span>0.25x</span>
                    <span>4x</span>
                </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-3">
                    <div className="flex bg-black rounded-lg p-1 border border-gray-800">
                        <button className="px-3 py-1 rounded text-xs font-medium bg-orange-500/10 text-orange-500 border border-orange-500/20">MP3</button>
                        <button className="px-3 py-1 rounded text-xs font-medium text-gray-500 hover:text-gray-300">WAV</button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {state.audioUrl && (
                        <audio 
                            ref={audioRef}
                            src={state.audioUrl} 
                            controls 
                            className="h-8 w-48 opacity-90"
                            onPlay={() => { 
                                if (audioRef.current) audioRef.current.playbackRate = state.speed; 
                            }}
                        />
                    )}

                    <button
                        onClick={onGenerate}
                        disabled={state.isGenerating || !state.text.trim()}
                        className={`
                            flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm transition-all
                            ${state.isGenerating || !state.text.trim()
                                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.4)] hover:shadow-[0_0_25px_rgba(249,115,22,0.6)] hover:-translate-y-0.5'}
                        `}
                    >
                        {state.isGenerating ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                Generate Speech
                                <Sparkles className="w-4 h-4 fill-white" />
                            </>
                        )}
                    </button>
                </div>
            </div>
            {/* Credit Info */}
            <div className="text-right text-[10px] text-gray-600 mt-1">
                Credits: ∞ remaining <span className="text-orange-900/50">|</span> Price per 1 character: 0.000 Credits
            </div>
        </div>
      </div>
    </div>
  );
};

export default InputPanel;