// app/intake/page.js
import { Suspense } from "react";
import IntakeClient from "./IntakeClient";

// Prevent static prerender & silence "useSearchParams" build error
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Page() {
  return (
    <Suspense
      fallback={
        <main style={{ maxWidth: 800, margin: "0 auto", padding: "1.25rem" }}>
          Loading…
        </main>
      }
    >
      <IntakeClient />
    </Suspense>
  );
}
