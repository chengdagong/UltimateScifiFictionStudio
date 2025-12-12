
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 5001;
const CONFIG_FILE = path.join(__dirname, 'config.json');

import crypto from 'crypto';
import { exec } from 'child_process';

// Session store: token -> username
const SESSIONS = {};
const USERS_FILE = path.join(__dirname, 'data', 'users.json');

// Helper: Hash Password
function hashPassword(password, salt) {
    return new Promise((resolve, reject) => {
        const s = salt || crypto.randomBytes(16).toString('hex');
        crypto.scrypt(password, s, 64, (err, derivedKey) => {
            if (err) reject(err);
            resolve(s + ":" + derivedKey.toString('hex'));
        });
    });
}

// Helper: Verify Password
function verifyPassword(password, hash) {
    return new Promise((resolve, reject) => {
        const [salt, key] = hash.split(':');
        crypto.scrypt(password, salt, 64, (err, derivedKey) => {
            if (err) reject(err);
            resolve(key === derivedKey.toString('hex'));
        });
    });
}

// Ensure data directories exist
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, '[]');
}

const server = http.createServer(async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE, PUT');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(204); res.end(); return;
    }

    // Auth: Register
    if (req.url === '/api/auth/register' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { username, password } = JSON.parse(body);
                if (!username || !password) {
                    res.writeHead(400); res.end(JSON.stringify({ error: 'Missing fields' })); return;
                }

                const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
                if (users.find(u => u.username === username)) {
                    res.writeHead(409); res.end(JSON.stringify({ error: 'User exists' })); return;
                }

                const hash = await hashPassword(password);
                const newUser = { id: Date.now().toString(), username, hash, createdAt: Date.now() };
                users.push(newUser);
                fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

                // Create Workspace
                const userDir = path.join(__dirname, 'data', 'users', username, 'projects');
                fs.mkdirSync(userDir, { recursive: true });

                res.writeHead(201); res.end(JSON.stringify({ success: true, username }));
            } catch (e) {
                res.writeHead(500); res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    // Auth: Login
    if (req.url === '/api/auth/login' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { username, password } = JSON.parse(body);
                const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
                const user = users.find(u => u.username === username);

                if (!user || !(await verifyPassword(password, user.hash))) {
                    res.writeHead(401); res.end(JSON.stringify({ error: 'Invalid credentials' })); return;
                }

                const token = crypto.randomBytes(32).toString('hex');
                SESSIONS[token] = username;

                res.writeHead(200); res.end(JSON.stringify({ token, username }));
            } catch (e) {
                res.writeHead(500); res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    // Middleware: Get User from Token
    const authHeader = req.headers['authorization'];
    let currentUser = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        currentUser = SESSIONS[token];
    }

    // World APIs
    if (req.url === '/api/worlds' && req.method === 'GET') {
        if (!currentUser) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
            return;
        }

        // List all worlds for current user
        const worldsDir = path.join(__dirname, 'data', 'users', currentUser, 'projects');
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
        if (!currentUser) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
            return;
        }

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

                const worldsDir = path.join(__dirname, 'data', 'users', currentUser, 'projects');
                if (!fs.existsSync(worldsDir)) {
                    fs.mkdirSync(worldsDir, { recursive: true });
                }

                const safeName = (data.name || 'Untitled').replace(/[<>:"/\\|?*]/g, '_');
                const fileName = `${safeName}.json`;
                const filePath = path.join(worldsDir, fileName);

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
        if (!currentUser) {
            res.writeHead(401); res.end(); return;
        }

        const idToDelete = req.url.split('/').pop();
        const worldsDir = path.join(__dirname, 'data', 'users', currentUser, 'projects');

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
                            return;
                        }
                    } catch (e) { }
                    checkFile(index + 1);
                });
            };

            checkFile(0);
        });
    }
    // Local Git APIs
    else if (req.url === '/api/git/init' && req.method === 'POST') {
        if (!currentUser) { res.writeHead(401); res.end(); return; }
        const repoPath = path.join(__dirname, 'data', 'users', currentUser, 'projects');
        exec('git init', { cwd: repoPath }, (err, stdout, stderr) => {
            if (err) { res.writeHead(500); res.end(JSON.stringify({ error: stderr })); return; }
            res.writeHead(200); res.end(JSON.stringify({ success: true, message: stdout }));
        });
    } else if (req.url === '/api/git/status' && req.method === 'GET') {
        if (!currentUser) { res.writeHead(401); res.end(); return; }
        const repoPath = path.join(__dirname, 'data', 'users', currentUser, 'projects');
        exec('git status --porcelain', { cwd: repoPath }, (err, stdout, stderr) => {
            if (err) {
                res.writeHead(200); res.end(JSON.stringify({ changes: [] })); return;
            }
            const changes = stdout.split('\n').filter(Boolean).map(line => {
                const [status, ...pathParts] = line.trim().split(' ');
                return { status, path: pathParts.join(' ') };
            });
            res.writeHead(200); res.end(JSON.stringify({ changes }));
        });
    } else if (req.url === '/api/git/commit' && req.method === 'POST') {
        if (!currentUser) { res.writeHead(401); res.end(); return; }
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const { message } = JSON.parse(body || '{}');
            const repoPath = path.join(__dirname, 'data', 'users', currentUser, 'projects');
            exec(`git add . && git commit -m "${message || 'Update'}"`, { cwd: repoPath }, (err, stdout, stderr) => {
                if (err) { res.writeHead(500); res.end(JSON.stringify({ error: stderr })); return; }
                res.writeHead(200); res.end(JSON.stringify({ success: true, message: stdout }));
            });
        });
    } else if (req.url === '/api/git/log' && req.method === 'GET') {
        if (!currentUser) { res.writeHead(401); res.end(); return; }
        const repoPath = path.join(__dirname, 'data', 'users', currentUser, 'projects');
        exec('git log --pretty=format:"%h|%an|%s|%ad" --date=iso -n 10', { cwd: repoPath }, (err, stdout, stderr) => {
            if (err) { res.writeHead(200); res.end(JSON.stringify({ logs: [] })); return; }
            const logs = stdout.split('\n').filter(Boolean).map(line => {
                const [hash, author, message, date] = line.split('|');
                return { hash, author, message, date };
            });
            res.writeHead(200); res.end(JSON.stringify({ logs }));
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not Found' }));
    }
});


server.listen(PORT, () => {
    console.log(`Config Server running at http://localhost:${PORT}`);
});
