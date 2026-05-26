/**
 * Клиентское сжатие изображений перед загрузкой в storage.
 *
 * Зачем: iPhone-фото обычно 4-12 МБ HEIC/JPEG, аватарка в 12 МБ для веба
 * не нужна, а лимит сторэджа пробивается на раз. Resize до разумного
 * максимального размера + JPEG quality dance до целевого веса.
 *
 * Использование:
 *   const compressed = await compressImage(file, { maxDim: 1600, maxSizeMB: 2 });
 *   await supabase.storage.from("avatars").upload(path, compressed, {...});
 *
 * Не-изображения возвращаются как есть (видео, gif, и т.д.).
 * GIF и SVG не трогаем — потеряем анимацию/векторность.
 */
export interface CompressOptions {
  /** Максимальная сторона результата в px (default 1920). */
  maxDim?: number;
  /** Целевой максимальный размер в МБ (default 2). */
  maxSizeMB?: number;
  /** Тип MIME результата (default image/jpeg — самый компактный для фото). */
  mime?: "image/jpeg" | "image/webp" | "image/png";
}

const PASS_THROUGH_TYPES = new Set(["image/gif", "image/svg+xml"]);

export async function compressImage(file: File, opts: CompressOptions = {}): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (PASS_THROUGH_TYPES.has(file.type)) return file;

  const { maxDim = 1920, maxSizeMB = 2, mime = "image/jpeg" } = opts;
  const targetBytes = maxSizeMB * 1024 * 1024;

  // Быстрый путь: если файл уже в норме И не требует ресайза И уже в нужном формате —
  // возвращаем как есть. JPEG-фото с iPhone обычно ок. WebP/PNG всегда конвертируем
  // в JPEG, потому что Supabase Storage и некоторые ImageMagick-обработчики
  // вне облака могут отказывать на webp с непредсказуемой длительной обработкой.
  const img = await loadImage(file);
  const { width, height } = scaleToFit(img.naturalWidth, img.naturalHeight, maxDim);
  const noResize = width === img.naturalWidth && height === img.naturalHeight;
  const formatOk = file.type === mime;
  if (noResize && file.size <= targetBytes && formatOk) {
    URL.revokeObjectURL(img.src);
    return file;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    URL.revokeObjectURL(img.src);
    return file;
  }
  ctx.drawImage(img, 0, 0, width, height);
  URL.revokeObjectURL(img.src);

  // Подбираем quality — несколько итераций, чтобы влезть в targetBytes.
  let quality = 0.92;
  let blob = await canvasToBlob(canvas, mime, quality);
  for (let i = 0; i < 4 && blob && blob.size > targetBytes; i++) {
    quality *= 0.7;
    blob = await canvasToBlob(canvas, mime, quality);
  }
  // Safari иногда возвращает null для toBlob с image/webp. Fallback на JPEG.
  if (!blob && mime !== "image/jpeg") {
    blob = await canvasToBlob(canvas, "image/jpeg", 0.85);
  }
  if (!blob) {
    console.warn("[compressImage] canvas.toBlob returned null, using original");
    return file;
  }

  const newName = file.name.replace(/\.[a-z0-9]+$/i, "") + (blob.type === "image/webp" ? ".webp" : ".jpg");
  return new File([blob], newName, { type: blob.type, lastModified: Date.now() });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = URL.createObjectURL(file);
  });
}

function scaleToFit(w: number, h: number, maxDim: number) {
  if (w <= maxDim && h <= maxDim) return { width: w, height: h };
  const ratio = w / h;
  if (w > h) return { width: maxDim, height: Math.round(maxDim / ratio) };
  return { width: Math.round(maxDim * ratio), height: maxDim };
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mime: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), mime, quality);
  });
}
