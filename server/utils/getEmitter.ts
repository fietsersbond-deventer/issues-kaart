import { EventEmitter } from "events";

const eventEmitter = new EventEmitter();

export function getEmitter() {
  console.log("getEmitter called, returning existing EventEmitter instance");

  return eventEmitter;
}
