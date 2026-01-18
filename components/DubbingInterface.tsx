
import React, { useState, useRef, useEffect } from 'react';
import { Upload, Mic, Play, Pause, Languages, Music, Video, Loader2, Sparkles, Volume2, ArrowRight, FileText, Download } from 'lucide-react';
import { translateScript, generateSpeech, extractScriptFromVideo } from '../services/geminiService';

const LANGUAGES = [
    { code: 'ar', name: 'Arabic (العربية)', flag: '🇸🇦' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'fr', name: 'French', flag: '🇫🇷' },
    { code: 'es', name: 'Spanish', flag: '🇪🇸' },
    { code: 'de', name: 'German', flag: '🇩🇪' },
    { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
];

const VOICES_MAP: Record<string, string> = {
    'formal_male': 'Charon',
    'formal_female': 'Kore',
    'fun_male': 'Puck',
    'fun_female': 'Zephyr',
    'anime_male': 'Fenrir',
    'anime_female': 'Aoede'
};

const DubbingInterface: React.FC = () => {
    // Input State
    const [videoSrc, setVideoSrc] = useState<string | null>(null);
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [script, setScript] = useState('');
    const [targetLang, setTargetLang] = useState('ar');
    const [voiceStyle, setVoiceStyle] = useState('formal_male');
    
    // Processing State
    const [status, setStatus] = useState<'idle' | 'extracting' | 'translating' | 'dubbing' | 'done' | 'exporting'>('idle');
    const [translatedScript, setTranslatedScript] = useState('');
    const [dubbedAudioUrl, setDubbedAudioUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Playback State
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setVideoSrc(url);
            setVideoFile(file);
            // Reset states
            setDubbedAudioUrl(null);
            setStatus('idle');
            setScript('');
            setTranslatedScript('');
        }
    };

    const handleAutoExtract = async () => {
        if (!videoFile) return;
        setStatus('extracting');
        setError(null);
        
        try {
            // Check file size (client-side limit for base64 handling)
            if (videoFile.size > 25 * 1024 * 1024) { // 25MB limit hint
                throw new Error("Video is too large for auto-extraction (Max 25MB). Please extract shorter clips or paste text manually.");
            }

            // Read file as Base64
            const reader = new FileReader();
            reader.readAsDataURL(videoFile);
            reader.onloadend = async () => {
                try {
                    const base64Result = reader.result as string;
                    const transcript = await extractScriptFromVideo(base64Result, videoFile.type);
                    setScript(transcript);
                    setStatus('idle');
                } catch (e: any) {
                    setError(e.message || "Failed to extract script.");
                    setStatus('idle');
                }
            };
            reader.onerror = () => {
                setError("Failed to read video file.");
                setStatus('idle');
            };
        } catch (e: any) {
            setError(e.message);
            setStatus('idle');
        }
    };

    const handleProcess = async () => {
        if (!script.trim()) {
            setError("Please enter or extract the script/subtitles.");
            return;
        }
        setError(null);
        setStatus('translating');

        try {
            // Step 1: Translate
            const translation = await translateScript(script, LANGUAGES.find(l => l.code === targetLang)?.name || 'Arabic');
            setTranslatedScript(translation);

            // Step 2: Dub (TTS)
            setStatus('dubbing');
            const voiceName = VOICES_MAP[voiceStyle] || 'Charon';
            const audioUrl = await generateSpeech(translation, voiceName, 'Neutral'); // Using generateSpeech from service
            
            setDubbedAudioUrl(audioUrl);
            setStatus('done');

        } catch (e: any) {
            setError(e.message || "Dubbing failed");
            setStatus('idle');
        }
    };

    const handleDownloadAudio = () => {
        if (!dubbedAudioUrl) return;
        try {
            const a = document.createElement('a');
            a.href = dubbedAudioUrl;
            a.download = `dubbed_audio_${targetLang}_${Date.now()}.wav`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (e) {
            console.error("Download failed", e);
        }
    };

    const handleDownloadVideo = async () => {
        if (!videoRef.current || !audioRef.current || !dubbedAudioUrl) return;

        const videoEl = videoRef.current;
        const audioEl = audioRef.current;
        
        // Ensure elements are cross-origin ready (though usually local blob)
        videoEl.crossOrigin = "anonymous";
        audioEl.crossOrigin = "anonymous";

        setStatus('exporting');
        const originalMuted = videoEl.muted;
        
        try {
            // Reset playback
            videoEl.pause();
            audioEl.pause();
            videoEl.currentTime = 0;
            audioEl.currentTime = 0;
            
            // Note: captureStream is experimental, using 'any' to bypass TS check
            // Use mozCaptureStream for Firefox if standard not available
            const videoStream = (videoEl as any).captureStream ? (videoEl as any).captureStream() : (videoEl as any).mozCaptureStream ? (videoEl as any).mozCaptureStream() : null;
            const audioStream = (audioEl as any).captureStream ? (audioEl as any).captureStream() : (audioEl as any).mozCaptureStream ? (audioEl as any).mozCaptureStream() : null;
            
            if (!videoStream || !audioStream) {
                throw new Error("Your browser does not support video export (captureStream). Please use Chrome or Firefox.");
            }

            // Wait a moment for streams to be active
            await new Promise(r => setTimeout(r, 100));

            // Create combined stream: Video from original, Audio from dub
            const combinedStream = new MediaStream([
                ...videoStream.getVideoTracks(),
                ...audioStream.getAudioTracks()
            ]);

            // Determine supported mime type
            let mimeType = 'video/webm';
            if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
                mimeType = 'video/webm;codecs=vp9';
            } else if (MediaRecorder.isTypeSupported('video/mp4')) {
                mimeType = 'video/mp4';
            }

            const mediaRecorder = new MediaRecorder(combinedStream, {
                mimeType: mimeType,
                videoBitsPerSecond: 2500000 // 2.5 Mbps
            });

            const chunks: BlobPart[] = [];
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: mimeType });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `dubbed_video_${targetLang}_${Date.now()}.webm`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                
                // Cleanup
                setStatus('done');
                videoEl.muted = originalMuted; 
                setIsPlaying(false);
            };

            // Start recording
            mediaRecorder.start();
            
            // Mute video element so we don't hear/record original audio
            // (We only grabbed video track, but good to be safe for playback perception)
            videoEl.muted = true; 

            // Play both to feed the recorder
            const playVideo = videoEl.play();
            const playAudio = audioEl.play();
            
            await Promise.all([playVideo, playAudio]);
            setIsPlaying(true);

            // Stop when audio ends (or video ends, whichever is shorter/desired)
            audioEl.onended = () => {
                if (mediaRecorder.state !== 'inactive') {
                    mediaRecorder.stop();
                }
                videoEl.pause();
                audioEl.onended = null;
            };

            // Safety timeout: if audio is super long, or something fails
            // const maxDuration = videoEl.duration * 1000 + 2000;
            // setTimeout(() => { if (mediaRecorder.state !== 'inactive') mediaRecorder.stop(); }, maxDuration);

        } catch (e: any) {
            console.error(e);
            alert("Export failed: " + e.message);
            setStatus('done');
            videoEl.muted = originalMuted;
        }
    };

    // Sync Playback (Manual toggle)
    const togglePlay = () => {
        if (status === 'exporting') return; // Disable manual toggle during export

        if (videoRef.current && audioRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
                audioRef.current.pause();
            } else {
                videoRef.current.play();
                audioRef.current.play();
                // Ensure audio is muted on video to hear dub
                videoRef.current.muted = true; 
            }
            setIsPlaying(!isPlaying);
        } else if (videoRef.current) {
             // Fallback if only video exists (no dub yet)
             if (isPlaying) videoRef.current.pause(); else videoRef.current.play();
             setIsPlaying(!isPlaying);
        }
    };

    // Reset sync when audio ends (normal playback)
    useEffect(() => {
        const audio = audioRef.current;
        const onEnded = () => {
            if (status !== 'exporting') {
                setIsPlaying(false);
                if (videoRef.current) videoRef.current.pause();
            }
        };
        if (audio) {
            audio.addEventListener('ended', onEnded);
            return () => audio.removeEventListener('ended', onEnded);
        }
    }, [dubbedAudioUrl, status]);

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-3xl flex flex-col lg:flex-row h-[750px] overflow-hidden shadow-2xl">
            {/* Left Sidebar: Controls */}
            <div className="w-full lg:w-1/3 bg-gray-950/50 border-r border-gray-800 p-6 flex flex-col gap-6 overflow-y-auto">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Video className="w-6 h-6 text-orange-500" /> DubMaster AI
                    </h2>
                    <p className="text-sm text-gray-400">Professional AI Video Dubbing & Translation</p>
                </div>

                {/* Video Upload */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">1. Upload Video</label>
                    <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-gray-700 rounded-xl hover:bg-gray-800/50 cursor-pointer transition-colors group">
                        <Upload className="w-6 h-6 text-gray-500 group-hover:text-orange-500 mb-2 transition-colors" />
                        <span className="text-xs text-gray-400">Click to upload MP4, MOV, AVI</span>
                        <input type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
                    </label>
                </div>

                {/* Script Input (Since we can't extract from video client-side easily without heavy libs) */}
                <div className="space-y-2 flex-1 min-h-[150px]">
                    <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                            2. Original Script
                        </label>
                        {videoFile && (
                            <button 
                                onClick={handleAutoExtract}
                                disabled={status === 'extracting' || status === 'exporting'}
                                className="text-[10px] bg-gray-800 hover:bg-orange-600 text-white px-2 py-1 rounded-md flex items-center gap-1 transition-colors border border-gray-700 disabled:opacity-50"
                            >
                                {status === 'extracting' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                Auto-Extract Text
                            </button>
                        )}
                    </div>
                    <textarea 
                        className="w-full h-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm text-white focus:border-orange-500 focus:outline-none resize-none placeholder-gray-600"
                        placeholder={status === 'extracting' ? "AI is listening to the video..." : "Paste script here or use Auto-Extract..."}
                        value={script}
                        onChange={(e) => setScript(e.target.value)}
                        disabled={status === 'extracting' || status === 'exporting'}
                    />
                </div>

                {/* Settings */}
                <div className="space-y-4">
                     <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">3. Dubbing Settings</label>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <span className="text-[10px] text-gray-400">Target Language</span>
                            <div className="relative">
                                <select 
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white appearance-none focus:border-orange-500 outline-none"
                                    value={targetLang}
                                    onChange={(e) => setTargetLang(e.target.value)}
                                    disabled={status === 'exporting'}
                                >
                                    {LANGUAGES.map(l => (
                                        <option key={l.code} value={l.code}>{l.flag} {l.name}</option>
                                    ))}
                                </select>
                                <Languages className="absolute right-3 top-2.5 w-4 h-4 text-gray-500 pointer-events-none" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] text-gray-400">Voice Style</span>
                            <div className="relative">
                                <select 
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white appearance-none focus:border-orange-500 outline-none"
                                    value={voiceStyle}
                                    onChange={(e) => setVoiceStyle(e.target.value)}
                                    disabled={status === 'exporting'}
                                >
                                    <option value="formal_male">Formal (Male)</option>
                                    <option value="formal_female">Formal (Female)</option>
                                    <option value="fun_male">Fun (Male)</option>
                                    <option value="fun_female">Fun (Female)</option>
                                    <option value="anime_male">Anime (Male)</option>
                                    <option value="anime_female">Anime (Female)</option>
                                </select>
                                <Mic className="absolute right-3 top-2.5 w-4 h-4 text-gray-500 pointer-events-none" />
                            </div>
                        </div>
                     </div>
                </div>

                {/* Action Button */}
                <button 
                    onClick={handleProcess}
                    // Fixed redundant status check that caused TypeScript narrowing error. 
                    // 'status === "exporting"' is already caught by 'status !== "idle" && status !== "done"'.
                    disabled={status !== 'idle' && status !== 'done' || !videoSrc || !script}
                    className="w-full py-4 bg-gradient-to-r from-orange-600 to-orange-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(249,115,22,0.4)] disabled:opacity-50 disabled:shadow-none transition-all"
                >
                    {status === 'translating' ? (
                        <><Loader2 className="animate-spin w-5 h-5" /> Translating Script...</>
                    ) : status === 'dubbing' ? (
                        <><Loader2 className="animate-spin w-5 h-5" /> Generating Voice...</>
                    ) : status === 'extracting' ? (
                        <><Loader2 className="animate-spin w-5 h-5" /> Extracting Text...</>
                    ) : (
                        <><Sparkles className="w-5 h-5 fill-white" /> Generate Dub</>
                    )}
                </button>
                
                {error && (
                    <div className="p-3 bg-red-900/20 border border-red-800 text-red-200 text-xs rounded-lg text-center">
                        {error}
                    </div>
                )}
            </div>

            {/* Right Panel: Preview & Result */}
            <div className="flex-1 bg-black flex flex-col">
                <div className="flex-1 relative flex items-center justify-center bg-[url('https://grainy-gradients.vercel.app/noise.svg')]">
                    {videoSrc ? (
                        <div className="relative w-full max-w-4xl px-8">
                            <video 
                                ref={videoRef}
                                src={videoSrc} 
                                className="w-full rounded-xl border border-gray-800 shadow-2xl"
                                onPlay={() => { if(status !== 'exporting') setIsPlaying(true) }}
                                onPause={() => { if(status !== 'exporting') setIsPlaying(false) }}
                            />
                            {/* Hidden Audio Player for Dub */}
                            {dubbedAudioUrl && (
                                <audio ref={audioRef} src={dubbedAudioUrl} />
                            )}
                            
                            {/* Download Button Overlay (Top Right) */}
                            {dubbedAudioUrl && status !== 'exporting' && (
                                <div className="absolute top-4 right-10 flex gap-2 z-20 animate-in fade-in duration-300">
                                    <button
                                        onClick={handleDownloadVideo}
                                        className="bg-black/60 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg backdrop-blur-md border border-white/10 text-xs font-bold flex items-center gap-2 shadow-lg transition-all"
                                        title="Download Dubbed Video"
                                    >
                                        <Download className="w-3 h-3" /> Download Video
                                    </button>
                                </div>
                            )}

                            {/* Custom Play Button Overlay */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                {!isPlaying && status !== 'exporting' && (
                                    <div className="bg-black/60 backdrop-blur-sm p-6 rounded-full border border-white/10 pointer-events-auto cursor-pointer hover:scale-110 transition-transform" onClick={togglePlay}>
                                        <Play className="w-10 h-10 text-white fill-white ml-1" />
                                    </div>
                                )}
                            </div>

                            {/* Status Overlay */}
                            {status !== 'idle' && status !== 'done' && (
                                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur px-6 py-3 rounded-full border border-orange-500/50 text-white flex items-center gap-3 shadow-xl z-20">
                                    <Loader2 className="animate-spin w-5 h-5 text-orange-500" />
                                    <span className="font-medium text-sm">
                                        {status === 'extracting' ? 'AI Listening & Extracting Text...' : 
                                         status === 'translating' ? 'AI Translating Script...' : 
                                         status === 'dubbing' ? 'AI Synthesizing Audio...' : 
                                         'Rendering Video (Please wait)...'}
                                    </span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center opacity-40">
                            <Video className="w-20 h-20 mx-auto mb-4 stroke-1" />
                            <h3 className="text-2xl font-bold mb-2">No Video Uploaded</h3>
                            <p>Upload a video to start the dubbing process</p>
                        </div>
                    )}
                </div>

                {/* Results Panel */}
                <div className="h-48 bg-gray-900 border-t border-gray-800 p-6 flex gap-6">
                    <div className="flex-1 bg-gray-950 border border-gray-800 rounded-xl p-4 overflow-y-auto">
                        <div className="flex items-center gap-2 mb-2">
                             <span className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">AI Translated Script</span>
                             {translatedScript && <span className="text-[10px] text-green-500">✓ Ready</span>}
                        </div>
                        <p className="text-sm text-gray-300 whitespace-pre-wrap font-light leading-relaxed" dir="auto">
                            {translatedScript || "Translation will appear here..."}
                        </p>
                    </div>
                    
                    <div className="w-64 bg-gray-950 border border-gray-800 rounded-xl p-4 flex flex-col justify-between">
                         <div className="h-full flex flex-col justify-between">
                            <div className="text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-2">Download Result</div>
                            {dubbedAudioUrl ? (
                                <div className="flex flex-col gap-2">
                                    <button 
                                        onClick={handleDownloadAudio}
                                        className={`w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all border border-gray-700 hover:border-gray-500 ${status === 'exporting' ? 'opacity-50 pointer-events-none' : ''}`}
                                    >
                                        <Music className="w-4 h-4" /> Download Audio
                                    </button>

                                    <button
                                        onClick={handleDownloadVideo}
                                        disabled={status === 'exporting'}
                                        className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-900/20 disabled:opacity-50"
                                    >
                                        {status === 'exporting' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                                        {status === 'exporting' ? 'Rendering...' : 'Download Video'}
                                    </button>
                                </div>
                            ) : (
                                <div className="text-gray-600 text-sm italic h-full flex items-center justify-center text-center">
                                    Generate dub to download files
                                </div>
                            )}
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DubbingInterface;
