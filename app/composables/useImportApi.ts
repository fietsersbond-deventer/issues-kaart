import type {
  ImportRequest,
  ImportResult,
} from "~~/shared/types/GeojsonImport";
import type { KmzImage } from "~/utils/readImportFile";

/** API calls for the admin import. */
export function useImportApi() {
  const { token } = useAuth();

  const authorization = computed(
    () => `Bearer ${token.value?.replace("Bearer ", "")}`,
  );
  const headers = computed(() => ({
    "Content-Type": "application/json",
    Authorization: authorization.value,
  }));

  /** Has the server download and store a remote image; returns its reference. */
  async function downloadImage(url: string): Promise<string> {
    const { ref } = await $fetch<{ ref: string }>("/api/admin/import/image", {
      method: "POST",
      headers: headers.value,
      body: { url },
    });
    return ref;
  }

  /** Uploads an image from a KMZ archive; returns its reference. */
  async function uploadImage(image: KmzImage): Promise<string> {
    const { ref } = await $fetch<{ ref: string }>("/api/admin/import/image", {
      method: "POST",
      headers: {
        "Content-Type": image.type,
        Authorization: authorization.value,
      },
      body: new Blob([image.bytes as BlobPart], { type: image.type }),
    });
    return ref;
  }

  function importIssues(request: ImportRequest) {
    return $fetch<ImportResult>("/api/admin/import", {
      method: "POST",
      headers: headers.value,
      body: request,
    });
  }

  return { downloadImage, uploadImage, importIssues };
}
