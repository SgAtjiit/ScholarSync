import { useState, useEffect } from 'react';
import Button from '../../components/common/Button';
import { CheckCircle, XCircle, RefreshCw, Zap, Target, Brain, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

const Quiz = ({ content, onRegenerate }) => {
    let data = { questions: [] };
    try {
        data = typeof content === 'string' ? JSON.parse(content) : content;
    } catch (e) { console.error("JSON Parse error", e); }

    useEffect(() => {
        if (!data.questions || data.questions.length === 0) {
            toast.error("Error loading quiz data.");
        }
    }, []);

    const [answers, setAnswers] = useState({});
    const [submitted, setSubmitted] = useState({});
    const [shortAnswers, setShortAnswers] = useState({});
    const [showExplanation, setShowExplanation] = useState({});

    const getDifficultyBadge = (difficulty) => {
        const badges = {
            easy: { icon: Zap, color: 'text-green-400 bg-green-500/10 border-green-500/30', label: 'Easy' },
            medium: { icon: Target, color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30', label: 'Medium' },
            hard: { icon: Brain, color: 'text-red-400 bg-red-500/10 border-red-500/30', label: 'Hard' }
        };
        const badge = badges[difficulty] || badges.medium;
        const Icon = badge.icon;
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border ${badge.color}`}>
                <Icon size={10} /> {badge.label}
            </span>
        );
    };

    const handleSelect = (qIdx, oIdx) => {
        if (submitted[qIdx]) return;
        setAnswers({ ...answers, [qIdx]: oIdx });
    };

    const handleShortAnswer = (qIdx, value) => {
        if (submitted[qIdx]) return;
        setShortAnswers({ ...shortAnswers, [qIdx]: value });
    };

    const handleCheck = (qIdx) => {
        setSubmitted({ ...submitted, [qIdx]: true });
    };

    const toggleExplanation = (qIdx) => {
        setShowExplanation({ ...showExplanation, [qIdx]: !showExplanation[qIdx] });
    };

    // Render MCQ question
    const renderMCQ = (q, idx) => {
        const isSubmitted = submitted[idx];
        const userSelected = answers[idx];
        const isCorrect = userSelected === q.correctAnswer;

        return (
            <>
                <div className="space-y-3">
                    {q.options?.map((opt, oIdx) => {
                        let btnClass = "bg-zinc-900 border-zinc-700 text-zinc-400 hover:bg-zinc-800";

                        if (answers[idx] === oIdx && !isSubmitted) {
                            btnClass = "bg-indigo-500/20 border-indigo-500 text-indigo-200";
                        }

                        if (isSubmitted) {
                            if (oIdx === q.correctAnswer) {
                                btnClass = "bg-green-500/20 border-green-500 text-green-200";
                            } else if (answers[idx] === oIdx && !isCorrect) {
                                btnClass = "bg-red-500/20 border-red-500 text-red-200";
                            } else {
                                btnClass = "bg-zinc-900/50 border-transparent text-zinc-600 opacity-50";
                            }
                        }

                        return (
                            <button
                                key={oIdx}
                                onClick={() => handleSelect(idx, oIdx)}
                                className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between ${btnClass}`}
                            >
                                <span>{opt}</span>
                                {isSubmitted && oIdx === q.correctAnswer && <CheckCircle size={18} />}
                                {isSubmitted && answers[idx] === oIdx && !isCorrect && <XCircle size={18} />}
                            </button>
                        );
                    })}
                </div>

                {!isSubmitted && answers[idx] !== undefined && (
                    <div className="mt-4 flex justify-end">
                        <Button size="sm" onClick={() => handleCheck(idx)}>Check Answer</Button>
                    </div>
                )}

                {isSubmitted && (
                    <div className={`mt-4 p-3 rounded-lg text-sm ${isCorrect ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                        {isCorrect ? "✓ Correct! Well done." : "✗ Incorrect. The correct answer is highlighted above."}
                    </div>
                )}
            </>
        );
    };

    // Render True/False question
    const renderTrueFalse = (q, idx) => {
        const isSubmitted = submitted[idx];
        const userSelected = answers[idx];
        const isCorrect = userSelected === q.correctAnswer;

        return (
            <>
                <div className="flex gap-3">
                    {[true, false].map((option) => {
                        let btnClass = "bg-zinc-900 border-zinc-700 text-zinc-400 hover:bg-zinc-800";

                        if (answers[idx] === option && !isSubmitted) {
                            btnClass = "bg-indigo-500/20 border-indigo-500 text-indigo-200";
                        }

                        if (isSubmitted) {
                            if (option === q.correctAnswer) {
                                btnClass = "bg-green-500/20 border-green-500 text-green-200";
                            } else if (answers[idx] === option && !isCorrect) {
                                btnClass = "bg-red-500/20 border-red-500 text-red-200";
                            } else {
                                btnClass = "bg-zinc-900/50 border-transparent text-zinc-600 opacity-50";
                            }
                        }

                        return (
                            <button
                                key={String(option)}
                                onClick={() => handleSelect(idx, option)}
                                className={`flex-1 p-4 rounded-xl border transition-all flex items-center justify-center gap-2 ${btnClass}`}
                            >
                                {option ? <CheckCircle size={18} /> : <XCircle size={18} />}
                                <span className="font-medium">{option ? 'True' : 'False'}</span>
                            </button>
                        );
                    })}
                </div>

                {!isSubmitted && answers[idx] !== undefined && (
                    <div className="mt-4 flex justify-end">
                        <Button size="sm" onClick={() => handleCheck(idx)}>Check Answer</Button>
                    </div>
                )}

                {isSubmitted && (
                    <div className={`mt-4 p-3 rounded-lg text-sm ${isCorrect ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                        {isCorrect ? "✓ Correct!" : `✗ Incorrect. The statement is ${q.correctAnswer ? 'TRUE' : 'FALSE'}.`}
                    </div>
                )}
            </>
        );
    };

    // Render Short Answer question
    const renderShortAnswer = (q, idx) => {
        const isSubmitted = submitted[idx];

        return (
            <>
                <textarea
                    value={shortAnswers[idx] || ''}
                    onChange={(e) => handleShortAnswer(idx, e.target.value)}
                    placeholder="Type your answer here..."
                    disabled={isSubmitted}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-4 text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none min-h-[100px] disabled:opacity-60"
                />

                {!isSubmitted && shortAnswers[idx] && (
                    <div className="mt-4 flex justify-end">
                        <Button size="sm" onClick={() => handleCheck(idx)}>Submit Answer</Button>
                    </div>
                )}

                {isSubmitted && (
                    <div className="mt-4 space-y-2">
                        <div className="p-3 rounded-lg text-sm bg-indigo-500/10 text-indigo-400">
                            Answer submitted! Compare with the sample answer below.
                        </div>
                        <div className="p-4 rounded-lg bg-zinc-800 border border-white/5">
                            <p className="text-xs text-zinc-500 mb-1">Sample Answer:</p>
                            <p className="text-zinc-300">{q.sampleAnswer}</p>
                        </div>
                    </div>
                )}
            </>
        );
    };

    return (
        <div className="max-w-3xl mx-auto p-6 space-y-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white">Knowledge Check</h2>
                    <p className="text-sm text-zinc-500">{data.questions?.length || 0} questions</p>
                </div>
                {onRegenerate && (
                    <Button size="sm" variant="secondary" onClick={onRegenerate}>
                        <RefreshCw size={14} className="mr-2" /> Regenerate
                    </Button>
                )}
            </div>

            {data.questions?.map((q, idx) => {
                const questionType = q.type || 'mcq';

                return (
                    <div key={idx} className="bg-zinc-900/50 border border-white/5 p-6 rounded-2xl shadow-sm">
                        <div className="flex items-start justify-between gap-4 mb-4">
                            <p className="text-lg font-medium text-white">
                                <span className="text-indigo-500 font-bold mr-2">{idx + 1}.</span>{q.question}
                            </p>
                            {q.difficulty && getDifficultyBadge(q.difficulty)}
                        </div>

                        {questionType === 'mcq' && renderMCQ(q, idx)}
                        {questionType === 'truefalse' && renderTrueFalse(q, idx)}
                        {questionType === 'short' && renderShortAnswer(q, idx)}

                        {/* Explanation toggle */}
                        {submitted[idx] && q.explanation && (
                            <div className="mt-4">
                                <button
                                    onClick={() => toggleExplanation(idx)}
                                    className="flex items-center gap-2 text-sm text-zinc-400 hover:text-indigo-400 transition-colors"
                                >
                                    <Eye size={14} />
                                    {showExplanation[idx] ? 'Hide' : 'Show'} Explanation
                                </button>
                                {showExplanation[idx] && (
                                    <div className="mt-2 p-3 rounded-lg bg-zinc-800/50 border border-white/5 text-sm text-zinc-300">
                                        {q.explanation}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default Quiz;