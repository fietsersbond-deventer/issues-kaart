import type { Peer as WebSocketPeer } from "crossws";

import type { Comment } from "~~/shared/types/Comment";
import type { WebSocketEvents } from "~~/shared/types/WebSocketMessages";
import { getEmitter } from "./getEmitter";

const connectedPeers = new Set<WebSocketPeer>();

/**
 * Creates a type-safe JSON WebSocket message payload for comments.
 */
function createCommentMessage<T extends keyof WebSocketEvents>(
  type: T,
  payload: WebSocketEvents[T],
): string {
  return JSON.stringify({ type, payload });
}

const emitter = getEmitter();

emitter.on(
  "comment:created",
  (comment: Comment & { createdBy: string; createdByUserId: number }) => {
    const message = createCommentMessage("comment-created", comment);
    connectedPeers.forEach((peer) => peer.send(message));
  },
);

emitter.on(
  "comment:modified",
  (comment: Comment & { modifiedBy: string; modifiedByUserId: number }) => {
    const message = createCommentMessage("comment-modified", comment);
    connectedPeers.forEach((peer) => peer.send(message));
  },
);

emitter.on(
  "comment:deleted",
  (data: {
    id: number;
    issue_id: number;
    deletedBy: string;
    deletedByUserId: number;
    soft: boolean;
  }) => {
    const message = createCommentMessage("comment-deleted", data);
    connectedPeers.forEach((peer) => peer.send(message));
  },
);

/**
 * Registers an authenticated WebSocket peer for comment broadcasts.
 */
export function registerCommentBroadcastPeer(peer: WebSocketPeer): void {
  connectedPeers.add(peer);
}

/**
 * Unregisters an authenticated WebSocket peer from comment broadcasts.
 */
export function unregisterCommentBroadcastPeer(peer: WebSocketPeer): void {
  connectedPeers.delete(peer);
}
