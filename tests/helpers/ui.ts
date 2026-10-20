import { defineComponent } from "vue";
export const Form = defineComponent({ name: "VForm", props: ["modelValue"], emits: ["update:modelValue"], template: '<form><slot /></form>' });
export const Field = defineComponent({ name: "VTextField", props: ["modelValue", "label", "rules", "type", "disabled", "errorMessages", "loading"], emits: ["update:modelValue", "click:append-inner"], template: '<label>{{ label }}<input :value="modelValue" :type="type || \'text\'" :disabled="disabled" @input="$emit(\'update:modelValue\', $event.target.value)"><span>{{ errorMessages }}</span></label>' });
export const Button = defineComponent({ name: "VBtn", props: ["disabled", "loading", "type"], template: '<button :disabled="disabled" :type="type || \'button\'"><slot /></button>' });
export const Slot = defineComponent({ template: '<div><slot /><slot name="prepend" /><slot name="title" /><slot name="actions" /></div>' });
export const uiStubs = {
    VForm: Form, VTextField: Field, VBtn: Button,
    VAlert: Slot, VCard: Slot, VCardActions: Slot, VCardTitle: Slot, VCardText: Slot, VContainer: Slot, VRow: Slot, VCol: Slot, VSpacer: true, VDialog: Slot,
};
