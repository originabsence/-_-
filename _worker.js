export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const path = url.pathname;

        const adminHash = env.ADMIN_PASSWORD_HASH;

        // API: Save log
        if (path === '/api/log' && request.method === 'POST') {
            try {
                const data = await request.json();
                const ip = request.headers.get('CF-Connecting-IP') || 
                          request.headers.get('X-Forwarded-For') || 
                          'unknown';

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

                const key = 'log:' + logEntry.id;
                await env.KV_STORE.put(key, JSON.stringify(logEntry));

                // Store in list
                const listKey = 'logs';
                const currentList = await env.KV_STORE.get(listKey) || '[]';
                const list = JSON.parse(currentList);
                list.unshift(logEntry.id);
                if (list.length > 1000) list.pop();
                await env.KV_STORE.put(listKey, JSON.stringify(list));

                return new Response(JSON.stringify({ success: true }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });

            } catch (error) {
                return new Response(JSON.stringify({ error: 'Failed to save log' }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        // API: Fetch logs (admin only)
        if (path === '/api/logs' && request.method === 'POST') {
            try {
                const { password } = await request.json();

                if (!password) {
                    return new Response(JSON.stringify({ error: 'Password required' }), {
                        status: 401,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }

                const encoder = new TextEncoder();
                const data = encoder.encode(password);
                const hashBuffer = await crypto.subtle.digest('SHA-256', data);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

                if (hashHex !== adminHash) {
                    return new Response(JSON.stringify({ error: 'Invalid password' }), {
                        status: 401,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }

                const listKey = 'logs';
                const listData = await env.KV_STORE.get(listKey) || '[]';
                const ids = JSON.parse(listData);

                const logs = [];
                for (const id of ids) {
                    const logData = await env.KV_STORE.get('log:' + id);
                    if (logData) {
                        logs.push(JSON.parse(logData));
                    }
                }

                logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

                return new Response(JSON.stringify({ logs }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });

            } catch (error) {
                return new Response(JSON.stringify({ error: 'Failed to fetch logs' }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        // Serve static HTML
        if (path === '/' || path === '') {
            return new Response(getIndexHTML(), {
                headers: { 'Content-Type': 'text/html' }
            });
        }

        if (path === '/admin') {
            return new Response(getAdminHTML(), {
                headers: { 'Content-Type': 'text/html' }
            });
        }

        return new Response('Not found', { status: 404 });
    }
};

// HTML content (same as above - index.html and admin.html)
// ... (paste the HTML content here, but I'll omit for brevity)
