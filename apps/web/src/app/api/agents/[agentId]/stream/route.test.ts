import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'
import { NextRequest } from 'next/server'

// Mock the core agent map
vi.mock('@repo/core/src/agents', () => ({
  agentMap: new Map([
    ['memory-agent', {
      stream: vi.fn().mockImplementation(() => {
        return (async function* () {
          yield { messages: [{ content: 'Test response', type: 'ai' }] }
        })()
      })
    }],
    ['react-agent', {
      stream: vi.fn().mockImplementation(() => {
        return (async function* () {
          yield { messages: [{ content: 'React response', type: 'ai' }] }
        })()
      })
    }]
  ])
}))

describe('/api/agents/[agentId]/stream', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST', () => {
    it('should return 400 if agentId is missing', async () => {
      const request = new NextRequest('http://localhost/api/agents//stream', {
        method: 'POST',
        body: JSON.stringify({ messages: [] })
      })
      
      const response = await POST(request, { params: { agentId: '' } })
      expect(response.status).toBe(400)
    })

    it('should return 404 if agent does not exist', async () => {
      const request = new NextRequest('http://localhost/api/agents/nonexistent/stream', {
        method: 'POST',
        body: JSON.stringify({ messages: [] })
      })
      
      const response = await POST(request, { params: { agentId: 'nonexistent' } })
      expect(response.status).toBe(404)
    })

    it('should return 400 if request body is invalid', async () => {
      const request = new NextRequest('http://localhost/api/agents/memory-agent/stream', {
        method: 'POST',
        body: 'invalid json'
      })
      
      const response = await POST(request, { params: { agentId: 'memory-agent' } })
      expect(response.status).toBe(400)
    })

    it('should return streaming response for valid agent and request', async () => {
      const request = new NextRequest('http://localhost/api/agents/memory-agent/stream', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ content: 'Hello', type: 'human' }],
          threadId: 'test-thread-123'
        })
      })
      
      const response = await POST(request, { params: { agentId: 'memory-agent' } })
      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toContain('text/event-stream')
    })

    it('should accept optional configurable parameters', async () => {
      const request = new NextRequest('http://localhost/api/agents/memory-agent/stream', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ content: 'Hello', type: 'human' }],
          threadId: 'test-thread-123',
          configurable: { userId: 'user123' }
        })
      })
      
      const response = await POST(request, { params: { agentId: 'memory-agent' } })
      expect(response.status).toBe(200)
    })

    it('should handle missing threadId gracefully', async () => {
      const request = new NextRequest('http://localhost/api/agents/memory-agent/stream', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ content: 'Hello', type: 'human' }]
        })
      })
      
      const response = await POST(request, { params: { agentId: 'memory-agent' } })
      expect(response.status).toBe(200)
    })

    it('should generate thread ID when not provided', async () => {
      const request = new NextRequest('http://localhost/api/agents/memory-agent/stream', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ content: 'Hello', type: 'human' }]
        })
      })
      
      const response = await POST(request, { params: { agentId: 'memory-agent' } })
      expect(response.status).toBe(200)
      
      // Check that a thread ID header is included
      const threadId = response.headers.get('x-thread-id')
      expect(threadId).toBeDefined()
      expect(threadId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    })

    it('should use provided thread ID when available', async () => {
      const providedThreadId = 'existing-thread-123'
      const request = new NextRequest('http://localhost/api/agents/memory-agent/stream', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ content: 'Hello', type: 'human' }],
          threadId: providedThreadId
        })
      })
      
      const response = await POST(request, { params: { agentId: 'memory-agent' } })
      expect(response.status).toBe(200)
      
      // Check that the provided thread ID is returned
      const threadId = response.headers.get('x-thread-id')
      expect(threadId).toBe(providedThreadId)
    })

    it('should include thread ID in stream response for new conversations', async () => {
      const request = new NextRequest('http://localhost/api/agents/memory-agent/stream', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ content: 'Hello', type: 'human' }]
        })
      })
      
      const response = await POST(request, { params: { agentId: 'memory-agent' } })
      expect(response.status).toBe(200)
      
      // Read the stream to check for thread ID in initial message
      const reader = response.body?.getReader()
      expect(reader).toBeDefined()
      
      if (reader) {
        const decoder = new TextDecoder()
        const { value } = await reader.read()
        const chunk = decoder.decode(value)
        
        // Look for thread ID in the stream data
        const lines = chunk.split('\n')
        let foundThreadId = false
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.threadId) {
                expect(data.threadId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
                foundThreadId = true
                break
              }
            } catch (e) {
              // Ignore parse errors for non-JSON lines
            }
          }
        }
        
        expect(foundThreadId).toBe(true)
        reader.releaseLock()
      }
    })
  })
}) 