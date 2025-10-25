import type { WebSocketPeer } from "#nitro";
import { getDb } from "./db";

// Store editing status: { issueId: { peer: string, username: string } }
type PeerInfo = {
  peer: string;
  username: string | undefined;
};

type LockMessage = {
  type: "lockIssue" | "unlockIssue";
  issueId: number;
  username: string;
};

const editingStatus: Record<string, PeerInfo | undefined> = {};

// Helper function to get issue title
function getIssueTitle(issueId: number): string {
  try {
    const db = getDb();
    const stmt = db.prepare("SELECT title FROM issues WHERE id = ?");
    const result = stmt.get(issueId) as { title: string } | undefined;
    return result?.title || `Issue #${issueId}`;
  } catch (error) {
    console.error("Error fetching issue title:", error);
    return `Issue #${issueId}`;
  }
}

export function handleLockMessage(
  peer: WebSocketPeer,
  data: LockMessage
): boolean {
  if (data.type === "lockIssue" || data.type === "unlockIssue") {
    const { issueId, username } = data;
    const isEditing = data.type === "lockIssue";

    if (editingStatus[Number(issueId)]) {
      if (editingStatus[Number(issueId)]!.peer !== peer.toString()) {
        return false; // Message handled but rejected
      }
    }

    // Get issue title for logging
    const issueTitle = getIssueTitle(issueId);

    if (isEditing) {
      editingStatus[Number(issueId)] = { peer: peer.toString(), username };
      console.log(`${username} is editing ${issueTitle}`);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete editingStatus[Number(issueId)];
      console.log(`${username} stopped editing ${issueTitle}`);
    }

    // Broadcast the updated editing status to all peers
    peer.publish(
      "editing-status",
      JSON.stringify({ type: "editing-status", payload: editingStatus })
    );

    // Send the updated editing status back to the sender
    peer.send(
      JSON.stringify({ type: "editing-status", payload: editingStatus })
    );

    return true; // Message handled
  }
  return false; // Message not handled
}

export function initializeLockForPeer(peer: WebSocketPeer) {
  // Subscribe to lock-related events
  peer.subscribe("lockIssue");
  peer.subscribe("unlockIssue");
  peer.subscribe("editing-status");

  // Send current editing status to the connecting user
  peer.send(JSON.stringify({ type: "editing-status", payload: editingStatus }));
}

export function cleanupLockForPeer(peer: WebSocketPeer) {
  const peerId = peer.toString();

  // Clean up editing status for disconnected peer
  setTimeout(() => {
    // Remove all entries associated with the disconnected peer
    Object.keys(editingStatus).forEach((issueId) => {
      if (editingStatus[issueId]?.peer === peerId) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
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
  }, 500);
}
