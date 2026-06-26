import { verifyToken } from '../utils/jwt.js';

/**
 * Express middleware to authenticate API requests via JWT
 */
export const protect = async (req, res, next) => {
    let token = null;

    // Check for Bearer token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    } 
    // Fallback: check query parameters (useful for iframe navigations)
    else if (req.query.token) {
        token = req.query.token;
    }
    // Fallback: check in cookies if present
    else if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }

    if (!token) {
        return res.status(401).json({ error: 'Authentication token is missing. Please log in again.' });
    }

    try {
        const decoded = verifyToken(token);

        if (!decoded || !decoded.userId) {
            return res.status(401).json({ error: 'Invalid or expired authentication token. Please log in again.' });
        }

        // Attach user info to request
        req.user = { id: decoded.userId };
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Authentication failed. Please log in again.' });
    }
};

export default {
    protect
};
