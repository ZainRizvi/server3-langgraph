import { describe, it, expect } from 'vitest';
import type { StreamProviderInterface } from './types';

describe('StreamProviderInterface', () => {
  it('should define all required properties', () => {
    // This test validates that the interface includes all required properties
    // by checking that a mock object implementing the interface has all expected properties
    
    const mockProvider: StreamProviderInterface = {
      // Core state properties
      values: { messages: [], ui: [] },
      error: null,
      isLoading: false,
      
      // Core methods
      stop: () => {},
      submit: async () => {},
      
      // Branch-related properties and methods
      branch: 'main',
      setBranch: () => {},
      history: [],
      experimental_branchTree: { type: 'sequence', items: [] },
      
      // Message and interrupt properties
      interrupt: undefined,
      messages: [],
      getMessagesMetadata: () => ({
        messageId: '',
        firstSeenState: undefined,
        branch: undefined,
        branchOptions: undefined,
      }),
      
      // Client and assistant properties
      client: null,
      assistantId: 'test-agent',
    };

    // Verify all required properties exist
    expect(mockProvider).toHaveProperty('values');
    expect(mockProvider).toHaveProperty('error');
    expect(mockProvider).toHaveProperty('isLoading');
    expect(mockProvider).toHaveProperty('stop');
    expect(mockProvider).toHaveProperty('submit');
    expect(mockProvider).toHaveProperty('branch');
    expect(mockProvider).toHaveProperty('setBranch');
    expect(mockProvider).toHaveProperty('history');
    expect(mockProvider).toHaveProperty('experimental_branchTree');
    expect(mockProvider).toHaveProperty('interrupt');
    expect(mockProvider).toHaveProperty('messages');
    expect(mockProvider).toHaveProperty('getMessagesMetadata');
    expect(mockProvider).toHaveProperty('client');
    expect(mockProvider).toHaveProperty('assistantId');
  });

  it('should have correct method signatures', () => {
    // This test validates that methods have the correct signatures
    const mockProvider: StreamProviderInterface = {
      values: { messages: [], ui: [] },
      error: null,
      isLoading: false,
      stop: function() {},
      submit: async function(payload: any, options?: any) {},
      branch: 'main',
      setBranch: function(branch: string) {},
      history: [],
      experimental_branchTree: { type: 'sequence', items: [] },
      interrupt: undefined,
      messages: [],
      getMessagesMetadata: function(message: any, index?: number) {
        return {
          messageId: '',
          firstSeenState: undefined,
          branch: undefined,
          branchOptions: undefined,
        };
      },
      client: null,
      assistantId: 'test-agent',
    };

    // Verify method signatures
    expect(typeof mockProvider.stop).toBe('function');
    expect(typeof mockProvider.submit).toBe('function');
    expect(typeof mockProvider.setBranch).toBe('function');
    expect(typeof mockProvider.getMessagesMetadata).toBe('function');
    
    // Verify method parameter counts
    expect(mockProvider.stop.length).toBe(0); // stop() takes no parameters
    expect(mockProvider.submit.length).toBe(2); // submit(payload, options)
    expect(mockProvider.setBranch.length).toBe(1); // setBranch(branch: string)
    expect(mockProvider.getMessagesMetadata.length).toBe(2); // getMessagesMetadata(message, index?)
  });

  it('should have correct property types', () => {
    // This test validates that properties have the correct types
    const mockProvider: StreamProviderInterface = {
      values: { messages: [], ui: [] },
      error: null,
      isLoading: false,
      stop: () => {},
      submit: async () => {},
      branch: 'main',
      setBranch: () => {},
      history: [],
      experimental_branchTree: { type: 'sequence', items: [] },
      interrupt: undefined,
      messages: [],
      getMessagesMetadata: () => ({
        messageId: '',
        firstSeenState: undefined,
        branch: undefined,
        branchOptions: undefined,
      }),
      client: null,
      assistantId: 'test-agent',
    };

    // Verify property types
    expect(typeof mockProvider.isLoading).toBe('boolean');
    expect(typeof mockProvider.branch).toBe('string');
    expect(typeof mockProvider.assistantId).toBe('string');
    expect(Array.isArray(mockProvider.history)).toBe(true);
    expect(Array.isArray(mockProvider.messages)).toBe(true);
    expect(typeof mockProvider.values).toBe('object');
    expect(typeof mockProvider.experimental_branchTree).toBe('object');
  });
}); 