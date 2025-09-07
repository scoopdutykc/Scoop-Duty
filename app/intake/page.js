// app/intake/page.js
'use client';

import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../lib/firebase'; // <-- path matches your earlier working setup
import {
  addDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';

// Tell Next this page is dynamic so it won't try to prerender it
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// --- small helper to read query params without useSearchParams() ---
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

export default function IntakePage() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  // form state (keep whatever fields you already had)
  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  // read the session id from the URL without useSearchParams()
  const sessionId = useQueryParam('session_id');

  // auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // (optional) prefill from session metadata you might have stored server-side
  // If you call an API route to look up session details, do it here with fetch()
  // using `sessionId`, then set form defaults. Keeping it simple for now.

  async function handleSubmit(e) {
    e.preventDefault();
    if (!authReady) return;
    if (!user) {
      setError('Please log in first.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Write intake doc. Collection name can be changed to match your rules.
      const payload = {
        uid: user.uid,
        email: user.email || '',
        fullName,
        address,
        notes,
        sessionId: sessionId || '',
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'intakes'), payload);

      setDone(true);
    } catch (err) {
      setError(err?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  // Require login (keeps consistent with your rules)
  if (authReady && !user) {
    return (
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '2rem' }}>
        <h1>Intake</h1>
        <p>Please log in to continue.</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ marginBottom: 12 }}>Service Intake</h1>

      {sessionId && (
        <div
          style={{
            marginBottom: 16,
            padding: '10px 12px',
            borderRadius: 10,
            background: '#f5f7ff',
            border: '1px solid #e2e7ff',
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
            padding: '10px 12px',
            borderRadius: 10,
            background: '#fff4f4',
            border: '1px solid #ffd6d6',
            color: '#b00020',
          }}
        >
          {error}
        </div>
      )}

      {done ? (
        <div
          style={{
            padding: '18px 16px',
            borderRadius: 12,
            background: '#f1fff4',
            border: '1px solid #c9f3d2',
          }}
        >
          <h2 style={{ marginTop: 0 }}>Thanks! 🎉</h2>
          <p>Your intake was submitted successfully. We’ll email you shortly.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', marginBottom: 10 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Full name</div>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 10,
                border: '1px solid #ddd',
              }}
            />
          </label>

          <label style={{ display: 'block', marginBottom: 10 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Service address</div>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 10,
                border: '1px solid #ddd',
              }}
            />
          </label>

          <label style={{ display: 'block', marginBottom: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Notes (gate code, pets, etc.)</div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 10,
                border: '1px solid #ddd',
                resize: 'vertical',
              }}
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '12px 18px',
              borderRadius: 12,
              border: '1px solid #333',
              background: '#333',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
              minWidth: 180,
            }}
          >
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
        </form>
      )}
    </main>
  );
}
