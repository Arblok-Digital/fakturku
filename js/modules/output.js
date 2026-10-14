let pageStyle = null;

function ensurePageStyle() {
  if (!pageStyle) {
    pageStyle = document.createElement("style");
    document.head.appendChild(pageStyle);
  }
  return pageStyle;
}

export function printDoc(mode) {
  // mode: "a4" | "thermal"
  const st = ensurePageStyle();
  st.textContent = mode === "thermal"
    ? "@page { size: 58mm; margin: 0; }"
    : "@page { size: A4; margin: 0; }";
  window.print();
}

async function renderCanvas(docEl) {
  if (typeof html2canvas === "undefined") {
    throw new Error("html2canvas belum dimuat — periksa koneksi/skrip CDN lalu coba lagi.");
  }
  try { await document.fonts.ready; } catch { /* abaikan */ }
  // Bekukan transform scale preview-mobile agar hasil capture ukuran penuh.
  const prevTransform = docEl.style.transform;
  const prevMargin = docEl.style.marginBottom;
  docEl.style.transform = "";
  docEl.style.marginBottom = "";
  try {
    return await html2canvas(docEl, {
      scale: Math.min(2, window.devicePixelRatio || 1.5),
      backgroundColor: "#ffffff",
      useCORS: true,
      imageTimeout: 8000,
      logging: false,
    });
  } finally {
    docEl.style.transform = prevTransform;
    docEl.style.marginBottom = prevMargin;
  }
}

async function canvasToBlob(canvas) {
  const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.92));
  if (blob) return blob;
  // Fallback saat toBlob null (memori/tainted): via dataURL.
  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
  const r = await fetch(dataUrl);
  return r.blob();
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "fakturku.jpg";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export async function saveImage(docEl, filename) {
  const canvas = await renderCanvas(docEl);
  const blob = await canvasToBlob(canvas);
  if (!blob) throw new Error("render gagal");
  downloadBlob(blob, filename);
  return "downloaded";
}

export async function shareImage(docEl, filename) {
  try {
    const canvas = await renderCanvas(docEl);
    const blob = await canvasToBlob(canvas);
    if (!blob) throw new Error("render gagal");
    const file = new File([blob], filename || "fakturku.jpg", { type: "image/jpeg" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "Dokumen FakturKu" });
        return "shared";
      } catch (shareErr) {
        if (shareErr && shareErr.name === "AbortError") return "cancelled";
        // Share file ditolak (mis. aktivasi kedaluwarsa) → fallback unduh.
        downloadBlob(blob, filename);
        return "downloaded";
      }
    }
    downloadBlob(blob, filename);
    return "downloaded";
  } catch (err) {
    if (err && err.name === "AbortError") return "cancelled";
    throw err;
  }
}

export function openWhatsApp(text, phone = "") {
  const recipient = String(phone).replace(/\D/g, "");
  const url = `https://wa.me/${recipient}?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener");
}

export async function copySummary(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    return true;
  }
}
