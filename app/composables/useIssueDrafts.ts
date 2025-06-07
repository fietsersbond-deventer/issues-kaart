import type { Issue } from '~/types/Issue';

// Internal type, not exported
interface StoredDraft {
  issue: Issue;  // Changed from Partial<Issue> to Issue since we store complete issues
  draftId: string;
  lastUpdated: string;
}

export function useIssueDrafts() {
  const { status } = useAuth();
  const drafts = useLocalStorage<Record<string, StoredDraft>>('issue-drafts', {});
  const DRAFT_EXPIRY = 1000 * 60 * 60 * 24; // 24 hours

  function cleanExpiredDrafts() {
    const now = new Date().getTime();
    const validDrafts = Object.values(drafts.value).filter(draft => {
      const lastUpdated = new Date(draft.lastUpdated).getTime();
      return now - lastUpdated < DRAFT_EXPIRY;
    });

    drafts.value = validDrafts.reduce((acc, draft) => {
      acc[draft.draftId] = draft;
      return acc;
    }, {} as Record<string, StoredDraft>);
  }

  function saveDraft(issue: Issue) {
    const draftId = issue.id?.toString() || crypto.randomUUID();
    drafts.value[draftId] = {
      issue,
      draftId,
      lastUpdated: new Date().toISOString()
    };
  }

  function getDraft(issue: Issue): Issue | null {
    cleanExpiredDrafts();
    const draftId = issue.id?.toString();
    if (!draftId) return null;

    const draft = drafts.value[draftId];
    return draft?.issue || null;
  }

  function deleteDraft(issue: Issue) {
    const draftId = issue.id?.toString();
    if (draftId) {
      delete drafts.value[draftId];
    }
  }

  return {
    saveDraft,
    getDraft,
    deleteDraft
  };
}
