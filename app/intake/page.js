'use client';

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase"; // adjust path if needed

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function IntakePage() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [qs, setQs] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setQs(window.location.search);
    }
  }, []);

  const sessionId = useMemo(() => {
    const params = new URLSearchParams(qs);
    return params.get("session_id") || "";
  }, [qs]);

  if (!authReady) return null;

  return (
    <main
      style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: "1.5rem clamp(16px, 4vw, 32px)",
        fontSize: "clamp(16px, 1.2vw, 18px)",
        lineHeight: 1.6,
      }}
    >
      <h1 style={{ fontSize: "clamp(22px, 2.4vw, 34px)", marginBottom: "1.25rem" }}>
        Service intake
      </h1>

      <div
        style={{
          border: "1px solid #eee",
          borderRadius: 14,
          padding: "1rem",
          background: "#fff",
          marginBottom: "1rem",
        }}
      >
        <strong>Checkout session:</strong> {sessionId || "—"}
      </div>

      {/* Keep (or paste back) your real intake form + Firestore save logic below.
          This wrapper just avoids useSearchParams and forces dynamic rendering. */}
      <p style={{ opacity: 0.8 }}>
        Replace this placeholder with your existing intake form code.
      </p>
    </main>
  );
}
