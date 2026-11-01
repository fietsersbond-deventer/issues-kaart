export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("beforeResponse", (event, response) => {
    if (!/^\/api\/issues\/[^/]+\/(?:image|og-image)$/.test(event.path.split("?")[0]!)) {
      return;
    }

    // Nitro 2 bewaart Buffers als JSON in de responsecache. Zet die bij een
    // cachehit terug om afbeeldingsbytes te versturen, niet het JSON-object.
    const body: unknown = response.body;
    if (
      body !== null && typeof body === "object"
      && "type" in body && body.type === "Buffer"
      && "data" in body && Array.isArray(body.data)
      && body.data.every((byte: unknown) =>
        typeof byte === "number" && Number.isInteger(byte) && byte >= 0 && byte <= 255)
    ) {
      response.body = Buffer.from(body.data);
    }
  });
});
