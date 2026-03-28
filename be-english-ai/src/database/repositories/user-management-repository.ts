import sql from "mssql";
import { BaseRepository } from "./base-repository";

export interface UserManagementListInput {
  search?: string;
  status?: string;
  level?: string;
  orderBy: string;
  orderDesc: boolean;
  page: number;
  pageSize: number;
}

export interface UserManagementListRow {
  Id: string;
  Username: string;
  FullName: string;
  Email: string;
  CreatedAt: Date;
  LastLoginAt: Date | null;
  Status: string;
  TotalXP: number;
  WeeklyXP: number;
  MonthlyXP: number;
  TotalExercisesCompleted: number;
  AverageScore: number;
}

export interface UserManagementDetailRow {
  Id: string;
  Username: string;
  FullName: string;
  Email: string;
  CreatedAt: Date;
  LastLoginAt: Date | null;
  Status: string;
  TotalXP: number;
  PreferredLevel: string | null;
}

export interface UserCompletionDetailRow {
  ExerciseId: number;
  Title: string;
  Type: string | null;
  Score: number;
  StartedAt: Date | null;
  CompletedAt: Date | null;
}

export interface CreateUserDbInput {
  username: string;
  fullName: string;
  email: string;
  status: "active" | "inactive";
  totalXP: number;
}

export interface UpdateUserDbInput {
  username: string;
  fullName: string;
  email: string;
  status: "active" | "inactive";
  totalXP: number;
}

export interface UserExportRow {
  Username: string;
  FullName: string;
  Email: string;
  Status: string;
  TotalXP: number;
  ExercisesCompleted: number;
  AverageScore: number;
  LastActive: Date | null;
  CreatedAt: Date;
}

const ORDER_BY_MAP: Record<string, string> = {
  username: "u.username",
  fullname: "u.full_name",
  email: "u.email",
  totalxp: "u.total_xp",
  createdat: "u.created_at",
};

export class UserManagementRepository extends BaseRepository {
  async existsByUsername(username: string): Promise<boolean> {
    const request = await this.createRequest();
    this.bindInput(request, "username", sql.NVarChar(100), username);

    const result = await request.query<{ totalCount: number }>(`
      SELECT COUNT(1) AS totalCount
      FROM dbo.users
      WHERE username = @username
    `);

    return (result.recordset[0]?.totalCount ?? 0) > 0;
  }

  async getUsers(input: UserManagementListInput): Promise<{ rows: UserManagementListRow[]; totalCount: number }> {
    const whereParts: string[] = [];

    if (input.search) {
      whereParts.push("(u.username LIKE @search OR u.full_name LIKE @search OR u.email LIKE @search)");
    }

    if (input.status) {
      whereParts.push("u.status = @status");
    }

    if (input.level) {
      // Legacy endpoint filters by level, but current schema does not store level explicitly.
      // Keep query parity-compatible by accepting the parameter without narrowing results.
    }

    const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";

    const countRequest = await this.createRequest();
    if (input.search) {
      this.bindInput(countRequest, "search", sql.NVarChar(255), `%${input.search}%`);
    }
    if (input.status) {
      this.bindInput(countRequest, "status", sql.NVarChar(20), input.status);
    }

    const countResult = await countRequest.query<{ totalCount: number }>(`
      SELECT COUNT(1) AS totalCount
      FROM dbo.users u
      ${whereClause}
    `);

    const totalCount = countResult.recordset[0]?.totalCount ?? 0;
    const orderByColumn = ORDER_BY_MAP[input.orderBy.toLowerCase()] ?? ORDER_BY_MAP.createdat;
    const orderDirection = input.orderDesc ? "DESC" : "ASC";
    const offset = (input.page - 1) * input.pageSize;

    const dataRequest = await this.createRequest();
    if (input.search) {
      this.bindInput(dataRequest, "search", sql.NVarChar(255), `%${input.search}%`);
    }
    if (input.status) {
      this.bindInput(dataRequest, "status", sql.NVarChar(20), input.status);
    }
    this.bindInput(dataRequest, "offset", sql.Int, offset);
    this.bindInput(dataRequest, "pageSize", sql.Int, input.pageSize);

    const dataResult = await dataRequest.query<UserManagementListRow>(`
      WITH completion_agg AS (
        SELECT
          c.user_id,
          COUNT(1) AS totalExercisesCompleted,
          ISNULL(AVG(CAST(c.score AS FLOAT)), 0) AS averageScore,
          ISNULL(SUM(CASE WHEN c.completed_at >= DATEADD(DAY, -7, SYSUTCDATETIME()) THEN CAST(c.score AS INT) ELSE 0 END), 0) AS weeklyXP,
          ISNULL(SUM(CASE WHEN c.completed_at >= DATEADD(DAY, -30, SYSUTCDATETIME()) THEN CAST(c.score AS INT) ELSE 0 END), 0) AS monthlyXP
        FROM dbo.exercise_completions c
        WHERE c.is_completed = 1
        GROUP BY c.user_id
      )
      SELECT
        CAST(u.id AS NVARCHAR(50)) AS Id,
        u.username AS Username,
        ISNULL(u.full_name, u.username) AS FullName,
        u.email AS Email,
        u.created_at AS CreatedAt,
        u.last_active_at AS LastLoginAt,
        CASE WHEN u.status = N'active' THEN N'Active' ELSE N'Inactive' END AS Status,
        u.total_xp AS TotalXP,
        ISNULL(ca.weeklyXP, 0) AS WeeklyXP,
        ISNULL(ca.monthlyXP, 0) AS MonthlyXP,
        ISNULL(ca.totalExercisesCompleted, 0) AS TotalExercisesCompleted,
        ISNULL(ca.averageScore, 0) AS AverageScore
      FROM dbo.users u
      LEFT JOIN completion_agg ca ON ca.user_id = u.id
      ${whereClause}
      ORDER BY ${orderByColumn} ${orderDirection}
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `);

    return { rows: dataResult.recordset, totalCount };
  }

  async getUserDetailById(userId: number): Promise<UserManagementDetailRow | null> {
    const request = await this.createRequest();
    this.bindInput(request, "userId", sql.Int, userId);

    const result = await request.query<UserManagementDetailRow>(`
      SELECT TOP (1)
        CAST(u.id AS NVARCHAR(50)) AS Id,
        u.username AS Username,
        ISNULL(u.full_name, u.username) AS FullName,
        u.email AS Email,
        u.created_at AS CreatedAt,
        u.last_active_at AS LastLoginAt,
        CASE WHEN u.status = N'active' THEN N'Active' ELSE N'Inactive' END AS Status,
        u.total_xp AS TotalXP,
        NULL AS PreferredLevel
      FROM dbo.users u
      WHERE u.id = @userId
    `);

    return result.recordset[0] ?? null;
  }

  async getCompletedExercisesByUserId(userId: number): Promise<UserCompletionDetailRow[]> {
    const request = await this.createRequest();
    this.bindInput(request, "userId", sql.Int, userId);

    const result = await request.query<UserCompletionDetailRow>(`
      SELECT
        c.exercise_id AS ExerciseId,
        ISNULL(e.title, N'') AS Title,
        e.type AS Type,
        CAST(c.score AS FLOAT) AS Score,
        c.started_at AS StartedAt,
        c.completed_at AS CompletedAt
      FROM dbo.exercise_completions c
      LEFT JOIN dbo.exercises e ON e.id = c.exercise_id
      WHERE c.user_id = @userId
        AND c.is_completed = 1
      ORDER BY c.completed_at DESC
    `);

    return result.recordset;
  }

  async createUser(input: CreateUserDbInput): Promise<number> {
    const request = await this.createRequest();
    this.bindInput(request, "username", sql.NVarChar(100), input.username);
    this.bindInput(request, "fullName", sql.NVarChar(200), input.fullName);
    this.bindInput(request, "email", sql.NVarChar(255), input.email);
    this.bindInput(request, "status", sql.NVarChar(20), input.status);
    this.bindInput(request, "totalXP", sql.Int, input.totalXP);

    const result = await request.query<{ id: number }>(`
      INSERT INTO dbo.users (
        username,
        email,
        password_hash,
        full_name,
        status,
        account_type,
        role,
        total_xp,
        created_at,
        updated_at,
        last_active_at
      )
      OUTPUT INSERTED.id
      VALUES (
        @username,
        @email,
        N'',
        @fullName,
        @status,
        N'free',
        N'user',
        @totalXP,
        SYSUTCDATETIME(),
        SYSUTCDATETIME(),
        SYSUTCDATETIME()
      )
    `);

    return result.recordset[0]?.id ?? 0;
  }

  async updateUser(userId: number, input: UpdateUserDbInput): Promise<boolean> {
    const request = await this.createRequest();
    this.bindInput(request, "userId", sql.Int, userId);
    this.bindInput(request, "username", sql.NVarChar(100), input.username);
    this.bindInput(request, "fullName", sql.NVarChar(200), input.fullName);
    this.bindInput(request, "email", sql.NVarChar(255), input.email);
    this.bindInput(request, "status", sql.NVarChar(20), input.status);
    this.bindInput(request, "totalXP", sql.Int, input.totalXP);

    const result = await request.query(`
      UPDATE dbo.users
      SET username = @username,
          full_name = @fullName,
          email = @email,
          status = @status,
          total_xp = @totalXP,
          updated_at = SYSUTCDATETIME()
      WHERE id = @userId
    `);

    return (result.rowsAffected[0] ?? 0) > 0;
  }

  async softDeleteUser(userId: number): Promise<boolean> {
    const request = await this.createRequest();
    this.bindInput(request, "userId", sql.Int, userId);

    const result = await request.query(`
      UPDATE dbo.users
      SET status = N'inactive',
          updated_at = SYSUTCDATETIME()
      WHERE id = @userId
    `);

    return (result.rowsAffected[0] ?? 0) > 0;
  }

  async getUsersForExport(): Promise<UserExportRow[]> {
    const request = await this.createRequest();

    const result = await request.query<UserExportRow>(`
      WITH completion_agg AS (
        SELECT
          c.user_id,
          COUNT(1) AS exercisesCompleted,
          ISNULL(AVG(CAST(c.score AS FLOAT)), 0) AS averageScore
        FROM dbo.exercise_completions c
        WHERE c.is_completed = 1
        GROUP BY c.user_id
      )
      SELECT
        u.username AS Username,
        ISNULL(u.full_name, u.username) AS FullName,
        u.email AS Email,
        CASE WHEN u.status = N'active' THEN N'Active' ELSE N'Inactive' END AS Status,
        u.total_xp AS TotalXP,
        ISNULL(ca.exercisesCompleted, 0) AS ExercisesCompleted,
        ISNULL(ca.averageScore, 0) AS AverageScore,
        u.last_active_at AS LastActive,
        u.created_at AS CreatedAt
      FROM dbo.users u
      LEFT JOIN completion_agg ca ON ca.user_id = u.id
      ORDER BY u.created_at DESC
    `);

    return result.recordset;
  }
}
