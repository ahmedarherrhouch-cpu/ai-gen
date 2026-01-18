// @ts-ignore
import React, { useState, useRef, useEffect } from 'react';
/* Added missing Sparkles icon import */
import { Upload, Wand2, Download, Image as ImageIcon, X, Loader2, ArrowRight, Brush, Eraser, Trash2, Plus, LayoutGrid, CheckCircle2, Layers, Sparkles } from 'lucide-react';
import { editImage, mergeImages } from '../services/geminiService';

const ImageEditorInterface: React.FC = () => {
    const [imageGallery, setImageGallery] = useState<string[]>([]);
    const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
    const [editedImage, setEditedImage] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Mode Logic
    const isMergeMode = selectedIndices.length > 1;
    const activeIndex = selectedIndices.length === 1 ? selectedIndices[0] : null;
    const activeOriginal = activeIndex !== null ? imageGallery[activeIndex] : null;

    // Drawing State (In-painting)
    const [isDrawingMode, setIsDrawingMode] = useState(false);
    const [isDrawing, setIsDrawing] = useState(false);
    const [brushSize, setBrushSize] = useState(50);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            Array.from(files).forEach((file: File) => {
                if (file.size <= 5 * 1024 * 1024) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        setImageGallery(prev => [...prev, reader.result as string]);
                    };
                    reader.readAsDataURL(file);
                } else {
                    setError("Some images were too large (Max 5MB per image).");
                }
            });
            setEditedImage(null);
            setError(null);
        }
    };

    const handleImageLoad = () => {
        if (imgRef.current && canvasRef.current) {
            canvasRef.current.width = imgRef.current.naturalWidth;
            canvasRef.current.height = imgRef.current.naturalHeight;
            clearMask();
        }
    };

    const toggleSelection = (index: number) => {
        setEditedImage(null);
        setSelectedIndices(prev => {
            if (prev.includes(index)) {
                return prev.filter(i => i !== index);
            } else {
                return [...prev, index];
            }
        });
    };

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawingMode || isMergeMode) return;
        setIsDrawing(true);
        draw(e);
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) ctx.beginPath();
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !isDrawingMode || !canvasRef.current || !imgRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = canvasRef.current.width / rect.width;
        const scaleY = canvasRef.current.height / rect.height;

        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        ctx.lineWidth = brushSize * scaleX;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const clearMask = () => {
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
    };

    const handleAction = async () => {
        if (selectedIndices.length === 0 || !prompt.trim()) return;
        setIsProcessing(true);
        setError(null);
        setEditedImage(null);

        try {
            if (isMergeMode) {
                // Merge Mode
                const imagesToMerge = selectedIndices.map(idx => imageGallery[idx]);
                const result = await mergeImages(imagesToMerge, prompt);
                setEditedImage(result);
            } else {
                // Edit (In-painting) Mode
                let maskData = null;
                if (isDrawingMode && canvasRef.current) {
                    maskData = canvasRef.current.toDataURL('image/png');
                }
                const result = await editImage(activeOriginal!, maskData, prompt);
                setEditedImage(result);
            }
        } catch (e: any) {
            setError(e.message || "Operation failed.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownload = () => {
        if (editedImage) {
            const link = document.createElement('a');
            link.href = editedImage;
            link.download = `ai-masterpiece-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const removeImage = (index: number) => {
        setImageGallery(prev => prev.filter((_, i) => i !== index));
        setSelectedIndices(prev => prev.filter(i => i !== index).map(i => i > index ? i - 1 : i));
        setEditedImage(null);
    };

    const clearAll = () => {
        setImageGallery([]);
        setSelectedIndices([]);
        setEditedImage(null);
        setPrompt('');
        setError(null);
        setIsDrawingMode(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl flex flex-col h-[750px] shadow-2xl overflow-hidden relative">
            <div className="flex-1 flex flex-col lg:flex-row h-full">
                
                {/* Left Panel: Gallery & Controls */}
                <div className="w-full lg:w-1/3 flex flex-col border-b lg:border-b-0 lg:border-r border-gray-800 bg-gray-950/50">
                    
                    {/* Gallery Header */}
                    <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-950">
                         <div className="flex items-center gap-2">
                             <LayoutGrid className="w-4 h-4 text-orange-500" />
                             <span className="text-xs font-bold text-white uppercase tracking-wider">Gallery</span>
                             <span className="text-[10px] bg-gray-800 px-1.5 py-0.5 rounded text-gray-400">{imageGallery.length}</span>
                         </div>
                         <div className="flex items-center gap-2">
                            {selectedIndices.length > 0 && (
                                <button 
                                    onClick={() => setSelectedIndices([])}
                                    className="text-[10px] text-gray-500 hover:text-white"
                                >
                                    Clear Selection
                                </button>
                            )}
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="p-1.5 bg-gray-800 hover:bg-orange-600 rounded-md text-white transition-colors"
                                title="Add Images"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                         </div>
                    </div>

                    {/* Gallery Thumbnails */}
                    <div className="p-4 flex gap-3 overflow-x-auto bg-gray-900/30 scrollbar-thin scrollbar-thumb-gray-800 min-h-[110px] items-center">
                        {imageGallery.length > 0 ? (
                            imageGallery.map((img, idx) => {
                                const isSelected = selectedIndices.includes(idx);
                                return (
                                    <div 
                                        key={idx}
                                        onClick={() => toggleSelection(idx)}
                                        className={`relative group shrink-0 w-16 h-16 rounded-lg border-2 transition-all cursor-pointer overflow-hidden ${isSelected ? 'border-orange-500 scale-105 shadow-lg' : 'border-gray-800 opacity-60 hover:opacity-100'}`}
                                    >
                                        <img src={img} className="w-full h-full object-cover" alt={`Thumb ${idx}`} />
                                        {isSelected && (
                                            <div className="absolute inset-0 bg-orange-500/20 flex items-center justify-center">
                                                <CheckCircle2 className="w-6 h-6 text-orange-500 fill-black/40" />
                                            </div>
                                        )}
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                                            className="absolute top-0.5 right-0.5 bg-black/60 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                                        >
                                            <X className="w-2.5 h-2.5" />
                                        </button>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-600 border border-dashed border-gray-800 rounded-lg py-4">
                                <ImageIcon className="w-5 h-5 mb-1 opacity-20" />
                                <span className="text-[10px]">No images uploaded</span>
                            </div>
                        )}
                    </div>

                    {/* Controls Panel */}
                    <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
                        {selectedIndices.length === 0 ? (
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10 hover:border-orange-500/50 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all group"
                            >
                                <Upload className="w-8 h-8 text-orange-500 mx-auto mb-3" />
                                <p className="text-sm font-medium text-gray-300">Upload images</p>
                                <p className="text-xs text-gray-500 mt-1">Select one to edit, two+ to merge</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Mode Indicator */}
                                <div className="flex items-center gap-2 p-3 bg-gray-900 border border-gray-800 rounded-xl">
                                    <div className={`p-2 rounded-lg ${isMergeMode ? 'bg-purple-500/20 text-purple-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                        {isMergeMode ? <Layers className="w-4 h-4" /> : <Brush className="w-4 h-4" />}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Active Mode</p>
                                        <p className="text-xs font-bold text-white">{isMergeMode ? 'Image Merging' : 'AI In-painting'}</p>
                                    </div>
                                </div>

                                {/* In-painting Masking Tools (Only for Single Selection) */}
                                {!isMergeMode && (
                                    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-3 shadow-inner animate-in fade-in zoom-in-95 duration-200">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                                <Brush className="w-3 h-3 text-orange-400" /> Masking Tool
                                            </label>
                                            <button 
                                                onClick={() => setIsDrawingMode(!isDrawingMode)}
                                                className={`text-[10px] px-2 py-0.5 rounded border transition-colors font-bold ${isDrawingMode ? 'bg-orange-500 text-white border-orange-500' : 'text-gray-400 border-gray-600 hover:text-white'}`}
                                            >
                                                {isDrawingMode ? 'ACTIVE' : 'OFF'}
                                            </button>
                                        </div>
                                        
                                        {isDrawingMode && (
                                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-[10px] text-gray-500">
                                                        <span>Brush Size</span>
                                                        <span>{brushSize}px</span>
                                                    </div>
                                                    <input 
                                                        type="range" min="10" max="200" value={brushSize} 
                                                        onChange={(e) => setBrushSize(parseInt(e.target.value))}
                                                        className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                                                    />
                                                </div>
                                                <button onClick={clearMask} className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg flex items-center justify-center gap-2 transition-colors">
                                                    <Trash2 className="w-3 h-3" /> Clear Mask
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {isMergeMode && (
                                    <div className="p-3 bg-purple-500/5 border border-purple-500/20 rounded-xl text-[10px] text-purple-300 leading-relaxed animate-in fade-in duration-300">
                                        <Sparkles className="w-3 h-3 inline mr-1 text-purple-400" />
                                        Merging {selectedIndices.length} images. Use the prompt below to describe how they should be combined into one.
                                    </div>
                                )}

                                {/* Prompt Input */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                        {isMergeMode ? 'Merge Instructions' : 'Edit Instructions'}
                                    </label>
                                    <textarea 
                                        className="w-full min-h-[120px] bg-gray-900 border border-gray-700 rounded-xl p-4 text-sm text-white resize-none focus:border-orange-500 focus:outline-none placeholder-gray-600 leading-relaxed shadow-inner"
                                        placeholder={isMergeMode ? "Combine these into a single scene where..." : isDrawingMode ? "What should replace the red area?" : "Describe changes..."}
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                    />
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3">
                                    <button 
                                        onClick={clearAll}
                                        className="p-3 border border-gray-700 text-gray-400 rounded-xl hover:bg-gray-800 hover:text-white transition-colors"
                                        title="Clear All"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                    <button 
                                        onClick={handleAction}
                                        disabled={isProcessing || selectedIndices.length === 0 || !prompt.trim()}
                                        className={`flex-1 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-50
                                            ${isMergeMode 
                                                ? 'bg-gradient-to-r from-purple-600 to-indigo-500 hover:shadow-purple-900/40' 
                                                : 'bg-gradient-to-r from-orange-600 to-orange-500 hover:shadow-orange-900/40'}
                                        `}
                                    >
                                        {isProcessing ? <Loader2 className="animate-spin w-5 h-5" /> : (isMergeMode ? <Layers className="w-5 h-5" /> : <Wand2 className="w-5 h-5" />)}
                                        {isProcessing ? 'Processing...' : (isMergeMode ? 'Merge Images' : 'Generate Edit')}
                                    </button>
                                </div>
                            </div>
                        )}

                        <input type="file" accept="image/*" multiple className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                        {error && (
                            <div className="p-3 bg-red-900/20 border border-red-800 text-red-200 text-xs rounded-lg animate-in fade-in slide-in-from-top-2">
                                {error}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Preview Area */}
                <div className="flex-1 bg-black/50 relative flex items-center justify-center p-8 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]">
                    {selectedIndices.length > 0 ? (
                        <div className="flex flex-col md:flex-row gap-6 items-center w-full h-full max-w-5xl">
                            {/* Input Preview */}
                            <div className="flex-1 flex flex-col items-center gap-3 w-full h-full">
                                <div className="flex items-center justify-between w-full">
                                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                        {isMergeMode ? `${selectedIndices.length} Selected Sources` : 'Original Image'}
                                    </div>
                                    {!isMergeMode && isDrawingMode && (
                                        <span className="text-[10px] bg-orange-600 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">PAINTING MASK</span>
                                    )}
                                </div>

                                <div className="relative w-full h-full border border-gray-800 rounded-2xl bg-gray-950 overflow-hidden flex items-center justify-center shadow-2xl p-4">
                                    {isMergeMode ? (
                                        <div className="grid grid-cols-2 gap-2 w-full max-h-full overflow-y-auto p-2">
                                            {selectedIndices.map(idx => (
                                                <div key={idx} className="aspect-square rounded-lg overflow-hidden border border-white/10 shadow-lg">
                                                    <img src={imageGallery[idx]} className="w-full h-full object-cover" alt="Merge source" />
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="relative flex items-center justify-center max-w-full max-h-full">
                                            <img 
                                                ref={imgRef}
                                                src={activeOriginal!} 
                                                alt="Original" 
                                                className="max-w-full max-h-full object-contain rounded-lg" 
                                                onLoad={handleImageLoad}
                                            />
                                            <canvas 
                                                ref={canvasRef}
                                                onMouseDown={startDrawing}
                                                onMouseUp={stopDrawing}
                                                onMouseLeave={stopDrawing}
                                                onMouseMove={draw}
                                                className={`absolute inset-0 w-full h-full z-10 ${isDrawingMode ? 'cursor-crosshair pointer-events-auto' : 'pointer-events-none'}`}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="hidden md:flex text-gray-700">
                                <ArrowRight className={`w-8 h-8 ${isProcessing ? 'animate-pulse text-orange-500' : ''}`} />
                            </div>

                            {/* Result Area */}
                            <div className="flex-1 flex flex-col items-center gap-3 w-full h-full">
                                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest w-full">AI Output</div>
                                <div className={`relative w-full h-full border rounded-2xl overflow-hidden flex items-center justify-center p-1 transition-all ${editedImage ? 'border-orange-500/50 bg-gray-950 shadow-2xl' : 'border-gray-800 border-dashed bg-black/20'}`}>
                                    {editedImage ? (
                                        <>
                                            <img src={editedImage} alt="Result" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-500" />
                                            <div className="absolute top-4 right-4">
                                                <button 
                                                    onClick={handleDownload}
                                                    className="p-3 bg-black/60 hover:bg-orange-600 text-white rounded-full backdrop-blur-md border border-white/10 transition-all shadow-xl hover:scale-110 active:scale-95"
                                                    title="Download Result"
                                                >
                                                    <Download className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center text-gray-700">
                                            {isProcessing ? (
                                                <div className="flex flex-col items-center">
                                                    <div className="relative w-16 h-16 mb-4">
                                                        <div className={`absolute inset-0 border-2 rounded-full opacity-20 ${isMergeMode ? 'border-purple-500' : 'border-orange-500'}`}></div>
                                                        <div className={`absolute inset-0 border-2 rounded-full border-t-transparent animate-spin ${isMergeMode ? 'border-purple-500' : 'border-orange-500'}`}></div>
                                                        <Sparkles className={`absolute inset-0 m-auto w-6 h-6 animate-pulse ${isMergeMode ? 'text-purple-500' : 'text-orange-500'}`} />
                                                    </div>
                                                    <span className={`text-xs font-bold animate-pulse tracking-widest uppercase ${isMergeMode ? 'text-purple-500' : 'text-orange-500'}`}>
                                                        {isMergeMode ? 'Blending Pixels...' : 'AI is Redrawing...'}
                                                    </span>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mb-4 mx-auto">
                                                        <ImageIcon className="w-8 h-8 opacity-10" />
                                                    </div>
                                                    <span className="text-xs font-medium opacity-30 uppercase tracking-tighter text-center px-4">
                                                        {isMergeMode ? 'Describe how to merge these images' : 'Define an edit and hit generate'}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center animate-in fade-in duration-700">
                             <div className="w-24 h-24 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                                <Layers className="w-10 h-10 text-gray-800" />
                             </div>
                             <h3 className="text-2xl font-bold text-gray-800 mb-2">Editor Ready</h3>
                             <p className="text-gray-600 max-w-xs mx-auto">Upload images and select them from the gallery to start editing or merging.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImageEditorInterface;
