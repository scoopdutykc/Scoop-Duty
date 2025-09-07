'use client';
import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, app as firebaseApp } from "../../lib/firebase"; // ✅ correct path
import { getFirestore, addDoc, collection, serverTimestamp } from "firebase/firestore";

export const dynamic = "force-dynamic";

function IntakeInner() {
  const searchParams = useSearchParams();
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [session, setSession] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Load Checkout Session details so we can show the right form / store metadata
  useEffect(() => {
    const id = searchParams.get("session_id");
    if (!id) {
      setErr("Missing session_id in URL.");
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/payments/session?id=${encodeURIComponent(id)}`);
        if (!res.ok) {
          setErr(`Failed to load session (status ${res.status}).`);
          return;
        }
        const data = await res.json();
        setSession(data);
      } catch (e) {
        setErr("Failed to load session.");
      }
    })();
  }, [searchParams]);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const db = getFirestore(firebaseApp);
      await addDoc(collection(db, "intake_responses"), {
        session_id: searchParams.get("session_id"),
        uid: user?.uid || null,
        email: user?.email || null,
        // Example capture – customize your form fields as needed:
        address: e.target.address?.value || "",
        gateCode: e.target.gateCode?.value || "",
        notes: e.target.notes?.value || "",
        createdAt: serverTimestamp(),
      });
      window.location.href = "/billing";
    } catch (e) {
      setErr(e.message || "Failed to submit form.");
    }
  }

  if (!authReady) return <main style={{ padding: 24 }}>Loading…</main>;
  if (!user) return <main style={{ padding: 24 }}>Please log in to continue.</main>;

  return (
    <main
      style={{
        maxWidth: 980,
        margin: "0 auto",
        padding: "1.5rem clamp(16px, 4vw, 32px)",
        fontSize: "clamp(16px, 1.1vw, 18px)",
        lineHeight: 1.6,
      }}
    >
      <h1 style={{ fontSize: "clamp(22px, 2.2vw, 32px)", marginBottom: 16 }}>
        Service Intake
      </h1>

      {err && (
        <div style={{ marginBottom: 16, color: "#b00020" }}>
          {err}
        </div>
      )}

      {!session ? (
        <div>Loading your session details…</div>
      ) : (
        <>
          <p style={{ margin: "0 0 12px" }}>
            <strong>Service:</strong> {session?.metadata?.service || "—"}
          </p>
          <p style={{ margin: "0 0 12px" }}>
            <strong>Frequency:</strong> {session?.metadata?.frequency || "—"}
          </p>

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12, marginTop: 16 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Service Address</span>
              <input name="address" type="text" required
                     style={{ padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8 }} />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>Gate Code (if any)</span>
              <input name="gateCode" type="text"
                     style={{ padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8 }} />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>Notes for our tech</span>
              <textarea name="notes" rows={4}
                        style={{ padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8 }} />
            </label>

            <button type="submit"
                    style={{
                      marginTop: 8,
                      padding: "12px 18px",
                      borderRadius: 10,
                      border: "1px solid #333",
                      background: "#333",
                      color: "#fff",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}>
              Submit
            </button>
          </form>
        </>
      )}
    </main>
  );
}

export default function IntakePage() {
  return (
    <Suspense fallback={<main style={{ padding: 24 }}>Loading…</main>}>
      <IntakeInner />
    </Suspense>
  );
}
