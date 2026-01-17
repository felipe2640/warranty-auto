import { createPool, type Pool } from "mysql2/promise"
import { getRequiredEnv } from "@/lib/env"

type MySqlGlobal = typeof globalThis & {
  __erpMysqlPool?: Pool
}

const mysqlGlobal = globalThis as MySqlGlobal

function getPool(): Pool {
  if (mysqlGlobal.__erpMysqlPool) {
    return mysqlGlobal.__erpMysqlPool
  }

  const pool = createPool({
    host: getRequiredEnv("ERP_DB_HOST"),
    port: Number.parseInt(getRequiredEnv("ERP_DB_PORT"), 10),
    user: getRequiredEnv("ERP_DB_USER"),
    password: getRequiredEnv("ERP_DB_PASSWORD"),
    database: getRequiredEnv("ERP_DB_NAME"),
    waitForConnections: true,
    connectionLimit: 10,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  })

  mysqlGlobal.__erpMysqlPool = pool
  return pool
}

export async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const pool = getPool()
  const [rows] = await pool.query(sql, params)
  return rows as T[]
}
