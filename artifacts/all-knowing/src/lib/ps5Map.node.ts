import { decodeGrayPng, decodePngRgba } from './pngGray'
import type { GrayImage } from './ps5Image'
import type { NodeOcrWorker } from './ps5Capture.node'
import type { ColorImage } from './ps5MapGraces'

/**
 * Task 135 — Node adapter: decode one map photo to both the gray buffer the
 * registration uses and the RGBA buffer the grace-colour detector uses. Tesseract
 * exposes both without running OCR (`imageGrey`/`imageColor` are non-recognition
 * outputs), so this is a decode, not a page read.
 */
export type MapPhoto = { gray: GrayImage; color: ColorImage }

type DecodedOutput = { imageGrey?: string | null; imageColor?: string | null }

export async function mapPhotoFromFile(worker: NodeOcrWorker, imagePath: string): Promise<MapPhoto> {
  const { data } = await worker.recognize(imagePath, {}, { imageGrey: true, imageColor: true })
  const out = data as unknown as DecodedOutput
  if (!out.imageGrey) throw new Error('Tesseract did not return a grayscale image')
  if (!out.imageColor) throw new Error('Tesseract did not return a colour image')
  return {
    gray: decodeGrayPng(Buffer.from(out.imageGrey.split(',')[1], 'base64')),
    color: decodePngRgba(Buffer.from(out.imageColor.split(',')[1], 'base64')),
  }
}
