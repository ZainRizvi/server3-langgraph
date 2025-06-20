import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useCallback,
  useRef,
} from "react";
import {
  type Message,
  type Checkpoint,
} from "@langchain/langgraph-sdk";
import { type HumanInterrupt } from "@langchain/langgraph/prebuilt";
import {
  uiMessageReducer,
  type UIMessage,
  type RemoveUIMessage,
} from "@langchain/langgraph-sdk/react-ui";
import { useStream } from "@langchain/langgraph-sdk/react";
import { last } from "lodash";
import { agentMetadata } from "@repo/core/src/agents/metadata";
import { useQueryState } from "nuqs";

// Validate agent existence using metadata
function validateAgent(assistantId: string): void {
  if (!agentMetadata[assistantId]) {
    throw new Error(`Agent "${assistantId}" not found. Available agents: ${Object.keys(agentMetadata).join(", ")}`);
  }
}

// Transform LangChain messages to expected format
function transformLangChainMessage(langChainMessage: any): any {
  // Handle LangChain message format
  if (langChainMessage.lc && langChainMessage.kwargs) {
    return {
      content: langChainMessage.kwargs.content,
      type: langChainMessage.id?.[2]?.toLowerCase() || 'ai', // Extract type from id array
      ...langChainMessage.kwargs.additional_kwargs
    };
  }
  
  // Handle simple message format
  if (langChainMessage.content && langChainMessage.type) {
    return langChainMessage;
  }
  
  // Fallback
  return langChainMessage;
}

// Helper function to merge messages intelligently
function mergeMessages(existingMessages: Message[], newMessages: Message[]): Message[] {
  if (!newMessages.length) return existingMessages;
  
  // Filter out messages without content
  const validNewMessages = newMessages.filter(m => m.content);
  if (!validNewMessages.length) return existingMessages;
  
  // If we have new AI messages, replace the last AI message or append
  const aiMessages = validNewMessages.filter(m => m.type === 'ai');
  if (aiMessages.length > 0) {
    // Find the last AI message in existing messages
    const lastAiIndex = existingMessages.findLastIndex(m => m.type === 'ai');
    
    if (lastAiIndex >= 0) {
      // Replace the last AI message with the latest one
      const updatedMessages = [...existingMessages];
      updatedMessages[lastAiIndex] = aiMessages[aiMessages.length - 1];
      return updatedMessages;
    } else {
      // No existing AI message, append the new one
      return [...existingMessages, aiMessages[aiMessages.length - 1]];
    }
  }
  
  // For non-AI messages, just append them
  return [...existingMessages, ...validNewMessages];
}

// --- preserved interfaces ---

export type StateType = { messages: Message[]; ui?: UIMessage[] };

// Use the same type as StreamExternal for consistency
type StreamContextType = ReturnType<typeof useStream<
  StateType,
  {
    UpdateType: {
      messages?: Message[] | Message | string;
      ui?: (UIMessage | RemoveUIMessage)[] | UIMessage | RemoveUIMessage;
    };
    CustomEventType: UIMessage | RemoveUIMessage;
  }
>>;

// --- react context ---

const StreamContext = createContext<StreamContextType | undefined>(undefined);

export const useStreamContext = (): StreamContextType => {
  const context = useContext(StreamContext);
  if (context === undefined) {
    throw new Error("useStreamContext must be used within a StreamProvider");
  }
  return context;
};

// --- custom hook implementation ---

type LocalStreamProps = {
  assistantId: string;
  threadId: string | null;
  onThreadId: (threadId: string) => void;
};

// Our replacement for the original `useStream` hook.
export function useLocalStream({
  assistantId,
  threadId,
  onThreadId,
}: LocalStreamProps): StreamContextType {
  const [values, setValues] = useState<StateType>({ messages: [], ui: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [interrupt, setInterrupt] = useState<
    HumanInterrupt | HumanInterrupt[] | undefined
  >(undefined);

  const abortControllerRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  }, []);

  const submit = useCallback(
    async (payload: any, options?: any) => {
      if (isLoading) {
        // Prevent submissions while a stream is in progress.
        return;
      }

      setIsLoading(true);
      setError(undefined);
      setInterrupt(undefined);
      abortControllerRef.current = new AbortController();

      try {
        // Validate agent exists
        validateAgent(assistantId);

        // Add human messages to state immediately so they appear in UI
        if (payload.messages && payload.messages.length > 0) {
          setValues((prev) => ({
            ...prev,
            messages: [...(prev.messages ?? []), ...payload.messages],
          }));
        }

        // Prepare request body
        const requestBody = {
          messages: payload.messages || [],
          threadId: threadId || undefined,
          configurable: options?.configurable,
        };

        // Make API call to stream endpoint
        const response = await fetch(`/api/agents/${assistantId}/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        if (!response.body) {
          throw new Error('No response body received');
        }

        // --- Thread ID extraction logic ---
        let threadIdHandled = false;
        if (!threadId) {
          // 1. Try to get from response headers
          const headerThreadId = response.headers?.get('x-thread-id');
          if (headerThreadId) {
            onThreadId(headerThreadId);
            threadIdHandled = true;
          }
        }

        // Process streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let firstSSEChecked = false;

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));

                  // --- Thread ID from first SSE message if not in headers ---
                  if (!threadId && !threadIdHandled && !firstSSEChecked) {
                    if (data.threadId) {
                      onThreadId(data.threadId);
                      threadIdHandled = true;
                    }
                    firstSSEChecked = true;
                  }

                  if (data.error) {
                    throw new Error(data.error);
                  }

                  // Handle different response structures from the API
                  let messagesToAdd: any[] = [];

                  // Check for direct messages array
                  if (data.messages && Array.isArray(data.messages)) {
                    messagesToAdd = data.messages;
                  }
                  // Check for messages nested under different keys (like callModel, storeMemory, etc.)
                  else {
                    for (const key of Object.keys(data)) {
                      if (data[key] && data[key].messages && Array.isArray(data[key].messages)) {
                        messagesToAdd = [...messagesToAdd, ...data[key].messages];
                      }
                    }
                  }

                  if (messagesToAdd.length > 0) {
                    // Transform LangChain messages to expected format
                    const transformedMessages = messagesToAdd.map(transformLangChainMessage);

                    setValues((prev) => ({
                      ...prev,
                      messages: mergeMessages(prev.messages, transformedMessages),
                    }));
                  }

                  if (data.interrupt) {
                    setInterrupt(data.interrupt);
                  }

                  if (data.__end__) {
                    break;
                  }
                } catch (parseError) {
                  console.warn('Failed to parse SSE data:', parseError);
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      } catch (e) {
        if (e instanceof Error && e.name !== "AbortError") {
          setError(e as Error);
        }
      } finally {
        if (!abortControllerRef.current?.signal.aborted) {
          setIsLoading(false);
          abortControllerRef.current = null;
        }
      }
    },
    [assistantId, threadId, isLoading, onThreadId],
  );

  const getMessagesMetadata = useCallback((message: Message, index?: number) => {
    // This is a placeholder. A real implementation would need to track
    // checkpoints and branches, which is complex to do locally without a
    // persistent checkpointer.
    return {
      messageId: message.id || '',
      firstSeenState: undefined,
      branch: undefined,
      branchOptions: undefined,
    };
  }, []);

  const setBranch = useCallback((branch: string) => {
      // Placeholder for branch switching logic.
      // This would involve re-running the stream from a given checkpoint.
      console.log("Switching branch to:", branch);
  }, []);

  return {
    values,
    error,
    isLoading,
    stop,
    submit,
    branch: 'main', // Default branch name
    setBranch,
    history: [], // Empty history for local implementation
    experimental_branchTree: { type: 'sequence', items: [] }, // Empty tree
    interrupt: interrupt ? { when: 'now', value: interrupt } : undefined,
    messages: values.messages,
    getMessagesMetadata,
    client: null as any, // Placeholder client
    assistantId,
  };
}

// --- provider component ---

export const StreamProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  // Use URL parameter for assistantId with sensible default
  const [assistantId] = useQueryState('assistantId', {
    defaultValue: 'memory-agent',
    parse: (value) => {
      // Validate the assistantId from URL
      if (value && agentMetadata[value]) {
        return value;
      }
      return 'memory-agent'; // Fallback to default
    }
  });
  
  const [threadId, setThreadId] = useState<string | null>(null);

  const streamValue = useLocalStream({
    assistantId,
    threadId,
    onThreadId: setThreadId,
  });

  return (
    <StreamContext.Provider value={streamValue}>
      {children}
    </StreamContext.Provider>
  );
}; 