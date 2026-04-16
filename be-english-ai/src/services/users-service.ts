import { UsersRepository, type UserDetailRow, type UserListFilters } from "../database/repositories/users-repository";

const usersRepository = new UsersRepository();

function normalizePage(value: number | undefined): number {
  if (!value || Number.isNaN(value) || value < 1) {
    return 1;
  }

  return value;
}

function normalizePageSize(value: number | undefined): number {
  if (!value || Number.isNaN(value) || value < 1) {
    return 10;
  }

  return Math.min(100, value);
}

function toIsoOrNull(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function mapUserDetail(user: UserDetailRow) {
  return {
    ...user,
    PremiumExpiresAt: toIsoOrNull(user.PremiumExpiresAt),
    LastActiveAt: toIsoOrNull(user.LastActiveAt),
    CreatedAt: user.CreatedAt.toISOString(),
    UpdatedAt: user.UpdatedAt.toISOString(),
  };
}

export async function getUsers(input: {
  page?: number;
  pageSize?: number;
  accountType?: "basic" | "pre" | "max";
  search?: string;
  status?: "active" | "inactive" | "banned";
}) {
  const normalizedSearch = input.search?.trim() || undefined;

  const filters: UserListFilters = {
    page: normalizePage(input.page),
    pageSize: normalizePageSize(input.pageSize),
    ...(input.accountType ? { accountType: input.accountType } : {}),
    ...(normalizedSearch ? { search: normalizedSearch } : {}),
    ...(input.status ? { status: input.status } : {}),
  };

  const { rows, totalCount } = await usersRepository.getUsers(filters);
  const totalPages = Math.ceil(totalCount / filters.pageSize);

  return {
    Data: rows.map((row) => ({
      ...row,
      PremiumExpiresAt: toIsoOrNull(row.PremiumExpiresAt),
      CreatedAt: row.CreatedAt.toISOString(),
    })),
    Pagination: {
      CurrentPage: filters.page,
      PageSize: filters.pageSize,
      TotalCount: totalCount,
      TotalPages: totalPages,
      HasPrevious: filters.page > 1,
      HasNext: filters.page < totalPages,
    },
  };
}

export async function getUserById(userId: number) {
  const user = await usersRepository.getUserById(userId);
  if (!user) {
    return null;
  }

  return mapUserDetail(user);
}

export async function updateUserStatus(userId: number, status: "active" | "inactive" | "banned") {
  return usersRepository.updateUserStatus(userId, status);
}
