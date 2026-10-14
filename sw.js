const CACHE = "fakturku-v19";
const SHELL = [
  "./",
  "./index.html",
  "./admin.html",
  "./manifest.webmanifest",
  "./css/tokens.css",
  "./css/app.css",
  "./js/app.js",
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
  "./js/templates/business-templates.js",
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

// Cache-first for immutable-ish static assets (icons/fonts/images).
function isCacheFirst(url) {
  return /\.(png|svg|ico|jpg|jpeg|webp|gif|woff2?|ttf|otf|eot)$/i.test(url.pathname);
}

// Network-first for HTML navigations + JS modules (avoid stale app shell / logic).
function isNetworkFirst(req, url) {
  if (req.mode === "navigate") return true;
  if ((req.headers.get("accept") || "").includes("text/html")) return true;
  return /\.(html|js|json|css)$/i.test(url.pathname) || url.pathname === "/" || !/\.[a-z0-9]+$/i.test(url.pathname);
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
    return res;
  } catch (err) {
    const hit = await caches.match(req);
    if (hit) return hit;
    if (req.mode === "navigate") {
      const fallback = await caches.match("./index.html");
      if (fallback) return fallback;
    }
    throw err;
  }
}

async function cacheFirst(req) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res && res.ok) {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
  }
  return res;
}

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;

  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }

  if (isCacheFirst(url)) {
    e.respondWith(cacheFirst(e.request).catch(() => caches.match(e.request)));
    return;
  }

  if (isNetworkFirst(e.request, url)) {
    e.respondWith(networkFirst(e.request));
    return;
  }

  // Default: stale-while-revalidate for anything else same-origin.
  e.respondWith(
    caches.match(e.request).then((hit) => {
      const net = fetch(e.request).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        }
        return res;
      }).catch(() => hit || caches.match("./index.html"));
      return hit || net;
    })
  );
});

self.addEventListener("push", (event) => {
  let message = {};
  try {
    message = event.data ? event.data.json() : {};
  } catch {
    message = { body: event.data?.text() || "" };
  }

  const title = message.title || "Notifikasi FakturKu";
  const options = {
    body: message.body || "Ada informasi baru untuk akun admin.",
    icon: "./icon-192.png",
    badge: "./icon-180.png",
    tag: message.tag || "fakturku-admin",
    data: { url: message.url || "/admin" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/admin", self.location.origin).href;

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = windows.find((client) => new URL(client.url).origin === self.location.origin);
    if (existing) {
      await existing.navigate(target);
      await existing.focus();
      return;
    }
    await self.clients.openWindow(target);
  })());
});
