import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, usersTable, sessionsTable } from "@workspace/db";

const router = Router();

function checkSecret(req: any, res: any): boolean {
  const secret = req.headers["x-admin-secret"];
  if (!secret || secret !== process.env.SESSION_SECRET) {
    res.status(403).json({ ok: false, reason: "Forbidden" });
    return false;
  }
  return true;
}

router.get("/admin/users", async (req, res) => {
  if (!checkSecret(req, res)) return;
  const users = await db
    .select({ username: usersTable.username, email: usersTable.email, createdAt: usersTable.createdAt })
    .from(usersTable)
    .orderBy(desc(usersTable.createdAt));
  res.json({ ok: true, users });
});

router.delete("/admin/delete-user", async (req, res) => {
  if (!checkSecret(req, res)) return;
  const username = String(req.query.username || "").trim().toLowerCase();
  if (!username) { res.status(400).json({ ok: false, reason: "Missing username" }); return; }
  await db.delete(sessionsTable).where(eq(sessionsTable.usernameLower, username));
  await db.delete(usersTable).where(eq(usersTable.usernameLower, username));
  res.json({ ok: true, message: `User '${username}' deleted.` });
});

export default router;
