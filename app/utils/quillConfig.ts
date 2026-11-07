import { imageCompressor } from "quill-image-compress";

export const defaultQuillToolbar = [
  [{ header: [2, 3, 4, false] }],
  ["bold", "italic"],
  ["link", "image"],
  [{ list: "ordered" }, { list: "bullet" }, { list: "check" }],
  [{ indent: "-1" }, { indent: "+1" }],
];

export const defaultQuillModules = [
  {
    name: "compress",
    module: imageCompressor,
    options: {
      quality: 0.7,
      maxWidth: 1000,
      maxHeight: 1000,
      imageType: "image/jpeg",
      debug: true,
      suppressErrorLogging: false,
      handleOnPaste: true,
      insertIntoEditor: undefined,
    },
  },
];

export function isQuillContentEmpty(val?: string | null): boolean {
  if (!val) return true;
  const text = val
    .replace(/<p><br><\/p>/g, "")
    .replace(/<[^>]*>/g, "")
    .trim();
  if (text.length > 0) return false;
  if (val.includes("<img") || val.includes("streetview-embed")) return false;
  return true;
}
