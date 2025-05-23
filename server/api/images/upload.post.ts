export default eventHandler(async (event) => {
  requireUserSession(event);
  return hubBlob().handleUpload(event, {
    multiple: false,
    ensure: {
      maxSize: "8MB",
      types: ["image/png", "image/jpeg", "image/webp"],
    },
  });
});
