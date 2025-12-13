import path from 'path';
import fs from 'fs-extra';

// Assuming server/index.ts is entry point, and we run from root or server folder.
// Better to use process.cwd() or relative to this file.
// If this file is server/utils/fileUtils.ts, then root is ../../

export const DATA_DIR = path.join(process.cwd(), 'data');
export const USERS_FILE = path.join(DATA_DIR, 'users.json');

export const ensureDataDirs = async () => {
  await fs.ensureDir(DATA_DIR);
  if (!await fs.pathExists(USERS_FILE)) {
    await fs.writeJson(USERS_FILE, []);
  }
};

export const getUserDir = (username: string) => {
  return path.join(DATA_DIR, 'users', username);
};

export const getUserProjectsDir = (username: string) => {
  return path.join(getUserDir(username), 'projects');
};

export const getProjectDir = (username: string, projectId: string) => {
  return path.join(getUserProjectsDir(username), projectId);
};
