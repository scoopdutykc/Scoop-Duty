'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../lib/firebase'; // <-- intake/.. goes up one to app/, then lib/
import { getFirestore, addDoc, collection, serverTimestamp } from 'firebase/firestore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function withTimeout(promise, ms = 15000, label = 'operation') {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise
      .then((v) => { clearTimeout(id); resolve(v); })
      .catch((e) => { clearTimeout(id); reject(e); });
  });
}

export default function IntakePage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id') || '';

  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  const [loadingSession, setLoadingSession] = useState(false);
  const [session, setSession] = useState(null);
  const [sessionErr, setSessionErr] = useState('');

  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState('');

  // Track auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Fetch Stripe Checkout Session details for context (service/frequency etc.)
  useEffect(() => {
    if (!sessionId) return;
    setLoadingSession(true);
    setSessionErr('');
    (async () => {
      try {
        const res = await fetch(`/api/payments/session?session_id=${encodeURIComponent(sessionId)}`, {
          cache: 'no-store',
        });
        if (!res.ok) {
          setSessionErr(`Failed to load session (status ${res.status}).`);
          setLoadingSession(false);
          return;
        }
        const data = await res.json();
        setSession(data);
      } catch (e) {
        setSessionErr(e?.message || 'Failed to load session.');
      }
      setLoadingSession(false);
    })();
  }, [sessionId]);

  // Service-specific questions — adjust as needed
  const service = (session?.metadata?.service || '').toLowerCase(); // 'scooping' | 'playtime' | 'litter'
  const frequency = (session?.metadata?.frequency || '').toLowerCase();

  // Build field config by service (keep simple & stable)
  const fields = useMemo(() => {
    const base = [
      { key: 'fullName', label: 'Full name', type: 'text', required: true },
      { key: 'phone', label: 'Phone number', type: 'tel', required: true },
      { key: 'address', label: 'Service address', type: 'text', required: true },
      { key: 'accessNotes', label: 'Gate/Access Notes', type: 'textarea', required: false },
      { key: 'preferredStart', label: 'Preferred start date', type: 'date', required: false },
    ];

    if (service === 'scooping') {
      return [
        ...base,
        { key: 'hasLockedGate', label: 'Locked gate?', type: 'select', options: ['No', 'Yes'], required: true },
        { key: 'petNames', label: 'Pet name(s)', type: 'text', required: false },
        { key: 'yardNotes', label: 'Yard notes', type: 'textarea', required: false },
      ];
    }
    if (service === 'playtime') {
      return [
        ...base,
        { key: 'petNames', label: 'Dog name(s)', type: 'text', required: false },
        { key: 'playPreferences', label: 'Play preferences (fetch, tug, etc.)', type: 'textarea', required: false },
        { key: 'specialInstructions', label: 'Special instructions', type: 'textarea', required: false },
      ];
    }
    if (service === 'litter') {
      return [
        ...base,
        { key: 'indoorAccess', label: 'Indoor access instructions', type: 'textarea', required: true },
        { key: 'catNames', label: 'Cat name(s)', type: 'text', required: false },
        { key: 'litterBrand', label: 'Preferred litter brand (if any)', type: 'text', required: false },
      ];
    }
    // Fallback
    return base;
  }, [service]);

  function updateField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaveErr('');

    if (!user?.uid) {
      setSaveErr('Please log in first.');
      return;
    }
    if (!sessionId) {
      setSaveErr('Missing session id.');
      return;
    }

    setSaving(true);
    try {
      await withTimeout(
        addDoc(collection(db, 'intake_submissions'), {
          uid: user.uid,
          email: user.email || null,
          session_id: sessionId,
          stripe_customer_id: session?.customer_id || null,
          stripe_mode: session?.mode || null,
          // tie to purchased selections
          service: service || null,
          frequency: frequency || null,
          pets: session?.metadata?.pets || null,
          yardSize: session?.metadata?.yardSize || null,
          litterBoxes: session?.metadata?.litterBoxes || null,
          // the actual answers
          ...form,
          createdAt: serverTimestamp(),
        }),
        15000,
        'Saving your details'
      );

      setSaving(false);
      alert('Thanks! Your details were submitted.');
      // Redirect them somewhere nice (billing or home)
      window.location.href = '/billing';
    } catch (e) {
      console.error('Intake submit error:', e);
      setSaving(false);
      if (String(e?.message || '').includes('timed out')) {
        setSaveErr('Save is taking too long. Please check your connection and try again.');
      } else {
        setSaveErr(e?.message || 'Could not submit your details. Please try again.');
      }
    }
  }

  if (!authReady) {
    return (
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '1.5rem' }}>
        <p>Loading…</p>
      </main>
    );
  }

  return (
    <main
      style={{
        maxWidth: 960,
        margin: '0 auto',
        padding: '1.5rem clamp(16px, 4vw, 32px)',
        fontSize: 'clamp(16px, 1.2vw, 18px)',
      }}
    >
      <h1 style={{ fontSize: 'clamp(22px, 2.2vw, 30px)', marginBottom: '1rem' }}>
        Service Intake Form
      </h1>

      {loadingSession ? (
        <div>Loading your session…</div>
      ) : sessionErr ? (
        <div style={{ color: '#b00020', marginBottom: '1rem' }}>{sessionErr}</div>
      ) : (
        <>
          {session && (
            <div
              style={{
                border: '1px solid #eee',
                borderRadius: 12,
                padding: '1rem',
                background: '#fff',
                marginBottom: '1rem',
              }}
            >
              <div><strong>Service:</strong> {session?.metadata?.service || '—'}</div>
              <div><strong>Frequency:</strong> {session?.metadata?.frequency || '—'}</div>
              {session?.metadata?.yardSize && (
                <div><strong>Yard size:</strong> {session?.metadata?.yardSize}</div>
              )}
              {session?.metadata?.pets && (
                <div><strong># of pets:</strong> {session?.metadata?.pets}</div>
              )}
              {session?.metadata?.litterBoxes && (
                <div><strong># of litter boxes:</strong> {session?.metadata?.litterBoxes}</div>
              )}
            </div>
          )}

          {!user && (
            <div
              style={{
                border: '1px solid #ffe08a',
                background: '#fff8e1',
                padding: '0.75rem 1rem',
                borderRadius: 10,
                marginBottom: '1rem',
              }}
            >
              Please log in to submit your form.
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.9rem' }}>
            {fields.map((f) => (
              <div key={f.key} style={{ display: 'grid', gap: 6 }}>
                <label style={{ fontWeight: 700 }}>
                  {f.label} {f.required ? <span aria-hidden="true">*</span> : null}
                </label>

                {f.type === 'textarea' ? (
                  <textarea
                    value={form[f.key] || ''}
                    onChange={(e) => updateField(f.key, e.target.value)}
                    required={!!f.required}
                    rows={4}
                    style={{
                      padding: '0.7rem 0.75rem',
                      borderRadius: 10,
                      border: '1px solid #ddd',
                      fontSize: '1em',
                    }}
                  />
                ) : f.type === 'select' ? (
                  <select
                    value={form[f.key] || (f.options?.[0] ?? '')}
                    onChange={(e) => updateField(f.key, e.target.value)}
                    required={!!f.required}
                    style={{
                      padding: '0.7rem 0.75rem',
                      borderRadius: 10,
                      border: '1px solid #ddd',
                      fontSize: '1em',
                    }}
                  >
                    {(f.options || []).map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={f.type}
                    value={form[f.key] || ''}
                    onChange={(e) => updateField(f.key, e.target.value)}
                    required={!!f.required}
                    style={{
                      padding: '0.7rem 0.75rem',
                      borderRadius: 10,
                      border: '1px solid #ddd',
                      fontSize: '1em',
                    }}
                  />
                )}
              </div>
            ))}

            {saveErr && (
              <div style={{ color: '#b00020', marginTop: '0.5rem' }}>{saveErr}</div>
            )}

            <button
              type="submit"
              disabled={!user || saving}
              style={{
                marginTop: '0.25rem',
                padding: 'clamp(12px, 1.6vw, 14px) clamp(18px, 2.8vw, 24px)',
                borderRadius: 12,
                border: '1px solid #333',
                background: '#333',
                color: '#fff',
                cursor: !user || saving ? 'not-allowed' : 'pointer',
                fontWeight: 800,
                fontSize: 'clamp(15px, 1.2vw, 18px)',
                opacity: !user || saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Submitting…' : 'Submit'}
            </button>
          </form>
        </>
      )}
    </main>
  );
}
