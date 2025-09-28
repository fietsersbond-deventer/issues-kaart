import type { WebSocketPeer } from "#nitro";
import { defineWebSocketHandler } from "#nitro";
import type { ExistingIssue } from "~/types/Issue";
import { getEmitter } from "~~/server/utils/getEmitter";

export default defineWebSocketHandler({
  open(peer: WebSocketPeer) {
    console.log(`[peer] Connection opened: ${peer.toString()}`);

    peer.subscribe("notify");

    const emitter = getEmitter();

    emitter.on("issue:created", (issue: ExistingIssue) => {
      console.log("Emitting issue:created event for issue ID:", issue.id);
      peer.publish(
        "notify",
        JSON.stringify({ type: "issue-created", payload: issue })
      );
    });
    emitter.on("issue:modified", (issue: ExistingIssue) => {
      console.log("Emitting issue:modified event for issue ID:", issue.id);
      peer.publish(
        "notify",
        JSON.stringify({ type: "issue-modified", payload: issue })
      );
    });
    emitter.on("issue:deleted", (issueId: number) => {
      console.log("Emitting issue:deleted event for issue ID:", issueId);
      peer.publish(
        "notify",
        JSON.stringify({ type: "issue-deleted", payload: issueId })
      );
    });
  },

  close(peer: WebSocketPeer) {
    console.log(`[peer] Connection closed: ${peer.toString()}`);
  },
});
