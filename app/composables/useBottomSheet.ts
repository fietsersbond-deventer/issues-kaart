export interface BottomSheetOptions {
  defaultHeight?: number;
  minHeight?: number;
  maxHeight?: number;
  snapPoints?: number[];
  snapThreshold?: number;
}

export function useBottomSheet(options: BottomSheetOptions = {}) {
  const {
    defaultHeight = 30,
    minHeight = 10,
    maxHeight = 75,
    snapPoints = [30, 75],
    snapThreshold = 10, // Only snap if within 10% of a snap point
  } = options;

  const sheetHeight = ref(defaultHeight);
  const startY = ref(0);
  const initialHeight = ref(0);
  const isDragging = ref(false);

  // Touch event handlers
  function startDrag(event: TouchEvent) {
    if (event.cancelable) {
      event.preventDefault();
    }
    if (event.touches[0]) {
      startY.value = event.touches[0].clientY;
      initialHeight.value = sheetHeight.value;
    }
  }

  function onDrag(event: TouchEvent) {
    if (event.cancelable) {
      event.preventDefault();
    }
    if (event.touches[0]) {
      const deltaY = startY.value - event.touches[0].clientY;
      const deltaPercentage = (deltaY / window.innerHeight) * 100;
      sheetHeight.value = Math.min(
        Math.max(initialHeight.value + deltaPercentage, minHeight),
        maxHeight
      );
    }
  }

  function endDrag() {
    snapToHeight();
  }

  // Mouse event handlers
  function startDragMouse(event: MouseEvent) {
    event.preventDefault();
    isDragging.value = true;
    startY.value = event.clientY;
    initialHeight.value = sheetHeight.value;

    document.addEventListener("mousemove", onDragMouse);
    document.addEventListener("mouseup", endDragMouse);
  }

  function onDragMouse(event: MouseEvent) {
    if (!isDragging.value) return;

    const deltaY = startY.value - event.clientY;
    const deltaPercentage = (deltaY / window.innerHeight) * 100;
    sheetHeight.value = Math.min(
      Math.max(initialHeight.value + deltaPercentage, minHeight),
      maxHeight
    );
  }

  function endDragMouse() {
    isDragging.value = false;
    document.removeEventListener("mousemove", onDragMouse);
    document.removeEventListener("mouseup", endDragMouse);
    snapToHeight();
  }

  function snapToHeight() {
    // Find the closest snap point
    if (snapPoints.length === 0) return;

    const closestSnap = snapPoints.reduce((closest, snapPoint) => {
      const currentDistance = Math.abs(sheetHeight.value - snapPoint);
      const closestDistance = Math.abs(sheetHeight.value - closest);
      return currentDistance < closestDistance ? snapPoint : closest;
    });

    const distanceToClosest = Math.abs(sheetHeight.value - closestSnap);

    // Only snap if within threshold
    if (distanceToClosest <= snapThreshold) {
      sheetHeight.value = closestSnap;
    }
    // Otherwise, keep the current height (no snapping)
  }

  function setHeight(height: number) {
    sheetHeight.value = Math.min(Math.max(height, minHeight), maxHeight);
  }

  function reset() {
    sheetHeight.value = defaultHeight;
  }

  return {
    sheetHeight,
    startDrag,
    onDrag,
    endDrag,
    startDragMouse,
    setHeight,
    reset,
  };
}
