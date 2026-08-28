import type { User } from "../database/schema";

/**
 * Store authenticated user sessions for WebSocket peers
 * Maps peerId to verified user data from JWT token
 */
export interface PeerSession {
  peerId: string;
  user: User;
  connectedAt: number;
  lastActivity: number;
}

const peerSessions = new Map<string, PeerSession>();

/**
 * Store a verified user session for a peer
 */
export function setPeerSession(peerId: string, user: User): void {
  const now = Date.now();
  peerSessions.set(peerId, {
    peerId,
    user,
    connectedAt: now,
    lastActivity: now,
  });
}

/**
 * Get authenticated user data for a peer
 */
export function getPeerSession(peerId: string): PeerSession | undefined {
  return peerSessions.get(peerId);
}

/**
 * Update last activity timestamp for a peer
 */
export function updatePeerActivity(peerId: string): void {
  const session = peerSessions.get(peerId);
  if (session) {
    session.lastActivity = Date.now();
  }
}

/**
 * Remove peer session on disconnect
 */
export function removePeerSession(peerId: string): void {
  peerSessions.delete(peerId);
}

/**
 * Get all peer sessions (for debugging/monitoring)
 */
export function getAllPeerSessions(): PeerSession[] {
  return Array.from(peerSessions.values());
}

/**
 * Clean up stale sessions (optional - for preventing memory leaks)
 * Call this periodically if needed
 */
export function cleanupStaleSessions(maxIdleMs: number = 1000 * 60 * 60): void {
  const now = Date.now();
  for (const [peerId, session] of peerSessions.entries()) {
    if (now - session.lastActivity > maxIdleMs) {
      peerSessions.delete(peerId);
      console.log(
        `[peerSession] Verwijderde verlopen sessie voor ${session.user.username}`,
      );
    }
  }
}
