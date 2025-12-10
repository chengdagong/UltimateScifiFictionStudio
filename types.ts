
export enum EntityCategory {
  PERSON = 'person',           // Individuals, Key Figures
  ORGANIZATION = 'org',        // Groups, Companies, Parties, Families
  TECHNOLOGY = 'tech',         // Tools, Machines, Software, Infrastructure
  RESOURCE = 'resource',       // Natural resources, Money, Capital
  BELIEF = 'belief',           // Ideologies, Religions, Laws, Customs
  EVENT = 'event',             // Historical moments (Time dimension)
  PLACE = 'place',             // Locations, Environments
  UNKNOWN = 'unknown'
}

export interface SocialEntity {
  id: string;
  name: string;
  description: string;
  category: EntityCategory;
  validFrom?: string; // Start of existence (e.g. "1900", "Chapter 1")
  validTo?: string;   // End of existence (e.g. "2000", "Chapter 5")
}

export interface EntityState {
  id: string;
  entityId: string;
  timestamp: string; // e.g. "2020", "Phase 1"
  description: string;
}

export interface EntityRelationship {
  id: string;
  sourceId: string;
  targetId: string;
  type: string; // e.g. "Friend", "Enemy", "Subordinate", "Owner"
  description?: string;
  timestamp?: string; // Specific moment snapshot
  validFrom?: string; // Relationship start
  validTo?: string;   // Relationship end
}

// --- Tech Tree Types ---

export interface TechNode {
  id: string;
  name: string;
  description: string;
  era: string; // e.g. "Industrial Age", "2020s", "Age of Fire"
  type: 'military' | 'civil' | 'abstract';
  status: 'concept' | 'prototype' | 'production' | 'obsolete';
  x?: number; // Persisted Layout X
  y?: number; // Persisted Layout Y
}

export interface TechDependency {
  id: string;
  sourceId: string; // Prerequisite
  targetId: string; // Result
}

// --- Agent & Workflow Types ---

export interface StoryAgent {
  id: string;
  name: string;
  role: string; // e.g. "Historian", "Novelist", "Critic"
  systemPrompt: string; // The persona definition
  color: string; // UI decoration
  icon: string; // UI decoration
}

export interface StepValidation {
  reviewerId: string;
  criteria: string;
  maxRetries: number;
}

export interface WorkflowStep {
  id: string;
  name: string;
  agentId: string;
  instruction: string; // Specific task for this step
  outputContext?: string; // Holds the result after execution
  validation?: StepValidation; // Optional iterative review config
}

// The WorldModel is now a flat pool of entities and relationships
export interface WorldModel {
  entities: SocialEntity[];
  relationships: EntityRelationship[];
  entityStates: EntityState[];
  
  // Tech Tree
  technologies: TechNode[];
  techDependencies: TechDependency[];
}

export interface LayerDefinition {
  id: string;
  title: string;
  description: string;
  colorClass: string;
  isTimeDimension?: boolean;
  // Which categories of entities belong to this layer in this framework?
  allowedCategories: EntityCategory[]; 
}

export interface FrameworkDefinition {
  id: string;
  name: string;
  description: string;
  layers: LayerDefinition[];
}

export interface StorySegment {
  id: string;
  timestamp: string;
  content: string;
  influencedBy: string[]; // Entity IDs
}

export interface WorldData {
  id?: string;
  name: string;
  frameworkId: string;
  createdAt: number;
  lastModified: number;
  context: string;
  model: WorldModel; // Flat model
  storySegments: StorySegment[];
  currentTimeSetting: string;
  chronicleText?: string;
  
  // Agent System Data
  agents: StoryAgent[];
  workflow: WorkflowStep[];
}

export type ApiProvider = 'google' | 'openai';

export interface ApiSettings {
  provider: ApiProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
  minimalUI?: boolean;
}