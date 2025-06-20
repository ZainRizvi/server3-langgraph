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
  })
}) 