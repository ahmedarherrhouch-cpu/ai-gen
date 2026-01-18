import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2, Trash2, History, Plus, Image as ImageIcon, Globe, BrainCircuit, X, Paperclip, Mic, Square, Play } from 'lucide-react';
import { createChat, generateSpeech } from '../services/geminiService';
import { Chat, Content, Part } from "@google/genai";

interface Message {
    role: 'user' | 'model';
    text: string;
    images?: string[];
    audio?: string;
    groundingMetadata?: any; // For search sources
}

const ChatInterface: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [attachments, setAttachments] = useState<string[]>([]);
    const [showMenu, setShowMenu] = useState(false);
    
    // Audio Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [audioDraft, setAudioDraft] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    
    // Feature Toggles
    const [enableSearch, setEnableSearch] = useState(false);
    const [enableThinking, setEnableThinking] = useState(false);

    const chatRef = useRef<Chat | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Initialize Chat with persistence and config
    useEffect(() => {
        initializeChat();
    }, [enableSearch, enableThinking]); // Re-init when features toggle

    const initializeChat = () => {
        const savedHistory = localStorage.getItem('gemini_chat_history');
        let historyForSdk: Content[] = [];
        let initialMessages: Message[] = [];

        if (savedHistory) {
            try {
                initialMessages = JSON.parse(savedHistory);
                // Convert to SDK Content format (Simplified for history context)
                // Note: We strip images and audio from history sent to model to save tokens/complexity unless needed
                historyForSdk = initialMessages.map(msg => ({
                    role: msg.role,
                    parts: [{ text: msg.text }]
                }));
            } catch (e) {
                console.error("Failed to parse chat history", e);
            }
        }
        
        // Only set messages if it's the first load, otherwise we keep current state
        if (messages.length === 0 && initialMessages.length > 0) {
            setMessages(initialMessages);
        }

        chatRef.current = createChat(
            "You are a helpful and creative AI assistant. When the user speaks to you, reply in a conversational tone.", 
            historyForSdk,
            { enableSearch, enableThinking }
        );
    };

    // Save to persistence
    useEffect(() => {
        if (messages.length > 0) {
            localStorage.setItem('gemini_chat_history', JSON.stringify(messages));
        }
    }, [messages]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Handle clicks outside menu
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            Array.from(files).forEach((file: File) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setAttachments(prev => [...prev, reader.result as string]);
                };
                reader.readAsDataURL(file);
            });
        }
        setShowMenu(false);
    };

    const getSupportedMimeType = () => {
        const types = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/mp4',
            'audio/ogg'
        ];
        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                return type;
            }
        }
        return ''; // Default to browser default
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mimeType = getSupportedMimeType();
            
            // If mimeType is empty, let browser decide, otherwise use specific one
            const mediaRecorder = mimeType 
                ? new MediaRecorder(stream, { mimeType }) 
                : new MediaRecorder(stream);
                
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                // Create blob with the actual mime type used by the recorder
                const blob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
                const reader = new FileReader();
                reader.onloadend = () => {
                    setAudioDraft(reader.result as string);
                };
                reader.readAsDataURL(blob);
                
                // Cleanup
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err: any) {
            console.error("Error accessing microphone:", err);
            if (err.name === 'NotAllowedError') {
                alert("Microphone permission denied. Please allow access to use voice messaging.");
            } else {
                alert(`Could not start recording: ${err.message}`);
            }
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleSend = async () => {
        if ((!input.trim() && attachments.length === 0 && !audioDraft) || !chatRef.current) return;
        
        const userMsgText = input;
        const currentAttachments = [...attachments];
        const currentAudio = audioDraft;
        const isVoiceMessage = !!audioDraft; // Flag to check if user used voice
        
        setInput('');
        setAttachments([]);
        setAudioDraft(null);
        
        setMessages(prev => [...prev, { 
            role: 'user', 
            text: userMsgText, 
            images: currentAttachments,
            audio: currentAudio || undefined
        }]);
        setIsLoading(true);

        try {
            // Construct the message payload
            let messagePayload: any = { role: 'user', parts: [] };
            
            // Add Text
            if (userMsgText) {
                messagePayload.parts.push({ text: userMsgText });
            }

            // Add Images
            currentAttachments.forEach(imgData => {
                // Robust extraction of base64 data
                const parts = imgData.split(';base64,');
                if (parts.length === 2) {
                    const mimeType = parts[0].split(':')[1];
                    const data = parts[1];
                    messagePayload.parts.push({
                        inlineData: { mimeType, data }
                    });
                }
            });

            // Add Audio
            if (currentAudio) {
                 const parts = currentAudio.split(';base64,');
                 if (parts.length === 2) {
                    const mimeType = parts[0].split(':')[1];
                    const data = parts[1];
                    messagePayload.parts.push({
                        inlineData: { mimeType, data }
                    });
                 }
            }
            
            // If we have audio/images but no text, we might need a dummy text prompt 
            if (messagePayload.parts.length === 0) {
                 messagePayload.parts.push({ text: " " });
            }

            const sdkMessageParam = messagePayload.parts;

            const response = await chatRef.current.sendMessage({ message: sdkMessageParam });
            
            const text = response.text || "I couldn't generate a response.";
            const groundingMetadata = response.candidates?.[0]?.groundingMetadata;

            // Generate Audio Response if user sent a voice message
            let botAudioUrl: string | undefined = undefined;
            if (isVoiceMessage) {
                try {
                    // Use standard voice 'Zephyr' for chat responses
                    botAudioUrl = await generateSpeech(text, 'Zephyr', 'Neutral');
                } catch (e) {
                    console.error("Failed to generate audio response", e);
                }
            }

            setMessages(prev => [...prev, { 
                role: 'model', 
                text: text, 
                groundingMetadata, 
                audio: botAudioUrl 
            }]);

        } catch (error: any) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'model', text: `Error: ${error.message || "Failed to send message."}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearHistory = () => {
        setMessages([]);
        localStorage.removeItem('gemini_chat_history');
        initializeChat();
    };

    const renderGroundingSources = (metadata: any) => {
        if (!metadata || !metadata.groundingChunks) return null;
        
        // Extract Web URIs
        const sources = metadata.groundingChunks
            .filter((c: any) => c.web?.uri)
            .map((c: any) => ({ title: c.web.title, uri: c.web.uri }));

        if (sources.length === 0) return null;

        return (
            <div className="mt-3 pt-3 border-t border-gray-700/50">
                <p className="text-xs text-gray-400 font-semibold mb-2 flex items-center gap-1">
                    <Globe className="w-3 h-3" /> Sources
                </p>
                <div className="flex flex-wrap gap-2">
                    {sources.map((s: any, idx: number) => (
                        <a 
                            key={idx} 
                            href={s.uri} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[10px] bg-gray-800 hover:bg-gray-700 text-orange-400 border border-gray-700 px-2 py-1 rounded-md transition-colors truncate max-w-[200px]"
                        >
                            {s.title || s.uri}
                        </a>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl flex flex-col h-[600px] overflow-hidden shadow-2xl relative">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-800 bg-gray-950 flex justify-between items-center z-10">
                <div className="flex items-center gap-2 text-white font-medium">
                    <Bot className="w-5 h-5 text-orange-500" />
                    Gemini Chat
                    {enableThinking && <span className="text-[10px] bg-purple-900/50 text-purple-400 border border-purple-800 px-1.5 py-0.5 rounded">Thinking</span>}
                    {enableSearch && <span className="text-[10px] bg-blue-900/50 text-blue-400 border border-blue-800 px-1.5 py-0.5 rounded">Search</span>}
                </div>
                {messages.length > 0 && (
                    <button 
                        onClick={handleClearHistory}
                        className="text-xs text-gray-500 hover:text-red-400 flex items-center gap-1 transition-colors"
                        title="Clear History"
                    >
                        <Trash2 className="w-3.5 h-3.5" /> Clear
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-900/50 scrollbar-thin scrollbar-thumb-gray-800">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-60">
                        <History className="w-12 h-12 mb-3 opacity-50" />
                        <p className="text-sm font-medium">Start a conversation</p>
                        <p className="text-xs">Your history is saved automatically</p>
                    </div>
                )}
                {messages.map((m, i) => (
                    <div key={i} className={`flex gap-4 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {m.role === 'model' && (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center shadow-lg mt-1 shrink-0">
                                <Bot className="w-5 h-5 text-white" />
                            </div>
                        )}
                        <div className={`flex flex-col gap-2 max-w-[80%] ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                            {/* Images in User Message */}
                            {m.images && m.images.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-1 justify-end">
                                    {m.images.map((img, idx) => (
                                        <img key={idx} src={img} alt="attachment" className="w-32 h-32 object-cover rounded-lg border border-gray-700" />
                                    ))}
                                </div>
                            )}

                            {/* Audio in Message (User or Bot) */}
                            {m.audio && (
                                <div className="mb-1">
                                    <audio 
                                        controls 
                                        autoPlay={m.role === 'model'} // Auto-play if it's a response
                                        src={m.audio} 
                                        className="h-10 rounded-lg shadow-sm" 
                                    />
                                </div>
                            )}

                            <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-md ${m.role === 'user' ? 'bg-orange-600 text-white rounded-br-none' : 'bg-gray-800 text-gray-200 rounded-bl-none border border-gray-700'}`}>
                                <div className="whitespace-pre-wrap">{m.text}</div>
                                {m.role === 'model' && renderGroundingSources(m.groundingMetadata)}
                            </div>
                        </div>
                        {m.role === 'user' && (
                            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center mt-1 shrink-0">
                                <User className="w-5 h-5 text-gray-300" />
                            </div>
                        )}
                    </div>
                ))}
                {isLoading && (
                    <div className="flex gap-4 justify-start">
                         <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center shrink-0">
                            <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div className="bg-gray-800 p-4 rounded-2xl rounded-bl-none border border-gray-700">
                            <div className="flex gap-1">
                                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>
            
            {/* Input Area */}
            <div className="p-4 bg-gray-950 border-t border-gray-800 relative z-20">
                {/* Previews (Images or Audio) */}
                {(attachments.length > 0 || audioDraft) && (
                    <div className="flex gap-3 mb-3 overflow-x-auto pb-2 items-center">
                        {attachments.map((img, idx) => (
                            <div key={idx} className="relative group shrink-0">
                                <img src={img} alt="preview" className="w-16 h-16 object-cover rounded-lg border border-gray-700" />
                                <button 
                                    onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-md hover:bg-red-600"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                        {audioDraft && (
                            <div className="relative group shrink-0 bg-gray-800 p-2 rounded-lg border border-gray-700 flex items-center">
                                <audio controls src={audioDraft} className="h-8 w-48" />
                                <button 
                                    onClick={() => setAudioDraft(null)}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-md hover:bg-red-600"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex gap-3 items-end">
                    {/* Menu Button */}
                    <div className="relative" ref={menuRef}>
                        <button 
                            onClick={() => setShowMenu(!showMenu)}
                            className={`p-3 rounded-xl transition-all ${showMenu ? 'bg-gray-800 text-white' : 'bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-800'} border border-gray-700`}
                        >
                            <Plus className={`w-5 h-5 transition-transform ${showMenu ? 'rotate-45' : ''}`} />
                        </button>

                        {/* Popup Menu */}
                        {showMenu && (
                            <div className="absolute bottom-full left-0 mb-3 w-64 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-2 animate-in slide-in-from-bottom-2 fade-in duration-200">
                                {/* Upload */}
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center gap-3 p-3 hover:bg-gray-800 rounded-xl cursor-pointer text-gray-300 hover:text-white transition-colors"
                                >
                                    <div className="p-2 bg-gray-800 rounded-lg">
                                        <Paperclip className="w-4 h-4" />
                                    </div>
                                    <span className="text-sm font-medium">Add Photos/Files</span>
                                    <input 
                                        type="file" 
                                        multiple 
                                        accept="image/*"
                                        className="hidden" 
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                    />
                                </div>

                                {/* Thinking Mode */}
                                <div 
                                    onClick={() => setEnableThinking(!enableThinking)}
                                    className={`flex items-center gap-3 p-3 hover:bg-gray-800 rounded-xl cursor-pointer transition-colors ${enableThinking ? 'text-purple-400' : 'text-gray-300'}`}
                                >
                                    <div className={`p-2 rounded-lg ${enableThinking ? 'bg-purple-500/20' : 'bg-gray-800'}`}>
                                        <BrainCircuit className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium">Thinking Mode</span>
                                        <span className="text-[10px] opacity-70">Deep reasoning</span>
                                    </div>
                                    {enableThinking && <div className="ml-auto w-2 h-2 rounded-full bg-purple-500"></div>}
                                </div>

                                {/* Search Mode */}
                                <div 
                                    onClick={() => setEnableSearch(!enableSearch)}
                                    className={`flex items-center gap-3 p-3 hover:bg-gray-800 rounded-xl cursor-pointer transition-colors ${enableSearch ? 'text-blue-400' : 'text-gray-300'}`}
                                >
                                    <div className={`p-2 rounded-lg ${enableSearch ? 'bg-blue-500/20' : 'bg-gray-800'}`}>
                                        <Globe className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium">Web Search</span>
                                        <span className="text-[10px] opacity-70">Google Grounding</span>
                                    </div>
                                    {enableSearch && <div className="ml-auto w-2 h-2 rounded-full bg-blue-500"></div>}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Mic Button (or Recording Indicator) */}
                    <button
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`p-3 rounded-xl transition-all border ${
                            isRecording 
                                ? 'bg-red-500/20 border-red-500 text-red-500 animate-pulse' 
                                : 'bg-gray-900 border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800'
                        }`}
                        title={isRecording ? "Stop Recording" : "Record Voice Message"}
                    >
                        {isRecording ? <Square className="w-5 h-5 fill-current" /> : <Mic className="w-5 h-5" />}
                    </button>

                    {/* Text Input */}
                    <input 
                        className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-5 py-3 text-white focus:outline-none focus:border-orange-500 placeholder-gray-600 transition-colors shadow-inner"
                        placeholder={
                            isRecording ? "Recording audio..." : 
                            enableThinking ? "Ask a complex question..." : 
                            "Type a message..."
                        }
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        disabled={isRecording}
                    />
                    
                    {/* Send Button */}
                    <button 
                        onClick={handleSend}
                        disabled={(!input.trim() && attachments.length === 0 && !audioDraft) || isLoading || isRecording}
                        className="p-3 bg-orange-600 hover:bg-orange-500 rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95 shadow-lg shadow-orange-900/20"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ChatInterface;