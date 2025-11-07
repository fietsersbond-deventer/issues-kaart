/**
 * Composable for tracking custom events in Matomo
 * Usage: const { trackEvent } = useMatomoTracking()
 *        trackEvent('Issue', 'Modified', 'Issue #123 by john.doe')
 */

export function useMatomoTracking() {
  const trackEvent = (
    category: string,
    action: string,
    name?: string,
    value?: number
  ) => {
    if (typeof window === "undefined") {
      return; // Skip on server
    }

    if (!window._paq) {
      console.debug("Matomo not initialized");
      return;
    }

    // trackEvent: category, action, [name], [value]
    window._paq.push(["trackEvent", category, action, name, value]);
  };

  return {
    trackEvent,
  };
}
