'use client';

import { useEffect, useState, useMemo } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../lib/firebase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function CheckoutPage() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  // raw query string from the browser (no useSearchParams)
  const [qs, setQs] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    // client-only: capture current query string for parsing
    if (typeof window !== "undefined") {
      setQs(window.location.search);
    }
  }, []);

  // If not authed, bounce home, open signup, preserve QS to resume
  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      try {
        const raw = qs.startsWith("?") ? qs.slice(1) : qs;
        if (raw) localStorage.setItem("pendingCheckoutQS", raw);
      } catch {}
      window.dispatchEvent(new Event("open-signup"));
      window.location.href = "/";
    }
  }, [authReady, user, qs]);

  // Parse selections safely from qs
  const sel = useMemo(() => {
    const params = new URLSearchParams(qs);
    return {
      service: params.get("service") || "",
      frequency: params.get("frequency") || "",
      yardSize: params.get("yardSize") || "",
      pets: params.get("pets") || "",
      litterBoxes: params.get("litterBoxes") || "",
    };
  }, [qs]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function startCheckout() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/payments/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...sel,
          customerEmail: user?.email || null,
        }),
      });
      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
      } else {
        setError(data?.error || "Unable to start checkout");
      }
    } catch (err) {
      setError(err?.message || "Checkout error");
    }
    setLoading(false);
  }

  // While auth is loading or we just redirected, render nothing
  if (!authReady || !user) return null;

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
      <h1 style={{ fontSize: "clamp(22px, 2.4vw, 34px)", marginBottom: "1.25rem" }}>
        Confirm your service
      </h1>

      <div
        style={{
          border: "1px solid #eee",
          borderRadius: 14,
          padding: "1.5rem",
          background: "#fff",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        }}
      >
        <p style={{ marginBottom: "1rem" }}>
          <strong>Service:</strong> {sel.service || "—"}
        </p>
        <p style={{ marginBottom: "1rem" }}>
          <strong>Frequency:</strong> {sel.frequency || "—"}
        </p>
        {sel.yardSize && (
          <p style={{ marginBottom: "1rem" }}>
            <strong>Yard size:</strong> {sel.yardSize}
          </p>
        )}
        {sel.pets && (
          <p style={{ marginBottom: "1rem" }}>
            <strong># of pets:</strong> {sel.pets}
          </p>
        )}
        {sel.litterBoxes && (
          <p style={{ marginBottom: "1rem" }}>
            <strong># of litter boxes:</strong> {sel.litterBoxes}
          </p>
        )}

        {error && <div style={{ color: "#b00020", marginBottom: "1rem" }}>{error}</div>}

        <button
          onClick={startCheckout}
          disabled={loading}
          style={{
            padding: "clamp(12px, 1.6vw, 14px) clamp(18px, 2.8vw, 24px)",
            borderRadius: 12,
            border: "1px solid #333",
            background: "#333",
            color: "#fff",
            fontWeight: 700,
            fontSize: "clamp(15px, 1.2vw, 18px)",
            cursor: "pointer",
          }}
        >
          {loading ? "Redirecting..." : "Go to Payment"}
        </button>
      </div>
    </main>
  );
}
