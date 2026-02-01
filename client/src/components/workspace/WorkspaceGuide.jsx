import { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

const WorkspaceGuide = () => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mb-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 p-3 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-600/50 rounded-lg transition-all group"
      >
        <HelpCircle size={18} className="text-indigo-400 flex-shrink-0" />
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-indigo-100">💡 First time here?</p>
          <p className="text-xs text-indigo-200/70">Click to see navigation guide</p>
        </div>
        {expanded ? <ChevronUp size={18} className="text-indigo-400" /> : <ChevronDown size={18} className="text-indigo-400" />}
      </button>

      {expanded && (
        <div className="mt-3 p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg space-y-3 animate-in fade-in">
          <div className="space-y-2">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <span className="text-indigo-400">📖</span> How to use the workspace:
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Left Panel */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
                  <span className="text-indigo-400">📋</span> Left Panel
                </p>
                <ul className="text-xs text-zinc-400 space-y-1 ml-6">
                  <li>✨ <strong>Explain:</strong> Get detailed explanations of the assignment</li>
                  <li>🎯 <strong>Quiz:</strong> Generate practice quizzes from the content</li>
                  <li>📚 <strong>Flashcards:</strong> Create study flashcards automatically</li>
                  <li>✍️ <strong>Draft:</strong> Edit and save your solutions</li>
                </ul>
              </div>

              {/* Right Tabs */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
                  <span className="text-purple-400">🎨</span> Right Tabs
                </p>
                <ul className="text-xs text-zinc-400 space-y-1 ml-6">
                  <li>✨ <strong>AI Response:</strong> View generated content</li>
                  <li>📄 <strong>Document:</strong> View your PDFs/documents</li>
                  <li>💬 <strong>Chat:</strong> Ask AI questions about the assignment</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="h-px bg-zinc-700"></div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
              <span className="text-green-400">✅</span> Quick Steps:
            </p>
            <ol className="text-xs text-zinc-400 space-y-2 ml-4 list-decimal">
              <li>Select an <strong>AI tool</strong> from the left panel</li>
              <li>If you have <strong>multiple documents</strong>, choose one first</li>
              <li>Wait for the AI to <strong>generate content</strong></li>
              <li>Click <strong>Document</strong> tab to view reference materials</li>
              <li>Use <strong>Chat</strong> to ask follow-up questions</li>
              <li>Edit in <strong>Draft</strong> mode if needed</li>
            </ol>
          </div>

          <div className="h-px bg-zinc-700"></div>

          <div className="bg-amber-600/10 border border-amber-600/30 rounded p-3">
            <p className="text-xs text-amber-100/80">
              <strong>💡 Tip:</strong> Scroll the left panel to see all options and your assignment details. If you have multiple documents, you'll see a selector to choose which one to use for AI generation.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceGuide;
