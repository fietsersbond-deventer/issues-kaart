import type { WebSocketPeer } from "#nitro";
import { getDb } from "./db";
import { getPeerSession } from "./peerSession";

// Store editing status: { issueId: { peer: string, username: string, displayName: string, lockedAt: number } }
type PeerInfo = {
  peer: string;
  username: string;
  displayName: string;
  lockedAt: number;
};

const editingStatus: Record<string, PeerInfo | undefined> = {};

// Idle timeout for locks (15 minutes)
const LOCK_IDLE_TIMEOUT_MS = 15 * 60 * 1000;

// Periodically check for stale locks
setInterval(() => {
  const now = Date.now();
  let cleanedCount = 0;

  Object.keys(editingStatus).forEach((issueId) => {
    const editor = editingStatus[issueId];
    if (editor && now - editor.lockedAt > LOCK_IDLE_TIMEOUT_MS) {
      const issueTitle = getIssueTitle(Number(issueId));
      console.log(
        `[lockHandler] Lock op ${issueTitle} door ${editor.displayName} verlopen na idle timeout`,
      );

      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete editingStatus[issueId];
      cleanedCount++;
    }
  });

  if (cleanedCount > 0) {
    console.log(
      `[lockHandler] ${cleanedCount} verlopen locks opgeruimd na idle timeout`,
    );
  }
}, 60 * 1000); // Check every minute

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
      }),
    );
    return true; // Message handled
  }

  if (message.type === "lockIssue" || message.type === "unlockIssue") {
    // Get verified user data from peer session (server-side)
    const peerId = peer.toString();
    const session = getPeerSession(peerId);

    if (!session) {
      console.error(
        "[lockHandler] Geen geverifieerde sessie gevonden voor peer",
      );
      return false;
    }

    // Use server-verified user data, not client payload
    const { user } = session;
    const displayName = user.name || user.username;

    // Handle new message format with payload
    const payload = message.payload || message; // Fallback for old format
    const { issueId } = payload as {
      issueId: number;
    };

    if (!issueId) {
      console.error("lockIssue/unlockIssue requires issueId");
      return false;
    }

    const isEditing = message.type === "lockIssue";

    // Check if a different peer is already editing this issue
    const currentEditor = editingStatus[Number(issueId)];
    if (currentEditor && currentEditor.peer !== peerId) {
      // Check if the existing lock has expired
      const now = Date.now();
      if (now - currentEditor.lockedAt > LOCK_IDLE_TIMEOUT_MS) {
        console.log(
          `[lockHandler] Lock op issue ${issueId} door ${currentEditor.displayName} was verlopen, wordt overschreven`,
        );
        // Lock has expired, allow new lock
      } else {
        // Send current editing status to inform client about the existing lock
        peer.send(
          JSON.stringify({ type: "editing-status", payload: editingStatus }),
        );
        return false; // Message handled but rejected - different peer is editing
      }
    }

    // Get issue title for logging
    const issueTitle = getIssueTitle(issueId);

    if (isEditing) {
      editingStatus[Number(issueId)] = {
        peer: peerId,
        username: user.username,
        displayName: displayName,
        lockedAt: Date.now(),
      };
      console.log(`${displayName} is editing ${issueTitle}`);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete editingStatus[Number(issueId)];
      console.log(`${displayName} stopped editing ${issueTitle}`);
    }

    // Broadcast the updated editing status to all peers
    peer.publish(
      "editing-status",
      JSON.stringify({ type: "editing-status", payload: editingStatus }),
    );

    // Send the updated editing status back to the sender
    peer.send(
      JSON.stringify({ type: "editing-status", payload: editingStatus }),
    );

    return true; // Message handled
  } else if (message.type === "clearMyLocks") {
    const peerId = peer.toString();

    // Get verified user data from peer session (server-side)
    const session = getPeerSession(peerId);
    if (!session) {
      console.error(
        "[lockHandler] Geen geverifieerde sessie gevonden voor peer",
      );
      return false;
    }

    const { user } = session;
    const displayName = user.name || user.username;

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
        `${displayName} cleared locks for issues: ${removedIssues.join(
          ", ",
        )} (reconnected without selected issue)`,
      );

      // Broadcast the updated editing status to all peers
      peer.publish(
        "editing-status",
        JSON.stringify({ type: "editing-status", payload: editingStatus }),
      );

      // Send the updated editing status back to the sender
      peer.send(
        JSON.stringify({ type: "editing-status", payload: editingStatus }),
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
          `${editor.username} stopped editing ${issueTitle} (disconnected)`,
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
      }),
    );
  }, 500);
}
