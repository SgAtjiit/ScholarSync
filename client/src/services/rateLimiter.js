/**
 * Client-Side Rate Limiter
 * Prevents users from overwhelming the Groq API with too many requests.
 * Implements a token bucket algorithm with queue management.
 */

/**
 * Rate Limiter Configuration
 */
const DEFAULT_CONFIG = {
    // Maximum concurrent heavy operations (e.g., content generation)
    maxConcurrentHeavy: 1,
    // Maximum requests per minute for light operations (e.g., chat)
    maxRequestsPerMinute: 30,
    // Cooldown after a rate limit error (ms)
    rateLimitCooldown: 60000,
    // Queue timeout (ms)
    queueTimeout: 120000,
};

/**
 * Rate Limiter State
 */
let state = {
    // Number of heavy operations currently in progress
    heavyOperationsInProgress: 0,
    // Queue of pending operations
    queue: [],
    // Request timestamps for rate limiting
    requestTimestamps: [],
    // Rate limit cooldown end time
    cooldownUntil: null,
    // Listeners for state changes
    listeners: [],
};

/**
 * Get current rate limiter state
 * @returns {Object}
 */
export const getRateLimiterState = () => ({
    heavyOperationsInProgress: state.heavyOperationsInProgress,
    queueLength: state.queue.length,
    isOnCooldown: state.cooldownUntil && Date.now() < state.cooldownUntil,
    cooldownRemaining: state.cooldownUntil ? Math.max(0, state.cooldownUntil - Date.now()) : 0,
    requestsInLastMinute: state.requestTimestamps.filter(t => Date.now() - t < 60000).length,
});

/**
 * Subscribe to state changes
 * @param {Function} listener - Callback function
 * @returns {Function} - Unsubscribe function
 */
export const subscribeToRateLimiter = (listener) => {
    state.listeners.push(listener);
    return () => {
        state.listeners = state.listeners.filter(l => l !== listener);
    };
};

/**
 * Notify all listeners of state change
 */
const notifyListeners = () => {
    const currentState = getRateLimiterState();
    state.listeners.forEach(listener => listener(currentState));
};

/**
 * Clean up old request timestamps
 */
const cleanupTimestamps = () => {
    const oneMinuteAgo = Date.now() - 60000;
    state.requestTimestamps = state.requestTimestamps.filter(t => t > oneMinuteAgo);
};

/**
 * Check if we can make a request
 * @param {boolean} isHeavy - Whether this is a heavy operation
 * @returns {{canProceed: boolean, reason: string|null, waitTime: number}}
 */
export const checkRateLimit = (isHeavy = false) => {
    cleanupTimestamps();

    // Check cooldown
    if (state.cooldownUntil && Date.now() < state.cooldownUntil) {
        const waitTime = state.cooldownUntil - Date.now();
        return {
            canProceed: false,
            reason: 'Rate limit cooldown in effect',
            waitTime,
        };
    }

    // Check concurrent heavy operations
    if (isHeavy && state.heavyOperationsInProgress >= DEFAULT_CONFIG.maxConcurrentHeavy) {
        return {
            canProceed: false,
            reason: 'Another heavy operation is in progress',
            waitTime: 0,
        };
    }

    // Check requests per minute
    if (state.requestTimestamps.length >= DEFAULT_CONFIG.maxRequestsPerMinute) {
        const oldestTimestamp = state.requestTimestamps[0];
        const waitTime = 60000 - (Date.now() - oldestTimestamp);
        return {
            canProceed: false,
            reason: 'Too many requests in the last minute',
            waitTime: Math.max(0, waitTime),
        };
    }

    return {
        canProceed: true,
        reason: null,
        waitTime: 0,
    };
};

/**
 * Start a heavy operation (increment counter)
 */
const startHeavyOperation = () => {
    state.heavyOperationsInProgress++;
    notifyListeners();
};

/**
 * End a heavy operation (decrement counter, process queue)
 */
const endHeavyOperation = () => {
    state.heavyOperationsInProgress = Math.max(0, state.heavyOperationsInProgress - 1);
    notifyListeners();
    processQueue();
};

/**
 * Record a request timestamp
 */
const recordRequest = () => {
    state.requestTimestamps.push(Date.now());
    cleanupTimestamps();
};

/**
 * Trigger rate limit cooldown
 * @param {number} duration - Cooldown duration in ms
 */
export const triggerCooldown = (duration = DEFAULT_CONFIG.rateLimitCooldown) => {
    state.cooldownUntil = Date.now() + duration;
    notifyListeners();
    
    // Schedule cooldown end notification
    setTimeout(() => {
        state.cooldownUntil = null;
        notifyListeners();
        processQueue();
    }, duration);
};

/**
 * Process the next item in the queue
 */
const processQueue = () => {
    if (state.queue.length === 0) return;

    const check = checkRateLimit(true);
    if (!check.canProceed) return;

    const next = state.queue.shift();
    if (next) {
        next.resolve();
        notifyListeners();
    }
};

/**
 * Wait for rate limit clearance
 * @param {boolean} isHeavy - Whether this is a heavy operation
 * @returns {Promise<void>}
 */
export const waitForRateLimit = (isHeavy = false) => {
    const check = checkRateLimit(isHeavy);

    if (check.canProceed) {
        return Promise.resolve();
    }

    // For heavy operations, add to queue
    if (isHeavy) {
        return new Promise((resolve, reject) => {
            const queueItem = { resolve, reject, timestamp: Date.now() };
            state.queue.push(queueItem);
            notifyListeners();

            // Set timeout for queue
            setTimeout(() => {
                const index = state.queue.indexOf(queueItem);
                if (index !== -1) {
                    state.queue.splice(index, 1);
                    reject(new Error('Queue timeout exceeded'));
                    notifyListeners();
                }
            }, DEFAULT_CONFIG.queueTimeout);
        });
    }

    // For light operations, wait for the specified time
    return new Promise(resolve => setTimeout(resolve, check.waitTime));
};

/**
 * Execute a function with rate limiting
 * @param {Function} fn - Async function to execute
 * @param {Object} options - Options
 * @param {boolean} options.isHeavy - Whether this is a heavy operation
 * @returns {Promise<any>}
 */
export const withRateLimit = async (fn, options = {}) => {
    const { isHeavy = false } = options;

    // Wait for rate limit clearance
    await waitForRateLimit(isHeavy);

    // Record request
    recordRequest();

    // Track heavy operations
    if (isHeavy) {
        startHeavyOperation();
    }

    try {
        const result = await fn();
        return result;
    } catch (error) {
        // Check for rate limit error
        if (error.message?.includes('Rate limit') || error.message?.includes('429')) {
            // Extract wait time from error if available
            const match = error.message.match(/(\d+)s/);
            const cooldownTime = match ? parseInt(match[1]) * 1000 : DEFAULT_CONFIG.rateLimitCooldown;
            triggerCooldown(cooldownTime);
        }
        throw error;
    } finally {
        if (isHeavy) {
            endHeavyOperation();
        }
    }
};

/**
 * Create a rate-limited version of an async function
 * @param {Function} fn - Async function to wrap
 * @param {Object} options - Rate limiting options
 * @returns {Function}
 */
export const createRateLimitedFunction = (fn, options = {}) => {
    return async (...args) => {
        return withRateLimit(() => fn(...args), options);
    };
};

/**
 * Cancel all pending operations in queue
 */
export const cancelPendingOperations = () => {
    state.queue.forEach(item => {
        item.reject(new Error('Operation cancelled'));
    });
    state.queue = [];
    notifyListeners();
};

/**
 * Reset rate limiter state
 */
export const resetRateLimiter = () => {
    state = {
        heavyOperationsInProgress: 0,
        queue: [],
        requestTimestamps: [],
        cooldownUntil: null,
        listeners: state.listeners, // Keep listeners
    };
    notifyListeners();
};

export default {
    getRateLimiterState,
    subscribeToRateLimiter,
    checkRateLimit,
    waitForRateLimit,
    withRateLimit,
    createRateLimitedFunction,
    triggerCooldown,
    cancelPendingOperations,
    resetRateLimiter,
};
