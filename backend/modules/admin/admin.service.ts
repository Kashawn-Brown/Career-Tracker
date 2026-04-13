import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../errors/app-error.js";
import { sendEmail } from "../../lib/email.js";
import { adminUserSelect } from "./admin.dto.js";
import { Prisma, UserPlan } from "@prisma/client";
import type { ListUsersQueryType } from "./admin.schemas.js";
import { planRequestSummarySelect } from "../plan/plan.dto.js";

const NOTE_MAX = 500;


/**
 * List users for admin with optional search + role/plan filtering.
 */
export async function listUsersForAdmin(params: ListUsersQueryType) {
  const page     = params.page     ?? 1;
  const pageSize = params.pageSize ?? 20;
  const skip     = (page - 1) * pageSize;

  const where: Prisma.UserWhereInput = {};

  if (params.role)     where.role     = params.role;
  if (params.plan)     where.plan     = params.plan;
  if (params.isActive !== undefined) where.isActive = params.isActive;

  if (params.q) {
    where.OR = [
      { email: { contains: params.q, mode: "insensitive" } },
      { name:  { contains: params.q, mode: "insensitive" } },
    ];
  }

  if (params.hasPendingRequest) {
    where.planRequests = { some: { status: "PENDING" } };
  }

  const sortBy  = params.sortBy  ?? "lastActiveAt";
  const sortDir = params.sortDir ?? "desc";
  const orderBy: Prisma.UserOrderByWithRelationInput =
    sortBy === "createdAt"
      ? { createdAt: sortDir }
      : { lastActiveAt: { sort: sortDir as "asc" | "desc", nulls: "last" } };

  const [total, items] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({ where, orderBy, skip, take: pageSize, select: adminUserSelect }),
  ]);

  const pendingRequestCount = await prisma.planRequest.count({
    where: { status: "PENDING" },
  });

  return {
    items,
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
    pendingRequestCount,
  };
}


/**
 * Update a user's plan (admin only).
 * Role editing is intentionally excluded — role is authorization-sensitive.
 */
export async function updateUserPlan(userId: string, plan: UserPlan) {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { id: true, role: true, email: true, name: true },
  });

  if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
  if (user.role === "ADMIN") throw new AppError("Cannot update plan of admin users", 403, "ADMIN_PROTECTED");

  await prisma.user.update({
    where: { id: userId },
    data:  { plan },
  });

  return { ok: true as const };
}


/**
 * Get a single user's detail for admin.
 */
export async function getUserDetailForAdmin(userId: string) {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: adminUserSelect,
  });

  if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");

  const applications = await prisma.jobApplication.groupBy({
    by:     ["status"],
    where:  { userId },
    _count: { status: true },
  });

  const connectionCount = await prisma.connection.count({ where: { userId } });

  const statusBreakdown = Object.fromEntries(
    applications.map((a) => [a.status, a._count.status])
  );

  const applicationCount = applications.reduce((sum, a) => sum + a._count.status, 0);

  // All plan requests for this user, newest first
  const planRequests = await prisma.planRequest.findMany({
    where:   { userId },
    orderBy: { requestedAt: "desc" },
    select:  planRequestSummarySelect,
  });

  return { ...user, applicationCount, connectionCount, statusBreakdown, planRequests };
}


/**
 * Activate or deactivate a user account (admin only).
 * Admins cannot be deactivated through this endpoint.
 */
export async function setUserActiveStatus(userId: string, isActive: boolean) {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { id: true, role: true },
  });

  if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
  if (user.role === "ADMIN") throw new AppError("Cannot change active status of admin users", 403, "ADMIN_PROTECTED");

  await prisma.user.update({
    where: { id: userId },
    data:  { isActive },
  });

  return { ok: true as const };
}


/**
 * Decline an open credit request.
 *
 * Sets the PlanRequest status to DECLINED and sends a neutral email to the user.
 */
export async function declinePlanRequest(requestId: string) {
  const request = await prisma.planRequest.findUnique({
    where:  { id: requestId },
    select: { id: true, status: true, userId: true, user: { select: { email: true, name: true } } },
  });

  if (!request)                    throw new AppError("Request not found", 404, "REQUEST_NOT_FOUND");
  if (request.status !== "PENDING") throw new AppError("Request is not pending", 400, "REQUEST_NOT_PENDING");

  await prisma.planRequest.update({
    where: { id: requestId },
    data:  { status: "DECLINED", decidedAt: new Date() },
  });

  try {
    await sendEmail({
      to:      request.user.email,
      subject: "Career-Tracker: Credit request update",
      kind:    "generic",
      userId:  request.userId,
      html: `
        <p>Hi${request.user.name ? ` ${escapeHtml(request.user.name)}` : ""},</p>
        <p>Your credit request wasn't approved this cycle. Your credits will reset at the start of next month.</p>
      `.trim(),
    });
  } catch (err: any) {
    console.warn("[admin] decline email failed", err?.message ?? err);
  }

  return { ok: true as const };
}


/**
 * Checks if the user has an open PENDING credit request and closes it as APPROVED.
 * Sends a notification email.
 *
 * Called after admin credit actions (add credits, reset cycle, plan upgrade) so
 * requests are always resolved when the admin acts — no orphaned pending rows.
 * Safe to call even when no request exists.
 */
export async function autoCloseOpenPlanRequest(
  userId:      string,
  adminUserId: string,
  context:     "credits_added" | "credits_reset" | "plan_updated",
): Promise<void> {
  const open = await prisma.planRequest.findFirst({
    where:   { userId, status: "PENDING" },
    orderBy: { requestedAt: "desc" },
    select:  { id: true, userId: true, user: { select: { email: true, name: true } } },
  });

  if (!open) return;

  await prisma.planRequest.update({
    where: { id: open.id },
    data:  { status: "APPROVED", decidedAt: new Date(), adminUserId },
  });

  const greeting = open.user.name ? ` ${escapeHtml(open.user.name)}` : "";

  const bodyByContext: Record<typeof context, string> = {
    credits_added:  "Additional AI credits have been added to your account for this month.",
    credits_reset:  "Your AI credits have been reset for this month.",
    plan_updated:   "Your plan has been updated. Enjoy your new access level.",
  };

  try {
    await sendEmail({
      to:      open.user.email,
      subject: "Career-Tracker: Credit request approved",
      kind:    "generic",
      userId,
      html: `
        <p>Hi${greeting},</p>
        <p>${bodyByContext[context]}</p>
      `.trim(),
    });
  } catch (err: any) {
    console.warn("[admin] auto-close request email failed", err?.message ?? err);
  }
}


// ----------------- Helper Functions -----------------

function cleanOptionalText(value?: string): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > NOTE_MAX ? trimmed.slice(0, NOTE_MAX) : trimmed;
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}