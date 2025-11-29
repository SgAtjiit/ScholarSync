import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCcw } from 'lucide-react';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast'; // ✨ ADDED

const Flashcards = ({ content }) => {
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
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">Study Flashcards</h2>
        <Button size="sm" variant="secondary" onClick={() => setFlipped({})}>
          <RefreshCcw size={14} /> Reset
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {data.flashcards?.map((card, idx) => (
          <div
            key={idx}
            onClick={() => setFlipped(p => ({ ...p, [idx]: !p[idx] }))}
            className="h-64 cursor-pointer perspective-1000 group relative"
          >
            <motion.div
              className="w-full h-full transition-all duration-500 preserve-3d"
              animate={{ rotateY: flipped[idx] ? 180 : 0 }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Front */}
              <div
                className="absolute inset-0 backface-hidden bg-zinc-800 border border-white/5 rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-xl hover:border-indigo-500/30 transition-colors"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <span className="text-xs font-bold text-zinc-500 uppercase mb-4">Term</span>
                <p className="text-xl font-bold text-indigo-400">{card.front}</p>
                <p className="absolute bottom-4 text-xs text-zinc-600">Click to flip</p>
              </div>

              {/* Back */}
              <div
                className="absolute inset-0 backface-hidden bg-gradient-to-br from-indigo-900/80 to-purple-900/80 border border-indigo-500/30 rounded-2xl p-8 flex flex-col items-center justify-center text-center"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                <span className="text-xs font-bold text-indigo-200 uppercase mb-4">Definition</span>
                <p className="text-lg text-white leading-relaxed">{card.back}</p>
              </div>
            </motion.div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Flashcards;