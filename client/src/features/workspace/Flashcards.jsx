import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCcw, RefreshCw } from 'lucide-react';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast'; // ✨ ADDED

const Flashcards = ({ content, onRegenerate }) => {
  let data = { flashcards: [] };
  try {
    data = typeof content === 'string' ? JSON.parse(content) : content;
  } catch (e) { console.error("JSON Parse error", e); }

  // ✨ ADDED: Error Toast if content is empty
  useEffect(() => {
    if (!data.flashcards || data.flashcards.length === 0) {
      toast.error("Could not load flashcards content.");
    }
  }, []);

  const [flipped, setFlipped] = useState({});

  return (
    <div className="p-3 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-bold text-white">Study Flashcards</h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button size="sm" variant="secondary" onClick={() => setFlipped({})} className="flex-1 sm:flex-none">
            <RefreshCcw size={14} className="mr-1" /> Reset
          </Button>
          {onRegenerate && (
            <Button size="sm" variant="secondary" onClick={onRegenerate} className="flex-1 sm:flex-none">
              <RefreshCw size={14} className="mr-1" /> Regenerate
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
        {data.flashcards?.map((card, idx) => (
          <div
            key={idx}
            onClick={() => setFlipped(p => ({ ...p, [idx]: !p[idx] }))}
            className="h-48 sm:h-64 cursor-pointer perspective-1000 group relative"
          >
            <motion.div
              className="w-full h-full transition-all duration-500 preserve-3d"
              animate={{ rotateY: flipped[idx] ? 180 : 0 }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Front */}
              <div
                className="absolute inset-0 backface-hidden bg-zinc-800 border border-white/5 rounded-xl sm:rounded-2xl p-4 sm:p-8 flex flex-col items-center justify-center text-center shadow-xl hover:border-indigo-500/30 transition-colors"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <span className="text-[10px] sm:text-xs font-bold text-zinc-500 uppercase mb-2 sm:mb-4">Term</span>
                <p className="text-base sm:text-xl font-bold text-indigo-400 line-clamp-3">{card.front}</p>
                <p className="absolute bottom-2 sm:bottom-4 text-[10px] sm:text-xs text-zinc-600">Tap to flip</p>
              </div>

              {/* Back */}
              <div
                className="absolute inset-0 backface-hidden bg-gradient-to-br from-indigo-900/80 to-purple-900/80 border border-indigo-500/30 rounded-xl sm:rounded-2xl p-4 sm:p-8 flex flex-col items-center justify-center text-center"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                <span className="text-[10px] sm:text-xs font-bold text-indigo-200 uppercase mb-2 sm:mb-4">Definition</span>
                <p className="text-sm sm:text-lg text-white leading-relaxed line-clamp-4 sm:line-clamp-none">{card.back}</p>
              </div>
            </motion.div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Flashcards;