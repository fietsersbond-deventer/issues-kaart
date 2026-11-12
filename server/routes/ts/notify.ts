import type { Peer as WebSocketPeer } from "crossws";

import {
  registerIssueBroadcastPeer,
  unregisterIssueBroadcastPeer,
} from "../../utils/broadcastIssue.ts";

export default defineWebSocketHandler({
  open(peer: WebSocketPeer) {
    console.log(`[ws/notify] Connection opened: ${peer.toString()}`);
    registerIssueBroadcastPeer(peer);
  },

  close(peer: WebSocketPeer) {
    console.log(`[ws/notify] Connection closed: ${peer.toString()}`);
    unregisterIssueBroadcastPeer(peer);
  },
});
