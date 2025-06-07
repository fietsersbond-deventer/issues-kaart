const REFRESH_INTERVAL = 1000 * 60 * 10; // Refresh every 10 minutes to be safe (since tokens expire after 15)

export function useAutoRefresh() {
  const { status, getSession } = useAuth();
  let refreshInterval: ReturnType<typeof setInterval> | null = null;

  async function refreshSession() {
    try {
      if (status.value === 'authenticated') {
        // The refresh token is automatically included in the cookie
        const response = await $fetch('/api/auth/refresh', {
          method: 'POST'
        });

        // Update session with new tokens
        await getSession();
      }
    } catch (error) {
      console.error('Failed to refresh session:', error);
    }
  }

  // Start auto-refresh when component mounts
  function startAutoRefresh() {
    if (!refreshInterval && status.value === 'authenticated') {
      refreshInterval = setInterval(refreshSession, REFRESH_INTERVAL);
      // Also refresh immediately to ensure we're up to date
      refreshSession();
    }
  }

  // Clean up interval when component unmounts
  function stopAutoRefresh() {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  }

  onMounted(startAutoRefresh);
  onUnmounted(stopAutoRefresh);

  // Watch auth status changes
  watch(status, (newStatus) => {
    if (newStatus === 'authenticated') {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }
  });

  return {
    refreshSession
  };
}
