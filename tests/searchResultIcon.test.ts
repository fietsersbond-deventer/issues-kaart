// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import SearchResultIcon from "../app/components/SearchResultIcon.vue";
import { getCollectionId } from "../app/utils/getCollectionId";
import { vueGlobals } from "./helpers/vue";

beforeEach(() => {
  vueGlobals();
  vi.stubGlobal("getCollectionId", getCollectionId);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function iconFor(item: object) {
  const wrapper = mount(SearchResultIcon, {
    props: { item: { label: "x", lat: 1, lon: 1, ...item } },
    global: {
      stubs: {
        VIcon: { props: ["icon"], template: "<i :data-icon='icon' />" },
      },
    },
  });
  return wrapper.get("i").attributes("data-icon");
}

describe("getCollectionId", () => {
  it("prefers the item type and falls back to the raw collection id", () => {
    const base = { label: "x", lat: 1, lon: 1 };
    expect(getCollectionId({ ...base, type: "adres" })).toBe("adres");
    expect(
      getCollectionId({
        ...base,
        raw: { properties: { collection_id: "plaats" } },
      }),
    ).toBe("plaats");
    expect(getCollectionId(base)).toBeUndefined();
  });
});

describe("SearchResultIcon", () => {
  it("picks an icon per collection with a marker as fallback", () => {
    expect(iconFor({ type: "plaats" })).toBe("mdi-city");
    expect(iconFor({ type: "straat" })).toBe("mdi-map-marker");
    expect(iconFor({})).toBe("mdi-map-marker");
  });
});
