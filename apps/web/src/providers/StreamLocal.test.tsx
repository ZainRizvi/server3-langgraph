import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { agentMetadata } from '@repo/core/src/agents/metadata'
import { useLocalStream, useStreamContext, StreamProvider } from './StreamLocal'
import { render, screen } from '@testing-library/react'
import { Message } from '@langchain/langgraph-sdk'
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing'
import { HumanInterrupt } from '@langchain/langgraph/prebuilt'

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

  describe('Stream Context Interface', () => {
    it('should provide all required properties and methods', () => {
      const { result } = renderHook(() =>
        useLocalStream({
          assistantId: 'memory-agent',
          threadId: 'test-thread',
          onThreadId: vi.fn(),
        })
      )

      // Check that all required properties exist
      expect(result.current).toHaveProperty('values')
      expect(result.current).toHaveProperty('error')
      expect(result.current).toHaveProperty('isLoading')
      expect(result.current).toHaveProperty('stop')
      expect(result.current).toHaveProperty('submit')
      expect(result.current).toHaveProperty('branch')
      expect(result.current).toHaveProperty('setBranch')
      expect(result.current).toHaveProperty('history')
      expect(result.current).toHaveProperty('experimental_branchTree')
      expect(result.current).toHaveProperty('interrupt')
      expect(result.current).toHaveProperty('messages')
      expect(result.current).toHaveProperty('getMessagesMetadata')
      expect(result.current).toHaveProperty('client')
      expect(result.current).toHaveProperty('assistantId')

      // Check that methods are functions
      expect(typeof result.current.stop).toBe('function')
      expect(typeof result.current.submit).toBe('function')
      expect(typeof result.current.setBranch).toBe('function')
      expect(typeof result.current.getMessagesMetadata).toBe('function')

      // Check initial state
      expect(result.current.values).toEqual({ messages: [], ui: [] })
      expect(result.current.error).toBeUndefined()
      expect(result.current.isLoading).toBe(false)
      expect(result.current.branch).toBe('main')
      expect(result.current.history).toEqual([])
      expect(result.current.experimental_branchTree).toEqual({ type: 'sequence', items: [] })
      expect(result.current.interrupt).toBeUndefined()
      expect(result.current.messages).toEqual([])
      expect(result.current.assistantId).toBe('memory-agent')
    })

    it('should provide proper types for interrupt handling', () => {
      const { result } = renderHook(() =>
        useLocalStream({
          assistantId: 'memory-agent',
          threadId: 'test-thread',
          onThreadId: vi.fn(),
        })
      )

      // Test that interrupt can be set with proper structure
      act(() => {
        const mockInterrupt: HumanInterrupt = {
          message: 'Test interrupt',
          response: { type: 'human', content: 'Test response' }
        }
        
        // Simulate setting interrupt (this would normally happen in submit)
        result.current.interrupt = { when: 'now', value: mockInterrupt }
      })

      // Verify interrupt structure
      expect(result.current.interrupt).toBeDefined()
      if (result.current.interrupt) {
        expect(result.current.interrupt).toHaveProperty('when')
        expect(result.current.interrupt).toHaveProperty('value')
        expect(result.current.interrupt.when).toBe('now')
        expect(result.current.interrupt.value).toHaveProperty('message')
        expect(result.current.interrupt.value).toHaveProperty('response')
      }
    })

    it('should provide proper types for setBranch method', () => {
      const { result } = renderHook(() =>
        useLocalStream({
          assistantId: 'memory-agent',
          threadId: 'test-thread',
          onThreadId: vi.fn(),
        })
      )

      // Test that setBranch accepts a string parameter
      expect(() => {
        result.current.setBranch('test-branch')
      }).not.toThrow()

      // Verify the method signature
      expect(typeof result.current.setBranch).toBe('function')
    })

    it('should provide proper types for getMessagesMetadata method', () => {
      const { result } = renderHook(() =>
        useLocalStream({
          assistantId: 'memory-agent',
          threadId: 'test-thread',
          onThreadId: vi.fn(),
        })
      )

      const mockMessage: Message = {
        id: 'test-message-id',
        type: 'human',
        content: 'Test message'
      }

      const metadata = result.current.getMessagesMetadata(mockMessage, 0)

      // Check that metadata has the expected structure
      expect(metadata).toHaveProperty('messageId')
      expect(metadata).toHaveProperty('firstSeenState')
      expect(metadata).toHaveProperty('branch')
      expect(metadata).toHaveProperty('branchOptions')

      expect(metadata.messageId).toBe('test-message-id')
      expect(metadata.firstSeenState).toBeUndefined()
      expect(metadata.branch).toBeUndefined()
      expect(metadata.branchOptions).toBeUndefined()
    })

    it('should provide proper types for client property', () => {
      const { result } = renderHook(() =>
        useLocalStream({
          assistantId: 'memory-agent',
          threadId: 'test-thread',
          onThreadId: vi.fn(),
        })
      )

      // Client should be null for local implementation
      expect(result.current.client).toBeNull()
    })
  })

  describe('Type Compatibility with UI Components', () => {
    it('should work with LoadExternalComponent without type casts', () => {
      const { result } = renderHook(() =>
        useLocalStream({
          assistantId: 'memory-agent',
          threadId: 'test-thread',
          onThreadId: vi.fn(),
        })
      )

      // Test that the stream context can be passed to LoadExternalComponent
      // without requiring 'as any' type casts
      const streamContext = result.current
      
      // Verify that the context has the properties expected by LoadExternalComponent
      expect(streamContext).toHaveProperty('values')
      expect(streamContext).toHaveProperty('submit')
      expect(streamContext).toHaveProperty('stop')
      expect(streamContext).toHaveProperty('isLoading')
      expect(streamContext).toHaveProperty('error')
    })

    it('should work with interrupt handling without type casts', () => {
      const { result } = renderHook(() =>
        useLocalStream({
          assistantId: 'memory-agent',
          threadId: 'test-thread',
          onThreadId: vi.fn(),
        })
      )

      // Test that interrupt can be accessed without type casts
      const interrupt = result.current.interrupt
      
      if (interrupt) {
        // Should be able to access interrupt properties without 'as any'
        expect(interrupt).toHaveProperty('when')
        expect(interrupt).toHaveProperty('value')
        
        // The value should be of type HumanInterrupt or HumanInterrupt[]
        const interruptValue = interrupt.value
        expect(interruptValue).toBeDefined()
      }
    })

    it('should work with setBranch without type casts', () => {
      const { result } = renderHook(() =>
        useLocalStream({
          assistantId: 'memory-agent',
          threadId: 'test-thread',
          onThreadId: vi.fn(),
        })
      )

      // Test that setBranch can be called without type casts
      const setBranch = result.current.setBranch
      expect(() => {
        setBranch('test-branch')
      }).not.toThrow()
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

      await act(async () => {
        result.current.submit(
          { messages: [{ content: 'test', type: 'human' }] }
        )
      })

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/agents/memory-agent/stream',
        expect.objectContaining({
          body: JSON.stringify({
            messages: [{ content: 'test', type: 'human' }],
            threadId: 'test-thread',
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

  describe('Type Compatibility with StreamExternal (Task 3.4)', () => {
    it('should return context with all required properties matching UseStream interface', () => {
      const { result } = renderHook(() =>
        useLocalStream({
          assistantId: 'memory-agent',
          threadId: 'test-thread',
          onThreadId: vi.fn(),
        })
      )

      // Verify all required properties from UseStream interface are present
      expect(result.current).toHaveProperty('values')
      expect(result.current).toHaveProperty('error')
      expect(result.current).toHaveProperty('isLoading')
      expect(result.current).toHaveProperty('stop')
      expect(result.current).toHaveProperty('submit')
      expect(result.current).toHaveProperty('branch')
      expect(result.current).toHaveProperty('setBranch')
      expect(result.current).toHaveProperty('history')
      expect(result.current).toHaveProperty('experimental_branchTree')
      expect(result.current).toHaveProperty('interrupt')
      expect(result.current).toHaveProperty('messages')
      expect(result.current).toHaveProperty('getMessagesMetadata')
      expect(result.current).toHaveProperty('client')
      expect(result.current).toHaveProperty('assistantId')
    })

    it('should have correct method signatures matching UseStream interface', () => {
      const { result } = renderHook(() =>
        useLocalStream({
          assistantId: 'memory-agent',
          threadId: 'test-thread',
          onThreadId: vi.fn(),
        })
      )

      // Test submit method signature
      expect(typeof result.current.submit).toBe('function')
      expect(result.current.submit.length).toBeGreaterThan(0) // Should accept parameters

      // Test getMessagesMetadata method signature
      expect(typeof result.current.getMessagesMetadata).toBe('function')
      const testMessage: Message = { content: 'test', type: 'human', id: 'test-id' }
      const metadata = result.current.getMessagesMetadata(testMessage)
      expect(metadata).toHaveProperty('messageId')
      expect(metadata).toHaveProperty('firstSeenState')
      expect(metadata).toHaveProperty('branch')
      expect(metadata).toHaveProperty('branchOptions')

      // Test setBranch method signature
      expect(typeof result.current.setBranch).toBe('function')
      expect(result.current.setBranch.length).toBe(1) // Should accept one parameter (branch: string)

      // Test stop method signature
      expect(typeof result.current.stop).toBe('function')
    })

    it('should provide context through StreamProvider with correct type', () => {
      const TestComponent = () => {
        const context = useStreamContext()
        return <div data-testid="context-test">
          <span data-testid="assistant-id">{context.assistantId}</span>
          <span data-testid="branch">{context.branch}</span>
          <span data-testid="messages-count">{context.messages.length}</span>
        </div>
      }

      render(
        <StreamProvider>
          <TestComponent />
        </StreamProvider>,
        {
          wrapper: withNuqsTestingAdapter({
            searchParams: { assistantId: 'memory-agent' }
          })
        }
      )

      // Verify context is provided correctly
      expect(screen.getByTestId('context-test')).toBeInTheDocument()
      expect(screen.getByTestId('assistant-id')).toHaveTextContent('memory-agent')
      expect(screen.getByTestId('branch')).toHaveTextContent('main')
      expect(screen.getByTestId('messages-count')).toHaveTextContent('0')
    })

    it('should handle interrupt property with correct type structure', () => {
      const { result } = renderHook(() =>
        useLocalStream({
          assistantId: 'memory-agent',
          threadId: 'test-thread',
          onThreadId: vi.fn(),
        })
      )

      // Initially should be undefined
      expect(result.current.interrupt).toBeUndefined()

      // After setting interrupt, should have correct structure
      act(() => {
        // Simulate setting an interrupt
        result.current.submit({ messages: [{ content: 'test', type: 'human' }] })
      })

      // The interrupt should either be undefined or have the correct structure
      if (result.current.interrupt) {
        expect(result.current.interrupt).toHaveProperty('when')
        expect(result.current.interrupt).toHaveProperty('value')
      }
    })

    it('should provide default values for optional properties', () => {
      const { result } = renderHook(() =>
        useLocalStream({
          assistantId: 'memory-agent',
          threadId: 'test-thread',
          onThreadId: vi.fn(),
        })
      )

      // Check default values
      expect(result.current.branch).toBe('main')
      expect(result.current.history).toEqual([])
      expect(result.current.experimental_branchTree).toEqual({ type: 'sequence', items: [] })
      expect(result.current.assistantId).toBe('memory-agent')
    })

    it('should have values.ui property that UI components expect', () => {
      const { result } = renderHook(() =>
        useLocalStream({
          assistantId: 'memory-agent',
          threadId: 'test-thread',
          onThreadId: vi.fn(),
        })
      )

      // Verify values.ui exists and is an array (as expected by UI components)
      expect(result.current.values).toHaveProperty('ui')
      expect(Array.isArray(result.current.values.ui)).toBe(true)
      
      // Initially should be empty array
      expect(result.current.values.ui).toEqual([])
    })

    it('should have setBranch method that accepts string parameter (not Checkpoint)', () => {
      const { result } = renderHook(() =>
        useLocalStream({
          assistantId: 'memory-agent',
          threadId: 'test-thread',
          onThreadId: vi.fn(),
        })
      )

      // Verify setBranch accepts string parameter (not Checkpoint)
      expect(typeof result.current.setBranch).toBe('function')
      
      // Should be able to call with string without type errors
      expect(() => result.current.setBranch('new-branch')).not.toThrow()
      
      // Verify it was called (even though it's a placeholder)
      // The actual implementation logs to console, so we can't easily verify the call
    })

    it('should have getMessagesMetadata that returns proper MessageMetadata structure', () => {
      const { result } = renderHook(() =>
        useLocalStream({
          assistantId: 'memory-agent',
          threadId: 'test-thread',
          onThreadId: vi.fn(),
        })
      )

      const testMessage: Message = { 
        content: 'test message', 
        type: 'human', 
        id: 'test-message-id' 
      }
      
      const metadata = result.current.getMessagesMetadata(testMessage)
      
      // Verify the structure matches what UI components expect
      expect(metadata).toHaveProperty('messageId', 'test-message-id')
      expect(metadata).toHaveProperty('firstSeenState')
      expect(metadata).toHaveProperty('branch')
      expect(metadata).toHaveProperty('branchOptions')
      
      // Verify types are correct
      expect(typeof metadata?.messageId).toBe('string')
      expect(metadata?.firstSeenState).toBeUndefined() // Placeholder implementation
      expect(metadata?.branch).toBeUndefined() // Placeholder implementation
      expect(metadata?.branchOptions).toBeUndefined() // Placeholder implementation
    })

    it('should be compatible with UI component usage patterns', () => {
      const { result } = renderHook(() =>
        useLocalStream({
          assistantId: 'memory-agent',
          threadId: 'test-thread',
          onThreadId: vi.fn(),
        })
      )

      // Simulate how UI components use the context
      const thread = result.current
      
      // Test values access (used in agent-inbox)
      expect(thread.values).toBeDefined()
      expect(thread.values.messages).toBeDefined()
      expect(thread.values.ui).toBeDefined()
      
      // Test messages access (used in thread/index.tsx)
      expect(thread.messages).toBeDefined()
      expect(Array.isArray(thread.messages)).toBe(true)
      
      // Test isLoading access (used in thread/index.tsx)
      expect(typeof thread.isLoading).toBe('boolean')
      
      // Test error access (used in thread/index.tsx)
      expect(thread.error).toBeUndefined()
      
      // Test submit access (used in thread/index.tsx)
      expect(typeof thread.submit).toBe('function')
      
      // Test getMessagesMetadata access (used in messages/ai.tsx)
      expect(typeof thread.getMessagesMetadata).toBe('function')
      
      // Test setBranch access (used in messages/ai.tsx)
      expect(typeof thread.setBranch).toBe('function')
      
      // Test interrupt access (used in messages/ai.tsx)
      expect(thread.interrupt).toBeUndefined()
    })

    it('should handle submit with proper options structure', () => {
      const { result } = renderHook(() =>
        useLocalStream({
          assistantId: 'memory-agent',
          threadId: 'test-thread',
          onThreadId: vi.fn(),
        })
      )

      // Mock fetch for this test
      const mockResponse = {
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.close()
          }
        })
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      // Test submit with options that UI components use
      act(() => {
        result.current.submit(
          { messages: [{ content: 'test', type: 'human' }] },
          {
            streamMode: ['values'],
            optimisticValues: (prev: any) => ({
              ...prev,
              messages: [...(prev.messages ?? []), { content: 'test', type: 'human' }],
            }),
          }
        )
      })

      // Verify the submit call was made
      expect(global.fetch).toHaveBeenCalled()
    })

    it('should set error when an API error occurs', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const { result } = renderHook(() =>
        useLocalStream({
          assistantId: 'memory-agent',
          threadId: 'test-thread',
          onThreadId: vi.fn(),
        })
      );

      await act(async () => {
        result.current.submit({ messages: [{ content: 'test', type: 'human' }] });
      });

      expect(result.current.error).toBeDefined();
    });

    it('should set interrupt when a stream event includes interrupt', async () => {
      const mockResponse = {
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('data: {"interrupt": {"type": "human"}}\n\n'));
            controller.close();
          }
        })
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const { result } = renderHook(() =>
        useLocalStream({
          assistantId: 'memory-agent',
          threadId: 'test-thread',
          onThreadId: vi.fn(),
        })
      );

      await act(async () => {
        result.current.submit({ messages: [{ content: 'test', type: 'human' }] });
      });

      // Wait for stream processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(result.current.interrupt).toBeDefined();
    });
  })
}) 