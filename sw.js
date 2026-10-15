const CACHE = "fakturku-v18";
const SHELL = [
  "./",
  "./index.html",
  "./admin.html",
  "./manifest.webmanifest",
  "./css/tokens.css",
  "./css/app.css",
  "./css/landing.css",
  "./js/app.js",
  "./js/landing.js",
  "./js/ai-assistant.js",
  "./js/config.js",
  "./js/vendor-html2canvas.js",
  "./js/modules/backend.js",
  "./js/modules/credit-ledger.js",
  "./js/modules/format.js",
  "./js/modules/numbering.js",
  "./js/modules/invoice-engine.js",
  "./js/modules/output.js",
  "./js/modules/template-engine.js",
  "./js/templates/faktur-a4.js",
  "./js/templates/kwitansi-a4.js",
  "./js/templates/struk-ansuran.js",
  "./js/templates/invoice-digital.js",
  "./js/templates/business-documents.js",
  "./icon.svg",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;

  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  // Revalidate navigations so a stale cached shell cannot flash the editor before auth initializes.
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match(e.request).then((hit) => hit || caches.match("./index.html")))
    );
    return;
  }

  // Cache successful same-origin assets only; never serve HTML as a missing JS/CSS/manifest response.
  e.respondWith(
    fetch(e.request).then((res) => {
      if (res.ok && res.type === "basic") {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
      }
      return res;
    }).catch(() => caches.match(e.request))
  );
});
