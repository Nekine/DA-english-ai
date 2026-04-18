import { PayOS } from "@payos/node";
import { appConfig } from "../config";
import { HTTP_STATUS } from "../constants/http-status";
import { payosPaymentRepository, type PaymentRecordRow, type PaymentRecordStatus } from "../database/repositories/payos-payment-repository";
import { AppError } from "../errors/app-error";
import { ERROR_CODES } from "../errors/error-codes";
import { safeJsonParse, safeJsonStringify } from "../utils/json";

export type PaymentPlanTier = "pre" | "max";
export type PaymentPlanCycle = "1month" | "6months" | "1year";

interface PlanConfig {
  planCode: string;
  tier: PaymentPlanTier;
  cycle: PaymentPlanCycle;
  packageName: string;
  packageDescription: string;
  amount: number;
  durationMonths: number;
  accountType: "premium" | "max";
}

interface CreatePayosPaymentInput {
  accountId: number;
  tier: PaymentPlanTier;
  cycle: PaymentPlanCycle;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
}

interface CreatePayosPaymentResult {
  orderCode: number;
  paymentLinkId: string;
  checkoutUrl: string;
  qrCode: string;
  amount: number;
}

interface PaymentStatusResult {
  orderCode: string;
  status: PaymentRecordStatus;
  amount: number;
  tier: PaymentPlanTier;
  cycle: PaymentPlanCycle;
  packageName: string;
}

interface PayosWebhookShape {
  code: string;
  desc: string;
  success: boolean;
  data: {
    orderCode: number;
    amount: number;
    description: string;
    accountNumber: string;
    reference: string;
    transactionDateTime: string;
    currency: string;
    paymentLinkId: string;
    code: string;
    desc: string;
    counterAccountBankId?: string | null;
    counterAccountBankName?: string | null;
    counterAccountName?: string | null;
    counterAccountNumber?: string | null;
    virtualAccountName?: string | null;
    virtualAccountNumber?: string | null;
  };
  signature: string;
}

const PLAN_CONFIG: Record<PaymentPlanTier, Record<PaymentPlanCycle, PlanConfig>> = {
  pre: {
    "1month": {
      planCode: "pre_1month",
      tier: "pre",
      cycle: "1month",
      packageName: "Pre 1 tháng",
      packageDescription: "Gói Pre 1 tháng",
      amount: 11000,
      durationMonths: 1,
      accountType: "premium",
    },
    "6months": {
      planCode: "pre_6months",
      tier: "pre",
      cycle: "6months",
      packageName: "Pre 6 tháng",
      packageDescription: "Gói Pre 6 tháng",
      amount: 1098900,
      durationMonths: 6,
      accountType: "premium",
    },
    "1year": {
      planCode: "pre_1year",
      tier: "pre",
      cycle: "1year",
      packageName: "Pre 1 năm",
      packageDescription: "Gói Pre 1 năm",
      amount: 2088900,
      durationMonths: 12,
      accountType: "premium",
    },
  },
  max: {
    "1month": {
      planCode: "max_1month",
      tier: "max",
      cycle: "1month",
      packageName: "Max 1 tháng",
      packageDescription: "Gói Max 1 tháng",
      amount: 328900,
      durationMonths: 1,
      accountType: "max",
    },
    "6months": {
      planCode: "max_6months",
      tier: "max",
      cycle: "6months",
      packageName: "Max 6 tháng",
      packageDescription: "Gói Max 6 tháng",
      amount: 1648900,
      durationMonths: 6,
      accountType: "max",
    },
    "1year": {
      planCode: "max_1year",
      tier: "max",
      cycle: "1year",
      packageName: "Max 1 năm",
      packageDescription: "Gói Max 1 năm",
      amount: 3078900,
      durationMonths: 12,
      accountType: "max",
    },
  },
};

let cachedPayosClient: PayOS | null = null;

function getPayosClient(): PayOS {
  if (cachedPayosClient) {
    return cachedPayosClient;
  }

  const { clientId, apiKey, checksumKey } = appConfig.payos;

  if (!clientId || !apiKey || !checksumKey) {
    throw new AppError(
      "PAYOS credentials are missing",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_CODES.INTERNAL_ERROR,
    );
  }

  cachedPayosClient = new PayOS({
    clientId,
    apiKey,
    checksumKey,
  });

  return cachedPayosClient;
}

function resolvePlanConfig(tier: PaymentPlanTier, cycle: PaymentPlanCycle): PlanConfig {
  const plan = PLAN_CONFIG[tier]?.[cycle];
  if (!plan) {
    throw new AppError(
      "Invalid payment plan",
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.VALIDATION_ERROR,
      { tier, cycle },
    );
  }

  return plan;
}

function generateOrderCode(): number {
  const timestampTail = Date.now().toString().slice(-9);
  const randomTail = Math.floor(100000 + Math.random() * 900000).toString();
  return Number(`${timestampTail}${randomTail}`);
}

function appendOrderCodeToUrl(url: string, orderCode: number): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("orderCode", String(orderCode));
    parsed.searchParams.set("payos", "1");
    return parsed.toString();
  } catch {
    return url;
  }
}

function mapPayosLinkStatus(status: string): PaymentRecordStatus {
  switch (status) {
    case "PAID":
      return "completed";
    case "CANCELLED":
      return "cancelled";
    case "FAILED":
    case "EXPIRED":
      return "failed";
    case "UNDERPAID":
    case "PROCESSING":
    case "PENDING":
    default:
      return "pending";
  }
}

function mapWebhookStatus(code: string, desc: string): PaymentRecordStatus {
  if (code === "00") {
    return "completed";
  }

  if (desc.toLowerCase().includes("cancel")) {
    return "cancelled";
  }

  return "failed";
}

function inferTierFromPayment(payment: PaymentRecordRow): PaymentPlanTier {
  const details = safeJsonParse<Record<string, unknown>>(payment.chiTietThanhToanJson ?? "{}", {});
  const tierRaw = String(details.tier ?? "").trim().toLowerCase();

  if (tierRaw === "max") {
    return "max";
  }

  if (payment.goiTen.toLowerCase().includes("max")) {
    return "max";
  }

  return "pre";
}

function inferCycleFromPayment(payment: PaymentRecordRow): PaymentPlanCycle {
  const details = safeJsonParse<Record<string, unknown>>(payment.chiTietThanhToanJson ?? "{}", {});
  const cycleRaw = String(details.cycle ?? "").trim().toLowerCase();

  if (cycleRaw === "6months" || cycleRaw === "1year") {
    return cycleRaw;
  }

  if ((payment.goiThoiHanThang ?? 0) >= 12) {
    return "1year";
  }

  if ((payment.goiThoiHanThang ?? 0) >= 6) {
    return "6months";
  }

  return "1month";
}

async function persistPaymentStatus(
  payment: PaymentRecordRow,
  status: PaymentRecordStatus,
  detailsPatch: Record<string, unknown>,
): Promise<PaymentRecordRow> {
  const existingDetails = safeJsonParse<Record<string, unknown>>(payment.chiTietThanhToanJson ?? "{}", {});
  const mergedDetails = {
    ...existingDetails,
    ...detailsPatch,
    updatedAt: new Date().toISOString(),
  };

  await payosPaymentRepository.updatePaymentStatus({
    orderCode: payment.maGiaoDich ?? "",
    status,
    detailsJson: safeJsonStringify(mergedDetails, "{}"),
    paymentMethod: "PayOS",
  });

  if (status === "completed" && payment.trangThaiThanhToan !== "completed") {
    const tier = inferTierFromPayment(payment);
    const plan = resolvePlanConfig(tier, inferCycleFromPayment(payment));

    await payosPaymentRepository.updateAccountTypeByNguoiDungId({
      nguoiDungId: payment.nguoiDungId,
      accountType: plan.accountType,
    });
  }

  const updated = await payosPaymentRepository.getPaymentByOrderCode(payment.maGiaoDich ?? "");
  if (!updated) {
    throw new AppError(
      "Payment record not found after update",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_CODES.INTERNAL_ERROR,
    );
  }

  return updated;
}

export async function createPayosPayment(
  input: CreatePayosPaymentInput,
): Promise<CreatePayosPaymentResult> {
  const user = await payosPaymentRepository.findUserByAccountId(input.accountId);
  if (!user) {
    throw new AppError(
      "User not found",
      HTTP_STATUS.NOT_FOUND,
      ERROR_CODES.RESOURCE_NOT_FOUND,
    );
  }

  if (user.status !== "active") {
    throw new AppError(
      "User is not active",
      HTTP_STATUS.FORBIDDEN,
      ERROR_CODES.ACCESS_DENIED,
    );
  }

  const plan = resolvePlanConfig(input.tier, input.cycle);
  const packageRow = await payosPaymentRepository.findOrCreatePackage({
    tenGoi: plan.packageName,
    moTa: plan.packageDescription,
    gia: plan.amount,
    thoiHanThang: plan.durationMonths,
    laTronDoi: false,
  });

  const orderCode = generateOrderCode();

  const pendingDetails = {
    source: "checkout",
    tier: plan.tier,
    cycle: plan.cycle,
    planCode: plan.planCode,
    buyerName: input.buyerName,
    buyerEmail: input.buyerEmail,
    buyerPhone: input.buyerPhone,
    createdAt: new Date().toISOString(),
  };

  await payosPaymentRepository.createPendingPayment({
    nguoiDungId: user.nguoiDungId,
    goiDangKyId: packageRow.goiDangKyId,
    soTien: plan.amount,
    phuongThucThanhToan: "PayOS",
    maGiaoDich: String(orderCode),
    chiTietThanhToanJson: safeJsonStringify(pendingDetails, "{}"),
  });

  const payos = getPayosClient();
  const returnUrl = appendOrderCodeToUrl(appConfig.payos.returnUrl, orderCode);
  const cancelUrl = appendOrderCodeToUrl(appConfig.payos.cancelUrl, orderCode);

  const description = `EA-${plan.planCode}-${String(orderCode).slice(-4)}`.slice(0, 25);

  try {
    const created = await payos.paymentRequests.create({
      orderCode,
      amount: plan.amount,
      description,
      returnUrl,
      cancelUrl,
      buyerName: input.buyerName,
      buyerEmail: input.buyerEmail,
      buyerPhone: input.buyerPhone,
      items: [
        {
          name: plan.packageName,
          quantity: 1,
          price: plan.amount,
        },
      ],
    });

    await payosPaymentRepository.updatePaymentDetails(
      String(orderCode),
      safeJsonStringify(
        {
          ...pendingDetails,
          paymentLinkId: created.paymentLinkId,
          checkoutUrl: created.checkoutUrl,
          qrCode: created.qrCode,
          status: created.status,
          createdAtPayOS: new Date().toISOString(),
        },
        "{}",
      ),
    );

    return {
      orderCode,
      paymentLinkId: created.paymentLinkId,
      checkoutUrl: created.checkoutUrl,
      qrCode: created.qrCode,
      amount: created.amount,
    };
  } catch (error) {
    await payosPaymentRepository.updatePaymentStatus({
      orderCode: String(orderCode),
      status: "failed",
      paymentMethod: "PayOS",
      detailsJson: safeJsonStringify(
        {
          ...pendingDetails,
          error: error instanceof Error ? error.message : String(error),
          failedAt: new Date().toISOString(),
        },
        "{}",
      ),
    });

    throw new AppError(
      "Failed to create PayOS payment link",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_CODES.EXTERNAL_SERVICE_ERROR,
      error,
    );
  }
}

export async function handlePayosWebhook(payload: unknown): Promise<PaymentStatusResult | null> {
  const payos = getPayosClient();
  const verifiedData = await payos.webhooks.verify(payload as PayosWebhookShape);
  const orderCode = String(verifiedData.orderCode ?? "");

  if (!orderCode) {
    throw new AppError(
      "Invalid webhook payload: orderCode is missing",
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.VALIDATION_ERROR,
    );
  }

  const payment = await payosPaymentRepository.getPaymentByOrderCode(orderCode);
  if (!payment) {
    return null;
  }

  const mappedStatus = mapWebhookStatus(String(verifiedData.code ?? ""), String(verifiedData.desc ?? ""));

  const updated = await persistPaymentStatus(payment, mappedStatus, {
    webhook: {
      source: "payos",
      verifiedAt: new Date().toISOString(),
      data: verifiedData,
    },
  });

  const tier = inferTierFromPayment(updated);
  const cycle = inferCycleFromPayment(updated);

  return {
    orderCode,
    status: updated.trangThaiThanhToan,
    amount: updated.soTien,
    tier,
    cycle,
    packageName: updated.goiTen,
  };
}

export async function getPayosOrderStatusForUser(
  orderCode: string,
  accountId: number,
): Promise<PaymentStatusResult | null> {
  const user = await payosPaymentRepository.findUserByAccountId(accountId);
  if (!user) {
    throw new AppError(
      "User not found",
      HTTP_STATUS.NOT_FOUND,
      ERROR_CODES.RESOURCE_NOT_FOUND,
    );
  }

  const payment = await payosPaymentRepository.getPaymentByOrderCode(orderCode);
  if (!payment || payment.taiKhoanId !== user.taiKhoanId) {
    return null;
  }

  const payos = getPayosClient();

  try {
    const paymentLink = await payos.paymentRequests.get(Number(orderCode));
    const mappedStatus = mapPayosLinkStatus(paymentLink.status);

    let latest = payment;
    if (mappedStatus !== payment.trangThaiThanhToan) {
      latest = await persistPaymentStatus(payment, mappedStatus, {
        paymentLink: {
          id: paymentLink.id,
          status: paymentLink.status,
          amountPaid: paymentLink.amountPaid,
          amountRemaining: paymentLink.amountRemaining,
          cancellationReason: paymentLink.cancellationReason,
          canceledAt: paymentLink.canceledAt,
          syncedAt: new Date().toISOString(),
        },
      });
    }

    const tier = inferTierFromPayment(latest);
    const cycle = inferCycleFromPayment(latest);

    return {
      orderCode,
      status: latest.trangThaiThanhToan,
      amount: latest.soTien,
      tier,
      cycle,
      packageName: latest.goiTen,
    };
  } catch {
    const tier = inferTierFromPayment(payment);
    const cycle = inferCycleFromPayment(payment);

    return {
      orderCode,
      status: payment.trangThaiThanhToan,
      amount: payment.soTien,
      tier,
      cycle,
      packageName: payment.goiTen,
    };
  }
}
