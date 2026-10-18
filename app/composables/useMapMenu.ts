/** Open state of the side panel (layers, legend); shared by the map and the layouts */
export function useMapMenu() {
  const open = useState<boolean>("map-menu-open", () => false);
  return { open };
}
