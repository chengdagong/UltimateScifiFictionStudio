export type AiTaskType = 'analysis' | 'story_step' | 'world_gen' | 'generation' | 'custom';

export type AiTaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'paused';

export interface AiTaskResult {
    data?: any;
    summary?: string;
    error?: string;
}

export interface AiTask {
    id: string;
    type: AiTaskType;
    status: AiTaskStatus;
    name: string;
    description: string;
    progress: number; // 0-100
    createdAt: number;
    updatedAt: number;
    result?: AiTaskResult;
    // Optional metadata to help link back to source
    sourceId?: string;
    metadata?: any;
}
