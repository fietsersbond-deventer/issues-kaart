import type { WebSocketPeer } from "#nitro";
import { defineWebSocketHandler } from "#nitro";

// Store online users: { peerId: { username: string, name: string, userId: number } }
type OnlineUser = {
  peerId: string;
  username: string;
  name: string | null;
  userId: number;
  connectedAt: number;
};

const onlineUsers = new Map<string, OnlineUser>();

// Helper function to get public user list (without peerIds)
function getPublicUserList(): Array<Omit<OnlineUser, 'peerId'>> {
  return Array.from(onlineUsers.values()).map(({ peerId, ...user }) => user);
}

export default defineWebSocketHandler({
  open(peer: WebSocketPeer) {
    console.log(`[ws/presence] Verbinding geopend: ${peer.toString()}`);
    peer.subscribe("presence");
  },

  message(peer: WebSocketPeer, message: string) {
    try {
      const data = JSON.parse(message.toString());
      
      if (data.type === "user-online") {
        const { username, name, userId } = data;
        const peerId = peer.toString();
        
        // Add user to online list
        onlineUsers.set(peerId, {
          peerId,
          username,
          name,
          userId,
          connectedAt: Date.now()
        });
        
        console.log(`[ws/presence] Gebruiker ${username} is nu online`);
        
        // Broadcast updated user list to all connected peers
        const userList = getPublicUserList();
        peer.publish("presence", JSON.stringify({ 
          type: "online-users", 
          payload: userList 
        }));
        
        // Also send to the connecting user
        peer.send(JSON.stringify({ 
          type: "online-users", 
          payload: userList 
        }));
        
      } else if (data.type === "user-offline") {
        const peerId = peer.toString();
        const user = onlineUsers.get(peerId);
        
        if (user) {
          onlineUsers.delete(peerId);
          console.log(`[ws/presence] Gebruiker ${user.username} is nu offline`);
          
          // Broadcast updated user list
          const userList = getPublicUserList();
          peer.publish("presence", JSON.stringify({ 
            type: "online-users", 
            payload: userList 
          }));
        }
      }
    } catch (error) {
      console.error("[ws/presence] Bericht verwerken mislukt:", error);
    }
  },

  close(peer: WebSocketPeer) {
    const peerId = peer.toString();
    const user = onlineUsers.get(peerId);
    
    console.log(`[ws/presence] Verbinding gesloten: ${peerId}`);
    
    if (user) {
      onlineUsers.delete(peerId);
      console.log(`[ws/presence] Gebruiker ${user.username} verbinding verbroken`);
      
      // Broadcast updated user list after a short delay to handle reconnections
      setTimeout(() => {
        const userList = getPublicUserList();
        peer.publish("presence", JSON.stringify({ 
          type: "online-users", 
          payload: userList 
        }));
      }, 1000);
    }
  },

  error(peer: WebSocketPeer, error: Error) {
    console.error(`[ws/presence] Fout voor peer ${peer.toString()}:`, error);
  }
});