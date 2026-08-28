import { EventEmitter } from "events";

const eventEmitter = new EventEmitter();

// Note: Event listeners are registered once at module level (not per connection)
// Only 3 listeners total: issue:created, issue:modified, issue:deleted
// Default maxListeners (10) is sufficient, but we keep a higher limit for extensibility
eventEmitter.setMaxListeners(20);

export function getEmitter() {
  return eventEmitter;
}
