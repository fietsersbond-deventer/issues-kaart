import { defineComponent, h, watch } from "vue";
export { watch };
export const defineNuxtPlugin = <T>(plugin: T) => plugin;
export const useRoute = () => globalThis.useRoute();
export const useRuntimeConfig = () => globalThis.useRuntimeConfig();
export const NuxtLink = defineComponent({
    name: "NuxtLink",
    props: ["to"],
    setup(props, { slots }) { return () => h("a", { href: props.to }, slots.default?.()); },
});
