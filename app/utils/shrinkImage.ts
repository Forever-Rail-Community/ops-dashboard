// Makes a screenshot smaller before it's uploaded: at most MAX_SIDE pixels on its longest side, re-encoded as WebP
// (or JPEG where the browser can't make WebP). Keeps uploads well under the 4 MB limit and storage small. A small image
// that's already a PNG, JPEG or WebP is sent as it is.
const MAX_SIDE = 1920
const KEEP_UNDER = 600 * 1024

export async function shrinkImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  if (scale === 1 && file.size < KEEP_UNDER && ['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    bitmap.close()
    return file
  }
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const encode = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85))
  const webp = await encode('image/webp')
  // Browsers that can't encode WebP hand back a PNG instead; JPEG is smaller for screenshots of maps.
  return webp?.type === 'image/webp' ? webp : ((await encode('image/jpeg')) ?? file)
}
