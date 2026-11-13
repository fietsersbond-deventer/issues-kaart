import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DatabaseSync } from "node:sqlite";
import { migratedDatabase, routeHarness, seed } from "./helpers/server";
import { getEmitter } from "../server/utils/getEmitter";
import { createHash } from "node:crypto";
const imageVersion = createHash("sha256")
  .update("data:image/png;base64,aGVsbG8=")
  .digest("hex");
let db: DatabaseSync;
vi.mock("../server/utils/db", () => ({ getDb: () => db }));
let h: ReturnType<typeof routeHarness>;
let routes: {
  create: typeof import("../server/api/issues/index.post").default;
  update: typeof import("../server/api/issues/[id].patch").default;
  remove: typeof import("../server/api/issues/[id].delete").default;
  get: typeof import("../server/api/issues/[id].get").default;
  checkSlug: typeof import("../server/api/issues/slug.post").default;
  list: typeof import("../server/api/issues/index.get").default;
  search: typeof import("../server/api/issues/search.get").default;
  updatedBy: typeof import("../server/api/issues/[id]/updated-by.get").default;
  geojson: typeof import("../server/api/issues/geojson.get").default;
};
let commentRoutes: {
  create: typeof import("../server/api/issues/[id]/comments/index.post").default;
  list: typeof import("../server/api/issues/[id]/comments/index.get").default;
  get: typeof import("../server/api/comments/[id].get").default;
  update: typeof import("../server/api/comments/[id].patch").default;
  remove: typeof import("../server/api/comments/[id].delete").default;
};
const geometry = { type: "Point", coordinates: [6.1, 52.2] };
const emitted = vi.fn();
beforeEach(async () => {
  h = routeHarness();
  db = await migratedDatabase();
  seed(db);
  routes = {
    create: (await import("../server/api/issues/index.post")).default,
    update: (await import("../server/api/issues/[id].patch")).default,
    remove: (await import("../server/api/issues/[id].delete")).default,
    get: (await import("../server/api/issues/[id].get")).default,
    checkSlug: (await import("../server/api/issues/slug.post")).default,
    list: (await import("../server/api/issues/index.get")).default,
    search: (await import("../server/api/issues/search.get")).default,
    updatedBy: (await import("../server/api/issues/[id]/updated-by.get"))
      .default,
    geojson: (await import("../server/api/issues/geojson.get")).default,
  };
  commentRoutes = {
    create: (await import("../server/api/issues/[id]/comments/index.post"))
      .default,
    list: (await import("../server/api/issues/[id]/comments/index.get"))
      .default,
    get: (await import("../server/api/comments/[id].get")).default,
    update: (await import("../server/api/comments/[id].patch")).default,
    remove: (await import("../server/api/comments/[id].delete")).default,
  };
  getEmitter().on("issue:created", emitted);
  getEmitter().on("issue:modified", emitted);
  getEmitter().on("issue:deleted", emitted);
  getEmitter().on("comment:created", emitted);
  getEmitter().on("comment:modified", emitted);
  getEmitter().on("comment:deleted", emitted);
  emitted.mockClear();
});
afterEach(() => {
  getEmitter().removeAllListeners();
  db.close();
  vi.unstubAllGlobals();
});
async function create(title = "Safe cycle route") {
  h.input.body = {
    title,
    description:
      '<p>Safe crossing</p><img src="data:image/png;base64,aGVsbG8="><script>bad()</script>',
    legend_id: 1,
    geometry,
    tags: [" Café ", "cafe", "Bike"],
  };
  const result = await routes.create(h.event);
  h.input.params.id = String(result.id);
  return result;
}
describe("issue persistence contracts with the migrated schema", () => {
  it.each(["", "?tag=veilig&search=fiets%20route"])(
    "stuurt numerieke kaart-URL's naar de slug met behoud van queryparameters: %s",
    async (query) => {
      const issue = await create();
      const redirect = vi.fn();
      vi.stubGlobal("sendRedirect", redirect);
      vi.stubGlobal(
        "getRequestURL",
        () => new URL(`https://example.test/kaart/00${issue.id}${query}`),
      );
      const middleware = (
        await import("../server/middleware/redirect-numeric-issue-ids")
      ).default;
      middleware(h.event);
      expect(redirect).toHaveBeenCalledExactlyOnceWith(
        h.event,
        `/kaart/${issue.slug}${query}`,
        302,
      );
    },
  );

  it("laat niet-numerieke routes, onbekende IDs en onderwerpen zonder slug ongemoeid", async () => {
    const issue = await create();
    const redirect = vi.fn();
    vi.stubGlobal("sendRedirect", redirect);
    let url = new URL("https://example.test/");
    vi.stubGlobal("getRequestURL", () => url);
    const middleware = (
      await import("../server/middleware/redirect-numeric-issue-ids")
    ).default;
    for (const path of [
      "/",
      "/lijst",
      `/kaart/${issue.slug}`,
      `/api/issues/${issue.id}`,
      "/kaart/999",
      `/kaart/${issue.id}/extra`,
    ]) {
      url = new URL(path, "https://example.test");
      middleware(h.event);
      expect(redirect).not.toHaveBeenCalled();
    }
    db.prepare("UPDATE issues SET slug = '' WHERE id = ?").run(issue.id!);
    url = new URL(`/kaart/${issue.id}`, "https://example.test");
    middleware(h.event);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("maakt zonder tags een onderwerp met aangepaste slug en kan de slug terugzetten naar de titel", async () => {
    h.input.body = {
      title: "Titel als slug",
      slug: " Eigen slug ",
      description: "<p>Beschrijving</p>",
      legend_id: 1,
      geometry,
    };
    const created = await routes.create(h.event);
    expect(created).toMatchObject({
      slug: "eigen-slug",
      tags: [],
      imageUrl: null,
    });
    expect(
      db
        .prepare("SELECT * FROM issue_tags WHERE issue_id = ?")
        .all(created.id!),
    ).toEqual([]);
    h.input.params.id = String(created.id);
    h.input.body = { slug: "   " };
    expect((await routes.update(h.event)).slug).toBe("titel-als-slug");
    expect((await routes.get(h.event)).slug).toBe("titel-als-slug");
  });

  it.each([
    { username: "admin@example.test", expectedName: "admin@example.test" },
    { username: "", expectedName: "Onbekend" },
  ])(
    "gebruikt $expectedName in meldingen wanneer de weergavenaam ontbreekt",
    async ({ username, expectedName }) => {
      h.event.context.user = { ...h.event.context.user!, name: "", username };
      const created = await create();
      expect(emitted).toHaveBeenLastCalledWith(
        expect.objectContaining({
          id: created.id,
          createdBy: expectedName,
          createdByUserId: 1,
        }),
      );
      h.input.body = { title: "Gewijzigde titel" };
      await routes.update(h.event);
      expect(emitted).toHaveBeenLastCalledWith(
        expect.objectContaining({
          id: created.id,
          modifiedBy: expectedName,
          modifiedByUserId: 1,
        }),
      );
    },
  );

  it.each(["create", "update"] as const)(
    "weigert een niet-tekstuele slug bij %s zonder gegevens te wijzigen",
    async (action) => {
      const created = await create();
      emitted.mockClear();
      h.input.body = {
        title: "Niet opslaan",
        slug: 123,
        description: "<p>Nieuw</p>",
        legend_id: 1,
        geometry,
      };
      await expect(routes[action](h.event)).rejects.toMatchObject({
        statusCode: 400,
      });
      expect(db.prepare("SELECT COUNT(*) AS count FROM issues").get()).toEqual({
        count: 1,
      });
      expect((await routes.get(h.event)).title).toBe(created.title);
      expect(emitted).not.toHaveBeenCalled();
    },
  );

  it("creates sanitized content, searchable plain text and normalized deduplicated tags", async () => {
    const issue = await create();
    expect(issue.slug).toBe("safe-cycle-route");
    expect(issue.tags).toEqual(["cafe", "bike"]);
    expect(issue.description).not.toContain("script");
    expect(
      db.prepare("SELECT plain_text FROM issues WHERE id = ?").get(issue.id!),
    ).toEqual({ plain_text: "Safe crossing" });
    expect(
      db
        .prepare("SELECT updated_by_user_id FROM issues WHERE id = ?")
        .get(issue.id!),
    ).toEqual({ updated_by_user_id: 1 });
    expect((await routes.search(h.event)).items[0]).not.toHaveProperty(
      "updated_by_name",
    );
    expect(await routes.updatedBy(h.event)).toMatchObject({
      updated_by_name: "Test Admin",
      updated_at: expect.any(String),
    });
    expect(emitted).toHaveBeenCalledWith(
      expect.objectContaining({
        id: issue.id,
        createdBy: "Test Admin",
        tags: ["cafe", "bike"],
      }),
    );
    const loaded = await routes.get(h.event);
    expect(loaded).toMatchObject({
      geometry,
      tags: ["bike", "cafe"],
      imageUrl: `/api/issues/${issue.id}/image?v=${imageVersion}`,
    });
    h.input.params.id = `00${issue.id}`;
    expect(await routes.get(h.event)).toMatchObject({
      id: issue.id,
      slug: issue.slug,
    });
  });
  it("houdt afbeeldingsversies gelijk in ophalen, opslaan, lijsten, zoeken en WebSocket-updates", async () => {
    const created = await create();
    const originalUrl = `/api/issues/${created.id}/image?v=${imageVersion}`;
    expect(created.imageUrl).toBe(originalUrl);
    expect(emitted).toHaveBeenLastCalledWith(
      expect.objectContaining({ imageUrl: originalUrl }),
    );
    h.input.body = {
      description:
        '<p>Andere tekst</p><img src="data:image/png;base64,aGVsbG8=">',
    };
    expect((await routes.update(h.event)).imageUrl).toBe(originalUrl);

    const source = "data:image/png;base64,bmV3";
    const newUrl = `/api/issues/${created.id}/image?v=${createHash("sha256").update(source).digest("hex")}`;
    h.input.body = {
      description: `<p>Andere afbeelding</p><img src="${source}">`,
    };
    expect((await routes.update(h.event)).imageUrl).toBe(newUrl);
    expect(newUrl).not.toBe(originalUrl);
    expect(emitted).toHaveBeenLastCalledWith(
      expect.objectContaining({ imageUrl: newUrl }),
    );
    expect((await routes.get(h.event)).imageUrl).toBe(newUrl);
    expect(await routes.list(h.event)).toEqual([
      expect.objectContaining({ imageUrl: newUrl }),
    ]);
    h.input.query = { fields: "imageUrl" };
    expect(await routes.list(h.event)).toEqual([
      { id: created.id, imageUrl: newUrl },
    ]);
    h.input.query = {};
    expect((await routes.search(h.event)).items).toEqual([
      expect.objectContaining({ imageUrl: newUrl }),
    ]);

    h.input.body = { description: "<p>Afbeelding verwijderd</p>" };
    expect((await routes.update(h.event)).imageUrl).toBeNull();
    expect(emitted).toHaveBeenLastCalledWith(
      expect.objectContaining({ imageUrl: null }),
    );
    expect((await routes.get(h.event)).imageUrl).toBeNull();
    expect(await routes.list(h.event)).toEqual([
      expect.objectContaining({ imageUrl: null }),
    ]);
    expect((await routes.search(h.event)).items).toEqual([
      expect.objectContaining({ imageUrl: null }),
    ]);
  });
  it("creates unique title slugs, permits custom slugs, and resolves both slugs and numeric IDs", async () => {
    const first = await create("De Brink op slot");
    expect(first.slug).toBe("de-brink-op-slot");
    const duplicate = await create("De Brink op slot");
    expect(duplicate.slug).toBe("de-brink-op-slot-2");

    h.input.params.id = first.slug;
    expect(await routes.get(h.event)).toMatchObject({
      id: first.id,
      slug: first.slug,
    });

    h.input.body = { slug: "Aangepaste slug" };
    const updated = await routes.update(h.event);
    expect(updated.slug).toBe("aangepaste-slug");
    h.input.params.id = String(duplicate.id);
    h.input.body = { slug: "Aangepaste slug" };
    expect((await routes.update(h.event)).slug).toBe("aangepaste-slug-2");
    h.input.params.id = String(first.id);
    expect(await routes.get(h.event)).toMatchObject({
      id: first.id,
      slug: "aangepaste-slug",
    });
  });
  it("previews the unique normalized slug and excludes the issue being edited", async () => {
    await create("De Brink op slot");
    await create("De Brink op slot");
    await create("Ander onderwerp");
    h.input.body = { slug: "De Brink op slot" };
    expect(await routes.checkSlug(h.event)).toEqual({
      slug: "de-brink-op-slot-3",
    });
    h.input.body = { slug: "De Brink op slot", issueId: 1 };
    expect(await routes.checkSlug(h.event)).toEqual({
      slug: "de-brink-op-slot",
    });
    h.input.body = { slug: "de-brink-op-slot-2", issueId: 3 };
    expect(await routes.checkSlug(h.event)).toEqual({
      slug: "de-brink-op-slot-3",
    });
    h.input.body = { slug: "de-brink-op-slot-2", issueId: 2 };
    expect(await routes.checkSlug(h.event)).toEqual({
      slug: "de-brink-op-slot-2",
    });
    h.input.body = { slug: 123 };
    await expect(routes.checkSlug(h.event)).rejects.toMatchObject({
      statusCode: 400,
    });
    h.input.body = { slug: "valid", issueId: "1" };
    await expect(routes.checkSlug(h.event)).rejects.toMatchObject({
      statusCode: 400,
    });
  });
  it("updates all persisted fields and plain text, and broadcasts only committed data", async () => {
    await create();
    h.event.context.user = {
      ...h.event.context.user!,
      id: 2,
      name: "Test User",
    };
    h.input.body = {
      title: "Updated",
      description: "<p>New text</p>",
      geometry: {
        type: "LineString",
        coordinates: [
          [6, 52],
          [7, 53],
        ],
      },
      legend_id: 2,
      tags: ["new"],
    };
    const updated = await routes.update(h.event);
    expect(updated).toMatchObject({
      title: "Updated",
      legend_id: 2,
      tags: ["new"],
    });
    expect((await routes.get(h.event)).imageUrl).toBeNull();
    expect(db.prepare("SELECT plain_text FROM issues").get()).toEqual({
      plain_text: "New text",
    });
    expect(db.prepare("SELECT updated_by_user_id FROM issues").get()).toEqual({
      updated_by_user_id: 2,
    });
    h.input.query = {};
    expect(await routes.updatedBy(h.event)).toMatchObject({
      updated_by_name: "Test User",
      updated_at: expect.any(String),
    });
    expect(emitted).toHaveBeenLastCalledWith(
      expect.objectContaining({ modifiedByUserId: 2, title: "Updated" }),
    );
  });
  it("requires authentication for issue update information", async () => {
    await create();
    h.event.context.user = null;
    await expect(routes.updatedBy(h.event)).rejects.toMatchObject({
      statusCode: 401,
    });
  });
  it("supports tags-only updates and preserves tags when changing only title", async () => {
    await create();
    h.input.body = { tags: ["only"] };
    expect((await routes.update(h.event)).tags).toEqual(["only"]);
    h.input.body = { title: "Rename" };
    expect((await routes.update(h.event)).tags).toEqual(["only"]);
  });
  it.each(["create", "update", "remove"] as const)(
    "denies unauthenticated %s before writing",
    async (action) => {
      await create();
      h.event.context.user = null;
      emitted.mockClear();
      await expect(routes[action](h.event)).rejects.toMatchObject({
        statusCode: 401,
      });
      expect(db.prepare("SELECT COUNT(*) AS count FROM issues").get()).toEqual({
        count: 1,
      });
      expect(emitted).not.toHaveBeenCalled();
    },
  );
  it.each([
    {},
    { title: "x", description: "x" },
    { title: "x", geometry },
    { description: "x", geometry },
  ])("rejects incomplete creates: %j", async (body) => {
    h.input.body = body;
    await expect(routes.create(h.event)).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(emitted).not.toHaveBeenCalled();
  });
  it.each(["create", "update"] as const)(
    "rejects malformed tags/geometry in %s",
    async (action) => {
      await create();
      for (const invalid of [
        { tags: "wrong" },
        { geometry: { type: "NotGeometry" } },
      ]) {
        h.input.body = {
          title: "x",
          description: "x",
          geometry,
          legend_id: 1,
          ...invalid,
        };
        await expect(routes[action](h.event)).rejects.toMatchObject({
          statusCode: 400,
        });
      }
    },
  );
  it.each(["create", "update"] as const)(
    "rolls back %s when inserting tags fails, without broadcasting",
    async (action) => {
      await create();
      db.exec(
        "CREATE TRIGGER fail_tag BEFORE INSERT ON issue_tags BEGIN SELECT RAISE(ABORT, 'tag failure'); END",
      );
      emitted.mockClear();
      h.input.body = {
        title: "Must roll back",
        description: "description",
        geometry,
        legend_id: 1,
        tags: ["new"],
      };
      await expect(routes[action](h.event)).rejects.toThrow("tag failure");
      expect(db.prepare("SELECT title FROM issues").all()).toEqual([
        { title: "Safe cycle route" },
      ]);
      expect((await routes.get(h.event)).tags).toEqual(["bike", "cafe"]);
      expect(emitted).not.toHaveBeenCalled();
    },
  );
  it.each(["get", "update", "remove"] as const)(
    "reports missing and unknown IDs for %s",
    async (action) => {
      h.input.body = { title: "x" };
      await expect(routes[action](h.event)).rejects.toMatchObject({
        statusCode: 400,
      });
      h.input.params.id = "999";
      await expect(routes[action](h.event)).rejects.toMatchObject({
        statusCode: 404,
      });
    },
  );
  it("rejects an empty update", async () => {
    await create();
    h.input.body = {};
    await expect(routes.update(h.event)).rejects.toMatchObject({
      statusCode: 400,
    });
  });
  it("deletes an issue and its tag links and broadcasts the removed identity", async () => {
    const issue = await create();
    expect(await routes.remove(h.event)).toEqual({ id: String(issue.id) });
    expect(db.prepare("SELECT * FROM issue_tags").all()).toEqual([]);
    expect(emitted).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: issue.id, deletedBy: "Test Admin" }),
    );
    await expect(routes.get(h.event)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
  it("lists parsed geometry, tags and image references and supports projections/tag filtering", async () => {
    await create();
    expect(await routes.list(h.event)).toEqual([
      expect.objectContaining({
        slug: "safe-cycle-route",
        geometry,
        tags: ["bike", "cafe"],
      }),
    ]);
    h.input.query = { fields: "id,title" };
    expect(await routes.list(h.event)).toEqual([
      { id: 1, title: "Safe cycle route" },
    ]);
    h.input.query = { fields: "imageUrl,tags", tag: "Café" };
    expect(await routes.list(h.event)).toEqual([
      {
        id: 1,
        imageUrl: `/api/issues/1/image?v=${imageVersion}`,
        tags: ["bike", "cafe"],
      },
    ]);
    h.input.query = { tag: "absent" };
    expect(await routes.list(h.event)).toEqual([]);
    h.input.query = { fields: "password_hash,SQL" };
    await expect(routes.list(h.event)).rejects.toMatchObject({
      statusCode: 400,
    });
  });
  it("exports GeoJSON with issue properties", async () => {
    await create();
    expect(await routes.geojson(h.event)).toMatchObject({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry,
          properties: {
            id: 1,
            slug: "safe-cycle-route",
            title: "Safe cycle route",
          },
        },
      ],
    });
  });
  it("searches title, plain text, category and tag metadata, with pagination and snippets", async () => {
    await create();
    await create("Parking");
    h.input.query = { search: '"safe crossing"', itemsPerPage: "1", page: "1" };
    const result = await routes.search(h.event);
    expect(result.total).toBe(2);
    expect(result.items).toEqual([
      expect.objectContaining({
        id: 1,
        slug: "safe-cycle-route",
        tags: ["bike", "cafe"],
        snippets: expect.any(Array),
        imageUrl: `/api/issues/1/image?v=${imageVersion}`,
      }),
    ]);
    for (const term of ["routes", "cafe"]) {
      h.input.query = { search: term };
      expect((await routes.search(h.event)).total).toBe(2);
    }
    h.input.query = { search: "%" };
    expect((await routes.search(h.event)).total).toBe(0);
    h.input.query = {};
    expect((await routes.search(h.event)).total).toBe(2);
  });
  it.each([
    { page: "0" },
    { page: "10001" },
    { page: "9007199254740993" },
    { page: "1.5" },
    { itemsPerPage: "101" },
    { search: "x".repeat(201) },
    { search: ["x"] },
  ])("rejects invalid search options %j", async (query) => {
    h.input.query = query;
    await expect(routes.search(h.event)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("only exposes comment_count in search results to authenticated users", async () => {
    const issue = await create();
    h.input.params.id = String(issue.id);
    h.input.body = { body: "Opmerking" };
    await commentRoutes.create(h.event);

    h.input.query = {};
    const authenticated = await routes.search(h.event);
    expect(
      authenticated.items.find((item: { id: number }) => item.id === issue.id),
    ).toMatchObject({ comment_count: 1 });

    h.event.context.user = null;
    const anonymous = await routes.search(h.event);
    expect(
      anonymous.items.find((item: { id: number }) => item.id === issue.id),
    ).not.toHaveProperty("comment_count");
  });

  describe("comment lifecycle, authorization and cascading contracts", () => {
    it("creates sanitized comment and broadcasts comment:created event", async () => {
      const issue = await create();
      emitted.mockClear();
      h.input.params.id = String(issue.id);
      h.input.body = { body: "<p>Important note</p><script>alert(1)</script>" };

      const comment = await commentRoutes.create(h.event);
      expect(comment).toMatchObject({
        issue_id: issue.id,
        author_id: 1,
        author_name: "Test Admin",
        body: "<p>Important note</p>",
        is_deleted: false,
        deleted_at: null,
      });
      expect(comment.body).not.toContain("script");
      expect(emitted).toHaveBeenCalledWith(
        expect.objectContaining({
          id: comment.id,
          createdBy: "Test Admin",
          createdByUserId: 1,
        }),
      );

      // List comments for issue
      const list = await commentRoutes.list(h.event);
      expect(list).toEqual([
        expect.objectContaining({
          id: comment.id,
          issue_id: issue.id,
          author_name: "Test Admin",
          body: "<p>Important note</p>",
        }),
      ]);
    });

    it("denies unauthenticated comment creation, retrieval, editing and deletion", async () => {
      const issue = await create();
      h.input.params.id = String(issue.id);
      h.input.body = { body: "Valid comment" };
      const comment = await commentRoutes.create(h.event);

      h.event.context.user = null;
      h.input.params.id = String(comment.id);
      h.input.body = { body: "Modified" };

      await expect(commentRoutes.get(h.event)).rejects.toMatchObject({
        statusCode: 401,
      });
      await expect(commentRoutes.update(h.event)).rejects.toMatchObject({
        statusCode: 401,
      });
      await expect(commentRoutes.remove(h.event)).rejects.toMatchObject({
        statusCode: 401,
      });

      h.input.params.id = String(issue.id);
      await expect(commentRoutes.create(h.event)).rejects.toMatchObject({
        statusCode: 401,
      });
      await expect(commentRoutes.list(h.event)).rejects.toMatchObject({
        statusCode: 401,
      });
    });

    it("rejects empty comment creation and editing", async () => {
      const issue = await create();
      h.input.params.id = String(issue.id);

      for (const invalid of [
        {},
        { body: "" },
        { body: "   " },
        { body: "<script>bad()</script>" },
      ]) {
        h.input.body = invalid;
        await expect(commentRoutes.create(h.event)).rejects.toMatchObject({
          statusCode: 400,
        });
      }
    });

    it("supports soft deletion showing [deleted comment] and forbids editing deleted comments", async () => {
      const issue = await create();
      h.input.params.id = String(issue.id);
      h.input.body = { body: "Original message" };
      const comment = await commentRoutes.create(h.event);

      emitted.mockClear();
      h.input.params.id = String(comment.id);
      const deleteResult = await commentRoutes.remove(h.event);
      expect(deleteResult).toEqual({
        id: comment.id,
        deleted: true,
        soft: true,
      });
      expect(emitted).toHaveBeenCalledWith(
        expect.objectContaining({
          id: comment.id,
          issue_id: issue.id,
          deletedBy: "Test Admin",
          deletedByUserId: 1,
          soft: true,
        }),
      );

      // Get single comment returns [deleted comment]
      const fetched = await commentRoutes.get(h.event);
      expect(fetched.is_deleted).toBe(true);
      expect(fetched.deleted_at).toBeTruthy();
      expect(fetched.body).toBe("[deleted comment]");

      // Listing also returns [deleted comment]
      h.input.params.id = String(issue.id);
      const list = await commentRoutes.list(h.event);
      expect(list[0]).toMatchObject({
        id: comment.id,
        body: "[deleted comment]",
        is_deleted: true,
      });

      // Editing a deleted comment must fail
      h.input.params.id = String(comment.id);
      h.input.body = { body: "Trying to edit deleted comment" };
      await expect(commentRoutes.update(h.event)).rejects.toMatchObject({
        statusCode: 400,
        message: "Cannot edit a deleted comment",
      });
    });

    it("enforces authorization for updating and deleting comments", async () => {
      const issue = await create();
      h.input.params.id = String(issue.id);
      h.input.body = { body: "Author comment" };
      const comment = await commentRoutes.create(h.event);

      // Another regular user cannot edit or delete
      h.event.context.user = {
        id: 99,
        username: "other",
        name: "Other User",
        role: "contributor",
      };
      h.input.params.id = String(comment.id);
      h.input.body = { body: "Hacked comment" };

      await expect(commentRoutes.update(h.event)).rejects.toMatchObject({
        statusCode: 403,
      });
      await expect(commentRoutes.remove(h.event)).rejects.toMatchObject({
        statusCode: 403,
      });

      // Admin can edit and delete
      emitted.mockClear();
      h.event.context.user = {
        id: 2,
        username: "admin2",
        name: "Admin Two",
        role: "admin",
      };
      const updated = await commentRoutes.update(h.event);
      expect(updated.body).toBe("Hacked comment");
      expect(emitted).toHaveBeenCalledWith(
        expect.objectContaining({
          id: comment.id,
          body: "Hacked comment",
          modifiedBy: "Admin Two",
          modifiedByUserId: 2,
        }),
      );
    });

    it("retains comment with null author when user is deleted", async () => {
      const issue = await create();
      // Create user 5
      db.prepare(
        "INSERT INTO users (id, username, password_hash, name) VALUES (5, 'tempuser', 'hash', 'Temp User')",
      ).run();

      h.event.context.user = {
        id: 5,
        username: "tempuser",
        name: "Temp User",
        role: "contributor",
      };
      h.input.params.id = String(issue.id);
      h.input.body = { body: "Comment by temp user" };
      const comment = await commentRoutes.create(h.event);
      expect(comment.author_id).toBe(5);
      expect(comment.author_name).toBe("Temp User");

      // Delete the user from the database
      db.prepare("DELETE FROM users WHERE id = 5").run();

      // Comment should still exist with author_id = null and author_name = null
      h.input.params.id = String(comment.id);
      const fetched = await commentRoutes.get(h.event);
      expect(fetched.id).toBe(comment.id);
      expect(fetched.author_id).toBeNull();
      expect(fetched.author_name).toBeNull();
      expect(fetched.body).toBe("Comment by temp user");
    });

    it("cascades comment deletion when issue is deleted", async () => {
      const issue = await create();
      h.input.params.id = String(issue.id);
      h.input.body = { body: "Comment on issue" };
      const comment = await commentRoutes.create(h.event);

      expect(
        db
          .prepare("SELECT COUNT(*) AS count FROM comments WHERE issue_id = ?")
          .get(issue.id),
      ).toEqual({ count: 1 });

      // Delete issue
      h.input.params.id = String(issue.id);
      await routes.remove(h.event);

      // Comments should be automatically deleted by SQLite foreign key ON DELETE CASCADE
      expect(
        db
          .prepare("SELECT COUNT(*) AS count FROM comments WHERE issue_id = ?")
          .get(issue.id),
      ).toEqual({ count: 0 });
      h.input.params.id = String(comment.id);
      await expect(commentRoutes.get(h.event)).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("supports hard deletion when requested by admin", async () => {
      const issue = await create();
      h.input.params.id = String(issue.id);
      h.input.body = { body: "Hard delete target" };
      const comment = await commentRoutes.create(h.event);

      emitted.mockClear();
      h.input.params.id = String(comment.id);
      h.input.query = { hard: "true" };
      const result = await commentRoutes.remove(h.event);
      expect(result).toEqual({ id: comment.id, deleted: true, soft: false });
      expect(emitted).toHaveBeenCalledWith(
        expect.objectContaining({
          id: comment.id,
          issue_id: issue.id,
          soft: false,
        }),
      );
      expect(
        db
          .prepare("SELECT COUNT(*) AS count FROM comments WHERE id = ?")
          .get(comment.id),
      ).toEqual({ count: 0 });
      await expect(commentRoutes.get(h.event)).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("validates IDs and returns 400 for invalid IDs or 404 for non-existent entities", async () => {
      h.input.params.id = "invalid-nan";
      await expect(commentRoutes.get(h.event)).rejects.toMatchObject({
        statusCode: 400,
      });
      await expect(commentRoutes.update(h.event)).rejects.toMatchObject({
        statusCode: 400,
      });
      await expect(commentRoutes.remove(h.event)).rejects.toMatchObject({
        statusCode: 400,
      });
      await expect(commentRoutes.list(h.event)).rejects.toMatchObject({
        statusCode: 400,
      });
      await expect(commentRoutes.create(h.event)).rejects.toMatchObject({
        statusCode: 400,
      });

      h.input.params.id = "999999";
      h.input.body = { body: "Valid body" };
      await expect(commentRoutes.get(h.event)).rejects.toMatchObject({
        statusCode: 404,
      });
      await expect(commentRoutes.update(h.event)).rejects.toMatchObject({
        statusCode: 404,
      });
      await expect(commentRoutes.remove(h.event)).rejects.toMatchObject({
        statusCode: 404,
      });
      await expect(commentRoutes.list(h.event)).rejects.toMatchObject({
        statusCode: 404,
      });
      await expect(commentRoutes.create(h.event)).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("falls back to username for author and events when name is missing", async () => {
      const issue = await create();
      h.event.context.user = {
        id: 1,
        username: "admin@example.test",
        role: "admin",
      };
      h.input.params.id = String(issue.id);
      h.input.body = { body: "Created by nameless" };
      emitted.mockClear();

      const comment = await commentRoutes.create(h.event);
      expect(emitted).toHaveBeenCalledWith(
        expect.objectContaining({ createdBy: "admin@example.test" }),
      );

      h.input.params.id = String(comment.id);
      h.input.body = { body: "Updated by nameless" };
      await commentRoutes.update(h.event);
      expect(emitted).toHaveBeenCalledWith(
        expect.objectContaining({ modifiedBy: "admin@example.test" }),
      );

      await commentRoutes.remove(h.event);
      expect(emitted).toHaveBeenCalledWith(
        expect.objectContaining({ deletedBy: "admin@example.test" }),
      );
    });

    it("supports getCommentsForIssue with includeDeleted: false option", async () => {
      const { getCommentsForIssue } = await import("../server/utils/comments");
      const issue = await create();
      h.input.params.id = String(issue.id);
      h.input.body = { body: "Comment 1" };
      const comment1 = await commentRoutes.create(h.event);
      h.input.body = { body: "Comment 2" };
      const comment2 = await commentRoutes.create(h.event);

      h.input.params.id = String(comment1.id);
      await commentRoutes.remove(h.event);

      const activeOnly = getCommentsForIssue(db, issue.id, {
        includeDeleted: false,
      });
      expect(activeOnly).toHaveLength(1);
      expect(activeOnly[0].id).toBe(comment2.id);
    });
  });
});
