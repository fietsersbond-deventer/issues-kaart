import type { WebSocketPeer } from "#nitro";

// Store online users: { peerId: { username: string, name: string, userId: number } }
type OnlineUser = {
  peerId: string;
  username: string;
  name: string | null;
  userId: number;
  connectedAt: number;
};

type PresenceMessage = {
  type: "user-online" | "user-offline";
  username?: string;
  name?: string | null;
  userId?: number;
};

const onlineUsers = new Map<string, OnlineUser>();

// Helper function to get public user list (including peerIds for client-side filtering)
function getPublicUserList(): OnlineUser[] {
  return Array.from(onlineUsers.values());
}

export function handlePresenceMessage(
  peer: WebSocketPeer,
  data: PresenceMessage
): boolean {
  if (data.type === "user-online") {
    const { username, name, userId } = data;

    if (!username || userId === undefined) {
      console.log("[ws/presence] Ontbrekende gebruikersgegevens");
      return false;
    }

    const peerId = peer.toString();

    // Add user to online list
    onlineUsers.set(peerId, {
      peerId,
      username,
      name: name || null,
      userId,
      connectedAt: Date.now(),
    });

    console.log(`${name} is nu online`);

    // Broadcast updated user list to all connected peers
    const userList = getPublicUserList();
    peer.publish(
      "presence",
      JSON.stringify({
        type: "online-users",
        payload: userList,
      })
    );

    // Also send to the connecting user
    peer.send(
      JSON.stringify({
        type: "online-users",
        payload: userList,
      })
    );

    return true; // Message handled
  } else if (data.type === "user-offline") {
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
        })
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
        })
      );
    }, 1000);
  }
}
