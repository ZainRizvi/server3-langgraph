# LangGraph Local Streaming Refactor Plan

This document outlines the plan to refactor the streaming implementation in the web application. The primary goal is to enable seamless switching between a local streaming provider (`StreamLocal.tsx`) and an external one (`StreamExternal.tsx`) using an environment variable. This involves creating a proper client-server architecture and automating the discovery of available LangGraph agents.

## Context for LLM

The project has two streaming providers for the agent chat interface:

1.  `apps/web/src/providers/StreamExternal.tsx`: Connects to a remote LangGraph server via its API. It's feature-complete but requires a separate running server.
2.  `apps/web/src/providers/StreamLocal.tsx`: Should provide a local alternative that runs agents on the same server as the web app, but currently has a fundamental design flaw - it tries to import and run server-side packages (MongoDB, Pinecone, etc.) directly in the browser.

The core issue is architectural: **StreamLocal should not import server-side packages directly**. Instead, it should make API calls to the web app's backend, which then executes the agents server-side and streams the results back.

## Testing

- Always write unit tests before starting any tasks.
- After completing each task, run the following commands from root to ensure everything is still working:
  - `npm install`
  - `npm run build`
  - `npm run test` 
- If the tests pass, mark the task as complete in PLAN.md


## Plan
### Part 1: Create Dual Agent Exports

This part creates two different exports from the core package: one for client-side use (agent metadata only) and one for server-side use (full agent implementations).

- [x] **Task 1.1: Modify Agent Generation Script.**
    -   **File to modify:** `packages/core/scripts/generate-agent-exports.mjs`.
    -   **Goal:** Generate two separate index files for different use cases.
    -   **Implementation:**
        -   Generate `packages/core/src/agents/index.ts` - Full agent map with actual graph imports (server-side only)
        -   Generate `packages/core/src/agents/metadata.ts` - Agent metadata only (client-safe)
        -   The metadata file should export:
            -   `agentMetadata: Record<string, { name: string, description?: string }>` - Agent info without implementations (agent names can be derived using `Object.keys(agentMetadata)`)
        -   Update package.json exports to include both files



### Special Part A: Add Validation and Testing

- [x] **Task A.1: Set Up Testing Framework.**
    -   **File to modify:** `apps/web/package.json`.
    -   **Goal:** Add testing capabilities.
    -   **Implementation:** Add `vitest` and test script following the pattern from `packages/core`.  Ensure the structure lets you run tests against both client and server side code


- [x] **Task A.2: Extend Testing Framework.**
    -   **File to modify:** `package.json`.
    -   **Goal:** Add testing capabilities.
    -   **Implementation:** Make it so that when `npm run test` is invoked from the root folder, all packages with a test script have their tests executed.

### Part 2: Create Local Agent API Endpoints

This part adds API routes to the web app that can execute agents server-side.
For each part, first consider what unit tests should be added to verify that the functionality works, add those unit tests (which are expected to fail at first) and then implement the task and ensure those tests now pass. A TDD approach.

- [x] **Task 2.1: Create Agent List API Route.**
    -   **File to create:** `apps/web/src/app/api/agents/route.ts`.
    -   **Goal:** Provide an endpoint to list available agents.
    -   **Implementation:**
        -   Import `agentMetadata` from `@repo/core/agents/metadata` 
        -   Return JSON list of available agents with their metadata

- [x] **Task 2.2: Create Agent Stream API Route.**
    -   **File to create:** `apps/web/src/app/api/agents/[agentId]/stream/route.ts`.
    -   **Goal:** Create a streaming API endpoint that executes agents server-side.
    -   **Implementation:**
        -   Import the full `agentMap` from `@repo/core/agents` (server-side import)
        -   Accept POST requests with `{ messages, threadId?, configurable? }`
        -   Stream agent execution results back to client using Next.js streaming response
        -   Handle errors appropriately and return proper HTTP status codes

- [x] **Task 2.3: Implement Backend Thread ID Generation.**
    -   **File to modify:** `apps/web/src/app/api/agents/[agentId]/stream/route.ts`.
    -   **Goal:** Generate unique thread IDs on the server side when not provided.
    -   **Implementation:**
        -   Use `crypto.randomUUID()` or a similar server-side UUID generation method
        -   Generate thread ID when `threadId` is null/undefined in the request
        -   Include the generated thread ID in the stream response headers or initial message
        -   Ensure thread ID is consistent throughout the conversation session

### Part 3: Refactor StreamLocal to Use API

This part updates StreamLocal to make API calls instead of importing server-side packages.

- [x] **Task 3.1: Update StreamLocal to Use Fetch API.**
    -   **File to modify:** `apps/web/src/providers/StreamLocal.tsx`.
    -   **Goal:** Replace direct agent imports with API calls.
    -   **Implementation:**
        -   Remove all imports of server-side packages
        -   Import `agentMetadata` from `@repo/core/agents/metadata` for validation
        -   Update `getGraph` function to validate agent existence using metadata
        -   Update `submit` function to POST to `/api/agents/[agentId]/stream`
        -   Implement proper streaming response handling using fetch with ReadableStream
        -   Handle thread ID generation client-side

- [x] **Task 3.2: Update StreamLocal to Handle Backend-Generated Thread IDs.**
    -   **File to modify:** `apps/web/src/providers/StreamLocal.tsx`.
    -   **Goal:** Remove client-side thread ID generation and handle server-generated IDs.
    -   **Implementation:**
        -   Remove client-side UUID generation logic
        -   Extract thread ID from server response (headers or initial stream message)
        -   Call `onThreadId` callback with the server-generated thread ID
        -   Ensure proper error handling if thread ID extraction fails

- [x] **Task 3.3: Fix Message Duplication and Configuration.**
    -   **File to modify:** `apps/web/src/providers/StreamLocal.tsx`.
    -   **Goal:** Fix message processing and add URL parameter support.
    -   **Implementation:**
        -   Fix message duplication by processing only the final state from stream events
        -   Use `useQueryState` from `nuqs` to manage `assistantId` from URL parameters
        -   Provide sensible default (e.g., `'memory-agent'`)

- [x] **Task 3.4: Unify Stream Context Type.**
    -   **File to modify:** `apps/web/src/providers/StreamLocal.tsx`.
    -   **Goal:** Ensure type compatibility with StreamExternal.
    -   **Implementation:**
        -   Import types from `@langchain/langgraph-sdk/react`
        -   Match the interface provided by StreamExternal as closely as possible
        -   Use type assertions for simplified local implementations

- [x] **Task 3.5: Unify Stream Context Types and Remove Temporary Casts.**
    -   **Files to modify:** `apps/web/src/providers/StreamLocal.tsx`, `apps/web/src/components/thread/messages/ai.tsx`, `apps/web/src/components/thread/messages/human.tsx`
    -   **Goal:** Ensure that the StreamLocal context matches the type/interface expected by StreamExternal and the UI components, and remove all temporary `as any` type casts added for build compatibility.
    -   **Implementation:**
        -   Update StreamLocal to provide all required fields and methods.
        -   Refactor UI components to use the unified type without any casts.
        -   Remove all `as any` usages related to stream context.

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