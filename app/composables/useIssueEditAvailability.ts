import { computed, toValue, type MaybeRefOrGetter } from "vue";

export function useIssueEditAvailability(
  issueId: MaybeRefOrGetter<number | null | undefined>,
) {
  const issueLocks = useIssueLocks();
  const availability = computed(() =>
    issueLocks.getEditAvailability(toValue(issueId)),
  );

  return {
    isConnected: computed(() => availability.value.isConnected),
    isLockedByOther: computed(() => availability.value.isLockedByOther),
    canEdit: computed(() => availability.value.canEdit),
  };
}
