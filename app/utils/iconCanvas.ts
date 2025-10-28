/**
 * Creates a plain SVG data URL from a Material Design Icon
 * Returns just the icon without any background circle for flexible styling
 */
export function createIconSvgDataUrl(
  iconName: string,
  color?: string
): Promise<string> {
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

          // Create plain SVG with just the icon (no background circle) - color neutral
          svgContent = `
            <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <text x="12" y="12" font-family="Material Design Icons" font-size="18" 
                    fill="currentColor" text-anchor="middle" dominant-baseline="central">${iconChar}</text>
            </svg>
          `;
        } else {
          // No icon found, return empty SVG (color neutral)
          svgContent = `
            <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            </svg>
          `;
        }

        // Clean up DOM
        document.body.removeChild(tempDiv);

        // Convert SVG to data URL using utf8 encoding (same as fallback)
        const svgDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(
          svgContent.trim()
        )}`;
        resolve(svgDataUrl);
      } catch (err) {
        console.warn("Error generating icon SVG:", err);
        // Cleanup
        if (document.body.contains(tempDiv)) {
          document.body.removeChild(tempDiv);
        }

        // Create empty SVG fallback (color neutral)
        const fallbackSvg = `
          <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          </svg>
        `;

        const svgDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(
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

    // Create canvas - use reasonable resolution for web display
    const canvas = document.createElement("canvas");
    const displaySize = 32; // 32px base size matches preview size
    const scale = 2; // Render at 2x resolution for crisp display (reduced from 3x)
    const size = displaySize * scale; // 64px actual canvas size (reduced from 96px)
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Could not get canvas context"));
      return;
    }

    // Scale the context for high-DPI rendering
    ctx.scale(scale, scale);

    // Wait for fonts to load and then render
    setTimeout(() => {
      try {
        // Clear canvas to transparent
        ctx.clearRect(0, 0, displaySize, displaySize);

        // Calculate contrasting color for the icon
        const getContrastColor = (bgColor: string) => {
          // Remove # if present
          const hex = bgColor.replace("#", "");
          // Convert to RGB
          const r = parseInt(hex.substr(0, 2), 16);
          const g = parseInt(hex.substr(2, 2), 16);
          const b = parseInt(hex.substr(4, 2), 16);
          // Calculate brightness
          const brightness = (r * 299 + g * 587 + b * 114) / 1000;
          // Return black for light backgrounds, white for dark
          return brightness > 128 ? "#000000" : "#ffffff";
        };

        const iconColor = getContrastColor(color);

        // Draw colored circle background with white border (using display size coordinates)
        const borderWidth = 2;
        const radius = displaySize / 2 - borderWidth; // Leave more room for border

        // Draw white border circle
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(
          displaySize / 2,
          displaySize / 2,
          displaySize / 2 - 1,
          0,
          2 * Math.PI
        );
        ctx.fill();

        // Draw colored circle inside with clear border separation
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(displaySize / 2, displaySize / 2, radius, 0, 2 * Math.PI);
        ctx.fill();

        // Try to get the icon content
        const computedStyle = window.getComputedStyle(iconElement, "::before");
        const content = computedStyle.getPropertyValue("content");

        // Set icon color to contrasting color
        ctx.fillStyle = iconColor;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle"; // Better centering

        if (content && content !== "none" && content !== '""') {
          // Use MDI font with appropriate size for 32px display
          ctx.font = '18px "Material Design Icons"'; // Reduced from 20px for smaller canvas

          // Parse the unicode content
          const iconChar = content
            .replace(/['"]/g, "")
            .replace(/\\([0-9a-fA-F]+)/g, (match, hex) => {
              return String.fromCharCode(parseInt(hex, 16));
            });

          // Draw icon centered
          ctx.fillText(iconChar, displaySize / 2, displaySize / 2);
        } else {
          // Fallback: use first letter with larger font
          ctx.fillStyle = iconColor;
          ctx.font = "bold 16px Arial"; // Increased from 10px
          const fallbackChar = iconName
            .replace(/^mdi-/, "")
            .charAt(0)
            .toUpperCase();
          ctx.fillText(fallbackChar, displaySize / 2, displaySize / 2);
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

        // Create simple fallback - smaller colored circle with white border (high-res)
        const borderWidth = 2;
        const radius = displaySize / 2 - borderWidth;

        // Draw white border circle
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(
          displaySize / 2,
          displaySize / 2,
          displaySize / 2 - 1,
          0,
          2 * Math.PI
        );
        ctx.fill();

        // Draw colored circle inside with clear border separation
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(displaySize / 2, displaySize / 2, radius, 0, 2 * Math.PI);
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

  return `data:image/svg+xml;utf8,${encodeURIComponent(svgContent.trim())}`;
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
