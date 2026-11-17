import { del, get, put } from '@vercel/blob'

// Bug report screenshots, kept private: only the reporter and staff can see them, through
// GET /api/bugs/screenshots/<id>, which checks who's asking before streaming the file.
//
// They live in a separate, private Vercel Blob store (the help center's store is public). Its read-write token goes in
// NUXT_BUGS_BLOB_TOKEN. Without it, bug reports work without screenshots. In local development without a token,
// screenshots are kept in the dashboard's local storage instead, so the flow can be tried.

const token = () => (useRuntimeConfig().bugsBlobToken as string) || ''
const local = () => !token() && import.meta.dev

export const screenshotsEnabled = () => Boolean(token()) || import.meta.dev

export async function saveScreenshot(pathname: string, data: Buffer, contentType: string) {
  if (local()) {
    await useStorage('data').setItem(`screenshots:${pathname}`, { contentType, base64: data.toString('base64') })
    return
  }
  if (!token()) throw createError({ statusCode: 503, statusMessage: 'Screenshots need a private Vercel Blob store (NUXT_BUGS_BLOB_TOKEN).' })
  await put(pathname, data, { access: 'private', contentType, token: token(), addRandomSuffix: false })
}

// The file, or null when it isn't there.
export async function readScreenshot(pathname: string): Promise<{ stream: ReadableStream | Buffer; contentType: string } | null> {
  if (local()) {
    const item = await useStorage('data').getItem<{ contentType: string; base64: string }>(`screenshots:${pathname}`)
    return item ? { stream: Buffer.from(item.base64, 'base64'), contentType: item.contentType } : null
  }
  if (!token()) return null
  const result = await get(pathname, { access: 'private', token: token() })
  if (result?.statusCode !== 200) return null
  return { stream: result.stream, contentType: result.blob.contentType }
}

export async function deleteScreenshots(pathnames: string[]) {
  if (!pathnames.length) return
  if (local()) {
    await Promise.all(pathnames.map((p) => useStorage('data').removeItem(`screenshots:${p}`)))
    return
  }
  if (token()) await del(pathnames, { token: token() })
}
