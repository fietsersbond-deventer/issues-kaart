// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { vueGlobals } from "./helpers/vue";
const token = ref<string | null>("Bearer access-token");
const data = ref<unknown[]>([]);
const refresh = vi.fn().mockResolvedValue(undefined);
const fetch = vi.fn();
let scope: import("vue").EffectScope;
beforeEach(async () => {
  vueGlobals();
  scope = (await import("vue")).effectScope();
  vi.stubGlobal("useAuth", () => ({ token }));
  vi.stubGlobal("useFetch", () => ({ data, refresh }));
  vi.stubGlobal("$fetch", fetch);
  fetch.mockReset().mockResolvedValue({ success: true, id: 1 });
  refresh.mockClear();
  token.value = "Bearer access-token";
  data.value = [];
});
afterEach(() => {
  scope.stop();
  vi.unstubAllGlobals();
});
const auth = { Authorization: "Bearer access-token" };
describe("API composable contracts", () => {
  it("issues CRUD requests with normalized authorization and propagates failures", async () => {
    const { useIssuesMethods } =
      await import("../app/composables/useIssuesMethods");
    const methods = useIssuesMethods();
    await methods.get(1);
    expect(fetch).toHaveBeenLastCalledWith("/api/issues/1", {
      method: "GET",
      headers: auth,
    });
    const draft = { title: "New", description: "text", tags: [] };
    await methods.create(draft);
    expect(fetch).toHaveBeenLastCalledWith("/api/issues", {
      method: "POST",
      body: draft,
      headers: auth,
    });
    await methods.update(1, { id: 1, ...draft } as Parameters<
      typeof methods.update
    >[1]);
    expect(fetch).toHaveBeenLastCalledWith(
      "/api/issues/1",
      expect.objectContaining({ method: "PATCH" }),
    );
    fetch.mockResolvedValueOnce({ slug: "de-brink-op-slot-2" });
    await expect(methods.getUniqueSlug("de brink op slot", 1)).resolves.toEqual(
      {
        slug: "de-brink-op-slot-2",
      },
    );
    expect(fetch).toHaveBeenLastCalledWith("/api/issues/slug", {
      method: "POST",
      body: { slug: "de brink op slot", issueId: 1 },
      headers: auth,
    });
    expect(await methods.remove(1)).toEqual({ id: 1 });
    expect(methods.getImageUrl(4)).toBe("/api/issues/4/image");
    token.value = null;
    await methods.get(2);
    expect(fetch).toHaveBeenLastCalledWith("/api/issues/2", {
      method: "GET",
      headers: undefined,
    });
    fetch.mockRejectedValueOnce(new Error("offline"));
    await expect(methods.create(draft)).rejects.toThrow("offline");
  });
  it("loads text, normalizes bearer headers and refreshes only after a successful save", async () => {
    const { useTexts, useAdminTexts } =
      await import("../app/composables/useTexts");
    data.value = [{ key: "intro", text: "Hello", text_type: "plain" }];
    const texts = useTexts();
    expect(texts.getText("intro")).toMatchObject({ text: "Hello" });
    expect(texts.getText("missing")).toBeUndefined();
    await texts.updateText("intro", "Updated");
    expect(fetch).toHaveBeenLastCalledWith("/api/texts/intro", {
      method: "PATCH",
      body: { text: "Updated" },
      headers: auth,
    });
    expect(refresh).toHaveBeenCalledTimes(1);
    token.value = null;
    await texts.updateText("intro", "Public");
    expect(fetch).toHaveBeenLastCalledWith(
      "/api/texts/intro",
      expect.objectContaining({ headers: undefined }),
    );
    expect(useAdminTexts()).toMatchObject({ data, refresh });
    fetch.mockRejectedValueOnce(new Error("save failed"));
    refresh.mockClear();
    await expect(texts.updateText("intro", "Lost")).rejects.toThrow(
      "save failed",
    );
    expect(refresh).not.toHaveBeenCalled();
  });
  it("looks up tag labels and uses tag ID on writes", async () => {
    const { useTagsApi } = await import("../app/composables/useTagsApi");
    data.value = [
      { id: 1, tag: "bike", label: "Bicycle", description: null, icon: null },
    ];
    const tags = useTagsApi();
    expect(tags.list.value).toEqual(["bike"]);
    expect(tags.getTag("bike").label).toBe("Bicycle");
    expect(tags.getTag("unknown")).toMatchObject({
      tag: "unknown",
      label: "unknown",
      description: null,
      icon: null,
    });
    await tags.create({ tag: "new" });
    await tags.update(1, { label: "changed" });
    expect(fetch).toHaveBeenLastCalledWith(
      "/api/tags/1",
      expect.objectContaining({ method: "PATCH", body: { label: "changed" } }),
    );
    await tags.remove(1);
    expect(refresh).toHaveBeenCalledTimes(3);
    fetch.mockResolvedValueOnce({ success: false });
    refresh.mockClear();
    await tags.remove(999);
    expect(refresh).not.toHaveBeenCalled();
  });
  it("refreshes user data after successful writes and retains data on failed updates", async () => {
    const { useUsersApi } = await import("../app/composables/useUsersApi");
    const users = useUsersApi();
    await users.create({ username: "new", password: "pw" });
    await users.update(1, { username: "changed", role: "user" });
    await users.remove(1);
    expect(refresh).toHaveBeenCalledTimes(3);
    expect(fetch).toHaveBeenLastCalledWith(
      "/api/admin/users/1",
      expect.objectContaining({
        method: "DELETE",
        headers: expect.objectContaining(auth),
      }),
    );
    refresh.mockClear();
    fetch.mockRejectedValueOnce(new Error("denied"));
    await expect(
      users.update(1, { username: "bad", role: "admin" }),
    ).rejects.toThrow("denied");
    expect(refresh).not.toHaveBeenCalled();
  });
  it("loads category usage and refreshes after updates and successful deletion", async () => {
    const { useCategories } = await import("../app/composables/useCategories");
    const categories = scope.run(() => useCategories())!;
    await categories.getUsage();
    expect(fetch).toHaveBeenLastCalledWith(
      "/api/admin/legends/usage",
      expect.objectContaining({ headers: expect.objectContaining(auth) }),
    );
    await categories.create({ name: "Routes", color: "#fff" });
    await categories.update(1, { name: "New" });
    await categories.remove(1);
    expect(refresh).toHaveBeenCalledTimes(2);
    fetch.mockResolvedValueOnce({ success: false });
    refresh.mockClear();
    await categories.remove(1);
    expect(refresh).not.toHaveBeenCalled();
    categories.$dispose();
  });
  it("handles comments CRUD with authorization headers and deletion flags", async () => {
    const { useCommentsApi } =
      await import("../app/composables/useCommentsApi");
    const comments = useCommentsApi();
    await comments.list(1);
    expect(fetch).toHaveBeenLastCalledWith("/api/issues/1/comments", {
      method: "GET",
      headers: expect.objectContaining(auth),
    });
    await comments.create(1, "New comment");
    expect(fetch).toHaveBeenLastCalledWith("/api/issues/1/comments", {
      method: "POST",
      body: { body: "New comment" },
      headers: expect.objectContaining(auth),
    });
    await comments.update(2, "Updated comment");
    expect(fetch).toHaveBeenLastCalledWith("/api/comments/2", {
      method: "PATCH",
      body: { body: "Updated comment" },
      headers: expect.objectContaining(auth),
    });
    await comments.remove(2);
    expect(fetch).toHaveBeenLastCalledWith("/api/comments/2", {
      method: "DELETE",
      headers: expect.objectContaining(auth),
    });
    await comments.remove(2, true);
    expect(fetch).toHaveBeenLastCalledWith("/api/comments/2?hard=true", {
      method: "DELETE",
      headers: expect.objectContaining(auth),
    });
    token.value = null;
    await comments.list(1);
    expect(fetch).toHaveBeenLastCalledWith("/api/issues/1/comments", {
      method: "GET",
      headers: undefined,
    });
  });
  it("posts import requests, image downloads and KMZ uploads with authorization", async () => {
    const { useImportApi } = await import("../app/composables/useImportApi");
    const api = useImportApi();
    fetch.mockResolvedValueOnce({ ref: "import-image:1" });
    await expect(api.downloadImage("https://img.test/a.png")).resolves.toBe(
      "import-image:1",
    );
    expect(fetch).toHaveBeenLastCalledWith("/api/admin/import/image", {
      method: "POST",
      headers: expect.objectContaining(auth),
      body: { url: "https://img.test/a.png" },
    });
    fetch.mockResolvedValueOnce({ ref: "import-image:2" });
    await expect(
      api.uploadImage({ bytes: new Uint8Array([1, 2]), type: "image/png" }),
    ).resolves.toBe("import-image:2");
    const [, options] = fetch.mock.lastCall!;
    expect(options.headers).toEqual({
      "Content-Type": "image/png",
      Authorization: "Bearer access-token",
    });
    expect(options.body).toBeInstanceOf(Blob);
    expect((options.body as Blob).size).toBe(2);
    const request = {
      geojson: { type: "FeatureCollection" as const, features: [] },
      settings: { title: "T", description: "D", fields: [] },
      mappings: {},
    };
    await api.importIssues(request);
    expect(fetch).toHaveBeenLastCalledWith("/api/admin/import", {
      method: "POST",
      headers: expect.objectContaining(auth),
      body: request,
    });
  });
  it("processes import images in parallel, keeps finished ones and retries failures", async () => {
    const uploadImage = vi.fn(async () => "import-image:kmz");
    vi.stubGlobal("useImportApi", () => ({
      downloadImage: async (url: string) => {
        if (url.includes("bad")) {
          throw Object.assign(new Error("x"), {
            data: { message: "HTTP 404" },
          });
        }
        if (url.includes("plain")) throw new Error("Netwerkfout");
        if (url.includes("odd")) throw "odd";
        return `import-image:${url}`;
      },
      uploadImage,
    }));
    const { useImportImages } =
      await import("../app/composables/useImportImages");
    const images = useImportImages();
    const kmz = { bytes: new Uint8Array([1]), type: "image/png" };
    await images.download(
      ["ok1", "bad", "plain", "odd", "kmz-file:a.png", "kmz-file:missing.png"],
      new Map([["kmz-file:a.png", kmz]]),
    );
    expect(uploadImage).toHaveBeenCalledWith(kmz);
    expect(images.done.value.map(({ source }) => source)).toEqual([
      "ok1",
      "kmz-file:a.png",
    ]);
    expect(images.failed.value.map(({ error }) => error)).toEqual([
      "HTTP 404",
      "Netwerkfout",
      "Verwerken mislukt",
      "Afbeelding ontbreekt in het KMZ-bestand",
    ]);
    expect(images.isDownloading.value).toBe(false);
    expect(images.replacements()).toEqual(
      new Map([
        ["ok1", "import-image:ok1"],
        ["bad", null],
        ["plain", null],
        ["odd", null],
        ["kmz-file:a.png", "import-image:kmz"],
        ["kmz-file:missing.png", null],
      ]),
    );
    await images.download(["ok1", "ok2"]);
    expect(images.images.value.map(({ status }) => status)).toEqual([
      "done",
      "done",
    ]);
    await images.download(["bad"]);
    await images.retryFailed();
    expect(images.failed.value).toHaveLength(1);
    images.reset();
    expect(images.images.value).toEqual([]);
  });
});
