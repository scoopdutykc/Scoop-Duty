'use client';
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";
import priceData from "./checkout/priceMap.json";
import priceAmounts from "./checkout/priceAmounts.json";
import Script from "next/script"; // ← JSON-LD

const { PRICE_MAP, FALLBACK_PRICE_BY_SERVICE } = priceData;

// One-time prices per service
const ONETIME_OVERRIDE = {
  scooping: "price_1S4SQLRzSCSZiE1R6YBer4cZ",
  playtime: "price_1S4SPURzSCSZiE1RrLUYru5Z",
  litter:   "price_1S4SP8RzSCSZiE1RGHuQugOG",
};

const SERVICES = [
  { slug: "scooping", name: "Normal Scooping", blurb: "Weekly or one-time yard cleanup. We take the waste with us", img: "/images/service-scooping.jpg" },
  { slug: "playtime", name: "Doggy Playtime", blurb: "Fun, engaging play sessions. Great for getting their energy out.", img: "/images/service-playtime.jpg" },
  { slug: "litter",   name: "Kitty Litter Trade", blurb: "Fast, smell-free litter refresh. We take the used litter with us", img: "/images/service-litter.jpg" },
];

const SERVICE_LABEL = { scooping: "Normal Scooping", playtime: "Doggy Playtime", litter: "Kitty Litter Trade" };

// --- Price resolver ---
function resolvePriceId({ service, frequency, yardSize, pets, litterBoxes }) {
  const svcKey  = String(service || "").toLowerCase();
  const freqKey = String(frequency || "").toLowerCase()
    .replace(/once weekly/g, "weekly")
    .replace(/one[-\s]?time/g, "onetime")
    .replace(/twice weekly/g, "twice_weekly")
    .replace(/(three|thrice) weekly/g, "thrice_weekly");

  const sizeKey  = String((yardSize || "")).toLowerCase();
  const petsKey  = String(pets || "1");
  const boxesKey = String(litterBoxes || "1");

  const svc = PRICE_MAP?.[svcKey];

  if (freqKey === "onetime") {
    if (ONETIME_OVERRIDE[svcKey]) return ONETIME_OVERRIDE[svcKey];
    const pmOnetime = svc?.onetime;
    if (typeof pmOnetime === "string") return pmOnetime;
    if (pmOnetime && typeof pmOnetime === "object") {
      const level1 = Object.values(pmOnetime)[0];
      if (typeof level1 === "string") return level1;
      if (level1 && typeof level1 === "object") {
        const leaf = Object.values(level1)[0];
        if (typeof leaf === "string") return leaf;
      }
    }
    return FALLBACK_PRICE_BY_SERVICE?.[svcKey] || null;
  }

  if (svcKey === "litter") {
    const byFreq = svc?.[freqKey];
    if (!byFreq) return FALLBACK_PRICE_BY_SERVICE?.[svcKey] || null;
    const byBoxes = byFreq?.[boxesKey];
    if (typeof byBoxes === "string") return byBoxes;
    if (byBoxes && typeof byBoxes === "object") {
      return byBoxes?.[petsKey] || FALLBACK_PRICE_BY_SERVICE?.[svcKey] || null;
    }
    return FALLBACK_PRICE_BY_SERVICE?.[svcKey] || null;
  }

  if (svcKey === "playtime") {
    const byFreq = svc?.[freqKey];
    if (!byFreq) return FALLBACK_PRICE_BY_SERVICE?.[svcKey] || null;
    const byPets = byFreq?.[petsKey];
    if (typeof byPets === "string") return byPets;
    if (byPets && typeof byPets === "object") {
      return byPets?.[sizeKey] || FALLBACK_PRICE_BY_SERVICE?.[svcKey] || null;
    }
    return FALLBACK_PRICE_BY_SERVICE?.[svcKey] || null;
  }

  const byFreq = svc?.[freqKey];
  if (!byFreq) return FALLBACK_PRICE_BY_SERVICE?.[svcKey] || null;
  const bySize = byFreq?.[sizeKey];
  if (typeof bySize === "string") return bySize;
  if (bySize && typeof bySize === "object") {
    return bySize?.[petsKey] || FALLBACK_PRICE_BY_SERVICE?.[svcKey] || null;
  }
  return FALLBACK_PRICE_BY_SERVICE?.[svcKey] || null;
}

export default function HomePage() {
  const [user, setUser] = useState(null);

  // selection state
  const [service, setService] = useState("scooping");
  const [frequency, setFrequency] = useState("weekly");
  const [yardSize, setYardSize] = useState("small");
  const [petsScooping, setPetsScooping] = useState("1");
  const [petsPlaytime, setPetsPlaytime] = useState("1");
  const [litterBoxes, setLitterBoxes] = useState("1");

  // NEW: popup flag shown above the checkout button if user isn't logged in
  const [showLoginPopup, setShowLoginPopup] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  const estimate = useMemo(() => {
    const sel = {
      service,
      frequency,
      yardSize,
      pets: service === "scooping" ? petsScooping : (service === "playtime" ? petsPlaytime : "1"),
      litterBoxes,
    };
    const priceId = resolvePriceId(sel);
    if (!priceId) return { text: "—", amount: null };
    const rec = priceAmounts[priceId];
    if (!rec || rec.amount == null) return { text: "—", amount: null };

    const dollars = Number(rec.amount);
    const suffix = rec.interval ? ` / ${rec.interval}` : "";
    return { text: `$${dollars.toFixed(2)}${suffix}`, amount: dollars };
  }, [service, frequency, yardSize, petsScooping, petsPlaytime, litterBoxes]);

  function goCheckout() {
    const pets =
      service === "scooping" ? petsScooping :
      service === "playtime" ? petsPlaytime : "";

    const qs = new URLSearchParams({
      service,
      frequency,
      amount: estimate.amount ? String(Math.round(estimate.amount * 100)) : "",
      ...(service === "scooping" ? { yardSize, pets } : {}),
      ...(service === "playtime" ? { pets } : {}),
      ...(service === "litter" ? { litterBoxes } : {}),
    }).toString();

    // Require auth before checkout; show popup near the button
    if (!user) {
      setShowLoginPopup(true);
      try {
        localStorage.setItem("pendingCheckoutQS", qs);
      } catch {}
      // Open your existing inline signup/login UI (AuthBar listens for this)
      window.dispatchEvent(new Event("open-signup"));
      return;
    }

    window.location.href = `/checkout?${qs}`;
  }

  // Auto-resume if the user logs in while this page is open and a pending checkout exists
  useEffect(() => {
    if (!user) return;
    try {
      const pending = localStorage.getItem("pendingCheckoutQS");
      if (pending) {
        localStorage.removeItem("pendingCheckoutQS");
        window.location.href = `/checkout?${pending}`;
      }
    } catch {}
  }, [user]);

  return (
    <main
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: "1.5rem clamp(16px, 4vw, 32px)",
        fontSize: "clamp(16px, 1.2vw, 18px)",
        lineHeight: 1.6,
      }}
    >
      {/* --- LocalBusiness JSON-LD (invisible SEO) --- */}
      <Script
        id="ld-localbusiness"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            name: "Scoop Duty KC",
            url: "https://scoop-duty.com",
            description:
              "Pet waste removal in the Kansas City Metro (MO side). Weekly or one-time scooping, doggy playtime, and kitty litter trade.",
            image: "https://scoop-duty.com/images/og-hero.jpg",
            email: "scoopdutykc@gmail.com",
            address: {
              "@type": "PostalAddress",
              addressLocality: "Kansas City",
              addressRegion: "MO",
              addressCountry: "US",
            },
            areaServed: "Greater Kansas City, MO",
            makesOffer: [
              { "@type": "Offer", itemOffered: { "@type": "Service", name: "Pet Waste Removal (Scooping)", areaServed: "Greater Kansas City, MO" } },
              { "@type": "Offer", itemOffered: { "@type": "Service", name: "Doggy Playtime", areaServed: "Greater Kansas City, MO" } },
              { "@type": "Offer", itemOffered: { "@type": "Service", name: "Kitty Litter Trade", areaServed: "Greater Kansas City, MO" } },
            ],
          }),
        }}
      />

      {/* HERO */}
      <section style={{ position: "relative", borderRadius: 16, overflow: "hidden", marginBottom: "1.5rem", border: "1px solid #eee" }}>
        <div style={{ position: "relative", height: "clamp(260px, 36vw, 380px)" }}>
          <img
            src="/images/hero-yard.jpg"
            alt="Pet waste removal service in Kansas City MO — clean backyard ready for pets"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.45) 100%)" }} />
          <div style={{ position: "absolute", left: 20, bottom: 20, color: "#fff", maxWidth: 720 }}>
            <h1 style={{ margin: 0, fontSize: "clamp(15px, 1.2vw, 30px)", lineHeight: 3, fontWeight: "bold" }}>
              Use Code "FIRST" for 50% Off Your First Service!
            </h1>
            <p style={{ margin: "1rem 0 3rem", opacity: 0.95, fontSize: "clamp(16px, 1.6vw, 20px)" }}>
              Servicing the KC Metro Area.
            </p>
            <button
              onClick={() => window.dispatchEvent(new Event("open-signup"))}
              style={{
                display: "inline-block",
                padding: "clamp(10px, 1.4vw, 12px) clamp(16px, 2.6vw, 20px)",
                borderRadius: 10,
                background: "#ffffff",
                color: "#222",
                border: "none",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Sign up now
            </button>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" style={{ marginTop: "1rem" }}>
        <h2 style={{ fontSize: "clamp(22px, 2.4vw, 32px)", marginBottom: "1rem" }}>Our Services</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "clamp(14px, 2.2vw, 22px)",
          }}
        >
          {SERVICES.map((s) => (
            <button
              key={s.slug}
              onClick={() => setService(s.slug)}
              style={{
                border: service === s.slug ? "2px solid #333" : "1px solid #eee",
                borderRadius: 14,
                overflow: "hidden",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                background: "#fff",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <div style={{ width: "100%", height: "clamp(180px, 24vw, 240px)", overflow: "hidden" }}>
                <img
                  src={s.img}
                  alt={
                    s.slug === "scooping"
                      ? "Dog poop scooping service in Kansas City MO backyard"
                      : s.slug === "playtime"
                      ? "Doggy playtime service in Kansas City MO — exercise and fun for dogs"
                      : "Kitty litter box cleaning service in Kansas City MO"
                  }
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              </div>
              <div style={{ padding: "1.1rem" }}>
                <h3 style={{ marginTop: 0, fontSize: "clamp(18px, 1.6vw, 22px)" }}>{s.name}</h3>
                <p style={{ margin: 0, opacity: 0.85 }}>{s.blurb}</p>
                {service === s.slug && (
                  <div style={{ marginTop: 10, fontSize: 13, fontWeight: 700, opacity: 0.8 }}>Selected</div>
                )}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* OPTIONS */}
      <section id="options" style={{ marginTop: "1.75rem" }}>
        <h2 style={{ fontSize: "clamp(20px, 2.2vw, 28px)", marginBottom: "0.75rem" }}>
          {SERVICE_LABEL[service]} — Options
        </h2>

        <div style={{ display: "grid", gap: "1.1rem", marginTop: "0.5rem" }}>
          {/* Frequency */}
          <Row label="Frequency">
            <select value={frequency} onChange={(e) => setFrequency(e.target.value)} style={select}>
              <option value="weekly">Weekly</option>
              <option value="twice_weekly">Twice weekly</option>
              <option value="thrice_weekly">Three weekly</option>
              <option value="onetime">One-time</option>
            </select>
          </Row>

          {service === "scooping" && (
            <>
              <Row label="Yard size">
                <select value={yardSize} onChange={(e) => setYardSize(e.target.value)} style={select}>
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </Row>
              <Row label="# of pets">
                <select value={petsScooping} onChange={(e) => setPetsScooping(e.target.value)} style={select}>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5+">5+</option>
                </select>
              </Row>
            </>
          )}

          {service === "playtime" && (
            <Row label="# of pets">
              <select value={petsPlaytime} onChange={(e) => setPetsPlaytime(e.target.value)} style={select}>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5+">5+</option>
              </select>
            </Row>
          )}

          {service === "litter" && (
            <Row label="# of litter boxes">
              <select value={litterBoxes} onChange={(e) => setLitterBoxes(e.target.value)} style={select}>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4+">4+</option>
              </select>
            </Row>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", padding: "1rem 1.1rem", border: "1px solid #eee", borderRadius: 12, background: "#fff" }}>
            <div>Estimated total</div>
            <div style={{ fontWeight: 800, fontSize: 20 }}>{estimate.text}</div>
          </div>

          {/* --- LOGIN POPUP (only when not logged in and they tried to checkout) --- */}
          {showLoginPopup && !user && (
            <div
              style={{
                marginTop: "-0.25rem",
                marginBottom: "0.5rem",
                background: "#fff",
                border: "1px solid #ffd7d7",
                borderRadius: 10,
                boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
                padding: "0.9rem 1rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontWeight: 700, color: "#b00020" }}>
                  Please log in or sign up to continue
                </span>
                <button
                  onClick={() => setShowLoginPopup(false)}
                  style={{
                    marginLeft: "auto",
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: "1px solid #eee",
                    background: "#fafafa",
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                  aria-label="Dismiss message"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <button
            onClick={goCheckout}
            style={{
              padding: "clamp(12px, 1.6vw, 14px) clamp(18px, 2.8vw, 24px)",
              borderRadius: 12,
              border: "1px solid #333",
              background: "#333",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 800,
              fontSize: "clamp(15px, 1.2vw, 18px)",
            }}
          >
            Continue to checkout
          </button>
        </div>
      </section>

      {/* ---------- VISIBLE FAQ ---------- */}
      <section
        id="faq"
        style={{
          marginTop: "2.5rem",
          padding: "1.25rem",
          border: "1px solid #eee",
          borderRadius: 14,
          background: "#fff",
        }}
      >
        <h2 style={{ margin: "0 0 1rem", fontSize: "clamp(20px, 2.2vw, 28px)" }}>
          Frequently Asked Questions
        </h2>

        <div style={{ display: "grid", gap: "0.75rem" }}>
          <details style={faqItemStyle}>
            <summary style={faqSummaryStyle}>
              What areas does Scoop Duty KC service?
            </summary>
            <div style={faqBodyStyle}>
              We proudly service the Greater Kansas City Area.
            </div>
          </details>

          <details style={faqItemStyle}>
            <summary style={faqSummaryStyle}>
              What do you do with the poop after cleaning?
            </summary>
            <div style={faqBodyStyle}>
              We take it with us to one of our disposal sites.
            </div>
          </details>

          <details style={faqItemStyle}>
            <summary style={faqSummaryStyle}>
              When is my start date?
            </summary>
            <div style={faqBodyStyle}>
              After checkout, choose a preferred date. We’ll email you your start date.
            </div>
          </details>

          <details style={faqItemStyle}>
            <summary style={faqSummaryStyle}>
              How do I pay?
            </summary>
            <div style={faqBodyStyle}>
              All payments are securely handled through our Stripe-powered billing portal.
            </div>
          </details>

          <details style={faqItemStyle}>
            <summary style={faqSummaryStyle}>
              How often will I be charged?
            </summary>
            <div style={faqBodyStyle}>
              You’ll be billed weekly, even if you are on twice or thrice weekly visits.
            </div>
          </details>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ marginTop: "3rem", padding: "1.75rem", borderTop: "1px solid #eee", textAlign: "center", fontSize: 15, opacity: 0.9 }}>
        <p style={{ margin: 0 }}>
          📧 Contact me: <a href="mailto:scoopdutykc@gmail.com">scoopdutykc@gmail.com</a>
        </p>
      </footer>
    </main>
  );
}

function Row({ label, children }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "clamp(160px, 24vw, 260px) 1fr",
        gap: "0.9rem",
        alignItems: "center",
      }}
    >
      <span style={{ fontWeight: 700 }}>{label}</span>
      {children}
    </div>
  );
}

const select = { padding: "0.7rem 0.75rem", borderRadius: 10, border: "1px solid #ddd", fontSize: "1em" };

const faqItemStyle = {
  border: "1px solid #eee",
  borderRadius: 12,
  background: "#fafafa",
  overflow: "hidden",
};

const faqSummaryStyle = {
  cursor: "pointer",
  listStyle: "none",
  padding: "0.9rem 1rem",
  fontWeight: 700,
  outline: "none",
};

const faqBodyStyle = {
  padding: "0.9rem 1rem 1.1rem",
  borderTop: "1px solid #eee",
  lineHeight: 1.6,
};
