/**
 * Processing Status Component
 * Shows extraction and generation progress with visual feedback.
 */

import { Loader2, FileText, Eye, Sparkles, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const ProcessingStatus = ({ 
    isExtracting, 
    extractionProgress, 
    extractionError,
    isGenerating, 
    generatingMode,
    generationError,
    rateLimiterState,
}) => {
    // Don't render if nothing is happening
    if (!isExtracting && !isGenerating && !extractionError && !generationError && !rateLimiterState?.isOnCooldown) {
        return null;
    }

    const getStageIcon = (stage) => {
        switch (stage) {
            case 'download':
                return <FileText size={16} className="text-blue-400" />;
            case 'parse':
                return <FileText size={16} className="text-indigo-400" />;
            case 'vision':
                return <Eye size={16} className="text-purple-400" />;
            case 'stitch':
            case 'complete':
                return <Sparkles size={16} className="text-green-400" />;
            default:
                return <Loader2 size={16} className="text-zinc-400 animate-spin" />;
        }
    };

    const getModeLabel = (mode) => {
        const labels = {
            draft: 'Draft Solution',
            explain: 'Explanation',
            quiz: 'Quiz',
            flashcards: 'Flashcards',
        };
        return labels[mode] || mode;
    };

    return (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm">
            {/* Rate Limit Cooldown Warning */}
            {rateLimiterState?.isOnCooldown && (
                <div className="mb-2 bg-red-900/90 backdrop-blur-sm border border-red-500/50 rounded-xl p-4 shadow-lg">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="text-red-400 flex-shrink-0" size={20} />
                        <div>
                            <p className="text-sm font-medium text-white">Rate Limit Active</p>
                            <p className="text-xs text-red-300">
                                Please wait {Math.ceil(rateLimiterState.cooldownRemaining / 1000)}s before next request
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Extraction Progress */}
            {isExtracting && extractionProgress && (
                <div className="mb-2 bg-zinc-900/95 backdrop-blur-sm border border-white/10 rounded-xl p-4 shadow-lg">
                    <div className="flex items-center gap-3 mb-2">
                        {getStageIcon(extractionProgress.stage)}
                        <div className="flex-1">
                            <p className="text-sm font-medium text-white">Extracting Document</p>
                            <p className="text-xs text-zinc-400">{extractionProgress.message}</p>
                        </div>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                            style={{ width: `${extractionProgress.progress}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Extraction Error */}
            {extractionError && (
                <div className="mb-2 bg-red-900/90 backdrop-blur-sm border border-red-500/50 rounded-xl p-4 shadow-lg">
                    <div className="flex items-center gap-3">
                        <XCircle className="text-red-400 flex-shrink-0" size={20} />
                        <div>
                            <p className="text-sm font-medium text-white">Extraction Failed</p>
                            <p className="text-xs text-red-300 line-clamp-2">{extractionError}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Generation Progress */}
            {isGenerating && (
                <div className="mb-2 bg-zinc-900/95 backdrop-blur-sm border border-white/10 rounded-xl p-4 shadow-lg">
                    <div className="flex items-center gap-3">
                        <Loader2 className="text-indigo-400 animate-spin flex-shrink-0" size={20} />
                        <div>
                            <p className="text-sm font-medium text-white">
                                Generating {getModeLabel(generatingMode)}
                            </p>
                            <p className="text-xs text-zinc-400">
                                This may take a moment...
                            </p>
                        </div>
                    </div>
                    <div className="mt-2 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse w-full" />
                    </div>
                </div>
            )}

            {/* Generation Error */}
            {generationError && (
                <div className="mb-2 bg-red-900/90 backdrop-blur-sm border border-red-500/50 rounded-xl p-4 shadow-lg">
                    <div className="flex items-center gap-3">
                        <XCircle className="text-red-400 flex-shrink-0" size={20} />
                        <div>
                            <p className="text-sm font-medium text-white">Generation Failed</p>
                            <p className="text-xs text-red-300 line-clamp-2">{generationError}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProcessingStatus;
