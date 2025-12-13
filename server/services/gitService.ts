import { simpleGit } from 'simple-git';
import fs from 'fs-extra';
import path from 'path';
import { getProjectDir } from '../utils/fileUtils.js';

export const initGit = async (username: string, projectId: string) => {
    const projectDir = getProjectDir(username, projectId);
    if (!await fs.pathExists(projectDir)) {
        throw new Error('Project not found');
    }

    const git = simpleGit(projectDir);
    await git.init();
    
    const gitignorePath = path.join(projectDir, '.gitignore');
    if (!await fs.pathExists(gitignorePath)) {
        await fs.writeFile(gitignorePath, '# Temporary files\n*.tmp\n*.bak\n.DS_Store\n*.lock\n*.log\n');
    }
};

export const getGitStatus = async (username: string, projectId: string) => {
    const projectDir = getProjectDir(username, projectId);
    if (!await fs.pathExists(projectDir)) {
        throw new Error('Project not found');
    }

    // Check if it is a git repo
    if (!await fs.pathExists(path.join(projectDir, '.git'))) {
        return [];
    }

    const git = simpleGit(projectDir);
    const status = await git.status();
    
    return status.files.map((f: any) => ({
        status: f.working_dir === '?' ? '??' : (f.working_dir || f.index),
        path: f.path
    }));
};

export const commitChanges = async (username: string, projectId: string, message: string) => {
    const projectDir = getProjectDir(username, projectId);
    if (!await fs.pathExists(projectDir)) {
        throw new Error('Project not found');
    }

    const git = simpleGit(projectDir);
    await git.add('.');
    await git.commit(message || 'Update');
};

export const getGitLog = async (username: string, projectId: string) => {
    const projectDir = getProjectDir(username, projectId);
    if (!await fs.pathExists(projectDir)) {
        throw new Error('Project not found');
    }

    if (!await fs.pathExists(path.join(projectDir, '.git'))) {
        return [];
    }

    const git = simpleGit(projectDir);
    try {
        const log = await git.log({ maxCount: 10 });
        return log.all.map((l: any) => ({
            hash: l.hash.substring(0, 7),
            author: l.author_name,
            message: l.message,
            date: l.date
        }));
    } catch (e) {
        // No commits yet
        return [];
    }
};
