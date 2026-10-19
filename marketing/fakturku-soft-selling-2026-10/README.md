# FakturKu — Soft Selling Feed (Okt 2026)

Aset marketing untuk posting soft selling FakturKu di Page Facebook **Arblok Digital**.

## File

| File | Keterangan |
| --- | --- |
| `fakturku-softsell-feed.svg` | Sumber vektor design (1080x1350, font IBM Plex Sans/Mono) |
| `fakturku-softsell-feed-1080x1350.png` | Hasil render PNG 1080x1350 (4:5) untuk feed |
| `caption.txt` | Caption final yang dipublikasikan |

## Canva

- Asset ID: `MAHYbDp7184` — "FakturKu Soft Selling Feed Okt 2026"
- Design ID: `DAHYbPZvtLU` — "FakturKu — Soft Selling Feed (Okt 2026)", custom 1080x1350
- Design dibuat dari asset gambar (image-to-design), sehingga teks di dalam canvas berupa gambar, bukan elemen teks Canva yang bisa diedit per blok.

## Publikasi

- Facebook Page: Arblok Digital (`1286079987914847`)
- Post ID: `1286079987914847_122131099743395717`
- Permalink: https://www.facebook.com/122131099791395717/posts/122131099743395717

## Klaim yang dipakai (dicek ke repo)

- 51 format dokumen = 47 template di `js/templates/business-documents.js` + 4 template akar (`faktur-a4`, `kwitansi-a4`, `struk-ansuran`, `invoice-digital`).
- 7 kategori = finance, legal, umkm, logistik, pajak, proyek, operasional.
- 10 dokumen gratis = `trial_credits` default 10 (lihat `docs/ARCHITECTURE.md` §9).
- Print A4/thermal = `printDoc("a4" | "thermal")` di `js/modules/output.js`.
- Domain live: https://fakturku.vercel.app (dicek HTTP 200).
- Ada disclaimer BETA + bukan dokumen resmi/tersertifikasi, sesuai aturan `AGENTS.md` §3.
