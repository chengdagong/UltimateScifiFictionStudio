export interface User {
  id: string;
  username: string;
  hash: string;
  createdAt: number;
}

export interface ProjectMeta {
  version: string;
  id: string;
  name: string;
  slug: string;
  frameworkId: string;
  currentTimeSetting: string;
  createdAt: number;
  lastModified: number;
}

export interface AuthRequest extends Express.Request {
  user?: string; // username
}

export interface ApiSettings {
  provider: 'gemini' | 'openai';
  apiKey: string;
  model: string;
  baseUrl?: string;
}
