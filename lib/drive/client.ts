import { google } from "googleapis"

function getServiceAccountCredentials() {
  const credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!credentialsJson) {
    throw new Error("Variavel de ambiente GOOGLE_SERVICE_ACCOUNT_JSON nao definida")
  }

  const trimmed = credentialsJson.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    try {
      const decoded = Buffer.from(trimmed, "base64").toString("utf-8")
      return JSON.parse(decoded)
    } catch {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON deve ser JSON ou base64 de JSON")
    }
  }
}

function getDriveClient() {
  const credentials = getServiceAccountCredentials()
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive"],
  })
  return google.drive({ version: "v3", auth })
}

export async function createFolder(name: string, parentFolderId: string): Promise<string> {
  const drive = getDriveClient()
  const response = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId],
    },
    fields: "id",
  })
  return response.data.id!
}

export async function uploadFile(
  file: Buffer,
  name: string,
  mimeType: string,
  parentFolderId: string,
): Promise<string> {
  const drive = getDriveClient()
  const { Readable } = await import("stream")

  const response = await drive.files.create({
    requestBody: {
      name,
      parents: [parentFolderId],
    },
    media: {
      mimeType,
      body: Readable.from(file),
    },
    fields: "id",
  })
  return response.data.id!
}

export async function getFileStream(fileId: string) {
  const drive = getDriveClient()
  const response = await drive.files.get({ fileId, alt: "media" }, { responseType: "stream" })
  return response.data
}

export async function getFileMetadata(fileId: string) {
  const drive = getDriveClient()
  const response = await drive.files.get({
    fileId,
    fields: "id,name,mimeType,size",
  })
  return response.data
}

export async function testDriveAccess(folderId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const drive = getDriveClient()
    await drive.files.list({
      q: `'${folderId}' in parents`,
      pageSize: 1,
      fields: "files(id)",
    })
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: mapDriveError(error),
    }
  }
}

function mapDriveError(error: unknown): string {
  if (error && typeof error === "object") {
    const err = error as { code?: number; status?: number; response?: { status?: number }; message?: string }
    const status = err.code ?? err.status ?? err.response?.status
    if (status === 403) {
      return "Permissao negada no Google Drive. Verifique o compartilhamento da pasta."
    }
    if (status === 404) {
      return "Pasta do Drive nao encontrada. Verifique o ID informado."
    }
  }

  return "Erro ao acessar o Google Drive"
}

export function getServiceAccountEmail(): string {
  const credentials = getServiceAccountCredentials()
  return credentials.client_email
}

export const driveClient = {
  createFolder,
  uploadFile,
  getFileStream,
  getFileMetadata,
  testAccess: testDriveAccess,
  getServiceAccountEmail,
}
