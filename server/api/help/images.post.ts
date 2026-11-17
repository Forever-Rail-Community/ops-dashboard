import { put } from '@vercel/blob'

// Images for help articles. They are stored in Vercel Blob (add a Blob store to the project; it sets
// BLOB_READ_WRITE_TOKEN), and the editor puts the returned address in the article.
const TYPES: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' }
const MAX_BYTES = 4 * 1024 * 1024 // Vercel functions accept request bodies up to about 4.5 MB

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'help.edit')
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw createError({ statusCode: 503, statusMessage: 'Image uploads need a Vercel Blob store. Add one to the project in Vercel > Storage.' })
  }

  const file = (await readMultipartFormData(event))?.find((part) => part.name === 'file')
  const extension = file?.type ? TYPES[file.type] : undefined
  if (!file || !extension) throw createError({ statusCode: 400, statusMessage: 'Use a PNG, JPG, WebP, or GIF image' })
  if (file.data.length > MAX_BYTES) throw createError({ statusCode: 400, statusMessage: 'That image is over 4 MB. Use a smaller one.' })

  const blob = await put(`help/image.${extension}`, file.data, { access: 'public', contentType: file.type, addRandomSuffix: true })
  return { url: blob.url }
})
