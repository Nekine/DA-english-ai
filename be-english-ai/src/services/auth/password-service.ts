import bcrypt from "bcryptjs";

const DEFAULT_SALT_ROUNDS = 10;

function resolveSaltRounds(): number {
  const value = process.env.PASSWORD_SALT_ROUNDS;
  if (!value) {
    return DEFAULT_SALT_ROUNDS;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 8 || parsed > 14) {
    return DEFAULT_SALT_ROUNDS;
  }

  return parsed;
}

export async function hashPassword(plainTextPassword: string): Promise<string> {
  const saltRounds = resolveSaltRounds();
  return bcrypt.hash(plainTextPassword, saltRounds);
}

export async function verifyPassword(
  plainTextPassword: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(plainTextPassword, passwordHash);
}
