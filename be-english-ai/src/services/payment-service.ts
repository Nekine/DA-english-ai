import { PaymentRepository } from "../database/repositories/payment-repository";

const paymentRepository = new PaymentRepository();

export async function checkEmail(email: string) {
  const user = await paymentRepository.findUserByEmail(email.trim().toLowerCase());
  if (!user) {
    return { exists: false };
  }

  return {
    exists: true,
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    accountType: user.accountType,
    status: user.status,
  };
}

export async function addManualPayment(input: {
  email: string;
  amount: number;
  method?: string;
  isLifetime: boolean;
  durationMonths?: number;
  note?: string;
}) {
  const user = await paymentRepository.findUserByEmail(input.email.trim().toLowerCase());
  if (!user) {
    return {
      statusCode: 404,
      body: { message: `Khong tim thay user voi email: ${input.email}` },
    } as const;
  }

  const packageId = await paymentRepository.getActivePackageId();
  await paymentRepository.insertPayment({
    userId: user.id,
    packageId,
    amount: Number(input.amount || 0),
    method: input.method ?? "Manual",
    isLifetime: Boolean(input.isLifetime),
    note: input.note ?? "Manual payment by admin",
  });

  const expiresAt = !input.isLifetime && (input.durationMonths ?? 0) > 0
    ? new Date(Date.now() + (input.durationMonths as number) * 30 * 86400000)
    : null;

  await paymentRepository.updateUserPremium({ userId: user.id, expiresAt });

  return {
    statusCode: 200,
    body: {
      success: true,
      message: "Da them thanh toan va nang cap tai khoan thanh cong",
      userId: user.id,
      email: user.email,
      previousAccountType: user.accountType,
      newAccountType: "premium",
      amount: Number(input.amount || 0),
      isLifetime: Boolean(input.isLifetime),
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
    },
  } as const;
}

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

export async function checkExpiredPremium() {
  const now = new Date();
  const expiredUsers = await paymentRepository.getExpiredPremiumUsers(now);
  const downgraded = await paymentRepository.downgradeUsersToFree(expiredUsers.map((u) => u.id));

  return {
    success: true,
    message: `Checked ${expiredUsers.length} expired premium users`,
    checkedAt: now.toISOString(),
    totalChecked: expiredUsers.length,
    totalDowngraded: downgraded,
    expiredUsers: expiredUsers.map((u) => ({
      userId: u.id,
      email: u.email,
      fullName: u.fullName ?? "",
      expiredAt: u.premiumExpiresAt?.toISOString() ?? now.toISOString(),
    })),
  };
}

export async function getExpiringSoonUsers(days: number) {
  const now = new Date();
  const safeDays = Number.isFinite(days) ? Math.max(1, Math.min(90, days)) : 7;
  const users = await paymentRepository.getExpiringSoonUsers(now, safeDays);

  return {
    success: true,
    totalExpiringSoon: users.length,
    withinDays: safeDays,
    users: users.map((u) => {
      const expiresAt = u.premiumExpiresAt ?? now;
      const daysRemaining = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / 86400000));
      return {
        userId: u.id,
        email: u.email,
        fullName: u.fullName ?? "",
        premiumExpiresAt: expiresAt.toISOString(),
        daysRemaining,
      };
    }),
  };
}
