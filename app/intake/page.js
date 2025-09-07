'use client';
import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

export default function IntakePage() {
  const router = useRouter();
  const qp = useSearchParams();

  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState(null);

  const [form, setForm] = useState({
    // === Replace these with your real fields / default values ===
    address: '',
    gateCode: '',
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Read Stripe session info (optional)
  const sessionId = useMemo(() => qp.get('session_id') || '', [qp]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  function updateField(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!authReady) return;
    if (!user) {
      setError('Please log in to submit your intake form.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        // What they bought (comes from checkout metadata or URL if you passed it)
        service: qp.get('service') || '',
        frequency: qp.get('frequency') || '',
        yardSize: qp.get('yardSize') || '',
        pets: qp.get('pets') || '',
        litterBoxes: qp.get('litterBoxes') || '',
        sessionId,
        uid: user.uid,
        email: user.email || '',
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'intake'), payload);

      setSubmitting(false);
      router.replace('/thanks'); // or wherever your confirmation page is
    } catch (err) {
      console.error('Intake save failed:', err);
      // Typical App Check enforcement error will just look like a 400/transport error.
      // Show a helpful message:
      setError(
        'We couldn’t save your answers. If this keeps happening, refresh and try again. ' +
        'If you’re on a corporate/VPN network, try a normal connection.'
      );
      setSubmitting(false);
    }
  }

  if (!authReady) return null;

  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '24px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 16 }}>Service Intake</h1>

      {/* Optional: show the product summary */}
      <div style={{ marginBottom: 16, fontSize: 14, color: '#555' }}>
        <strong>Service:</strong> {qp.get('service') || '—'} &nbsp;•&nbsp;
        <strong>Frequency:</strong> {qp.get('frequency') || '—'} &nbsp;•&nbsp;
        <strong>Yard size:</strong> {qp.get('yardSize') || '—'} &nbsp;•&nbsp;
        <strong>Pets:</strong> {qp.get('pets') || '—'} &nbsp;•&nbsp;
        <strong>Litter boxes:</strong> {qp.get('litterBoxes') || '—'}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
        {/* === Replace with your real fields === */}
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Service Address</span>
          <input
            value={form.address}
            onChange={(e) => updateField('address', e.target.value)}
            placeholder="1234 Doggo Ln, Kansas City, MO"
            required
            style={inputStyle}
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>Gate Code (optional)</span>
          <input
            value={form.gateCode}
            onChange={(e) => updateField('gateCode', e.target.value)}
            placeholder="e.g., 1234#"
            style={inputStyle}
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>Notes for your tech (optional)</span>
          <textarea
            value={form.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            placeholder="Anything we should know about your yard or pets?"
            rows={4}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </label>

        {error && (
          <div style={{ color: '#b00020', fontWeight: 600, marginTop: 4 }}>{error}</div>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={buttonStyle}
        >
          {submitting ? 'Submitting…' : 'Submit'}
        </button>
      </form>
    </main>
  );
}

const inputStyle = {
  padding: '12px 14px',
  border: '1px solid #ccc',
  borderRadius: 10,
  fontSize: 16,
  outline: 'none',
};

const buttonStyle = {
  marginTop: 8,
  padding: '12px 16px',
  borderRadius: 10,
  fontSize: 16,
  fontWeight: 700,
  background: '#111',
  color: '#fff',
  border: '1px solid #111',
  cursor: 'pointer',
};
