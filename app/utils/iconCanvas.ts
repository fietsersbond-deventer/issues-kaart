/**
 * Creates a plain SVG data URL from a Material Design Icon
 * Returns just the icon without any background circle for flexible styling
 */
export function createIconSvgDataUrl(iconName: string): Promise<string> {
  return new Promise((resolve) => {
    // Create a temporary div with the icon
    const tempDiv = document.createElement("div");
    tempDiv.className = "icon-canvas-temp";
    tempDiv.style.position = "absolute";
    tempDiv.style.left = "-9999px";
    tempDiv.style.width = "24px";
    tempDiv.style.height = "24px";
    tempDiv.style.display = "flex";
    tempDiv.style.alignItems = "center";
    tempDiv.style.justifyContent = "center";

    // Add the icon
    const iconElement = document.createElement("i");
    iconElement.className = `mdi mdi-${iconName.replace(/^mdi-/, "")}`;
    iconElement.style.fontSize = "18px";
    iconElement.style.color = "white";
    iconElement.style.lineHeight = "1";

    tempDiv.appendChild(iconElement);
    document.body.appendChild(tempDiv);

    // Wait for fonts to load and then extract the icon
    setTimeout(() => {
      try {
        // Try to get the icon content
        const computedStyle = window.getComputedStyle(iconElement, "::before");
        const content = computedStyle.getPropertyValue("content");

        let svgContent = "";

        if (content && content !== "none" && content !== '""') {
          // Parse the unicode content
          const iconChar = content
            .replace(/['"]/g, "")
            .replace(/\\([0-9a-fA-F]+)/g, (match, hex) => {
              return String.fromCharCode(parseInt(hex, 16));
            });

          // Create plain SVG with just the icon (no background circle)
          svgContent = `
            <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <text x="12" y="12" font-family="Material Design Icons" font-size="18" 
                    fill="white" text-anchor="middle" dominant-baseline="central">${iconChar}</text>
            </svg>
          `;
        } else {
          // No icon found, return empty SVG
          svgContent = `
            <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            </svg>
          `;
        }

        // Clean up DOM
        document.body.removeChild(tempDiv);

        // Convert SVG to data URL
        const svgDataUrl = `data:image/svg+xml;base64,${btoa(
          svgContent.trim()
        )}`;
        resolve(svgDataUrl);
      } catch (err) {
        console.warn("Error generating icon SVG:", err);
        // Cleanup
        if (document.body.contains(tempDiv)) {
          document.body.removeChild(tempDiv);
        }

        // Create empty SVG fallback
        const fallbackSvg = `
          <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          </svg>
        `;

        const svgDataUrl = `data:image/svg+xml;base64,${btoa(
          fallbackSvg.trim()
        )}`;
        resolve(svgDataUrl);
      }
    }, 100); // Small delay to ensure fonts are loaded
  });
}

/**
 * Creates a canvas data URL from a Material Design Icon (legacy function)
 * Consider using createIconSvgDataUrl for better flexibility
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

        // Draw colored circle background
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2 - 1, 0, 2 * Math.PI);
        ctx.fill();

        // Try to get the icon content
        const computedStyle = window.getComputedStyle(iconElement, "::before");
        const content = computedStyle.getPropertyValue("content");

        // Set icon color to white for contrast
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        if (content && content !== "none" && content !== '""') {
          // Use MDI font
          ctx.font = '20px "Material Design Icons"';

          // Parse the unicode content
          const iconChar = content
            .replace(/['"]/g, "")
            .replace(/\\([0-9a-fA-F]+)/g, (match, hex) => {
              return String.fromCharCode(parseInt(hex, 16));
            });

          ctx.fillText(iconChar, size / 2, size / 2);
        } else {
          // Fallback: use first letter
          ctx.fillStyle = "white";
          ctx.font = "bold 14px Arial";
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

        // Create simple fallback - colored circle with white icon
        ctx.clearRect(0, 0, size, size);

        // Draw colored circle background
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2 - 1, 0, 2 * Math.PI);
        ctx.fill();

        resolve(canvas.toDataURL("image/png"));
      }
    }, 100); // Small delay to ensure fonts are loaded
  });
}

/**
 * Simple function that creates a neutral SVG circle
 */
export function createFallbackIconSvgDataUrl(): string {
  const svgContent = `
    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="15" fill="currentColor"/>
    </svg>
  `;

  return `data:image/svg+xml;base64,${btoa(svgContent.trim())}`;
}

/**
 * Simple fallback function that creates a colored circle (legacy)
 */
export function createFallbackIconDataUrl(color: string): string {
  const canvas = document.createElement("canvas");
  const size = 32;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // Draw colored circle background
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 1, 0, 2 * Math.PI);
  ctx.fill();

  return canvas.toDataURL("image/png");
}
