import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  studentsTable,
  teachersTable,
  assistantsTable,
  parentsTable,
  subjectsTable,
  coursesTable,
  livestreamsTable,
  reviewsTable,
} from "@workspace/db";
import { sql, eq } from "drizzle-orm";
import { requireAdmin } from "./admin";

const router: IRouter = Router();

router.get("/stats", requireAdmin, async (req, res): Promise<void> => {
  const [
    [{ count: totalStudents }],
    [{ count: totalTeachers }],
    [{ count: totalAssistants }],
    [{ count: totalParents }],
    [{ count: totalSubjects }],
    [{ count: totalCourses }],
    [{ count: activeStreams }],
    [{ count: recentReviews }],
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(studentsTable),
    db.select({ count: sql<number>`count(*)::int` }).from(teachersTable),
    db.select({ count: sql<number>`count(*)::int` }).from(assistantsTable),
    db.select({ count: sql<number>`count(*)::int` }).from(parentsTable),
    db.select({ count: sql<number>`count(*)::int` }).from(subjectsTable),
    db.select({ count: sql<number>`count(*)::int` }).from(coursesTable),
    db.select({ count: sql<number>`count(*)::int` }).from(livestreamsTable).where(eq(livestreamsTable.status, "live")),
    db.select({ count: sql<number>`count(*)::int` }).from(reviewsTable),
  ]);

  res.json({
    totalStudents,
    totalTeachers,
    totalAssistants,
    totalParents,
    totalSubjects,
    totalCourses,
    activeStreams,
    recentReviews,
  });
});

export default router;
