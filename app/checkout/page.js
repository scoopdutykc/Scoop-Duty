'use client';
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../lib/firebase";

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  async function startCheckout() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/payments/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service: searchParams.get("service"),
          frequency: searchParams.get("frequency"),
          yardSize: searchParams.get("yardSize"),
          pets: searchParams.get("pets"),
          litterBoxes: searchParams.get("litterBoxes"),
          customerEmail: user?.email || null,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Unable to start checkout");
      }
    } catch (err) {
      setError(err.message || "Checkout error");
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
          <strong>Service:</strong> {searchParams.get("service")}
        </p>
        <p style={{ marginBottom: "1rem" }}>
          <strong>Frequency:</strong> {searchParams.get("frequency")}
        </p>
        {searchParams.get("yardSize") && (
          <p style={{ marginBottom: "1rem" }}>
            <strong>Yard size:</strong> {searchParams.get("yardSize")}
          </p>
        )}
        {searchParams.get("pets") && (
          <p style={{ marginBottom: "1rem" }}>
            <strong># of pets:</strong> {searchParams.get("pets")}
          </p>
        )}
        {searchParams.get("litterBoxes") && (
          <p style={{ marginBottom: "1rem" }}>
            <strong># of litter boxes:</strong> {searchParams.get("litterBoxes")}
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
