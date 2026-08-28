import type { WebSocketPeer } from "#nitro";
import { defineWebSocketHandler } from "#nitro";
import { verifyToken } from "../../utils/verifyToken";
import {
  setPeerSession,
  removePeerSession,
  updatePeerActivity,
} from "../../utils/peerSession";
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
  async open(peer: WebSocketPeer) {
    // Extract token from query parameters
    const url = new URL(
      peer.request?.url || "",
      `http://${peer.request?.headers.get("host") || "localhost"}`,
    );
    const token = url.searchParams.get("token");

    if (!token) {
      console.error("[ws/auth] Geen token ontvangen bij verbinding");
      peer.send(
        JSON.stringify({
          type: "error",
          payload: { message: "Unauthorized: No token provided" },
        }),
      );
      peer.close();
      return;
    }

    // Clean token: remove "Bearer " prefix if somehow still present
    const cleanToken = token.replace(/^Bearer\s+/i, "").trim();

    // Debug: log token format (first/last 10 chars only for security)
    console.debug(
      `[ws/auth] Token ontvangen: ${cleanToken.substring(0, 10)}...${cleanToken.substring(cleanToken.length - 10)} (lengte: ${cleanToken.length})`,
    );

    // Verify JWT token
    try {
      const user = await verifyToken(cleanToken);

      // Store authenticated session
      setPeerSession(peer.toString(), user);

      console.log(
        `[ws/auth] Gebruiker ${user.name || user.username} geauthenticeerd (${peer.toString()})`,
      );

      // Send peer ID immediately when connection opens
      peer.send(
        JSON.stringify({
          type: "peer-connected",
          payload: peer.toString(),
        }),
      );

      // Initialize both lock and presence functionality
      initializeLockForPeer(peer);
      initializePresenceForPeer(peer);
    } catch (error) {
      console.error("[ws/auth] Token verificatie mislukt:", error);

      // Provide more specific error information
      let errorMessage = "Unauthorized: Invalid token";
      if (error instanceof Error) {
        if (error.name === "TokenExpiredError") {
          errorMessage = "Unauthorized: Token expired";
        } else if (error.message.includes("JWS")) {
          errorMessage = "Unauthorized: Malformed token";
          console.error(
            "[ws/auth] JWT formaat fout - mogelijk bevat token ongeldige karakters of encoding problemen",
          );
        }
      }

      peer.send(
        JSON.stringify({
          type: "error",
          payload: { message: errorMessage },
        }),
      );
      peer.close();
      return;
    }
  },

  message(peer: WebSocketPeer, message: string) {
    try {
      // Update activity timestamp for this peer
      updatePeerActivity(peer.toString());

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
    // Remove authenticated session
    removePeerSession(peer.toString());

    // Cleanup both lock and presence functionality
    cleanupLockForPeer(peer);
    cleanupPresenceForPeer(peer);
  },

  error(peer: WebSocketPeer, error: Error) {
    console.error(`[ws/auth] Fout voor peer ${peer.toString()}:`, error);
  },
});
