import { NextRequest } from "next/server";
import { agentMap } from "@repo/core/src/agents";
import { InMemoryStore } from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph";
import { randomUUID } from "crypto";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    
    // Validate agentId
    if (!agentId || agentId.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'Agent ID is required' }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { messages, threadId, configurable } = body;

    // Validate required fields
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const graph = agentMap.get(agentId);
    if (!graph) {
      return new Response(
        JSON.stringify({ error: `Agent "${agentId}" not found` }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Generate thread ID if not provided
    const finalThreadId = threadId || randomUUID();

    // Set up store and checkpointer based on environment
    // For development: use in-memory stores
    // For production: these would be configured based on environment variables
    const store = new InMemoryStore();
    const checkpointer = new MemorySaver();

    // TODO: In production, configure stores based on environment:
    // - Redis for session storage
    // - MongoDB/PostgreSQL for persistent memory
    // - Vector stores for semantic search
    // Example:
    // const store = process.env.NODE_ENV === 'production' 
    //   ? new RedisStore(process.env.REDIS_URL)
    //   : new InMemoryStore();

    // Prepare configuration with required components
    const graphConfig = {
      configurable: {
        ...configurable,
        userId: finalThreadId,
        model: configurable?.model || "anthropic/claude-3-7-sonnet-latest",
      },
      store,
      checkpointer,
    };

    // Stream the graph execution
    const stream = await graph.stream(
      { messages },
      graphConfig
    );

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Send initial message with thread ID
          const initialMessage = { threadId: finalThreadId };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialMessage)}\n\n`));
          
          for await (const chunk of stream) {
            const data = JSON.stringify(chunk);
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
          controller.enqueue(encoder.encode(`data: {"__end__": true}\n\n`));
          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "x-thread-id": finalThreadId,
      },
    });
  } catch (error) {
    console.error("API error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
} 