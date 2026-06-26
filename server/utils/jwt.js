import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'scholarsync-prod-secure-token-secret-987654321';

/**
 * Sign a payload into a JWT token
 * Uses SHA-256 HMAC signature with Base64url encoding
 * 
 * @param {Object} payload - The token claims
 * @returns {string} Signed JWT token
 */
export const signToken = (payload) => {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${data}`).digest('base64url');
    return `${header}.${data}.${signature}`;
};

/**
 * Verify JWT token signature and return payload
 * 
 * @param {string} token - The raw token
 * @returns {Object|null} Decoded payload if valid, null otherwise
 */
export const verifyToken = (token) => {
    if (!token || typeof token !== 'string') return null;
    
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        
        const [header, data, signature] = parts;
        const expectedSignature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${data}`).digest('base64url');
        
        if (signature !== expectedSignature) return null;
        
        return JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    } catch (error) {
        return null;
    }
};

export default {
    signToken,
    verifyToken
};
