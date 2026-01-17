import mysql from "mysql2/promise"

const {
  ERP_DB_HOST,
  ERP_DB_PORT,
  ERP_DB_USER,
  ERP_DB_PASSWORD,
  ERP_DB_NAME,
  ERP_DB_CONNECTION_LIMIT,
} = process.env

const pool = mysql.createPool({
  host: ERP_DB_HOST,
  port: ERP_DB_PORT ? Number(ERP_DB_PORT) : 3306,
  user: ERP_DB_USER,
  password: ERP_DB_PASSWORD,
  database: ERP_DB_NAME,
  waitForConnections: true,
  connectionLimit: ERP_DB_CONNECTION_LIMIT ? Number(ERP_DB_CONNECTION_LIMIT) : 10,
  queueLimit: 0,
})

export async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const [rows] = await pool.query<T[]>(sql, params)
  return rows
}
