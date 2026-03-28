import sql from "mssql";
import { getDbPool } from "../sqlserver/client";

export abstract class BaseRepository {
  protected async createRequest(transaction?: sql.Transaction): Promise<sql.Request> {
    if (transaction) {
      return new sql.Request(transaction);
    }

    const pool = await getDbPool();
    return pool.request();
  }

  protected bindInput(
    request: sql.Request,
    key: string,
    type: (() => sql.ISqlType) | sql.ISqlType,
    value: unknown,
  ): sql.Request {
    request.input(key, type, value as never);
    return request;
  }
}
