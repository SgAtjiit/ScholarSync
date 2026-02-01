import { useState } from 'react';
import { X, Sparkles, Brain, Zap, Target, HelpCircle } from 'lucide-react';
import Button from './Button';

const QuizOptionsModal = ({ isOpen, onClose, onGenerate, isGenerating }) => {
    const [questionCount, setQuestionCount] = useState(5);
    const [difficulty, setDifficulty] = useState('medium');
    const [questionType, setQuestionType] = useState('mixed');

    if (!isOpen) return null;

    const difficulties = [
        { id: 'easy', label: 'Easy', icon: Zap, color: 'text-green-400', bgColor: 'bg-green-500/10 border-green-500/30', desc: 'Basic recall & understanding' },
        { id: 'medium', label: 'Medium', icon: Target, color: 'text-yellow-400', bgColor: 'bg-yellow-500/10 border-yellow-500/30', desc: 'Application & analysis' },
        { id: 'hard', label: 'Hard', icon: Brain, color: 'text-red-400', bgColor: 'bg-red-500/10 border-red-500/30', desc: 'Critical thinking & synthesis' },
    ];

    const questionTypes = [
        { id: 'mixed', label: 'Mixed', desc: 'MCQ + Short Answer' },
        { id: 'mcq', label: 'MCQ Only', desc: 'Multiple choice questions' },
        { id: 'short', label: 'Short Answer', desc: 'Open-ended questions' },
        { id: 'truefalse', label: 'True/False', desc: 'Binary choice questions' },
    ];

    const handleGenerate = () => {
        onGenerate({ questionCount, difficulty, questionType });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />
            
            {/* Modal */}
            <div className="relative bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md mx-4 overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 rounded-lg">
                            <HelpCircle className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">Quiz Options</h2>
                            <p className="text-xs text-zinc-500">Customize your practice quiz</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-zinc-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 space-y-6">
                    {/* Question Count */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-3">
                            Number of Questions
                        </label>
                        <div className="flex gap-2">
                            {[3, 5, 10, 15, 20].map((num) => (
                                <button
                                    key={num}
                                    onClick={() => setQuestionCount(num)}
                                    className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                                        questionCount === num
                                            ? 'bg-indigo-600 border-indigo-500 text-white'
                                            : 'bg-zinc-800/50 border-white/5 text-zinc-400 hover:border-white/20'
                                    }`}
                                >
                                    {num}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Difficulty */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-3">
                            Difficulty Level
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {difficulties.map((diff) => {
                                const Icon = diff.icon;
                                return (
                                    <button
                                        key={diff.id}
                                        onClick={() => setDifficulty(diff.id)}
                                        className={`p-3 rounded-xl border transition-all ${
                                            difficulty === diff.id
                                                ? `${diff.bgColor} border-2`
                                                : 'bg-zinc-800/50 border-white/5 hover:border-white/20'
                                        }`}
                                    >
                                        <Icon className={`w-5 h-5 mx-auto mb-1 ${diff.color}`} />
                                        <div className={`text-sm font-medium ${difficulty === diff.id ? diff.color : 'text-zinc-300'}`}>
                                            {diff.label}
                                        </div>
                                        <div className="text-xs text-zinc-500 mt-0.5">
                                            {diff.desc}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Question Type */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-3">
                            Question Type
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {questionTypes.map((type) => (
                                <button
                                    key={type.id}
                                    onClick={() => setQuestionType(type.id)}
                                    className={`p-3 rounded-xl border text-left transition-all ${
                                        questionType === type.id
                                            ? 'bg-indigo-500/10 border-indigo-500/50 border-2'
                                            : 'bg-zinc-800/50 border-white/5 hover:border-white/20'
                                    }`}
                                >
                                    <div className={`text-sm font-medium ${questionType === type.id ? 'text-indigo-300' : 'text-zinc-300'}`}>
                                        {type.label}
                                    </div>
                                    <div className="text-xs text-zinc-500 mt-0.5">
                                        {type.desc}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-white/5 bg-zinc-900/50">
                    <Button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 py-3"
                    >
                        <Sparkles className="w-4 h-4 mr-2" />
                        {isGenerating ? 'Generating...' : 'Generate Quiz'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default QuizOptionsModal;
