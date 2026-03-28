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
  role: "user" | "admin" | "customer";
  status: "active" | "inactive" | "banned";
  accountType: "free" | "premium";
  premiumExpiresAt: Date | null;
}

export interface RegisterUserInput {
  username: string;
  email: string;
  passwordHash: string;
  fullName: string | null;
  role?: "user" | "admin" | "customer";
}

export interface CreateOAuthUserInput {
  username: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  provider: "google" | "facebook";
  providerId: string;
}

export class AuthRepository extends BaseRepository {
  async findByEmailOrUsername(identity: string): Promise<DbAuthUser | null> {
    const request = await this.createRequest();
    this.bindInput(request, "identity", sql.NVarChar(255), identity);

    const result = await request.query<DbAuthUser>(`
      SELECT TOP (1)
        id,
        username,
        email,
        password_hash AS passwordHash,
        full_name AS fullName,
        avatar_url AS avatarUrl,
        role,
        status,
        account_type AS accountType,
        premium_expires_at AS premiumExpiresAt
      FROM dbo.users
      WHERE email = @identity OR username = @identity
    `);

    return result.recordset[0] ?? null;
  }

  async findById(userId: number): Promise<DbAuthUser | null> {
    const request = await this.createRequest();
    this.bindInput(request, "userId", sql.Int, userId);

    const result = await request.query<DbAuthUser>(`
      SELECT TOP (1)
        id,
        username,
        email,
        password_hash AS passwordHash,
        full_name AS fullName,
        avatar_url AS avatarUrl,
        role,
        status,
        account_type AS accountType,
        premium_expires_at AS premiumExpiresAt
      FROM dbo.users
      WHERE id = @userId
    `);

    return result.recordset[0] ?? null;
  }

  async findByEmail(email: string): Promise<DbAuthUser | null> {
    const request = await this.createRequest();
    this.bindInput(request, "email", sql.NVarChar(255), email);

    const result = await request.query<DbAuthUser>(`
      SELECT TOP (1)
        id,
        username,
        email,
        password_hash AS passwordHash,
        full_name AS fullName,
        avatar_url AS avatarUrl,
        role,
        status,
        account_type AS accountType,
        premium_expires_at AS premiumExpiresAt
      FROM dbo.users
      WHERE email = @email
    `);

    return result.recordset[0] ?? null;
  }

  async findByGoogleId(providerId: string): Promise<DbAuthUser | null> {
    const request = await this.createRequest();
    this.bindInput(request, "providerId", sql.NVarChar(255), providerId);

    const result = await request.query<DbAuthUser>(`
      SELECT TOP (1)
        id,
        username,
        email,
        password_hash AS passwordHash,
        full_name AS fullName,
        avatar_url AS avatarUrl,
        role,
        status,
        account_type AS accountType,
        premium_expires_at AS premiumExpiresAt
      FROM dbo.users
      WHERE google_id = @providerId
    `);

    return result.recordset[0] ?? null;
  }

  async findByFacebookId(providerId: string): Promise<DbAuthUser | null> {
    const request = await this.createRequest();
    this.bindInput(request, "providerId", sql.NVarChar(255), providerId);

    const result = await request.query<DbAuthUser>(`
      SELECT TOP (1)
        id,
        username,
        email,
        password_hash AS passwordHash,
        full_name AS fullName,
        avatar_url AS avatarUrl,
        role,
        status,
        account_type AS accountType,
        premium_expires_at AS premiumExpiresAt
      FROM dbo.users
      WHERE facebook_id = @providerId
    `);

    return result.recordset[0] ?? null;
  }

  async existsByEmailOrUsername(email: string, username: string): Promise<boolean> {
    const request = await this.createRequest();
    this.bindInput(request, "email", sql.NVarChar(255), email);
    this.bindInput(request, "username", sql.NVarChar(100), username);

    const result = await request.query<{ count: number }>(`
      SELECT COUNT(1) AS count
      FROM dbo.users
      WHERE email = @email OR username = @username
    `);

    return (result.recordset[0]?.count ?? 0) > 0;
  }

  async existsByUsername(username: string): Promise<boolean> {
    const request = await this.createRequest();
    this.bindInput(request, "username", sql.NVarChar(100), username);

    const result = await request.query<{ count: number }>(`
      SELECT COUNT(1) AS count
      FROM dbo.users
      WHERE username = @username
    `);

    return (result.recordset[0]?.count ?? 0) > 0;
  }

  async createUser(input: RegisterUserInput): Promise<number> {
    const request = await this.createRequest();
    this.bindInput(request, "username", sql.NVarChar(100), input.username);
    this.bindInput(request, "email", sql.NVarChar(255), input.email);
    this.bindInput(request, "passwordHash", sql.NVarChar(255), input.passwordHash);
    this.bindInput(request, "fullName", sql.NVarChar(200), input.fullName);
    this.bindInput(request, "role", sql.NVarChar(20), input.role ?? "customer");

    const result = await request.query<{ id: number }>(`
      INSERT INTO dbo.users (username, email, password_hash, full_name, role)
      OUTPUT INSERTED.id
      VALUES (@username, @email, @passwordHash, @fullName, @role)
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
    this.bindInput(request, "passwordHash", sql.NVarChar(255), "");
    this.bindInput(request, "fullName", sql.NVarChar(200), input.fullName);
    this.bindInput(request, "avatarUrl", sql.NVarChar(500), input.avatarUrl);
    this.bindInput(
      request,
      "googleId",
      sql.NVarChar(255),
      input.provider === "google" ? input.providerId : null,
    );
    this.bindInput(
      request,
      "facebookId",
      sql.NVarChar(255),
      input.provider === "facebook" ? input.providerId : null,
    );

    const result = await request.query<{ id: number }>(`
      INSERT INTO dbo.users (
        username,
        email,
        password_hash,
        full_name,
        avatar_url,
        role,
        status,
        account_type,
        google_id,
        facebook_id,
        last_active_at
      )
      OUTPUT INSERTED.id
      VALUES (
        @username,
        @email,
        @passwordHash,
        @fullName,
        @avatarUrl,
        N'user',
        N'active',
        N'free',
        @googleId,
        @facebookId,
        SYSUTCDATETIME()
      )
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
      UPDATE dbo.users
      SET last_active_at = SYSUTCDATETIME(),
          updated_at = SYSUTCDATETIME()
      WHERE id = @userId
    `);
  }

  async linkOAuthAndTouchLogin(input: {
    userId: number;
    provider: "google" | "facebook";
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
      input.provider === "google" ? input.providerId : null,
    );
    this.bindInput(
      request,
      "facebookId",
      sql.NVarChar(255),
      input.provider === "facebook" ? input.providerId : null,
    );
    this.bindInput(request, "fullName", sql.NVarChar(200), input.fullName);
    this.bindInput(request, "avatarUrl", sql.NVarChar(500), input.avatarUrl);

    await request.query(`
      UPDATE dbo.users
      SET google_id = COALESCE(@googleId, google_id),
          facebook_id = COALESCE(@facebookId, facebook_id),
          full_name = COALESCE(full_name, @fullName),
          avatar_url = COALESCE(avatar_url, @avatarUrl),
          last_active_at = SYSUTCDATETIME(),
          updated_at = SYSUTCDATETIME()
      WHERE id = @userId
    `);
  }
}
