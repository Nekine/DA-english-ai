import sql from "mssql";
import { BaseRepository } from "./base-repository";

export interface PaymentRow {
  id: number;
  userId: number;
  email: string;
  fullName: string | null;
  amount: number;
  method: string | null;
  status: "pending" | "completed" | "failed";
  isLifetime: boolean;
  accountType: string;
  createdAt: Date;
}

export interface UserBasicRow {
  id: number;
  email: string;
  fullName: string | null;
  accountType: string;
  status: string;
  premiumExpiresAt: Date | null;
}

export class PaymentRepository extends BaseRepository {
  async findUserByEmail(email: string): Promise<UserBasicRow | null> {
    const request = await this.createRequest();
    this.bindInput(request, "email", sql.NVarChar(255), email);

    const result = await request.query<UserBasicRow>(`
      SELECT TOP (1)
        u.id,
        u.email,
        u.full_name AS fullName,
        u.account_type AS accountType,
        u.status,
        u.premium_expires_at AS premiumExpiresAt
      FROM dbo.users u
      WHERE u.email = @email
    `);

    return result.recordset[0] ?? null;
  }

  async getActivePackageId(): Promise<number | null> {
    const request = await this.createRequest();
    const result = await request.query<{ id: number }>(`
      SELECT TOP (1) p.id
      FROM dbo.packages p
      WHERE p.is_active = 1
      ORDER BY p.id ASC
    `);

    return result.recordset[0]?.id ?? null;
  }

  async insertPayment(input: {
    userId: number;
    packageId: number | null;
    amount: number;
    method: string | null;
    isLifetime: boolean;
    note: string | null;
  }): Promise<void> {
    const request = await this.createRequest();
    this.bindInput(request, "userId", sql.Int, input.userId);
    this.bindInput(request, "packageId", sql.Int, input.packageId);
    this.bindInput(request, "amount", sql.Decimal(19, 4), input.amount);
    this.bindInput(request, "method", sql.NVarChar(50), input.method);
    this.bindInput(request, "isLifetime", sql.Bit, input.isLifetime);
    this.bindInput(request, "note", sql.NVarChar(sql.MAX), input.note);

    await request.query(`
      INSERT INTO dbo.payments (
        user_id,
        package_id,
        amount,
        method,
        status,
        is_lifetime,
        transaction_history,
        created_at,
        updated_at
      )
      VALUES (
        @userId,
        @packageId,
        @amount,
        @method,
        N'completed',
        @isLifetime,
        @note,
        SYSUTCDATETIME(),
        SYSUTCDATETIME()
      )
    `);
  }

  async updateUserPremium(input: {
    userId: number;
    expiresAt: Date | null;
  }): Promise<void> {
    const request = await this.createRequest();
    this.bindInput(request, "userId", sql.Int, input.userId);
    this.bindInput(request, "expiresAt", sql.DateTime2(3), input.expiresAt);

    await request.query(`
      UPDATE dbo.users
      SET account_type = N'premium',
          premium_expires_at = @expiresAt,
          updated_at = SYSUTCDATETIME()
      WHERE id = @userId
    `);
  }

  async getPayments(input: {
    page: number;
    pageSize: number;
    status?: "pending" | "completed" | "failed";
  }): Promise<{ rows: PaymentRow[]; totalCount: number }> {
    const request = await this.createRequest();
    const where = input.status ? "WHERE p.status = @status" : "";

    if (input.status) {
      this.bindInput(request, "status", sql.NVarChar(20), input.status);
    }

    const countResult = await request.query<{ totalCount: number }>(`
      SELECT COUNT(1) AS totalCount
      FROM dbo.payments p
      ${where}
    `);

    const dataRequest = await this.createRequest();
    if (input.status) {
      this.bindInput(dataRequest, "status", sql.NVarChar(20), input.status);
    }

    this.bindInput(dataRequest, "offset", sql.Int, (input.page - 1) * input.pageSize);
    this.bindInput(dataRequest, "pageSize", sql.Int, input.pageSize);

    const rowsResult = await dataRequest.query<PaymentRow>(`
      SELECT
        p.id,
        p.user_id AS userId,
        u.email,
        u.full_name AS fullName,
        CAST(p.amount AS FLOAT) AS amount,
        p.method,
        p.status,
        p.is_lifetime AS isLifetime,
        u.account_type AS accountType,
        p.created_at AS createdAt
      FROM dbo.payments p
      INNER JOIN dbo.users u ON u.id = p.user_id
      ${where}
      ORDER BY p.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `);

    return {
      rows: rowsResult.recordset,
      totalCount: countResult.recordset[0]?.totalCount ?? 0,
    };
  }

  async getExpiredPremiumUsers(now: Date): Promise<UserBasicRow[]> {
    const request = await this.createRequest();
    this.bindInput(request, "now", sql.DateTime2(3), now);

    const result = await request.query<UserBasicRow>(`
      SELECT
        u.id,
        u.email,
        u.full_name AS fullName,
        u.account_type AS accountType,
        u.status,
        u.premium_expires_at AS premiumExpiresAt
      FROM dbo.users u
      WHERE u.account_type = N'premium'
        AND u.status = N'active'
        AND u.premium_expires_at IS NOT NULL
        AND u.premium_expires_at <= @now
    `);

    return result.recordset;
  }

  async downgradeUsersToFree(userIds: number[]): Promise<number> {
    if (userIds.length === 0) {
      return 0;
    }

    const request = await this.createRequest();
    this.bindInput(request, "idsJson", sql.NVarChar(sql.MAX), JSON.stringify(userIds));

    const result = await request.query(`
      UPDATE dbo.users
      SET account_type = N'free',
          premium_expires_at = NULL,
          updated_at = SYSUTCDATETIME()
      WHERE id IN (
        SELECT TRY_CAST([value] AS INT)
        FROM OPENJSON(@idsJson)
      )
    `);

    return result.rowsAffected[0] ?? 0;
  }

  async getExpiringSoonUsers(now: Date, days: number): Promise<UserBasicRow[]> {
    const request = await this.createRequest();
    this.bindInput(request, "now", sql.DateTime2(3), now);
    this.bindInput(request, "endDate", sql.DateTime2(3), new Date(now.getTime() + days * 86400000));

    const result = await request.query<UserBasicRow>(`
      SELECT
        u.id,
        u.email,
        u.full_name AS fullName,
        u.account_type AS accountType,
        u.status,
        u.premium_expires_at AS premiumExpiresAt
      FROM dbo.users u
      WHERE u.account_type = N'premium'
        AND u.status = N'active'
        AND u.premium_expires_at IS NOT NULL
        AND u.premium_expires_at > @now
        AND u.premium_expires_at <= @endDate
      ORDER BY u.premium_expires_at ASC
    `);

    return result.recordset;
  }
}
