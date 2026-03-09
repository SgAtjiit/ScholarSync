/**
 * API Usage Dashboard Component
 * Displays token usage, costs, and rate limiter status.
 */

import { useState, useEffect } from 'react';
import { getUsageSummary, resetTokenUsage, PRICING } from '../../services/groqService';
import { getRateLimiterState, subscribeToRateLimiter } from '../../services/rateLimiter';
import { 
    BarChart2, 
    Zap, 
    Clock, 
    DollarSign, 
    Trash2, 
    RefreshCw, 
    AlertTriangle,
    ArrowUpRight,
    ArrowDownRight,
    Activity
} from 'lucide-react';
import Button from '../common/Button';
import GlassCard from '../common/GlassCard';

const ApiUsageDashboard = ({ compact = false }) => {
    const [usage, setUsage] = useState(null);
    const [rateLimiterState, setRateLimiterState] = useState(null);
    const [showConfirmReset, setShowConfirmReset] = useState(false);

    // Load usage data
    const loadUsage = () => {
        setUsage(getUsageSummary());
        setRateLimiterState(getRateLimiterState());
    };

    useEffect(() => {
        loadUsage();

        // Subscribe to rate limiter changes
        const unsubscribe = subscribeToRateLimiter((state) => {
            setRateLimiterState(state);
        });

        // Refresh usage periodically
        const interval = setInterval(loadUsage, 5000);

        return () => {
            unsubscribe();
            clearInterval(interval);
        };
    }, []);

    const handleReset = () => {
        resetTokenUsage();
        setShowConfirmReset(false);
        loadUsage();
    };

    if (!usage) return null;

    // Compact view for sidebar/navbar
    if (compact) {
        return (
            <div className="flex items-center gap-3 text-xs text-zinc-400">
                <div className="flex items-center gap-1" title="Tokens used today">
                    <Zap size={12} className="text-yellow-500" />
                    <span>{(usage.today.totalTokens / 1000).toFixed(1)}k</span>
                </div>
                <div className="flex items-center gap-1" title="Cost today">
                    <DollarSign size={12} className="text-green-500" />
                    <span>${usage.today.cost}</span>
                </div>
                {rateLimiterState?.isOnCooldown && (
                    <div className="flex items-center gap-1 text-red-400" title="Rate limited">
                        <AlertTriangle size={12} />
                        <span>{Math.ceil(rateLimiterState.cooldownRemaining / 1000)}s</span>
                    </div>
                )}
            </div>
        );
    }

    // Full dashboard view
    return (
        <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <BarChart2 className="text-indigo-500" size={20} />
                    API Usage Dashboard
                </h2>
                <div className="flex gap-2">
                    <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={loadUsage}
                        title="Refresh"
                    >
                        <RefreshCw size={14} />
                    </Button>
                    {showConfirmReset ? (
                        <div className="flex gap-2">
                            <Button size="sm" variant="danger" onClick={handleReset}>
                                Confirm Reset
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setShowConfirmReset(false)}>
                                Cancel
                            </Button>
                        </div>
                    ) : (
                        <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => setShowConfirmReset(true)}
                            title="Reset usage data"
                        >
                            <Trash2 size={14} />
                        </Button>
                    )}
                </div>
            </div>

            {/* Rate Limiter Status */}
            {rateLimiterState && (
                <div className={`mb-6 p-4 rounded-xl border ${
                    rateLimiterState.isOnCooldown
                        ? 'bg-red-500/10 border-red-500/30'
                        : rateLimiterState.heavyOperationsInProgress > 0
                        ? 'bg-yellow-500/10 border-yellow-500/30'
                        : 'bg-green-500/10 border-green-500/30'
                }`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Activity size={16} className={
                                rateLimiterState.isOnCooldown
                                    ? 'text-red-400'
                                    : rateLimiterState.heavyOperationsInProgress > 0
                                    ? 'text-yellow-400'
                                    : 'text-green-400'
                            } />
                            <span className="text-sm font-medium text-white">
                                {rateLimiterState.isOnCooldown
                                    ? 'Rate Limited - Cooling Down'
                                    : rateLimiterState.heavyOperationsInProgress > 0
                                    ? 'Processing...'
                                    : 'Ready'}
                            </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-zinc-400">
                            {rateLimiterState.isOnCooldown && (
                                <span className="text-red-400">
                                    Wait: {Math.ceil(rateLimiterState.cooldownRemaining / 1000)}s
                                </span>
                            )}
                            <span>Queue: {rateLimiterState.queueLength}</span>
                            <span>Requests/min: {rateLimiterState.requestsInLastMinute}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {/* Today's Tokens */}
                <div className="bg-zinc-900/50 rounded-xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 text-zinc-400 text-xs mb-2">
                        <Zap size={12} className="text-yellow-500" />
                        Tokens Today
                    </div>
                    <div className="text-2xl font-bold text-white">
                        {(usage.today.totalTokens / 1000).toFixed(1)}k
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs">
                        <span className="text-green-400 flex items-center">
                            <ArrowUpRight size={10} /> {(usage.today.inputTokens / 1000).toFixed(1)}k in
                        </span>
                        <span className="text-blue-400 flex items-center">
                            <ArrowDownRight size={10} /> {(usage.today.outputTokens / 1000).toFixed(1)}k out
                        </span>
                    </div>
                </div>

                {/* Today's Cost */}
                <div className="bg-zinc-900/50 rounded-xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 text-zinc-400 text-xs mb-2">
                        <DollarSign size={12} className="text-green-500" />
                        Cost Today
                    </div>
                    <div className="text-2xl font-bold text-white">
                        ${usage.today.cost}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">
                        {usage.today.requests} requests
                    </div>
                </div>

                {/* All Time Tokens */}
                <div className="bg-zinc-900/50 rounded-xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 text-zinc-400 text-xs mb-2">
                        <Clock size={12} className="text-purple-500" />
                        All Time Tokens
                    </div>
                    <div className="text-2xl font-bold text-white">
                        {(usage.allTime.totalTokens / 1000).toFixed(1)}k
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">
                        {usage.allTime.requests} total requests
                    </div>
                </div>

                {/* All Time Cost */}
                <div className="bg-zinc-900/50 rounded-xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 text-zinc-400 text-xs mb-2">
                        <DollarSign size={12} className="text-indigo-500" />
                        All Time Cost
                    </div>
                    <div className="text-2xl font-bold text-white">
                        ${usage.allTime.cost}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">
                        Since tracking started
                    </div>
                </div>
            </div>

            {/* Usage by Model */}
            {usage.byModel.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-zinc-400 mb-3">Usage by Model</h3>
                    <div className="space-y-2">
                        {usage.byModel.map((model) => (
                            <div 
                                key={model.model} 
                                className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-lg border border-white/5"
                            >
                                <div>
                                    <div className="text-sm font-medium text-white">
                                        {model.model.split('/').pop()}
                                    </div>
                                    <div className="text-xs text-zinc-500">
                                        {model.requests} requests
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm text-white">
                                        {((model.inputTokens + model.outputTokens) / 1000).toFixed(1)}k tokens
                                    </div>
                                    <div className="text-xs text-green-400">
                                        ${model.cost}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Pricing Info */}
            <div className="mt-6 pt-4 border-t border-white/5">
                <details className="text-xs text-zinc-500">
                    <summary className="cursor-pointer hover:text-zinc-300">
                        Pricing Reference (per million tokens)
                    </summary>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                        {Object.entries(PRICING).slice(0, 4).map(([model, price]) => (
                            <div key={model} className="flex justify-between">
                                <span>{model.split('/').pop().slice(0, 20)}...</span>
                                <span>${price.input}/${price.output}</span>
                            </div>
                        ))}
                    </div>
                </details>
            </div>
        </GlassCard>
    );
};

export default ApiUsageDashboard;
