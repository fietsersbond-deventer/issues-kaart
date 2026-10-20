// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { defineComponent } from "vue";
import { createVuetify } from "vuetify";
import { VListItem } from "vuetify/components/VList";
import CategorySelect from "../app/components/CategorySelect.vue";

afterEach(() => { vi.unstubAllGlobals(); });

it("renders the selected category using the real Vuetify slot contract", async () => {
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
  const vuetify = createVuetify({ components: { VListItem } });
  const legend = { id: 1, name: "Fietspad", description: "Veilige routes", color: "#123456", created_at: "2026-01-01" };
  const wrapper = mount(CategorySelect, {
    props: { modelValue: 1, legends: [legend] },
    global: {
      plugins: [vuetify],
      stubs: { LegendIndicator: defineComponent({ props: ["legend"], template: '<span class="indicator">{{ legend.name }}</span>' }) },
    },
  });
  try {
    await flushPromises();
    expect(wrapper.get(".v-select__selection").text()).toContain("Fietspad");
    expect(wrapper.get(".indicator").text()).toBe("Fietspad");
    await wrapper.setProps({
      legends: [legend, { ...legend, id: 2, name: "Parkeren" }],
      modelValue: 2,
    });
    await flushPromises();
    expect(wrapper.get(".v-select__selection").text()).toContain("Parkeren");
  } finally { wrapper.unmount(); }
});
