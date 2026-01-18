import React, { useState } from 'react';
import { Sparkles, Loader2, Download, Image as ImageIcon, Layers, Palette, Grid, X, Maximize2, Trash2, Video } from 'lucide-react';
import { generateImages } from '../services/geminiService';

interface ImageStyle {
    id: string;
    label: string;
    prompt: string;
    icon: string;
}

const STYLES: ImageStyle[] = [
    { id: 'none', label: 'No Style', prompt: '', icon: '🚫' },
    { id: 'cinematic', label: 'Cinematic', prompt: 'Cinematic shot, dramatic lighting, highly detailed, 8k, photorealistic, depth of field, movie scene', icon: '🎬' },
    { id: 'anime', label: 'Anime', prompt: 'Anime style, Studio Ghibli inspired, vibrant colors, detailed backgrounds, cel shaded, 2D animation', icon: '🎨' },
    { id: 'photo', label: 'Photography', prompt: 'Professional photography, raw photo, 8k, f/1.8, bokeh, natural lighting, shot on 35mm lens', icon: '📷' },
    { id: 'digital', label: 'Digital Art', prompt: 'Digital concept art, trending on artstation, unreal engine 5 render, sharp focus, intricate details', icon: '💻' },
    { id: 'oil', label: 'Oil Painting', prompt: 'Oil painting style, textured brushstrokes, classical art, masterpiece, rich colors', icon: '🖼️' },
    { id: 'cyberpunk', label: 'Cyberpunk', prompt: 'Cyberpunk, neon lights, futuristic city, rain, high contrast, sci-fi, glowing effects', icon: '🌃' },
    { id: '3d', label: '3D Render', prompt: '3D character render, Pixar style, unity engine, cute, bright lighting, soft textures, 4k', icon: '🧊' },
    { id: 'sketch', label: 'Sketch', prompt: 'Pencil sketch, charcoal drawing, black and white, rough lines, artistic, hand drawn', icon: '✏️' },
];

interface ImageGenInterfaceProps {
    onToVideo?: (imageUrl: string) => void;
}

const ImageGenInterface: React.FC<ImageGenInterfaceProps> = ({ onToVideo }) => {
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [selectedStyle, setSelectedStyle] = useState<ImageStyle>(STYLES[0]);
    const [imageCount, setImageCount] = useState(1);
    
    // State for multiple images
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedPreview, setSelectedPreview] = useState<string | null>(null);

    const videoUrl = "https://opal.google/?flow=drive:/1wG-g_oq2QqX3WhrNdBz5BY7ovPV-PRNy&mode=app";

    const handleGenerate = async () => {
        if (!prompt) return;
        setIsGenerating(true);
        setError(null);
        setGeneratedImages([]); 
        
        try {
            // Construct the full prompt with style
            const stylePrompt = selectedStyle.id !== 'none' ? `${selectedStyle.prompt}. ` : '';
            const fullPrompt = `${stylePrompt}${prompt}`;

            // Use batch generation
            const results = await generateImages(fullPrompt, aspectRatio, imageCount);
            setGeneratedImages(results);

        } catch (e: any) {
            setError(e.message || "Failed to generate images");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownload = (url: string, index: number) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = `gemini-gen-${Date.now()}-${index}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleToVideo = (imgUrl: string) => {
        // فتح الرابط في علامة تبويب جديدة
        window.open(videoUrl, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl flex flex-col lg:flex-row h-auto min-h-[700px] overflow-hidden shadow-2xl">
             {/* Controls Panel */}
             <div className="w-full lg:w-[400px] p-6 border-r border-gray-800 flex flex-col gap-6 bg-gray-950/50 overflow-y-auto custom-scrollbar">
                
                {/* Prompt Input */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                        <Sparkles className="w-3 h-3 text-orange-500" /> Description
                    </label>
                    <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-600 to-purple-600 rounded-xl opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
                        <textarea 
                            className="relative w-full h-32 bg-gray-900 border border-gray-700 rounded-xl p-4 text-sm text-white resize-none focus:border-orange-500 focus:outline-none placeholder-gray-600 leading-relaxed shadow-inner"
                            placeholder="A futuristic city floating in the clouds..."
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                        />
                    </div>
                </div>

                {/* Settings Grid */}
                <div className="grid grid-cols-2 gap-6">
                    {/* Aspect Ratio */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Aspect Ratio</label>
                        <div className="flex flex-col gap-2">
                            {['1:1', '16:9', '9:16', '4:3', '3:4'].map(ratio => (
                                <button
                                    key={ratio}
                                    onClick={() => setAspectRatio(ratio)}
                                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all flex items-center justify-between group
                                        ${aspectRatio === ratio 
                                            ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-900/50' 
                                            : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'}`}
                                >
                                    <span>{ratio}</span>
                                    <div className={`border border-current rounded-sm ${
                                        ratio === '1:1' ? 'w-3 h-3' : 
                                        ratio === '16:9' ? 'w-4 h-2.5' : 
                                        ratio === '9:16' ? 'w-2.5 h-4' : 
                                        ratio === '4:3' ? 'w-3.5 h-3' : 'w-3 h-3.5'
                                    }`}></div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Quantity */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                            <Layers className="w-3 h-3" /> Quantity
                        </label>
                        <div className="flex flex-col gap-2">
                            {[1, 2, 3, 4].map(count => (
                                <button
                                    key={count}
                                    onClick={() => setImageCount(count)}
                                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all flex items-center justify-between
                                        ${imageCount === count 
                                            ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-900/50' 
                                            : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'}`}
                                >
                                    <span>{count} Image{count > 1 ? 's' : ''}</span>
                                    <div className="flex gap-0.5">
                                        {Array.from({ length: count }).map((_, i) => (
                                            <div key={i} className="w-1.5 h-1.5 rounded-full bg-current"></div>
                                        ))}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Styles */}
                <div className="space-y-2 flex-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                        <Palette className="w-3 h-3" /> Visual Style
                    </label>
                    <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                        {STYLES.map(style => (
                            <button
                                key={style.id}
                                onClick={() => setSelectedStyle(style)}
                                className={`p-2 rounded-xl text-xs text-left border transition-all flex flex-col gap-1 relative overflow-hidden
                                    ${selectedStyle.id === style.id 
                                        ? 'bg-orange-500/10 border-orange-500 text-white shadow-inner' 
                                        : 'bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-800 hover:border-gray-600'}`}
                            >
                                <span className="text-lg">{style.icon}</span>
                                <span className="font-bold">{style.label}</span>
                                {selectedStyle.id === style.id && (
                                    <div className="absolute top-0 right-0 w-0 h-0 border-t-[20px] border-l-[20px] border-t-orange-500 border-l-transparent"></div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mt-auto pt-4 border-t border-gray-800">
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating || !prompt}
                        className="w-full py-4 bg-gradient-to-r from-orange-600 to-orange-500 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 hover:shadow-[0_0_30px_rgba(249,115,22,0.4)] disabled:opacity-50 disabled:shadow-none transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="animate-spin w-5 h-5" />
                                Generating {imageCount} Image{imageCount > 1 ? 's' : ''}...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-5 h-5 fill-white" />
                                Generate Images
                            </>
                        )}
                    </button>
                </div>
             </div>

             {/* Output Preview Area */}
             <div className="flex-1 bg-black/50 p-6 flex flex-col relative overflow-hidden bg-[url('https://grainy-gradients.vercel.app/noise.svg')]">
                {generatedImages.length > 0 ? (
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className={`grid gap-6 h-full content-start ${
                            generatedImages.length === 1 ? 'grid-cols-1' : 
                            generatedImages.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 
                            'grid-cols-1 md:grid-cols-2 lg:grid-cols-2'
                        }`}>
                            {generatedImages.map((img, idx) => (
                                <div key={idx} className="group relative rounded-2xl overflow-hidden border border-gray-800 bg-gray-900 shadow-2xl">
                                    <div className="absolute top-3 left-3 z-10 bg-black/60 backdrop-blur px-2 py-1 rounded-md text-[10px] text-white font-mono border border-white/10">
                                        IMG_0{idx + 1}
                                    </div>
                                    <img 
                                        src={img} 
                                        alt={`Generated ${idx}`} 
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 cursor-pointer" 
                                        onClick={() => setSelectedPreview(img)}
                                    />
                                    
                                    {/* Actions Overlay */}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3 backdrop-blur-[1px]">
                                        <button 
                                            onClick={() => handleDownload(img, idx)}
                                            className="p-3 bg-white/10 hover:bg-orange-600 text-white rounded-full backdrop-blur-md border border-white/20 transition-all hover:scale-110 shadow-xl tooltip"
                                            title="Download"
                                        >
                                            <Download className="w-5 h-5" />
                                        </button>
                                        <button 
                                            onClick={() => handleToVideo(img)}
                                            className="p-3 bg-white/10 hover:bg-purple-600 text-white rounded-full backdrop-blur-md border border-white/20 transition-all hover:scale-110 shadow-xl tooltip"
                                            title="Image to Video (External)"
                                        >
                                            <Video className="w-5 h-5" />
                                        </button>
                                        <button 
                                            onClick={() => setSelectedPreview(img)}
                                            className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md border border-white/20 transition-all hover:scale-110 shadow-xl"
                                            title="Maximize"
                                        >
                                            <Maximize2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-700 select-none">
                        {isGenerating ? (
                            <div className="text-center">
                                <div className="w-20 h-20 relative mx-auto mb-6">
                                    <div className="absolute inset-0 border-4 border-gray-800 rounded-full"></div>
                                    <div className="absolute inset-0 border-4 border-orange-500 rounded-full border-t-transparent animate-spin"></div>
                                    <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-orange-500 animate-pulse" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Creating Magic...</h3>
                                <p className="text-gray-500">Generating {imageCount} masterpieces with {selectedStyle.label} style</p>
                            </div>
                        ) : (
                            <div className="text-center opacity-40">
                                <Grid className="w-24 h-24 mx-auto mb-4 stroke-1" />
                                <h3 className="text-2xl font-bold mb-2">Empty Canvas</h3>
                                <p className="max-w-xs mx-auto">Configure your settings on the left and hit generate to visualize your ideas.</p>
                            </div>
                        )}
                    </div>
                )}
                
                {/* Error Toast */}
                {error && (
                    <div className="absolute bottom-6 left-6 right-6 bg-red-900/90 backdrop-blur border border-red-700 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center justify-between animate-in slide-in-from-bottom-5">
                        <span className="flex items-center gap-2"><X className="w-5 h-5" /> {error}</span>
                        <button onClick={() => setError(null)} className="text-red-200 hover:text-white"><X className="w-4 h-4" /></button>
                    </div>
                )}

                {/* Lightbox / Modal for Preview */}
                {selectedPreview && (
                    <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-8 animate-in fade-in duration-200">
                        <img src={selectedPreview} className="max-w-full max-h-full rounded shadow-2xl border border-gray-800" alt="Full Preview" />
                        <button 
                            className="absolute top-6 right-6 p-2 bg-gray-800 rounded-full text-white hover:bg-gray-700 transition-colors"
                            onClick={() => setSelectedPreview(null)}
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                )}
             </div>
        </div>
    );
}

export default ImageGenInterface;