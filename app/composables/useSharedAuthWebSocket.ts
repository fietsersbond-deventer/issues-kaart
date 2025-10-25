import { useWebSocket } from "@vueuse/core";

/**
 * WebSocket message event bus for authenticated user features
 * Allows multiple stores to subscribe to messages without processing duplicates
 */
type WebSocketMessage = {
  type: string;
  payload: unknown;
};

type WebSocketSubscriber = (message: WebSocketMessage) => void;

const createAuthWebSocketEventBus = () => {
  const subscribers = new Set<WebSocketSubscriber>();

  return {
    subscribe(callback: WebSocketSubscriber) {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    },
    publish(data: string) {
      try {
        const message = JSON.parse(data) as WebSocketMessage;
        subscribers.forEach((callback) => callback(message));
      } catch (error) {
        console.error("Failed to parse auth WebSocket message:", error);
      }
    },
  };
};

/**
 * Shared WebSocket connection for all authenticated user features (locks + presence)
 * Singleton pattern with reference counting to minimize overhead
 */
export const useSharedAuthWebSocket = (() => {
  let wsInstance: ReturnType<typeof useWebSocket> | null = null;
  let eventBus: ReturnType<typeof createAuthWebSocketEventBus> | null = null;
  let refCount = 0;

  return () => {
    if (!wsInstance) {
      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      const websocketUrl = `${protocol}://${window.location.host}/ts/auth`;

      eventBus = createAuthWebSocketEventBus();

      wsInstance = useWebSocket(websocketUrl, {
        immediate: false, // Don't connect immediately - controlled by auth state
        autoReconnect: {
          retries: 5,
          delay: 1000,
          onFailed() {
            console.error(
              "Auth WebSocket verbinding herstellen mislukt na meerdere pogingen"
            );
          },
        },
        onConnected() {
          console.log("Auth WebSocket verbonden met", websocketUrl);
        },
        onDisconnected() {
          console.log("Auth WebSocket verbinding verbroken");
        },
        onError(error) {
          console.error("Auth WebSocket fout:", error);
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

    refCount++;

    return {
      subscribe: eventBus!.subscribe,
      status: wsInstance.status,
      close: () => {
        refCount--;
        if (refCount <= 0) {
          wsInstance?.close();
          refCount = 0;
        }
      },
      open: wsInstance.open,
      send: wsInstance.send,
    };
  };
})();
