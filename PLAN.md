# LangGraph Local Streaming Refactor Plan

This document outlines the plan to refactor the streaming implementation in the web application. The primary goal is to enable seamless switching between a local streaming provider (`StreamLocal.tsx`) and an external one (`StreamExternal.tsx`) using an environment variable. This involves fixing several bugs in the local provider and automating the discovery of available LangGraph agents.

## Context for LLM

The project has two streaming providers for the agent chat interface:

1.  `apps/web/src/providers/StreamExternal.tsx`: Connects to a remote LangGraph server via its API. It's feature-complete but requires a separate running server.
2.  `apps/web/src/providers/StreamLocal.tsx`: Aims to run the LangGraph agents directly within the browser for simplicity.

However, `StreamLocal.tsx` suffers from several issues:
- **Fragile Agent Loading:** It uses a dynamic `import()` with a constructed path to load agent graphs. This path is incorrect, and the approach is not robust.
- **Message Duplication:** It incorrectly processes stream events, leading to duplicated messages in the UI.
- **Missing Thread IDs:** It doesn't generate a `thread_id` for new conversations, which is necessary for stateful interactions.
- **Hardcoded Configuration:** The `assistantId` is hardcoded, not configurable via URL parameters like the external provider.
- **Type Mismatches:** The context type it provides is a manually created mock, leading to potential inconsistencies with the external provider, which derives its type from the LangGraph SDK.

The desired solution is to fix these bugs and make the two providers interchangeable. The agent loading mechanism should be replaced with a more robust system that uses static imports and an automatically generated map of available agents.

## Plan

After completing each task, run `npm install` and `npm run build` for basic sanity checks.  

### Part 1: Automated Agent Map Generation

This part focuses on creating a script to automatically generate a map of available agents, which will be used by the local streaming provider.

- [ ] **Task 1.1: Modify Agent Generation Script.**
    -   **File to modify:** `packages/core/scripts/generate-agent-exports.mjs`.
    -   **Goal:** Extend the script to scan the `packages/core/src/agents/` directory for subdirectories (e.g., `memory-agent`, `react-agent`).
    -   The script should then generate a new file: `packages/core/src/agents/index.ts`.
    -   This new file will contain a `Map` named `agentMap`.
        -   **Keys:** The agent's directory name (e.g., `'memory-agent'`).
        -   **Values:** The `graph` object, statically imported from the agent's `graph.ts` file (e.g., `import { graph as memoryAgentGraph } from './memory-agent/graph';`).

### Part 2: Fix Bugs and Refactor `StreamLocal.tsx`

This part addresses the functional issues within the local provider to align its behavior with the external provider.

- [ ] **Task 2.1: Implement Static Agent Loading.**
    -   **File to modify:** `apps/web/src/providers/StreamLocal.tsx`.
    -   **Goal:** Replace the dynamic import logic in the `getGraph` function.
    -   **Implementation:**
        -   Import the `agentMap` from the newly created `packages/core/src/agents/index.ts`.
        -   The `getGraph` function will look up the `assistantId` in the `agentMap`.
        -   If the ID is not found, it should throw an informative error.

- [ ] **Task 2.2: Implement Thread ID Generation.**
    -   **File to modify:** `apps/web/src/providers/StreamLocal.tsx`.
    -   **Goal:** Generate a unique `thread_id` for new conversations.
    -   **Implementation:**
        -   Add `uuid` and `@types/uuid` as development dependencies to `apps/web/package.json`.
        -   In the `submit` function of the `useLocalStream` hook, check if `threadId` is `null`.
        -   If it is, generate a new UUID and call the `onThreadId` callback with the new ID.

- [ ] **Task 2.3: Fix Message Duplication Bug.**
    -   **File to modify:** `apps/web/src/providers/StreamLocal.tsx`.
    -   **Goal:** Prevent duplicate messages from appearing in the UI.
    -   **Implementation:**
        -   In the `submit` function's `for await...of` loop, the logic for updating messages needs to be changed.
        -   Instead of appending messages from all nodes in an event, only process messages from the *last* node in the event object, which represents the final state for that streaming step.

- [ ] **Task 2.4: Refactor Configuration Loading.**
    -   **File to modify:** `apps/web/src/providers/StreamLocal.tsx`.
    -   **Goal:** Load the `assistantId` from URL query parameters instead of hardcoding it.
    -   **Implementation:**
        -   In the `StreamProvider` component, use the `useQueryState` hook from the `nuqs` library (already a dependency) to manage `assistantId`.
        -   Provide a sensible default value (e.g., `'memory-agent'`).

- [ ] **Task 2.5: Unify Stream Context Type.**
    -   **File to modify:** `apps/web/src/providers/StreamLocal.tsx`.
    -   **Goal:** Ensure the context type provided by `StreamLocal.tsx` is identical to `StreamExternal.tsx`.
    -   **Implementation:**
        -   Import `useStream` from `@langchain/langgraph-sdk/react`.
        -   Define a `useTypedStream` alias, just as in `StreamExternal.tsx`.
        -   Set `StreamContextType` to be `ReturnType<typeof useTypedStream>`.
        -   Update the `useLocalStream` hook's return signature to match this type, using type assertions where necessary for properties that have a simplified local implementation (like `getMessagesMetadata`).

### Part 3: Add Validation with Unit Tests

To ensure the agent loading mechanism is robust and to prevent future regressions, this part adds unit tests for the `StreamLocal.tsx` provider.

- [ ] **Task 3.1: Set Up Testing Framework.**
    -   **File to modify:** `apps/web/package.json`.
    -   **Goal:** Add `vitest` and related dependencies to the project to enable unit testing. The `packages/core` project already uses `vitest`, so we will follow that pattern for consistency.
    -   **Implementation:** Add a `test` script to `package.json` to run `vitest`.

- [ ] **Task 3.2: Create Unit Tests for `getGraph`.**
    -   **File to create:** `apps/web/src/providers/StreamLocal.test.tsx`.
    -   **Goal:** Write unit tests to validate the `getGraph` function's behavior.
    -   **Implementation:**
        -   **Test for valid `assistantId`:** Write a test that calls `getGraph` with a known valid agent ID (e.g., `'memory-agent'`). Assert that it returns a non-null graph object.
        -   **Test for invalid `assistantId`:** Write a test that calls `getGraph` with a non-existent agent ID. Assert that it throws an error with an informative message.

### Part 4: Enable Easy Switching Between Providers

This final part implements the logic to switch between the local and external providers using an environment variable.

- [ ] **Task 4.1: Implement Conditional Provider Export.**
    -   **File to modify:** `apps/web/src/providers/Stream.tsx`.
    -   **Goal:** Export the correct provider based on an environment variable.
    -   **Implementation:**
        -   Clear the current content of the file.
        -   Add a condition that checks the value of `process.env.NEXT_PUBLIC_STREAM_LOCAL`.
        -   If the variable is `'true'`, export everything from `./StreamLocal`.
        -   Otherwise, export everything from `./StreamExternal`.
        -   This change will also resolve the "Cannot find module" linter error in `page.tsx`. 