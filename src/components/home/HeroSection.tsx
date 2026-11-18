import { useState, useEffect, FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, BadgeCheck, Bike, CreditCard, Search, ChevronDown } from "lucide-react";

const CATEGORIES = [
  { label: "Products", to: "/products" },
  { label: "Services", to: "/services" },
  { label: "Digital", to: "/digital-market" },
];

export const HeroSection = () => {
  const navigate = useNavigate();
  const [cat, setCat] = useState("Products");
  const [q, setQ] = useState("");
  type P = { id: string; name: string; price_etb: number; image_url: string | null; seller_stores: { store_name: string } | null };
  const [items, setItems] = useState<P[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    supabase.from("products").select("id,name,price_etb,image_url,seller_stores!products_seller_id_fkey(store_name)")
      .eq("stock_status", true).not("image_url", "is", null).order("created_at", { ascending: false }).limit(8)
      .then(({ data }) => setItems(((data ?? []) as unknown as P[]).filter((p) => p.image_url)));
  }, []);
  useEffect(() => {
    if (items.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % items.length), 4000);
    return () => clearInterval(t);
  }, [items.length]);
  const p = items[idx];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const target = CATEGORIES.find((c) => c.label === cat)?.to ?? "/products";
    navigate(q.trim() ? `${target}?q=${encodeURIComponent(q.trim())}` : target);
  };

  return (
    <section className="hero-lux relative overflow-hidden">
      <div className="hero-dots pointer-events-none absolute inset-0" />
      <div className="hero-spot pointer-events-none absolute right-[-10%] top-1/2 h-[640px] w-[640px] -translate-y-1/2 rounded-full" />

      <div className="container relative mx-auto grid items-center gap-14 px-4 py-20 md:py-28 grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
        {/* Left */}
        <div className="hero-fade min-w-0">
          <div className="mb-7 inline-flex items-center gap-2.5 rounded-full border border-hero-line bg-hero-glass px-4 py-1.5 text-sm text-hero-ink backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-hero-live opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-hero-live" />
            </span>
            Live delivery across Addis Ababa &amp; major cities
          </div>

          <h1 className="mb-6 text-4xl font-extrabold leading-[1.05] tracking-tighter text-hero-ink sm:text-5xl lg:text-6xl">
            <span className="sr-only">Abeni Express — </span>
            Ethiopia's <span className="hero-gold-text">Independent</span> Marketplace
          </h1>

          <p className="mb-9 max-w-xl text-lg leading-relaxed text-hero-muted">
            Shop verified products and services from local sellers, paid in Ethiopian Birr, delivered by our driver network across Ethiopia.
          </p>

          <form onSubmit={submit} className="hero-search flex max-w-2xl items-center gap-1 rounded-2xl p-1.5 transition-colors">
            <div className="relative shrink-0">
              <select
                aria-label="Category"
                value={cat}
                onChange={(e) => setCat(e.target.value)}
                className="h-11 cursor-pointer appearance-none rounded-xl bg-transparent pl-3 pr-8 text-sm font-medium text-hero-ink outline-none hover:bg-hero-glass"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.label} value={c.label} className="bg-hero-card">{c.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-hero-muted" />
            </div>
            <div className="h-6 w-px bg-hero-line" />
            <Search className="ml-2 hidden h-4 w-4 shrink-0 text-hero-muted sm:block" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search phones, local services, or digital goods..."
              className="h-11 min-w-0 flex-1 bg-transparent px-2 text-sm text-hero-ink outline-none placeholder:text-hero-muted"
            />
            <button type="submit" className="hero-cta h-11 shrink-0 rounded-xl px-4 text-sm font-semibold sm:px-5">
              Search
            </button>
          </form>

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            {CATEGORIES.map((c) => (
              <Link key={c.label} to={c.to} className="rounded-full border border-hero-line bg-hero-glass px-4 py-1.5 text-sm text-hero-muted transition-all hover:-translate-y-0.5 hover:border-hero-orange/50 hover:text-hero-ink">
                {c.label}
              </Link>
            ))}
            <Link to="/download" className="ml-1 inline-flex items-center gap-1 text-sm font-medium text-hero-ink/90 transition-colors hover:text-hero-orange">
              Get the App (iOS &amp; Android) <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-14 flex max-w-xl divide-x divide-hero-line">
            {[
              { v: "100%", l: "Verified Local Sellers" },
              { v: "25 ETB/km", l: "Transparent Delivery" },
              { v: "24/7", l: "Live Dispatch Support" },
            ].map((s, i) => (
              <div key={s.l} className={i === 0 ? "pr-5 sm:pr-8" : "px-5 sm:px-8"}>
                <div className="hero-gold-text text-xl font-bold tracking-tight sm:text-2xl">{s.v}</div>
                <div className="mt-1 text-xs text-hero-muted sm:text-sm">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right showcase */}
        <div className="hero-fade hero-delay relative mx-auto w-full max-w-md min-w-0 py-10">
          <div className="hero-card hero-tilt relative rounded-2xl p-5">
            <div className="mb-4 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl bg-hero-glass">
              {p?.image_url ? (
                <img key={p.id} src={p.image_url} alt={p.name} className="hero-fade h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full animate-pulse bg-hero-glass" />
              )}
            </div>
            <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-hero-live/15 px-2.5 py-0.5 text-xs font-semibold text-hero-live">
              <BadgeCheck className="h-3.5 w-3.5" /> Verified Seller
            </span>
            <h3 className="line-clamp-1 text-lg font-semibold text-hero-ink">{p?.name ?? "Loading products…"}</h3>
            <p className="text-sm text-hero-muted">{p?.seller_stores?.store_name ?? "Abeni Express"}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="hero-gold-text text-2xl font-bold tracking-tight">{p ? `ETB ${Number(p.price_etb).toLocaleString()}` : ""}</span>
              <Link to={p ? `/products?q=${encodeURIComponent(p.name)}` : "/products"} className="hero-cta rounded-lg px-4 py-2 text-sm font-semibold">Order Now</Link>
            </div>
          </div>

          <div className="hero-card hero-float absolute -right-2 top-0 w-56 rounded-2xl p-3.5 sm:-right-8">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-hero-orange/15 text-hero-orange"><Bike className="h-4 w-4" /></div>
              <div>
                <div className="text-sm font-semibold text-hero-ink">Rider En Route • 18 mins</div>
                <div className="text-xs text-hero-muted">Bole, Addis Ababa</div>
              </div>
            </div>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-hero-line">
              <div className="hero-progress h-full rounded-full" />
            </div>
          </div>

          <div className="hero-card hero-float-alt absolute -left-2 bottom-0 flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 sm:-left-10">
            <CreditCard className="h-4 w-4 text-hero-gold" />
            <div className="text-xs leading-tight">
              <div className="font-semibold text-hero-ink">Instant ETB Checkout</div>
              <div className="text-hero-live">Telebirr &amp; CBE Supported</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
