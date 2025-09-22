import type { WebSocketPeer } from "#nitro";
import { defineWebSocketHandler } from "#nitro";

// Store editing status: { issueId: { username: string | undefined } }
type PeerInfo = {
  peer: string;
  username: string | undefined;
};
const editingStatus: Record<number, PeerInfo | undefined> = {};

export default defineWebSocketHandler({
  open(peer: WebSocketPeer) {
    console.log(`[peer] Connection opened: ${peer.toString()}`);

    // Subscribe to the 'lockIssue' event
    peer.subscribe("lockIssue");
    peer.subscribe("unlockIssue");

    // Ensure the peer subscribes to the 'editing-status' event
    peer.subscribe("editing-status");
    console.log(`[peer] Subscribed to 'editing-status': ${peer.toString()}`);

    peer.send(
      JSON.stringify({ type: "editing-status", payload: editingStatus })
    );
  },

  message(peer: WebSocketPeer, message: string) {
    try {
      const data = JSON.parse(message.toString()); // Ensure message is a string
      console.log("Parsed message:", data);

      if (data.type === "lockIssue" || data.type === "unlockIssue") {
        const { issueId, username } = data;
        const isEditing = data.type === "lockIssue";
        console.log(
          `Editing status update: Issue ID ${issueId}, isEditing: ${isEditing}, username: ${username}`
        );

        if (isEditing) {
          editingStatus[issueId] = { peer: peer.toString(), username };
        } else {
          editingStatus[issueId] = undefined;
        }

        // Broadcast the updated editing status to all peers
        peer.publish(
          "editing-status",
          JSON.stringify({ type: "editing-status", payload: editingStatus })
        );
        console.log("Broadcasted editing status:", editingStatus);

        // Send the updated editing status back to the sender
        peer.send(
          JSON.stringify({ type: "editing-status", payload: editingStatus })
        );
      } else {
        console.log("Unknown message type:", data.type);
      }
    } catch (error) {
      console.error("Failed to parse message:", error);
    }
  },

  close(peer: WebSocketPeer) {
    console.log(`[peer] Connection closed: ${peer.toString()}`);

    // Clean up editing status for disconnected peers
    setTimeout(() => {
      // Remove all entries associated with the disconnected peer
      Object.keys(editingStatus).forEach((issueId) => {
        if (editingStatus[+issueId]?.peer === peer.toString()) {
          editingStatus[+issueId] = undefined;
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
        "Updated editing status after peer disconnect:",
        editingStatus
      );
    }, 500);
  },
});
