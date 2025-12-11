
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 5001;
const CONFIG_FILE = path.join(__dirname, 'config.json');

const server = http.createServer((req, res) => {
    // Enable CORS for development if needed (though proxy handles this)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.url === '/api/config' && req.method === 'GET') {
        if (fs.existsSync(CONFIG_FILE)) {
            fs.readFile(CONFIG_FILE, 'utf8', (err, data) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Failed to read config' }));
                } else {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(data || '{}');
                }
            });
        } else {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({}));
        }
    } else if (req.url === '/api/config' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                // Validate JSON
                JSON.parse(body);
                fs.writeFile(CONFIG_FILE, body, (err) => {
                    if (err) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Failed to write config' }));
                    } else {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true }));
                    }
                });
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
    } else if (req.url === '/auth/github' && req.method === 'GET') {
        const client_id = process.env.GITHUB_CLIENT_ID;

        if (!client_id || client_id === 'your_client_id_here') {
            // Serve setup instructions
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
                <html>
                <body style="font-family: system-ui; max-width: 600px; margin: 40px auto; padding: 20px; line-height: 1.6;">
                    <h1 style="color: #4f46e5;">GitHub 集成未配置</h1>
                    <p>检测到您尚未配置 GitHub OAuth App。</p>
                    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <strong>配置步骤：</strong>
                        <ol>
                            <li>点击下方按钮前往 GitHub 创建 OAuth App</li>
                            <li>填写 <strong>Application name</strong> (如: EcoNarrative Studio)</li>
                            <li>填写 <strong>Homepage URL</strong>: <code>http://localhost:3200</code></li>
                            <li>填写 <strong>Authorization callback URL</strong>: <code>http://localhost:5001/auth/github/callback</code></li>
                            <li>点击 "Register application"</li>
                            <li>复制 <strong>Client ID</strong> 和 <strong>Client Secret</strong></li>
                            <li>在项目根目录创建或更新 <code>.env</code> 文件：
                                <pre style="background: #e5e7eb; padding: 10px; border-radius: 4px;">GITHUB_CLIENT_ID=您的ID\nGITHUB_CLIENT_SECRET=您的Secret</pre>
                            </li>
                            <li>重启应用服务器</li>
                        </ol>
                    </div>
                    <a href="https://github.com/settings/applications/new" target="_blank" style="background: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">
                        前往 GitHub 创建 App &rarr;
                    </a>
                </body>
                </html>
            `);
            return;
        }

        const redirect_uri = 'http://localhost:5001/auth/github/callback';
        const scope = 'repo'; // Scope for reading/writing repositories

        const authUrl = `https://github.com/login/oauth/authorize?client_id=${client_id}&redirect_uri=${redirect_uri}&scope=${scope}`;

        res.writeHead(302, { Location: authUrl });
        res.end();
    } else if (req.url.startsWith('/auth/github/callback') && req.method === 'GET') {
        const urlParams = new URL(req.url, `http://${req.headers.host}`).searchParams;
        const code = urlParams.get('code');

        if (!code) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing code parameter' }));
            return;
        }

        const client_id = process.env.GITHUB_CLIENT_ID;
        const client_secret = process.env.GITHUB_CLIENT_SECRET;

        // Exchange code for token
        axios.post('https://github.com/login/oauth/access_token', {
            client_id,
            client_secret,
            code
        }, {
            headers: {
                Accept: 'application/json'
            }
        })
            .then(response => {
                const accessToken = response.data.access_token;
                if (accessToken) {
                    // Redirect back to frontend with token
                    // In production, consider sending a temporary code or setting a secure cookie
                    // For this dev setup, passing via URL fragment is acceptable for 'localhost' but typically not recommended for prod.
                    // Better approach: Redirect to frontend, frontend grabs it.
                    res.writeHead(302, { Location: `http://localhost:3200?token=${accessToken}` });
                    res.end();
                } else {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Failed to obtain access token', details: response.data }));
                }
            })
            .catch(err => {
                console.error('OAuth Error:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'OAuth exchange failed' }));
            });
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not Found' }));
    }
});

server.listen(PORT, () => {
    console.log(`Config Server running at http://localhost:${PORT}`);
});
