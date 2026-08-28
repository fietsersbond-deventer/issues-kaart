import type { WebSocketPeer } from "#nitro";
import type { OnlineUser } from "../../app/types/WebSocketMessages";
import { getPeerSession } from "./peerSession";

const onlineUsers = new Map<string, OnlineUser>();

// Helper function to get public user list (including peerIds for client-side filtering)
function getPublicUserList(): OnlineUser[] {
  return Array.from(onlineUsers.values());
}

export function handlePresenceMessage(
  peer: WebSocketPeer,
  data: unknown,
): boolean {
  const message = data as {
    type: string;
    payload?: Record<string, unknown>;
    [key: string]: unknown;
  };

  if (message.type === "user-online") {
    const peerId = peer.toString();

    // Get verified user data from peer session (server-side)
    const session = getPeerSession(peerId);
    if (!session) {
      console.error(
        "[ws/presence] Geen geverifieerde sessie gevonden voor peer",
      );
      return false;
    }

    // Use server-verified user data, not client payload
    const { user } = session;

    // Add user to online list
    onlineUsers.set(peerId, {
      peerId,
      username: user.username,
      name: user.name || null,
      userId: user.id,
      connectedAt: Date.now(),
    });

    console.log(`${user.name || user.username} is nu online`);

    // Broadcast updated user list to all connected peers
    const userList = getPublicUserList();
    peer.publish(
      "presence",
      JSON.stringify({
        type: "online-users",
        payload: userList,
      }),
    );

    // Also send to the connecting user
    peer.send(
      JSON.stringify({
        type: "online-users",
        payload: userList,
      }),
    );

    return true; // Message handled
  } else if (message.type === "user-offline") {
    const peerId = peer.toString();
    const user = onlineUsers.get(peerId);

    if (user) {
      onlineUsers.delete(peerId);
      console.log(`${user.name} is nu offline`);

      // Broadcast updated user list
      const userList = getPublicUserList();
      peer.publish(
        "presence",
        JSON.stringify({
          type: "online-users",
          payload: userList,
        }),
      );
    }

    return true; // Message handled
  }

  return false; // Message not handled
}

export function initializePresenceForPeer(peer: WebSocketPeer) {
  // Subscribe to presence-related events
  peer.subscribe("presence");
}

export function cleanupPresenceForPeer(peer: WebSocketPeer) {
  const peerId = peer.toString();
  const user = onlineUsers.get(peerId);

  // Clean up online users
  if (user) {
    onlineUsers.delete(peerId);
    console.log(`${user.username} is nu offline`);

    // Broadcast updated user list after a short delay to handle reconnections
    setTimeout(() => {
      const userList = getPublicUserList();
      peer.publish(
        "presence",
        JSON.stringify({
          type: "online-users",
          payload: userList,
        }),
      );
    }, 1000);
  }
}
