// app/intake/page.js
import { Suspense } from "react";
import IntakeClient from "./IntakeClient";

// Prevent any static rendering just in case:
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function IntakePage() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem" }}>
      <h1 style={{ marginBottom: 12 }}>Service Intake</h1>
      <Suspense
        fallback={
          <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 10 }}>
            Loading…
          </div>
        }
      >
        <IntakeClient />
      </Suspense>
    </main>
  );
}
