const TARGET_BYTES = 2 * 1024 * 1024;

type Progress = (value: number, label: string) => void;

async function canvasJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Uint8Array> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) throw new Error("This PDF page could not be compressed");
  return new Uint8Array(await blob.arrayBuffer());
}

async function rasterize(file: File, scale: number, quality: number, progress?: Progress): Promise<Uint8Array> {
  const [{ getDocument, GlobalWorkerOptions }, { PDFDocument }] = await Promise.all([
    import("pdfjs-dist/legacy/build/pdf.mjs"),
    import("pdf-lib"),
  ]);
  GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
  const source = new Uint8Array(await file.arrayBuffer());
  const pdf = await getDocument({ data: source }).promise;
  if (pdf.numPages > 40) throw new Error("This PDF has more than 40 pages. Split it into smaller plan sets first.");
  const output = await PDFDocument.create();
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    progress?.(12 + Math.round((pageNumber / pdf.numPages) * 72), `Compressing page ${pageNumber} of ${pdf.numPages}`);
    const page = await pdf.getPage(pageNumber);
    const original = page.getViewport({ scale: 1 });
    const longest = Math.max(original.width, original.height);
    const safeScale = Math.min(scale, 2200 / longest);
    const viewport = page.getViewport({ scale: safeScale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(viewport.width));
    canvas.height = Math.max(1, Math.round(viewport.height));
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("This browser cannot compress PDF pages");
    context.fillStyle = "#fff"; context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: context, viewport, canvas }).promise;
    const image = await output.embedJpg(await canvasJpeg(canvas, quality));
    const outPage = output.addPage([original.width, original.height]);
    outPage.drawImage(image, { x: 0, y: 0, width: original.width, height: original.height });
    canvas.width = 1; canvas.height = 1;
    page.cleanup();
  }
  pdf.destroy();
  return output.save({ useObjectStreams: true });
}

export async function optimizeEstimatePdf(file: File, progress?: Progress): Promise<File> {
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return file;
  if (file.size <= TARGET_BYTES) return file;
  progress?.(3, "Inspecting PDF");
  const { PDFDocument } = await import("pdf-lib");
  try {
    const document = await PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false });
    const cleaned = await document.save({ useObjectStreams: true, addDefaultPage: false, updateFieldAppearances: false });
    if (cleaned.byteLength <= TARGET_BYTES) {
      progress?.(100, "PDF compressed");
      return new File([cleaned], file.name, { type: "application/pdf", lastModified: Date.now() });
    }
  } catch { /* encrypted/unusual PDFs get one render attempt below */ }
  let bytes = await rasterize(file, 1.6, 0.68, progress);
  if (bytes.byteLength > TARGET_BYTES) {
    progress?.(86, "Reducing scan size");
    bytes = await rasterize(file, 1.2, 0.56, progress);
  }
  if (bytes.byteLength > TARGET_BYTES) throw new Error("This PDF cannot stay readable under 2 MB. Split it into smaller files and try again.");
  progress?.(100, "PDF compressed");
  return new File([bytes], file.name.replace(/\.pdf$/i, "") + "-compressed.pdf", { type: "application/pdf", lastModified: Date.now() });
}
