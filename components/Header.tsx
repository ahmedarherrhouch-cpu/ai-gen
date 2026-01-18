import React from 'react';
import { MessageSquare, Image as ImageIcon, Mic, MessageCircle, BookOpen, Wand2, PenTool, Video, Clapperboard, ExternalLink } from 'lucide-react';
import { Tab } from '../types';

interface HeaderProps {
  currentTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const Header: React.FC<HeaderProps> = ({ currentTab, onTabChange }) => {
  const navItems: { name: string; icon: any; id: Tab }[] = [
    { name: 'Chat with AI', icon: MessageSquare, id: 'chat' },
    { name: 'Imagen', icon: ImageIcon, id: 'image' },
    { name: 'AI Editor', icon: Wand2, id: 'editor' },
    { name: 'Manga Creator', icon: PenTool, id: 'manga' },
    { name: 'DubMaster AI', icon: Video, id: 'dubbing' },
    { name: 'Speech Gen', icon: Mic, id: 'speech' },
    { name: 'Dialogue Gen', icon: MessageCircle, id: 'dialogue' },
    { name: 'Story Board', icon: BookOpen, id: 'story' },
  ];

  const videoUrl = "https://opal.google/?flow=drive:/1wG-g_oq2QqX3WhrNdBz5BY7ovPV-PRNy&mode=app";

  return (
    <header className="flex flex-col items-center pt-8 pb-6 px-4 bg-transparent relative z-10">
      {/* Navigation Tabs */}
      <div className="flex flex-wrap justify-center gap-4 mb-8">
        {navItems.map((item) => (
          <div
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`
              flex flex-col items-center justify-center w-24 h-24 rounded-2xl border transition-all cursor-pointer backdrop-blur-md select-none
              ${currentTab === item.id
                ? 'bg-gray-800/80 border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)] text-orange-500' 
                : 'bg-gray-900/50 border-gray-700 text-gray-400 hover:bg-gray-800/50 hover:border-gray-600'}
            `}
          >
            <item.icon className="w-6 h-6 mb-2" />
            <span className="text-xs font-medium text-center leading-tight">{item.name}</span>
          </div>
        ))}

        {/* AI Video External Link Item - Modified to open in new tab */}
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center w-24 h-24 rounded-2xl border bg-gray-900/50 border-gray-700 text-gray-400 hover:bg-gray-800/50 hover:border-orange-500 hover:text-orange-500 transition-all cursor-pointer backdrop-blur-md select-none group"
        >
          <div className="relative">
            <Clapperboard className="w-6 h-6 mb-2 group-hover:scale-110 transition-transform" />
            <ExternalLink className="w-2 h-2 absolute -top-1 -right-2 opacity-50" />
          </div>
          <span className="text-xs font-medium text-center leading-tight">AI Video</span>
        </a>
      </div>

      {/* Hero Text */}
      <div className="text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight">
          AI Creation Suite
        </h1>
        <p className="text-gray-400 text-lg">
          Unleash creativity with Gemini's Multimodal Capabilities
        </p>
      </div>
      
      {/* Decorative background particles (simplified) */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute top-10 left-[10%] w-2 h-2 bg-orange-500 rounded-full opacity-50 animate-pulse"></div>
          <div className="absolute top-20 right-[20%] w-1 h-1 bg-yellow-500 rounded-full opacity-30"></div>
          <div className="absolute bottom-40 left-[15%] w-1.5 h-1.5 bg-orange-400 rounded-full opacity-40"></div>
      </div>
    </header>
  );
};

export default Header;