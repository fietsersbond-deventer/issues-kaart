import { createServer } from "node:net";
import { appendFileSync } from "node:fs";

// Minimal local SMTP transport sink. No mail can leave the test machine.
export async function startMailSink(file: string) {
  const server = createServer((socket) => {
    socket.setEncoding("utf8");
    socket.write("220 localhost E2E SMTP\r\n");
    let buffer = "";
    let receiving = false;
    let message: string[] = [];
    socket.on("data", (chunk) => {
      buffer += chunk;
      let end: number;
      while ((end = buffer.indexOf("\r\n")) >= 0) {
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        if (receiving) {
          if (line === ".") {
            appendFileSync(file, JSON.stringify(message.join("\r\n")) + "\n");
            receiving = false;
            message = [];
            socket.write("250 queued\r\n");
          } else {
            message.push(line.replace(/^\.\./, "."));
          }
        } else if (/^(EHLO|HELO)/i.test(line)) {
          socket.write("250-localhost\r\n250 8BITMIME\r\n");
        } else if (/^DATA$/i.test(line)) {
          receiving = true;
          socket.write("354 End with dot\r\n");
        } else if (/^QUIT$/i.test(line)) {
          socket.end("221 bye\r\n");
        } else {
          socket.write("250 OK\r\n");
        }
      }
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No SMTP port");
  return { server, port: address.port };
}
