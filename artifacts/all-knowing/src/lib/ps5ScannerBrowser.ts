import { ensureEntityIndex } from './entityEnrich'
import { grayFromImage, grayToCanvas } from './ps5Capture'
import { preprocessVariants, ps5PreprocessLadder, rgbaToGray, type GrayImage } from './ps5Image'
import { readImageTsv } from './ocr'
import { parseTsvWords } from './ps5Ocr'
import { analyzeFrame, extractScanObservation, InventoryStabilizer, type ScanResult } from './ps5Scanner'

/**
 * Task 136 §2/§3 — browser plumbing for the live scanner.
 *
 * The pure engine (`ps5Scanner.ts`) owns the stabilising/dedupe logic; this file
 * turns DOM pixels into `GrayImage`s, runs the shared Tesseract worker (one
 * worker for the whole session, via `ocr.ts`), and drives the camera / video
 * frame loop. Nothing here is imported by the Node OCR eval.
 */

/** One still photo → the same pipeline as one accumulated run of video frames. */
export async function scanImage(image: Blob | string): Promise<ScanResult> {
  ensureEntityIndex()
  const gray = await grayFromImage(image)
  // A still has no second frame to agree with, so run the full Task 134 ladder
  // (deskew + median + otsu included) and let its reads vote.
  const variants = preprocessVariants(gray).map((v) => v.image)
  const observations = await analyzeFrame(variants, gray.width, (variant, psm) =>
    readImageTsv(variant as HTMLCanvasElement, psm).then((read) => parseTsvWords(read.tsv)),
  )
  const stabilizer = new InventoryStabilizer()
  stabilizer.observe(observations)
  return stabilizer.result()
}

/** Read a `<video>` element's current frame as an 8-bit grayscale buffer. */
export function grayFromVideo(video: HTMLVideoElement): GrayImage | undefined {
  const width = video.videoWidth
  const height = video.videoHeight
  if (!width || !height) return undefined
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas is unavailable.')
  ctx.drawImage(video, 0, 0, width, height)
  const { data } = ctx.getImageData(0, 0, width, height)
  return rgbaToGray(data, width, height)
}

export type CameraScannerEvents = {
  /** Called after every processed frame with the running result. */
  onFrame?: (result: ScanResult, frames: number) => void
  onError?: (error: Error) => void
}

export type CameraScannerOptions = CameraScannerEvents & {
  /** Frames per second to sample (4–6 keeps up with a D-pad walk). */
  targetFps?: number
}

/**
 * Walk a page with the D-pad while the camera watches. Each sampled frame is
 * preprocessed through the Task 134 winning path (one variant for speed) and
 * OCR'd once (psm 6); consensus across successive frames confirms a name.
 */
export class CameraInventoryScanner {
  readonly stabilizer = new InventoryStabilizer()
  private readonly opts: CameraScannerOptions
  private stream?: MediaStream
  private video?: HTMLVideoElement
  private objectUrl?: string
  private running = false
  private lastSample = 0
  private frames = 0
  private rvfcHandle?: number
  private timer?: ReturnType<typeof setTimeout>

  constructor(opts: CameraScannerOptions = {}) {
    this.opts = opts
  }

  get frameCount(): number {
    return this.frames
  }

  /** Open the rear camera on the given `<video>` and start sampling. */
  async startCamera(video: HTMLVideoElement): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1920 } },
      audio: false,
    })
    this.stream = stream
    this.video = video
    video.srcObject = stream
    video.muted = true
    await video.play().catch(() => undefined)
    this.loop()
  }

  /** Stream a user-picked recorded clip through the same pipeline. */
  startVideoFile(video: HTMLVideoElement, file: File): void {
    this.video = video
    this.objectUrl = URL.createObjectURL(file)
    video.srcObject = null
    video.src = this.objectUrl
    video.muted = true
    video.loop = false
    void video.play().catch((error) => this.fail(error))
    this.loop()
  }

  hasTorch(): boolean {
    const track = this.stream?.getVideoTracks()[0]
    const caps = track?.getCapabilities?.() as { torch?: boolean } | undefined
    return Boolean(caps?.torch)
  }

  async setTorch(on: boolean): Promise<void> {
    const track = this.stream?.getVideoTracks()[0]
    if (!track) return
    await track.applyConstraints({ advanced: [{ torch: on }] } as unknown as MediaTrackConstraints)
  }

  stop(): void {
    this.running = false
    if (this.rvfcHandle !== undefined && this.video?.cancelVideoFrameCallback) {
      this.video.cancelVideoFrameCallback(this.rvfcHandle)
    }
    this.rvfcHandle = undefined
    if (this.timer) clearTimeout(this.timer)
    this.timer = undefined
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = undefined
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl)
    this.objectUrl = undefined
  }

  result(): ScanResult {
    return this.stabilizer.result()
  }

  private fail(error: unknown): void {
    this.opts.onError?.(error instanceof Error ? error : new Error('Camera read failed.'))
  }

  private loop = (): void => {
    if (this.running) return
    this.running = true
    const step = () => {
      if (!this.running || !this.video) return
      const now = performance.now()
      if (now - this.lastSample >= 1000 / (this.opts.targetFps ?? 5)) {
        this.lastSample = now
        void this.sample()
      }
      this.schedule(step)
    }
    this.schedule(step)
  }

  private schedule(step: () => void): void {
    const video = this.video
    if (video && typeof video.requestVideoFrameCallback === 'function') {
      this.rvfcHandle = video.requestVideoFrameCallback(() => step())
    } else {
      this.timer = setTimeout(step, 40)
    }
  }

  private async sample(): Promise<void> {
    try {
      const video = this.video
      if (!video || video.readyState < 2) return
      const gray = grayFromVideo(video)
      if (!gray) return
      const variant = ps5PreprocessLadder(gray)[0]
      const read = await readImageTsv(grayToCanvas(variant), '6')
      const observation = extractScanObservation(parseTsvWords(read.tsv), gray.width)
      this.stabilizer.observe(observation)
      this.frames++
      this.opts.onFrame?.(this.stabilizer.result(), this.frames)
    } catch (error) {
      this.fail(error)
    }
  }
}
