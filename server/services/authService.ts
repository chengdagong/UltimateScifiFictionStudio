import crypto from 'crypto';
import fs from 'fs-extra';
import { USERS_FILE, getUserProjectsDir } from '../utils/fileUtils.js';
import { User } from '../types/index.js';

// Helper: Hash Password
const hashPassword = (password: string, salt?: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const s = salt || crypto.randomBytes(16).toString('hex');
        crypto.scrypt(password, s, 64, (err, derivedKey) => {
            if (err) reject(err);
            resolve(s + ":" + derivedKey.toString('hex'));
        });
    });
}

// Helper: Verify Password
const verifyPassword = (password: string, hash: string): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        const [salt, key] = hash.split(':');
        crypto.scrypt(password, salt, 64, (err, derivedKey) => {
            if (err) reject(err);
            resolve(key === derivedKey.toString('hex'));
        });
    });
}

export const registerUser = async (username: string, password: string): Promise<User> => {
    const users: User[] = await fs.readJson(USERS_FILE);
    if (users.find(u => u.username === username)) {
        throw new Error('User exists');
    }

    const hash = await hashPassword(password);
    const newUser: User = {
        id: Date.now().toString(),
        username,
        hash,
        createdAt: Date.now()
    };
    users.push(newUser);
    await fs.writeJson(USERS_FILE, users, { spaces: 2 });

    // Create user workspace
    await fs.ensureDir(getUserProjectsDir(username));

    return newUser;
};

export const loginUser = async (username: string, password: string): Promise<User | null> => {
    const users: User[] = await fs.readJson(USERS_FILE);
    const user = users.find(u => u.username === username);

    if (!user || !(await verifyPassword(password, user.hash))) {
        return null;
    }
    return user;
};
