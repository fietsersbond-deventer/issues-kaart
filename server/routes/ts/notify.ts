import type { WebSocketPeer } from "#nitro";
import { defineWebSocketHandler } from "#nitro";
import type { Issue } from "~~/shared/types/Issue";
import type { WebSocketEvents } from "~~/shared/types/WebSocketMessages";
import { getEmitter } from "~~/server/utils/getEmitter";

// Helper function to create type-safe WebSocket messages
function createNotifyMessage<T extends keyof WebSocketEvents>(
  type: T,
  payload: WebSocketEvents[T],
): string {
  return JSON.stringify({ type, payload });
}

// Keep track of all connected peers for broadcasting
const connectedPeers = new Set<WebSocketPeer>();

// Register event listeners ONCE at module level (not per peer)
// This prevents N² message broadcasts with N connected peers
const emitter = getEmitter();

emitter.on(
  "issue:created",
  (issue: Issue & { createdBy: string; createdByUserId: number }) => {
    console.log(
      "[ws/notify] Broadcasting issue:created event for issue ID:",
      issue.id,
    );
    const message = createNotifyMessage("issue-created", issue);
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
    const message = createNotifyMessage("issue-modified", issue);
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
    const message = createNotifyMessage("issue-deleted", data);
    connectedPeers.forEach((peer) => peer.send(message));
  },
);

export default defineWebSocketHandler({
  open(peer: WebSocketPeer) {
    console.log(`[ws/notify] Connection opened: ${peer.toString()}`);
    connectedPeers.add(peer);
  },

  close(peer: WebSocketPeer) {
    console.log(`[ws/notify] Connection closed: ${peer.toString()}`);
    connectedPeers.delete(peer);
  },
});
