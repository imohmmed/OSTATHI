import type { Server as HttpServer } from "node:http";
import { Server as SocketServer } from "socket.io";
import { db } from "@workspace/db";
import { livestreamsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

// streamId -> broadcaster socket id
const broadcasters = new Map<string, string>();
// streamId -> Set<socket id> of viewers
const viewers = new Map<string, Set<string>>();

export function attachSocketIO(httpServer: HttpServer) {
  const io = new SocketServer(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    path: "/api/socket.io/",
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    // ── Broadcaster joins ────────────────────────────────
    socket.on("broadcaster-join", ({ streamId, teacherId }: { streamId: string; teacherId: string }) => {
      socket.data.streamId = streamId;
      socket.data.role = "broadcaster";
      socket.join(`room:${streamId}`);
      broadcasters.set(streamId, socket.id);
      if (!viewers.has(streamId)) viewers.set(streamId, new Set());

      db.update(livestreamsTable)
        .set({ status: "live" })
        .where(eq(livestreamsTable.id, parseInt(streamId)))
        .catch(() => {});

      console.log(`[live] broadcaster joined stream ${streamId}`);
    });

    // ── Viewer joins ─────────────────────────────────────
    socket.on("viewer-join", async ({ streamId, viewerId, viewerName }: { streamId: string; viewerId: string; viewerName: string }) => {
      socket.data.streamId = streamId;
      socket.data.viewerId = viewerId;
      socket.data.viewerName = viewerName;
      socket.data.role = "viewer";
      socket.join(`room:${streamId}`);

      if (!viewers.has(streamId)) viewers.set(streamId, new Set());
      viewers.get(streamId)!.add(socket.id);
      const count = viewers.get(streamId)!.size;

      io.to(`room:${streamId}`).emit("viewers-update", { count });

      const broadcasterSocketId = broadcasters.get(streamId);
      if (broadcasterSocketId) {
        // Send stream info first
        try {
          const [stream] = await db
            .select({ title: livestreamsTable.title })
            .from(livestreamsTable)
            .where(eq(livestreamsTable.id, parseInt(streamId)));
          socket.emit("stream-info", { title: stream?.title ?? "بث مباشر", viewersCount: count });
        } catch {}

        // Ask broadcaster to send WebRTC offer to this viewer
        const bs = io.sockets.sockets.get(broadcasterSocketId);
        if (bs) bs.emit("viewer-joined", { viewerId: socket.id });
      } else {
        // Stream not live yet
        try {
          const [stream] = await db
            .select({ title: livestreamsTable.title, scheduledAt: livestreamsTable.scheduledAt, status: livestreamsTable.status })
            .from(livestreamsTable)
            .where(eq(livestreamsTable.id, parseInt(streamId)));
          if (stream) {
            socket.emit("stream-info", { title: stream.title, viewersCount: count });
            socket.emit("not-live", { scheduledAt: stream.scheduledAt });
          }
        } catch {}
      }
    });

    // ── WebRTC: offer (broadcaster -> specific viewer) ───
    socket.on("offer", ({ to, offer }: { to: string; offer: RTCSessionDescriptionInit }) => {
      io.to(to).emit("offer", { offer });
    });

    // ── WebRTC: answer (viewer -> broadcaster) ───────────
    socket.on("answer", ({ streamId, answer }: { streamId: string; answer: RTCSessionDescriptionInit }) => {
      const bsid = broadcasters.get(streamId);
      if (bsid) io.to(bsid).emit("answer", { from: socket.id, answer });
    });

    // ── WebRTC: ICE candidate (relay) ────────────────────
    socket.on("ice-candidate", ({ to, streamId, candidate }: { to: string; streamId: string; candidate: RTCIceCandidateInit }) => {
      if (to === "broadcaster") {
        const bsid = broadcasters.get(streamId);
        if (bsid) io.to(bsid).emit("ice-candidate", { from: socket.id, candidate });
      } else {
        io.to(to).emit("ice-candidate", { from: socket.id, candidate });
      }
    });

    // ── Comment ──────────────────────────────────────────
    socket.on("comment", ({ streamId, name, text }: { streamId: string; name: string; text: string }) => {
      // Broadcast to everyone in room including sender (already added to DOM by sender)
      socket.to(`room:${streamId}`).emit("new-comment", { name, text });
    });

    // ── End stream ───────────────────────────────────────
    socket.on("end-stream", ({ streamId }: { streamId: string }) => {
      io.to(`room:${streamId}`).emit("stream-ended");
      broadcasters.delete(streamId);
      viewers.delete(streamId);

      db.update(livestreamsTable)
        .set({ status: "ended", endedAt: new Date() })
        .where(eq(livestreamsTable.id, parseInt(streamId)))
        .catch(() => {});

      console.log(`[live] stream ${streamId} ended`);
    });

    // ── Disconnect ───────────────────────────────────────
    socket.on("disconnect", () => {
      const streamId = socket.data.streamId;
      if (!streamId) return;

      if (socket.data.role === "broadcaster" && broadcasters.get(streamId) === socket.id) {
        broadcasters.delete(streamId);
        viewers.delete(streamId);
        io.to(`room:${streamId}`).emit("stream-ended");

        db.update(livestreamsTable)
          .set({ status: "ended", endedAt: new Date() })
          .where(eq(livestreamsTable.id, parseInt(streamId)))
          .catch(() => {});
      } else {
        const vSet = viewers.get(streamId);
        if (vSet) {
          vSet.delete(socket.id);
          io.to(`room:${streamId}`).emit("viewers-update", { count: vSet.size });
        }
      }
    });
  });

  return io;
}
