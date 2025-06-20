// This file is auto-generated. Do not edit manually.
// Server-side agent map with full graph implementations

import { graph as memoryAgentGraph } from './memory-agent/graph';
import { graph as reactAgentGraph } from './react-agent/graph';
import { graph as researchAgentGraph } from './research-agent/retrieval-graph/graph';
import { graph as retrievalAgentGraph } from './retrieval-agent/graph';

// Map of agent names to their graph implementations
export const agentMap = new Map<string, any>([
  ['memory-agent', memoryAgentGraph],
  ['react-agent', reactAgentGraph],
  ['research-agent', researchAgentGraph],
  ['retrieval-agent', retrievalAgentGraph],
]);
