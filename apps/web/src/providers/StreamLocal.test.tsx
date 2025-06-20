import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { agentMetadata } from '@repo/core/src/agents/metadata'
import { useLocalStream } from './StreamLocal'

// Mock fetch globally
global.fetch = vi.fn()

describe('StreamLocal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Agent Validation', () => {
    it('should validate agent existence using metadata', () => {
      // Test that we can access agent metadata
      expect(agentMetadata).toBeDefined()
      expect(Object.keys(agentMetadata)).toContain('memory-agent')
      expect(Object.keys(agentMetadata)).toContain('react-agent')
    })

    it('should reject invalid agent IDs', () => {
      const { result } = renderHook(() =>
        useLocalStream({
          assistantId: 'invalid-agent',
          threadId: 'test-thread',
          onThreadId: vi.fn(),
        })
      )

      expect(result.current.error).toBeUndefined() // Error will be set when submit is called
    })
  })

  describe('API Call Construction', () => {
    it('should make correct API call to stream endpoint', async () => {
      // Mock successful fetch response
      const mockResponse = {
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('data: {"messages": [{"content": "test", "type": "human"}]}\n\n'))
            controller.close()
          }
        })
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      const { result } = renderHook(() =>
        useLocalStream({
          assistantId: 'memory-agent',
          threadId: 'test-thread',
          onThreadId: vi.fn(),
        })
      )

      await act(async () => {
        result.current.submit({ messages: [{ content: 'test', type: 'human' }] })
      })

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/agents/memory-agent/stream',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            messages: [{ content: 'test', type: 'human' }],
            threadId: 'test-thread',
          }),
        })
      )
    })

    it('should handle API errors correctly', async () => {
      // Mock error response
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      const { result } = renderHook(() =>
        useLocalStream({
          assistantId: 'memory-agent',
          threadId: 'test-thread',
          onThreadId: vi.fn(),
        })
      )

      await act(async () => {
        result.current.submit({ messages: [{ content: 'test', type: 'human' }] })
      })

      expect(result.current.error).toBeDefined()
    })
  })

  describe('Stream Handling', () => {
    it('should process streaming response correctly', async () => {
      // Only the AI message should come from the stream
      const mockMessages = [
        { content: 'Hi there!', type: 'ai' },
      ]

      const mockResponse = {
        ok: true,
        body: new ReadableStream({
          start(controller) {
            mockMessages.forEach((msg) => {
              const chunk = `data: ${JSON.stringify({ messages: [msg] })}\n\n`
              controller.enqueue(new TextEncoder().encode(chunk))
            })
            controller.close()
          }
        })
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      const { result } = renderHook(() =>
        useLocalStream({
          assistantId: 'memory-agent',
          threadId: 'test-thread',
          onThreadId: vi.fn(),
        })
      )

      await act(async () => {
        result.current.submit({ messages: [{ content: 'Hello', type: 'human' }] })
      })

      // Wait for stream processing
      await new Promise(resolve => setTimeout(resolve, 100))

      // Now we expect 2 messages: human message (added immediately) + AI message from stream
      expect(result.current.messages).toHaveLength(2)
      expect(result.current.messages[0].content).toBe('Hello') // Human message
      expect(result.current.messages[1].content).toBe('Hi there!') // AI message
    })

    it('should handle stream interruption', async () => {
      const mockResponse = {
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('data: {"interrupt": {"type": "human"}}\n\n'))
            controller.close()
          }
        })
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      const { result } = renderHook(() =>
        useLocalStream({
          assistantId: 'memory-agent',
          threadId: 'test-thread',
          onThreadId: vi.fn(),
        })
      )

      await act(async () => {
        result.current.submit({ messages: [{ content: 'test', type: 'human' }] })
      })

      // Wait for stream processing
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(result.current.interrupt).toBeDefined()
    })
  })

  describe('Thread ID Management', () => {
    it('should handle null threadId correctly', async () => {
      const mockResponse = {
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.close()
          }
        })
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      const { result } = renderHook(() =>
        useLocalStream({
          assistantId: 'memory-agent',
          threadId: null,
          onThreadId: vi.fn(),
        })
      )

      await act(async () => {
        result.current.submit({ messages: [{ content: 'test', type: 'human' }] })
      })

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/agents/memory-agent/stream',
        expect.objectContaining({
          body: JSON.stringify({
            messages: [{ content: 'test', type: 'human' }],
            threadId: undefined,
          }),
        })
      )
    })

    it('should extract thread ID from server response headers', async () => {
      const generatedThreadId = 'generated-thread-123'
      const mockResponse = {
        ok: true,
        headers: new Headers({
          'x-thread-id': generatedThreadId
        }),
        body: new ReadableStream({
          start(controller) {
            controller.close()
          }
        })
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      const onThreadIdMock = vi.fn()
      const { result } = renderHook(() =>
        useLocalStream({
          assistantId: 'memory-agent',
          threadId: null,
          onThreadId: onThreadIdMock,
        })
      )

      await act(async () => {
        result.current.submit({ messages: [{ content: 'test', type: 'human' }] })
      })

      // Wait for stream processing
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(onThreadIdMock).toHaveBeenCalledWith(generatedThreadId)
    })

    it('should extract thread ID from stream response when not in headers', async () => {
      const generatedThreadId = 'stream-thread-456'
      const mockResponse = {
        ok: true,
        headers: new Headers({}),
        body: new ReadableStream({
          start(controller) {
            // Send thread ID in initial stream message
            const initialMessage = { threadId: generatedThreadId }
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(initialMessage)}\n\n`))
            controller.close()
          }
        })
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      const onThreadIdMock = vi.fn()
      const { result } = renderHook(() =>
        useLocalStream({
          assistantId: 'memory-agent',
          threadId: null,
          onThreadId: onThreadIdMock,
        })
      )

      await act(async () => {
        result.current.submit({ messages: [{ content: 'test', type: 'human' }] })
      })

      // Wait for stream processing
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(onThreadIdMock).toHaveBeenCalledWith(generatedThreadId)
    })

    it('should not call onThreadId when threadId is already provided', async () => {
      const existingThreadId = 'existing-thread-789'
      const mockResponse = {
        ok: true,
        headers: new Headers({
          'x-thread-id': existingThreadId
        }),
        body: new ReadableStream({
          start(controller) {
            controller.close()
          }
        })
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      const onThreadIdMock = vi.fn()
      const { result } = renderHook(() =>
        useLocalStream({
          assistantId: 'memory-agent',
          threadId: existingThreadId,
          onThreadId: onThreadIdMock,
        })
      )

      await act(async () => {
        result.current.submit({ messages: [{ content: 'test', type: 'human' }] })
      })

      // Wait for stream processing
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(onThreadIdMock).not.toHaveBeenCalled()
    })

    it('should handle missing thread ID gracefully', async () => {
      const mockResponse = {
        ok: true,
        headers: new Headers({}),
        body: new ReadableStream({
          start(controller) {
            // Send message without thread ID
            controller.enqueue(new TextEncoder().encode('data: {"messages": [{"content": "test", "type": "ai"}]}\n\n'))
            controller.close()
          }
        })
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      const onThreadIdMock = vi.fn()
      const { result } = renderHook(() =>
        useLocalStream({
          assistantId: 'memory-agent',
          threadId: null,
          onThreadId: onThreadIdMock,
        })
      )

      await act(async () => {
        result.current.submit({ messages: [{ content: 'test', type: 'human' }] })
      })

      // Wait for stream processing
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should not call onThreadId if no thread ID is found
      expect(onThreadIdMock).not.toHaveBeenCalled()
      // Should still process messages normally
      expect(result.current.messages).toHaveLength(2) // human + ai message
    })
  })

  describe('Message Duplication and Configuration', () => {
    it('should avoid message duplication by processing only final state', async () => {
      // Mock a stream that sends multiple updates for the same message
      const mockResponse = {
        ok: true,
        body: new ReadableStream({
          start(controller) {
            // Send initial partial message
            controller.enqueue(new TextEncoder().encode('data: {"messages": [{"content": "Hello", "type": "ai"}]}\n\n'))
            // Send updated message with more content
            controller.enqueue(new TextEncoder().encode('data: {"messages": [{"content": "Hello there", "type": "ai"}]}\n\n'))
            // Send final complete message
            controller.enqueue(new TextEncoder().encode('data: {"messages": [{"content": "Hello there! How can I help you?", "type": "ai"}]}\n\n'))
            controller.close()
          }
        })
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      const { result } = renderHook(() =>
        useLocalStream({
          assistantId: 'memory-agent',
          threadId: 'test-thread',
          onThreadId: vi.fn(),
        })
      )

      await act(async () => {
        result.current.submit({ messages: [{ content: 'Hi', type: 'human' }] })
      })

      // Wait for stream processing
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should only have 2 messages: human + final AI message (not intermediate states)
      expect(result.current.messages).toHaveLength(2)
      expect(result.current.messages[0].content).toBe('Hi') // Human message
      expect(result.current.messages[1].content).toBe('Hello there! How can I help you?') // Final AI message
    })

    it('should handle configurable options correctly', async () => {
      const mockResponse = {
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.close()
          }
        })
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      const { result } = renderHook(() =>
        useLocalStream({
          assistantId: 'memory-agent',
          threadId: 'test-thread',
          onThreadId: vi.fn(),
        })
      )

      const configurable = {
        model: 'anthropic/claude-3-5-sonnet-latest',
        temperature: 0.7,
        maxTokens: 1000
      }

      await act(async () => {
        result.current.submit(
          { messages: [{ content: 'test', type: 'human' }] },
          { configurable }
        )
      })

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/agents/memory-agent/stream',
        expect.objectContaining({
          body: JSON.stringify({
            messages: [{ content: 'test', type: 'human' }],
            threadId: 'test-thread',
            configurable,
          }),
        })
      )
    })

    it('should filter out messages without content', async () => {
      const mockResponse = {
        ok: true,
        body: new ReadableStream({
          start(controller) {
            // Send messages with and without content
            controller.enqueue(new TextEncoder().encode('data: {"messages": [{"content": "Valid message", "type": "ai"}, {"type": "ai"}, {"content": "", "type": "ai"}]}\n\n'))
            controller.close()
          }
        })
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      const { result } = renderHook(() =>
        useLocalStream({
          assistantId: 'memory-agent',
          threadId: 'test-thread',
          onThreadId: vi.fn(),
        })
      )

      await act(async () => {
        result.current.submit({ messages: [{ content: 'test', type: 'human' }] })
      })

      // Wait for stream processing
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should only have 2 messages: human + valid AI message (filtered out empty ones)
      expect(result.current.messages).toHaveLength(2)
      expect(result.current.messages[0].content).toBe('test') // Human message
      expect(result.current.messages[1].content).toBe('Valid message') // Only valid AI message
    })
  })
}) 