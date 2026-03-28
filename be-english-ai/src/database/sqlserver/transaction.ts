import sql from "mssql";
import { getDbPool } from "./client";

export async function withTransaction<T>(
  handler: (trx: sql.Transaction) => Promise<T>,
): Promise<T> {
  const pool = await getDbPool();
  const trx = new sql.Transaction(pool);

  await trx.begin();

  try {
    const result = await handler(trx);
    await trx.commit();
    return result;
  } catch (error) {
    await trx.rollback();
    throw error;
  }
}
