<template>
  <slot />
</template>

<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, provide, watch } from "vue";
import Style from "ol/style/Style";
import type Map from "ol/Map";
import type { Options, SelectEvent } from "ol/interaction/Select";
import {
  useOpenLayersEvents,
  usePropsAsObjectProperties,
  type CommonEvents,
} from "vue3-openlayers";
import Select from "ol/interaction/Select";

// prevent warnings caused by event pass-through via useOpenLayersEvents composable
defineOptions({
  inheritAttrs: false,
});

const props = defineProps<Options>();

type Emits = CommonEvents & {
  (e: "select", event: SelectEvent): void;
};
defineEmits<Emits>();

const map = inject<Map>("map");
const properties = usePropsAsObjectProperties(props);

const select = computed(
  () =>
    new Select({
      style: new Style(),
      ...(properties as Options),
    })
);

useOpenLayersEvents(select, ["select"]);

watch(select, (newVal, oldVal) => {
  map?.removeInteraction(oldVal);
  map?.addInteraction(newVal);

  map?.changed();
});

onMounted(() => {
  map?.addInteraction(select.value);
});

onUnmounted(() => {
  map?.removeInteraction(select.value);
});

provide("stylable", select);

defineExpose({
  select,
});
</script>
