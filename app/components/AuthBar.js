'use client';
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
// ⬇️ If this file is at app/components/AuthBar.js, this path is correct.
//    If your file is elsewhere, change to the right relative path.
import { auth } from "../../lib/firebase";

export default function AuthBar() {
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));

    // 🔑 Listen for homepage button: window.dispatchEvent(new Event("open-signup"))
    const handleOpenSignup = () => {
      setShowSignup(true);
      setShowLogin(false);
      setError("");
    };
    window.addEventListener("open-signup", handleOpenSignup);

    return () => {
      unsub();
      window.removeEventListener("open-signup", handleOpenSignup);
    };
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, pw);
      setShowLogin(false);
      setEmail("");
      setPw("");
      // Billing link appears automatically when logged in
    } catch (err) {
      setError(err?.message || "Login failed.");
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    setError("");
    try {
      await createUserWithEmailAndPassword(auth, email, pw);
      setShowSignup(false);
      setEmail("");
      setPw("");
      // User is now logged in; Billing will appear automatically
    } catch (err) {
      setError(err?.message || "Signup failed.");
    }
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between", // brand left, nav/auth right
        gap: "0.75rem",
        position: "relative",
        width: "100%",
      }}
    >
      {/* Brand: always link home */}
      <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
        <h1 style={{ margin: 0, fontSize: "1.25rem" }}>Scoop Duty</h1>
      </Link>

      {/* Right side: nav + auth */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", position: "relative" }}>
        {/* Nav: only show Billing when logged in */}
        <nav style={{ display: "flex", gap: "0.75rem", fontSize: "0.95rem" }}>
          {user && (
            <Link href="/billing" style={{ textDecoration: "none" }}>
              Billing
            </Link>
          )}
        </nav>

        {user ? (
          <>
            <span style={{ fontSize: "0.9rem", opacity: 0.8 }}>
              {user.email || "Account"}
            </span>
            <button
              onClick={() => signOut(auth)}
              style={{
                padding: "0.4rem 0.8rem",
                borderRadius: 8,
                border: "1px solid #ddd",
                background: "#f9f9f9",
                cursor: "pointer",
              }}
            >
              Log out
            </button>
          </>
        ) : (
          <>
            {/* Login toggle */}
            <button
              onClick={() => {
                setShowLogin((v) => !v);
                setShowSignup(false);
                setError("");
              }}
              style={{
                padding: "0.4rem 0.8rem",
                borderRadius: 8,
                border: "1px solid #ddd",
                background: "#f9f9f9",
                cursor: "pointer",
              }}
            >
              {showLogin ? "Close" : "Login"}
            </button>

            {/* Sign Up toggle */}
            <button
              onClick={() => {
                setShowSignup((v) => !v);
                setShowLogin(false);
                setError("");
              }}
              style={{
                padding: "0.4rem 0.8rem",
                borderRadius: 8,
                border: "1px solid #ddd",
                background: "#f9f9f9",
                cursor: "pointer",
              }}
            >
              {showSignup ? "Close" : "Sign Up"}
            </button>

            {/* Inline Login form */}
            {showLogin && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "120%",
                  width: 300,
                  border: "1px solid #eee",
                  borderRadius: 12,
                  background: "#fff",
                  boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
                  padding: "1rem",
                  zIndex: 20,
                }}
              >
                <form onSubmit={handleLogin} style={{ display: "grid", gap: "0.5rem" }}>
                  <label style={{ display: "grid", gap: 4 }}>
                    <span style={{ fontSize: 12, opacity: 0.7 }}>Email</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      style={{ padding: "0.5rem 0.6rem", borderRadius: 8, border: "1px solid #ddd" }}
                    />
                  </label>
                  <label style={{ display: "grid", gap: 4 }}>
                    <span style={{ fontSize: 12, opacity: 0.7 }}>Password</span>
                    <input
                      type="password"
                      value={pw}
                      onChange={(e) => setPw(e.target.value)}
                      required
                      style={{ padding: "0.5rem 0.6rem", borderRadius: 8, border: "1px solid #ddd" }}
                    />
                  </label>
                  {error && <div style={{ color: "#b00020", fontSize: 12 }}>{error}</div>}
                  <button
                    type="submit"
                    style={{
                      marginTop: "0.25rem",
                      padding: "0.5rem 0.8rem",
                      borderRadius: 8,
                      border: "1px solid #333",
                      background: "#333",
                      color: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    Login
                  </button>
                </form>
              </div>
            )}

            {/* Inline Sign Up form */}
            {showSignup && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "120%",
                  width: 300,
                  border: "1px solid #eee",
                  borderRadius: 12,
                  background: "#fff",
                  boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
                  padding: "1rem",
                  zIndex: 20,
                }}
              >
                <form onSubmit={handleSignup} style={{ display: "grid", gap: "0.5rem" }}>
                  <label style={{ display: "grid", gap: 4 }}>
                    <span style={{ fontSize: 12, opacity: 0.7 }}>Email</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      style={{ padding: "0.5rem 0.6rem", borderRadius: 8, border: "1px solid #ddd" }}
                    />
                  </label>
                  <label style={{ display: "grid", gap: 4 }}>
                    <span style={{ fontSize: 12, opacity: 0.7 }}>Password</span>
                    <input
                      type="password"
                      value={pw}
                      onChange={(e) => setPw(e.target.value)}
                      required
                      style={{ padding: "0.5rem 0.6rem", borderRadius: 8, border: "1px solid #ddd" }}
                    />
                  </label>
                  {error && <div style={{ color: "#b00020", fontSize: 12 }}>{error}</div>}
                  <button
                    type="submit"
                    style={{
                      marginTop: "0.25rem",
                      padding: "0.5rem 0.8rem",
                      borderRadius: 8,
                      border: "1px solid #333",
                      background: "#333",
                      color: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    Sign Up
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
