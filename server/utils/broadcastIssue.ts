import type { Peer as WebSocketPeer } from "crossws";

import type { Issue } from "~~/shared/types/Issue";
import type { WebSocketEvents } from "~~/shared/types/WebSocketMessages";
import { getEmitter } from "./getEmitter";

const connectedPeers = new Set<WebSocketPeer>();

/**
 * Creates a type-safe JSON WebSocket message payload for issues.
 */
function createIssueMessage<T extends keyof WebSocketEvents>(
  type: T,
  payload: WebSocketEvents[T],
): string {
  return JSON.stringify({ type, payload });
}

const emitter = getEmitter();

emitter.on(
  "issue:created",
  (issue: Issue & { createdBy: string; createdByUserId: number }) => {
    console.log(
      "[ws/notify] Broadcasting issue:created event for issue ID:",
      issue.id,
    );
    const message = createIssueMessage("issue-created", issue);
    connectedPeers.forEach((peer) => peer.send(message));
  },
);

emitter.on(
  "issue:modified",
  (issue: Issue & { modifiedBy: string; modifiedByUserId: number }) => {
    console.log(
      "[ws/notify] Broadcasting issue:modified event for issue ID:",
      issue.id,
    );
    const message = createIssueMessage("issue-modified", issue);
    connectedPeers.forEach((peer) => peer.send(message));
  },
);

emitter.on(
  "issue:deleted",
  (data: {
    id: number;
    title: string;
    deletedBy: string;
    deletedByUserId: number;
  }) => {
    console.log(
      "[ws/notify] Broadcasting issue:deleted event for issue ID:",
      data.id,
      "deleted by:",
      data.deletedBy,
    );
    const message = createIssueMessage("issue-deleted", data);
    connectedPeers.forEach((peer) => peer.send(message));
  },
);

/**
 * Registers a public WebSocket peer for issue broadcasts.
 */
export function registerIssueBroadcastPeer(peer: WebSocketPeer): void {
  connectedPeers.add(peer);
}

/**
 * Unregisters a public WebSocket peer from issue broadcasts.
 */
export function unregisterIssueBroadcastPeer(peer: WebSocketPeer): void {
  connectedPeers.delete(peer);
}
