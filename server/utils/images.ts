import type { H3Event } from 'h3'
import { put } from '@vercel/blob'

const TYPES: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' }
const MAX_BYTES = 4 * 1024 * 1024 // Vercel functions accept request bodies up to about 4.5 MB

// The image in a multipart upload's "file" field, checked: one of `types`, at most 4 MB.
export async function readUploadedImage(event: H3Event, types = Object.keys(TYPES)) {
  const file = (await readMultipartFormData(event))?.find((part) => part.name === 'file')
  const extension = file?.type && types.includes(file.type) ? TYPES[file.type] : undefined
  if (!file || !extension) {
    const names = types.map((t) => TYPES[t]!.toUpperCase()).join(', ')
    throw createError({ statusCode: 400, statusMessage: `Use a ${names} image` })
  }
  if (file.data.length > MAX_BYTES) throw createError({ statusCode: 400, statusMessage: 'That image is over 4 MB. Use a smaller one.' })
  return { data: file.data, type: file.type!, extension }
}

// Stores an uploaded image in Vercel Blob and returns its public address. Used for article images and the
// help site's hero image. Needs a Blob store on the project (Vercel > Storage), which sets BLOB_READ_WRITE_TOKEN.
export async function storeUploadedImage(event: H3Event, folder: string): Promise<string> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw createError({ statusCode: 503, statusMessage: 'Image uploads need a Vercel Blob store. Add one to the project in Vercel > Storage.' })
  }
  const image = await readUploadedImage(event)
  const blob = await put(`${folder}/image.${image.extension}`, image.data, { access: 'public', contentType: image.type, addRandomSuffix: true })
  return blob.url
}
