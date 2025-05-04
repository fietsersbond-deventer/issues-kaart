import { useSessionStorage } from "@vueuse/core";

export function useRedirectAfterLogin() {
  const savedPath = useSessionStorage<string>("redirect", "");

  function saveRedirect(path: string) {
    if (savedPath.value) {
      console.debug(
        `ignoring redirect ${path}, already set to ${savedPath.value}`
      );
      return;
    }
    console.debug("saveRedirect", path);
    savedPath.value = path;
  }

  function redirect(to: string, from?: string) {
    if (!from) {
      from = `${document.location.pathname}${document.location.search}${document.location.hash}`;
    }
    saveRedirect(from);
    document.location.href = to;
  }

  async function restoreRedirect() {
    if (savedPath.value && savedPath.value !== document.location.href) {
      console.debug("restoreRedirect", savedPath.value);
      const path = savedPath.value;
      savedPath.value = "";
      await navigateTo(path, {
        replace: true,
        external: path.startsWith("http"),
      });
    }
  }

  return {
    savedPath,
    redirect,
    saveRedirect,
    restoreRedirect,
  };
}
