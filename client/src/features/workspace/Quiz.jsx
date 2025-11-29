import { useState, useEffect } from 'react';
import Button from '../../components/common/Button';
import { CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast'; // ✨ ADDED

const Quiz = ({ content }) => {
    let data = { questions: [] };
    try {
        data = typeof content === 'string' ? JSON.parse(content) : content;
    } catch (e) { console.error("JSON Parse error", e); }

    // ✨ ADDED: Error Toast if content is empty
    useEffect(() => {
        if (!data.questions || data.questions.length === 0) {
            toast.error("Error loading quiz data.");
        }
    }, []);

    const [answers, setAnswers] = useState({});
    const [submitted, setSubmitted] = useState({});

    const handleSelect = (qIdx, oIdx) => {
        if (submitted[qIdx]) return;
        setAnswers({ ...answers, [qIdx]: oIdx });
    };

    const handleCheck = (qIdx) => {
        setSubmitted({ ...submitted, [qIdx]: true });
    };

    return (
        <div className="max-w-3xl mx-auto p-6 space-y-8">
            <h2 className="text-2xl font-bold text-white mb-6">Knowledge Check</h2>

            {data.questions?.map((q, idx) => {
                const isSubmitted = submitted[idx];
                const userSelected = answers[idx];
                const isCorrect = userSelected === q.correctAnswer;

                return (
                    <div key={idx} className="bg-zinc-900/50 border border-white/5 p-6 rounded-2xl shadow-sm">
                        <p className="text-lg font-medium text-white mb-6">
                            <span className="text-indigo-500 font-bold mr-2">{idx + 1}.</span>{q.question}
                        </p>

                        <div className="space-y-3">
                            {q.options.map((opt, oIdx) => {
                                let btnClass = "bg-zinc-900 border-zinc-700 text-zinc-400 hover:bg-zinc-800"; // default

                                if (answers[idx] === oIdx && !isSubmitted) {
                                    btnClass = "bg-indigo-500/20 border-indigo-500 text-indigo-200"; // selected
                                }

                                if (isSubmitted) {
                                    if (oIdx === q.correctAnswer) {
                                        btnClass = "bg-green-500/20 border-green-500 text-green-200"; // correct answer
                                    } else if (answers[idx] === oIdx && !isCorrect) {
                                        btnClass = "bg-red-500/20 border-red-500 text-red-200"; // wrong answer
                                    } else {
                                        btnClass = "bg-zinc-900/50 border-transparent text-zinc-600 opacity-50"; // others
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
                                {isCorrect ? "Correct! Well done." : "Incorrect. Review the answer above."}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default Quiz;