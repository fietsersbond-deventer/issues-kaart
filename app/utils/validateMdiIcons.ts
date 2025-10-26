/**
 * Utility to validate MDI icon availability in the browser
 * Note: This is now handled by the ValidatedIcon component
 */

/**
 * Check if an MDI icon exists by testing if the CSS content property is set
 */
export function isMdiIconAvailable(iconName: string): boolean {
  if (typeof window === 'undefined') return true; // SSR compatibility
  
  // Remove mdi- prefix if present
  const cleanIconName = iconName.replace(/^mdi-/, '');
  
  // Create a temporary element to test the icon
  const testElement = document.createElement('i');
  testElement.className = `mdi mdi-${cleanIconName}`;
  testElement.style.position = 'absolute';
  testElement.style.left = '-9999px';
  testElement.style.fontSize = '16px';
  
  document.body.appendChild(testElement);
  
  try {
    const computedStyle = window.getComputedStyle(testElement, '::before');
    const content = computedStyle.getPropertyValue('content');
    
    // Remove the element
    document.body.removeChild(testElement);
    
    // Check if content is set and not 'none' or empty quotes
    return !!(content && content !== 'none' && content !== '""' && content !== "''");
  } catch {
    // Cleanup on error
    if (document.body.contains(testElement)) {
      document.body.removeChild(testElement);
    }
    return false;
  }
}

/**
 * Filter an array of icon names to only include available ones
 */
export function filterAvailableIcons(iconNames: string[]): string[] {
  return iconNames.filter(iconName => isMdiIconAvailable(iconName));
}