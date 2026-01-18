import React, { useState } from 'react';
import { Book, PenTool, Layout, Image as ImageIcon, Sparkles, Loader2, Save, Download, ChevronRight, RefreshCw, User, MessageSquare, AlertTriangle, Plus, Trash2, Edit2, X, Settings2, Move } from 'lucide-react';
import { MangaProject, MangaPage, MangaCharacter, MangaPanel } from '../types';
import { generateMangaScript, generateMangaPanelImage } from '../services/geminiService';

const STYLES = [
    { id: 'shonen', label: 'Shonen (Action)', color: 'border-blue-500 text-blue-500' },
    { id: 'shojo', label: 'Shojo (Romance)', color: 'border-pink-500 text-pink-500' },
    { id: 'seinen', label: 'Seinen (Gritty)', color: 'border-gray-500 text-gray-400' },
    { id: 'horror', label: 'Horror', color: 'border-red-900 text-red-700' },
    { id: 'webtoon', label: 'Webtoon (Color)', color: 'border-green-500 text-green-500' },
];

const TEXT_POSITIONS = [
    { id: 'top-left', label: 'Top Left' },
    { id: 'top-right', label: 'Top Right' },
    { id: 'bottom-left', label: 'Bottom Left' },
    { id: 'bottom-right', label: 'Bottom Right' },
];

const MangaInterface: React.FC = () => {
    // Workflow State
    const [step, setStep] = useState<1 | 2>(1);
    
    // Data State
    const [concept, setConcept] = useState('');
    const [genre, setGenre] = useState('Action');
    const [pageCount, setPageCount] = useState(1);
    const [selectedStyle, setSelectedStyle] = useState('shonen');
    
    const [project, setProject] = useState<MangaProject | null>(null);
    const [isGeneratingScript, setIsGeneratingScript] = useState(false);
    
    // Panel Generation Tracking
    const [generatingPanelId, setGeneratingPanelId] = useState<string | null>(null);

    // Edit Modal State
    const [editPanel, setEditPanel] = useState<{pageIndex: number, panelIndex: number} | null>(null);
    const [editData, setEditData] = useState<MangaPanel | null>(null);

    // --- Step 1: Create Script ---
    const handleCreateScript = async () => {
        if (!concept.trim()) return;
        setIsGeneratingScript(true);
        try {
            const result = await generateMangaScript(concept, genre, pageCount);
            setProject({
                title: 'New Manga',
                genre,
                style: selectedStyle as any,
                characters: result.characters,
                pages: result.pages
            });
            setStep(2);
        } catch (error) {
            console.error(error);
            alert("Failed to generate script. Please try again or reduce page count.");
        } finally {
            setIsGeneratingScript(false);
        }
    };

    // --- Full Control Actions ---

    const handleAddPage = () => {
        if (!project) return;
        const newPage: MangaPage = {
            pageNumber: project.pages.length + 1,
            panels: []
        };
        setProject({
            ...project,
            pages: [...project.pages, newPage]
        });
    };

    const handleDeletePage = (pageIndex: number) => {
        if (!project) return;
        const newPages = project.pages.filter((_, idx) => idx !== pageIndex)
            .map((page, idx) => ({ ...page, pageNumber: idx + 1 })); // Re-number
        setProject({ ...project, pages: newPages });
    };

    const handleAddPanel = (pageIndex: number) => {
        if (!project) return;
        const newPages = [...project.pages];
        newPages[pageIndex].panels.push({
            description: "New panel description...",
            dialogue: "",
            speaker: ""
        });
        setProject({ ...project, pages: newPages });
    };

    const handleDeletePanel = (pageIndex: number, panelIndex: number) => {
        if (!project) return;
        const newPages = [...project.pages];
        newPages[pageIndex].panels.splice(panelIndex, 1);
        setProject({ ...project, pages: newPages });
    };

    const openEditPanel = (pageIndex: number, panelIndex: number) => {
        if (!project) return;
        setEditPanel({ pageIndex, panelIndex });
        setEditData({ ...project.pages[pageIndex].panels[panelIndex] });
    };

    const saveEditPanel = () => {
        if (!project || !editPanel || !editData) return;
        const newPages = [...project.pages];
        newPages[editPanel.pageIndex].panels[editPanel.panelIndex] = editData;
        setProject({ ...project, pages: newPages });
        setEditPanel(null);
        setEditData(null);
    };

    // --- Step 2: Character Editing ---
    const updateCharacter = (idx: number, field: keyof MangaCharacter, value: string) => {
        if (!project) return;
        const newChars = [...project.characters];
        newChars[idx] = { ...newChars[idx], [field]: value };
        setProject({ ...project, characters: newChars });
    };

    const handleAddCharacter = () => {
        if (!project) return;
        setProject({
            ...project,
            characters: [...project.characters, { name: 'New Character', role: 'Main', appearance: '' }]
        });
    };

    const handleDeleteCharacter = (idx: number) => {
        if (!project) return;
        const newChars = project.characters.filter((_, i) => i !== idx);
        setProject({ ...project, characters: newChars });
    };

    // --- Step 3: Image Generation ---
    const generatePanel = async (pageIndex: number, panelIndex: number) => {
        if (!project) return;
        
        const page = project.pages[pageIndex];
        const panel = page.panels[panelIndex];
        const uniqueId = `${pageIndex}-${panelIndex}`;
        
        setGeneratingPanelId(uniqueId);
        
        // Clear previous error
        const updatedProject = { ...project };
        updatedProject.pages[pageIndex].panels[panelIndex].error = null;
        setProject(updatedProject);

        try {
            const imageUrl = await generateMangaPanelImage(
                panel.description,
                project.style,
                '4:3', // Default manga panel ratio approx
                project.characters
            );
            
            // Update project state with new image
            const newPages = [...project.pages];
            newPages[pageIndex].panels[panelIndex] = { ...panel, imageUrl, error: null };
            setProject({ ...project, pages: newPages });
            
        } catch (error: any) {
            console.error("Panel Gen Error", error);
            const newPages = [...project.pages];
            newPages[pageIndex].panels[panelIndex] = { 
                ...panel, 
                error: error.message || "Failed to generate image" 
            };
            setProject({ ...project, pages: newPages });
        } finally {
            setGeneratingPanelId(null);
        }
    };

    const generateAllPanels = async () => {
        if (!project) return;
        // Simple sequential generation with significant delay to avoid rate limits
        for (let i = 0; i < project.pages.length; i++) {
            for (let j = 0; j < project.pages[i].panels.length; j++) {
                if (!project.pages[i].panels[j].imageUrl) {
                    await generatePanel(i, j);
                    // Add 6s delay between automatic calls to be safe with rate limits
                    await new Promise(resolve => setTimeout(resolve, 6000));
                }
            }
        }
    };

    const handleExport = () => {
        if (!project) return;
        
        const content = `
            <!DOCTYPE html>
            <html dir="auto">
            <head>
                <title>${project.title} - Export</title>
                <style>
                    body { font-family: sans-serif; background: #fff; color: #000; margin: 0; padding: 0; }
                    @page { size: A4; margin: 0; }
                    .page-container { 
                        width: 210mm; min-height: 297mm; padding: 20mm; margin: 0 auto;
                        box-sizing: border-box; page-break-after: always;
                        display: flex; flex-direction: column; background: white;
                    }
                    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
                    .header h1 { font-size: 24px; margin: 0; text-transform: uppercase; letter-spacing: 2px; }
                    .grid { 
                        display: grid; grid-template-columns: 1fr 1fr; gap: 15px; 
                        flex: 1; align-content: start;
                    }
                    .panel { 
                        border: 3px solid #000; position: relative; background: #f0f0f0; overflow: hidden; 
                        aspect-ratio: 4/3;
                        display: flex; align-items: center; justify-content: center;
                    }
                    .panel.wide { grid-column: span 2; aspect-ratio: 16/9; }
                    .panel img { width: 100%; height: 100%; object-fit: cover; filter: grayscale(100%) contrast(1.1); }
                    .bubble {
                        position: absolute; background: #fff; border: 2px solid #000; border-radius: 50%;
                        padding: 15px; font-size: 11px; font-weight: bold; max-width: 60%; z-index: 10;
                        box-shadow: 2px 2px 0 rgba(0,0,0,1); text-align: center; line-height: 1.3;
                    }
                    .bubble.top-right { top: 15px; right: 15px; }
                    .bubble.top-left { top: 15px; left: 15px; }
                    .bubble.bottom-right { bottom: 15px; right: 15px; }
                    .bubble.bottom-left { bottom: 15px; left: 15px; }
                    .speaker { 
                        display: block; font-size: 8px; color: #666; margin-top: 4px; text-transform: uppercase; font-weight: normal;
                    }
                    .footer { text-align: center; margin-top: auto; padding-top: 10px; font-size: 10px; color: #888; }
                    
                    @media print {
                        body { background: none; }
                        .page-container { border: none; margin: 0; width: 100%; min-height: 100vh; }
                    }
                </style>
            </head>
            <body>
                ${project.pages.map((page, pIdx) => `
                    <div class="page-container">
                        <div class="header">
                            <h1>${project.title}</h1>
                            <div style="font-size: 12px; margin-top: 5px;">Page ${page.pageNumber}</div>
                        </div>
                        <div class="grid">
                            ${page.panels.map((panel, idx) => {
                                const isWide = panel.description.length > 100 || idx % 3 === 0;
                                // Default logic if not set
                                const posClass = panel.textPosition || (idx % 2 === 0 ? 'bottom-right' : 'top-left');
                                return `
                                    <div class="panel ${isWide ? 'wide' : ''}">
                                        ${panel.imageUrl ? `<img src="${panel.imageUrl}" />` : '<span style="color:#999; font-size:10px;">Generating...</span>'}
                                        ${panel.dialogue ? `
                                            <div class="bubble ${posClass}">
                                                ${panel.dialogue}
                                                <span class="speaker">${panel.speaker}</span>
                                            </div>
                                        ` : ''}
                                    </div>
                                `;
                            }).join('')}
                        </div>
                        <div class="footer">
                            Generated by Gemini AI Manga Studio
                        </div>
                    </div>
                `).join('')}
                <script>
                    window.onload = () => { setTimeout(() => window.print(), 800); };
                </script>
            </body>
            </html>
        `;

        const blob = new Blob([content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
    };

    // Helper for Text Position Class
    const getTextPositionClass = (pos?: string, index?: number) => {
        if (pos) {
            switch(pos) {
                case 'top-left': return 'top-4 left-4';
                case 'top-right': return 'top-4 right-4';
                case 'bottom-left': return 'bottom-4 left-4';
                case 'bottom-right': return 'bottom-4 right-4';
                default: return 'bottom-4 right-4';
            }
        }
        // Default alternating logic
        return (index !== undefined && index % 2 === 0) ? 'bottom-4 right-4' : 'top-4 left-4';
    };

    // --- UI Renderers ---

    const renderSetup = () => (
        <div className="max-w-3xl mx-auto p-8 bg-gray-900 border border-gray-800 rounded-2xl animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-2">
                <PenTool className="w-8 h-8 text-orange-500" /> AI Manga Creator
            </h2>
            
            <div className="space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-400">Story Concept</label>
                    <textarea 
                        dir="auto"
                        className="w-full h-32 bg-gray-950 border border-gray-800 rounded-xl p-4 text-white focus:border-orange-500 focus:outline-none placeholder-gray-600 resize-none"
                        placeholder="A teenager discovers a magical notebook that brings drawings to life... (You can type in Arabic)"
                        value={concept}
                        onChange={(e) => setConcept(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-400">Genre</label>
                        <select 
                            className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none"
                            value={genre}
                            onChange={(e) => setGenre(e.target.value)}
                        >
                            <option>Action</option>
                            <option>Adventure</option>
                            <option>Romance</option>
                            <option>Fantasy</option>
                            <option>Sci-Fi</option>
                            <option>Slice of Life</option>
                            <option>Horror</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-400">Pages (Up to 100)</label>
                        <input 
                            type="number"
                            min="1"
                            max="100"
                            className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none"
                            value={pageCount}
                            onChange={(e) => setPageCount(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-400">Art Style</label>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {STYLES.map(style => (
                            <button
                                key={style.id}
                                onClick={() => setSelectedStyle(style.id)}
                                className={`p-3 rounded-xl border text-xs font-bold transition-all ${selectedStyle === style.id ? `bg-gray-800 ${style.color}` : 'border-gray-800 text-gray-500 hover:border-gray-600'}`}
                            >
                                {style.label}
                            </button>
                        ))}
                    </div>
                </div>

                <button 
                    onClick={handleCreateScript}
                    disabled={!concept || isGeneratingScript}
                    className="w-full py-4 mt-4 bg-gradient-to-r from-orange-600 to-orange-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg disabled:opacity-50 transition-all"
                >
                    {isGeneratingScript ? <Loader2 className="animate-spin" /> : <Sparkles className="w-5 h-5" />}
                    Generate Script & Characters
                </button>
            </div>
        </div>
    );

    const renderEditModal = () => {
        if (!editPanel || !editData) return null;
        return (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <Settings2 className="w-5 h-5 text-orange-500" /> Edit Panel
                        </h3>
                        <button onClick={() => setEditPanel(null)} className="text-gray-400 hover:text-white">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase">Visual Description (Prompt)</label>
                            <textarea 
                                className="w-full h-24 bg-gray-950 border border-gray-700 rounded-xl p-3 text-sm text-white resize-none focus:border-orange-500 focus:outline-none"
                                value={editData.description}
                                onChange={(e) => setEditData({...editData, description: e.target.value})}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase">Speaker</label>
                                <input 
                                    className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
                                    value={editData.speaker || ''}
                                    onChange={(e) => setEditData({...editData, speaker: e.target.value})}
                                />
                            </div>
                             <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase">Text Bubble Position</label>
                                <div className="relative">
                                    <select 
                                        className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none appearance-none"
                                        value={editData.textPosition || ''}
                                        onChange={(e) => setEditData({...editData, textPosition: e.target.value as any})}
                                    >
                                        <option value="">Auto (Default)</option>
                                        {TEXT_POSITIONS.map(pos => (
                                            <option key={pos.id} value={pos.id}>{pos.label}</option>
                                        ))}
                                    </select>
                                    <Move className="absolute right-3 top-2.5 w-4 h-4 text-gray-500 pointer-events-none" />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase">Dialogue</label>
                            <input 
                                className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
                                value={editData.dialogue || ''}
                                onChange={(e) => setEditData({...editData, dialogue: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end gap-3">
                        <button 
                            onClick={() => setEditPanel(null)}
                            className="px-4 py-2 text-gray-400 hover:text-white text-sm font-medium"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={saveEditPanel}
                            className="px-6 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-bold"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderWorkspace = () => (
        <div className="flex flex-col h-[850px] bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden relative">
            {/* Toolbar */}
            <div className="h-16 border-b border-gray-800 bg-gray-950 px-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => setStep(1)} className="text-gray-400 hover:text-white text-sm">Back to Setup</button>
                    <div className="h-6 w-px bg-gray-800"></div>
                    <h3 className="text-white font-bold flex items-center gap-2">
                         <Layout className="w-4 h-4 text-orange-500" />
                         {project?.title} 
                         <span className="text-xs font-normal text-gray-500 px-2 py-0.5 border border-gray-800 rounded-full">{project?.style}</span>
                    </h3>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={generateAllPanels}
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-orange-900/20"
                    >
                        <ImageIcon className="w-4 h-4" /> Generate All Art
                    </button>
                    <button 
                        onClick={handleExport}
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold rounded-lg flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" /> Export PDF
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar: Characters */}
                <div className="w-72 border-r border-gray-800 bg-gray-950/50 flex flex-col overflow-y-auto">
                    <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                        <div className="font-bold text-gray-400 text-xs uppercase tracking-wider flex items-center gap-2">
                            <User className="w-4 h-4" /> Characters
                        </div>
                        <button 
                            onClick={handleAddCharacter}
                            className="p-1.5 bg-gray-800 hover:bg-orange-600 rounded-md text-white transition-colors"
                            title="Add Character"
                        >
                            <Plus className="w-3 h-3" />
                        </button>
                    </div>
                    <div className="p-4 space-y-6">
                        {project?.characters.map((char, idx) => (
                            <div key={idx} className="space-y-2 group relative border-b border-gray-800 pb-4 last:border-0">
                                <div className="flex justify-between items-center">
                                     <input 
                                        dir="auto"
                                        className="w-full bg-transparent text-white font-bold border-none focus:ring-0 p-0 text-sm"
                                        value={char.name}
                                        onChange={(e) => updateCharacter(idx, 'name', e.target.value)}
                                        placeholder="Name"
                                    />
                                    <button 
                                        onClick={() => handleDeleteCharacter(idx)}
                                        className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                                <input 
                                    className="w-full bg-gray-900 border border-gray-800 rounded px-2 py-1 text-xs text-orange-400 placeholder-gray-600 focus:border-orange-500 focus:outline-none"
                                    value={char.role || ''}
                                    onChange={(e) => updateCharacter(idx, 'role', e.target.value)}
                                    placeholder="Role (e.g. Hero)"
                                />
                                <textarea 
                                    className="w-full h-24 bg-gray-900 border border-gray-800 rounded-lg p-3 text-xs text-gray-300 resize-none focus:border-orange-500 focus:outline-none"
                                    value={char.appearance}
                                    onChange={(e) => updateCharacter(idx, 'appearance', e.target.value)}
                                    placeholder="Appearance details..."
                                />
                            </div>
                        ))}
                         {project?.characters.length === 0 && (
                            <div className="text-center py-4 text-gray-600 text-xs italic">
                                No characters. Add one to start.
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Area: Manga Pages */}
                <div className="flex-1 overflow-y-auto p-8 bg-gray-900 scrollbar-thin scrollbar-thumb-gray-700">
                    <div className="max-w-4xl mx-auto space-y-12">
                        {project?.pages.map((page, pageIdx) => (
                            <div key={pageIdx} className="relative bg-white text-black p-8 shadow-2xl rounded-sm min-h-[500px] animate-in slide-in-from-bottom-5 duration-500">
                                {/* Page Controls */}
                                <div className="mb-4 flex justify-between items-center border-b-2 border-black pb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold uppercase tracking-widest text-sm">Page {page.pageNumber}</span>
                                        <button 
                                            onClick={() => handleDeletePage(pageIdx)}
                                            className="text-gray-400 hover:text-red-600 transition-colors p-1"
                                            title="Delete Page"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                    <span className="text-[10px] text-gray-500">Reads Right-to-Left</span>
                                </div>
                                
                                {/* Manga Grid Layout Simulation */}
                                <div className="grid grid-cols-2 gap-4">
                                    {page.panels.map((panel, panelIdx) => {
                                        const isWide = panel.description.length > 100 || panelIdx % 3 === 0;
                                        const posClass = getTextPositionClass(panel.textPosition, panelIdx);

                                        return (
                                            <div 
                                                key={panelIdx} 
                                                className={`relative border-4 border-black group overflow-hidden bg-gray-100 min-h-[300px] ${isWide ? 'col-span-2' : 'col-span-1'}`}
                                            >
                                                {/* Image Area */}
                                                {panel.imageUrl ? (
                                                    <img src={panel.imageUrl} className="w-full h-full object-cover grayscale contrast-125" alt="Panel" />
                                                ) : (
                                                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                                                        {generatingPanelId === `${pageIdx}-${panelIdx}` ? (
                                                            <div className="flex flex-col items-center">
                                                                <Loader2 className="w-8 h-8 animate-spin text-black mb-2" />
                                                                <span className="text-xs font-bold">Drawing...</span>
                                                            </div>
                                                        ) : panel.error ? (
                                                            <div className="flex flex-col items-center text-red-600">
                                                                <AlertTriangle className="w-8 h-8 mb-2" />
                                                                <p className="text-xs font-bold mb-2">Generation Failed</p>
                                                                <p className="text-[10px] mb-3 max-w-[150px]">{panel.error}</p>
                                                                <button 
                                                                    onClick={() => generatePanel(pageIdx, panelIdx)}
                                                                    className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 transition-colors"
                                                                >
                                                                    Retry
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <p className="text-xs text-gray-500 mb-2 italic line-clamp-3 select-none">{panel.description}</p>
                                                                <button 
                                                                    onClick={() => generatePanel(pageIdx, panelIdx)}
                                                                    className="px-3 py-1 bg-black text-white text-xs font-bold hover:bg-gray-800 transition-colors"
                                                                >
                                                                    Generate Art
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Dialogue Bubble Overlay */}
                                                {panel.dialogue && (
                                                    <div className={`absolute z-10 p-4 max-w-[80%] ${posClass}`}>
                                                        <div className="bg-white border-2 border-black rounded-[50%] p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center relative cursor-pointer hover:scale-105 transition-transform" onClick={() => openEditPanel(pageIdx, panelIdx)}>
                                                            <p dir="auto" className="text-sm font-bold font-comic leading-tight">{panel.dialogue}</p>
                                                            {/* Bubble Tail */}
                                                            <div className="absolute -bottom-2 right-4 w-4 h-4 bg-white border-r-2 border-b-2 border-black transform rotate-45"></div>
                                                        </div>
                                                        <div dir="auto" className="mt-1 text-[10px] font-bold bg-black text-white px-1 w-fit ml-auto">
                                                            {panel.speaker}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Panel Controls (Top Right) */}
                                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                                     <button 
                                                        onClick={() => openEditPanel(pageIdx, panelIdx)}
                                                        className="p-1.5 bg-black/80 text-white rounded hover:bg-orange-600"
                                                        title="Edit Details"
                                                     >
                                                         <Edit2 className="w-3 h-3" />
                                                     </button>
                                                     <button 
                                                        onClick={() => generatePanel(pageIdx, panelIdx)}
                                                        className="p-1.5 bg-black/80 text-white rounded hover:bg-blue-600"
                                                        title="Regenerate Image"
                                                     >
                                                         <RefreshCw className="w-3 h-3" />
                                                     </button>
                                                     <button 
                                                        onClick={() => handleDeletePanel(pageIdx, panelIdx)}
                                                        className="p-1.5 bg-black/80 text-white rounded hover:bg-red-600"
                                                        title="Delete Panel"
                                                     >
                                                         <Trash2 className="w-3 h-3" />
                                                     </button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                                
                                {/* Add Panel Button */}
                                <div className="mt-4 flex justify-center">
                                    <button 
                                        onClick={() => handleAddPanel(pageIdx)}
                                        className="text-gray-400 hover:text-black border-2 border-dashed border-gray-300 hover:border-black rounded-lg px-4 py-2 text-xs font-bold flex items-center gap-2 transition-all"
                                    >
                                        <Plus className="w-4 h-4" /> Add Panel
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* Add Page Button */}
                        <div className="flex justify-center pb-8">
                             <button 
                                onClick={handleAddPage}
                                className="bg-gray-800 hover:bg-orange-600 text-white rounded-xl px-8 py-4 font-bold flex items-center gap-2 transition-colors shadow-lg"
                             >
                                 <Plus className="w-5 h-5" /> Add New Page
                             </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {renderEditModal()}
        </div>
    );

    return (
        <div className="w-full">
            {step === 1 ? renderSetup() : renderWorkspace()}
        </div>
    );
};

export default MangaInterface;