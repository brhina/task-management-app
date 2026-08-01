import net from "net";
import { describe, expect, it } from "vitest";
import { getAvailablePort } from "./port.js";

const reservePort = async (): Promise<number> => {
  const server = net.createServer();

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Unable to assign temporary port");
  }

  return address.port;
};

describe("getAvailablePort", () => {
  it("returns the next fallback port when the preferred port is busy", async () => {
    const busyPort = await reservePort();
    const fallbackPort = await getAvailablePort(busyPort, [busyPort + 1]);

    expect(fallbackPort).toBe(busyPort + 1);
  });
});
