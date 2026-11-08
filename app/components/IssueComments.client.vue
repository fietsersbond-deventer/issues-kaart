<template>
  <section class="ml-3 issue-comments" aria-label="Opmerkingen">
    <div class="d-flex align-center justify-space-between mb-4">
      <h2 class="text-h6 font-weight-bold">
        Opmerkingen
      </h2>
    </div>

    <v-alert v-if="fetchError" type="error" variant="tonal" class="mb-4">
      {{ fetchError }}
    </v-alert>

    <div v-if="isLoading" class="d-flex justify-center my-4">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <!-- Comments list -->
    <div v-else ref="commentsContainerRef" class="comments-list">
      <div
        v-if="comments.length === 0"
        class="text-medium-emphasis text-body-2 mb-4"
      >
        Er zijn nog geen opmerkingen geplaatst.
      </div>

      <div
        v-for="comment in comments"
        :key="comment.id"
        class="comment-card mb-4 pa-3 rounded border"
        :class="{ 'comment-deleted': comment.is_deleted }"
      >
        <div class="d-flex align-center justify-space-between mb-2">
          <div class="d-flex align-center ga-2">
            <v-avatar size="28" color="primary">
              <span class="text-caption text-white font-weight-bold">
                {{ getInitials(comment.author_name) }}
              </span>
            </v-avatar>
            <span class="font-weight-medium text-body-2">
              {{ comment.author_name || "Onbekend" }}
            </span>
            <span class="text-caption text-medium-emphasis">
              {{ formatDate(comment.created_at) }}
            </span>
            <span
              v-if="comment.updated_at && !comment.is_deleted"
              class="text-caption text-medium-emphasis font-italic"
            >
              (bewerkt)
            </span>
          </div>

          <div
            v-if="!comment.is_deleted && canManageComment(comment)"
            class="comment-actions d-flex ga-1"
          >
            <v-btn
              icon="mdi-pencil"
              size="x-small"
              variant="text"
              aria-label="Opmerking bewerken"
              :disabled="editingCommentId !== null"
              @click="startEdit(comment)"
            />
            <v-btn
              icon="mdi-delete"
              size="x-small"
              variant="text"
              color="error"
              aria-label="Opmerking verwijderen"
              @click="onDelete(comment.id)"
            />
          </div>
        </div>

        <!-- Edit Form or Rendered Body -->
        <div v-if="editingCommentId === comment.id" class="mt-2">
          <CommentEditor
            v-model="editingBody"
            submit-text="Opslaan"
            show-cancel
            :loading="isUpdating"
            @submit="onSaveEdit(comment.id)"
            @cancel="cancelEdit"
          />
        </div>
        <div v-else class="comment-body">
          <div
            v-if="comment.is_deleted"
            class="text-medium-emphasis text-body-2 font-italic"
          >
            {{ comment.body }}
          </div>
          <ImageViewer v-else selector="img:not(.streetview-embed img)">
            <!-- eslint-disable vue/no-v-html -->
            <div
              class="ql-editor viewer pa-0"
              @click="onCommentClick"
              v-html="comment.body"
            />
            <!-- eslint-enable vue/no-v-html -->
          </ImageViewer>
        </div>
      </div>
    </div>

    <!-- New Comment Section -->
    <div class="new-comment-section mt-6">
      <h3 class="text-subtitle-1 font-weight-bold mb-2">
        Plaats een opmerking
      </h3>
      <CommentEditor
        v-model="newCommentBody"
        placeholder="Schrijf een opmerking..."
        submit-text="Plaatsen"
        :loading="isSubmitting"
        @submit="onCreateComment"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import type { Comment } from "~~/shared/types/Comment";
import type { AnyWebSocketMessage } from "~~/shared/types/WebSocketMessages";

const props = defineProps<{
  issueId: number;
}>();

const { data: user, status } = useAuth();
const isAuthenticated = computed(() => status.value === "authenticated");
const commentsApi = useCommentsApi();
const { showSuccess, showError } = useSnackbar();
const authWs = useSharedAuthWebSocket();

const comments = ref<Comment[]>([]);
const isLoading = ref(false);
const isSubmitting = ref(false);
const isUpdating = ref(false);
const fetchError = ref<string | null>(null);

const newCommentBody = ref("");
const editingCommentId = ref<number | null>(null);
const editingBody = ref("");

const commentsContainerRef = ref<HTMLElement | null>(null);
const {
  activate: activateStreetViewEmbeds,
  handleClick: handleStreetViewClick,
} = useStreetViewEmbeds();

function handleLocalLinks(event: MouseEvent) {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const link = target.closest("a");
  const href = link?.getAttribute("href");
  if (
    !link ||
    !href ||
    /^[a-z][a-z\d+.-]*:/i.test(href) ||
    href.startsWith("//") ||
    href.startsWith("#")
  ) {
    return;
  }

  event.preventDefault();
  const destination = new URL(href, window.location.href);
  navigateTo(`${destination.pathname}${destination.search}${destination.hash}`);
}

function onCommentClick(event: MouseEvent) {
  handleLocalLinks(event);
  handleStreetViewClick(event);
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0];
  const last = parts[parts.length - 1];
  if (parts.length >= 2 && first && last) {
    return (first.charAt(0) + last.charAt(0)).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("nl-NL", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function canManageComment(comment: Comment): boolean {
  if (!user.value) return false;
  const currentUserId = Number(user.value.id);
  const isAuthor =
    comment.author_id !== null && comment.author_id === currentUserId;
  const isAdmin = user.value.role === "admin";
  return isAuthor || isAdmin;
}

async function loadComments() {
  if (!isAuthenticated.value || !props.issueId) {
    comments.value = [];
    return;
  }

  isLoading.value = true;
  fetchError.value = null;
  try {
    const list = await commentsApi.list(props.issueId);
    comments.value = list;
  } catch (err) {
    console.error("Failed to load comments:", err);
    fetchError.value = "Kon opmerkingen niet laden.";
  } finally {
    isLoading.value = false;
  }
}

async function onCreateComment() {
  if (!props.issueId || !newCommentBody.value.trim()) return;

  isSubmitting.value = true;
  try {
    const created = await commentsApi.create(
      props.issueId,
      newCommentBody.value,
    );
    const exists = comments.value.some((c) => c.id === created.id);
    if (!exists) {
      comments.value.push(created);
    }
    newCommentBody.value = "";
    showSuccess("Opmerking geplaatst");
  } catch (err) {
    console.error("Failed to create comment:", err);
    showError("Kon opmerking niet plaatsen");
  } finally {
    isSubmitting.value = false;
  }
}

function startEdit(comment: Comment) {
  editingCommentId.value = comment.id;
  editingBody.value = comment.body;
}

function cancelEdit() {
  editingCommentId.value = null;
  editingBody.value = "";
}

async function onSaveEdit(commentId: number) {
  if (!editingBody.value.trim()) return;

  isUpdating.value = true;
  try {
    const updated = await commentsApi.update(commentId, editingBody.value);
    const index = comments.value.findIndex((c) => c.id === commentId);
    if (index !== -1) {
      comments.value[index] = updated;
    }
    cancelEdit();
    showSuccess("Opmerking gewijzigd");
  } catch (err) {
    console.error("Failed to update comment:", err);
    showError("Kon opmerking niet wijzigen");
  } finally {
    isUpdating.value = false;
  }
}

async function onDelete(commentId: number) {
  if (!confirm("Weet je zeker dat je deze opmerking wilt verwijderen?")) {
    return;
  }

  try {
    const res = await commentsApi.remove(commentId);
    const index = comments.value.findIndex((c) => c.id === commentId);
    if (index !== -1) {
      if (res.soft) {
        comments.value[index] = {
          ...comments.value[index]!,
          is_deleted: true,
          body: "[deleted comment]",
          deleted_at: new Date().toISOString(),
        };
      } else {
        comments.value.splice(index, 1);
      }
    }
    showSuccess("Opmerking verwijderd");
  } catch (err) {
    console.error("Failed to delete comment:", err);
    showError("Kon opmerking niet verwijderen");
  }
}

function handleWebSocketMessage(message: AnyWebSocketMessage) {
  if (!isAuthenticated.value) return;

  if (message.type === "comment-created") {
    const payload = message.payload as Comment;
    if (payload.issue_id === props.issueId) {
      const exists = comments.value.some((c) => c.id === payload.id);
      if (!exists) {
        comments.value.push(payload);
      }
    }
  } else if (message.type === "comment-modified") {
    const payload = message.payload as Comment;
    if (payload.issue_id === props.issueId) {
      const index = comments.value.findIndex((c) => c.id === payload.id);
      if (index !== -1) {
        comments.value[index] = payload;
      }
    }
  } else if (message.type === "comment-deleted") {
    const payload = message.payload as {
      id: number;
      issue_id: number;
      soft: boolean;
    };
    if (payload.issue_id === props.issueId) {
      const index = comments.value.findIndex((c) => c.id === payload.id);
      if (index !== -1) {
        if (payload.soft) {
          comments.value[index] = {
            ...comments.value[index]!,
            is_deleted: true,
            body: "[deleted comment]",
            deleted_at: new Date().toISOString(),
          };
        } else {
          comments.value.splice(index, 1);
        }
      }
    }
  }
}

let unsubscribeWs: (() => void) | null = null;

onMounted(() => {
  loadComments();
  unsubscribeWs = authWs.subscribe(handleWebSocketMessage);
});

onUnmounted(() => {
  if (unsubscribeWs) {
    unsubscribeWs();
  }
});

watch(
  () => props.issueId,
  () => {
    loadComments();
  },
);

watch(
  () => comments.value,
  () => {
    if (commentsContainerRef.value) {
      activateStreetViewEmbeds(commentsContainerRef.value);
    }
  },
  { deep: true, flush: "post" },
);
</script>

<style scoped>
.issue-comments {
  width: 100%;
}

.comment-card {
  border-color: rgba(0, 0, 0, 0.12);
  background-color: rgb(var(--v-theme-surface));
}

.comment-deleted {
  opacity: 0.7;
}

.comment-body :deep(.ql-editor.viewer) {
  padding: 0;
  min-height: auto;
}
</style>
