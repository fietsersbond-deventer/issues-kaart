import * as Vue from "vue";
import { createPinia, defineStore, setActivePinia, storeToRefs } from "pinia";
import { mount } from "@vue/test-utils";
import { vi } from "vitest";
export function vueGlobals() {
    for (const name of ["ref", "computed", "watch", "watchEffect", "reactive", "readonly", "onMounted", "onUnmounted", "onBeforeUnmount", "onScopeDispose", "useTemplateRef", "nextTick", "toRef", "toRefs", "inject", "provide", "shallowRef", "unref"] as const)
        vi.stubGlobal(name, Vue[name]);
    vi.stubGlobal("defineStore", defineStore);
    vi.stubGlobal("storeToRefs", storeToRefs);
    const pinia = createPinia();
    setActivePinia(pinia);
    const states = new Map<string, Vue.Ref>();
    vi.stubGlobal("useState", (key: string, init: () => unknown) => {
        if (!states.has(key))
            states.set(key, Vue.ref(init()));
        return states.get(key);
    });
    return pinia;
}
export function withSetup<T>(setup: () => T) {
    let value: T;
    const wrapper = mount(Vue.defineComponent({ setup() { value = setup(); return () => null; } }));
    return { value: value!, wrapper };
}
