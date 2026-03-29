import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, XCircle, Loader2, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Question Verification Status Component
 * Displays verification result and quality metrics
 */
const QuestionVerificationStatus = ({ 
    verificationResult, 
    isLoading = false, 
    onRetry,
    onApprove,
    showAutoCorrections = false 
}) => {
    if (isLoading) {
        return (
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                <div>
                    <p className="text-sm font-medium text-blue-300">Verifying questions...</p>
                    <p className="text-xs text-blue-400/70">Running quality checks</p>
                </div>
            </div>
        );
    }

    if (!verificationResult?.success) {
        return (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                <div className="flex items-start gap-3 mb-2">
                    <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-red-300">Verification Error</p>
                        <p className="text-xs text-red-400/70 mt-1">{verificationResult?.error || 'Unknown error'}</p>
                    </div>
                </div>
                {onRetry && (
                    <button
                        onClick={onRetry}
                        className="text-xs mt-3 px-3 py-1.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 transition-colors"
                    >
                        Retry Verification
                    </button>
                )}
            </div>
        );
    }

    const score = verificationResult.quickCheck?.score ?? verificationResult.fullVerification?.qualityScore ?? 0;
    const totalQuestions = verificationResult.quickCheck?.count ?? verificationResult.fullVerification?.totalQuestions ?? 0;
    const tokensUsed = verificationResult.totalTokensUsed ?? 0;
    const issues = verificationResult.fullVerification?.issues ?? verificationResult.quickCheck?.issues ?? [];

    let statusConfig = {
        icon: CheckCircle,
        color: 'green',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/30',
        titleColor: 'text-green-300',
        textColor: 'text-green-400/70',
        title: 'Questions Verified ✓',
        subtitle: 'All quality checks passed'
    };

    if (score < 70) {
        statusConfig = {
            icon: XCircle,
            color: 'red',
            bgColor: 'bg-red-500/10',
            borderColor: 'border-red-500/30',
            titleColor: 'text-red-300',
            textColor: 'text-red-400/70',
            title: 'Issues Detected',
            subtitle: 'Please review the issues below'
        };
    } else if (score < 85) {
        statusConfig = {
            icon: AlertCircle,
            color: 'yellow',
            bgColor: 'bg-yellow-500/10',
            borderColor: 'border-yellow-500/30',
            titleColor: 'text-yellow-300',
            textColor: 'text-yellow-400/70',
            title: 'Review Recommended',
            subtitle: 'Some issues found that may need attention'
        };
    }

    const StatusIcon = statusConfig.icon;

    return (
        <div className={`p-4 rounded-lg ${statusConfig.bgColor} border ${statusConfig.borderColor} space-y-4`}>
            {/* Header */}
            <div className="flex items-start gap-3">
                <StatusIcon className={`w-5 h-5 text-${statusConfig.color}-400 flex-shrink-0 mt-0.5`} />
                <div className="flex-1">
                    <p className={`text-sm font-medium ${statusConfig.titleColor}`}>{statusConfig.title}</p>
                    <p className={`text-xs ${statusConfig.textColor}`}>{statusConfig.subtitle}</p>
                </div>
                <div className="text-right">
                    <div className="text-lg font-bold text-white">{score}</div>
                    <div className="text-xs text-zinc-500">/100</div>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-2 text-xs pb-3 border-b border-white/5">
                <div>
                    <p className="text-zinc-500">Questions</p>
                    <p className="font-semibold text-white">{totalQuestions}</p>
                </div>
                <div>
                    <p className="text-zinc-500">Tokens Used</p>
                    <p className="font-semibold text-white">{tokensUsed === 0 ? 'Free' : tokensUsed}</p>
                </div>
                <div>
                    <p className="text-zinc-500">Strategy</p>
                    <p className="font-semibold text-white text-[10px]">
                        {verificationResult.strategy === 'smart' ? 'Smart' : 'Local'}
                    </p>
                </div>
            </div>

            {/* Issues */}
            {issues.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-medium text-zinc-300">Issues Found:</p>
                    <ul className="space-y-1">
                        {issues.slice(0, 5).map((issue, idx) => (
                            <li key={idx} className="text-xs text-zinc-300 flex gap-2">
                                <span className="text-zinc-500 flex-shrink-0">•</span>
                                <span>{issue}</span>
                            </li>
                        ))}
                    </ul>
                    {issues.length > 5 && (
                        <p className="text-xs text-zinc-500">... and {issues.length - 5} more</p>
                    )}
                </div>
            )}

            {/* Suggestions */}
            {verificationResult.fullVerification?.suggestions?.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-white/5">
                    <p className="text-xs font-medium text-zinc-300">Suggestions:</p>
                    <ul className="space-y-1">
                        {verificationResult.fullVerification.suggestions.slice(0, 3).map((sug, idx) => (
                            <li key={idx} className="text-xs text-zinc-300">💡 {sug}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Auto Corrections */}
            {showAutoCorrections && verificationResult.autoCorrections && (
                <div className="p-3 rounded bg-zinc-800/50 border border-white/5">
                    <p className="text-xs font-medium text-zinc-300 mb-1">Auto-Fix Available</p>
                    <p className="text-xs text-zinc-400">
                        {verificationResult.autoCorrections.fixedCount} corrections can be automatically applied
                    </p>
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t border-white/5">
                {onRetry && (
                    <button
                        onClick={onRetry}
                        className="flex-1 text-xs px-3 py-1.5 rounded bg-zinc-700/50 hover:bg-zinc-600/50 text-zinc-200 transition-colors"
                    >
                        Re-verify
                    </button>
                )}
                {onApprove && score >= 70 && (
                    <button
                        onClick={onApprove}
                        className="flex-1 text-xs px-3 py-1.5 rounded bg-green-600/40 hover:bg-green-600/50 text-green-200 transition-colors font-medium"
                    >
                        ✓ Approve
                    </button>
                )}
            </div>
        </div>
    );
};

export default QuestionVerificationStatus;
