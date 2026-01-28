
import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../utils/helpers';
import { Lock, ArrowRight, Map } from 'lucide-react';

interface DestinationGalleryProps {
  onSelect: (id: string) => void;
}

export const DestinationGallery: React.FC<DestinationGalleryProps> = ({ onSelect }) => {
  const { getTextColor } = useTheme();

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-blue-50 text-blue-600 mb-4 ring-1 ring-blue-100">
            <Map size={24} />
        </div>
        <h1 className={cn("text-4xl font-bold font-serif mb-3", getTextColor())}>Select Your Destination</h1>
        <p className="text-sm opacity-60 max-w-md mx-auto">Choose a region to start building your customized itinerary. New destinations are added seasonally.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Card 1: Kutch (Active) */}
        <button
          onClick={() => onSelect('kutch')}
          className={cn(
            "group relative h-96 w-full rounded-[2rem] overflow-hidden text-left shadow-2xl transition-all duration-500 hover:scale-[1.02] hover:shadow-blue-900/20",
            "border border-white/20 outline-none focus:ring-4 focus:ring-blue-500/20"
          )}
        >
          {/* Background Image */}
          <div className="absolute inset-0 bg-slate-900">
            <img
              src="https://rannutsav.net/wp-content/uploads/2025/08/white-desert-600x500.webp"
              alt="Kutch"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
          </div>

          {/* Badge */}
          <div className="absolute top-6 right-6 z-10">
            <span className="px-3 py-1 bg-white/10 backdrop-blur-md border border-white/30 text-white text-xs font-bold rounded-full shadow-lg flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Season Live 🌙
            </span>
          </div>

          {/* Content */}
          <div className="absolute bottom-0 left-0 p-10 w-full z-10">
            <h2 className="text-4xl font-bold text-white font-serif mb-3 leading-tight">The Great Rann of Kutch</h2>
            <p className="text-white/80 text-sm mb-8 line-clamp-2 leading-relaxed max-w-sm">
              Experience the white desert, cultural vibrancy, and artistic heritage of Gujarat.
            </p>
            
            <div className="flex items-center gap-3 text-white font-bold text-sm opacity-0 transform translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 delay-75">
              <span className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center">
                  <ArrowRight size={18} />
              </span>
              Start Planning
            </div>
          </div>
        </button>

        {/* Card 2: Coming Soon (Locked) */}
        <div className="relative h-96 w-full rounded-[2rem] overflow-hidden shadow-inner border border-slate-200 bg-slate-100 group select-none cursor-not-allowed">
           {/* Grayscale & Blur Background */}
           <div className="absolute inset-0 grayscale contrast-125 blur-[2px] opacity-40 mix-blend-multiply">
             <img 
               src="https://images.unsplash.com/photo-1598091383021-15ddea10925d?auto=format&fit=crop&w=800&q=80" 
               alt="Kashmir" 
               className="w-full h-full object-cover"
             />
           </div>
           
           {/* Lock Overlay */}
           <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/50 backdrop-blur-sm z-10">
              <div className="w-20 h-20 rounded-2xl bg-white shadow-xl flex items-center justify-center mb-6 transform rotate-3 transition-transform group-hover:rotate-0 duration-500">
                <Lock size={32} className="text-slate-400" />
              </div>
              <h3 className="text-2xl font-bold text-slate-700 font-serif">Kashmir & Ladakh</h3>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-3 bg-white/80 px-4 py-1.5 rounded-full border border-slate-200">Coming Soon</p>
           </div>
        </div>
      </div>
    </div>
  );
};
