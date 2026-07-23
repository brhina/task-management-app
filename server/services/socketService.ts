import type { Server as HttpServer } from "http";
import { Server, type Socket } from "socket.io";
import { verifyToken } from "../utils/jwtUtils.js";

let io: Server | null = null;

/** userId -> set of socket ids */
const userSockets = new Map<string, Set<string>>();
/** socketId -> { userId, orgId, viewingTaskId? } */
const socketMeta = new Map<
  string,
  { userId: string; orgId?: string; viewingTaskId?: string; name?: string }
>();

export function getIO(): Server | null {
  return io;
}

export function initSocketServer(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers.authorization || "").replace("Bearer ", "");
      if (!token) return next(new Error("Unauthorized"));
      const decoded = verifyToken(token) as { id: string };
      (socket as any).userId = decoded.id;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const userId = (socket as any).userId as string;
    if (!userSockets.has(userId)) userSockets.set(userId, new Set());
    userSockets.get(userId)!.add(socket.id);
    socketMeta.set(socket.id, { userId });

    socket.on("join_org", (orgId: string) => {
      const meta = socketMeta.get(socket.id);
      if (meta) meta.orgId = orgId;
      socket.join(`org:${orgId}`);
    });

    socket.on("viewing_task", (payload: { taskId: string; name?: string }) => {
      const meta = socketMeta.get(socket.id);
      if (!meta) return;
      meta.viewingTaskId = payload.taskId;
      meta.name = payload.name;
      if (meta.orgId) {
        socket.to(`org:${meta.orgId}`).emit("presence_update", {
          userId: meta.userId,
          name: meta.name,
          viewingTaskId: payload.taskId,
        });
      }
    });

    socket.on("leave_task", () => {
      const meta = socketMeta.get(socket.id);
      if (!meta) return;
      const prev = meta.viewingTaskId;
      meta.viewingTaskId = undefined;
      if (meta.orgId && prev) {
        socket.to(`org:${meta.orgId}`).emit("presence_update", {
          userId: meta.userId,
          name: meta.name,
          viewingTaskId: null,
        });
      }
    });

    socket.on("disconnect", () => {
      const set = userSockets.get(userId);
      set?.delete(socket.id);
      if (set && set.size === 0) userSockets.delete(userId);
      const meta = socketMeta.get(socket.id);
      if (meta?.orgId && meta.viewingTaskId) {
        socket.to(`org:${meta.orgId}`).emit("presence_update", {
          userId: meta.userId,
          name: meta.name,
          viewingTaskId: null,
        });
      }
      socketMeta.delete(socket.id);
    });
  });

  console.log("Socket.io initialized");
  return io;
}

export function emitToUser(userId: string, event: string, payload: unknown): void {
  const sockets = userSockets.get(String(userId));
  if (!sockets || !io) return;
  for (const sid of sockets) {
    io.to(sid).emit(event, payload);
  }
}

export function emitToOrg(orgId: string, event: string, payload: unknown): void {
  if (!io) return;
  io.to(`org:${orgId}`).emit(event, payload);
}

export function getTaskViewers(taskId: string): Array<{ userId: string; name?: string }> {
  const viewers: Array<{ userId: string; name?: string }> = [];
  const seen = new Set<string>();
  for (const meta of socketMeta.values()) {
    if (meta.viewingTaskId === taskId && !seen.has(meta.userId)) {
      seen.add(meta.userId);
      viewers.push({ userId: meta.userId, name: meta.name });
    }
  }
  return viewers;
}
