'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

export default function IntakeClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // --- form fields (mirror your current UI) ---
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [address, setAddress]     = useState('');
  const [city, setCity]           = useState('');
  const [state, setState]         = useState('MO');
  const [zip, setZip]             = useState('');
  const [gateCode, setGateCode]   = useState('');
  const [notes, setNotes]         = useState('');
  const [pets, setPets]           = useState('1');
  const [yardSize, setYardSize]   = useState('small');
  const [poopCan, setPoopCan]     = useState('yes');
  const [wasteLocation, setWasteLocation] = useState('haul_away'); // matches your new options
  const [startDate, setStartDate] = useState('');

  // Preload selections from Stripe metadata / URL if present
  useEffect(() => {
    const q = (k) => searchParams.get(k) || '';
    // Optional: hydrate any fields from querystring if you pass them through Checkout/Success
  }, [searchParams]);

  // Watch auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!user?.uid) {
      setError('Please log in to submit your intake.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = {
        uid: user.uid,
        email: user.email || '',
        createdAt: serverTimestamp(),

        // form fields
        firstName,
        lastName,
        address,
        city,
        state,
        zip,
        gateCode,
        notes,
        pets,
        yardSize,
        poopCan,
        wasteLocation,
        startDate,

        // optional context from checkout
        service: searchParams.get('service') || '',
        frequency: searchParams.get('frequency') || '',
        litterBoxes: searchParams.get('litterBoxes') || '',
        session_id: searchParams.get('session_id') || '',
      };

      await addDoc(collection(db, 'intake_submissions'), payload);

      // Success: popup then redirect to billing
      // (Using native alert keeps it super simple and avoids adding a toast lib)
      alert('Thanks for signing up! We will email you shortly with more details.');
      router.push('/billing');
    } catch (e2) {
      console.error('Intake submit error:', e2);
      const msg = e2?.message?.includes('Missing or insufficient permissions')
        ? 'We could not save your details due to permissions. Please make sure you are logged in and try again.'
        : 'Could not submit your details. Please try again.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  // --- Simple form UI (use your existing styled markup; just wire the handlers/values) ---
  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12, maxWidth: 720 }}>
      {error && (
        <div style={{ background: '#ffe3e3', border: '1px solid #ffb3b3', borderRadius: 8, padding: '10px 12px', color: '#900' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
        <input required placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        <input required placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
      </div>

      <input required placeholder="Street address" value={address} onChange={(e) => setAddress(e.target.value)} />
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1.2fr .8fr .6fr .6fr' }}>
        <input required placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
        <input required placeholder="State" value={state} onChange={(e) => setState(e.target.value)} />
        <input required placeholder="ZIP" value={zip} onChange={(e) => setZip(e.target.value)} />
        <input placeholder="Gate code (optional)" value={gateCode} onChange={(e) => setGateCode(e.target.value)} />
      </div>

      <textarea placeholder="Notes for the tech (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <label>
          # of pets
          <select value={pets} onChange={(e) => setPets(e.target.value)}>
            <option value="1">1</option><option value="2">2</option><option value="3">3</option>
            <option value="4">4</option><option value="5+">5+</option>
          </select>
        </label>
        <label>
          Yard size
          <select value={yardSize} onChange={(e) => setYardSize(e.target.value)}>
            <option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option>
          </select>
        </label>
        <label>
          Poop can accessible?
          <select value={poopCan} onChange={(e) => setPoopCan(e.target.value)}>
            <option value="yes">Yes</option><option value="no">No</option>
          </select>
        </label>
      </div>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
        <label>
          Waste handling
          <select value={wasteLocation} onChange={(e) => setWasteLocation(e.target.value)}>
            <option value="haul_away">Haul it away</option>
            <option value="bag_in_can">Bag in my outdoor trash can</option>
          </select>
        </label>

        <label>
          Preferred start date
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
      </div>

      <button
        type="submit"
        disabled={saving}
        style={{
          padding: '12px 18px',
          borderRadius: 10,
          border: '1px solid #222',
          background: '#222',
          color: '#fff',
          fontWeight: 700,
          cursor: saving ? 'not-allowed' : 'pointer',
        }}
      >
        {saving ? 'Submitting…' : 'Submit'}
      </button>
    </form>
  );
}
