import type { WebSocketPeer } from "#nitro";
import { defineWebSocketHandler } from "#nitro";
import {
  handleLockMessage,
  initializeLockForPeer,
  cleanupLockForPeer,
} from "../../utils/lockHandler";
import {
  handlePresenceMessage,
  initializePresenceForPeer,
  cleanupPresenceForPeer,
} from "../../utils/presenceHandler";

export default defineWebSocketHandler({
  open(peer: WebSocketPeer) {
    // Send peer ID immediately when connection opens
    peer.send(JSON.stringify({
      type: "peer-connected",
      payload: peer.toString()
    }));

    // Initialize both lock and presence functionality
    initializeLockForPeer(peer);
    initializePresenceForPeer(peer);
  },

  message(peer: WebSocketPeer, message: string) {
    try {
      const data = JSON.parse(message.toString());

      // Try to handle with lock handler first
      if (handleLockMessage(peer, data)) {
        return; // Message was handled
      }

      // Try to handle with presence handler
      if (handlePresenceMessage(peer, data)) {
        return; // Message was handled
      }

      // If no handler processed the message
      console.log("[ws/auth] Onbekend berichttype:", data.type);
    } catch (error) {
      console.error("[ws/auth] Bericht verwerken mislukt:", error);
    }
  },

  close(peer: WebSocketPeer) {
    // Cleanup both lock and presence functionality
    cleanupLockForPeer(peer);
    cleanupPresenceForPeer(peer);
  },

  error(peer: WebSocketPeer, error: Error) {
    console.error(`[ws/auth] Fout voor peer ${peer.toString()}:`, error);
  },
});
