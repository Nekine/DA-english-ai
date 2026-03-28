import sql from "mssql";
import { BaseRepository } from "./base-repository";

export interface LeaderboardRow {
  Rank: number;
  UserID: number;
  Username: string;
  FullName: string | null;
  Avatar: string | null;
  TotalXP: number;
  ExercisesCompleted: number;
  LastActiveAt: Date | null;
}

export interface LeaderboardFilters {
  limit: number;
  timeFilter?: string;
  search?: string;
}

export class LeaderboardRepository extends BaseRepository {
  async getLeaderboard(filters: LeaderboardFilters): Promise<LeaderboardRow[]> {
    const request = await this.createRequest();
    this.bindInput(request, "limit", sql.Int, filters.limit);

    const whereParts = ["u.status = N'active'"];

    if (filters.timeFilter === "today") {
      whereParts.push("u.last_active_at >= DATEADD(DAY, -1, SYSUTCDATETIME())");
    } else if (filters.timeFilter === "week") {
      whereParts.push("u.last_active_at >= DATEADD(DAY, -7, SYSUTCDATETIME())");
    } else if (filters.timeFilter === "month") {
      whereParts.push("u.last_active_at >= DATEADD(DAY, -30, SYSUTCDATETIME())");
    }

    if (filters.search) {
      whereParts.push("(u.username LIKE @search OR ISNULL(u.full_name, N'') LIKE @search)");
      this.bindInput(request, "search", sql.NVarChar(255), `%${filters.search}%`);
    }

    const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";

    const result = await request.query<LeaderboardRow>(`
      WITH completion_agg AS (
        SELECT
          c.user_id,
          COUNT(1) AS exercisesCompleted
        FROM dbo.exercise_completions c
        WHERE c.is_completed = 1
        GROUP BY c.user_id
      ),
      ranked_users AS (
        SELECT
          ROW_NUMBER() OVER (ORDER BY u.total_xp DESC, u.id ASC) AS Rank,
          u.id AS UserID,
          u.username AS Username,
          u.full_name AS FullName,
          u.avatar_url AS Avatar,
          u.total_xp AS TotalXP,
          ISNULL(ca.exercisesCompleted, 0) AS ExercisesCompleted,
          u.last_active_at AS LastActiveAt
        FROM dbo.users u
        LEFT JOIN completion_agg ca ON ca.user_id = u.id
        ${whereClause}
      )
      SELECT TOP (@limit)
        Rank,
        UserID,
        Username,
        FullName,
        Avatar,
        TotalXP,
        ExercisesCompleted,
        LastActiveAt
      FROM ranked_users
      ORDER BY Rank ASC
    `);

    return result.recordset;
  }

  async getUserRank(userId: number): Promise<number | null> {
    const request = await this.createRequest();
    this.bindInput(request, "userId", sql.Int, userId);

    const result = await request.query<{ Rank: number }>(`
      WITH ranked_users AS (
        SELECT
          ROW_NUMBER() OVER (ORDER BY u.total_xp DESC, u.id ASC) AS Rank,
          u.id AS UserID
        FROM dbo.users u
        WHERE u.status = N'active'
      )
      SELECT TOP (1) Rank
      FROM ranked_users
      WHERE UserID = @userId
    `);

    return result.recordset[0]?.Rank ?? null;
  }
}

export const leaderboardRepository = new LeaderboardRepository();
