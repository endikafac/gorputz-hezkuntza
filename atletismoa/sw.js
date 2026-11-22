const V = "atl-v1";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });

async function audio(req) {
  const c = await caches.open(V);
  const key = new Request(req.url);
  let res = await c.match(key);
  if (!res) {
    const net = await fetch(key);
    if (!net.ok) return net;
    await c.put(key, net.clone());
    res = net;
  }
  const range = req.headers.get("range");
  if (!range) return res;
  const buf = await res.arrayBuffer();
  const m = /bytes=(\d*)-(\d*)/.exec(range);
  const start = m[1] ? parseInt(m[1], 10) : 0;
  const end = m[2] ? Math.min(parseInt(m[2], 10), buf.byteLength - 1) : buf.byteLength - 1;
  return new Response(buf.slice(start, end + 1), { status: 206, headers: { "Content-Type": "audio/mpeg", "Content-Range": "bytes " + start + "-" + end + "/" + buf.byteLength, "Content-Length": String(end - start + 1), "Accept-Ranges": "bytes" } });
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.endsWith(".mp3")) { e.respondWith(audio(req).catch(() => new Response("", { status: 504 }))); return; }
  e.respondWith(fetch(req).then((res) => { if (res.ok) { const cp = res.clone(); caches.open(V).then((c) => c.put(req, cp)); } return res; }).catch(() => caches.match(req).then((r) => r || caches.match("index.html"))));
});
