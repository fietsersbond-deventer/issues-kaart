// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { defineComponent, h, ref, shallowRef } from "vue";
import { vueGlobals } from "./helpers/vue";
import { Field, Slot, uiStubs } from "./helpers/ui";
import Tags from "../app/pages/admin/tags/index.vue";
import Categories from "../app/pages/admin/legends/index.vue";
import Users from "../app/pages/admin/users/index.vue";
import Texts from "../app/pages/admin/texts/index.vue";
import ImportPage from "../app/pages/admin/import/index.vue";
import ImportSourceStep from "../app/components/admin/import/ImportSourceStep.vue";
import ImportSettingsStep from "../app/components/admin/import/ImportSettingsStep.vue";
import ImportCategoryStep from "../app/components/admin/import/ImportCategoryStep.vue";
import ImportConfirmStep from "../app/components/admin/import/ImportConfirmStep.vue";
import { readImportFile } from "../app/utils/readImportFile";
import { useImportImages } from "../app/composables/useImportImages";
const Table = defineComponent({
  props: ["items"],
  setup(props, { slots }) {
    return () =>
      h(
        "div",
        (props.items ?? []).map((item: unknown) =>
          h(
            "section",
            Object.entries(slots)
              .filter(([name]) => name.startsWith("item."))
              .map(([, slot]) => slot?.({ item })),
          ),
        ),
      );
  },
});
const Child = defineComponent({
  name: "BoundaryChild",
  props: [
    "modelValue",
    "entry",
    "legend",
    "legends",
    "error",
    "usage",
    "user",
    "loading",
  ],
  emits: ["save", "saved", "submit", "cancel", "confirm", "edit", "delete"],
  template: "<div>{{ legends?.length }}</div>",
});
const TagEditorStub = defineComponent({
  name: "TagEditor",
  props: ["open", "modelValue"],
  emits: ["update:open", "saved", "deleted"],
  template: "<div></div>",
  setup() {
    return { openCreateDialog: vi.fn(), openEditDialog: vi.fn() };
  },
  expose: ["openCreateDialog", "openEditDialog"],
});
const stubs = {
  ...uiStubs,
  VDataTable: Table,
  VTable: Slot,
  VTextarea: Field,
  VChip: Slot,
  IconSelector: Field,
  AppIcon: true,
  UserForm: Child,
  AdminLegendTable: Child,
  AdminLegendDialog: Child,
  AdminLegendDeleteConfirmDialog: Child,
  TextEditorDialog: Child,
  TagEditor: TagEditorStub,
};
const create = vi.fn(),
  update = vi.fn(),
  remove = vi.fn(),
  showError = vi.fn(),
  showSuccess = vi.fn();
const rows = ref<Record<string, unknown>[]>([]),
  categories = shallowRef<Record<string, unknown>[]>([]),
  users = ref<Record<string, unknown>[]>([]);
const wrappers: Array<{
  unmount(): void;
}> = [];
beforeEach(() => {
  vueGlobals();
  vi.clearAllMocks();
  create.mockReset();
  update.mockReset();
  remove.mockReset();
  rows.value = [];
  categories.value = [];
  users.value = [];
  vi.stubGlobal("useTitle", vi.fn());
  vi.stubGlobal("definePageMeta", vi.fn());
  vi.stubGlobal("useRoles", () => ({ isAdmin: ref(true) }));
  vi.stubGlobal("requiredRule", (x: string) => !!x);
  vi.stubGlobal("storeToRefs", (x: unknown) => x);
  vi.stubGlobal("useTagsApi", () => ({
    tags: rows,
    create,
    update,
    remove,
    refreshTags: vi.fn(),
  }));
  vi.stubGlobal("useCategories", () => ({
    categories,
    create,
    update,
    remove,
    getUsage: async () => ({}),
  }));
  vi.stubGlobal("useUsersApi", () => ({ users, create, update, remove }));
  vi.stubGlobal("useRuntimeConfig", () => ({
    public: { appUrl: "https://example.test" },
  }));
  vi.stubGlobal("useSnackbar", () => ({ showError, showSuccess }));
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  wrappers.splice(0).forEach((w) => w.unmount());
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
const button = (wrapper: ReturnType<typeof mount>, text: string) =>
  wrapper.findAll("button").find((b) => b.text().trim() === text)!;
it("renders tags page with table and editor", async () => {
  const wrapper = mount(Tags, {
    global: { stubs, mocks: { requiredRule: () => true } },
  });
  wrappers.push(wrapper);
  expect(wrapper.text()).toContain("Tags");
  expect(wrapper.text()).toContain("Nieuwe tag");
  // TagEditor is stubbed, so we just verify the page renders
  expect(wrapper.findComponent(TagEditorStub).exists()).toBe(true);
});
it("creates/edits categories and displays protected-delete errors without dropping the item", async () => {
  categories.value = [{ id: 1, name: "Routes" }];
  const wrapper = mount(Categories, { global: { stubs } });
  wrappers.push(wrapper);
  await flushPromises();
  const table = wrapper.findAllComponents(Child)[0]!;
  const dialog = wrapper.findAllComponents(Child)[1]!;
  const deletion = wrapper.findAllComponents(Child)[2]!;
  create.mockResolvedValueOnce({ id: 2, name: "New" });
  dialog.vm.$emit("save", { name: "New", color: "#fff", description: "" });
  await flushPromises();
  expect(categories.value).toHaveLength(2);
  expect(table.text()).toBe("2");
  table.vm.$emit("edit", categories.value[0]);
  await flushPromises();
  dialog.vm.$emit("save", { name: "Changed", color: "#fff", description: "" });
  await flushPromises();
  expect(update).toHaveBeenCalledWith(
    1,
    expect.objectContaining({ name: "Changed" }),
  );
  table.vm.$emit("delete", categories.value[0]);
  await flushPromises();
  remove.mockRejectedValueOnce({ data: { message: "In use" } });
  deletion.vm.$emit("confirm");
  await flushPromises();
  expect(deletion.props("error")).toBe("In use");
  expect(categories.value).toHaveLength(2);
  remove.mockResolvedValueOnce({ success: true });
  deletion.vm.$emit("confirm");
  await flushPromises();
  expect(categories.value).toEqual([{ id: 2, name: "New" }]);
});
it("creates, edits and deletes users and copies their reset links", async () => {
  users.value = [
    {
      id: 1,
      username: "user@example.test",
      name: "User",
      role: "user",
      reset_token: "token",
      reset_token_expires_at: "2099-01-01T00:00:00Z",
    },
  ];
  const clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: clipboard,
  });
  const wrapper = mount(Users, { global: { stubs } });
  wrappers.push(wrapper);
  await button(wrapper, "Nieuwe gebruiker").trigger("click");
  const newForm = wrapper
    .findAllComponents(Child)
    .find((c) => c.props("user") === undefined)!;
  newForm.vm.$emit("submit", { username: "new", name: null, role: "user" });
  await flushPromises();
  expect(create).not.toHaveBeenCalled();
  newForm.vm.$emit("submit", {
    username: "new",
    name: null,
    role: "user",
    password: "pw",
  });
  await flushPromises();
  expect(create).toHaveBeenCalledWith(
    expect.objectContaining({ username: "new", password: "pw" }),
  );
  await wrapper.get('button[icon="mdi-pencil"]').trigger("click");
  const edit = wrapper
    .findAllComponents(Child)
    .find((c) => c.props("user")?.id === 1)!;
  edit.vm.$emit("submit", { username: "updated", name: "User", role: "admin" });
  await flushPromises();
  expect(update).toHaveBeenCalledWith(
    1,
    expect.objectContaining({ username: "updated" }),
  );
  const copy = wrapper
    .findAll("button")
    .find((b) => b.text().includes("Kopieer reset link"))!;
  await copy.trigger("click");
  await flushPromises();
  expect(clipboard.writeText).toHaveBeenCalledWith(
    "https://example.test/reset-password/token",
  );
  await wrapper.get('button[icon="mdi-delete"]').trigger("click");
  await button(wrapper, "Verwijderen").trigger("click");
  await flushPromises();
  expect(remove).toHaveBeenCalledWith(1);
});
it("renders text previews/types and opens the selected text editor", async () => {
  const refresh = vi.fn();
  vi.stubGlobal("useAdminTexts", () => ({
    data: ref(
      ["plain", "rich", "url"].map((type, i) => ({
        key: String(i),
        text: `<p>${"x".repeat(i ? 150 : 5)}</p>`,
        text_type: type,
        updated_at: "2026-01-01",
        updated_by_name: null,
      })),
    ),
    refresh,
  }));
  const wrapper = mount(Texts, {
    global: { stubs, directives: { tooltip: () => {} } },
  });
  wrappers.push(wrapper);
  expect(wrapper.text()).toContain("Rijke tekst");
  expect(wrapper.text()).toContain("Platte tekst");
  expect(wrapper.text()).toContain("URL");
  expect(wrapper.text()).toContain("...");
  await wrapper.findAll("button")[0]!.trigger("click");
  const editor = wrapper.getComponent(Child);
  expect(editor.props("entry").key).toBe("0");
  expect(editor.props("modelValue")).toBe(true);
  editor.vm.$emit("saved");
  expect(refresh).toHaveBeenCalledTimes(1);
});

describe("import wizard", () => {
  const Stepper = defineComponent({
    name: "VStepper",
    props: ["modelValue"],
    setup(props, { slots }) {
      return () => h("div", slots[`item.${props.modelValue}`]?.());
    },
  });
  const Input = (name: string) =>
    defineComponent({
      name,
      props: [
        "modelValue",
        "label",
        "ariaLabel",
        "items",
        "value",
        "disabled",
        "errorMessages",
      ],
      emits: ["update:modelValue"],
      template:
        "<div><span>{{ label }}</span><slot name='label' /><span>{{ errorMessages }}</span></div>",
    });
  const importStubs = {
    ...stubs,
    VStepper: Stepper,
    VFileInput: Input("VFileInput"),
    VSelect: Input("VSelect"),
    VCheckbox: Input("VCheckbox"),
    VCheckboxBtn: Input("VCheckboxBtn"),
    VProgressLinear: true,
    VColorPicker: Input("VColorPicker"),
    VMenu: defineComponent({
      setup(_, { slots }) {
        return () =>
          h("div", [slots.activator?.({ props: {} }), slots.default?.()]);
      },
    }),
    VList: Slot,
    VListItem: defineComponent({
      props: ["title", "subtitle"],
      template: "<div>{{ title }} {{ subtitle }}</div>",
    }),
  };
  const components = {
    AdminImportSourceStep: ImportSourceStep,
    AdminImportSettingsStep: ImportSettingsStep,
    AdminImportCategoryStep: ImportCategoryStep,
    AdminImportConfirmStep: ImportConfirmStep,
  };
  const navigate = vi.fn(),
    downloadImage = vi.fn(),
    importIssues = vi.fn(),
    refreshCategories = vi.fn();
  const geojson = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          name: "Brug",
          description: 'Tekst<img src="https://img.test/a.png">',
          folder: "Knelpunten",
          urgentie: "Hoog",
        },
        geometry: { type: "Point", coordinates: [6, 52] },
      },
      {
        type: "Feature",
        properties: { name: "Weg", folder: "Routes", urgentie: "" },
        geometry: {
          type: "LineString",
          coordinates: [
            [6, 52],
            [6.1, 52.1],
          ],
        },
      },
    ],
  };
  beforeEach(() => {
    vi.stubGlobal("readImportFile", readImportFile);
    vi.stubGlobal("useImportApi", () => ({ downloadImage, importIssues }));
    vi.stubGlobal("useImportImages", useImportImages);
    vi.stubGlobal("navigateTo", navigate);
    vi.stubGlobal("useCategories", () => ({
      categories,
      refresh: refreshCategories,
    }));
    categories.value = [{ id: 1, name: "Routes" }];
    downloadImage.mockReset().mockResolvedValue("import-image:abc");
    importIssues.mockReset().mockResolvedValue({
      issues: 2,
      legends: 1,
      tag: "import-20261128-1530",
      issuesWithImage: 1,
      images: 1,
      removedImages: 0,
    });
  });

  async function mountWizard() {
    const wrapper = mount(ImportPage, {
      global: { stubs: importStubs, components },
    });
    wrappers.push(wrapper);
    const file = new File([JSON.stringify(geojson)], "knelpunten.geojson");
    wrapper
      .findComponent({ name: "VFileInput" })
      .vm.$emit("update:modelValue", file);
    await vi.waitFor(() => expect(wrapper.text()).toContain("2 objecten"));
    await button(wrapper, "Volgende").trigger("click");
    return wrapper;
  }
  const select = (wrapper: ReturnType<typeof mount>, label: string) =>
    wrapper
      .findAllComponents({ name: "VSelect" })
      .find((c) => (c.props("label") ?? c.props("ariaLabel")) === label)!;

  it("guides an admin from file to import with KML defaults, category choices and downloaded images", async () => {
    const wrapper = await mountWizard();
    // KML field names are preselected; the remaining fields go in the description.
    expect(
      select(wrapper, "Gegevensveld voor titel (optioneel)").props(
        "modelValue",
      ),
    ).toBe("name");
    expect(
      select(wrapper, "Gegevensveld voor categorie (optioneel)").props(
        "modelValue",
      ),
    ).toBe("folder");
    expect(wrapper.text()).toContain("urgentie — Hoog");
    expect(wrapper.text()).not.toContain("name — Brug");
    select(wrapper, "Gegevensveld voor titel (optioneel)").vm.$emit(
      "update:modelValue",
      "urgentie",
    );
    await flushPromises();
    expect(wrapper.text()).not.toContain("urgentie —");
    select(wrapper, "Gegevensveld voor titel (optioneel)").vm.$emit(
      "update:modelValue",
      "name",
    );
    await button(wrapper, "Volgende").trigger("click");

    // Nothing is chosen automatically.
    expect(wrapper.text()).toContain('Kies een categorie voor "Knelpunten".');
    expect(button(wrapper, "Volgende").attributes("disabled")).toBeDefined();
    select(wrapper, "Categorie voor Knelpunten").vm.$emit(
      "update:modelValue",
      "new",
    );
    select(wrapper, "Categorie voor Routes").vm.$emit("update:modelValue", 1);
    await flushPromises();
    const name = wrapper
      .findAll("input")
      .find((i) => (i.element as HTMLInputElement).value === "Knelpunten")!;
    await name.setValue("Routes");
    expect(wrapper.text()).toContain('Categorie "Routes" bestaat al');
    await name.setValue(" ");
    expect(wrapper.text()).toContain("een naam");
    await name.setValue("Knelpunten");
    wrapper
      .findComponent({ name: "VColorPicker" })
      .vm.$emit("update:modelValue", "#9D4EDD");
    await button(wrapper, "Volgende").trigger("click");

    await flushPromises();
    expect(downloadImage).toHaveBeenCalledWith("https://img.test/a.png");
    expect(wrapper.text()).toContain("2 onderwerpen");
    expect(wrapper.text()).toContain("1 nieuwe categorieën");
    expect(wrapper.text()).toContain("1 van 1 verwerkt");
    await button(wrapper, "Importeren").trigger("click");
    await flushPromises();

    const request = importIssues.mock.calls[0]![0];
    expect(request.geojson.features[0].properties.description).toBe(
      'Tekst<img src="import-image:abc">',
    );
    expect(request.settings).toMatchObject({
      title: "knelpunten",
      titleField: "name",
      categoryField: "folder",
      htmlField: "description",
      fields: ["name", "description", "folder", "urgentie"],
    });
    expect(request.mappings).toEqual({
      Knelpunten: { name: "Knelpunten", color: "#9D4EDD" },
      Routes: { legend_id: 1 },
    });
    expect(request.fileName).toBe("knelpunten.geojson");
    expect(refreshCategories).toHaveBeenCalled();
    expect(wrapper.text()).toContain("2 onderwerpen geïmporteerd");
    expect(wrapper.text()).toContain("1 nieuwe categorieën");
    expect(wrapper.text()).toContain("1 onderwerpen met afbeelding, 1 zonder");
    expect(wrapper.text()).not.toContain("overgeslagen");
    expect(wrapper.text()).toContain("de tag import-20261128-1530");
    await button(wrapper, "Bekijk op de kaart").trigger("click");
    expect(navigate).toHaveBeenCalledWith({
      path: "/",
      query: { tag: "import-20261128-1530" },
    });
    await button(wrapper, "Nieuwe import").trigger("click");
    expect(wrapper.text()).toContain("Kies een GeoJSON-");
  });

  it("requires a decision on failed images and shows import errors", async () => {
    downloadImage.mockRejectedValue(new Error("HTTP 404"));
    importIssues.mockRejectedValueOnce({ data: { message: "Server weigert" } });
    const wrapper = await mountWizard();
    select(wrapper, "Gegevensveld voor categorie (optioneel)").vm.$emit(
      "update:modelValue",
      null,
    );
    await button(wrapper, "Volgende").trigger("click");
    expect(wrapper.text()).toContain("Kies de categorie voor alle objecten.");
    wrapper
      .findComponent({ name: "VCheckboxBtn" })
      .vm.$emit("update:modelValue", false);
    await flushPromises();
    expect(wrapper.text()).toContain("Selecteer minstens één waarde.");
    wrapper
      .findComponent({ name: "VCheckboxBtn" })
      .vm.$emit("update:modelValue", true);
    select(wrapper, "Categorie voor Alle objecten").vm.$emit(
      "update:modelValue",
      1,
    );
    await flushPromises();
    await button(wrapper, "Volgende").trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("1 mislukt");
    expect(wrapper.text()).toContain("https://img.test/a.png HTTP 404");
    expect(button(wrapper, "Importeren").attributes("disabled")).toBeDefined();
    await button(wrapper, "Opnieuw proberen").trigger("click");
    await flushPromises();
    expect(downloadImage).toHaveBeenCalledTimes(2);
    wrapper
      .findAllComponents({ name: "VCheckbox" })
      .find(
        (c) =>
          c.props("label") === "Importeren zonder de mislukte afbeeldingen",
      )!
      .vm.$emit("update:modelValue", true);
    await flushPromises();
    await button(wrapper, "Importeren").trigger("click");
    await flushPromises();
    expect(
      importIssues.mock.calls[0]![0].geojson.features[0].properties.description,
    ).toBe("Tekst");
    expect(wrapper.text()).toContain("Server weigert");
    await button(wrapper, "Vorige").trigger("click");
    expect(wrapper.text()).toContain("Kies de categorie");
  });

  it("shows file errors and invalid geometry before importing", async () => {
    const wrapper = mount(ImportPage, {
      global: { stubs: importStubs, components },
    });
    wrappers.push(wrapper);
    const input = wrapper.findComponent({ name: "VFileInput" });
    input.vm.$emit("update:modelValue", new File(["x"], "kaart.csv"));
    await vi.waitFor(() =>
      expect(wrapper.text()).toContain("Kies een .geojson-"),
    );
    input.vm.$emit("update:modelValue", []);
    await flushPromises();
    expect(wrapper.text()).not.toContain("Kies een .geojson-");

    const invalid = structuredClone(geojson);
    invalid.features[0]!.geometry = { type: "Point", coordinates: [999, 0] };
    input.vm.$emit("update:modelValue", [
      new File([JSON.stringify(invalid)], "x.json"),
    ]);
    await vi.waitFor(() => expect(wrapper.text()).toContain("2 objecten"));
    await button(wrapper, "Volgende").trigger("click");
    await button(wrapper, "Volgende").trigger("click");
    select(wrapper, "Categorie voor Knelpunten").vm.$emit(
      "update:modelValue",
      1,
    );
    select(wrapper, "Categorie voor Routes").vm.$emit("update:modelValue", 1);
    await flushPromises();
    await button(wrapper, "Volgende").trigger("click");
    expect(wrapper.text()).toContain("Object 1: coördinaten zijn geen WGS84");
    expect(button(wrapper, "Importeren").attributes("disabled")).toBeDefined();
  });
});
