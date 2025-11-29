import { Brain, Sparkles, Layers, PenTool, Loader2, CheckCircle2 } from "lucide-react";
import Button from "../../components/common/Button";

const AIAssistant = ({ activeMode, onGenerate, generating, hasSolution }) => {
  const tools = [
    { id: 'explain', label: 'Explain Concept', icon: Brain, desc: "Understand the core topics" },
    { id: 'quiz', label: 'Generate Quiz', icon: Layers, desc: "Test your knowledge" },
    { id: 'flashcards', label: 'Flashcards', icon: Sparkles, desc: "Memorize key terms" },
    { id: 'draft', label: 'Draft Solution', icon: PenTool, desc: "Create a submission draft" },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="mb-2 px-1">
        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">AI Tools</h3>
      </div>

      {tools.map((tool) => {
        const isActive = activeMode === tool.id;
        return (
          <button
            key={tool.id}
            onClick={() => onGenerate(tool.id)}
            disabled={generating}
            className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all border ${isActive
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/20'
                : 'bg-zinc-900/40 border-transparent hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
          >
            <div className={`p-2 rounded-lg ${isActive ? 'bg-white/20' : 'bg-zinc-800'}`}>
              {generating && isActive ? <Loader2 size={18} className="animate-spin" /> : <tool.icon size={18} />}
            </div>
            <div>
              <p className="font-semibold text-sm">{tool.label}</p>
              <p className={`text-[10px] ${isActive ? 'text-indigo-200' : 'text-zinc-600'}`}>{tool.desc}</p>
            </div>
            {hasSolution(tool.id) && !isActive && (
              <CheckCircle2 size={14} className="ml-auto text-green-500" />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default AIAssistant;