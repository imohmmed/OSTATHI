import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123";

// Simple in-memory session (for single-admin use)
const sessions = new Set<string>();

function generateSessionId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function requireAdmin(req: any, res: any, next: any) {
  const sessionId = req.headers["x-session-id"] as string | undefined;
  if (!sessionId || !sessions.has(sessionId)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

router.post("/admin/login", async (req, res): Promise<void> => {
  const { username, password } = req.body ?? {};
  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const sessionId = generateSessionId();
  sessions.add(sessionId);
  req.log.info({ username }, "Admin logged in");
  res.json({ username, isAuthenticated: true, sessionId });
});

router.post("/admin/logout", async (req, res): Promise<void> => {
  const sessionId = req.headers["x-session-id"] as string | undefined;
  if (sessionId) sessions.delete(sessionId);
  res.json({ success: true });
});

router.get("/admin/me", async (req, res): Promise<void> => {
  const sessionId = req.headers["x-session-id"] as string | undefined;
  if (!sessionId || !sessions.has(sessionId)) {
    res.status(401).json({ isAuthenticated: false, username: "" });
    return;
  }
  res.json({ username: ADMIN_USERNAME, isAuthenticated: true });
});

export default router;
