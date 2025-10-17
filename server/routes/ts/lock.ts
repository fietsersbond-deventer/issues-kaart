/* eslint-disable @typescript-eslint/no-dynamic-delete */
import type { WebSocketPeer } from "#nitro";
import { defineWebSocketHandler } from "#nitro";

// Store editing status: { issueId: { username: string | undefined } }
type PeerInfo = {
  peer: string;
  username: string | undefined;
};
const editingStatus: Record<string, PeerInfo | undefined> = {};

export default defineWebSocketHandler({
  open(peer: WebSocketPeer) {
    console.log(`[ws/lock] Connection opened: ${peer.toString()}`);

    // Subscribe to the 'lockIssue' event
    peer.subscribe("lockIssue");
    peer.subscribe("unlockIssue");

    // Ensure the peer subscribes to the 'editing-status' event
    peer.subscribe("editing-status");
    console.log(`[ws/lock] Subscribed to 'editing-status': ${peer.toString()}`);

    peer.send(
      JSON.stringify({ type: "editing-status", payload: editingStatus })
    );
  },

  message(peer: WebSocketPeer, message: string) {
    try {
      const data = JSON.parse(message.toString()); // Ensure message is a string
      console.log("[ws/lock] Parsed message:", data);

      if (data.type === "lockIssue" || data.type === "unlockIssue") {
        const { issueId, username } = data;
        const isEditing = data.type === "lockIssue";

        if (editingStatus[Number(issueId)]) {
          if (editingStatus[Number(issueId)]!.peer !== peer.toString()) {
            console.log("[ws/lock] Peer is not the editor:", peer.toString());
            return;
          }
        }

        if (isEditing) {
          editingStatus[Number(issueId)] = { peer: peer.toString(), username };
        } else {
          delete editingStatus[Number(issueId)];
        }

        // Broadcast the updated editing status to all peers
        peer.publish(
          "editing-status",
          JSON.stringify({ type: "editing-status", payload: editingStatus })
        );
        console.log("[ws/lock] Broadcasted editing status:", editingStatus);

        // Send the updated editing status back to the sender
        peer.send(
          JSON.stringify({ type: "editing-status", payload: editingStatus })
        );
      } else {
        console.log("[ws/lock] Unknown message type:", data.type);
      }
    } catch (error) {
      console.error("[ws/lock] Failed to parse message:", error);
    }
  },

  close(peer: WebSocketPeer) {
    console.log(`[ws/lock] Connection closed: ${peer.toString()}`);

    // Clean up editing status for disconnected peers
    setTimeout(() => {
      // Remove all entries associated with the disconnected peer
      Object.keys(editingStatus).forEach((issueId) => {
        if (editingStatus[issueId]?.peer === peer.toString()) {
          delete editingStatus[issueId];
        }
      });

      // Broadcast the updated editing status to all peers
      peer.publish(
        "editing-status",
        JSON.stringify({
          type: "editing-status",
          payload: editingStatus,
        })
      );

      console.log(
        "[ws/lock] Updated editing status after peer disconnect:",
        editingStatus
      );
    }, 500);
  },
});
