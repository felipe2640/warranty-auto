import { createConnection } from "mysql2/promise"
import { getRequiredEnv } from "@/lib/env"

export async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  // CHG-20260207-01: fecha conexão ERP após cada consulta
  const connection = await createConnection({
    host: getRequiredEnv("ERP_DB_HOST"),
    port: Number.parseInt(getRequiredEnv("ERP_DB_PORT"), 10),
    user: getRequiredEnv("ERP_DB_USER"),
    password: getRequiredEnv("ERP_DB_PASSWORD"),
    database: getRequiredEnv("ERP_DB_NAME"),
  })

  try {
    const [rows] = await connection.query(sql, params)
    return rows as T[]
  } finally {
    await connection.end()
  }
}
