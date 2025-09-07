// app/intake/IntakeClient.js
"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

// read a query param from window safely (no useSearchParams)
function useQueryParam(name) {
  const [value, setValue] = useState(null);
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      setValue(params.get(name));
    } catch {
      setValue(null);
    }
  }, [name]);
  return value;
}

export default function IntakeClient() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  // Form fields — mirror your original intake UI/labels
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const sessionId = useQueryParam("session_id");

  // auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Submit to Firestore
  async function handleSubmit(e) {
    e.preventDefault();
    if (!authReady) return;
    if (!user) {
      setError("Please log in to continue.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const payload = {
        uid: user.uid,
        email: user.email || "",
        fullName,
        address,
        notes,
        sessionId: sessionId || "",
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "intakes"), payload);

      setDone(true);
    } catch (err) {
      console.error("Intake submit error:", err);
      setError(err?.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (authReady && !user) {
    return (
      <div
        style={{
          marginTop: 8,
          padding: "12px 14px",
          borderRadius: 10,
          background: "#fff7e6",
          border: "1px solid #ffd48a",
        }}
      >
        Please log in or sign up to continue.
      </div>
    );
  }

  return (
    <>
      {sessionId && (
        <div
          style={{
            marginBottom: 16,
            padding: "10px 12px",
            borderRadius: 10,
            background: "#f5f7ff",
            border: "1px solid #e2e7ff",
            fontSize: 14,
          }}
        >
          Linked Stripe session: <strong>{sessionId}</strong>
        </div>
      )}

      {error && (
        <div
          style={{
            marginBottom: 16,
            padding: "10px 12px",
            borderRadius: 10,
            background: "#fff4f4",
            border: "1px solid #ffd6d6",
            color: "#b00020",
          }}
        >
          {error}
        </div>
      )}

      {done ? (
        <div
          style={{
            padding: "18px 16px",
            borderRadius: 12,
            background: "#f1fff4",
            border: "1px solid #c9f3d2",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Thanks! 🎉</h2>
          <p>Your intake was submitted successfully. We’ll email you shortly.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <label style={{ display: "block", marginBottom: 10 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Full name</div>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid #ddd",
              }}
            />
          </label>

          <label style={{ display: "block", marginBottom: 10 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Service address</div>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid #ddd",
              }}
            />
          </label>

          <label style={{ display: "block", marginBottom: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>
              Notes (gate code, pets, etc.)
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid #ddd",
                resize: "vertical",
              }}
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: "12px 18px",
              borderRadius: 12,
              border: "1px solid #333",
              background: "#333",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
              minWidth: 180,
            }}
          >
            {submitting ? "Submitting…" : "Submit"}
          </button>
        </form>
      )}
    </>
  );
}
