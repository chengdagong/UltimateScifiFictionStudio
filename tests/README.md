# EcoNarrative Automated Tests

This directory contains automated tests for verifying the AI Helper's functionality.

## Prerequisites

- Node.js (v18+)
- Dependencies installed (`npm install`)

## Running Tests

Run all tests:
```bash
npx vitest run
```

Run specific test file:
```bash
npx vitest run tests/useWorldModel.test.tsx
```

## Test Files

- `useWorldModel.test.tsx`: Verifies that world generation actions (e.g., generating layers) correctly create and update tasks in the global Task Manager.
