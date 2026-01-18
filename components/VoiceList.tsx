import React, { useState, useMemo } from 'react';
import { Voice } from '../types';
import { VOICES } from '../constants';
import { Search, Play, Filter, RefreshCcw } from 'lucide-react';

interface VoiceListProps {
  selectedVoiceId: string;
  onSelectVoice: (id: string) => void;
}

const VoiceList: React.FC<VoiceListProps> = ({ selectedVoiceId, onSelectVoice }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState<'All' | 'Male' | 'Female'>('All');

  const filteredVoices = useMemo(() => {
    return VOICES.filter(voice => {
      const matchesSearch = voice.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            voice.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesGender = genderFilter === 'All' || voice.gender === genderFilter;
      return matchesSearch && matchesGender;
    });
  }, [searchTerm, genderFilter]);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl flex flex-col h-[600px] overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-gray-800 bg-gray-900/50">
        <div className="flex-1 py-4 text-sm font-medium text-white border-b-2 border-orange-500 bg-gray-800/30 text-center">
          Gemini Voices
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 space-y-3 bg-gray-900">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search voices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-950 border border-gray-700 rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
           <div className="relative flex-1">
             <select 
                className="w-full bg-gray-950 border border-gray-700 text-gray-400 text-xs rounded px-2 py-1.5 appearance-none focus:outline-none"
                disabled
             >
                <option>All Countries</option>
             </select>
           </div>
           <div className="relative flex-1">
             <select 
                className="w-full bg-gray-950 border border-gray-700 text-gray-400 text-xs rounded px-2 py-1.5 appearance-none focus:outline-none focus:border-orange-500 cursor-pointer"
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value as any)}
             >
                <option value="All">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
             </select>
           </div>
           <button 
             className="px-3 py-1.5 border border-gray-700 rounded text-xs text-gray-400 hover:bg-gray-800 transition-colors flex items-center gap-1"
             onClick={() => { setSearchTerm(''); setGenderFilter('All'); }}
           >
             <RefreshCcw className="w-3 h-3" /> Reset
           </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
        {filteredVoices.map((voice) => (
          <div
            key={voice.id}
            onClick={() => onSelectVoice(voice.id)}
            className={`
              group relative flex items-center p-3 rounded-xl border cursor-pointer transition-all
              ${selectedVoiceId === voice.id 
                ? 'bg-gray-800 border-orange-500/50 shadow-[0_0_10px_rgba(249,115,22,0.1)]' 
                : 'bg-gray-950/50 border-gray-800 hover:border-gray-700 hover:bg-gray-900'}
            `}
          >
            <div className={`w-10 h-10 rounded-full ${voice.avatarColor} flex items-center justify-center text-white font-bold text-sm mr-4 shadow-lg`}>
              {voice.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className={`font-semibold text-sm ${selectedVoiceId === voice.id ? 'text-white' : 'text-gray-200'}`}>
                  {voice.name}
                </h3>
                <div className="flex gap-1">
                  {voice.tags.slice(0, 2).map(tag => (
                    <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-800 text-gray-400 border border-gray-700">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-500 truncate">{voice.description}</p>
            </div>
            
            {selectedVoiceId === voice.id && (
                <div className="absolute right-3 w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]"></div>
            )}
          </div>
        ))}
        {filteredVoices.length === 0 && (
          <div className="text-center py-10 text-gray-500 text-sm">
            No voices found matching filters.
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceList;