import {
  expect,
  type BrowserContext,
  type Page,
  type WebSocketRoute,
} from "@playwright/test";

export async function socketConnections(context: BrowserContext | Page) {
  const blocked = new Set<string>();
  const connections: { client: WebSocketRoute; server: WebSocketRoute }[] = [];
  await context.routeWebSocket("**/ts/**", async (client) => {
    if (blocked.has(new URL(client.url()).pathname)) {
      await client.close({ code: 1012 });
      return;
    }
    connections.push({ client, server: client.connectToServer() });
  });
  return { connections, blocked };
}

export async function interrupt(
  sockets: Awaited<ReturnType<typeof socketConnections>>,
  path: string,
  whileDisconnected?: () => Promise<void>,
) {
  const { connections, blocked } = sockets;
  const matching = () =>
    connections.filter(({ client }) => new URL(client.url()).pathname === path);
  await expect.poll(() => matching().length).toBeGreaterThan(0);
  const before = matching().length;
  const connection = matching().at(-1)!;
  blocked.add(path);
  await connection.server.close({
    code: 1012,
    reason: "E2E transport interruption",
  });
  await connection.client.close({
    code: 1012,
    reason: "E2E transport interruption",
  });
  if (whileDisconnected) await whileDisconnected();
  blocked.delete(path);
  await expect.poll(() => matching().length).toBeGreaterThan(before);
}
