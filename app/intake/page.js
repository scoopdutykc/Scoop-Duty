'use client';

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../lib/firebase"; // ✅ your project exports auth & db here
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

/** ---------------------------
 *  Form configs by service
 *  ---------------------------
 *  Each service defines sections and fields.
 *  All answers are saved into Firestore as a flat object alongside your metadata.
 */
const FORM_CONFIGS = {
  scooping: {
    title: "Scooping Intake",
    sections: [
      {
        title: "Contact",
        fields: [
          { key: "fullName", label: "Full name", required: true, placeholder: "" },
          { key: "phone", label: "Phone", required: true, placeholder: "" },
        ],
      },
      {
        title: "Service Address",
        fields: [
          { key: "address1", label: "Address line 1", required: true },
          { key: "address2", label: "Address line 2" },
          { key: "city", label: "City", required: true },
          { key: "state", label: "State", required: true },
          { key: "zip", label: "ZIP", required: true },
        ],
      },
      {
        title: "Access & Pets",
        fields: [
          { key: "gateCode", label: "Gate code / Access notes" },
          { key: "wasteBinLocation", label: "Front Yard, Backyard, or Both?" },
          { key: "petsNames", label: "Pet name(s)" },
          { key: "yardNotes", label: "Yard / special notes", type: "textarea" },
        ],
      },
      {
        title: "Scheduling Preference",
        fields: [
          { key: "preferredDay", label: "Preferred day", placeholder: "e.g., Tuesdays" },
          { key: "preferredTimeWindow", label: "Preferred time window", placeholder: "e.g., 1–3 PM" },
          { key: "additionalNotes", label: "Anything else we should know?", type: "textarea" },
        ],
      },
    ],
  },

  playtime: {
    title: "Doggy Playtime Intake",
    sections: [
      {
        title: "Contact",
        fields: [
          { key: "fullName", label: "Full name", required: true },
          { key: "phone", label: "Phone", required: true },
        ],
      },
      {
        title: "Service Address",
        fields: [
          { key: "address1", label: "Address line 1", required: true },
          { key: "address2", label: "Address line 2" },
          { key: "city", label: "City", required: true },
          { key: "state", label: "State", required: true },
          { key: "zip", label: "ZIP", required: true },
        ],
      },
      {
        title: "Pet Details",
        fields: [
          { key: "petsNames", label: "Dog name(s)" },
          { key: "temperament", label: "Temperament / behavioral notes", type: "textarea" },
          { key: "playPreferences", label: "Play preferences (toys, games)", type: "textarea" },
        ],
      },
      {
        title: "Access & Scheduling",
        fields: [
          { key: "gateCode", label: "Gate code / Access notes" },
          { key: "preferredDay", label: "Preferred day", placeholder: "e.g., Tuesdays" },
          { key: "preferredTimeWindow", label: "Preferred time window", placeholder: "e.g., 1–3 PM" },
          { key: "additionalNotes", label: "Anything else we should know?", type: "textarea" },
        ],
      },
    ],
  },

  litter: {
    title: "Kitty Litter Trade Intake",
    sections: [
      {
        title: "Contact",
        fields: [
          { key: "fullName", label: "Full name", required: true },
          { key: "phone", label: "Phone", required: true },
        ],
      },
      {
        title: "Service Address",
        fields: [
          { key: "address1", label: "Address line 1", required: true },
          { key: "address2", label: "Address line 2" },
          { key: "city", label: "City", required: true },
          { key: "state", label: "State", required: true },
          { key: "zip", label: "ZIP", required: true },
        ],
      },
      {
        title: "Litter Details",
        fields: [
          { key: "boxLocations", label: "Where are the litter box(es) located?", type: "textarea" },
          { key: "catsNames", label: "Cat name(s)" },
          { key: "homeNotes", label: "Apartment/House details or special notes", type: "textarea" },
        ],
      },
      {
        title: "Scheduling Preference",
        fields: [
          { key: "preferredDay", label: "Preferred day", placeholder: "e.g., Tuesdays" },
          { key: "preferredTimeWindow", label: "Preferred time window", placeholder: "e.g., 1–3 PM" },
          { key: "additionalNotes", label: "Anything else we should know?", type: "textarea" },
        ],
      },
    ],
  },
};

function IntakeInner() {
  const params = useSearchParams();
  const sessionId = params.get("session_id") || "";

  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Which service was purchased (from Stripe session metadata)
  const service = (session?.metadata?.service || "").toLowerCase() || "scooping";
  const config = FORM_CONFIGS[service] || FORM_CONFIGS.scooping;

  // Flat form state (fields are defined by selected service config)
  const [form, setForm] = useState({}); // we will seed it after we know config

  // Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  // Fetch the checkout session to read metadata (service, frequency, etc.)
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!sessionId) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/payments/session?session_id=${encodeURIComponent(sessionId)}`);
        const data = await res.json().catch(() => null);
        if (res.ok && !cancelled) {
          setSession(data);
        } else if (!cancelled) {
          console.error("Intake: session fetch failed", { status: res.status, data, sessionId });
          setError(data?.error || `Failed to load session (status ${res.status}).`);
        }
      } catch (e) {
        if (!cancelled) setError("Failed to load session.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [sessionId]);

  // Initialize form keys when config changes
  useEffect(() => {
    // Build a default empty object with all keys present
    const start = {};
    for (const section of config.sections) {
      for (const field of section.fields) {
        if (start[field.key] === undefined) start[field.key] = "";
      }
    }
    setForm((prev) => ({ ...start, ...prev }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service]);

  // Summary line
  const summary = useMemo(() => {
    const m = session?.metadata || {};
    const parts = [
      m.service,
      m.frequency,
      m.pets ? `${m.pets} pets` : null,
    ];
    if (m.service === "litter" && m.litterBoxes) parts.push(`${m.litterBoxes} litter boxes`);
    if (m.service === "scooping" && m.yardSize) parts.push(`${m.yardSize} yard`);
    return parts.filter(Boolean).join(" • ");
  }, [session]);

  function setVal(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!user?.uid) {
      setError("Please log in first.");
      return;
    }
    if (!sessionId) {
      setError("Missing session id.");
      return;
    }

    setSaving(true);
    try {
      await addDoc(collection(db, "intake_submissions"), {
        uid: user.uid,
        email: user.email || null,
        session_id: sessionId,
        stripe_customer_id: session?.customer_id || null,
        stripe_mode: session?.mode || null,

        // Metadata from checkout (ties intake to purchase)
        service: session?.metadata?.service || null,
        frequency: session?.metadata?.frequency || null,
        pets: session?.metadata?.pets || null,
        yardSize: session?.metadata?.yardSize || null,
        litterBoxes: session?.metadata?.litterBoxes || null,

        // All form fields (service-specific)
        ...form,

        createdAt: serverTimestamp(),
      });

      alert("Thanks! Your details were submitted.");
      // Optional post-submit redirect:
      // window.location.href = "/billing";
    } catch (e2) {
      console.error(e2);
      setError("Could not submit your details. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main style={{ maxWidth: 800, margin: "0 auto", padding: "1.25rem" }}>Loading…</main>;
  }

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "1.25rem" }}>
      <h1 style={{ margin: 0, fontSize: "1.5rem" }}>{config.title}</h1>
      {summary && <p style={{ opacity: 0.85, marginTop: 6 }}>{summary}</p>}

      {!user && (
        <p style={{ color: "#7a0000" }}>
          Please log in or sign up to submit your details.
        </p>
      )}
      {error && <p style={{ color: "#b00020" }}>{error}</p>}

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.9rem", marginTop: "1rem" }}>
        {config.sections.map((section) => (
          <Section key={section.title} title={section.title}>
            <div style={{ display: "grid", gap: 12 }}>
              {section.fields.map((f) => (
                <Field key={f.key} label={f.label}>
                  {f.type === "textarea" ? (
                    <textarea
                      value={form[f.key] ?? ""}
                      onChange={(e) => setVal(f.key, e.target.value)}
                      rows={3}
                      placeholder={f.placeholder || ""}
                      style={textarea}
                    />
                  ) : (
                    <input
                      value={form[f.key] ?? ""}
                      onChange={(e) => setVal(f.key, e.target.value)}
                      required={!!f.required}
                      placeholder={f.placeholder || ""}
                      style={input}
                    />
                  )}
                </Field>
              ))}
            </div>
          </Section>
        ))}

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button type="submit" disabled={!user || saving} style={primaryBtn}>
            {saving ? "Submitting…" : "Submit details"}
          </button>
          <span style={{ fontSize: 12, opacity: 0.8 }}>
            You can always update later by emailing{" "}
            <a href="mailto:scoopdutykc@gmail.com">scoopdutykc@gmail.com</a>
          </span>
        </div>
      </form>
    </main>
  );
}

/* ——— UI bits ——— */
function Section({ title, children }) {
  return (
    <section style={{ border: "1px solid #eee", borderRadius: 12, padding: "1rem" }}>
      <h3 style={{ margin: "0 0 0.5rem" }}>{title}</h3>
      {children}
    </section>
  );
}
function Field({ label, children }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, opacity: 0.8 }}>{label}</span>
      {children}
    </label>
  );
}

const input = { padding: "0.55rem 0.6rem", borderRadius: 8, border: "1px solid #ddd" };
const textarea = { padding: "0.55rem 0.6rem", borderRadius: 8, border: "1px solid #ddd", resize: "vertical" };
const primaryBtn = { padding: "0.65rem 1rem", borderRadius: 10, border: "1px solid #333", background: "#333", color: "#fff", fontWeight: 700, cursor: "pointer" };

export default function IntakePage() {
  // ✅ Suspense wrapper required for useSearchParams in App Router
  return (
    <Suspense fallback={<main style={{ maxWidth: 800, margin: "0 auto", padding: "1.25rem" }}>Loading…</main>}>
      <IntakeInner />
    </Suspense>
  );
}
