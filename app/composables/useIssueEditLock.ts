import { toValue, watch, type MaybeRefOrGetter } from "vue";
import { useIssueLocks } from "./useIssueLocks";

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
