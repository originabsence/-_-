import { kv } from '@vercel/kv';
import crypto from 'crypto';

export default async function handler(req, res) {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { password } = req.body;

        if (!password) {
            return res.status(401).json({ error: 'Password required' });
        }

        // Verify admin password (SHA-256)
        const adminHash = process.env.ADMIN_PASSWORD_HASH;
        if (!adminHash) {
            console.error('ADMIN_PASSWORD_HASH not set');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const hash = crypto.createHash('sha256').update(password).digest('hex');

        if (hash !== adminHash) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        // Get all log IDs
        const logIds = await kv.lrange('logs', 0, -1) || [];

        // Fetch all logs
        const logs = [];
        for (const id of logIds) {
            const log = await kv.get('log:' + id);
            if (log) {
                logs.push(log);
            }
        }

        // Sort by timestamp (newest first)
        logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        return res.status(200).json({ logs: logs });

    } catch (error) {
        console.error('Fetch logs error:', error);
        return res.status(500).json({ error: 'Failed to fetch logs' });
    }
}
