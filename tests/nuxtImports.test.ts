import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { effectScope, readonly, ref, watch } from "vue";
import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import { createEvent, setResponseHeader } from "h3";

// nuxt prepare (also run by pnpm install) generates the actual import registry.
const declarations = readFileSync(new URL("../.nuxt/types/imports.d.ts", import.meta.url), "utf8");

describe("Nuxt-auto-imports", () => {
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
