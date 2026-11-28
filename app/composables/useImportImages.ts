import { KMZ_IMAGE_PREFIX, type KmzImage } from "~/utils/readImportFile";

export type ImportImage = {
  /** Remote URL, or a `kmz-file:` source for an image in a KMZ archive. */
  source: string;
  status: "pending" | "done" | "failed";
  /** Server reference ("import-image:…") of the processed image. */
  ref?: string;
  error?: string;
};

const CONCURRENT_UPLOADS = 4;

/**
 * Has the server process the images of an import one by one: remote images
 * are downloaded, KMZ images uploaded. The server keeps the scaled-down
 * images; the browser only keeps a reference, so memory use stays low.
 */
export function useImportImages() {
  const { downloadImage, uploadImage } = useImportApi();
  const images = ref<ImportImage[]>([]);
  const isDownloading = ref(false);
  let kmzImages = new Map<string, KmzImage>();

  const failed = computed(() =>
    images.value.filter((image) => image.status === "failed"),
  );
  const done = computed(() =>
    images.value.filter((image) => image.status === "done"),
  );

  function processImage(source: string): Promise<string> {
    if (!source.startsWith(KMZ_IMAGE_PREFIX)) return downloadImage(source);
    const image = kmzImages.get(source);
    if (!image) throw new Error("Afbeelding ontbreekt in het KMZ-bestand");
    return uploadImage(image);
  }

  async function processPending() {
    isDownloading.value = true;
    try {
      const queue = images.value.filter((image) => image.status === "pending");
      const worker = async () => {
        for (let image = queue.shift(); image; image = queue.shift()) {
          try {
            image.ref = await processImage(image.source);
            image.status = "done";
          } catch (error) {
            image.status = "failed";
            image.error =
              (error as { data?: { message?: string } }).data?.message ??
              (error instanceof Error ? error.message : "Verwerken mislukt");
          }
        }
      };
      await Promise.all(Array.from({ length: CONCURRENT_UPLOADS }, worker));
    } finally {
      isDownloading.value = false;
    }
  }

  /** Processes the given sources; already processed sources are kept. */
  function download(sources: string[], archiveImages = kmzImages) {
    kmzImages = archiveImages;
    const known = new Map(images.value.map((image) => [image.source, image]));
    images.value = sources.map(
      (source) => known.get(source) ?? { source, status: "pending" },
    );
    return processPending();
  }

  function retryFailed() {
    for (const image of failed.value) {
      image.status = "pending";
      image.error = undefined;
    }
    return processPending();
  }

  /** Server reference per image; failed images map to `null` (removed). */
  function replacements(): Map<string, string | null> {
    return new Map(
      images.value.map((image) => [image.source, image.ref ?? null]),
    );
  }

  function reset() {
    images.value = [];
    kmzImages = new Map();
  }

  return {
    images,
    failed,
    done,
    isDownloading,
    download,
    retryFailed,
    replacements,
    reset,
  };
}
