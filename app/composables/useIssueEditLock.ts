import { toValue, watch, type MaybeRefOrGetter } from "vue";
import { useIssueLocks } from "./useIssueLocks";

/**
 * Koppelt een bewerkingslock aan de huidige Vue-scope. Een opgegeven onderwerp
 * krijgt direct een lock; bij een ander ID wordt de vorige vrijgegeven. Een
 * waarde van null of undefined geeft de lock vrij zonder een nieuwe te vragen.
 *
 * Bij het opruimen van de scope wordt de lock vrijgegeven. De gedeelde store
 * telt gelijktijdige gebruikers van dezelfde lock, zodat die pas daadwerkelijk
 * wordt vrijgegeven wanneer de laatste gebruiker stopt.
 */
export function useIssueEditLock(
  issueId: MaybeRefOrGetter<number | null | undefined>,
) {
  const { acquireLock, releaseLock } = useIssueLocks();
  let lockedIssueId: number | null = null;

  function updateLock(nextIssueId: number | null | undefined) {
    if (lockedIssueId === nextIssueId) return;

    if (lockedIssueId !== null) {
      releaseLock(lockedIssueId);
    }

    lockedIssueId = nextIssueId ?? null;
    if (lockedIssueId !== null) {
      acquireLock(lockedIssueId);
    }
  }

  watch(() => toValue(issueId), updateLock, { immediate: true });
  onScopeDispose(() => updateLock(null));
}
