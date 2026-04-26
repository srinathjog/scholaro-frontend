import { Injectable } from '@angular/core';

/**
 * Compresses videos in the browser using FFmpeg.wasm (single-threaded build).
 * The WASM core is loaded lazily from CDN on first use and cached for the session.
 * No special COOP/COEP headers are required because we use the single-threaded core.
 */
@Injectable({ providedIn: 'root' })
export class VideoCompressionService {
  /** Cached FFmpeg instance — reused across calls to avoid re-loading WASM. */
  private ffmpegInstance: any = null;
  /** In-flight load promise — prevents double-loading if called concurrently. */
  private loadingPromise: Promise<any> | null = null;

  /** Files below this size are returned as-is (already small enough). */
  private readonly SKIP_THRESHOLD_BYTES = 15 * 1024 * 1024; // 15 MB

  /**
   * Load FFmpeg from CDN (single-threaded core — ~30 MB download, cached after first use).
   * We use the @ffmpeg/core UMD build which does NOT require SharedArrayBuffer.
   */
  private loadFFmpeg(): Promise<any> {
    if (this.ffmpegInstance) return Promise.resolve(this.ffmpegInstance);
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = (async () => {
      const { FFmpeg } = await import('@ffmpeg/ffmpeg');
      const { toBlobURL } = await import('@ffmpeg/util');

      const ffmpeg = new FFmpeg();

      // Single-threaded core — no SharedArrayBuffer / COOP+COEP needed
      const BASE = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${BASE}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${BASE}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      this.ffmpegInstance = ffmpeg;
      return ffmpeg;
    })().catch((err) => {
      // Reset so the next call retries
      this.loadingPromise = null;
      throw err;
    });

    return this.loadingPromise;
  }

  /**
   * Compress a video file to 720p H.264/AAC using FFmpeg.wasm.
   *
   * @param file     Raw video File from the file picker.
   * @param onStatus Called with a human-readable stage label and progress 0–100.
   * @returns        Compressed File, or the original if it was already small / compression failed.
   */
  async compressVideo(
    file: File,
    onStatus?: (message: string, pct: number) => void,
  ): Promise<File> {
    // Skip tiny files — they're already small enough
    if (file.size <= this.SKIP_THRESHOLD_BYTES) return file;

    onStatus?.('Loading compression engine…', 0);

    let ffmpeg: any;
    try {
      ffmpeg = await this.loadFFmpeg();
    } catch {
      // If loading fails (offline, CDN down), just pass the original through
      return file;
    }

    const { fetchFile } = await import('@ffmpeg/util');

    const ts = Date.now();
    const inputName = `in_${ts}.mp4`;
    const outputName = `out_${ts}.mp4`;

    const progressHandler = ({ progress }: { progress: number }) => {
      const pct = Math.min(99, Math.round(progress * 100));
      onStatus?.('Optimizing video for faster sharing…', pct);
    };

    ffmpeg.on('progress', progressHandler);

    try {
      onStatus?.('Optimizing video for faster sharing…', 1);

      await ffmpeg.writeFile(inputName, await fetchFile(file));

      await ffmpeg.exec([
        '-i', inputName,
        '-vf', 'scale=-2:720',     // 720p, preserve aspect ratio
        '-c:v', 'libx264',         // H.264 codec
        '-crf', '28',              // Quality (28 = good balance between size & quality)
        '-preset', 'ultrafast',    // Fastest encode — best for mobile hardware
        '-c:a', 'aac',
        '-b:a', '96k',
        '-movflags', '+faststart', // moov atom at front — enables streaming
        outputName,
      ]);

      const data = await ffmpeg.readFile(outputName);
      // Copy into a plain ArrayBuffer so TS is satisfied — Blob rejects SharedArrayBuffer
      const plainBuffer = (data as Uint8Array).buffer.slice(0) as ArrayBuffer;
      const blob = new Blob([plainBuffer], { type: 'video/mp4' });

      // If FFmpeg somehow produced a larger file, return the original
      if (blob.size >= file.size) return file;

      const compressedName = file.name.replace(/\.[^.]+$/, '.mp4');
      return new File([blob], compressedName, { type: 'video/mp4' });
    } catch {
      // Compression failed — silently pass the original through
      return file;
    } finally {
      ffmpeg.off('progress', progressHandler);
      try { await ffmpeg.deleteFile(inputName); } catch { /* ignore */ }
      try { await ffmpeg.deleteFile(outputName); } catch { /* ignore */ }
    }
  }
}
