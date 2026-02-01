import { Brain, Sparkles, Layers, PenTool, Loader2, CheckCircle2 } from "lucide-react";
import Button from "../../components/common/Button";

const AIAssistant = ({ activeMode, onGenerate, generating, hasSolution }) => {
  const tools = [
    { id: 'explain', label: 'Explain', icon: Brain, desc: "Understand the core topics" },
    { id: 'quiz', label: 'Quiz', icon: Layers, desc: "Test your knowledge" },
    { id: 'flashcards', label: 'Cards', icon: Sparkles, desc: "Memorize key terms" },
    { id: 'draft', label: 'Draft', icon: PenTool, desc: "Create a submission draft" },
  ];

  return (
    <div className="flex flex-col gap-2 sm:gap-3">
      <div className="mb-1 sm:mb-2 px-1">
        <h3 className="text-xs sm:text-sm font-bold text-zinc-400 uppercase tracking-wider">AI Tools</h3>
      </div>

      {/* Horizontal scroll on mobile, vertical on desktop */}
      <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 -mx-2 px-2 lg:mx-0 lg:px-0 scrollbar-hide">
        {tools.map((tool) => {
          const isActive = activeMode === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => onGenerate(tool.id)}
              disabled={generating}
              className={`flex-shrink-0 lg:flex-shrink flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl text-left transition-all border min-w-[100px] lg:min-w-0 lg:w-full ${isActive
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/20'
                  : 'bg-zinc-900/40 border-transparent hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
            >
              <div className={`p-1.5 sm:p-2 rounded-lg ${isActive ? 'bg-white/20' : 'bg-zinc-800'}`}>
                {generating && isActive ? <Loader2 size={16} className="animate-spin" /> : <tool.icon size={16} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-xs sm:text-sm truncate">{tool.label}</p>
                <p className={`text-[9px] sm:text-[10px] truncate hidden sm:block ${isActive ? 'text-indigo-200' : 'text-zinc-600'}`}>{tool.desc}</p>
              </div>
              {hasSolution(tool.id) && !isActive && (
                <CheckCircle2 size={12} className="flex-shrink-0 text-green-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AIAssistant;