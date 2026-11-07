import { computed, toValue, type MaybeRefOrGetter } from "vue";

/**
 * Volgt de beschikbaarheid van een onderwerp zonder zelf een lock aan te vragen.
 * Het ID mag een waarde, ref of getter zijn; null of undefined betekent dat er
 * geen bestaand onderwerp is geselecteerd.
 *
 * isConnected geeft de verbindingsstatus, isLockedByOther de naam van de andere
 * bewerker of false, en canEdit of er verbinding is en geen andere bewerker.
 * De waarden volgen wijzigingen in het ID, de verbinding en de lockstatus.
 */
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
