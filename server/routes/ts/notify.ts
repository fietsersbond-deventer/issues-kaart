import type { WebSocketPeer } from "#nitro";
import { defineWebSocketHandler } from "#nitro";
import type { Issue } from "~/types/Issue";
import type { WebSocketEvents } from "~/types/WebSocketMessages";
import { getEmitter } from "~~/server/utils/getEmitter";

// Helper function to create type-safe WebSocket messages
function createNotifyMessage<T extends keyof WebSocketEvents>(
  type: T,
  payload: WebSocketEvents[T]
): string {
  return JSON.stringify({ type, payload });
}

// Store listeners per peer for cleanup
const peerListeners = new WeakMap<
  WebSocketPeer,
  {
    onCreated: (issue: Issue & { createdBy: string; createdByUserId: number }) => void;
    onModified: (issue: Issue & { modifiedBy: string; modifiedByUserId: number }) => void;
    onDeleted: (data: { id: number; title: string; deletedBy: string; deletedByUserId: number }) => void;
  }
>();

// Keep track of all connected peers for broadcasting
const connectedPeers = new Set<WebSocketPeer>();

export default defineWebSocketHandler({
  open(peer: WebSocketPeer) {
    console.log(`[ws/notify] Connection opened: ${peer.toString()}`);
    connectedPeers.add(peer);

    const emitter = getEmitter();

    // Create listener functions
    const onCreated = (issue: Issue & { createdBy: string; createdByUserId: number }) => {
      console.log(
        "[ws/notify] Emitting issue:created event for issue ID:",
        issue.id
      );
      const message = createNotifyMessage("issue-created", issue);
      connectedPeers.forEach((p) => p.send(message));
    };

    const onModified = (issue: Issue & { modifiedBy: string; modifiedByUserId: number }) => {
      console.log(
        "[ws/notify] Emitting issue:modified event for issue ID:",
        issue.id
      );
      const message = createNotifyMessage("issue-modified", issue);
      connectedPeers.forEach((p) => p.send(message));
    };

    const onDeleted = (data: { id: number; title: string; deletedBy: string; deletedByUserId: number }) => {
      console.log(
        "[ws/notify] Emitting issue:deleted event for issue ID:",
        data.id,
        "deleted by:",
        data.deletedBy
      );
      const message = createNotifyMessage("issue-deleted", data);
      connectedPeers.forEach((p) => p.send(message));
    };

    // Store listeners for this peer
    peerListeners.set(peer, { onCreated, onModified, onDeleted });

    // Add event listeners
    emitter.on("issue:created", onCreated);
    emitter.on("issue:modified", onModified);
    emitter.on("issue:deleted", onDeleted);
  },

  close(peer: WebSocketPeer) {
    console.log(`[ws/notify] Connection closed: ${peer.toString()}`);
    connectedPeers.delete(peer);

    // Clean up event listeners for this peer
    const listeners = peerListeners.get(peer);
    if (listeners) {
      const emitter = getEmitter();
      emitter.off("issue:created", listeners.onCreated);
      emitter.off("issue:modified", listeners.onModified);
      emitter.off("issue:deleted", listeners.onDeleted);
      peerListeners.delete(peer);
    }
  },
});
