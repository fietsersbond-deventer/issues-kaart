import inter400 from "@/assets/fonts/inter-400.woff2?url";
import inter500 from "@/assets/fonts/inter-500.woff2?url";
import inter600 from "@/assets/fonts/inter-600.woff2?url";
import inter700 from "@/assets/fonts/inter-700.woff2?url";

// Preload zodat de fonts niet pas na het parsen van de CSS worden ontdekt.
// `crossorigin` is verplicht voor fonts, ook same-origin.
export default defineNuxtPlugin(() => {
  useHead({
    link: [inter400, inter500, inter600, inter700].map((href) => ({
      rel: "preload",
      as: "font",
      type: "font/woff2",
      href,
      crossorigin: "anonymous",
    })),
  });
});
