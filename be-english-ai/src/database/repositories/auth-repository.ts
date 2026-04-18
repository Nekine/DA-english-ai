import sql from "mssql";
import { BaseRepository } from "./base-repository";
import { HTTP_STATUS } from "../../constants/http-status";
import { AppError } from "../../errors/app-error";
import { ERROR_CODES } from "../../errors/error-codes";

export interface DbAuthUser {
  id: number;
  username: string;
  email: string;
  passwordHash: string;
  fullName: string | null;
  avatarUrl: string | null;
  currentLevel: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | null;
  role: "admin" | "customer";
  status: "active" | "inactive" | "banned";
  accountType: "free" | "premium";
  premiumExpiresAt: Date | null;
}

export interface RegisterUserInput {
  username: string;
  email: string;
  passwordHash: string;
  fullName: string | null;
  currentLevel: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | null;
  role?: "admin" | "customer";
}

export interface CreateOAuthUserInput {
  username: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  providerId: string;
}

const AUTH_USER_SELECT = `
  SELECT TOP (1)
    tk.TaiKhoanId AS id,
    tk.TenDangNhap AS username,
    COALESCE(tk.Email, N'') AS email,
    tk.MatKhauHash AS passwordHash,
    nd.HoVaTen AS fullName,
    nd.AnhDaiDienUrl AS avatarUrl,
    nd.TrinhDoHienTai AS currentLevel,
    CASE
      WHEN tk.VaiTro = N'admin' THEN N'admin'
      ELSE N'customer'
    END AS role,
    tk.TrangThaiTaiKhoan AS status,
    CASE
      WHEN COALESCE(sub.hasSubscriptionRecord, CAST(0 AS BIT)) = 1
        THEN CASE WHEN sub.isSubscriptionActive = 1 THEN N'premium' ELSE N'free' END
      WHEN tk.LoaiTaiKhoan = N'basic' THEN N'free'
      ELSE N'premium'
    END AS accountType,
    CASE
      WHEN COALESCE(sub.hasSubscriptionRecord, CAST(0 AS BIT)) = 1 THEN sub.premiumExpiresAt
      ELSE CAST(NULL AS DATETIME2)
    END AS premiumExpiresAt
`;

const AUTH_USER_SUBSCRIPTION_APPLY = `
  OUTER APPLY (
    SELECT TOP (1)
      CAST(1 AS BIT) AS hasSubscriptionRecord,
      CASE
        WHEN gd.LaTronDoi = 1 THEN CAST(NULL AS DATETIME2)
        WHEN gd.ThoiHanThang IS NULL THEN CAST(NULL AS DATETIME2)
        ELSE DATEADD(MONTH, gd.ThoiHanThang, tt.NgayTao)
      END AS premiumExpiresAt,
      CASE
        WHEN gd.LaTronDoi = 1 THEN CAST(1 AS BIT)
        WHEN gd.ThoiHanThang IS NULL THEN CAST(0 AS BIT)
        WHEN DATEADD(MONTH, gd.ThoiHanThang, tt.NgayTao) > SYSDATETIME() THEN CAST(1 AS BIT)
        ELSE CAST(0 AS BIT)
      END AS isSubscriptionActive
    FROM dbo.ThanhToan tt
    INNER JOIN dbo.GoiDangKy gd ON gd.GoiDangKyId = tt.GoiDangKyId
    WHERE tt.NguoiDungId = nd.NguoiDungId
      AND tt.TrangThaiThanhToan = N'completed'
    ORDER BY tt.NgayTao DESC, tt.ThanhToanId DESC
  ) sub
`;

export class AuthRepository extends BaseRepository {
  async findByEmailOrUsername(identity: string): Promise<DbAuthUser | null> {
    const request = await this.createRequest();
    this.bindInput(request, "identity", sql.NVarChar(255), identity);

    const result = await request.query<DbAuthUser>(`
      ${AUTH_USER_SELECT}
      FROM dbo.TaiKhoan tk
      LEFT JOIN dbo.NguoiDung nd ON nd.TaiKhoanId = tk.TaiKhoanId
      ${AUTH_USER_SUBSCRIPTION_APPLY}
      WHERE tk.Email = @identity OR tk.TenDangNhap = @identity
    `);

    return result.recordset[0] ?? null;
  }

  async findById(userId: number): Promise<DbAuthUser | null> {
    const request = await this.createRequest();
    this.bindInput(request, "userId", sql.Int, userId);

    const result = await request.query<DbAuthUser>(`
      ${AUTH_USER_SELECT}
      FROM dbo.TaiKhoan tk
      LEFT JOIN dbo.NguoiDung nd ON nd.TaiKhoanId = tk.TaiKhoanId
      ${AUTH_USER_SUBSCRIPTION_APPLY}
      WHERE tk.TaiKhoanId = @userId
    `);

    return result.recordset[0] ?? null;
  }

  async findByEmail(email: string): Promise<DbAuthUser | null> {
    const request = await this.createRequest();
    this.bindInput(request, "email", sql.NVarChar(255), email);

    const result = await request.query<DbAuthUser>(`
      ${AUTH_USER_SELECT}
      FROM dbo.TaiKhoan tk
      LEFT JOIN dbo.NguoiDung nd ON nd.TaiKhoanId = tk.TaiKhoanId
      ${AUTH_USER_SUBSCRIPTION_APPLY}
      WHERE tk.Email = @email
    `);

    return result.recordset[0] ?? null;
  }

  async findByGoogleId(providerId: string): Promise<DbAuthUser | null> {
    const request = await this.createRequest();
    this.bindInput(request, "providerId", sql.NVarChar(255), providerId);

    const result = await request.query<DbAuthUser>(`
      ${AUTH_USER_SELECT}
      FROM dbo.TaiKhoan tk
      LEFT JOIN dbo.NguoiDung nd ON nd.TaiKhoanId = tk.TaiKhoanId
      ${AUTH_USER_SUBSCRIPTION_APPLY}
      WHERE tk.MaGoogle = @providerId
    `);

    return result.recordset[0] ?? null;
  }

  async findByFacebookId(providerId: string): Promise<DbAuthUser | null> {
    const request = await this.createRequest();
    this.bindInput(request, "providerId", sql.NVarChar(255), providerId);

    const result = await request.query<DbAuthUser>(`
      ${AUTH_USER_SELECT}
      FROM dbo.TaiKhoan tk
      LEFT JOIN dbo.NguoiDung nd ON nd.TaiKhoanId = tk.TaiKhoanId
      ${AUTH_USER_SUBSCRIPTION_APPLY}
      WHERE tk.MaFacebook = @providerId
    `);

    return result.recordset[0] ?? null;
  }

  async existsByEmailOrUsername(email: string, username: string): Promise<boolean> {
    const request = await this.createRequest();
    this.bindInput(request, "email", sql.NVarChar(255), email);
    this.bindInput(request, "username", sql.NVarChar(100), username);

    const result = await request.query<{ count: number }>(`
      SELECT COUNT(1) AS count
      FROM dbo.TaiKhoan
      WHERE Email = @email OR TenDangNhap = @username
    `);

    return (result.recordset[0]?.count ?? 0) > 0;
  }

  async existsByUsername(username: string): Promise<boolean> {
    const request = await this.createRequest();
    this.bindInput(request, "username", sql.NVarChar(100), username);

    const result = await request.query<{ count: number }>(`
      SELECT COUNT(1) AS count
      FROM dbo.TaiKhoan
      WHERE TenDangNhap = @username
    `);

    return (result.recordset[0]?.count ?? 0) > 0;
  }

  async createUser(input: RegisterUserInput): Promise<number> {
    const request = await this.createRequest();
    const normalizedRole = input.role === "admin" ? "admin" : "customer";
    this.bindInput(request, "username", sql.NVarChar(100), input.username);
    this.bindInput(request, "email", sql.NVarChar(255), input.email);
    this.bindInput(request, "passwordHash", sql.NVarChar(255), input.passwordHash);
    this.bindInput(request, "fullName", sql.NVarChar(100), input.fullName);
    this.bindInput(request, "currentLevel", sql.NVarChar(40), input.currentLevel);
    this.bindInput(request, "role", sql.NVarChar(20), normalizedRole);

    const result = await request.query<{ id: number }>(`
      DECLARE @newAccount TABLE (TaiKhoanId INT);
      DECLARE @fallbackGoogleId NVARCHAR(255) = CONCAT(N'local-google-', CONVERT(NVARCHAR(36), NEWID()));
      DECLARE @fallbackFacebookId NVARCHAR(255) = CONCAT(N'local-facebook-', CONVERT(NVARCHAR(36), NEWID()));

      INSERT INTO dbo.TaiKhoan (
        TenDangNhap,
        Email,
        MatKhauHash,
        VaiTro,
        LoaiTaiKhoan,
        PhuongThucDangNhap,
        MaGoogle,
        MaFacebook,
        TrangThaiTaiKhoan,
        NgayCapNhat
      )
      OUTPUT INSERTED.TaiKhoanId INTO @newAccount(TaiKhoanId)
      VALUES (
        @username,
        @email,
        @passwordHash,
        @role,
        N'basic',
        N'local',
        @fallbackGoogleId,
        @fallbackFacebookId,
        N'active',
        SYSDATETIME()
      );

      INSERT INTO dbo.NguoiDung (
        TaiKhoanId,
        HoVaTen,
        TrinhDoHienTai,
        NgayCapNhatTrinhDo,
        NgayCapNhat
      )
      SELECT
        TaiKhoanId,
        @fullName,
        @currentLevel,
        CASE WHEN @currentLevel IS NULL THEN NULL ELSE SYSDATETIME() END,
        SYSDATETIME()
      FROM @newAccount;

      SELECT TOP (1) TaiKhoanId AS id FROM @newAccount;
    `);

    const insertedId = result.recordset[0]?.id;
    if (!insertedId) {
      throw new AppError(
        "Failed to create user",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.DATABASE_ERROR,
      );
    }

    return insertedId;
  }

  async createOAuthUser(input: CreateOAuthUserInput): Promise<number> {
    const request = await this.createRequest();
    this.bindInput(request, "username", sql.NVarChar(100), input.username);
    this.bindInput(request, "email", sql.NVarChar(255), input.email);
    this.bindInput(request, "passwordHash", sql.NVarChar(255), input.providerId);
    this.bindInput(request, "fullName", sql.NVarChar(100), input.fullName);
    this.bindInput(request, "avatarUrl", sql.NVarChar(255), input.avatarUrl);
    this.bindInput(
      request,
      "googleId",
      sql.NVarChar(255),
      input.providerId,
    );

    const result = await request.query<{ id: number }>(`
      DECLARE @newAccount TABLE (TaiKhoanId INT);
      DECLARE @fallbackGoogleId NVARCHAR(255) = CONCAT(N'oauth-google-', CONVERT(NVARCHAR(36), NEWID()));
      DECLARE @fallbackFacebookId NVARCHAR(255) = CONCAT(N'oauth-facebook-', CONVERT(NVARCHAR(36), NEWID()));

      INSERT INTO dbo.TaiKhoan (
        TenDangNhap,
        Email,
        MatKhauHash,
        VaiTro,
        LoaiTaiKhoan,
        PhuongThucDangNhap,
        MaGoogle,
        MaFacebook,
        TrangThaiTaiKhoan,
        LanDangNhapCuoi,
        NgayCapNhat
      )
      OUTPUT INSERTED.TaiKhoanId INTO @newAccount(TaiKhoanId)
      VALUES (
        @username,
        @email,
        @passwordHash,
        N'customer',
        N'basic',
        N'google',
        COALESCE(@googleId, @fallbackGoogleId),
        @fallbackFacebookId,
        N'active',
        SYSDATETIME(),
        SYSDATETIME()
      );

      INSERT INTO dbo.NguoiDung (TaiKhoanId, HoVaTen, AnhDaiDienUrl, NgayCapNhat)
      SELECT TaiKhoanId, @fullName, @avatarUrl, SYSDATETIME()
      FROM @newAccount;

      SELECT TOP (1) TaiKhoanId AS id FROM @newAccount;
    `);

    const insertedId = result.recordset[0]?.id;
    if (!insertedId) {
      throw new AppError(
        "Failed to create OAuth user",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.DATABASE_ERROR,
      );
    }

    return insertedId;
  }

  async touchLastActive(userId: number): Promise<void> {
    const request = await this.createRequest();
    this.bindInput(request, "userId", sql.Int, userId);

    await request.query(`
      UPDATE dbo.TaiKhoan
      SET LanDangNhapCuoi = SYSDATETIME(),
          NgayCapNhat = SYSDATETIME()
      WHERE TaiKhoanId = @userId
    `);
  }

  async linkOAuthAndTouchLogin(input: {
    userId: number;
    providerId: string;
    fullName: string | null;
    avatarUrl: string | null;
  }): Promise<void> {
    const request = await this.createRequest();
    this.bindInput(request, "userId", sql.Int, input.userId);
    this.bindInput(
      request,
      "googleId",
      sql.NVarChar(255),
      input.providerId,
    );
    this.bindInput(request, "fullName", sql.NVarChar(100), input.fullName);
    this.bindInput(request, "avatarUrl", sql.NVarChar(255), input.avatarUrl);

    await request.query(`
      UPDATE dbo.TaiKhoan
        SET MaGoogle = COALESCE(@googleId, MaGoogle),
          LanDangNhapCuoi = SYSDATETIME(),
          NgayCapNhat = SYSDATETIME()
      WHERE TaiKhoanId = @userId;

      UPDATE dbo.NguoiDung
      SET HoVaTen = COALESCE(HoVaTen, @fullName),
          AnhDaiDienUrl = COALESCE(AnhDaiDienUrl, @avatarUrl),
          NgayCapNhat = SYSDATETIME()
      WHERE TaiKhoanId = @userId;
    `);
  }

  async updateAvatarUrl(userId: number, avatarUrl: string): Promise<void> {
    const request = await this.createRequest();
    this.bindInput(request, "userId", sql.Int, userId);
    this.bindInput(request, "avatarUrl", sql.NVarChar(255), avatarUrl);

    await request.query(`
      UPDATE dbo.NguoiDung
      SET AnhDaiDienUrl = @avatarUrl,
          NgayCapNhat = SYSDATETIME()
      WHERE TaiKhoanId = @userId;

      IF @@ROWCOUNT = 0
      BEGIN
        INSERT INTO dbo.NguoiDung (TaiKhoanId, AnhDaiDienUrl, NgayCapNhat)
        VALUES (@userId, @avatarUrl, SYSDATETIME());
      END

      UPDATE dbo.TaiKhoan
      SET NgayCapNhat = SYSDATETIME()
      WHERE TaiKhoanId = @userId;
    `);
  }
}
