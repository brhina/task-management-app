import net from "net";

export const getAvailablePort = async (
  preferredPort: number,
  fallbackPorts: number[] = [],
): Promise<number> => {
  const candidates = [preferredPort, ...fallbackPorts];

  for (const port of candidates) {
    const isAvailable = await new Promise<boolean>((resolve) => {
      const tester = net.createServer();

      tester.once("error", () => resolve(false));
      tester.once("listening", () => {
        tester.close(() => resolve(true));
      });

      tester.listen(port, "127.0.0.1");
    });

    if (isAvailable) {
      return port;
    }
  }

  return preferredPort;
};
