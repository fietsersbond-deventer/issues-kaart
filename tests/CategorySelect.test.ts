// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { defineComponent } from "vue";
import { mount } from "@vue/test-utils";
import CategorySelect from "../app/components/CategorySelect.vue";

const legend = { id: 1, name: "Fietspad", description: "Routes voor fietsers", color: "#123456", created_at: "2026-01-01" };
const SelectStub = defineComponent({
  props: ["items", "modelValue"],
  template: '<div><slot name="selection" :item="{ raw: items[0] }" /><slot name="item" :item="{ raw: items[0] }" :props="{}" /></div>',
});
function mountSelect() {
  return mount(CategorySelect, {
    props: { modelValue: 1, legends: [legend] },
    global: { stubs: {
      VSelect: SelectStub,
      VListItem: defineComponent({ props: ["subtitle"], template: '<div><span>{{ subtitle }}</span><slot name="prepend" /></div>' }),
      LegendIndicator: defineComponent({ props: ["legend"], template: '<span>{{ legend.name }}</span>' }),
    } },
  });
}

describe("categorieselectie", () => {
  it("toont de categorie uit het raw-veld van Vuetify-slotitems", () => {
    const wrapper = mountSelect();
    expect(wrapper.text()).toContain("Fietspad");
    expect(wrapper.text()).toContain("Routes voor fietsers");
    wrapper.unmount();
  });

  it("geeft de beschikbare categorieën en geselecteerde waarde door", () => {
    const wrapper = mountSelect();
    expect(wrapper.getComponent(SelectStub).props("items")).toEqual([legend]);
    expect(wrapper.getComponent(SelectStub).props("modelValue")).toBe(1);
    wrapper.unmount();
  });
});
