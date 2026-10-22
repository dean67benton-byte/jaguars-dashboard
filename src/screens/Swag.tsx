import { useEffect, useMemo, useState } from 'preact/hooks';
import type { SwagData, SwagItem, SwagType } from '../lib/types';
import { day } from '../lib/time';
import { Photo } from './parts';

// Dean's rule of thumb: $35 or less for something new, unless it's a big markdown.
const BUDGET = 35;
const BIG_OFF = 30;
const WEEK = 7 * 864e5;

type Who = 'me' | 'her' | 'all';
const WHO: { key: Who; label: string }[] = [
  { key: 'me', label: 'Me · XL' },
  { key: 'her', label: 'Her · M/L' },
  { key: 'all', label: 'Everyone' },
];
const TYPES: { key: SwagType | 'all'; label: string }[] = [
  { key: 'all', label: 'All clothing' },
  { key: 'tee', label: 'Tees' },
  { key: 'hoodie', label: 'Hoodies' },
  { key: 'polo', label: 'Polos' },
  { key: 'coach', label: 'Coaches & zips' },
  { key: 'hat', label: 'Hats' },
  { key: 'other', label: 'Other' },
];

// Stores that block automated checks: links only.
const MORE_STORES = [
  { name: 'Fanatics', url: 'https://www.fanatics.com/college/south-alabama-jaguars/o-38+t-35787497+z-984027-4255658954' },
  { name: 'USA Bookstore', url: 'https://southalabama.spirit.bncollege.com/' },
  { name: 'TrueSpirit', url: 'https://southalabama.shoptruespirit.com/' },
  { name: "Dick's", url: 'https://www.dickssportinggoods.com/f/south-alabama-jaguars-apparel-gear' },
  { name: 'NCAA Shop', url: 'https://www.shopncaasports.com/south-alabama-jaguars/t-24566308+z-9163524-4284178966' },
  { name: 'Prep Sportswear', url: 'https://www.prepsportswear.com/college/us/alabama/mobile/university-of-south-alabama-jaguars?schoolid=2302237' },
  { name: 'Athletes Thread', url: 'https://athletesthread.com/collections/university-of-south-alabama' },
  { name: 'Etsy', url: 'https://www.etsy.com/market/south_alabama_clothing' },
];

interface Bought {
  id: string;
  title: string;
  store: string;
  url: string;
  img?: string;
  price: number;
  for: 'me' | 'her';
  at: string;
}

// Per-iPhone lists. Reads and writes never throw (private mode, blocked storage).
function useStored<T>(key: string, initial: T) {
  const [v, setV] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch {
      /* ignore */
    }
  }, [key, v]);
  return [v, setV] as const;
}

const money = (n: number) => `$${n % 1 ? n.toFixed(2) : n}`;
const words = (s: string) => s.toLowerCase().split(/\s+/).filter(Boolean);
const matches = (it: SwagItem, q: string) => {
  const t = it.title.toLowerCase();
  return words(q).every((w) => t.includes(w.replace(/s$/, '')));
};
const fits = (it: SwagItem, who: Who) => {
  if (who === 'me') return it.who !== 'women' && (!it.sizes || it.sizes.includes('XL'));
  if (who === 'her') return it.who !== 'men' && (!it.sizes || it.sizes.includes('M') || it.sizes.includes('L'));
  return true;
};
// "Low seen $X" when it has been cheaper; "Lowest seen" once we've tracked it a few days.
const lowNote = (it: SwagItem, now: number) => (it.low < it.price ? `Low seen ${money(it.low)}` : it.seen && now - Date.parse(it.seen) > 3 * 864e5 ? 'Lowest seen' : '');
const dropped = (it: SwagItem, now: number) => !!it.dropAt && now - Date.parse(it.dropAt) < WEEK;
const isDeal = (it: SwagItem, now: number) => (it.off ?? 0) > 0 || dropped(it, now);
const qualifies = (it: SwagItem) => it.price <= BUDGET || (it.off ?? 0) >= BIG_OFF;
// Markdowns and price drops first, then cheapest.
const byDeal = (now: number) => (a: SwagItem, b: SwagItem) => Number(isDeal(b, now)) - Number(isDeal(a, now)) || a.price - b.price;

function Card({ it, stores, now, who, bought, onBought }: { it: SwagItem; stores: SwagData['stores']; now: number; who: Who; bought: boolean; onBought: (it: SwagItem) => void }) {
  const sizeNote = it.type === 'other' || it.type === 'hat' ? '' : it.sizes ? (who === 'me' ? 'XL in stock' : who === 'her' ? `${it.sizes.filter((s) => s !== 'XL').join(', ')} in stock` : it.sizes.length ? `${it.sizes.join(', ')} in stock` : '') : 'Check sizes';
  return (
    <li class="swag-card">
      <a class="swag-img" href={it.url} target="_blank" rel="noopener">
        <Photo src={it.img} class="swag-photo" alt="" />
        <span class="swag-badges">
          {it.off ? <span class="pill accent">{it.off}% off</span> : null}
          {dropped(it, now) && <span class="pill good">Price drop</span>}
          {it.isNew && <span class="pill">New</span>}
        </span>
      </a>
      <div class="swag-body">
        <span class="label">{stores[it.store]?.name ?? it.store}</span>
        <a class="swag-title" href={it.url} target="_blank" rel="noopener">{it.title}</a>
        <div class="swag-price">
          <span class="num">{money(it.price)}</span>
          {it.was && <s class="muted small">{money(it.was)}</s>}
          {!it.was && it.dropFrom && dropped(it, now) && <s class="muted small">{money(it.dropFrom)}</s>}
        </div>
        <div class="small muted">{[lowNote(it, now), sizeNote].filter(Boolean).join(' · ')}</div>
        <button class={`btn swag-bought${bought ? ' on' : ''}`} onClick={() => onBought(it)} aria-pressed={bought}>
          {bought ? 'Bought ✓' : 'Mark bought'}
        </button>
      </div>
    </li>
  );
}

function Grid({ list, limit, ...rest }: { list: SwagItem[]; limit: number } & Omit<Parameters<typeof Card>[0], 'it' | 'bought'> & { boughtIds: Set<string> }) {
  const [n, setN] = useState(limit);
  const { boughtIds, ...cardProps } = rest;
  return (
    <>
      <ul class="swag-grid">
        {list.slice(0, n).map((it) => (
          <Card key={it.id} it={it} bought={boughtIds.has(it.id)} {...cardProps} />
        ))}
      </ul>
      {list.length > n && (
        <button class="btn" style="justify-self:start" onClick={() => setN(n + limit * 2)}>
          Show {Math.min(list.length - n, limit * 2)} more
        </button>
      )}
    </>
  );
}

export function Swag({ data, error }: { data: SwagData | null; error: string | null }) {
  const [who, setWho] = useStored<Who>('jags.swag.who', 'me');
  const [type, setType] = useState<SwagType | 'all'>('all');
  const [q, setQ] = useState('');
  const [wish, setWish] = useStored<string[]>('jags.swag.wish.v1', []);
  const [bought, setBought] = useStored<Bought[]>('jags.swag.bought.v1', []);
  const now = Date.now();

  const pool = useMemo(() => (data?.items ?? []).filter((it) => fits(it, who) && (type === 'all' ? it.type !== 'other' : it.type === type)), [data, who, type]);
  if (!data) return <div class="card empty">{error ? "Couldn't load Jag Swag yet. It fills in after the next daily price check." : 'Loading…'}</div>;

  const boughtIds = new Set(bought.map((b) => b.id));
  const toggleBought = (it: SwagItem) =>
    setBought(
      boughtIds.has(it.id)
        ? bought.filter((b) => b.id !== it.id)
        : [{ id: it.id, title: it.title, store: data.stores[it.store]?.name ?? it.store, url: it.url, img: it.img, price: it.price, for: it.who === 'women' || who === 'her' ? 'her' : 'me', at: new Date().toISOString() }, ...bought],
    );
  const grid = { stores: data.stores, now, who, onBought: toggleBought, boughtIds };

  const query = q.trim();
  const results = query ? pool.filter((it) => matches(it, query)).sort(byDeal(now)) : [];
  const wishHits = wish.length ? pool.filter((it) => wish.some((w) => matches(it, w))).sort(byDeal(now)) : [];
  const deals = pool.filter(qualifies).sort(byDeal(now));
  const fresh = pool.filter((it) => it.isNew).sort((a, b) => (b.created ?? b.seen ?? '').localeCompare(a.created ?? a.seen ?? ''));
  const onSale = pool.filter((it) => isDeal(it, now)).length;
  const okStores = Object.values(data.stores).filter((s) => s.ok).length;
  const addWish = () => query && !wish.includes(query.toLowerCase()) && (setWish([...wish, query.toLowerCase()]), setQ(''));
  const spent = (f: 'me' | 'her') => bought.filter((b) => b.for === f).reduce((t, b) => t + b.price, 0);

  return (
    <>
      <div class="page-head">
        <span class="label">Shopping</span>
        <h1>Jag Swag</h1>
        <p class="small muted">
          {data.items.length} items from {okStores} stores, checked {day(data.updatedAt)}. Prices can change, so check the store before you buy.
        </p>
      </div>

      <div class="swag-controls">
        <div class="seg" role="group" aria-label="Who it's for">
          {WHO.map((w) => (
            <button key={w.key} aria-pressed={who === w.key} onClick={() => setWho(w.key)}>{w.label}</button>
          ))}
        </div>
        <div class="chips" role="group" aria-label="Type">
          {TYPES.map((t) => (
            <button key={t.key} class="chip" aria-pressed={type === t.key} onClick={() => setType(t.key)}>{t.label}</button>
          ))}
        </div>
        <form class="swag-search" onSubmit={(e) => (e.preventDefault(), addWish())}>
          <input type="search" placeholder="Search, like “gray hoodie”" value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} aria-label="Search Jag Swag" />
          {query && <button class="btn" type="submit">Save to wishlist</button>}
        </form>
      </div>

      {query ? (
        <section class="section">
          <h2>Results for “{query}”</h2>
          {results.length ? <Grid key={query} list={results} limit={12} {...grid} /> : <p class="muted small">Nothing matches right now. Save it to your wishlist and it will show up here when a store adds one.</p>}
        </section>
      ) : (
        <>
          <div class="strip">
            <div><span class="label">On sale</span><span class="v">{onSale}</span></div>
            <div><span class="label">Under ${BUDGET}</span><span class="v">{pool.filter((it) => it.price <= BUDGET).length}</span></div>
            <div><span class="label">New</span><span class="v">{fresh.length}</span></div>
          </div>

          {wish.length > 0 && (
            <section class="section">
              <h2>Wishlist</h2>
              <div class="chips">
                {wish.map((w) => (
                  <button key={w} class="chip" aria-pressed="true" onClick={() => setWish(wish.filter((x) => x !== w))} aria-label={`Remove ${w}`}>
                    {w} ✕
                  </button>
                ))}
              </div>
              {wishHits.length ? <Grid list={wishHits} limit={6} {...grid} /> : <p class="muted small">No matches yet. Checked every morning.</p>}
            </section>
          )}

          <section class="section">
            <h2>Best deals</h2>
            <p class="small muted">Sales and price drops first, then cheapest. ${BUDGET} or less, or {BIG_OFF}% off and up.</p>
            {deals.length ? <Grid list={deals} limit={12} {...grid} /> : <p class="muted small">Nothing under ${BUDGET} for this filter right now.</p>}
          </section>

          <section class="section">
            <h2>New arrivals</h2>
            <p class="small muted">Added in the last two weeks, at any price.</p>
            {fresh.length ? <Grid list={fresh} limit={6} {...grid} /> : <p class="muted small">Nothing new this week.</p>}
          </section>
        </>
      )}

      <section class="section">
        <div class="section-head">
          <h2>Bought</h2>
          {bought.length > 0 && <span class="small muted">Me {money(spent('me'))} · Her {money(spent('her'))}</span>}
        </div>
        {bought.length ? (
          <ul class="panel list swag-bought-list">
            {bought.map((b) => (
              <li class="row" key={b.id}>
                <Photo src={b.img} class="thumb" />
                <div class="grow">
                  <a class="title" href={b.url} target="_blank" rel="noopener">{b.title}</a>
                  <div class="small muted">{b.store} · {money(b.price)} · {day(b.at)}</div>
                </div>
                <button class="chip" aria-pressed="true" onClick={() => setBought(bought.map((x) => (x.id === b.id ? { ...x, for: x.for === 'me' ? 'her' : 'me' } : x)))} aria-label="Switch who it's for">
                  {b.for === 'me' ? 'Me' : 'Her'}
                </button>
                <button class="icon-btn" onClick={() => setBought(bought.filter((x) => x.id !== b.id))} aria-label={`Remove ${b.title}`}>✕</button>
              </li>
            ))}
          </ul>
        ) : (
          <p class="muted small">Tap “Mark bought” on anything you buy to keep track of Christmas gifts here.</p>
        )}
      </section>

      <section class="section">
        <h2>More stores</h2>
        <p class="small muted">These stores block automatic price checks, so browse them directly.</p>
        <div class="chips">
          {MORE_STORES.map((s) => (
            <a key={s.name} class="chip" href={s.url} target="_blank" rel="noopener">{s.name} ›</a>
          ))}
        </div>
      </section>

      <p class="small muted">
        Checked daily from {Object.values(data.stores).map((s) => s.name).join(', ')}.
        {Object.values(data.stores).some((s) => !s.ok) && ` Last check failed for ${Object.values(data.stores).filter((s) => !s.ok).map((s) => s.name).join(', ')}, so those show their last good prices.`}{' '}
        Your wishlist and bought list are saved on this device.
      </p>
    </>
  );
}
