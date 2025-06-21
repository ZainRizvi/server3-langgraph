import { type Message } from "@langchain/langgraph-sdk";
import { type UIMessage, type RemoveUIMessage } from "@langchain/langgraph-sdk/react-ui";
import { type HumanInterrupt } from "@langchain/langgraph/prebuilt";
import { useStream } from "@langchain/langgraph-sdk/react";

/**
 * State type for stream providers
 */
export type StateType = { 
  messages: Message[]; 
  ui?: UIMessage[] 
};

/**
 * Update type for stream providers
 */
export type UpdateType = {
  messages?: Message[] | Message | string;
  ui?: (UIMessage | RemoveUIMessage)[] | UIMessage | RemoveUIMessage;
};

/**
 * Custom event type for stream providers
 */
export type CustomEventType = UIMessage | RemoveUIMessage;

/**
 * Message metadata returned by getMessagesMetadata
 */
export interface MessageMetadata {
  messageId: string;
  /**
   * The first seen state for this message. The type is 'any' for compatibility with the SDK,
   * as the SDK does not export a ThreadState type. This may be refined in the future.
   */
  firstSeenState: any;
  branch: string;
  branchOptions: string[];
}

/**
 * Branch tree structure for experimental branch functionality
 */
export interface BranchTree {
  type: 'sequence';
  items: any[];
}

/**
 * Interrupt structure for handling interruptions
 */
export interface InterruptInfo {
  when: 'now';
  value: HumanInterrupt;
}

/**
 * Submit options for stream providers
 */
export interface SubmitOptions {
  configurable?: any;
  checkpoint?: any;
  streamMode?: string[];
  optimisticValues?: (prev: StateType) => StateType;
}

/**
 * Submit payload for stream providers
 */
export interface SubmitPayload {
  messages?: Message[];
  [key: string]: any;
}

/**
 * Shared interface that both StreamLocal and StreamExternal must implement.
 * This interface extends the return type of useStream from the SDK to ensure
 * compatibility between the two providers and the SDK.
 */
export interface StreamProviderInterface extends Omit<ReturnType<typeof useStream<StateType, { UpdateType: UpdateType; CustomEventType: CustomEventType }>>, 'getMessagesMetadata'> {
  /**
   * Get metadata for a specific message
   * @param message - The message to get metadata for
   * @param index - Optional index of the message
   * @returns Metadata about the message including branch info
   */
  getMessagesMetadata: (message: Message, index?: number) => MessageMetadata;

  /**
   * LangGraph client instance (may be null for local implementation)
   */
  client: any;

  /**
   * ID of the current assistant/graph
   */
  assistantId: string;
} 