import { PaymentRepository } from "../database/repositories/payment-repository";

const paymentRepository = new PaymentRepository();

export async function getAllPayments(input: {
  page: number;
  pageSize: number;
  status?: "pending" | "completed" | "failed";
}) {
  const result = await paymentRepository.getPayments(input);

  return {
    payments: result.rows.map((p) => ({
      id: p.id,
      userId: p.userId,
      email: p.email,
      fullName: p.fullName,
      amount: p.amount,
      method: p.method,
      status: p.status,
      isLifetime: p.isLifetime,
      accountType: p.accountType,
      createdAt: p.createdAt.toISOString(),
    })),
    pagination: {
      currentPage: input.page,
      pageSize: input.pageSize,
      totalCount: result.totalCount,
      totalPages: Math.ceil(result.totalCount / input.pageSize),
    },
  };
}

export async function checkExpiredPremium(packageType: "all" | "pre" | "max" = "all") {
  const now = new Date();
  const expiredUsers = await paymentRepository.getExpiredPremiumUsers(now, packageType);
  const downgraded = await paymentRepository.downgradeUsersToFree(expiredUsers.map((u) => u.accountId));

  const packageLabel = packageType === "max" ? "max" : packageType === "pre" ? "pre" : "tra phi";

  return {
    success: true,
    message: `Checked ${expiredUsers.length} expired ${packageLabel} users`,
    checkedAt: now.toISOString(),
    totalChecked: expiredUsers.length,
    totalDowngraded: downgraded,
    expiredUsers: expiredUsers.map((u) => ({
      userId: u.accountId,
      email: u.email,
      fullName: u.fullName ?? "",
      accountType: u.accountType,
      expiredAt: u.premiumExpiresAt?.toISOString() ?? now.toISOString(),
    })),
  };
}

export async function getExpiringSoonUsers(days: number, packageType: "all" | "pre" | "max" = "all") {
  const now = new Date();
  const safeDays = Number.isFinite(days) ? Math.max(1, Math.min(90, days)) : 7;
  const users = await paymentRepository.getExpiringSoonUsers(now, safeDays, packageType);

  return {
    success: true,
    totalExpiringSoon: users.length,
    withinDays: safeDays,
    users: users.map((u) => {
      const expiresAt = u.premiumExpiresAt ?? now;
      const daysRemaining = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / 86400000));
      return {
        userId: u.accountId,
        email: u.email,
        fullName: u.fullName ?? "",
        accountType: u.accountType,
        premiumExpiresAt: expiresAt.toISOString(),
        daysRemaining,
      };
    }),
  };
}
