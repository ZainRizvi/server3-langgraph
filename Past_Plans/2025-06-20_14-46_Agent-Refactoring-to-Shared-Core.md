# Agent Refactoring Plan

This document outlines the steps to move the agents from `apps/agents` to a shared `packages/core` package, making them reusable across the monorepo.

### Phase 1: Relocate Agent Logic

- [x] Create a new directory at `packages/core/src/agents`.
- [x] Move the four agent directories (`memory-agent`, `react-agent`, `research-agent`, `retrieval-agent`) from `apps/agents/src/` into the newly created `packages/core/src/agents/`.

### Phase 2: Automate Package Exports in `@repo/core`

- [x] **Create Automation Script:**
    - [x] Create a Node.js script at `packages/core/scripts/generate-agent-exports.mjs`.
    - [x] This script will scan `packages/core/src/agents/` for `graph.ts` files.
    - [x] It will automatically generate the `exports` map in `packages/core/package.json`.
    - [x] The generated paths will be clean, e.g., `@repo/core/agents/react-agent/graph`.

- [x] **Integrate into Build Process:**
    - [x] Add a `prebuild` script to `packages/core/package.json` that runs the `generate-agent-exports.mjs` script. This ensures the exports are always current.

- [x] **Manage Dependencies:**
    - [x] Identify all dependencies required by the agents in `apps/agents/package.json`.
    - [x] Move these dependencies to `packages/core/package.json`.

### Phase 3: Refactor `apps/agents` as a Thin Wrapper

- [x] **Clean `apps/agents/src`:**
    - [x] Delete the original agent implementation folders from `apps/agents/src`.

- [x] **Create Re-export Files:**
    - [x] Create a new set of small files within `apps/agents/src` (e.g., `react.ts`, `memory.ts`, `research-retrieval.ts`, etc.).
    - [x] Each file will re-export the corresponding agent graph from `@repo/core`. Example for `react.ts`: `export { graph } from '@repo/core/agents/react-agent/graph';`

- [x] **Update `langgraph.json`:**
    - [x] Modify the paths in `langgraph.json` to point to the new re-export files in `apps/agents/src`. This keeps the LangGraph server functional.

- [x] **Prune Dependencies:**
    - [x] Remove the now-unnecessary agent dependencies from `apps/agents/package.json`.

### Phase 4: Update `apps/web`

- [x] **Verify Dependency:**
    - [x] Ensure `apps/web/package.json` has a dependency on `@repo/core`.

- [x] **Update Imports:**
    - [x] Any component in the web app that uses an agent will be updated to import it directly from `@repo/core`. *(Note: No direct imports were found. The web app appears to interact with the agents via the `apps/agents` server, so no code changes were necessary here.)*

### Phase 5: Final Verification

- [x] Run a full dependency installation from the monorepo root (`npm install` or `pnpm install`).
- [x] Build both `apps/agents` and `apps/web` to ensure there are no build errors.
- [x] Run both applications to confirm they are fully functional after the refactoring. 