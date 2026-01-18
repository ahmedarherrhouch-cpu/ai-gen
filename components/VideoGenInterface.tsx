import React, { useState, useEffect } from 'react';
import { Video, Loader2, Key, X, Sparkles, Image as ImageIcon } from 'lucide-react';
import { generateVideo, generateVideoFromImage } from '../services/geminiService';

interface VideoGenInterfaceProps {
    initialImage?: string | null;
    onClearImage?: () => void;
}

const VideoGenInterface: React.FC<VideoGenInterfaceProps> = ({ initialImage, onClearImage }) => {
    const [hasKey, setHasKey] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [status, setStatus] = useState<string>('');

    useEffect(() => {
        checkKey();
    }, []);

    const checkKey = async () => {
        const aistudio = (window as any).aistudio;
        if (aistudio && aistudio.hasSelectedApiKey) {
            const selected = await aistudio.hasSelectedApiKey();
            setHasKey(selected);
        } else {
            setHasKey(true); 
        }
    };

    const handleSelectKey = async () => {
        const aistudio = (window as any).aistudio;
        if (aistudio && aistudio.openSelectKey) {
            await aistudio.openSelectKey();
            setHasKey(true);
        }
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        setVideoUrl(null);
        setStatus('Initializing Veo model...');
        
        try {
            setStatus('Generating video (this may take a minute)...');
            let url: string;
            
            if (initialImage) {
                // Image to Video flow
                url = await generateVideoFromImage(initialImage, prompt || "Animate this image with smooth motion");
            } else {
                // Text to Video flow
                url = await generateVideo(prompt);
            }
            
            setVideoUrl(url);
            setStatus('Complete!');
        } catch (e: any) {
            console.error(e);
            setStatus(`Error: ${e.message}`);
            if (e.message?.includes('Requested entity was not found')) {
                setHasKey(false); 
            }
        } finally {
            setIsGenerating(false);
        }
    };

    if (!hasKey) {
        return (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl h-[600px] flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-6">
                    <Key className="w-8 h-8 text-orange-500" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Billing Account Required</h2>
                <p className="text-gray-400 max-w-md mb-8">
                    To use the high-quality Veo video generation model, you must select a paid API key from a Google Cloud Project with billing enabled.
                </p>
                <button 
                    onClick={handleSelectKey}
                    className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-medium transition-colors"
                >
                    Select API Key
                </button>
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="mt-4 text-xs text-gray-500 hover:text-gray-300 underline">
                    Learn more about Gemini API billing
                </a>
            </div>
        );
    }

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl flex flex-col h-[700px] overflow-hidden shadow-2xl">
             <div className="p-6 border-b border-gray-800 bg-gray-950/50 flex flex-col gap-4">
                <div className="flex gap-4 items-center">
                    <div className="flex-1 relative">
                        <input 
                            type="text"
                            className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none transition-colors"
                            placeholder={initialImage ? "Describe the motion (e.g., camera pans right, character smiles)..." : "Describe the video you want to generate..."}
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                        />
                        {initialImage && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                <span className="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded border border-orange-500/30 font-bold uppercase tracking-wider">Image to Video</span>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating || (!prompt && !initialImage)}
                        className="px-8 py-3 bg-gradient-to-r from-orange-600 to-orange-500 rounded-xl text-white font-bold hover:shadow-[0_0_20px_rgba(249,115,22,0.4)] disabled:opacity-50 flex items-center gap-2 transition-all transform active:scale-95"
                    >
                        {isGenerating ? <Loader2 className="animate-spin w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                        {isGenerating ? 'Generating...' : 'Generate'}
                    </button>
                </div>

                {initialImage && (
                    <div className="flex items-center gap-3 animate-in slide-in-from-top-2">
                        <div className="relative w-20 h-20 rounded-lg border border-gray-700 overflow-hidden bg-black shrink-0">
                            <img src={initialImage} className="w-full h-full object-cover opacity-80" alt="Source" />
                            <button 
                                onClick={onClearImage}
                                className="absolute top-0.5 right-0.5 p-0.5 bg-black/60 rounded-full text-white hover:bg-red-500 transition-colors"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                        <div className="text-xs text-gray-500 italic max-w-sm">
                            Generating from source image. Describe any specific motion you'd like to see, or leave blank for automatic animation.
                        </div>
                    </div>
                )}
             </div>

             <div className="flex-1 bg-black flex items-center justify-center relative p-6 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]">
                {videoUrl ? (
                    <div className="w-full h-full flex items-center justify-center group relative">
                        <video controls autoPlay loop className="max-h-full max-w-full rounded-2xl shadow-2xl border border-gray-800">
                            <source src={videoUrl} type="video/mp4" />
                            Your browser does not support the video tag.
                        </video>
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <a 
                                href={videoUrl} 
                                download="gemini-video.mp4"
                                className="p-3 bg-black/60 backdrop-blur rounded-full text-white hover:bg-orange-600 border border-white/10 transition-all shadow-xl"
                            >
                                <Video className="w-5 h-5" />
                            </a>
                        </div>
                    </div>
                ) : (
                    <div className="text-gray-600 flex flex-col items-center select-none">
                         {isGenerating ? (
                             <div className="flex flex-col items-center">
                                <div className="relative w-24 h-24 mb-8">
                                    <div className="absolute inset-0 border-4 border-gray-800 rounded-full"></div>
                                    <div className="absolute inset-0 border-4 border-orange-500 rounded-full border-t-transparent animate-spin"></div>
                                    <Video className="absolute inset-0 m-auto w-10 h-10 text-orange-500 animate-pulse" />
                                </div>
                                <p className="text-lg font-bold text-white mb-2 animate-pulse">{status}</p>
                                <p className="text-sm opacity-50">Gemini Veo is processing your request...</p>
                             </div>
                         ) : (
                             <>
                                <Video className="w-24 h-24 mb-4 opacity-10 stroke-1" />
                                <h3 className="text-xl font-bold text-gray-800 uppercase tracking-widest">Video Production Lab</h3>
                                <p className="text-sm opacity-30 mt-2">Describe a scene to begin generation</p>
                             </>
                         )}
                    </div>
                )}
                
                {/* Status indicator for long runs */}
                {isGenerating && (
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-gray-900/80 backdrop-blur px-6 py-3 rounded-full border border-gray-800 flex items-center gap-4 text-xs font-medium text-gray-400 shadow-2xl">
                         <div className="flex gap-1">
                             <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                             <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" style={{animationDelay: '200ms'}}></div>
                             <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" style={{animationDelay: '400ms'}}></div>
                         </div>
                         Video generation usually takes 30-90 seconds
                    </div>
                )}
             </div>
        </div>
    );
}

export default VideoGenInterface;