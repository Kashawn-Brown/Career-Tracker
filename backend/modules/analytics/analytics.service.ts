/**
 * analytics.service.ts
 *
 * Query layer for analytics data. Used by admin and user-facing routes.
 * Queries run directly against the structured analytics tables — no separate
 * rollup tables for Phase 9. If specific queries become slow under load,
 * summary tables can be added later.
 */

import { prisma } from "../../lib/prisma.js";

// ─── Shared types ─────────────────────────────────────────────────────────────

export type DateWindow = "1d" | "7d" | "30d" | "1y" | "all";

function windowStart(window: DateWindow): Date | undefined {
  if (window === "all") return undefined;
  const d = new Date();
  if (window === "1d")  { d.setDate(d.getDate() - 1);    return d; }
  if (window === "7d")  { d.setDate(d.getDate() - 7);    return d; }
  if (window === "30d") { d.setDate(d.getDate() - 30);   return d; }
  if (window === "1y")  { d.setFullYear(d.getFullYear() - 1); return d; }
  return undefined;
}

function windowWhere(window: DateWindow, field = "createdAt") {
  const start = windowStart(window);
  return start ? { [field]: { gte: start } } : {};
}


// ─── Admin overview ───────────────────────────────────────────────────────────

export async function getAdminOverview(window: DateWindow) {
  const since = windowStart(window);
  const dateFilter = since ? { gte: since } : undefined;

  const [
    totalUsers,
    newUsers,
    totalApplications,
    newApplications,
    totalAiRuns,
    successfulRuns,
    failedRuns,
    totalArtifacts,
    totalUserArtifacts,
    artifactViews,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: dateFilter } }),
    prisma.jobApplication.count(),
    prisma.jobApplication.count({ where: { createdAt: dateFilter } }),
    prisma.aiRun.count({ where: { createdAt: dateFilter } }),
    prisma.aiRun.count({ where: { status: "SUCCEEDED", createdAt: dateFilter } }),
    prisma.aiRun.count({ where: { status: "FAILED",    createdAt: dateFilter } }),
    prisma.aiArtifact.count(),
    prisma.userAiArtifact.count(),
    prisma.artifactInteraction.count({
      where: { interactionType: "VIEWED", createdAt: dateFilter },
    }),
  ]);

  return {
    users:        { total: totalUsers, new: newUsers },
    applications: { total: totalApplications, new: newApplications },
    aiRuns: {
      total:      totalAiRuns,
      successful: successfulRuns,
      failed:     failedRuns,
      successRate: totalAiRuns > 0
        ? Math.round((successfulRuns / totalAiRuns) * 100)
        : null,
    },
    artifacts: {
      targeted: totalArtifacts,
      generic:  totalUserArtifacts,
      views:    artifactViews,
    },
  };
}


// ─── AI usage breakdown ───────────────────────────────────────────────────────

export async function getAdminAiUsage(window: DateWindow) {
  const dateFilter = windowWhere(window);

  const [byTool, byScope, byPlan, byStatus, recentFailures, topUsers] = await Promise.all([
    // Runs grouped by tool kind
    prisma.aiRun.groupBy({
      by:      ["toolKind"],
      where:   dateFilter,
      _count:  { id: true },
      _avg:    { durationMs: true },
      orderBy: { _count: { id: "desc" } },
      take:    20, // bounded — we only have ~8 tool kinds today
    }),

    // Runs grouped by scope (generic vs targeted)
    prisma.aiRun.groupBy({
      by:      ["scope"],
      where:   dateFilter,
      _count:  { id: true },
    }),

    // Runs grouped by plan at time of run
    prisma.aiRun.groupBy({
      by:      ["planAtTime"],
      where:   dateFilter,
      _count:  { id: true },
      orderBy: { _count: { id: "desc" } },
      take:    10,
    }),

    // Runs grouped by status
    prisma.aiRun.groupBy({
      by:      ["status"],
      where:   dateFilter,
      _count:  { id: true },
    }),

    // Recent failures with context
    prisma.aiRun.findMany({
      where:   { status: "FAILED", ...dateFilter },
      orderBy: { createdAt: "desc" },
      take:    20,
      select: {
        id:            true,
        toolKind:      true,
        scope:         true,
        errorCategory: true,
        errorCode:     true,
        errorMessage:  true,
        durationMs:    true,
        createdAt:     true,
        userId:        true,
        user: { select: { email: true } },
      },
    }),

    // Top users by AI run count
    prisma.aiRun.groupBy({
      by:      ["userId"],
      where:   { status: "SUCCEEDED", ...dateFilter },
      _count:  { id: true },
      orderBy: { _count: { id: "desc" } },
      take:    10,
    }),
  ]);

  // Enrich top users with email
  const userIds  = topUsers.map((u) => u.userId);
  const userRows = await prisma.user.findMany({
    where:  { id: { in: userIds } },
    select: { id: true, email: true, plan: true },
  });
  const userMap = Object.fromEntries(userRows.map((u) => [u.id, u]));

  return {
    byTool: byTool.map((r) => ({
      toolKind:       r.toolKind,
      count:          r._count.id,
      avgDurationMs:  r._avg.durationMs ? Math.round(r._avg.durationMs) : null,
    })),
    byScope:  byScope.map((r)  => ({ scope:    r.scope,      count: r._count.id })),
    byPlan:   byPlan.map((r)   => ({ plan:     r.planAtTime, count: r._count.id })),
    byStatus: byStatus.map((r) => ({ status:   r.status,     count: r._count.id })),
    recentFailures,
    topUsers: topUsers.map((r) => ({
      userId: r.userId,
      email:  userMap[r.userId]?.email ?? "unknown",
      plan:   userMap[r.userId]?.plan  ?? null,
      count:  r._count.id,
    })),
  };
}


// ─── Recent activity ──────────────────────────────────────────────────────────

export async function getAdminRecentActivity(limit = 50) {
  const [recentRuns, recentEvents] = await Promise.all([
    prisma.aiRun.findMany({
      orderBy: { createdAt: "desc" },
      take:    limit,
      select: {
        id:            true,
        toolKind:      true,
        scope:         true,
        status:        true,
        errorCategory: true,
        durationMs:    true,
        createdAt:     true,
        userId:        true,
        applicationId: true,
        user: { select: { email: true } },
      },
    }),
    prisma.productEvent.findMany({
      orderBy: { createdAt: "desc" },
      take:    limit,
      select: {
        id:        true,
        eventType: true,
        category:  true,
        createdAt: true,
        userId:    true,
        user: { select: { email: true } },
      },
    }),
  ]);

  return { recentRuns, recentEvents };
}


// ─── Per-user analytics (admin drilldown) ────────────────────────────────────

export async function getAdminUserAnalytics(targetUserId: string, window: DateWindow) {
  const dateFilter = windowWhere(window);

  const [
    user,
    applicationCount,
    aiRunsByTool,
    aiRunsByStatus,
    recentRuns,
    artifactCount,
    artifactInteractions,
    recentEvents,
  ] = await Promise.all([
    prisma.user.findUnique({
      where:  { id: targetUserId },
      select: {
        id:             true,
        email:          true,
        plan:           true,
        role:           true,
        isActive:       true,
        emailVerifiedAt: true,
        createdAt:      true,
      },
    }),

    prisma.jobApplication.count({ where: { userId: targetUserId } }),

    prisma.aiRun.groupBy({
      by:      ["toolKind", "status"],
      where:   { userId: targetUserId, ...dateFilter },
      _count:  { id: true },
      orderBy: { _count: { id: "desc" } },
    }),

    prisma.aiRun.groupBy({
      by:     ["status"],
      where:  { userId: targetUserId, ...dateFilter },
      _count: { id: true },
    }),

    prisma.aiRun.findMany({
      where:   { userId: targetUserId, ...dateFilter },
      orderBy: { createdAt: "desc" },
      take:    25,
      select: {
        id:            true,
        toolKind:      true,
        scope:         true,
        status:        true,
        errorCategory: true,
        durationMs:    true,
        createdAt:     true,
        applicationId: true,
      },
    }),

    Promise.all([
      prisma.aiArtifact.count({ where: { userId: targetUserId } }),
      prisma.userAiArtifact.count({ where: { userId: targetUserId } }),
    ]),

    prisma.artifactInteraction.count({ where: { userId: targetUserId, ...dateFilter } }),

    prisma.productEvent.findMany({
      where:   { userId: targetUserId, ...dateFilter },
      orderBy: { createdAt: "desc" },
      take:    25,
      select: {
        id:        true,
        eventType: true,
        category:  true,
        createdAt: true,
        metadata:  true,
      },
    }),
  ]);

  if (!user) return null;

  return {
    user,
    applicationCount,
    aiRuns: {
      byTool:   aiRunsByTool.map((r) => ({
        toolKind: r.toolKind,
        status:   r.status,
        count:    r._count.id,
      })),
      byStatus: aiRunsByStatus.map((r) => ({ status: r.status, count: r._count.id })),
      recent:   recentRuns,
    },
    artifacts: {
      targeted:     artifactCount[0],
      generic:      artifactCount[1],
      interactions: artifactInteractions,
    },
    recentEvents,
  };
}


// ─── User self-analytics ──────────────────────────────────────────────────────

export async function getUserActivityOverview(userId: string, window: DateWindow) {
  const dateFilter = windowWhere(window);

  const [
    applicationCount,
    aiRunsByTool,
    totalRuns,
    artifactCounts,
    recentRuns,
    recentEvents,
  ] = await Promise.all([
    prisma.jobApplication.count({ where: { userId } }),

    prisma.aiRun.groupBy({
      by:      ["toolKind"],
      where:   { userId, status: "SUCCEEDED", ...dateFilter },
      _count:  { id: true },
      orderBy: { _count: { id: "desc" } },
    }),

    prisma.aiRun.count({ where: { userId, status: "SUCCEEDED", ...dateFilter } }),

    Promise.all([
      prisma.aiArtifact.count({ where: { userId } }),
      prisma.userAiArtifact.count({ where: { userId } }),
    ]),

    prisma.aiRun.findMany({
      where:   { userId, ...dateFilter },
      orderBy: { createdAt: "desc" },
      take:    20,
      select: {
        id:            true,
        toolKind:      true,
        scope:         true,
        status:        true,
        durationMs:    true,
        createdAt:     true,
        applicationId: true,
      },
    }),

    prisma.productEvent.findMany({
      where:   { userId, ...dateFilter },
      orderBy: { createdAt: "desc" },
      take:    20,
      select: {
        id:        true,
        eventType: true,
        category:  true,
        createdAt: true,
      },
    }),
  ]);

  return {
    applicationCount,
    totalSuccessfulRuns: totalRuns,
    byTool: aiRunsByTool.map((r) => ({ toolKind: r.toolKind, count: r._count.id })),
    artifacts: {
      targeted: artifactCounts[0],
      generic:  artifactCounts[1],
    },
    recentRuns,
    recentEvents,
  };
}