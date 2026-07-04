import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const data = req.body;

        // Get IP from headers
        const ip = req.headers['x-forwarded-for'] || 
                   req.headers['x-real-ip'] || 
                   req.connection?.remoteAddress || 
                   'unknown';

        // Create log entry
        const logEntry = {
            id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
            ip: ip,
            timestamp: data.timestamp || new Date().toISOString(),
            readableTime: data.readableTime || new Date().toLocaleString(),
            userAgent: data.userAgent || 'unknown',
            platform: data.platform || 'unknown',
            language: data.language || 'unknown',
            screenWidth: data.screenWidth || 0,
            screenHeight: data.screenHeight || 0,
            windowWidth: data.windowWidth || 0,
            windowHeight: data.windowHeight || 0,
            colorDepth: data.colorDepth || 0,
            pixelRatio: data.pixelRatio || 0,
            online: data.online || false,
            referrer: data.referrer || 'direct',
            url: data.url || 'unknown',
            battery: data.battery || null
        };

        // Store in KV
        const key = 'log:' + logEntry.id;
        await kv.set(key, logEntry);

        // Store in a list for easy retrieval
        await kv.lpush('logs', logEntry.id);
        await kv.ltrim('logs', 0, 999); // Keep last 1000 entries

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('Log error:', error);
        return res.status(500).json({ error: 'Failed to save log' });
    }
}
