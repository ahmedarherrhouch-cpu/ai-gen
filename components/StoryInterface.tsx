import React, { useState } from 'react';
import { BookOpen, Loader2, Wand2, Image as ImageIcon, Download, Maximize2, RefreshCw, Trash2, ArrowRight, User, Clapperboard, CheckCircle2, AlertTriangle, Sparkles, Pencil, Palette } from 'lucide-react';
import { analyzeStory, generateImage } from '../services/geminiService';
import { StoryScene, StoryCharacter, StorySceneDraft } from '../types';

type StoryStep = 'input' | 'prepare' | 'production';

interface VisualStyle {
    id: string;
    label: string;
    prompt: string;
    color: string;
}

const STYLES: VisualStyle[] = [
    { id: 'cinematic', label: 'Cinematic', prompt: 'Cinematic, realistic, detailed, 8k resolution, dramatic lighting, movie still, depth of field', color: 'bg-blue-600' },
    { id: 'anime', label: 'Anime', prompt: 'Anime style, Studio Ghibli inspired, vibrant colors, detailed backgrounds, cel shaded, 2D animation style', color: 'bg-pink-600' },
    { id: 'cyberpunk', label: 'Cyberpunk', prompt: 'Cyberpunk, neon lights, high tech, futuristic city, gritty, night time, glowing effects, highly detailed', color: 'bg-purple-600' },
    { id: 'watercolor', label: 'Watercolor', prompt: 'Watercolor painting, artistic, soft edges, dreamy, textured paper, pastel colors, ink outlines', color: 'bg-teal-600' },
    { id: 'noir', label: 'Film Noir', prompt: 'Film noir, black and white, high contrast, dramatic shadows, mysterious, vintage 1940s style', color: 'bg-gray-600' },
    { id: '3d', label: '3D Render', prompt: '3D render, Pixar style, cute, vibrant lighting, unity engine, unreal engine 5, ambient occlusion', color: 'bg-orange-600' },
    { id: 'fantasy', label: 'Dark Fantasy', prompt: 'Dark fantasy art, oil painting style, mystical, gothic, detailed textures, atmospheric', color: 'bg-red-800' },
];

const StoryInterface: React.FC = () => {
    // State
    const [step, setStep] = useState<StoryStep>('input');
    const [story, setStory] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [selectedStyle, setSelectedStyle] = useState<VisualStyle>(STYLES[0]);
    
    // Preparation Data
    const [draftCharacters, setDraftCharacters] = useState<StoryCharacter[]>([]);
    const [draftScenes, setDraftScenes] = useState<StorySceneDraft[]>([]);
    
    // Final Production Data
    const [scenes, setScenes] = useState<StoryScene[]>([]);

    // Step 1: Analyze Story -> Prepare
    const handleAnalyze = async () => {
        if (!story.trim()) return;
        setIsAnalyzing(true);
        
        try {
            const result = await analyzeStory(story);
            setDraftCharacters(result.characters);
            setDraftScenes(result.scenes);
            setStep('prepare');
        } catch (error) {
            console.error("Failed to analyze story", error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Step 2: Update Character or Scene Drafts
    const updateCharacter = (id: string, text: string) => {
        setDraftCharacters(prev => prev.map(c => c.id === id ? { ...c, visualDescription: text } : c));
    };

    const updateSceneDraft = (id: number, text: string) => {
        setDraftScenes(prev => prev.map(s => s.id === id ? { ...s, visualContext: text } : s));
    };

    // Step 3: Start Production
    const handleStartProduction = () => {
        // Construct final scenes with merged prompts that strongly enforce consistency
        const finalScenes: StoryScene[] = draftScenes.map(draft => {
            // Find characters in this scene
            const involvedChars = draftCharacters.filter(c => 
                draft.charactersInvolved.some(name => 
                    name.toLowerCase().includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(name.toLowerCase())
                )
            );
            
            // Build a strict visual definition block
            // We use a structured format to tell the model exactly who is who.
            const charDefinitions = involvedChars.map(c => 
                `[Character: ${c.name}, Appearance: ${c.visualDescription}]`
            ).join(" ");
            
            // Structure: Style -> Characters -> Action -> Setting
            // This ordering often helps diffusion models apply the style, then focus on the subject details.
            const fullPrompt = `
                Style: ${selectedStyle.prompt}.
                
                Foreground Characters: ${charDefinitions || 'No specific main characters'}.
                
                Action: ${draft.description}.
                
                Background/Setting: ${draft.visualContext}.
                
                Constraint: Maintain exact character appearance described in brackets. High consistency.
            `.trim().replace(/\s+/g, ' ');

            return {
                id: draft.id,
                description: draft.description,
                visualPrompt: fullPrompt,
                isLoading: false,
                imageUrl: null,
                error: null
            };
        });

        setScenes(finalScenes);
        setStep('production');
        generateScenesSequentially(finalScenes);
    };

    const generateScenesSequentially = async (initialScenes: StoryScene[]) => {
        const newScenes = [...initialScenes];
        for (let i = 0; i < newScenes.length; i++) {
            await generateSingleScene(newScenes[i], i);
        }
    };

    const generateSingleScene = async (scene: StoryScene, index: number) => {
        setScenes(prev => prev.map((s, idx) => idx === index ? { ...s, isLoading: true, error: null } : s));
        try {
            const url = await generateImage(scene.visualPrompt, '16:9');
            setScenes(prev => prev.map((s, idx) => idx === index ? { ...s, imageUrl: url, isLoading: false } : s));
        } catch (err: any) {
            console.error(`Failed to generate image for scene ${index}`, err);
            setScenes(prev => prev.map((s, idx) => idx === index ? { ...s, isLoading: false, error: err.message || "Generation failed" } : s));
        }
    };

    const handleRegenerate = async (index: number) => {
        const scene = scenes[index];
        if (!scene) return;
        await generateSingleScene(scene, index);
    };

    const handleDownload = (url: string, index: number) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = `story-scene-${index + 1}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadAll = () => {
        scenes.forEach((scene, index) => {
            if (scene.imageUrl) {
                setTimeout(() => handleDownload(scene.imageUrl!, index), index * 500);
            }
        });
    };

    const handleReset = () => {
        setStep('input');
        setScenes([]);
        setDraftCharacters([]);
        setDraftScenes([]);
        setStory('');
    };

    // --- Render Functions ---

    const renderStepIndicator = () => (
        <div className="flex items-center justify-center mb-8 space-x-6">
            <div className={`flex items-center gap-2 px-5 py-2.5 rounded-full border transition-all duration-300 ${step === 'input' ? 'bg-orange-500/10 border-orange-500 text-orange-500 shadow-lg shadow-orange-900/20' : 'border-gray-800 text-gray-500 bg-gray-900/50'}`}>
                <BookOpen className="w-4 h-4" /> <span className="text-sm font-bold tracking-wide">Story</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-700" />
            <div className={`flex items-center gap-2 px-5 py-2.5 rounded-full border transition-all duration-300 ${step === 'prepare' ? 'bg-orange-500/10 border-orange-500 text-orange-500 shadow-lg shadow-orange-900/20' : 'border-gray-800 text-gray-500 bg-gray-900/50'}`}>
                <User className="w-4 h-4" /> <span className="text-sm font-bold tracking-wide">Characters</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-700" />
            <div className={`flex items-center gap-2 px-5 py-2.5 rounded-full border transition-all duration-300 ${step === 'production' ? 'bg-orange-500/10 border-orange-500 text-orange-500 shadow-lg shadow-orange-900/20' : 'border-gray-800 text-gray-500 bg-gray-900/50'}`}>
                <Clapperboard className="w-4 h-4" /> <span className="text-sm font-bold tracking-wide">Production</span>
            </div>
        </div>
    );

    const renderInputStep = () => (
        <div className="flex flex-col h-full items-center justify-center p-8 max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-full space-y-8">
                <div className="text-center">
                    <h2 className="text-3xl font-extrabold text-white mb-3 tracking-tight">Write Your Story</h2>
                    <p className="text-gray-400 text-lg">Gemini will extract characters and design consistent scenes.</p>
                </div>
                
                <div className="relative group w-full">
                    <div className="absolute -inset-1 bg-gradient-to-r from-orange-600 via-purple-600 to-orange-600 rounded-2xl opacity-30 blur-lg group-hover:opacity-50 transition duration-1000 animate-pulse"></div>
                    <textarea 
                        className="relative w-full bg-gray-950 border border-gray-800 rounded-2xl p-8 text-white text-xl focus:border-orange-500 focus:outline-none resize-none h-72 shadow-2xl placeholder-gray-600 leading-relaxed font-light"
                        placeholder="A cyberpunk detective named Kael, wearing a neon trench coat and robotic eye, walks through a rainy market..."
                        value={story}
                        onChange={(e) => setStory(e.target.value)}
                    />
                </div>

                <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || !story.trim()}
                    className="w-full py-4 bg-gradient-to-r from-orange-600 to-orange-500 rounded-xl text-white font-bold text-lg hover:shadow-[0_0_30px_rgba(249,115,22,0.4)] disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-3 transition-all transform hover:-translate-y-1 active:translate-y-0"
                >
                    {isAnalyzing ? <Loader2 className="animate-spin w-5 h-5" /> : <Wand2 className="w-5 h-5" />}
                    {isAnalyzing ? 'Analyzing Script...' : 'Analyze & Design Characters'}
                </button>
            </div>
        </div>
    );

    const renderPrepareStep = () => (
        <div className="flex flex-col h-full overflow-hidden animate-in fade-in duration-500">
             <div className="p-6 border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm flex flex-col md:flex-row justify-between items-center gap-4 z-10">
                 <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Pencil className="w-5 h-5 text-orange-500" /> Review & Refine
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">Check characters and select a visual style.</p>
                 </div>
                 
                 <div className="flex items-center gap-4">
                     <div className="flex items-center gap-2 bg-gray-950 border border-gray-800 rounded-xl p-1.5">
                        <Palette className="w-4 h-4 text-gray-400 ml-2" />
                        <select 
                            className="bg-transparent text-sm text-white focus:outline-none py-1 px-2 cursor-pointer"
                            value={selectedStyle.id}
                            onChange={(e) => setSelectedStyle(STYLES.find(s => s.id === e.target.value) || STYLES[0])}
                        >
                            {STYLES.map(s => (
                                <option key={s.id} value={s.id}>{s.label}</option>
                            ))}
                        </select>
                     </div>

                     <button 
                        onClick={handleStartProduction}
                        className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(22,163,74,0.3)] hover:shadow-[0_0_30px_rgba(22,163,74,0.5)] transform hover:-translate-y-0.5"
                     >
                         <CheckCircle2 className="w-5 h-5" /> Generate Scenes
                     </button>
                 </div>
             </div>
             
             <div className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-thin scrollbar-thumb-gray-800">
                 {/* Style Preview Banner */}
                 <div className={`w-full p-4 rounded-xl border border-white/10 ${selectedStyle.color} bg-opacity-20 flex items-center gap-4 relative overflow-hidden`}>
                     <div className={`absolute inset-0 ${selectedStyle.color} opacity-10 blur-xl`}></div>
                     <div className="p-3 bg-black/30 rounded-full backdrop-blur-md relative z-10">
                        <Palette className="w-6 h-6 text-white" />
                     </div>
                     <div className="relative z-10">
                         <h4 className="font-bold text-white">Selected Style: {selectedStyle.label}</h4>
                         <p className="text-xs text-white/70 max-w-2xl">{selectedStyle.prompt}</p>
                     </div>
                 </div>

                 {/* Characters Section */}
                 <div className="space-y-4">
                     <div className="flex items-center gap-2 text-orange-500">
                        <User className="w-5 h-5" />
                        <h4 className="text-sm font-bold uppercase tracking-widest">Character Reference Sheets (Edit for Consistency)</h4>
                     </div>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         {draftCharacters.map(char => (
                             <div key={char.id} className="group bg-gray-950/50 border border-gray-800 rounded-2xl p-5 flex flex-col gap-3 hover:border-orange-500/50 transition-colors shadow-lg">
                                 <div className="flex justify-between items-center border-b border-gray-800 pb-2 mb-1">
                                     <span className="font-bold text-lg text-white group-hover:text-orange-400 transition-colors">{char.name}</span>
                                     <span className="text-[10px] text-gray-500 bg-gray-900 px-2 py-1 rounded-full border border-gray-800">REF: {char.id}</span>
                                 </div>
                                 <div className="relative flex-1">
                                    <textarea 
                                        className="w-full h-32 bg-gray-900/50 border border-gray-700 rounded-xl p-4 text-sm text-gray-300 focus:text-white focus:border-orange-500 focus:outline-none resize-none leading-relaxed custom-scrollbar"
                                        value={char.visualDescription}
                                        onChange={(e) => updateCharacter(char.id, e.target.value)}
                                        placeholder="Detailed description of appearance (hair, eyes, clothes)..."
                                    />
                                    <div className="absolute bottom-3 right-3 pointer-events-none">
                                        <Pencil className="w-3 h-3 text-gray-600" />
                                    </div>
                                 </div>
                                 <p className="text-[11px] text-gray-500 italic flex items-center gap-1">
                                     <Sparkles className="w-3 h-3 text-orange-500" />
                                     Tip: Define physical traits ONLY (e.g. "red hoodie", "scar on left eye").
                                 </p>
                             </div>
                         ))}
                     </div>
                 </div>

                 {/* Scenes Section */}
                 <div className="space-y-4">
                     <div className="flex items-center gap-2 text-orange-500">
                        <Clapperboard className="w-5 h-5" />
                        <h4 className="text-sm font-bold uppercase tracking-widest">Storyboard Sequences</h4>
                     </div>
                     <div className="space-y-4">
                         {draftScenes.map(scene => (
                             <div key={scene.id} className="bg-gray-950/50 border border-gray-800 rounded-2xl p-5 flex gap-5 hover:bg-gray-900/80 transition-colors group">
                                 <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-lg font-bold text-gray-500 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                                     {scene.id}
                                 </div>
                                 <div className="flex-1 space-y-4">
                                     <div className="flex justify-between items-start">
                                         <p className="font-medium text-gray-200 text-lg leading-snug">{scene.description}</p>
                                         <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
                                             {scene.charactersInvolved.map(c => (
                                                 <span key={c} className="text-[10px] px-2.5 py-1 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-full font-medium whitespace-nowrap">{c}</span>
                                             ))}
                                         </div>
                                     </div>
                                     <div className="relative">
                                         <label className="absolute -top-2.5 left-3 bg-gray-900 px-2 text-[10px] text-orange-500 font-bold uppercase tracking-wider">Visual Setting & Action</label>
                                         <input 
                                            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-400 focus:text-white focus:border-orange-500 focus:outline-none transition-colors"
                                            value={scene.visualContext}
                                            onChange={(e) => updateSceneDraft(scene.id, e.target.value)}
                                         />
                                     </div>
                                 </div>
                             </div>
                         ))}
                     </div>
                 </div>
             </div>
        </div>
    );

    const renderProductionStep = () => (
        <div className="flex flex-col h-full overflow-hidden animate-in fade-in duration-500">
             {/* Toolbar */}
             <div className="p-4 border-b border-gray-800 bg-gray-900/90 backdrop-blur flex justify-between items-center z-10 shadow-md">
                 <button onClick={handleReset} className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors">
                     <ArrowRight className="w-3 h-3 rotate-180" /> <span className="font-medium">New Story</span>
                 </button>
                 <div className="flex gap-4 items-center">
                    <div className="px-3 py-1 bg-gray-800 rounded border border-gray-700 text-xs text-gray-300">
                        Style: <span className="text-orange-400 font-semibold">{selectedStyle.label}</span>
                    </div>
                    <button 
                        onClick={handleDownloadAll}
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white rounded-lg text-xs font-bold border border-gray-700 flex items-center gap-2 transition-all"
                    >
                        <Download className="w-3.5 h-3.5" /> Download All Scenes
                    </button>
                 </div>
             </div>

             {/* Grid */}
             <div className="flex-1 overflow-y-auto p-6 bg-black/40 scrollbar-thin scrollbar-thumb-gray-800">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-8">
                    {scenes.map((scene, idx) => (
                        <div key={scene.id} className="group bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden flex flex-col hover:border-orange-500/40 transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,0,0,0.5)] transform hover:-translate-y-1">
                            <div className="aspect-video bg-gray-950 relative flex items-center justify-center border-b border-gray-800 overflow-hidden">
                                {scene.imageUrl ? (
                                    <>
                                        <img 
                                            src={scene.imageUrl} 
                                            alt={`Scene ${scene.id}`} 
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                                        />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3 backdrop-blur-[2px]">
                                            <button 
                                                onClick={() => handleDownload(scene.imageUrl!, idx)}
                                                className="p-3 bg-white/10 hover:bg-orange-600 text-white rounded-full backdrop-blur-md border border-white/20 transition-all hover:scale-110 shadow-xl"
                                                title="Download"
                                            >
                                                <Download className="w-5 h-5" />
                                            </button>
                                            <button 
                                                onClick={() => handleRegenerate(idx)}
                                                className="p-3 bg-white/10 hover:bg-orange-600 text-white rounded-full backdrop-blur-md border border-white/20 transition-all hover:scale-110 shadow-xl"
                                                title="Regenerate"
                                            >
                                                <RefreshCw className="w-5 h-5" />
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    const w = window.open("");
                                                    w?.document.write(`<body style="margin:0;background:black;display:flex;justify-content:center;align-items:center;height:100vh;"><img src="${scene.imageUrl}" style="max-width:100%;max-height:100vh;"></body>`);
                                                }}
                                                className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md border border-white/20 transition-all hover:scale-110 shadow-xl"
                                            >
                                                <Maximize2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full w-full text-gray-600 px-4">
                                        {scene.isLoading ? (
                                            <>
                                                <div className="relative">
                                                    <Loader2 className="w-12 h-12 animate-spin text-orange-500 mb-2" />
                                                    <div className="absolute inset-0 blur-xl bg-orange-500/20 rounded-full animate-pulse"></div>
                                                </div>
                                                <span className="text-xs text-orange-500/90 animate-pulse font-bold tracking-wide mt-3 uppercase">Rendering Scene {idx + 1}...</span>
                                            </>
                                        ) : scene.error ? (
                                            <div className="flex flex-col items-center text-red-400 p-4 text-center">
                                                <AlertTriangle className="w-10 h-10 mb-2 opacity-80" />
                                                <span className="text-sm font-bold mb-1">Generation Failed</span>
                                                <span className="text-[10px] text-red-400/70 mb-3">{scene.error}</span>
                                                <button 
                                                    onClick={() => handleRegenerate(idx)} 
                                                    className="px-4 py-2 bg-red-900/20 hover:bg-red-900/40 border border-red-800 rounded-lg text-xs font-medium text-red-200 transition-colors flex items-center gap-2"
                                                >
                                                    <RefreshCw className="w-3 h-3" /> Retry
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <ImageIcon className="w-10 h-10 opacity-10 mb-3" />
                                                <span className="text-xs font-medium opacity-40 uppercase tracking-widest">Waiting for production</span>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="p-5 flex-1 flex flex-col bg-gray-900 relative">
                                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-gray-700 to-transparent opacity-50"></div>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="px-2.5 py-1 bg-gray-800 text-orange-500 text-[10px] font-extrabold tracking-widest rounded border border-gray-700 uppercase">
                                        Scene {scene.id}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-300 line-clamp-4 mb-2 flex-1 leading-relaxed font-light">
                                    {scene.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
             </div>
        </div>
    );

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-3xl flex flex-col h-[750px] shadow-2xl relative overflow-hidden bg-[url('https://grainy-gradients.vercel.app/noise.svg')]">
            <div className="pt-6 pb-2 border-b border-gray-800 bg-gray-950/80 backdrop-blur-md z-20">
                {renderStepIndicator()}
            </div>
            
            <div className="flex-1 overflow-hidden relative z-10">
                 {step === 'input' && renderInputStep()}
                 {step === 'prepare' && renderPrepareStep()}
                 {step === 'production' && renderProductionStep()}
            </div>
        </div>
    );
}

export default StoryInterface;