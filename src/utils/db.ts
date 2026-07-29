import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function query(sqlText: string, params?: unknown[]) {
  return sql(sqlText, params);
}
