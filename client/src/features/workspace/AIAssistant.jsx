import { Brain, HelpCircle, Layers, PenTool, Loader2, Check } from 'lucide-react';

const AIAssistant = ({ activeMode, onGenerate, generating, hasSolution, disabled }) => {
  const modes = [
    { id: 'explain', label: 'Explain', icon: Brain, description: 'Explain the document' },
    { id: 'quiz', label: 'Create Quiz', icon: HelpCircle, description: 'Test your knowledge' },
    { id: 'flashcards', label: 'Make Flashcards', icon: Layers, description: 'For quick review' },
    { id: 'draft', label: 'Draft Solution', icon: PenTool, description: 'Start your assignment' },
  ];

  return (
    <div className={`grid grid-cols-2 gap-2 sm:gap-3 ${disabled ? 'opacity-50' : ''}`}>
      {modes.map(mode => {
        const isGenerating = generating && activeMode === mode.id;
        const isCompleted = hasSolution(mode.id);

        return (
          <button
            key={mode.id}
            onClick={() => onGenerate(mode.id)}
            disabled={isGenerating || disabled}
            className={`relative flex flex-col items-center justify-center text-center p-3 sm:p-4 rounded-xl transition-all border ${
              activeMode === mode.id
                ? 'bg-indigo-600/30 border-indigo-500 text-white'
                : 'bg-zinc-800/50 border-zinc-700/50 hover:bg-zinc-700/70 hover:border-indigo-500/50'
            } ${isGenerating ? 'animate-pulse' : ''}`}
          >
            <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-zinc-900/70 mb-2">
              <mode.icon className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors ${activeMode === mode.id ? 'text-indigo-300' : 'text-zinc-400'}`} />
            </div>
            <p className="text-xs sm:text-sm font-semibold text-zinc-200">{mode.label}</p>
            
            {isGenerating && (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/50 rounded-xl">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
              </div>
            )}
            
            {isCompleted && activeMode !== mode.id && (
              <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 flex items-center justify-center w-4 h-4 rounded-full bg-green-500/80">
                <Check size={10} className="text-white" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default AIAssistant;