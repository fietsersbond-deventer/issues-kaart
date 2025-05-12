export default defineEventHandler(async (event) => {
  console.log(getRequestURL(event).pathname);
});
