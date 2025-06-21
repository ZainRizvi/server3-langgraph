import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLocalStream } from './StreamLocal';
import type { StreamProviderInterface } from './types';

// Mock the agent metadata
vi.mock('@repo/core/src/agents/metadata', () => ({
  agentMetadata: {
    'memory-agent': { name: 'Memory Agent', description: 'Test agent' },
    'research-agent': { name: 'Research Agent', description: 'Test agent' },
  },
}));

// Mock fetch
global.fetch = vi.fn();

describe('Interface Validation Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('StreamLocal Interface Compliance', () => {
    it('should implement all required properties from StreamProviderInterface', () => {
      const { result } = renderHook(() => 
        useLocalStream({
          assistantId: 'memory-agent',
          threadId: null,
          onThreadId: vi.fn(),
        })
      );

      const streamContext = result.current;

      // Test all required properties exist
      expect(streamContext).toHaveProperty('values');
      expect(streamContext).toHaveProperty('error');
      expect(streamContext).toHaveProperty('isLoading');
      expect(streamContext).toHaveProperty('stop');
      expect(streamContext).toHaveProperty('submit');
      expect(streamContext).toHaveProperty('branch');
      expect(streamContext).toHaveProperty('setBranch');
      expect(streamContext).toHaveProperty('history');
      expect(streamContext).toHaveProperty('experimental_branchTree');
      expect(streamContext).toHaveProperty('interrupt');
      expect(streamContext).toHaveProperty('messages');
      expect(streamContext).toHaveProperty('getMessagesMetadata');
      expect(streamContext).toHaveProperty('client');
      expect(streamContext).toHaveProperty('assistantId');
    });

    it('should have correct property types matching StreamProviderInterface', () => {
      const { result } = renderHook(() => 
        useLocalStream({
          assistantId: 'memory-agent',
          threadId: null,
          onThreadId: vi.fn(),
        })
      );

      const streamContext = result.current;

      // Test property types
      expect(typeof streamContext.isLoading).toBe('boolean');
      expect(typeof streamContext.branch).toBe('string');
      expect(typeof streamContext.assistantId).toBe('string');
      expect(Array.isArray(streamContext.history)).toBe(true);
      expect(Array.isArray(streamContext.messages)).toBe(true);
      expect(typeof streamContext.values).toBe('object');
      expect(typeof streamContext.experimental_branchTree).toBe('object');
      expect(streamContext.error === null || streamContext.error === undefined || streamContext.error instanceof Error).toBe(true);
    });

    it('should have correct method signatures matching StreamProviderInterface', () => {
      const { result } = renderHook(() => 
        useLocalStream({
          assistantId: 'memory-agent',
          threadId: null,
          onThreadId: vi.fn(),
        })
      );

      const streamContext = result.current;

      // Test method signatures
      expect(typeof streamContext.stop).toBe('function');
      expect(typeof streamContext.submit).toBe('function');
      expect(typeof streamContext.setBranch).toBe('function');
      expect(typeof streamContext.getMessagesMetadata).toBe('function');
      
      // Test method parameter counts
      expect(streamContext.stop.length).toBe(0);
      expect(streamContext.submit.length).toBe(2); // submit(payload, options)
      expect(streamContext.setBranch.length).toBe(1); // setBranch(branch: string)
      expect(streamContext.getMessagesMetadata.length).toBe(2); // getMessagesMetadata(message, index?)
    });

    it('should return correct message metadata structure', () => {
      const { result } = renderHook(() => 
        useLocalStream({
          assistantId: 'memory-agent',
          threadId: null,
          onThreadId: vi.fn(),
        })
      );

      const mockMessage = { id: 'test-id', type: 'human' as const, content: 'test' };
      const metadata = result.current.getMessagesMetadata(mockMessage);

      // Verify metadata structure matches interface
      expect(metadata).toBeDefined();
      expect(metadata).toHaveProperty('messageId');
      expect(metadata).toHaveProperty('firstSeenState');
      expect(metadata).toHaveProperty('branch');
      expect(metadata).toHaveProperty('branchOptions');
      
      expect(typeof metadata.messageId).toBe('string');
      expect(metadata.branchOptions === undefined || Array.isArray(metadata.branchOptions)).toBe(true);
    });
  });

  describe('SDK Compatibility Tests', () => {
    it('should be assignable to StreamProviderInterface type', () => {
      const { result } = renderHook(() => 
        useLocalStream({
          assistantId: 'memory-agent',
          threadId: null,
          onThreadId: vi.fn(),
        })
      );

      // This test will fail at compile time if StreamLocal doesn't implement StreamProviderInterface
      const streamContext: StreamProviderInterface = result.current;
      
      // Verify we can access all required properties without type errors
      expect(streamContext.values).toBeDefined();
      expect(streamContext.messages).toBeDefined();
      expect(streamContext.isLoading).toBeDefined();
      expect(streamContext.error === null || streamContext.error === undefined || streamContext.error instanceof Error).toBe(true);
    });

    it('should be compatible with useStream return type', () => {
      const { result } = renderHook(() => 
        useLocalStream({
          assistantId: 'memory-agent',
          threadId: null,
          onThreadId: vi.fn(),
        })
      );

      // Test that StreamLocal can be used where useStream return type is expected
      // This simulates what UI components would do
      const streamContext = result.current;
      
      // Test core functionality that UI components expect
      expect(() => streamContext.stop()).not.toThrow();
      expect(() => streamContext.setBranch('test-branch')).not.toThrow();
      expect(() => streamContext.getMessagesMetadata({ id: 'test', type: 'human' as const, content: 'test' })).not.toThrow();
      
      // Test state access that UI components need
      expect(streamContext.values).toBeDefined();
      expect(streamContext.messages).toBeDefined();
      expect(streamContext.isLoading).toBeDefined();
    });

    it('should handle state updates like the SDK', () => {
      const { result } = renderHook(() => 
        useLocalStream({
          assistantId: 'memory-agent',
          threadId: null,
          onThreadId: vi.fn(),
        })
      );

      const streamContext = result.current;

      // Test that state properties are reactive and accessible
      expect(streamContext.values).toEqual({ messages: [], ui: [] });
      expect(streamContext.messages).toEqual([]);
      expect(streamContext.isLoading).toBe(false);
      expect(streamContext.error).toBeUndefined();
    });
  });

  describe('Interface Contract Enforcement', () => {
    it('should fail if required properties are missing', () => {
      const { result } = renderHook(() => 
        useLocalStream({
          assistantId: 'memory-agent',
          threadId: null,
          onThreadId: vi.fn(),
        })
      );

      const streamContext = result.current;

      // These tests will fail if any required property is missing
      expect(streamContext).toHaveProperty('values');
      expect(streamContext).toHaveProperty('error');
      expect(streamContext).toHaveProperty('isLoading');
      expect(streamContext).toHaveProperty('stop');
      expect(streamContext).toHaveProperty('submit');
      expect(streamContext).toHaveProperty('branch');
      expect(streamContext).toHaveProperty('setBranch');
      expect(streamContext).toHaveProperty('history');
      expect(streamContext).toHaveProperty('experimental_branchTree');
      expect(streamContext).toHaveProperty('interrupt');
      expect(streamContext).toHaveProperty('messages');
      expect(streamContext).toHaveProperty('getMessagesMetadata');
      expect(streamContext).toHaveProperty('client');
      expect(streamContext).toHaveProperty('assistantId');
    });

    it('should fail if method signatures change', () => {
      const { result } = renderHook(() => 
        useLocalStream({
          assistantId: 'memory-agent',
          threadId: null,
          onThreadId: vi.fn(),
        })
      );

      const streamContext = result.current;

      // These tests will fail if method signatures change
      expect(typeof streamContext.stop).toBe('function');
      expect(typeof streamContext.submit).toBe('function');
      expect(typeof streamContext.setBranch).toBe('function');
      expect(typeof streamContext.getMessagesMetadata).toBe('function');
      
      // Test parameter counts - these will fail if method signatures change
      expect(streamContext.stop.length).toBe(0);
      expect(streamContext.submit.length).toBe(2);
      expect(streamContext.setBranch.length).toBe(1);
      expect(streamContext.getMessagesMetadata.length).toBe(2);
    });

    it('should fail if return types change', () => {
      const { result } = renderHook(() => 
        useLocalStream({
          assistantId: 'memory-agent',
          threadId: null,
          onThreadId: vi.fn(),
        })
      );

      const streamContext = result.current;

      // Test that getMessagesMetadata returns the expected structure
      const mockMessage = { id: 'test-id', type: 'human' as const, content: 'test' };
      const metadata = streamContext.getMessagesMetadata(mockMessage);

      expect(metadata).toHaveProperty('messageId');
      expect(metadata).toHaveProperty('firstSeenState');
      expect(metadata).toHaveProperty('branch');
      expect(metadata).toHaveProperty('branchOptions');
      
      expect(typeof metadata.messageId).toBe('string');
    });
  });

  describe('Runtime Behavior Validation', () => {
    it('should handle method calls without throwing errors', () => {
      const { result } = renderHook(() => 
        useLocalStream({
          assistantId: 'memory-agent',
          threadId: null,
          onThreadId: vi.fn(),
        })
      );

      const streamContext = result.current;

      // Test that all methods can be called without throwing
      expect(() => streamContext.stop()).not.toThrow();
      expect(() => streamContext.setBranch('test-branch')).not.toThrow();
      expect(() => streamContext.getMessagesMetadata({ id: 'test', type: 'human' as const, content: 'test' })).not.toThrow();
    });

    it('should maintain consistent state structure', () => {
      const { result } = renderHook(() => 
        useLocalStream({
          assistantId: 'memory-agent',
          threadId: null,
          onThreadId: vi.fn(),
        })
      );

      const streamContext = result.current;

      // Test that state structure remains consistent
      expect(streamContext.values).toHaveProperty('messages');
      expect(streamContext.values).toHaveProperty('ui');
      expect(Array.isArray(streamContext.values.messages)).toBe(true);
      expect(streamContext.values.ui === undefined || Array.isArray(streamContext.values.ui)).toBe(true);
    });
  });
}); 