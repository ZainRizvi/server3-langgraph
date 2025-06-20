# LangGraph Local Streaming Refactor Plan

This document outlines the plan to refactor the streaming implementation in the web application. The primary goal is to enable seamless switching between a local streaming provider (`StreamLocal.tsx`) and an external one (`StreamExternal.tsx`) using an environment variable. This involves creating a proper client-server architecture and automating the discovery of available LangGraph agents.

## Context for LLM

The project has two streaming providers for the agent chat interface:

1.  `apps/web/src/providers/StreamExternal.tsx`: Connects to a remote LangGraph server via its API. It's feature-complete but requires a separate running server.
2.  `apps/web/src/providers/StreamLocal.tsx`: Should provide a local alternative that runs agents on the same server as the web app, but currently has a fundamental design flaw - it tries to import and run server-side packages (MongoDB, Pinecone, etc.) directly in the browser.

The core issue is architectural: **StreamLocal should not import server-side packages directly**. Instead, it should make API calls to the web app's backend, which then executes the agents server-side and streams the results back.

## Plan

After completing each task, run `npm install` and `npm run build` for basic sanity checks.  

### Part 1: Create Dual Agent Exports

This part creates two different exports from the core package: one for client-side use (agent metadata only) and one for server-side use (full agent implementations).

- [ ] **Task 1.1: Modify Agent Generation Script.**
    -   **File to modify:** `packages/core/scripts/generate-agent-exports.mjs`.
    -   **Goal:** Generate two separate index files for different use cases.
    -   **Implementation:**
        -   Generate `packages/core/src/agents/index.ts` - Full agent map with actual graph imports (server-side only)
        -   Generate `packages/core/src/agents/metadata.ts` - Agent metadata only (client-safe)
        -   The metadata file should export:
            -   `agentNames: string[]` - Array of available agent names
            -   `agentMetadata: Record<string, { name: string, description?: string }>` - Agent info without implementations
        -   Update package.json exports to include both files

### Part 2: Create Local Agent API Endpoints

This part adds API routes to the web app that can execute agents server-side.

- [ ] **Task 2.1: Create Agent Stream API Route.**
    -   **File to create:** `apps/web/src/app/api/agents/[agentId]/stream/route.ts`.
    -   **Goal:** Create a streaming API endpoint that executes agents server-side.
    -   **Implementation:**
        -   Import the full `agentMap` from `@repo/core/agents` (server-side import)
        -   Accept POST requests with `{ messages, threadId?, configurable? }`
        -   Stream agent execution results back to client using Next.js streaming response
        -   Handle errors appropriately and return proper HTTP status codes

- [ ] **Task 2.2: Create Agent List API Route.**
    -   **File to create:** `apps/web/src/app/api/agents/route.ts`.
    -   **Goal:** Provide an endpoint to list available agents.
    -   **Implementation:**
        -   Import `agentMetadata` from `@repo/core/agents/metadata` 
        -   Return JSON list of available agents with their metadata

### Part 3: Refactor StreamLocal to Use API

This part updates StreamLocal to make API calls instead of importing server-side packages.

- [ ] **Task 3.1: Update StreamLocal to Use Fetch API.**
    -   **File to modify:** `apps/web/src/providers/StreamLocal.tsx`.
    -   **Goal:** Replace direct agent imports with API calls.
    -   **Implementation:**
        -   Remove all imports of server-side packages
        -   Import `agentNames` from `@repo/core/agents/metadata` for validation
        -   Update `getGraph` function to validate agent existence using metadata
        -   Update `submit` function to POST to `/api/agents/[agentId]/stream`
        -   Implement proper streaming response handling using fetch with ReadableStream
        -   Handle thread ID generation client-side

- [ ] **Task 3.2: Implement Thread ID Generation.**
    -   **File to modify:** `apps/web/src/providers/StreamLocal.tsx`.
    -   **Goal:** Generate unique thread IDs for new conversations.
    -   **Implementation:**
        -   Use existing `uuid` dependency (already in package.json)
        -   Generate UUID when `threadId` is null and call `onThreadId` callback

- [ ] **Task 3.3: Fix Message Duplication and Configuration.**
    -   **File to modify:** `apps/web/src/providers/StreamLocal.tsx`.
    -   **Goal:** Fix message processing and add URL parameter support.
    -   **Implementation:**
        -   Fix message duplication by processing only the final state from stream events
        -   Use `useQueryState` from `nuqs` to manage `assistantId` from URL parameters
        -   Provide sensible default (e.g., `'memory-agent'`)

- [ ] **Task 3.4: Unify Stream Context Type.**
    -   **File to modify:** `apps/web/src/providers/StreamLocal.tsx`.
    -   **Goal:** Ensure type compatibility with StreamExternal.
    -   **Implementation:**
        -   Import types from `@langchain/langgraph-sdk/react`
        -   Match the interface provided by StreamExternal as closely as possible
        -   Use type assertions for simplified local implementations

### Part 4: Add Validation and Testing

- [ ] **Task 4.1: Set Up Testing Framework.**
    -   **File to modify:** `apps/web/package.json`.
    -   **Goal:** Add testing capabilities.
    -   **Implementation:** Add `vitest` and test script following the pattern from `packages/core`

- [ ] **Task 4.2: Create Unit Tests.**
    -   **File to create:** `apps/web/src/providers/StreamLocal.test.tsx`.
    -   **Goal:** Test the refactored StreamLocal functionality.
    -   **Implementation:**
        -   Test agent validation using metadata
        -   Test API call construction
        -   Mock fetch for testing stream handling

### Part 5: Enable Easy Switching Between Providers

- [ ] **Task 5.1: Implement Conditional Provider Export.**
    -   **File to modify:** `apps/web/src/providers/Stream.tsx`.
    -   **Goal:** Export the correct provider based on environment variable.
    -   **Implementation:**
        -   Check `process.env.NEXT_PUBLIC_STREAM_LOCAL`
        -   Export from `./StreamLocal` if `'true'`, otherwise from `./StreamExternal`

## Benefits of This Architecture

1. **Proper Separation of Concerns:** Client-side code only handles UI and API calls, server-side code handles agent execution
2. **No Browser Compatibility Issues:** Server-side packages (MongoDB, Pinecone) never reach the browser bundle
3. **Consistent API Interface:** Both StreamLocal and StreamExternal use similar patterns (API calls)
4. **Scalability:** The local API can be easily extracted to a separate service later
5. **Type Safety:** Proper TypeScript support without bundling server dependencies 