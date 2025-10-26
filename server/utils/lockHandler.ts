import type { WebSocketPeer } from "#nitro";
import { getDb } from "./db";

// Store editing status: { issueId: { peer: string, username: string, displayName: string } }
type PeerInfo = {
  peer: string;
  username: string;
  displayName: string;
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

export function handleLockMessage(peer: WebSocketPeer, data: unknown): boolean {
  const message = data as {
    type: string;
    payload?: Record<string, unknown>;
    [key: string]: unknown;
  };

  if (message.type === "get-peer-id") {
    // Send peer ID to client
    peer.send(
      JSON.stringify({
        type: "peer-connected",
        payload: peer.toString(),
      })
    );
    return true; // Message handled
  }

  if (message.type === "lockIssue" || message.type === "unlockIssue") {
    // Handle new message format with payload
    const payload = message.payload || message; // Fallback for old format
    const { issueId, username, displayName } = payload as {
      issueId: number;
      username: string;
      displayName?: string;
    };

    if (!issueId) {
      console.error("lockIssue/unlockIssue requires issueId");
      return false;
    }

    const isEditing = message.type === "lockIssue";
    const peerId = peer.toString();

    // Check if a different peer is already editing this issue
    const currentEditor = editingStatus[Number(issueId)];
    if (currentEditor && currentEditor.peer !== peerId) {
      // Send current editing status to inform client about the existing lock
      peer.send(
        JSON.stringify({ type: "editing-status", payload: editingStatus })
      );
      return false; // Message handled but rejected - different peer is editing
    }

    // Get issue title for logging - use display name for logs
    const issueTitle = getIssueTitle(issueId);
    const logName = displayName || username;

    if (isEditing) {
      editingStatus[Number(issueId)] = {
        peer: peerId,
        username,
        displayName: displayName || username,
      };
      console.log(`${logName} is editing ${issueTitle}`);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete editingStatus[Number(issueId)];
      console.log(`${logName} stopped editing ${issueTitle}`);
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
  } else if (message.type === "clearMyLocks") {
    // Handle new message format with payload
    const payload = message.payload || message; // Fallback for old format
    const { username, displayName } = payload as {
      username: string;
      displayName?: string;
    };
    const peerId = peer.toString();
    const logName = displayName || username;

    // Find and remove all locks for this peer
    const removedIssues: number[] = [];
    Object.keys(editingStatus).forEach((issueId) => {
      const editor = editingStatus[issueId];
      if (editor && editor.peer === peerId) {
        removedIssues.push(Number(issueId));
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete editingStatus[issueId];
      }
    });

    if (removedIssues.length > 0) {
      console.log(
        `${logName} cleared locks for issues: ${removedIssues.join(
          ", "
        )} (reconnected without selected issue)`
      );

      // Broadcast the updated editing status to all peers
      peer.publish(
        "editing-status",
        JSON.stringify({ type: "editing-status", payload: editingStatus })
      );

      // Send the updated editing status back to the sender
      peer.send(
        JSON.stringify({ type: "editing-status", payload: editingStatus })
      );
    }

    return true; // Message handled
  }

  return false; // Message not handled
}

export function initializeLockForPeer(peer: WebSocketPeer) {
  // Subscribe to lock-related events
  peer.subscribe("lockIssue");
  peer.subscribe("unlockIssue");
  peer.subscribe("clearMyLocks");
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
      const editor = editingStatus[issueId];
      if (editor && editor.peer === peerId) {
        const issueTitle = getIssueTitle(Number(issueId));
        console.log(
          `${editor.username} stopped editing ${issueTitle} (disconnected)`
        );

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
