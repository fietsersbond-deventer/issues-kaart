/**
 * Creates a canvas data URL from a Material Design Icon
 * This utility can be used to pre-generate icon images for map rendering
 */
export function createIconCanvasDataUrl(
  iconName: string,
  color: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Create a temporary div with the icon
    const tempDiv = document.createElement("div");
    tempDiv.className = "icon-canvas-temp";
    tempDiv.style.position = "absolute";
    tempDiv.style.left = "-9999px";
    tempDiv.style.width = "32px";
    tempDiv.style.height = "32px";
    tempDiv.style.display = "flex";
    tempDiv.style.alignItems = "center";
    tempDiv.style.justifyContent = "center";

    // Add the icon
    const iconElement = document.createElement("i");
    iconElement.className = `mdi mdi-${iconName.replace(/^mdi-/, "")}`;
    iconElement.style.fontSize = "28px";
    iconElement.style.color = color;
    iconElement.style.lineHeight = "1";

    tempDiv.appendChild(iconElement);
    document.body.appendChild(tempDiv);

    // Create canvas
    const canvas = document.createElement("canvas");
    const size = 32;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Could not get canvas context"));
      return;
    }

    // Wait for fonts to load and then render
    setTimeout(() => {
      try {
        // Clear canvas to transparent
        ctx.clearRect(0, 0, size, size);

        // Try to get the icon content
        const computedStyle = window.getComputedStyle(iconElement, "::before");
        const content = computedStyle.getPropertyValue("content");

        ctx.fillStyle = color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        if (content && content !== "none" && content !== '""') {
          // Use MDI font
          ctx.font = '24px "Material Design Icons"';

          // Parse the unicode content
          const iconChar = content
            .replace(/['"]/g, "")
            .replace(/\\([0-9a-fA-F]+)/g, (match, hex) => {
              return String.fromCharCode(parseInt(hex, 16));
            });

          ctx.fillText(iconChar, size / 2, size / 2);
        } else {
          // Fallback: use first letter in a circle
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, 12, 0, 2 * Math.PI);
          ctx.fill();

          ctx.fillStyle = "white";
          ctx.font = "bold 12px Arial";
          const fallbackChar = iconName
            .replace(/^mdi-/, "")
            .charAt(0)
            .toUpperCase();
          ctx.fillText(fallbackChar, size / 2, size / 2);
        }

        // Clean up DOM
        document.body.removeChild(tempDiv);

        // Return the data URL
        resolve(canvas.toDataURL("image/png"));
      } catch (err) {
        console.warn("Error generating icon canvas:", err);
        // Cleanup
        if (document.body.contains(tempDiv)) {
          document.body.removeChild(tempDiv);
        }

        // Create simple fallback - just a colored circle without background
        ctx.clearRect(0, 0, size, size);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, 12, 0, 2 * Math.PI);
        ctx.fill();

        resolve(canvas.toDataURL("image/png"));
      }
    }, 100); // Small delay to ensure fonts are loaded
  });
}

/**
 * Simple fallback function that creates a colored circle
 */
export function createFallbackIconDataUrl(color: string): string {
  const canvas = document.createElement("canvas");
  const size = 32;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // Draw colored circle
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 12, 0, 2 * Math.PI);
  ctx.fill();

  // Draw white border
  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  ctx.stroke();

  return canvas.toDataURL("image/png");
}
