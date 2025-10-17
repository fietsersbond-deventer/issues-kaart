import type { WebSocketPeer } from "#nitro";
import { defineWebSocketHandler } from "#nitro";
import type { ExistingIssue } from "~/types/Issue";
import { getEmitter } from "~~/server/utils/getEmitter";

// Store listeners per peer for cleanup
const peerListeners = new WeakMap<
  WebSocketPeer,
  {
    onCreated: (issue: ExistingIssue) => void;
    onModified: (issue: ExistingIssue) => void;
    onDeleted: (issueId: number) => void;
  }
>();

export default defineWebSocketHandler({
  open(peer: WebSocketPeer) {
    console.log(`[ws/notify] Connection opened: ${peer.toString()}`);

    peer.subscribe("notify");

    const emitter = getEmitter();

    // Create listener functions
    const onCreated = (issue: ExistingIssue) => {
      console.log(
        "[ws/notify] Emitting issue:created event for issue ID:",
        issue.id
      );
      peer.publish(
        "notify",
        JSON.stringify({ type: "issue-created", payload: issue })
      );
    };

    const onModified = (issue: ExistingIssue) => {
      console.log(
        "[ws/notify] Emitting issue:modified event for issue ID:",
        issue.id
      );
      peer.publish(
        "notify",
        JSON.stringify({ type: "issue-modified", payload: issue })
      );
    };

    const onDeleted = (issueId: number) => {
      console.log(
        "[ws/notify] Emitting issue:deleted event for issue ID:",
        issueId
      );
      peer.publish(
        "notify",
        JSON.stringify({ type: "issue-deleted", payload: issueId })
      );
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

    // Clean up event listeners for this peer
    const listeners = peerListeners.get(peer);
    if (listeners) {
      const emitter = getEmitter();
      emitter.off("issue:created", listeners.onCreated);
      emitter.off("issue:modified", listeners.onModified);
      emitter.off("issue:deleted", listeners.onDeleted);
      peerListeners.delete(peer);
      console.log(`[ws/notify] Cleaned up listeners for: ${peer.toString()}`);
    }
  },
});
