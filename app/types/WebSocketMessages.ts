// Shared WebSocket message types for both client and server

import type { Issue } from "./Issue";

export interface OnlineUser {
  peerId: string;
  username: string;
  name: string | null;
  userId: number;
  connectedAt: number;
}

// Define payload types for each message type
export interface WebSocketEvents {
  // Lock/editing messages
  lockIssue: {
    issueId: number;
    username: string;
    displayName?: string;
  };
  unlockIssue: {
    issueId: number;
    username: string;
    displayName?: string;
  };
  clearMyLocks: {
    username: string;
    displayName?: string;
  };
  "editing-status": Record<
    string,
    {
      peer: string;
      username: string;
      displayName: string;
    }
  >;

  // Presence messages
  "user-online": {
    username: string;
    name?: string | null;
    userId: number;
  };
  "user-offline": Record<string, never>; // Empty payload
  "online-users": OnlineUser[];
  "peer-connected": string; // peer ID

  // Issue notification messages
  "issue-created": Issue & { createdBy: string; createdByUserId: number };
  "issue-modified": Issue & { modifiedBy: string; modifiedByUserId: number };
  "issue-deleted": {
    id: number;
    title: string;
    deletedBy: string;
    deletedByUserId: number;
  };
}

// Generic message structure
export interface WebSocketMessage<
  T extends keyof WebSocketEvents = keyof WebSocketEvents
> {
  type: T;
  payload: WebSocketEvents[T];
}

// Specific message types (for backwards compatibility and convenience)
export type LockMessage =
  | WebSocketMessage<"lockIssue">
  | WebSocketMessage<"unlockIssue">
  | WebSocketMessage<"clearMyLocks">;

export type OnlineUserMessage =
  | WebSocketMessage<"user-online">
  | WebSocketMessage<"user-offline">;

export type EditingStatusMessage = WebSocketMessage<"editing-status">;
export type OnlineUsersMessage = WebSocketMessage<"online-users">;
export type PeerConnectedMessage = WebSocketMessage<"peer-connected">;
export type IssueCreatedMessage = WebSocketMessage<"issue-created">;
export type IssueModifiedMessage = WebSocketMessage<"issue-modified">;
export type IssueDeletedMessage = WebSocketMessage<"issue-deleted">;

// Helper functions for type-safe message creation
export function createWebSocketMessage<T extends keyof WebSocketEvents>(
  type: T,
  payload: WebSocketEvents[T]
): WebSocketMessage<T> {
  return { type, payload };
}

// Union type for all possible messages
export type AnyWebSocketMessage = {
  [K in keyof WebSocketEvents]: WebSocketMessage<K>;
}[keyof WebSocketEvents];

// Helper type guards with proper typing
export function isLockMessage(message: unknown): message is LockMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    ["lockIssue", "unlockIssue", "clearMyLocks"].includes(
      (message as Record<string, unknown>).type as string
    )
  );
}

export function isOnlineUserMessage(
  message: unknown
): message is OnlineUserMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    ["user-online", "user-offline"].includes(
      (message as Record<string, unknown>).type as string
    )
  );
}

export function isIssueMessage(
  message: unknown
): message is IssueCreatedMessage | IssueModifiedMessage | IssueDeletedMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    ["issue-created", "issue-modified", "issue-deleted"].includes(
      (message as Record<string, unknown>).type as string
    )
  );
}

// Type-safe message checker
export function isMessageOfType<T extends keyof WebSocketEvents>(
  message: unknown,
  type: T
): message is WebSocketMessage<T> {
  return (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    (message as Record<string, unknown>).type === type
  );
}
