/**
 * API Usage Charts Component
 * Visual charts for tracking API usage with bar charts, donut charts, and progress indicators.
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
    TrendingUp,
    Activity,
    PieChart,
    Calendar
} from 'lucide-react';
import Button from '../common/Button';

const ApiUsageCharts = () => {
    const [usage, setUsage] = useState(null);
    const [rateLimiterState, setRateLimiterState] = useState(null);
    const [showConfirmReset, setShowConfirmReset] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

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

    if (!usage) {
        return (
            <div className="bg-zinc-900/50 rounded-2xl p-8 border border-zinc-800 flex items-center justify-center">
                <RefreshCw className="animate-spin text-indigo-400" size={24} />
            </div>
        );
    }

    // Calculate max values for charts
    const maxDailyTokens = Math.max(...usage.dailyHistory.map(d => d.totalTokens), 1);
    const totalModelTokens = usage.byModel.reduce((sum, m) => sum + m.inputTokens + m.outputTokens, 0) || 1;

    // Model colors
    const modelColors = [
        'from-indigo-500 to-purple-500',
        'from-cyan-500 to-blue-500',
        'from-green-500 to-emerald-500',
        'from-orange-500 to-amber-500',
        'from-pink-500 to-rose-500',
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600/20 rounded-lg">
                        <BarChart2 className="text-indigo-400" size={22} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">API Usage Analytics</h2>
                        <p className="text-xs text-zinc-500">Track your Groq API consumption</p>
                    </div>
                </div>
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
                                Confirm
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
                            title="Reset all usage data"
                        >
                            <Trash2 size={14} />
                        </Button>
                    )}
                </div>
            </div>

            {/* Rate Limiter Status Banner */}
            {rateLimiterState && rateLimiterState.isOnCooldown && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
                    <AlertTriangle className="text-red-400 shrink-0" size={20} />
                    <div className="flex-1">
                        <p className="text-sm font-medium text-red-100">Rate Limited</p>
                        <p className="text-xs text-red-200/70">
                            Cooling down for {Math.ceil(rateLimiterState.cooldownRemaining / 1000)}s
                        </p>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 border-b border-zinc-800 pb-2">
                {[
                    { id: 'overview', label: 'Overview', icon: TrendingUp },
                    { id: 'history', label: '7-Day History', icon: Calendar },
                    { id: 'models', label: 'By Model', icon: PieChart },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeTab === tab.id
                                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                        }`}
                    >
                        <tab.icon size={14} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Today's Tokens */}
                        <div className="bg-gradient-to-br from-indigo-600/10 to-purple-600/10 rounded-xl p-4 border border-indigo-500/20">
                            <div className="flex items-center gap-2 text-zinc-400 text-xs mb-2">
                                <Zap size={12} className="text-yellow-500" />
                                Tokens Today
                            </div>
                            <div className="text-2xl font-bold text-white">
                                {(usage.today.totalTokens / 1000).toFixed(1)}k
                            </div>
                            <div className="mt-2 flex gap-2 text-xs">
                                <span className="text-indigo-400">{(usage.today.inputTokens / 1000).toFixed(1)}k in</span>
                                <span className="text-purple-400">{(usage.today.outputTokens / 1000).toFixed(1)}k out</span>
                            </div>
                        </div>

                        {/* Today's Cost */}
                        <div className="bg-gradient-to-br from-green-600/10 to-emerald-600/10 rounded-xl p-4 border border-green-500/20">
                            <div className="flex items-center gap-2 text-zinc-400 text-xs mb-2">
                                <DollarSign size={12} className="text-green-500" />
                                Cost Today
                            </div>
                            <div className="text-2xl font-bold text-white">
                                ${usage.today.cost}
                            </div>
                            <div className="mt-2 text-xs text-zinc-500">
                                {usage.today.requests} requests
                            </div>
                        </div>

                        {/* All Time Tokens */}
                        <div className="bg-gradient-to-br from-cyan-600/10 to-blue-600/10 rounded-xl p-4 border border-cyan-500/20">
                            <div className="flex items-center gap-2 text-zinc-400 text-xs mb-2">
                                <Clock size={12} className="text-cyan-500" />
                                All Time Tokens
                            </div>
                            <div className="text-2xl font-bold text-white">
                                {(usage.allTime.totalTokens / 1000).toFixed(1)}k
                            </div>
                            <div className="mt-2 text-xs text-zinc-500">
                                {usage.allTime.requests} total requests
                            </div>
                        </div>

                        {/* All Time Cost */}
                        <div className="bg-gradient-to-br from-orange-600/10 to-amber-600/10 rounded-xl p-4 border border-orange-500/20">
                            <div className="flex items-center gap-2 text-zinc-400 text-xs mb-2">
                                <DollarSign size={12} className="text-orange-500" />
                                Total Spent
                            </div>
                            <div className="text-2xl font-bold text-white">
                                ${usage.allTime.cost}
                            </div>
                            <div className="mt-2 text-xs text-zinc-500">
                                Since tracking started
                            </div>
                        </div>
                    </div>

                    {/* Token Distribution (Input vs Output) */}
                    <div className="bg-zinc-900/50 rounded-xl p-5 border border-zinc-800">
                        <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
                            <Activity size={14} className="text-indigo-400" />
                            Token Distribution (All Time)
                        </h3>
                        <div className="space-y-4">
                            {/* Input Tokens */}
                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-zinc-400">Input Tokens</span>
                                    <span className="text-indigo-400">{(usage.allTime.inputTokens / 1000).toFixed(1)}k</span>
                                </div>
                                <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all duration-500"
                                        style={{ 
                                            width: `${(usage.allTime.inputTokens / usage.allTime.totalTokens || 0) * 100}%` 
                                        }}
                                    />
                                </div>
                            </div>
                            {/* Output Tokens */}
                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-zinc-400">Output Tokens</span>
                                    <span className="text-purple-400">{(usage.allTime.outputTokens / 1000).toFixed(1)}k</span>
                                </div>
                                <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full transition-all duration-500"
                                        style={{ 
                                            width: `${(usage.allTime.outputTokens / usage.allTime.totalTokens || 0) * 100}%` 
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Rate Info */}
                    {rateLimiterState && (
                        <div className={`rounded-xl p-4 border flex items-center justify-between ${
                            rateLimiterState.heavyOperationsInProgress > 0
                                ? 'bg-yellow-500/10 border-yellow-500/20'
                                : 'bg-green-500/10 border-green-500/20'
                        }`}>
                            <div className="flex items-center gap-3">
                                <Activity size={18} className={
                                    rateLimiterState.heavyOperationsInProgress > 0
                                        ? 'text-yellow-400'
                                        : 'text-green-400'
                                } />
                                <span className="text-sm font-medium text-white">
                                    {rateLimiterState.heavyOperationsInProgress > 0 ? 'Processing...' : 'API Ready'}
                                </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-zinc-400">
                                <span>Queue: {rateLimiterState.queueLength}</span>
                                <span>Requests/min: {rateLimiterState.requestsInLastMinute}</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* 7-Day History Tab */}
            {activeTab === 'history' && (
                <div className="space-y-6">
                    {/* Daily Usage Bar Chart */}
                    <div className="bg-zinc-900/50 rounded-xl p-5 border border-zinc-800">
                        <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
                            <Calendar size={14} className="text-indigo-400" />
                            Daily Token Usage
                        </h3>
                        <div className="flex items-end justify-between gap-2 h-40">
                            {usage.dailyHistory.map((day, idx) => {
                                const heightPercent = (day.totalTokens / maxDailyTokens) * 100;
                                const isToday = idx === usage.dailyHistory.length - 1;
                                return (
                                    <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                                        <div className="text-xs text-zinc-500 mb-1">
                                            {(day.totalTokens / 1000).toFixed(1)}k
                                        </div>
                                        <div className="w-full h-28 bg-zinc-800 rounded-lg flex items-end overflow-hidden">
                                            <div 
                                                className={`w-full rounded-t-lg transition-all duration-500 ${
                                                    isToday 
                                                        ? 'bg-gradient-to-t from-indigo-600 to-purple-500' 
                                                        : 'bg-gradient-to-t from-indigo-600/60 to-purple-500/60'
                                                }`}
                                                style={{ height: `${Math.max(heightPercent, 2)}%` }}
                                            />
                                        </div>
                                        <span className={`text-xs ${isToday ? 'text-indigo-400 font-medium' : 'text-zinc-500'}`}>
                                            {day.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Daily Cost Chart */}
                    <div className="bg-zinc-900/50 rounded-xl p-5 border border-zinc-800">
                        <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
                            <DollarSign size={14} className="text-green-400" />
                            Daily Cost
                        </h3>
                        <div className="space-y-3">
                            {usage.dailyHistory.map((day, idx) => {
                                const maxCost = Math.max(...usage.dailyHistory.map(d => d.cost), 0.001);
                                const widthPercent = (day.cost / maxCost) * 100;
                                const isToday = idx === usage.dailyHistory.length - 1;
                                return (
                                    <div key={day.date} className="flex items-center gap-3">
                                        <span className={`text-xs w-10 ${isToday ? 'text-indigo-400 font-medium' : 'text-zinc-500'}`}>
                                            {day.label}
                                        </span>
                                        <div className="flex-1 h-4 bg-zinc-800 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-500 ${
                                                    isToday
                                                        ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                                                        : 'bg-gradient-to-r from-green-600/60 to-emerald-500/60'
                                                }`}
                                                style={{ width: `${Math.max(widthPercent, 1)}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-green-400 w-16 text-right">
                                            ${day.cost.toFixed(4)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Daily Requests */}
                    <div className="grid grid-cols-7 gap-2">
                        {usage.dailyHistory.map((day, idx) => {
                            const isToday = idx === usage.dailyHistory.length - 1;
                            return (
                                <div 
                                    key={day.date}
                                    className={`text-center p-3 rounded-lg border ${
                                        isToday 
                                            ? 'bg-indigo-600/20 border-indigo-500/30' 
                                            : 'bg-zinc-900/50 border-zinc-800'
                                    }`}
                                >
                                    <div className={`text-xs ${isToday ? 'text-indigo-400' : 'text-zinc-500'}`}>
                                        {day.label}
                                    </div>
                                    <div className={`text-lg font-bold mt-1 ${isToday ? 'text-white' : 'text-zinc-300'}`}>
                                        {day.requests}
                                    </div>
                                    <div className="text-[10px] text-zinc-600 mt-0.5">requests</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* By Model Tab */}
            {activeTab === 'models' && (
                <div className="space-y-6">
                    {usage.byModel.length === 0 ? (
                        <div className="bg-zinc-900/50 rounded-xl p-8 border border-zinc-800 text-center">
                            <PieChart size={40} className="text-zinc-600 mx-auto mb-3" />
                            <p className="text-zinc-400">No usage data yet</p>
                            <p className="text-xs text-zinc-600 mt-1">Start using AI features to see model breakdown</p>
                        </div>
                    ) : (
                        <>
                            {/* Model Distribution Donut (CSS-based) */}
                            <div className="bg-zinc-900/50 rounded-xl p-5 border border-zinc-800">
                                <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
                                    <PieChart size={14} className="text-indigo-400" />
                                    Token Usage by Model
                                </h3>
                                <div className="flex flex-col md:flex-row items-center gap-6">
                                    {/* Simple progress-based representation */}
                                    <div className="relative w-40 h-40">
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-white">
                                                    {usage.byModel.length}
                                                </div>
                                                <div className="text-xs text-zinc-500">models</div>
                                            </div>
                                        </div>
                                        <svg className="w-full h-full -rotate-90">
                                            <circle
                                                cx="80"
                                                cy="80"
                                                r="70"
                                                fill="none"
                                                stroke="#3f3f46"
                                                strokeWidth="12"
                                            />
                                            {usage.byModel.reduce((acc, model, idx) => {
                                                const percentage = ((model.inputTokens + model.outputTokens) / totalModelTokens) * 100;
                                                const strokeDasharray = (percentage / 100) * 440;
                                                const strokeDashoffset = -acc;
                                                acc += strokeDasharray;
                                                
                                                const colors = ['#818cf8', '#22d3ee', '#34d399', '#fb923c', '#f472b6'];
                                                
                                                return [
                                                    ...acc,
                                                    <circle
                                                        key={model.model}
                                                        cx="80"
                                                        cy="80"
                                                        r="70"
                                                        fill="none"
                                                        stroke={colors[idx % colors.length]}
                                                        strokeWidth="12"
                                                        strokeDasharray={`${strokeDasharray} 440`}
                                                        strokeDashoffset={typeof acc === 'number' ? -acc + strokeDasharray : 0}
                                                        className="transition-all duration-500"
                                                    />
                                                ];
                                            }, 0)}
                                        </svg>
                                    </div>

                                    {/* Legend */}
                                    <div className="flex-1 space-y-2">
                                        {usage.byModel.map((model, idx) => {
                                            const percentage = ((model.inputTokens + model.outputTokens) / totalModelTokens) * 100;
                                            const colors = ['bg-indigo-400', 'bg-cyan-400', 'bg-green-400', 'bg-orange-400', 'bg-pink-400'];
                                            return (
                                                <div key={model.model} className="flex items-center gap-3">
                                                    <div className={`w-3 h-3 rounded-full ${colors[idx % colors.length]}`} />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm text-white truncate">
                                                            {model.model.split('/').pop()}
                                                        </div>
                                                        <div className="text-xs text-zinc-500">
                                                            {percentage.toFixed(1)}% • {model.requests} requests
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-sm text-white">
                                                            {((model.inputTokens + model.outputTokens) / 1000).toFixed(1)}k
                                                        </div>
                                                        <div className="text-xs text-green-400">${model.cost}</div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Model Details */}
                            <div className="space-y-3">
                                {usage.byModel.map((model, idx) => (
                                    <div 
                                        key={model.model}
                                        className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <div className="text-sm font-medium text-white">
                                                    {model.model.split('/').pop()}
                                                </div>
                                                <div className="text-xs text-zinc-500 mt-0.5">
                                                    {model.requests} requests • ${model.cost} total
                                                </div>
                                            </div>
                                            <div className={`px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${modelColors[idx % modelColors.length]} text-white`}>
                                                {((model.inputTokens + model.outputTokens) / 1000).toFixed(1)}k tokens
                                            </div>
                                        </div>
                                        
                                        {/* Token breakdown */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <div className="text-xs text-zinc-500 mb-1">Input</div>
                                                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-indigo-500 rounded-full"
                                                        style={{ 
                                                            width: `${(model.inputTokens / (model.inputTokens + model.outputTokens || 1)) * 100}%` 
                                                        }}
                                                    />
                                                </div>
                                                <div className="text-xs text-indigo-400 mt-1">
                                                    {(model.inputTokens / 1000).toFixed(1)}k
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-zinc-500 mb-1">Output</div>
                                                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-purple-500 rounded-full"
                                                        style={{ 
                                                            width: `${(model.outputTokens / (model.inputTokens + model.outputTokens || 1)) * 100}%` 
                                                        }}
                                                    />
                                                </div>
                                                <div className="text-xs text-purple-400 mt-1">
                                                    {(model.outputTokens / 1000).toFixed(1)}k
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* Pricing Reference */}
                    <div className="bg-zinc-900/30 rounded-xl p-4 border border-zinc-800">
                        <details className="text-xs text-zinc-500">
                            <summary className="cursor-pointer hover:text-zinc-300 font-medium">
                                Pricing Reference (per million tokens)
                            </summary>
                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {Object.entries(PRICING).map(([model, price]) => (
                                    <div key={model} className="flex justify-between py-1 border-b border-zinc-800 last:border-0">
                                        <span className="text-zinc-400 truncate mr-2">{model.split('/').pop()}</span>
                                        <span className="text-zinc-300 shrink-0">${price.input} in / ${price.output} out</span>
                                    </div>
                                ))}
                            </div>
                        </details>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ApiUsageCharts;
