import fs from 'fs-extra';
import path from 'path';
import { Base64 } from 'js-base64';
import { getUserProjectsDir, getProjectDir } from '../utils/fileUtils.js';
import { ProjectMeta } from '../types/index.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Helper: Generate slug
const generateSlug = (name: string): string => {
    let slug = name
        .toLowerCase()
        .replace(/[<>:"/\\|?*]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 50);

    if (/[\u4e00-\u9fa5]/.test(slug)) {
        slug = Base64.encodeURI(name).substring(0, 20);
    }

    return slug || 'untitled-project';
};

// Helper: Create structure
const createProjectStructure = async (projectDir: string) => {
    const dirs = [
        projectDir,
        path.join(projectDir, 'world'),
        path.join(projectDir, 'stories', 'segments'),
        path.join(projectDir, 'artifacts', 'items'),
        path.join(projectDir, 'agents')
    ];

    for (const dir of dirs) {
        await fs.ensureDir(dir);
    }
};

// Helper: Initialize files
const initializeProjectFiles = async (projectDir: string, projectData: any, slug: string): Promise<ProjectMeta> => {
    const projectMeta: ProjectMeta = {
        version: "2.0",
        id: slug,
        name: projectData.name,
        slug: slug,
        frameworkId: projectData.frameworkId,
        currentTimeSetting: projectData.currentTimeSetting || '',
        createdAt: projectData.createdAt || Date.now(),
        lastModified: Date.now()
    };

    await fs.writeJson(path.join(projectDir, 'project.json'), projectMeta, { spaces: 2 });
    await fs.writeFile(path.join(projectDir, 'context.md'), projectData.context || '# 世界背景\n\n');
    await fs.writeFile(path.join(projectDir, 'chronicle.md'), projectData.chronicleText || '# 编年史\n\n');

    // World Model
    await fs.writeJson(path.join(projectDir, 'world', 'entities.json'), { version: "1.0", lastModified: Date.now(), entities: projectData.model?.entities || [] }, { spaces: 2 });
    await fs.writeJson(path.join(projectDir, 'world', 'relationships.json'), { version: "1.0", lastModified: Date.now(), relationships: projectData.model?.relationships || [] }, { spaces: 2 });
    await fs.writeJson(path.join(projectDir, 'world', 'entity-states.json'), { version: "1.0", lastModified: Date.now(), entityStates: projectData.model?.entityStates || [] }, { spaces: 2 });
    await fs.writeJson(path.join(projectDir, 'world', 'technologies.json'), { version: "1.0", lastModified: Date.now(), technologies: projectData.model?.technologies || [] }, { spaces: 2 });
    await fs.writeJson(path.join(projectDir, 'world', 'tech-dependencies.json'), { version: "1.0", lastModified: Date.now(), dependencies: projectData.model?.techDependencies || [] }, { spaces: 2 });

    // Stories
    const segments = (projectData.storySegments || []).map((seg: any) => ({
        id: seg.id,
        timestamp: seg.timestamp,
        influencedBy: seg.influencedBy,
        file: `segments/${seg.id}.md`
    }));
    await fs.writeJson(path.join(projectDir, 'stories', '_index.json'), { version: "1.0", lastModified: Date.now(), segments }, { spaces: 2 });

    for (const seg of (projectData.storySegments || [])) {
        const frontmatter = `---\nid: ${seg.id}\ntimestamp: ${seg.timestamp}\ninfluencedBy: ${JSON.stringify(seg.influencedBy)}\n---\n\n`;
        await fs.writeFile(path.join(projectDir, 'stories', 'segments', `${seg.id}.md`), frontmatter + seg.content);
    }

    // Artifacts
    const artifacts = (projectData.artifacts || []).map((art: any) => ({
        id: art.id,
        title: art.title,
        type: art.type,
        sourceStepId: art.sourceStepId,
        createdAt: art.createdAt,
        file: `items/${art.id}.md` // or .json
    }));
    await fs.writeJson(path.join(projectDir, 'artifacts', '_index.json'), { version: "1.0", lastModified: Date.now(), artifacts }, { spaces: 2 });

    for (const art of (projectData.artifacts || [])) {
        const ext = art.type === 'json' ? '.json' : '.md';
        await fs.writeFile(path.join(projectDir, 'artifacts', 'items', `${art.id}${ext}`), art.content);
    }

    // Agents
    await fs.writeJson(path.join(projectDir, 'agents', 'agents.json'), { version: "1.0", lastModified: Date.now(), agents: projectData.agents || [] }, { spaces: 2 });
    await fs.writeJson(path.join(projectDir, 'agents', 'workflow.json'), { version: "1.0", lastModified: Date.now(), steps: projectData.workflow || [] }, { spaces: 2 });

    return projectMeta;
};

// Helper: Read Project
const readProjectData = async (projectDir: string) => {
    const projectMeta = await fs.readJson(path.join(projectDir, 'project.json'));
    const context = await fs.readFile(path.join(projectDir, 'context.md'), 'utf8');
    const chronicleText = await fs.readFile(path.join(projectDir, 'chronicle.md'), 'utf8');

    const entities = await fs.readJson(path.join(projectDir, 'world', 'entities.json'));
    const relationships = await fs.readJson(path.join(projectDir, 'world', 'relationships.json'));
    const entityStates = await fs.readJson(path.join(projectDir, 'world', 'entity-states.json'));
    const technologies = await fs.readJson(path.join(projectDir, 'world', 'technologies.json'));
    const techDependencies = await fs.readJson(path.join(projectDir, 'world', 'tech-dependencies.json'));

    const storiesIndex = await fs.readJson(path.join(projectDir, 'stories', '_index.json'));
    const storySegments = await Promise.all(storiesIndex.segments.map(async (seg: any) => {
        const content = await fs.readFile(path.join(projectDir, 'stories', seg.file), 'utf8');
        return {
            id: seg.id,
            timestamp: seg.timestamp,
            influencedBy: seg.influencedBy,
            content: content.replace(/^---\n[\s\S]*?\n---\n\n?/, '')
        };
    }));

    const artifactsIndex = await fs.readJson(path.join(projectDir, 'artifacts', '_index.json'));
    const artifacts = await Promise.all(artifactsIndex.artifacts.map(async (art: any) => {
        const ext = art.type === 'json' ? '.json' : '.md';
        const content = await fs.readFile(path.join(projectDir, 'artifacts', 'items', `${art.id}${ext}`), 'utf8');
        return {
            id: art.id,
            title: art.title,
            type: art.type,
            sourceStepId: art.sourceStepId,
            createdAt: art.createdAt,
            content
        };
    }));

    const agentsData = await fs.readJson(path.join(projectDir, 'agents', 'agents.json'));
    const workflowData = await fs.readJson(path.join(projectDir, 'agents', 'workflow.json'));

    return {
        ...projectMeta,
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
};

// Helper: Update Project
const updateProjectFiles = async (projectDir: string, worldData: any) => {
    const projectPath = path.join(projectDir, 'project.json');
    const projectMeta = await fs.readJson(projectPath);
    
    projectMeta.lastModified = Date.now();
    projectMeta.name = worldData.name;
    projectMeta.frameworkId = worldData.frameworkId;
    projectMeta.currentTimeSetting = worldData.currentTimeSetting;
    await fs.writeJson(projectPath, projectMeta, { spaces: 2 });

    await fs.writeFile(path.join(projectDir, 'context.md'), worldData.context || '# 世界背景\n\n');
    await fs.writeFile(path.join(projectDir, 'chronicle.md'), worldData.chronicleText || '# 编年史\n\n');

    const model = worldData.model || {};
    await fs.writeJson(path.join(projectDir, 'world', 'entities.json'), { version: "1.0", lastModified: Date.now(), entities: model.entities || [] }, { spaces: 2 });
    await fs.writeJson(path.join(projectDir, 'world', 'relationships.json'), { version: "1.0", lastModified: Date.now(), relationships: model.relationships || [] }, { spaces: 2 });
    await fs.writeJson(path.join(projectDir, 'world', 'entity-states.json'), { version: "1.0", lastModified: Date.now(), entityStates: model.entityStates || [] }, { spaces: 2 });
    await fs.writeJson(path.join(projectDir, 'world', 'technologies.json'), { version: "1.0", lastModified: Date.now(), technologies: model.technologies || [] }, { spaces: 2 });
    await fs.writeJson(path.join(projectDir, 'world', 'tech-dependencies.json'), { version: "1.0", lastModified: Date.now(), dependencies: model.techDependencies || [] }, { spaces: 2 });

    // Stories
    const segments = (worldData.storySegments || []).map((seg: any) => ({
        id: seg.id,
        timestamp: seg.timestamp,
        influencedBy: seg.influencedBy,
        file: `segments/${seg.id}.md`
    }));
    await fs.writeJson(path.join(projectDir, 'stories', '_index.json'), { version: "1.0", lastModified: Date.now(), segments }, { spaces: 2 });

    const segmentsDir = path.join(projectDir, 'stories', 'segments');
    await fs.emptyDir(segmentsDir); // Clear old files
    for (const seg of (worldData.storySegments || [])) {
        const frontmatter = `---\nid: ${seg.id}\ntimestamp: ${seg.timestamp}\ninfluencedBy: ${JSON.stringify(seg.influencedBy)}\n---\n\n`;
        await fs.writeFile(path.join(segmentsDir, `${seg.id}.md`), frontmatter + seg.content);
    }

    // Artifacts
    const artifacts = (worldData.artifacts || []).map((art: any) => ({
        id: art.id,
        title: art.title,
        type: art.type,
        sourceStepId: art.sourceStepId,
        createdAt: art.createdAt,
        file: `items/${art.id}.md`
    }));
    await fs.writeJson(path.join(projectDir, 'artifacts', '_index.json'), { version: "1.0", lastModified: Date.now(), artifacts }, { spaces: 2 });

    const itemsDir = path.join(projectDir, 'artifacts', 'items');
    await fs.emptyDir(itemsDir);
    for (const art of (worldData.artifacts || [])) {
        const ext = art.type === 'json' ? '.json' : '.md';
        await fs.writeFile(path.join(itemsDir, `${art.id}${ext}`), art.content);
    }

    // Agents
    await fs.writeJson(path.join(projectDir, 'agents', 'agents.json'), { version: "1.0", lastModified: Date.now(), agents: worldData.agents || [] }, { spaces: 2 });
    await fs.writeJson(path.join(projectDir, 'agents', 'workflow.json'), { version: "1.0", lastModified: Date.now(), steps: worldData.workflow || [] }, { spaces: 2 });
};

// Service Methods
export const listProjects = async (username: string): Promise<ProjectMeta[]> => {
    const projectsDir = getUserProjectsDir(username);
    if (!await fs.pathExists(projectsDir)) return [];

    const entries = await fs.readdir(projectsDir, { withFileTypes: true });
    const projects: ProjectMeta[] = [];

    for (const entry of entries) {
        if (entry.isDirectory()) {
            const projectJsonPath = path.join(projectsDir, entry.name, 'project.json');
            if (await fs.pathExists(projectJsonPath)) {
                const projectMeta = await fs.readJson(projectJsonPath);
                projects.push(projectMeta);
            }
        }
    }

    return projects.sort((a, b) => b.lastModified - a.lastModified);
};

export const createProject = async (username: string, projectData: any): Promise<ProjectMeta> => {
    const slug = generateSlug(projectData.name);
    const projectDir = getProjectDir(username, slug);

    if (await fs.pathExists(projectDir)) {
        throw new Error('Project already exists');
    }

    await createProjectStructure(projectDir);
    const projectMeta = await initializeProjectFiles(projectDir, projectData, slug);

    // Git init
    try {
        await execAsync('git init', { cwd: projectDir });
        await fs.writeFile(path.join(projectDir, '.gitignore'), '# Temporary files\n*.tmp\n*.bak\n.DS_Store\n*.lock\n*.log\n');
    } catch (e) {
        console.warn('Failed to init git:', e);
    }

    return projectMeta;
};

export const getProject = async (username: string, projectId: string) => {
    const projectDir = getProjectDir(username, projectId);
    if (!await fs.pathExists(projectDir)) {
        throw new Error('Project not found');
    }
    return await readProjectData(projectDir);
};

export const updateProject = async (username: string, projectId: string, worldData: any) => {
    const projectDir = getProjectDir(username, projectId);
    if (!await fs.pathExists(projectDir)) {
        throw new Error('Project not found');
    }
    await updateProjectFiles(projectDir, worldData);
};

export const deleteProject = async (username: string, projectId: string) => {
    const projectDir = getProjectDir(username, projectId);
    if (!await fs.pathExists(projectDir)) {
        throw new Error('Project not found');
    }
    await fs.remove(projectDir);
};
