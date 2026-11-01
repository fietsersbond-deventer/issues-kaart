import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { effectScope, readonly, ref, watch } from "vue";
import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import { createEvent, setResponseHeader, type H3Event } from "h3";

// nuxt prepare (also run by pnpm install) generates the actual import registry.
const declarations = readFileSync(new URL("../.nuxt/types/imports.d.ts", import.meta.url), "utf8");

describe("Nuxt-auto-imports", () => {
  it("herstelt binaire Nitro-cachehits alleen voor de image-routes", async () => {
    let restore: (event: H3Event, response: { body: unknown }) => void;
    vi.stubGlobal("defineNitroPlugin", (plugin: (app: {
      hooks: { hook: (name: string, handler: typeof restore) => void };
    }) => void) => {
      plugin({ hooks: { hook: (_name, handler) => { restore = handler; } } });
    });
    const socket = new Socket();
    const request = new IncomingMessage(socket);
    const response = new ServerResponse(request);
    try {
      await import("../server/plugins/image-cache");
      const event = createEvent(request, response);
      const original = Buffer.from([0, 127, 128, 255]);
      for (const route of ["image", "og-image"]) {
        event._path = `/api/issues/123/${route}?v=1`;
        const cached = { body: JSON.parse(JSON.stringify(original)) as unknown };
        restore!(event, cached);
        expect(cached.body).toEqual(original);
        const fresh = { body: original };
        restore!(event, fresh);
        expect(fresh.body).toBe(original);
      }
      for (const path of ["/api/issues/123", "/api/other/image"]) {
        event._path = path;
        const body = original.toJSON();
        const cached = { body };
        restore!(event, cached);
        expect(cached.body).toBe(body);
      }
      event._path = "/api/issues/123/image";
      for (const body of [null, undefined, { type: "Buffer", data: [-1] }, { type: "Buffer", data: ["1"] }]) {
        const cached = { body };
        restore!(event, cached);
        expect(cached.body).toBe(body);
      }
    } finally {
      socket.destroy();
      vi.unstubAllGlobals();
    }
  });

  it("schrijft client-hints-headerlijsten op een Nitro 2-response", () => {
    const socket = new Socket();
    const request = new IncomingMessage(socket);
    const response = new ServerResponse(request);
    try {
      const event = createEvent(request, response);
      const hints = ["Sec-CH-Viewport-Height", "Sec-CH-Viewport-Width"];
      setResponseHeader(event, "Accept-CH", hints);
      setResponseHeader(event, "Critical-CH", hints);
      expect(response.getHeader("Accept-CH")).toEqual(hints);
      expect(response.getHeader("Critical-CH")).toEqual(hints);
    } finally {
      socket.destroy();
    }
  });

  it("houdt WebSocket-status per SSR-verzoek gescheiden zonder browserverbinding", async () => {
    const firstScope = effectScope();
    const secondScope = effectScope();
    vi.stubGlobal("ref", ref);
    vi.stubGlobal("readonly", readonly);
    vi.stubGlobal("watch", watch);
    vi.stubGlobal("useAuth", () => ({ token: ref(null) }));
    vi.stubGlobal("useRequestURL", () => new URL("https://example.test/lijst"));
    try {
      const { useSharedAuthWebSocket } = await import("../app/composables/useSharedAuthWebSocket");
      const { useSharedIssuesWebSocket } = await import("../app/composables/useSharedIssuesWebSocket");
      const firstAuth = firstScope.run(useSharedAuthWebSocket)!;
      const secondAuth = secondScope.run(useSharedAuthWebSocket)!;
      const firstIssues = firstScope.run(useSharedIssuesWebSocket)!;
      const secondIssues = secondScope.run(useSharedIssuesWebSocket)!;
      firstAuth.open();
      firstIssues.open();
      expect(firstAuth.status.value).toBe("CLOSED");
      expect(firstIssues.status.value).toBe("CLOSED");
      expect(firstAuth.status).not.toBe(secondAuth.status);
      expect(firstAuth.peerId).not.toBe(secondAuth.peerId);
      expect(firstIssues.status).not.toBe(secondIssues.status);
    } finally {
      firstScope.stop();
      secondScope.stop();
      vi.unstubAllGlobals();
    }
  });

  it("bewaart het nieuwe refresh-token wanneer de backend tokens roteert", async () => {
    vi.stubGlobal("defineNuxtConfig", (config: unknown) => config);
    try {
      const { default: config } = await import("../nuxt.config");
      expect(config.auth?.provider).toMatchObject({
        type: "local",
        refresh: {
          isEnabled: true,
          refreshOnlyToken: false,
        },
      });
      expect(config.sitemap).toMatchObject({
        excludeAppSources: true,
        urls: ["/", "/kaart", "/lijst"],
        sources: ["/api/sitemap/urls"],
        exclude: ["/admin/**", "/login", "/reset-password/**", "/kaart/new"],
      });
      expect(config.routeRules).toMatchObject({
        "/api/issues/:id/image": { cache: { maxAge: 3600, swr: false } },
        "/api/issues/:id/og-image": { cache: { maxAge: 3600, swr: false } },
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("houdt Nuxt-layouts en Vuetify-layouts onder afzonderlijke namen beschikbaar", () => {
    expect(declarations).toMatch(/const useLayout: typeof import\('[^']*composables\/layout'\)\.useLayout/);
    expect(declarations).toMatch(/const useVLayout: typeof import\('vuetify'\)\.useLayout/);
  });

  it("registreert Vue-functies en Vuetify-scherminformatie", () => {
    expect(declarations).toMatch(/const ref: typeof import\('vue'\)\.ref/);
    expect(declarations).toMatch(/const useV?Display: typeof import\('vuetify'\)\.useDisplay/);
  });
});
