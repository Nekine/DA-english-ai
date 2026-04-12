import sql from "mssql";
import { getDbPool } from "./client";

export async function withTransaction<T>(
  handler: (trx: sql.Transaction) => Promise<T>,
): Promise<T> {
  const pool = await getDbPool();
  const trx = pool.transaction();
  let started = false;

  await trx.begin();
  started = true;

  try {
    const result = await handler(trx);
    await trx.commit();
    started = false;
    return result;
  } catch (error) {
    if (started) {
      try {
        await trx.rollback();
      } catch {
        // Ignore rollback errors when transaction is already finalized.
      }
    }
    throw error;
  }
}
