#!/usr/bin/env node
// Jag Swag: South Alabama apparel deals from stores with open product feeds.
// Shopify stores (Scarlet & Gold, FOCO), Rally House (Constructor search),
// Jag Swag (findgreek marketplace API), Jag Threads (Square Online) and
// Walmart (search pages). Fanatics, Dick's, the bookstore and other stores
// block bots, so the app only links to them. Keeps each item's lowest price
// and first-seen date from the previous run. A store that fails keeps its
// last good items. Writes public/data/swag.json. No Claude usage.
//
//   node scripts/swag.mjs           daily run (skips other hours)
//   node scripts/swag.mjs --force   refresh now
//
// Off switch: set "swag": false in docs/routine-config.json.

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const FORCE = process.argv.includes('--force');
const OUT = path.resolve('public/data/swag.json');
const CONFIG = path.resolve('docs/routine-config.json');
const DAILY_HOUR_UTC = 11; // 6 a.m. Central
const NEW_DAYS = 14;
const DROP_DAYS = 7;
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

async function get(url, { json = true, headers = {} } = {}) {
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA, ...headers }, signal: AbortSignal.timeout(25e3) });
    if (!res.ok) return null;
    return json ? await res.json() : await res.text();
  } catch {
    return null;
  }
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

const num = (v) => {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
};
const iso = (s) => {
  const t = Date.parse(String(s ?? '').replace(' ', 'T') + (/[zZ]|[+-]\d\d:?\d\d$/.test(String(s ?? '')) ? '' : 'Z'));
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
};

// ---------- sorting items into what Dean shops for ----------

const KIDS = /\b(youth|kids?|toddler|infant|baby|onesie|bodysuit|boys|girls'?|little|preschool)\b/i;
const HOUSEWARES = /\b(frame|diploma|decal|flag|banner|blanket|mug|tumbler|koozie|ornament|plate|chair|cornhole|garden|gnome|sign|bottle opener|coaster|pillow|rug|lamp|clock|car |auto emblem|decor|wall|glass|cup|can cooler|pennant|puzzle|figurine|dog|cat |pet )/i;

function typeOf(text) {
  const t = text.toLowerCase();
  if (/\b(hat|cap|snapback|beanie|visor|trucker|bucket|5-panel|rope|gambler|toboggan|knit)\b/.test(t)) return 'hat';
  if (/\bpolo\b/.test(t)) return 'polo';
  if (/(quarter|qtr|1\/4|half|1\/2)[ -]?zip|\bcoach|sideline|windbreaker|jacket|button[ -]?(down|up)|woven|vest|pullover(?! hood)|anorak|full[ -]zip(?! hood)/.test(t)) return 'coach';
  if (/hood|sweatshirt|crew ?neck|fleece|sweater/.test(t)) return 'hoodie';
  if (/t-?shirt|\btee\b|tank|long sleeve|short sleeve|\bss\b|\bls\b|shirt|v-neck|raglan|jersey/.test(t)) return 'tee';
  return 'other';
}

function whoOf(text, gender = '') {
  const t = `${gender} ${text}`.toLowerCase();
  if (/\b(women'?s?|womens|ladies|lady|girl'?s night)\b/.test(t)) return 'women';
  if (/\b(men'?s|mens)\b/.test(t)) return 'men';
  return 'unisex';
}

// "Extra Large" / "X-Large" / "XL" -> "XL"; anything else we don't need -> null.
function sizeOf(v) {
  const t = String(v ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (['xl', 'xlarge', 'extralarge', 'adultxl'].includes(t)) return 'XL';
  if (['l', 'large', 'lg', 'adultl', 'adultlarge'].includes(t)) return 'L';
  if (['m', 'medium', 'med', 'md', 'adultm', 'adultmedium'].includes(t)) return 'M';
  return null;
}
const sizeList = (vals) => [...new Set(vals.map(sizeOf).filter(Boolean))].sort();

function item(store, o) {
  const text = `${o.title} ${o.kind ?? ''}`;
  if (KIDS.test(`${o.title} ${o.gender ?? ''}`) || HOUSEWARES.test(text) || !o.price) return null;
  const was = o.was && o.was > o.price + 0.5 ? o.was : undefined;
  return {
    id: `${store}:${o.id}`,
    store,
    title: o.title.replace(/\s+/g, ' ').trim(),
    url: o.url,
    img: o.img,
    price: o.price,
    ...(was ? { was, off: Math.round((1 - o.price / was) * 100) } : {}),
    type: typeOf(text),
    who: whoOf(o.title, o.gender),
    ...(o.sizes ? { sizes: o.sizes } : {}),
    ...(o.created ? { created: o.created } : {}),
  };
}

// ---------- stores ----------

async function shopify(store, base, collection) {
  const out = [];
  for (let page = 1; page <= 6; page++) {
    const d = await get(`${base}/collections/${collection}/products.json?limit=250&page=${page}`);
    if (!d) return page === 1 ? null : out;
    if (!d.products?.length) break;
    for (const p of d.products) {
      const avail = p.variants.filter((v) => v.available);
      if (!avail.length) continue;
      const cheapest = avail.reduce((a, b) => (num(b.price) < num(a.price) ? b : a));
      const sizeIdx = p.options.findIndex((o) => /size/i.test(o.name));
      const it = item(store, {
        id: p.id,
        title: p.title,
        kind: `${p.product_type} ${p.tags.join(' ')}`,
        gender: p.tags.find((t) => /gender:/i.test(t)),
        url: `${base}/products/${p.handle}`,
        img: p.images[0]?.src && `${p.images[0].src}${p.images[0].src.includes('?') ? '&' : '?'}width=400`,
        price: num(cheapest.price),
        was: num(cheapest.compare_at_price),
        sizes: sizeIdx >= 0 ? sizeList(avail.map((v) => v[`option${sizeIdx + 1}`])) : undefined,
        created: iso(p.published_at ?? p.created_at),
      });
      if (it) out.push(it);
    }
    if (d.products.length < 250) break;
  }
  return out;
}

const RALLY = 'https://ac.cnstrc.com/browse/group_id/college_south-alabama-jaguars?key=key_vEmtX5xxkx8IfLkr&num_results_per_page=100';
async function rallyHouse() {
  const pages = async (extra = '') => {
    const all = [];
    for (let page = 1; page <= 5; page++) {
      const d = await get(`${RALLY}&page=${page}${extra}`);
      if (!d) return page === 1 ? null : all;
      const r = d.response?.results ?? [];
      all.push(...r);
      if (all.length >= (d.response?.total_num_results ?? 0) || !r.length) break;
    }
    return all;
  };
  const all = await pages();
  if (!all) return null;
  const has = {};
  for (const s of ['XL', 'M', 'L']) has[s] = new Set(((await pages(`&filters%5Bsize%5D=${s}`)) ?? []).map((r) => r.data.id));
  const seen = new Set();
  const out = [];
  for (const { value, data } of all) {
    if (seen.has(data.id)) continue;
    seen.add(data.id);
    const it = item('rallyhouse', {
      id: data.id,
      title: value,
      kind: `${data.department ?? ''} ${data.sub_department ?? ''}`,
      gender: data.gender,
      url: data.url,
      img: data.image_url?.replace('/image/upload/', '/image/upload/w_400/'),
      price: num(data.price),
      was: num(data.original_price),
      sizes: ['L', 'M', 'XL'].filter((s) => has[s].has(data.id)),
    });
    if (it) out.push(it);
  }
  return out;
}

const GATEWAY = 'https://affinity-gateway.com/api/marketplace';
async function jagSwag() {
  const headers = { accept: 'application/x.gatewayapi.v1.3+json' };
  const site = (await get(`${GATEWAY}/sites?domain=jagswag.com`, { headers }))?.data?.[0]?.id ?? 98;
  const out = [];
  for (let page = 1; page <= 15; page++) {
    const d = await get(`${GATEWAY}/products?site_id=${site}&page=${page}&per_page=36`, { headers });
    if (!d) return page === 1 ? null : out;
    for (const p of d.data ?? []) {
      if (!p.available || p.is_archived) continue;
      const sizes = (p.variant_groups ?? []).filter((g) => /size/i.test(g.name)).flatMap((g) => g.options.map((o) => o.name));
      const sale = num(p.sale_price);
      const it = item('jagswag', {
        id: p.id,
        title: p.name,
        kind: p.category?.name,
        url: `https://jagswag.com/product/${p.id}`,
        img: p.primary_image?.urls?.md ?? p.primary_image?.urls?.sm,
        price: sale ?? num(p.min_price) ?? num(p.price),
        was: sale ? num(p.regular_price) : undefined,
        sizes: sizes.length ? sizeList(sizes) : undefined,
        created: iso(p.created_at),
      });
      if (it) out.push(it);
    }
    if (page >= (d.meta?.pagination?.total_pages ?? 1)) break;
  }
  return out;
}

const SQUARE = 'https://cdn5.editmysite.com/app/store/api/v28/editor/users/136746919/sites/410866993550648244/products';
// Jag Threads names are short ("Crimson Block SA"), so its Square category ids say what each item is.
const SQUARE_KIND = {
  MJXRMGDA7ID5Q23AP4FZARP3: 'hat',
  WWROMRXR7DTQV26P46QDCQZP: 't-shirt',
  MJQDMHEVILUA5D6Y6IDVXJX3: 'jacket',
  OH73CO2BFM6QGOTQGWTNURHP: 'sideline',
  WO45GFFP3BOVAEEY2IDI7LIZ: "women's",
  '4BHLBDE73KC6S4F65NR5HKGK': 'youth',
};
async function jagThreads() {
  const out = [];
  for (let page = 1; page <= 5; page++) {
    const d = await get(`${SQUARE}?per_page=100&page=${page}&include=images`);
    if (!d) return page === 1 ? null : out;
    for (const p of d.data ?? []) {
      if (p.visibility !== 'visible' || p.inventory?.all_variations_sold_out || p.badges?.out_of_stock) continue;
      const img = p.images?.data?.[0]?.absolute_url ?? p.thumbnail?.data?.absolute_url;
      const kinds = (p.categoryIds ?? []).map((c) => SQUARE_KIND[c]).filter(Boolean);
      const it = item('jagthreads', {
        id: p.id,
        title: p.name,
        kind: kinds.filter((k) => k !== "women's" && k !== 'youth').join(' '),
        gender: kinds.filter((k) => k === "women's" || k === 'youth').join(' '),
        url: p.absolute_site_link ?? `https://www.jagthreadsco.com/${p.site_link}`,
        img: img && `${img}?width=400`,
        price: num(p.price?.low),
        was: num(p.price?.regular_low),
        created: iso(p.created_date),
      });
      if (it) out.push(it);
    }
    if (page >= (d.meta?.pagination?.total_pages ?? 1)) break;
  }
  return out;
}

const WALMART_QUERIES = ['south alabama jaguars t-shirt', 'south alabama jaguars hoodie', 'south alabama jaguars polo', 'south alabama jaguars hat', 'south alabama jaguars women', 'south alabama jaguars quarter zip'];
async function walmart() {
  const out = new Map();
  let ok = false;
  for (const q of WALMART_QUERIES) {
    const html = await get(`https://www.walmart.com/search?q=${encodeURIComponent(q)}`, { json: false });
    const m = html?.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!m) continue;
    ok = true;
    const found = [];
    (function walk(o) {
      if (!o || typeof o !== 'object') return;
      if (o.usItemId && o.name && o.priceInfo) found.push(o);
      else for (const k in o) walk(o[k]);
    })(JSON.parse(m[1]));
    for (const p of found) {
      if (out.has(p.usItemId) || !/south alabama/i.test(p.name) || p.isOutOfStock) continue;
      const it = item('walmart', {
        id: p.usItemId,
        title: p.name,
        url: `https://www.walmart.com${p.canonicalUrl?.split('?')[0] ?? `/ip/${p.usItemId}`}`,
        img: p.imageInfo?.thumbnailUrl?.replace(/odnHeight=\d+&odnWidth=\d+/, 'odnHeight=400&odnWidth=400'),
        price: num(p.price) ?? num(p.priceInfo?.minPrice) ?? num(p.priceInfo?.linePrice),
        was: num(p.priceInfo?.wasPrice),
      });
      if (it) out.set(p.usItemId, it);
    }
  }
  return ok ? [...out.values()] : null;
}

export const STORES = {
  scarletgold: { name: 'Scarlet & Gold', run: () => shopify('scarletgold', 'https://scarletandgoldshop.com', 'south-alabama-adult-apparel') },
  foco: { name: 'FOCO', run: () => shopify('foco', 'https://www.foco.com', 'south-alabama-jaguars') },
  rallyhouse: { name: 'Rally House', run: rallyHouse },
  jagswag: { name: 'Jag Swag', run: jagSwag },
  jagthreads: { name: 'Jag Threads Co.', run: jagThreads },
  walmart: { name: 'Walmart', run: walmart, noNew: true }, // search results shuffle, so first-seen isn't "new"
};

// ---------- main ----------

async function main() {
  const cfg = await readJson(CONFIG, {});
  if (cfg.swag === false) return console.log('swag: off in docs/routine-config.json');
  const prev = await readJson(OUT, null);
  const due = FORCE || new Date().getUTCHours() === DAILY_HOUR_UTC || !prev?.updatedAt;
  if (!due) return console.log('swag: not due');

  const now = new Date().toISOString();
  const old = new Map((prev?.items ?? []).map((i) => [i.id, i]));
  const stores = {};
  const items = [];
  for (const [key, s] of Object.entries(STORES)) {
    const got = await s.run();
    const known = (prev?.items ?? []).some((i) => i.store === key);
    if (!got?.length) {
      // Keep last good items so one bad day doesn't empty the page.
      const kept = (prev?.items ?? []).filter((i) => i.store === key);
      items.push(...kept);
      stores[key] = { name: s.name, count: kept.length, ok: false, checkedAt: now, okAt: prev?.stores?.[key]?.okAt };
      console.log(`swag: ${s.name} failed, kept ${kept.length}`);
      continue;
    }
    for (const it of got) {
      const was = old.get(it.id);
      it.seen = was?.seen ?? (known ? now : undefined); // first run per store is a baseline, not "new"
      it.low = Math.min(it.price, was?.low ?? it.price);
      it.lowAt = was && was.low <= it.price ? was.lowAt : now;
      if (was && it.price < was.price - 0.5) Object.assign(it, { dropFrom: was.price, dropAt: now });
      else if (was?.dropAt && Date.parse(now) - Date.parse(was.dropAt) < DROP_DAYS * 864e5 && it.price < was.dropFrom) Object.assign(it, { dropFrom: was.dropFrom, dropAt: was.dropAt });
      const added = s.noNew ? undefined : [it.created, it.seen].filter(Boolean).sort().pop();
      if (added && Date.parse(now) - Date.parse(added) < NEW_DAYS * 864e5) it.isNew = true;
      items.push(it);
    }
    stores[key] = { name: s.name, count: got.length, ok: true, checkedAt: now, okAt: now };
    console.log(`swag: ${s.name} ${got.length} items`);
  }

  await writeFile(OUT, JSON.stringify({ updatedAt: now, stores, items }) + '\n');
  if (process.env.GITHUB_OUTPUT) await writeFile(process.env.GITHUB_OUTPUT, 'daily=true\n', { flag: 'a' });
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
