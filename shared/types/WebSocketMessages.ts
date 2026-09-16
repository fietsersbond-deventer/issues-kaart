import type { Issue } from "./Issue";

export interface OnlineUser {
  peerId: string;
  username: string;
  name: string | null;
  userId: number;
  connectedAt: number;
}

export interface WebSocketEvents {
  lockIssue: { issueId: number };
  unlockIssue: { issueId: number };
  clearMyLocks: Record<string, never>;
  "editing-status": Record<
    string,
    {
      peer: string;
      username: string;
      displayName: string;
      lockedAt: number;
    }
  >;
  "user-online": Record<string, never>;
  "user-offline": Record<string, never>;
  "online-users": OnlineUser[];
  "peer-connected": string;
  "issue-created": Issue & { createdBy: string; createdByUserId: number };
  "issue-modified": Issue & { modifiedBy: string; modifiedByUserId: number };
  "issue-deleted": {
    id: number;
    title: string;
    deletedBy: string;
    deletedByUserId: number;
  };
}

export interface WebSocketMessage<
  T extends keyof WebSocketEvents = keyof WebSocketEvents,
> {
  type: T;
  payload: WebSocketEvents[T];
}

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

export function createWebSocketMessage<T extends keyof WebSocketEvents>(
  type: T,
  payload: WebSocketEvents[T],
): WebSocketMessage<T> {
  return { type, payload };
}

export type AnyWebSocketMessage = {
  [K in keyof WebSocketEvents]: WebSocketMessage<K>;
}[keyof WebSocketEvents];

export function isLockMessage(message: unknown): message is LockMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    ["lockIssue", "unlockIssue", "clearMyLocks"].includes(
      (message as Record<string, unknown>).type as string,
    )
  );
}

export function isOnlineUserMessage(
  message: unknown,
): message is OnlineUserMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    ["user-online", "user-offline"].includes(
      (message as Record<string, unknown>).type as string,
    )
  );
}

export function isIssueMessage(
  message: unknown,
): message is IssueCreatedMessage | IssueModifiedMessage | IssueDeletedMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    ["issue-created", "issue-modified", "issue-deleted"].includes(
      (message as Record<string, unknown>).type as string,
    )
  );
}

export function isMessageOfType<T extends keyof WebSocketEvents>(
  message: unknown,
  type: T,
): message is WebSocketMessage<T> {
  return (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    (message as Record<string, unknown>).type === type
  );
}
