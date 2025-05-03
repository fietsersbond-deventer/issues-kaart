import { inject, provide } from "vue";
import type { ReactiveFeature } from "#imports";

export function useEditableFeature() {
  const featureKey = "feature";

  function provideTheFeature(reactiveFeature: ReactiveFeature) {
    provide(featureKey, reactiveFeature);
  }

  // injects map into the component, map is required if not error
  function injectTheFeature() {
    const reactiveFeature = inject<ReactiveFeature>(featureKey);
    if (!reactiveFeature) throw new Error("No reactiveFeature provided yet");
    return reactiveFeature;
  }

  return { provide: provideTheFeature, inject: injectTheFeature };
}
