import React, { useState, useRef } from 'react';
import { Plus, Trash2, Play, Loader2, Mic } from 'lucide-react';
import { DialogueLine } from '../types';
import { generateDialogue } from '../services/geminiService';

const SPEAKERS = ['Puck', 'Kore', 'Zephyr', 'Charon', 'Fenrir', 'Aoede'];

const DialogueInterface: React.FC = () => {
    const [lines, setLines] = useState<DialogueLine[]>([
        { id: '1', speaker: 'Puck', text: 'Hello! How are you today?' },
        { id: '2', speaker: 'Kore', text: 'I am doing great, thanks for asking!' }
    ]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    const addLine = () => {
        setLines([...lines, { id: Date.now().toString(), speaker: 'Puck', text: '' }]);
    };

    const removeLine = (id: string) => {
        setLines(lines.filter(l => l.id !== id));
    };

    const updateLine = (id: string, field: 'speaker' | 'text', value: string) => {
        setLines(lines.map(l => l.id === id ? { ...l, [field]: value } : l));
    };

    const handleGenerate = async () => {
        if (lines.some(l => !l.text.trim())) {
            setError("Please fill in all text fields.");
            return;
        }
        
        setIsGenerating(true);
        setError(null);
        setAudioUrl(null);
        
        try {
            const url = await generateDialogue(lines);
            setAudioUrl(url);
        } catch (e: any) {
            setError(e.message || "Failed to generate dialogue.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl flex flex-col h-[600px] overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {lines.map((line, index) => (
                    <div key={line.id} className="flex gap-4 items-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="w-8 pt-3 text-right text-gray-500 text-xs font-mono">{index + 1}</div>
                        <div className="flex-1 bg-gray-950 p-4 rounded-xl border border-gray-800 flex flex-col sm:flex-row gap-3">
                            <select 
                                value={line.speaker}
                                onChange={(e) => updateLine(line.id, 'speaker', e.target.value)}
                                className="bg-gray-900 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 focus:border-orange-500 focus:outline-none h-10 w-full sm:w-32"
                            >
                                {SPEAKERS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <input 
                                value={line.text}
                                onChange={(e) => updateLine(line.id, 'text', e.target.value)}
                                placeholder="What do they say?"
                                className="flex-1 bg-transparent text-white placeholder-gray-600 focus:outline-none text-sm h-10 border-b border-transparent focus:border-orange-500/50 transition-all"
                            />
                            {lines.length > 1 && (
                                <button onClick={() => removeLine(line.id)} className="text-gray-600 hover:text-red-400 p-2">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
                
                <button onClick={addLine} className="w-full py-3 border-2 border-dashed border-gray-800 rounded-xl text-gray-500 hover:text-orange-500 hover:border-orange-500/30 transition-all flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" /> Add Line
                </button>
            </div>

            <div className="p-4 bg-gray-950 border-t border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {audioUrl && (
                        <audio ref={audioRef} src={audioUrl} controls className="h-10 w-64" />
                    )}
                    {error && <span className="text-red-400 text-sm">{error}</span>}
                </div>
                <button 
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="px-8 py-3 bg-orange-600 hover:bg-orange-500 rounded-xl text-white font-semibold flex items-center gap-2 disabled:opacity-50"
                >
                    {isGenerating ? <Loader2 className="animate-spin w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    Generate Dialogue
                </button>
            </div>
        </div>
    );
}

export default DialogueInterface;
