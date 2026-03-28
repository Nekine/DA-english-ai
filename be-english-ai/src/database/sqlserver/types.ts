export interface SqlServerConfig {
  server: string;
  port: number;
  database: string;
  user: string;
  password: string;
  encrypt: boolean;
  trustServerCertificate: boolean;
  poolMin: number;
  poolMax: number;
  connectionTimeoutMs: number;
  requestTimeoutMs: number;
}

export interface SqlPagingInput {
  page: number;
  pageSize: number;
}

export interface SqlPagingOutput {
  page: number;
  pageSize: number;
  offset: number;
  fetch: number;
}
