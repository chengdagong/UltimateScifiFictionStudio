
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Base64 } from 'js-base64';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 5001;
const execAsync = promisify(exec);

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

// Helper: Generate slug from project name
function generateSlug(name) {
    let slug = name
        .toLowerCase()
        .replace(/[<>:"/\\|?*]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 50);
    
    // If contains Chinese characters, use base64url encoding
    if (/[\u4e00-\u9fa5]/.test(slug)) {
        slug = Base64.encodeURI(name).substring(0, 20);
    }
    
    return slug || 'untitled-project';
}

// Helper: Create project directory structure
function createProjectStructure(projectDir) {
    const dirs = [
        projectDir,
        path.join(projectDir, 'world'),
        path.join(projectDir, 'stories', 'segments'),
        path.join(projectDir, 'artifacts', 'items'),
        path.join(projectDir, 'agents')
    ];
    
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
}

// Helper: Initialize project files
function initializeProjectFiles(projectDir, projectData, slug) {
    // project.json
    const projectMeta = {
        version: "2.0",
        id: slug, // Use slug as ID to match directory name
        name: projectData.name,
        slug: slug,
        frameworkId: projectData.frameworkId,
        currentTimeSetting: projectData.currentTimeSetting || '',
        createdAt: projectData.createdAt || Date.now(),
        lastModified: Date.now()
    };
    fs.writeFileSync(
        path.join(projectDir, 'project.json'),
        JSON.stringify(projectMeta, null, 2)
    );
    
    // context.md
    fs.writeFileSync(
        path.join(projectDir, 'context.md'),
        projectData.context || '# 世界背景\n\n'
    );
    
    // chronicle.md
    fs.writeFileSync(
        path.join(projectDir, 'chronicle.md'),
        projectData.chronicleText || '# 编年史\n\n'
    );
    
    // world/entities.json
    fs.writeFileSync(
        path.join(projectDir, 'world', 'entities.json'),
        JSON.stringify({
            version: "1.0",
            lastModified: Date.now(),
            entities: projectData.model?.entities || []
        }, null, 2)
    );
    
    // world/relationships.json
    fs.writeFileSync(
        path.join(projectDir, 'world', 'relationships.json'),
        JSON.stringify({
            version: "1.0",
            lastModified: Date.now(),
            relationships: projectData.model?.relationships || []
        }, null, 2)
    );
    
    // world/entity-states.json
    fs.writeFileSync(
        path.join(projectDir, 'world', 'entity-states.json'),
        JSON.stringify({
            version: "1.0",
            lastModified: Date.now(),
            entityStates: projectData.model?.entityStates || []
        }, null, 2)
    );
    
    // world/technologies.json
    fs.writeFileSync(
        path.join(projectDir, 'world', 'technologies.json'),
        JSON.stringify({
            version: "1.0",
            lastModified: Date.now(),
            technologies: projectData.model?.technologies || []
        }, null, 2)
    );
    
    // world/tech-dependencies.json
    fs.writeFileSync(
        path.join(projectDir, 'world', 'tech-dependencies.json'),
        JSON.stringify({
            version: "1.0",
            lastModified: Date.now(),
            dependencies: projectData.model?.techDependencies || []
        }, null, 2)
    );
    
    // stories/_index.json
    const segments = (projectData.storySegments || []).map(seg => ({
        id: seg.id,
        timestamp: seg.timestamp,
        influencedBy: seg.influencedBy,
        file: `segments/${seg.id}.md`
    }));
    fs.writeFileSync(
        path.join(projectDir, 'stories', '_index.json'),
        JSON.stringify({
            version: "1.0",
            lastModified: Date.now(),
            segments
        }, null, 2)
    );
    
    // stories/segments/*.md
    (projectData.storySegments || []).forEach(seg => {
        const frontmatter = `---
id: ${seg.id}
timestamp: ${seg.timestamp}
influencedBy: ${JSON.stringify(seg.influencedBy)}
---

`;
        fs.writeFileSync(
            path.join(projectDir, 'stories', 'segments', `${seg.id}.md`),
            frontmatter + seg.content
        );
    });
    
    // artifacts/_index.json
    const artifacts = (projectData.artifacts || []).map(art => ({
        id: art.id,
        title: art.title,
        type: art.type,
        sourceStepId: art.sourceStepId,
        createdAt: art.createdAt,
        file: `items/${art.id}.md`
    }));
    fs.writeFileSync(
        path.join(projectDir, 'artifacts', '_index.json'),
        JSON.stringify({
            version: "1.0",
            lastModified: Date.now(),
            artifacts
        }, null, 2)
    );
    
    // artifacts/items/*.md
    (projectData.artifacts || []).forEach(art => {
        const ext = art.type === 'json' ? '.json' : '.md';
        fs.writeFileSync(
            path.join(projectDir, 'artifacts', 'items', `${art.id}${ext}`),
            art.content
        );
    });
    
    // agents/agents.json
    fs.writeFileSync(
        path.join(projectDir, 'agents', 'agents.json'),
        JSON.stringify({
            version: "1.0",
            lastModified: Date.now(),
            agents: projectData.agents || []
        }, null, 2)
    );
    
    // agents/workflow.json
    fs.writeFileSync(
        path.join(projectDir, 'agents', 'workflow.json'),
        JSON.stringify({
            version: "1.0",
            lastModified: Date.now(),
            steps: projectData.workflow || []
        }, null, 2)
    );
    
    return projectMeta;
}

// Helper: Read project data from directory structure
function readProjectData(projectDir) {
    // Read project.json
    const projectMeta = JSON.parse(
        fs.readFileSync(path.join(projectDir, 'project.json'), 'utf8')
    );
    
    // Read context.md and chronicle.md
    const context = fs.readFileSync(path.join(projectDir, 'context.md'), 'utf8');
    const chronicleText = fs.readFileSync(path.join(projectDir, 'chronicle.md'), 'utf8');
    
    // Read world model files
    const entities = JSON.parse(
        fs.readFileSync(path.join(projectDir, 'world', 'entities.json'), 'utf8')
    );
    const relationships = JSON.parse(
        fs.readFileSync(path.join(projectDir, 'world', 'relationships.json'), 'utf8')
    );
    const entityStates = JSON.parse(
        fs.readFileSync(path.join(projectDir, 'world', 'entity-states.json'), 'utf8')
    );
    const technologies = JSON.parse(
        fs.readFileSync(path.join(projectDir, 'world', 'technologies.json'), 'utf8')
    );
    const techDependencies = JSON.parse(
        fs.readFileSync(path.join(projectDir, 'world', 'tech-dependencies.json'), 'utf8')
    );
    
    // Read stories
    const storiesIndex = JSON.parse(
        fs.readFileSync(path.join(projectDir, 'stories', '_index.json'), 'utf8')
    );
    const storySegments = storiesIndex.segments.map(seg => {
        const segmentPath = path.join(projectDir, 'stories', seg.file);
        let content = fs.readFileSync(segmentPath, 'utf8');
        
        // Remove frontmatter
        content = content.replace(/^---\n[\s\S]*?\n---\n\n?/, '');
        
        return {
            id: seg.id,
            timestamp: seg.timestamp,
            influencedBy: seg.influencedBy,
            content
        };
    });
    
    // Read artifacts
    const artifactsIndex = JSON.parse(
        fs.readFileSync(path.join(projectDir, 'artifacts', '_index.json'), 'utf8')
    );
    const artifacts = artifactsIndex.artifacts.map(art => {
        const ext = art.type === 'json' ? '.json' : '.md';
        const artPath = path.join(projectDir, 'artifacts', 'items', `${art.id}${ext}`);
        const content = fs.readFileSync(artPath, 'utf8');
        
        return {
            id: art.id,
            title: art.title,
            type: art.type,
            sourceStepId: art.sourceStepId,
            createdAt: art.createdAt,
            content
        };
    });
    
    // Read agents and workflow
    const agentsData = JSON.parse(
        fs.readFileSync(path.join(projectDir, 'agents', 'agents.json'), 'utf8')
    );
    const workflowData = JSON.parse(
        fs.readFileSync(path.join(projectDir, 'agents', 'workflow.json'), 'utf8')
    );
    
    // Assemble WorldData format
    return {
        id: projectMeta.id,
        name: projectMeta.name,
        frameworkId: projectMeta.frameworkId,
        createdAt: projectMeta.createdAt,
        lastModified: projectMeta.lastModified,
        currentTimeSetting: projectMeta.currentTimeSetting,
        context,
        chronicleText,
        model: {
            entities: entities.entities,
            relationships: relationships.relationships,
            entityStates: entityStates.entityStates,
            technologies: technologies.technologies,
            techDependencies: techDependencies.dependencies
        },
        storySegments,
        artifacts,
        agents: agentsData.agents,
        workflow: workflowData.steps
    };
}

// Helper: Update project files
function updateProjectFiles(projectDir, worldData) {
    // Update project.json lastModified
    const projectPath = path.join(projectDir, 'project.json');
    const projectMeta = JSON.parse(fs.readFileSync(projectPath, 'utf8'));
    projectMeta.lastModified = Date.now();
    projectMeta.name = worldData.name;
    projectMeta.frameworkId = worldData.frameworkId;
    projectMeta.currentTimeSetting = worldData.currentTimeSetting;
    fs.writeFileSync(projectPath, JSON.stringify(projectMeta, null, 2));
    
    // Update context.md
    fs.writeFileSync(
        path.join(projectDir, 'context.md'),
        worldData.context || '# 世界背景\n\n'
    );
    
    // Update chronicle.md
    fs.writeFileSync(
        path.join(projectDir, 'chronicle.md'),
        worldData.chronicleText || '# 编年史\n\n'
    );
    
    // Update world model files
    fs.writeFileSync(
        path.join(projectDir, 'world', 'entities.json'),
        JSON.stringify({
            version: "1.0",
            lastModified: Date.now(),
            entities: worldData.model.entities
        }, null, 2)
    );
    
    fs.writeFileSync(
        path.join(projectDir, 'world', 'relationships.json'),
        JSON.stringify({
            version: "1.0",
            lastModified: Date.now(),
            relationships: worldData.model.relationships
        }, null, 2)
    );
    
    fs.writeFileSync(
        path.join(projectDir, 'world', 'entity-states.json'),
        JSON.stringify({
            version: "1.0",
            lastModified: Date.now(),
            entityStates: worldData.model.entityStates
        }, null, 2)
    );
    
    fs.writeFileSync(
        path.join(projectDir, 'world', 'technologies.json'),
        JSON.stringify({
            version: "1.0",
            lastModified: Date.now(),
            technologies: worldData.model.technologies
        }, null, 2)
    );
    
    fs.writeFileSync(
        path.join(projectDir, 'world', 'tech-dependencies.json'),
        JSON.stringify({
            version: "1.0",
            lastModified: Date.now(),
            dependencies: worldData.model.techDependencies
        }, null, 2)
    );
    
    // Update stories
    const segments = worldData.storySegments.map(seg => ({
        id: seg.id,
        timestamp: seg.timestamp,
        influencedBy: seg.influencedBy,
        file: `segments/${seg.id}.md`
    }));
    
    fs.writeFileSync(
        path.join(projectDir, 'stories', '_index.json'),
        JSON.stringify({
            version: "1.0",
            lastModified: Date.now(),
            segments
        }, null, 2)
    );
    
    // Clear old segments and write new ones
    const segmentsDir = path.join(projectDir, 'stories', 'segments');
    if (fs.existsSync(segmentsDir)) {
        fs.readdirSync(segmentsDir).forEach(file => {
            fs.unlinkSync(path.join(segmentsDir, file));
        });
    }
    
    worldData.storySegments.forEach(seg => {
        const frontmatter = `---
id: ${seg.id}
timestamp: ${seg.timestamp}
influencedBy: ${JSON.stringify(seg.influencedBy)}
---

`;
        fs.writeFileSync(
            path.join(segmentsDir, `${seg.id}.md`),
            frontmatter + seg.content
        );
    });
    
    // Update artifacts
    const artifacts = (worldData.artifacts || []).map(art => ({
        id: art.id,
        title: art.title,
        type: art.type,
        sourceStepId: art.sourceStepId,
        createdAt: art.createdAt,
        file: `items/${art.id}.md`
    }));
    
    fs.writeFileSync(
        path.join(projectDir, 'artifacts', '_index.json'),
        JSON.stringify({
            version: "1.0",
            lastModified: Date.now(),
            artifacts
        }, null, 2)
    );
    
    // Clear old artifacts and write new ones
    const itemsDir = path.join(projectDir, 'artifacts', 'items');
    if (fs.existsSync(itemsDir)) {
        fs.readdirSync(itemsDir).forEach(file => {
            fs.unlinkSync(path.join(itemsDir, file));
        });
    }
    
    (worldData.artifacts || []).forEach(art => {
        const ext = art.type === 'json' ? '.json' : '.md';
        fs.writeFileSync(
            path.join(itemsDir, `${art.id}${ext}`),
            art.content
        );
    });
    
    // Update agents and workflow
    fs.writeFileSync(
        path.join(projectDir, 'agents', 'agents.json'),
        JSON.stringify({
            version: "1.0",
            lastModified: Date.now(),
            agents: worldData.agents
        }, null, 2)
    );
    
    fs.writeFileSync(
        path.join(projectDir, 'agents', 'workflow.json'),
        JSON.stringify({
            version: "1.0",
            lastModified: Date.now(),
            steps: worldData.workflow
        }, null, 2)
    );
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
        res.writeHead(204); 
        res.end(); 
        return;
    }

    // Auth: Register
    if (req.url === '/api/auth/register' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { username, password } = JSON.parse(body);
                if (!username || !password) {
                    res.writeHead(400); 
                    res.end(JSON.stringify({ error: 'Missing fields' })); 
                    return;
                }

                const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
                if (users.find(u => u.username === username)) {
                    res.writeHead(409); 
                    res.end(JSON.stringify({ error: 'User exists' })); 
                    return;
                }

                const hash = await hashPassword(password);
                const newUser = { 
                    id: Date.now().toString(), 
                    username, 
                    hash, 
                    createdAt: Date.now() 
                };
                users.push(newUser);
                fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

                // Create user workspace
                const userDir = path.join(__dirname, 'data', 'users', username, 'projects');
                fs.mkdirSync(userDir, { recursive: true });

                res.writeHead(201); 
                res.end(JSON.stringify({ success: true, username }));
            } catch (e) {
                res.writeHead(500); 
                res.end(JSON.stringify({ error: e.message }));
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
                    res.writeHead(401); 
                    res.end(JSON.stringify({ error: 'Invalid credentials' })); 
                    return;
                }

                const token = crypto.randomBytes(32).toString('hex');
                SESSIONS[token] = username;

                res.writeHead(200); 
                res.end(JSON.stringify({ token, username }));
            } catch (e) {
                res.writeHead(500); 
                res.end(JSON.stringify({ error: e.message }));
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

    // ==================== NEW PROJECT APIs ====================
    
    // GET /api/projects - List all projects
    if (req.url === '/api/projects' && req.method === 'GET') {
        if (!currentUser) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
            return;
        }

        try {
            const projectsDir = path.join(__dirname, 'data', 'users', currentUser, 'projects');
            if (!fs.existsSync(projectsDir)) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify([]));
                return;
            }

            const entries = fs.readdirSync(projectsDir, { withFileTypes: true });
            const projects = [];

            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const projectJsonPath = path.join(projectsDir, entry.name, 'project.json');
                    if (fs.existsSync(projectJsonPath)) {
                        const projectMeta = JSON.parse(fs.readFileSync(projectJsonPath, 'utf8'));
                        projects.push(projectMeta);
                    }
                }
            }

            // Sort by lastModified desc
            projects.sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(projects));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
        }
        return;
    }

    // POST /api/projects - Create new project
    if (req.url === '/api/projects' && req.method === 'POST') {
        if (!currentUser) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
            return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const projectData = JSON.parse(body);
                if (!projectData.name) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Project name is required' }));
                    return;
                }

                const slug = generateSlug(projectData.name);
                const projectsDir = path.join(__dirname, 'data', 'users', currentUser, 'projects');
                const projectDir = path.join(projectsDir, slug);

                if (fs.existsSync(projectDir)) {
                    res.writeHead(409, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Project already exists' }));
                    return;
                }

                // Create directory structure
                createProjectStructure(projectDir);

                // Initialize files with slug as ID
                const projectMeta = initializeProjectFiles(projectDir, projectData, slug);

                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, project: projectMeta }));
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    // GET /api/projects/:id - Get full project data
    if (req.url.startsWith('/api/projects/') && req.method === 'GET' && !req.url.includes('/git/')) {
        if (!currentUser) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
            return;
        }

        try {
            const projectId = req.url.split('/')[3];
            const projectDir = path.join(__dirname, 'data', 'users', currentUser, 'projects', projectId);

            if (!fs.existsSync(projectDir)) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Project not found' }));
                return;
            }

            const worldData = readProjectData(projectDir);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(worldData));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
        }
        return;
    }

    // PUT /api/projects/:id - Update project
    if (req.url.startsWith('/api/projects/') && req.method === 'PUT' && !req.url.includes('/git/')) {
        if (!currentUser) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
            return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const projectId = req.url.split('/')[3];
                const projectDir = path.join(__dirname, 'data', 'users', currentUser, 'projects', projectId);

                if (!fs.existsSync(projectDir)) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Project not found' }));
                    return;
                }

                const worldData = JSON.parse(body);
                updateProjectFiles(projectDir, worldData);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    // DELETE /api/projects/:id - Delete project
    if (req.url.startsWith('/api/projects/') && req.method === 'DELETE') {
        if (!currentUser) {
            res.writeHead(401);
            res.end();
            return;
        }

        try {
            const projectId = req.url.split('/')[3];
            const projectDir = path.join(__dirname, 'data', 'users', currentUser, 'projects', projectId);

            if (!fs.existsSync(projectDir)) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Project not found' }));
                return;
            }

            // Recursively delete project directory
            fs.rmSync(projectDir, { recursive: true, force: true });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
        }
        return;
    }

    // ==================== PROJECT-LEVEL Git APIs ====================

    // POST /api/projects/:id/git/init
    if (req.url.match(/^\/api\/projects\/[^/]+\/git\/init$/) && req.method === 'POST') {
        if (!currentUser) {
            res.writeHead(401);
            res.end();
            return;
        }

        try {
            const projectId = req.url.split('/')[3];
            const projectDir = path.join(__dirname, 'data', 'users', currentUser, 'projects', projectId);

            if (!fs.existsSync(projectDir)) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Project not found' }));
                return;
            }

            await execAsync('git init', { cwd: projectDir });
            
            // Create .gitignore
            const gitignoreContent = `# Temporary files
*.tmp
*.bak
.DS_Store

# Editor lock files
*.lock

# Log files
*.log
`;
            fs.writeFileSync(path.join(projectDir, '.gitignore'), gitignoreContent);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'Git repository initialized' }));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
        }
        return;
    }

    // GET /api/projects/:id/git/status
    if (req.url.match(/^\/api\/projects\/[^/]+\/git\/status$/) && req.method === 'GET') {
        if (!currentUser) {
            res.writeHead(401);
            res.end();
            return;
        }

        try {
            const projectId = req.url.split('/')[3];
            const projectDir = path.join(__dirname, 'data', 'users', currentUser, 'projects', projectId);

            if (!fs.existsSync(projectDir)) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Project not found' }));
                return;
            }

            const { stdout, stderr } = await execAsync('git status --porcelain', { cwd: projectDir });
            
            const changes = stdout.split('\n').filter(Boolean).map(line => {
                const status = line.substring(0, 2).trim();
                const filepath = line.substring(3);
                return { status, path: filepath };
            });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ changes }));
        } catch (e) {
            // Not a git repo yet
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ changes: [] }));
        }
        return;
    }

    // POST /api/projects/:id/git/commit
    if (req.url.match(/^\/api\/projects\/[^/]+\/git\/commit$/) && req.method === 'POST') {
        if (!currentUser) {
            res.writeHead(401);
            res.end();
            return;
        }

        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const projectId = req.url.split('/')[3];
                const projectDir = path.join(__dirname, 'data', 'users', currentUser, 'projects', projectId);

                if (!fs.existsSync(projectDir)) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Project not found' }));
                    return;
                }

                const { message } = JSON.parse(body || '{}');
                const commitMsg = message || 'Update';
                
                await execAsync('git add .', { cwd: projectDir });
                await execAsync(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`, { cwd: projectDir });

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: 'Changes committed' }));
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    // GET /api/projects/:id/git/log
    if (req.url.match(/^\/api\/projects\/[^/]+\/git\/log$/) && req.method === 'GET') {
        if (!currentUser) {
            res.writeHead(401);
            res.end();
            return;
        }

        try {
            const projectId = req.url.split('/')[3];
            const projectDir = path.join(__dirname, 'data', 'users', currentUser, 'projects', projectId);

            if (!fs.existsSync(projectDir)) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Project not found' }));
                return;
            }

            const { stdout } = await execAsync('git log --pretty=format:"%h|%an|%s|%ad" --date=iso -n 10', { cwd: projectDir });
            
            const logs = stdout.split('\n').filter(Boolean).map(line => {
                const [hash, author, message, date] = line.split('|');
                return { hash, author, message, date };
            });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ logs }));
        } catch (e) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ logs: [] }));
        }
        return;
    }

    // ==================== LEGACY API (for backward compatibility) ====================

    // GET /api/worlds - List old format projects
    if (req.url === '/api/worlds' && req.method === 'GET') {
        if (!currentUser) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
            return;
        }

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
                        worlds.sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(worlds));
                    }
                });
            });
        });
        return;
    }

    // POST /api/worlds - Save old format project
    if (req.url === '/api/worlds' && req.method === 'POST') {
        if (!currentUser) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
            return;
        }

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
        return;
    }

    // DELETE /api/worlds/:id - Delete old format project
    if (req.url.startsWith('/api/worlds/') && req.method === 'DELETE') {
        if (!currentUser) {
            res.writeHead(401);
            res.end();
            return;
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
                res.writeHead(500);
                res.end();
                return;
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
                if (!file.endsWith('.json')) {
                    checkFile(index + 1);
                    return;
                }

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
        return;
    }

    // ==================== LEGACY Git APIs (workspace-level) ====================
    
    if (req.url === '/api/git/init' && req.method === 'POST') {
        if (!currentUser) {
            res.writeHead(401);
            res.end();
            return;
        }
        const repoPath = path.join(__dirname, 'data', 'users', currentUser, 'projects');
        exec('git init', { cwd: repoPath }, (err, stdout, stderr) => {
            if (err) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: stderr }));
                return;
            }
            res.writeHead(200);
            res.end(JSON.stringify({ success: true, message: stdout }));
        });
        return;
    }

    if (req.url === '/api/git/status' && req.method === 'GET') {
        if (!currentUser) {
            res.writeHead(401);
            res.end();
            return;
        }
        const repoPath = path.join(__dirname, 'data', 'users', currentUser, 'projects');
        exec('git status --porcelain', { cwd: repoPath }, (err, stdout, stderr) => {
            if (err) {
                res.writeHead(200);
                res.end(JSON.stringify({ changes: [] }));
                return;
            }
            const changes = stdout.split('\n').filter(Boolean).map(line => {
                const [status, ...pathParts] = line.trim().split(' ');
                return { status, path: pathParts.join(' ') };
            });
            res.writeHead(200);
            res.end(JSON.stringify({ changes }));
        });
        return;
    }

    if (req.url === '/api/git/commit' && req.method === 'POST') {
        if (!currentUser) {
            res.writeHead(401);
            res.end();
            return;
        }
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const { message } = JSON.parse(body || '{}');
            const repoPath = path.join(__dirname, 'data', 'users', currentUser, 'projects');
            exec(`git add . && git commit -m "${message || 'Update'}"`, { cwd: repoPath }, (err, stdout, stderr) => {
                if (err) {
                    res.writeHead(500);
                    res.end(JSON.stringify({ error: stderr }));
                    return;
                }
                res.writeHead(200);
                res.end(JSON.stringify({ success: true, message: stdout }));
            });
        });
        return;
    }

    if (req.url === '/api/git/log' && req.method === 'GET') {
        if (!currentUser) {
            res.writeHead(401);
            res.end();
            return;
        }
        const repoPath = path.join(__dirname, 'data', 'users', currentUser, 'projects');
        exec('git log --pretty=format:"%h|%an|%s|%ad" --date=iso -n 10', { cwd: repoPath }, (err, stdout, stderr) => {
            if (err) {
                res.writeHead(200);
                res.end(JSON.stringify({ logs: [] }));
                return;
            }
            const logs = stdout.split('\n').filter(Boolean).map(line => {
                const [hash, author, message, date] = line.split('|');
                return { hash, author, message, date };
            });
            res.writeHead(200);
            res.end(JSON.stringify({ logs }));
        });
        return;
    }

    // 404 - Not Found
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
});


server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
