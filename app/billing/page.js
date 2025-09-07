'use client';
import { useState, useEffect } from "react";
import { auth } from "../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function BillingPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  async function openPortal() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/stripe/create-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user?.email }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setMessage("Failed to open billing portal.");
      }
    } catch (err) {
      setMessage("Error: " + err.message);
    }
    setLoading(false);
  }

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
        Manage Billing
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
        <p style={{ marginBottom: "1.25rem", opacity: 0.85 }}>
          Access your secure Stripe customer portal to update payment methods,
          view/download invoices, or manage your subscription.
        </p>

        {message && <div style={{ marginBottom: "1rem", color: "#b00020" }}>{message}</div>}

        <button
          onClick={openPortal}
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
          {loading ? "Opening..." : "Open Billing Portal"}
        </button>
      </div>
    </main>
  );
}
