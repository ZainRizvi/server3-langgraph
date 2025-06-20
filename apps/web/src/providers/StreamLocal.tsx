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
import { last } from "lodash";
import { agentMap } from "@repo/core/src/agents";

// Loads a graph from the agentMap based on the assistantId
async function getGraph(assistantId: string): Promise<any> {
  if (!agentMap.has(assistantId)) {
    throw new Error(`Agent "${assistantId}" not found. Available agents: ${Array.from(agentMap.keys()).join(", ")}`);
  }
  
  return agentMap.get(assistantId);
}

// --- preserved interfaces ---

export type StateType = { messages: Message[]; ui?: UIMessage[] };

// This is the interface our new useLocalStream hook will return, matching the original.
export type StreamContextType = {
  messages: Message[];
  isLoading: boolean;
  error: Error | undefined;
  values: StateType;
  interrupt: HumanInterrupt | HumanInterrupt[] | undefined;
  submit: (payload: any, options?: any) => void;
  getMessagesMetadata: (message: Message) => any;
  setBranch: (checkpoint: Checkpoint) => void;
  stop: () => void;
};

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
function useLocalStream({
  assistantId,
  threadId,
  onThreadId,
}: LocalStreamProps): StreamContextType {
  const [values, setValues] = useState<StateType>({ messages: [] });
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
        const graph = await getGraph(assistantId);

        const streamConfig = {
          configurable: {
            thread_id: threadId,
            ...options?.configurable,
          },
          ...options?.checkpoint,
        };

        const stream = graph.stream(payload, streamConfig);

        for await (const event of stream) {
          if (abortControllerRef.current.signal.aborted) break;

          const eventKeys = Object.keys(event);
          if (event["__end__"]) {
            // Stop processing if we've hit the end of the graph
            break;
          }
          if (eventKeys.some((key) => event[key]?.messages)) {
            setValues((prev) => ({
              ...prev,
              messages: [...(prev.messages ?? []), ...eventKeys.map(k => event[k].messages).flat()].filter(m => m.content),
            }));
          } else if (event.interrupt) {
            setInterrupt(event.interrupt);
          }
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
    [assistantId, threadId, isLoading],
  );

  const getMessagesMetadata = useCallback((message: Message) => {
    // This is a placeholder. A real implementation would need to track
    // checkpoints and branches, which is complex to do locally without a
    // persistent checkpointer.
    return {};
  }, []);

  const setBranch = useCallback((checkpoint: Checkpoint) => {
      // Placeholder for branch switching logic.
      // This would involve re-running the stream from a given checkpoint.
      console.log("Switching branch to checkpoint:", checkpoint);
  }, []);

  return {
    messages: values.messages,
    isLoading,
    error,
    values,
    interrupt,
    submit,
    getMessagesMetadata,
    setBranch,
    stop,
  };
}

// --- provider component ---

export const StreamProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  // For now, we'll hardcode the assistantId. In a real app, this
  // would likely come from the URL or a selection component.
  // TODO: Add a selection component for the assistantId
  const [assistantId] = useState("memory-agent");
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