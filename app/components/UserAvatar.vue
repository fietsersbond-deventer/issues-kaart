<template>
  <v-tooltip :text="tooltipText" location="bottom">
    <template #activator="{ props: tooltipProps }">
      <v-avatar
        v-bind="tooltipProps"
        :size="size"
        :color="backgroundColor"
        class="user-avatar"
        :class="{ 'cursor-pointer': showTooltip }"
      >
        <span class="avatar-text" :style="{ fontSize: textSize }">
          {{ initials }}
        </span>
      </v-avatar>
    </template>
  </v-tooltip>
</template>

<script setup lang="ts">
import type { OnlineUser } from "@/composables/useOnlineUsers";

interface Props {
  user: OnlineUser;
  size?: number | string;
  showTooltip?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  size: 32,
  showTooltip: true,
});

const onlineUsersStore = useOnlineUsers();
const { getUserDisplayName, getUserInitials, getUserAvatarColor } =
  onlineUsersStore;

const initials = computed(() => getUserInitials(props.user));
const backgroundColor = computed(() => getUserAvatarColor(props.user));
const displayName = computed(() => getUserDisplayName(props.user));

const tooltipText = computed(() => {
  if (!props.showTooltip) return "";

  const timeAgo = getTimeAgo(props.user.connectedAt);
  return `${displayName.value} (${timeAgo} online)`;
});

const textSize = computed(() => {
  const sizeNum =
    typeof props.size === "number" ? props.size : parseInt(props.size);
  return `${Math.max(8, sizeNum * 0.4)}px`;
});

function getTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (days > 0) return `${days}d geleden`;
  if (hours > 0) return `${hours}u geleden`;
  if (minutes > 0) return `${minutes}m geleden`;
  return "zojuist";
}
</script>

<style scoped>
.user-avatar {
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease;
}

.user-avatar.cursor-pointer:hover {
  transform: scale(1.1);
}

.avatar-text {
  color: white;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}
</style>
