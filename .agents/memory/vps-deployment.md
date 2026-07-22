---
name: VPS deployment mechanics
description: How code actually reaches the user's phone/API — Replit edits do nothing until synced to the VPS and rebuilt/restarted.
---

The user's phone connects to Expo Metro on the VPS (`exp://VPS_IP:8081`), and the API runs from a compiled bundle on the VPS. **Editing files in Replit has zero effect until deployed.**

**Why:** Two sessions were lost debugging "changes not appearing" — the phone was loading bundles from the VPS, which had stale code.

**How to apply — mobile changes:**
1. `scp -r app components contexts hooks constants` from `artifacts/ustadhi-mobile` to `/var/www/OSTATHI/artifacts/ustadhi-mobile/` (rsync is NOT installed in Replit; use `sshpass -p "$VPS_PASSWORD" scp`).
2. Metro runs in CI mode (no file watching) — must restart: kill the expo pid, then `cd /var/www/OSTATHI/artifacts/ustadhi-mobile && setsid env CI=1 npx expo start --port 8081 < /dev/null > /tmp/expo-metro.log 2>&1 &` (use `(… &)` subshell; plain pkill patterns can kill the SSH session → exit 255).
3. Verify: `curl "http://localhost:8081/index.bundle?platform=ios&dev=true&hot=false"` on the VPS returns 200. User must fully close & reopen Expo Go.

**How to apply — API changes:**
1. pm2 `ostathi-api` runs `dist/index.mjs` (compiled) — copying `src` alone does nothing.
2. Sync `artifacts/api-server/src` + `package.json` AND shared `lib/db/src` (build imports it; stale lib/db → "No matching export" build failures).
3. `pnpm install --filter @workspace/api-server` at repo root if deps changed, then `pnpm run build` in api-server, then `pm2 restart ostathi-api`.
4. Verify with curl against `https://thegoldenvision.site/api/...` (502 = crashed, check `/root/.pm2/logs/ostathi-api-error.log`).

**Admin auth:** `requireAdmin` accepts either a session (`x-session-id`/Bearer from `/api/admin/login`, used by web) or `x-admin-token` = admin password (used by mobile). Keep both paths working.
