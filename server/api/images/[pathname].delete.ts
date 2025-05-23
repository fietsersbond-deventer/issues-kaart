export default eventHandler(async (event) => {
  requireUserSession(event);
  const { pathname } = event.context.params || {};

  return hubBlob().delete(pathname);
});
