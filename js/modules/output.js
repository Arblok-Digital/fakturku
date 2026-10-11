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
  return html2canvas(docEl, {
    scale: Math.max(2, window.devicePixelRatio || 2),
    backgroundColor: "#ffffff",
    useCORS: true,
  });
}

export async function shareImage(docEl, filename) {
  try {
    const canvas = await renderCanvas(docEl);
    const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.92));
    if (!blob) throw new Error("render gagal");
    const file = new File([blob], filename || "fakturku.jpg", { type: "image/jpeg" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: "Dokumen FakturKu" });
      return "shared";
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "fakturku.jpg";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return "downloaded";
  } catch (err) {
    if (err && err.name === "AbortError") return "cancelled";
    throw err;
  }
}

export function openWhatsApp(text) {
  const url = "https://wa.me/?text=" + encodeURIComponent(text);
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
