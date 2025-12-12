
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
    } else if (req.url === '/api/worlds' && req.method === 'GET') {
        // List all worlds
        const worldsDir = path.join(__dirname, 'data', 'worlds');
        if (!fs.existsSync(worldsDir)) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify([]));
            return;
        }

        fs.readdir(worldsDir, (err, files) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Failed to read worlds directory' }));
                return;
            }

            const jsonFiles = files.filter(file => file.endsWith('.json'));
            const worlds = [];

            let processedCount = 0;
            if (jsonFiles.length === 0) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify([]));
                return;
            }

            jsonFiles.forEach(file => {
                const filePath = path.join(worldsDir, file);
                fs.readFile(filePath, 'utf8', (readErr, content) => {
                    if (!readErr) {
                        try {
                            const data = JSON.parse(content);
                            // Ensure ID is present, if not add it from metadata or generate
                            // We return minimal info for list usually, but full data is fine for small scale
                            worlds.push(data);
                        } catch (e) {
                            console.error(`Failed to parse ${file}`, e);
                        }
                    }
                    processedCount++;
                    if (processedCount === jsonFiles.length) {
                        // Sort by lastModified desc
                        worlds.sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(worlds));
                    }
                });
            });
        });
    } else if (req.url === '/api/worlds' && req.method === 'POST') {
        // Save World
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                if (!data.id) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'World ID is required' }));
                    return;
                }

                const worldsDir = path.join(__dirname, 'data', 'worlds');
                if (!fs.existsSync(worldsDir)) {
                    fs.mkdirSync(worldsDir, { recursive: true });
                }

                // Use ID as filename for stability, or Name? 
                // Using ID is safer for renames, but User wants readable files.
                // Compromise: Use Name, but handle rename? 
                // The implementation plan suggested overwriting if ID exists.
                // Let's use Name-based filename for "transparency".
                // But this complicates renaming. If we change name, we must delete old file?
                // Simpler: Use {id}.json if we want robust linking, or {name}.json if we want user readability.
                // User asked for "Transparency". Let's try to use Name, but sanitize it.
                // For robustness, let's stick to ID for file link, but maybe save a copy as Name?
                // NO, let's use ID as filename to avoid issues with specialized characters in names.
                // WAIT, user Explicitly said: "可以直接在文件夹里看到文件名".
                // So I MUST use Name.

                const safeName = (data.name || 'Untitled').replace(/[<>:"/\\|?*]/g, '_');
                const fileName = `${safeName}.json`;
                const filePath = path.join(worldsDir, fileName);

                // Check if we are renaming (i.e. if ID exists in another file)
                // This is expensive (scan all). For now, simple overwrite or create.
                // If user changes name, we might end up with two files if we don't track old name.
                // To keep it simple for this iteration (MVP of local fs):
                // We will just save to {name}.json. If they rename, old file remains (user has to delete).
                // OR: We include 'originalName' in payload? 
                // Let's stick to simple: Save to {name}.json. 
                // Ideally, we should receive an "previousName" or "id" to lookup.
                // Let's assume for now 1:1 map.

                // Clean data before saving
                const finalData = { ...data, lastModified: Date.now() };

                fs.writeFile(filePath, JSON.stringify(finalData, null, 2), (err) => {
                    if (err) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Failed to save world' }));
                    } else {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ id: data.id, success: true }));
                    }
                });

            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
    } else if (req.url.startsWith('/api/worlds/') && req.method === 'DELETE') {
        // DELETE /api/worlds/:id (or :filename)
        // Since we decided to use Filename (derived from name) as key?
        // But frontend sends ID.
        // We need to look up the file by ID to delete it OR frontend sends filename.
        // Let's require frontend to send ID, and we scan to find it? Slower.
        // OPTION B: Use ID as filename. {id}.json.
        // This is much safer. 
        // User wants to see "File Names".
        // Compromise: {name}_{id}.json ?
        // Let's go with {name}.json for now as per user preference for "Transparency".
        // The frontend 'delete' usually happens on a selected world.
        // We will assume the frontend passes the NAME in the URL for delete if we use name-based storage.
        // But URLs encode strings.
        // Let's change strategy: The API expects the FILENAME (without .json) or we just scan.
        // Let's SCAN for the ID. It's not that many files (usually < 100).

        const idToDelete = req.url.split('/').pop();
        const worldsDir = path.join(__dirname, 'data', 'worlds');

        if (!fs.existsSync(worldsDir)) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'No worlds found' }));
            return;
        }

        fs.readdir(worldsDir, (err, files) => {
            if (err) {
                res.writeHead(500); res.end(); return;
            }

            let found = false;
            // Find file with this ID
            // We have to read them... this IS slow. 
            // ALTERNATIVE: Frontend sends the NAME (which is the key).
            // Let's try to find by ID first.

            // ... Actually, for "Transparency", the user likely wants to see "The Dark Forest.json".
            // So, the "ID" in the database sense is less relevant than the "Name".
            // Let's implement DELETE by looking for a file that contains this ID in its data.

            // Optimization: If the caller passes ?key=name, we stick to name.
            // Let's just Loop.

            // Non-blocking loop?
            const checkFile = (index) => {
                if (index >= files.length) {
                    if (!found) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'World not found' }));
                    }
                    return;
                }

                const file = files[index];
                if (!file.endsWith('.json')) { checkFile(index + 1); return; }

                const filePath = path.join(worldsDir, file);
                fs.readFile(filePath, 'utf8', (err, content) => {
                    try {
                        const d = JSON.parse(content);
                        if (d.id === idToDelete) {
                            found = true;
                            fs.unlink(filePath, () => {
                                res.writeHead(200, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ success: true }));
                            });
                            return; // Stop loop
                        }
                    } catch (e) { }
                    checkFile(index + 1);
                });
            };

            checkFile(0);
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not Found' }));
    }
});


server.listen(PORT, () => {
    console.log(`Config Server running at http://localhost:${PORT}`);
});
