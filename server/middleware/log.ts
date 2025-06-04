import morgan from "morgan";

export default defineEventHandler(async (event) => {
  const logger = morgan("common");
  logger(event.node.req, event.node.res, function () {});
});
