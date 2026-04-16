import { UserManagementRepository } from "../database/repositories/user-management-repository";
import * as XLSX from "xlsx";

const userManagementRepository = new UserManagementRepository();

function normalizePage(value: number | undefined): number {
  if (!value || Number.isNaN(value) || value < 1) {
    return 1;
  }

  return value;
}

function normalizePageSize(value: number | undefined): number {
  if (!value || Number.isNaN(value) || value < 1) {
    return 20;
  }

  return Math.min(100, value);
}

function toLevel(totalXP: number): string {
  return String(Math.floor(totalXP / 1000) + 1);
}

function formatDateTime(value: Date | null): string {
  if (!value) {
    return "";
  }

  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  const hour = String(value.getUTCHours()).padStart(2, "0");
  const minute = String(value.getUTCMinutes()).padStart(2, "0");
  const second = String(value.getUTCSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function safeAverage(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, current) => sum + current, 0) / values.length;
}

export async function getUserManagementUsers(input: {
  search?: string;
  status?: string;
  level?: string;
  orderBy?: string;
  orderDesc?: boolean;
  page?: number;
  pageSize?: number;
}) {
  const page = normalizePage(input.page);
  const pageSize = normalizePageSize(input.pageSize);
  const orderBy = input.orderBy?.trim() || "CreatedAt";

  const { rows, totalCount } = await userManagementRepository.getUsers({
    page,
    pageSize,
    orderBy,
    orderDesc: input.orderDesc ?? true,
    ...(input.search?.trim() ? { search: input.search.trim() } : {}),
    ...(input.status?.trim() ? { status: input.status.trim().toLowerCase() } : {}),
    ...(input.level?.trim() ? { level: input.level.trim() } : {}),
  });

  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    Data: rows.map((user) => ({
      Id: user.Id,
      userName: user.Username,
      FullName: user.FullName,
      Email: user.Email,
      CreatedAt: user.CreatedAt.toISOString(),
      LastLoginAt: user.LastLoginAt?.toISOString() ?? user.CreatedAt.toISOString(),
      Status: user.Status,
      Level: toLevel(user.TotalXP),
      TotalXP: user.TotalXP,
      WeeklyXP: user.WeeklyXP,
      MonthlyXP: user.MonthlyXP,
      TotalExercisesCompleted: user.TotalExercisesCompleted,
      AverageScore: Number(user.AverageScore),
      StreakDays: 0,
      PreferredLevel: "Beginner",
      Achievements: [],
    })),
    TotalCount: totalCount,
    Page: page,
    PageSize: pageSize,
    TotalPages: totalPages,
    HasNextPage: page < totalPages,
    HasPreviousPage: page > 1,
  };
}

export async function getNewUsersCreatedDatesFromNguoiDung() {
  const dates = await userManagementRepository.getNguoiDungCreatedDates();

  return {
    Data: dates.map((date) => date.toISOString()),
    TotalCount: dates.length,
  };
}

export async function getUserManagementUserDetail(userId: number) {
  const user = await userManagementRepository.getUserDetailById(userId);
  if (!user) {
    return null;
  }

  const completedExercises = await userManagementRepository.getCompletedExercisesByUserId(userId);

  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const weekStart = new Date(todayStart);
  weekStart.setUTCDate(weekStart.getUTCDate() - 7);
  const monthStart = new Date(todayStart);
  monthStart.setUTCDate(monthStart.getUTCDate() - 30);

  const todayResults = completedExercises.filter(
    (item) => item.CompletedAt && item.CompletedAt >= todayStart,
  );
  const weekResults = completedExercises.filter(
    (item) => item.CompletedAt && item.CompletedAt >= weekStart,
  );
  const monthResults = completedExercises.filter(
    (item) => item.CompletedAt && item.CompletedAt >= monthStart,
  );

  const scores = completedExercises.map((item) => item.Score);
  const averageScore = safeAverage(scores);
  const bestScore = scores.length > 0 ? Math.max(...scores) : 0;

  const recentExercises = completedExercises.slice(0, 10).map((item) => ({
    ExerciseId: item.ExerciseId,
    Title: item.Title,
    Type: item.Type ?? "unknown",
    Score: item.Score,
    CompletedAt: item.CompletedAt?.toISOString() ?? new Date().toISOString(),
    Duration:
      item.CompletedAt && item.StartedAt
        ? Math.max(0, item.CompletedAt.getTime() - item.StartedAt.getTime())
        : 0,
  }));

  const groupedByType = new Map<string, typeof completedExercises>();
  for (const item of completedExercises) {
    const key = item.Type ?? "unknown";
    const current = groupedByType.get(key);
    if (current) {
      current.push(item);
    } else {
      groupedByType.set(key, [item]);
    }
  }

  const performanceByType = [...groupedByType.entries()].map(([type, items]) => {
    const typeScores = items.map((item) => item.Score);
    const totalTimeMs = items
      .filter((item) => item.CompletedAt && item.StartedAt)
      .reduce((sum, item) => {
        const completedAt = item.CompletedAt as Date;
        const startedAt = item.StartedAt as Date;
        return sum + Math.max(0, completedAt.getTime() - startedAt.getTime());
      }, 0);

    return {
      Type: type,
      TotalAttempts: items.length,
      AverageScore: safeAverage(typeScores),
      BestScore: typeScores.length > 0 ? Math.max(...typeScores) : 0,
      TotalTimeSpent: totalTimeMs,
    };
  });

  return {
    Id: user.Id,
    userName: user.Username,
    FullName: user.FullName,
    Email: user.Email,
    CreatedAt: user.CreatedAt.toISOString(),
    LastLoginAt: user.LastLoginAt?.toISOString() ?? user.CreatedAt.toISOString(),
    Status: user.Status,
    Level: toLevel(user.TotalXP),
    TotalXP: user.TotalXP,
    WeeklyXP: weekResults.reduce((sum, item) => sum + item.Score, 0),
    MonthlyXP: monthResults.reduce((sum, item) => sum + item.Score, 0),
    TodayXP: todayResults.reduce((sum, item) => sum + item.Score, 0),
    TotalExercisesCompleted: completedExercises.length,
    AverageScore: averageScore,
    BestScore: bestScore,
    StreakDays: 0,
    PreferredLevel: user.PreferredLevel ?? "Beginner",
    Achievements: [],
    RecentExercises: recentExercises,
    PerformanceByType: performanceByType,
  };
}

export async function createUserManagementUser(input: {
  username: string;
  email: string;
  fullName: string;
  preferredLevel?: string;
  status: "Active" | "Inactive";
  totalXP: number;
}) {
  const usernameExists = await userManagementRepository.existsByUsername(input.username);
  if (usernameExists) {
    return {
      statusCode: 400,
      body: { message: "Username already exists" },
    } as const;
  }

  const createdId = await userManagementRepository.createUser({
    username: input.username,
    fullName: input.fullName,
    email: input.email,
    status: input.status === "Active" ? "active" : "inactive",
    totalXP: input.totalXP,
  });

  const createdUser = await getUserManagementUserDetail(createdId);
  if (!createdUser) {
    return {
      statusCode: 500,
      body: { message: "Error creating user" },
    } as const;
  }

  return {
    statusCode: 201,
    body: createdUser,
  } as const;
}

export async function updateUserManagementUser(
  userId: number,
  input: {
    username: string;
    email: string;
    fullName: string;
    preferredLevel?: string;
    status: "Active" | "Inactive";
    totalXP: number;
  },
) {
  const updated = await userManagementRepository.updateUser(userId, {
    username: input.username,
    fullName: input.fullName,
    email: input.email,
    status: input.status === "Active" ? "active" : "inactive",
    totalXP: input.totalXP,
  });

  if (!updated) {
    return {
      statusCode: 404,
      body: { message: "User not found" },
    } as const;
  }

  const detail = await getUserManagementUserDetail(userId);
  return {
    statusCode: 200,
    body: detail ?? { message: "User not found" },
  } as const;
}

export async function deleteUserManagementUser(userId: number) {
  const deleted = await userManagementRepository.softDeleteUser(userId);
  if (!deleted) {
    return {
      statusCode: 404,
      body: { message: "User not found" },
    } as const;
  }

  return {
    statusCode: 204,
    body: null,
  } as const;
}

type ImportResult = {
  TotalRows: number;
  SuccessCount: number;
  ErrorCount: number;
  Errors: string[];
};

function normalizeString(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

export async function importUsersFromExcel(buffer: Buffer): Promise<ImportResult> {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return {
      TotalRows: 0,
      SuccessCount: 0,
      ErrorCount: 1,
      Errors: ["No worksheet found in uploaded file"],
    };
  }

  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    return {
      TotalRows: 0,
      SuccessCount: 0,
      ErrorCount: 1,
      Errors: ["No worksheet found in uploaded file"],
    };
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  const result: ImportResult = {
    TotalRows: rows.length,
    SuccessCount: 0,
    ErrorCount: 0,
    Errors: [],
  };

  for (const [i, row] of rows.entries()) {
    const rowNumber = i + 2;

    const username =
      normalizeString(row.Username) || normalizeString(row.UserName) || normalizeString(row.username);
    const fullName = normalizeString(row.FullName) || normalizeString(row.fullName) || username;
    const email = normalizeString(row.Email) || normalizeString(row.email);
    const statusRaw = normalizeString(row.Status) || "Active";

    if (!username) {
      result.Errors.push(`Row ${rowNumber}: Username is required`);
      result.ErrorCount += 1;
      continue;
    }

    if (!email) {
      result.Errors.push(`Row ${rowNumber}: Email is required`);
      result.ErrorCount += 1;
      continue;
    }

    const exists = await userManagementRepository.existsByUsername(username);
    if (exists) {
      result.Errors.push(`Row ${rowNumber}: Username '${username}' already exists`);
      result.ErrorCount += 1;
      continue;
    }

    await userManagementRepository.createUser({
      username,
      fullName,
      email,
      status: statusRaw.toLowerCase() === "inactive" ? "inactive" : "active",
      totalXP: 0,
    });

    result.SuccessCount += 1;
  }

  return result;
}

export async function exportUsersToExcel(): Promise<{ fileBuffer: Buffer; fileName: string }> {
  const rows = await userManagementRepository.getUsersForExport();

  const exportRows = rows.map((row) => ({
    Username: row.Username,
    FullName: row.FullName,
    Email: row.Email,
    Level: toLevel(row.TotalXP),
    TotalXP: row.TotalXP,
    ExercisesCompleted: row.ExercisesCompleted,
    AverageScore: Number(row.AverageScore),
    StreakDays: 0,
    Status: row.Status,
    CreatedAt: formatDateTime(row.CreatedAt),
    LastActive: formatDateTime(row.LastActive),
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Users");

  const now = new Date();
  const timestamp = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(
    now.getUTCDate(),
  ).padStart(2, "0")}_${String(now.getUTCHours()).padStart(2, "0")}${String(
    now.getUTCMinutes(),
  ).padStart(2, "0")}${String(now.getUTCSeconds()).padStart(2, "0")}`;

  return {
    fileBuffer: XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer,
    fileName: `Users_Export_${timestamp}.xlsx`,
  };
}
