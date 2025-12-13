# EcoNarrative Studio Backend API

## Overview
The backend is built with Express.js and TypeScript. It provides authentication, project management, Git integration, and AI services.

## Base URL
`/api`

## Authentication
- `POST /api/auth/register`: Register a new user.
- `POST /api/auth/login`: Login and get JWT token.
- `GET /api/auth/verify`: Verify current token.

## Projects
- `GET /api/projects`: List all projects.
- `POST /api/projects`: Create a new project.
- `GET /api/projects/:id`: Get project details.
- `PUT /api/projects/:id`: Update project.
- `DELETE /api/projects/:id`: Delete project.

## Git Integration
- `POST /api/projects/:id/git/init`: Initialize Git repository.
- `GET /api/projects/:id/git/status`: Get Git status.
- `POST /api/projects/:id/git/commit`: Commit changes.
- `GET /api/projects/:id/git/log`: Get commit log.

## AI Services
- `POST /api/ai/generate-entities`: Generate entities for a layer.
- `POST /api/ai/import-world`: Import world from text.
- `POST /api/ai/generate-world`: Generate world from scenario.
- `POST /api/ai/execute-agent`: Execute agent task.
- `POST /api/ai/execute-review`: Execute review task.
- `POST /api/ai/generate-chronicle`: Generate world chronicle.
- `POST /api/ai/generate-tech`: Generate related tech node.
- `POST /api/ai/generate-character`: Generate character profile.
- `POST /api/ai/extract-entities`: Extract entities from snippet.

## Data Structure
Projects are stored in `data/users/{username}/projects/{slug}`.
Each project has a structured JSON file system:
- `project.json`: Metadata
- `world/`: World model data
- `stories/`: Story segments
- `artifacts/`: Generated artifacts
- `agents/`: Agent configurations
