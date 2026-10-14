import { loadIcon } from "@iconify/vue";

const DISPLAY_SIZE = 32;
const SCALE = 2; // render at 2x for crisp display
const ICON_SIZE = 18;

// Legacy icons are stored as "mdi-name"; all others as "prefix:name"
function toIconifyName(iconName: string): string {
  return iconName.includes(":")
    ? iconName
    : `mdi:${iconName.replace(/^mdi-/, "")}`;
}

function createCanvas(color: string) {
  const canvas = document.createElement("canvas");
  canvas.width = DISPLAY_SIZE * SCALE;
  canvas.height = DISPLAY_SIZE * SCALE;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(SCALE, SCALE);

  const center = DISPLAY_SIZE / 2;
  // white border, then colored disc
  for (const [fill, radius] of [
    ["white", center - 1],
    [color, center - 2],
  ] as const) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, 2 * Math.PI);
    ctx.fill();
  }
  return { canvas, ctx };
}

async function loadIconImage(iconName: string, color: string) {
  const icon = await loadIcon(toIconifyName(iconName));
  const width = icon.width ?? 16;
  const height = icon.height ?? 16;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" color="${color}">${icon.body}</svg>`;

  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () =>
      reject(new Error(`Could not render icon ${iconName}`));
    image.src = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  });
  return { image, width, height };
}

/**
 * Renders an icon (MDI or any Iconify set) in a colored circle as a PNG data URL.
 */
export async function createIconCanvasDataUrl(
  iconName: string,
  color: string,
): Promise<string> {
  const { image, width, height } = await loadIconImage(
    iconName,
    getContrastColor(color),
  );
  const { canvas, ctx } = createCanvas(color);

  const ratio = Math.min(ICON_SIZE / width, ICON_SIZE / height);
  const w = width * ratio;
  const h = height * ratio;
  ctx.drawImage(image, (DISPLAY_SIZE - w) / 2, (DISPLAY_SIZE - h) / 2, w, h);

  return canvas.toDataURL("image/png");
}

/**
 * A plain colored circle, used when the icon cannot be rendered.
 */
export function createFallbackIconDataUrl(color: string): string {
  return createCanvas(color).canvas.toDataURL("image/png");
}
