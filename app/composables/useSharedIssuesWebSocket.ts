import { useWebSocket } from "@vueuse/core";

/**
 * WebSocket message event bus
 * Allows multiple stores to subscribe to messages without processing duplicates
 */
type WebSocketMessage = {
  type: string;
  payload: unknown;
};

type WebSocketSubscriber = (message: WebSocketMessage) => void;

const createWebSocketEventBus = () => {
  const subscribers = new Set<WebSocketSubscriber>();
  let lastProcessedMessage = "";
  let lastProcessedTime = 0;

  return {
    subscribe(callback: WebSocketSubscriber) {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    },
    publish(data: string) {
      // Prevent duplicate processing of the same message within 50ms
      const now = Date.now();
      if (data === lastProcessedMessage && now - lastProcessedTime < 50) {
        console.debug("[EventBus] Skipping duplicate message within 50ms");
        return;
      }
      lastProcessedMessage = data;
      lastProcessedTime = now;

      try {
        const message = JSON.parse(data) as WebSocketMessage;
        console.debug(
          "[EventBus] Publishing to",
          subscribers.size,
          "subscribers:",
          message.type
        );
        subscribers.forEach((callback) => callback(message));
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    },
  };
};

/**
 * Shared WebSocket connection for all issue stores
 * Singleton pattern to ensure only one connection and one message processor
 */
export const useSharedIssuesWebSocket = (() => {
  let wsInstance: ReturnType<typeof useWebSocket> | null = null;
  let eventBus: ReturnType<typeof createWebSocketEventBus> | null = null;

  return () => {
    if (!wsInstance) {
      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      const websocketUrl = `${protocol}://${window.location.host}/ts/notify`;

      eventBus = createWebSocketEventBus();

      wsInstance = useWebSocket(websocketUrl, {
        autoReconnect: true,
        onConnected() {
          console.debug("WebSocket connected to", websocketUrl);
        },
        onDisconnected() {
          console.debug("WebSocket disconnected");
        },
        onError(error) {
          console.error("WebSocket error:", error);
        },
      });

      // Watch the WebSocket data and publish to event bus (only once per message)
      watch(
        () => wsInstance!.data.value,
        (data) => {
          if (data) {
            eventBus!.publish(data as string);
          }
        }
      );
    }
    return {
      subscribe: eventBus!.subscribe,
      status: wsInstance.status,
      close: wsInstance.close,
      open: wsInstance.open,
    };
  };
})();
