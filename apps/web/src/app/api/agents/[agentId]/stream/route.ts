import { NextRequest, NextResponse } from 'next/server'
import { agentMap } from '@repo/core/src/agents'

interface StreamRequestBody {
  messages: Array<{ content: string; type: string }>
  threadId?: string
  configurable?: Record<string, any>
}

export async function POST(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const { agentId } = params

    // Validate agentId
    if (!agentId || agentId.trim() === '') {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      )
    }

    // Check if agent exists
    if (!agentMap.has(agentId)) {
      return NextResponse.json(
        { error: `Agent '${agentId}' not found` },
        { status: 404 }
      )
    }

    // Parse request body
    let requestBody: StreamRequestBody
    try {
      requestBody = await request.json()
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const { messages, threadId, configurable } = requestBody

    // Validate required fields
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    // Get the agent graph
    const graph = agentMap.get(agentId)
    if (!graph) {
      return NextResponse.json(
        { error: `Agent '${agentId}' not available` },
        { status: 500 }
      )
    }

    // Create streaming response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Prepare the input for the agent
          const input = {
            messages,
            ...(configurable && { configurable })
          }

          // Create stream configuration
          const streamConfig = {
            ...(threadId && { thread_id: threadId }),
            ...(configurable && { configurable })
          }

          // Stream the agent execution
          const agentStream = graph.stream(input, streamConfig)
          
          for await (const chunk of agentStream) {
            // Convert chunk to Server-Sent Events format
            const chunkString = `data: ${JSON.stringify(chunk)}\n\n`
            controller.enqueue(encoder.encode(chunkString))
          }
          
          controller.close()
        } catch (error) {
          console.error('Error in agent stream:', error)
          const errorChunk = `data: ${JSON.stringify({ 
            error: 'Agent execution failed',
            details: error instanceof Error ? error.message : String(error)
          })}\n\n`
          controller.enqueue(encoder.encode(errorChunk))
          controller.close()
        }
      }
    })

    // Return streaming response
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    })

  } catch (error) {
    console.error('Error in stream API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 