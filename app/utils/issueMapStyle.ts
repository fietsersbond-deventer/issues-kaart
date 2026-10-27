import type { MapIssue, NewIssue } from "~~/shared/types/Issue";
import type { Feature } from "ol";
import { Style, Circle, Fill, Stroke, Icon } from "ol/style";
import Color from "color";

/** Builds the current map style without owning reactive map state. */
export function getIssueMapStyle(
  feature: Feature,
  issue: MapIssue | NewIssue | undefined,
  selected: boolean,
  zoom: number,
): Style | Style[] | undefined {
  if (!issue) return;

  switch (feature.getGeometry()!.getType()) {
    case "Point":
      return createPointStyle(issue, selected, zoom);
    case "LineString":
      return createLineStyle(issue, selected);
    default:
      return createPolygonStyle(issue, selected);
  }
}

function createPointStyle(
  issue: MapIssue | NewIssue,
  selected: boolean,
  zoom: number,
): Style | Style[] {
  const issueColor = issue.legend?.color;
  const zIndex = selected ? 1000 : 1;

  // If the issue has an icon, use it with black circle when selected
  if (issue.legend?.icon) {
    if (issue.legend?.icon_data_url) {
      const minScale = 0.2; // Small when zoomed out (low zoom values)
      const maxScale = 0.7; // larger when zoomed in (high zoom values)
      const finalScale = minScale + ((zoom - 10) / 8) * (maxScale - minScale);
      // Clamp to min/max bounds
      const clampedScale = Math.max(minScale, Math.min(maxScale, finalScale));

      const iconStyle = new Style({
        image: new Icon({
          src: issue.legend.icon_data_url,
          scale: clampedScale,
          anchor: [0.5, 0.5],
        }),
        zIndex,
      });

      // Add black border overlay if selected (scale border with icon)
      if (selected) {
        // Calculate actual rendered icon size: base canvas size (64px) * current scale
        const baseIconSize = 64; // This matches the canvas size from iconCanvas.ts (32 * 2)
        const actualIconSize = baseIconSize * clampedScale;
        const iconRadius = actualIconSize / 2; // Icon is circular, so radius is half the size
        const borderRadius = iconRadius + 1; // Border extends 1px beyond the icon edge
        const borderStyle = new Style({
          image: new Circle({
            radius: Math.max(6, borderRadius),
            fill: new Fill({ color: "transparent" }),
            stroke: new Stroke({ color: "black", width: 3 }),
          }),
          zIndex: zIndex + 1, // Border slightly above the icon
        });
        return [iconStyle, borderStyle]; // Return both styles
      }

      return iconStyle;
    }

    const minRadius = 3; // Small when zoomed out (low zoom values)
    const maxRadius = 7; // Normal size when zoomed in (high zoom values)
    const finalRadius = minRadius + ((zoom - 10) / 8) * (maxRadius - minRadius);
    // Clamp to min/max bounds
    const clampedRadius = Math.max(minRadius, Math.min(maxRadius, finalRadius));

    const circleStyle = new Style({
      image: new Circle({
        radius: clampedRadius,
        fill: new Fill({ color: issue.legend?.color || "#2196F3" }),
        stroke: new Stroke({
          color: "white",
          width: Math.max(1, clampedRadius / 6),
        }),
      }),
      zIndex,
    });

    // Add black border overlay if selected (scale with circle)
    if (selected) {
      const borderRadius = finalRadius + 3;
      const borderStyle = new Style({
        image: new Circle({
          radius: borderRadius,
          fill: new Fill({ color: "transparent" }),
          stroke: new Stroke({ color: "black", width: 3 }),
        }),
        zIndex: zIndex + 1, // Border slightly above the circle
      });
      return [circleStyle, borderStyle]; // Return both styles
    }

    return circleStyle;
  } else {
    // Fallback to circle for issues without icons
    return new Style({
      image: new Circle({
        radius: 8,
        fill: new Fill({ color: issueColor }),
        stroke: new Stroke({
          color: selected ? "black" : "white",
          width: 2,
        }),
      }),
      zIndex,
    });
  }
}

function createLineStyle(
  issue: MapIssue | NewIssue,
  selected: boolean,
): Style | Style[] {
  const issueColor = issue.legend?.color;
  const zIndex = selected ? 1000 : 1;

  const lineWidth = 3;
  const selectedLineWidth = 6;

  if (selected) {
    // Draw black border first (thicker), then colored line on top
    const borderStyle = new Style({
      stroke: new Stroke({
        color: "black",
        width: selectedLineWidth + 2, // 2px wider than the colored line
      }),
      zIndex: zIndex, // Border at base z-index
    });

    const lineStyle = new Style({
      stroke: new Stroke({
        color: issueColor,
        width: selectedLineWidth,
      }),
      zIndex: zIndex + 1, // Line slightly above the border
    });

    return [borderStyle, lineStyle]; // Return both styles - border first, then line
  } else {
    return new Style({
      stroke: new Stroke({
        color: issueColor,
        width: lineWidth,
      }),
      zIndex,
    });
  }
}

function createPolygonStyle(
  issue: MapIssue | NewIssue,
  selected: boolean,
): Style {
  const issueColor = issue.legend?.color;
  const zIndex = selected ? 1000 : 1;

  return new Style({
    stroke: new Stroke({
      color: selected ? "black" : issueColor,
      width: 2,
    }),
    fill: new Fill({
      color: getPolygonFillColor(issue).toString(),
    }),
    zIndex,
  });
}

function getPolygonFillColor(issue: MapIssue | NewIssue) {
  const color = new Color(issue.legend?.color || "#000000");
  return color.fade(0.5);
}
