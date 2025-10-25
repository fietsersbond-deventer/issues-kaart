import { EventEmitter } from "events";

const eventEmitter = new EventEmitter();

// Increase max listeners to support many concurrent WebSocket connections
// Each connection adds 3 listeners (issue:created, issue:modified, issue:deleted)
// Default is 10, so we increase to support at least 50 concurrent connections
eventEmitter.setMaxListeners(150);

export function getEmitter() {
  return eventEmitter;
}
