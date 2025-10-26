<template>
  <div class="online-users">
    <template v-if="displayedUserCount > 0">
      <!-- Show individual avatars when there are few users -->
      <template v-if="displayedUserCount <= maxAvatars">
        <div class="avatar-container">
          <UserAvatar
            v-for="user in displayedOnlineUsers"
            :key="user.peerId"
            :user="user"
            :size="avatarSize"
            class="avatar-item"
          />
        </div>
      </template>

      <!-- Show summary when there are many users -->
      <template v-else>
        <div class="avatar-container">
          <!-- Show first few avatars -->
          <UserAvatar
            v-for="user in displayedOnlineUsers.slice(0, maxAvatars - 1)"
            :key="user.peerId"
            :user="user"
            :size="avatarSize"
            class="avatar-item"
          />

          <!-- Show overflow count -->
          <v-tooltip :text="overflowTooltip" location="bottom">
            <template #activator="{ props: tooltipProps }">
              <v-avatar
                v-bind="tooltipProps"
                :size="avatarSize"
                color="grey-lighten-1"
                class="avatar-item overflow-avatar"
              >
                <span class="overflow-text">
                  +{{ displayedUserCount - (maxAvatars - 1) }}
                </span>
              </v-avatar>
            </template>
          </v-tooltip>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { OnlineUser } from "~/types/WebSocketMessages";

interface Props {
  avatarSize?: number;
  maxAvatars?: number;
  orientation?: "horizontal" | "vertical";
}

const props = withDefaults(defineProps<Props>(), {
  avatarSize: 32,
  maxAvatars: 5,
  orientation: "horizontal",
});

const onlineUsersStore = useOnlineUsers();
const { displayedOnlineUsers, displayedUserCount } =
  storeToRefs(onlineUsersStore);

// Get the function directly from the store
const { getUserDisplayName } = onlineUsersStore;

const overflowTooltip = computed(() => {
  const hiddenUsers = displayedOnlineUsers.value.slice(props.maxAvatars - 1);
  const names = hiddenUsers.map((user: OnlineUser) => getUserDisplayName(user));

  if (names.length <= 3) {
    return names.join(", ");
  } else {
    return `${names.slice(0, 3).join(", ")} en ${names.length - 3} anderen`;
  }
});
</script>

<style scoped>
.online-users {
  display: flex;
  align-items: center;
  gap: 8px;
}

.avatar-container {
  display: flex;
  align-items: center;
}

.avatar-item {
  margin-left: -6px;
  position: relative;
  z-index: 1;
}

.avatar-item:first-child {
  margin-left: 0;
}

.avatar-item:hover {
  z-index: 10;
}

.overflow-avatar {
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.overflow-text {
  color: white;
  font-weight: 600;
  font-size: 11px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.online-text {
  display: flex;
  align-items: center;
  white-space: nowrap;
}

/* Vertical orientation */
.online-users.vertical {
  flex-direction: column;
  align-items: flex-start;
}

.online-users.vertical .avatar-container {
  flex-direction: column;
  gap: 4px;
}

.online-users.vertical .avatar-item {
  margin-left: 0;
  margin-top: -6px;
}

.online-users.vertical .avatar-item:first-child {
  margin-top: 0;
}
</style>
