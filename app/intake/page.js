'use client';

import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";   // adjust if your path differs

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function IntakePage() {
  return (
    <Suspense fallback={null}>
      <IntakeInner />
    </Suspense>
  );
}

function IntakeInner() {
  const searchParams = useSearchParams();
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  if (!authReady) return null;

  const sessionId = searchParams.get("session_id") || "";

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
      {/* YOUR EXISTING INTAKE UI (form/questions/saving) GOES HERE.
          If your previous code reads session details from /api/payments/session,
          keep that logic intact below. This wrapper only adds Suspense + dynamic
          so Vercel stops trying to pre-render this page. */}
      <h1 style={{ fontSize: "clamp(22px, 2.4vw, 34px)", marginBottom: "1.25rem" }}>
        Service intake
      </h1>

      {/* Example: show session id so you know it's being received */}
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

      {/* ↓ Replace this with your real intake form+save logic */}
      <p style={{ opacity: 0.8 }}>
        Replace this placeholder with your existing intake form code.
      </p>
    </main>
  );
}
