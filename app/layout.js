import dynamic from "next/dynamic";

// Import the client AuthBar (inline login + Billing link)
const AuthBar = dynamic(() => import("./components/AuthBar"), { ssr: false });

export const metadata = {
  metadataBase: new URL("https://scoop-duty.com"),
  title: {
    default: "Scoop Duty KC — Pet Waste Removal in the KC Metro",
    template: "%s | Scoop Duty KC",
  },
  description:
    "Pet waste removal in the Kansas City Metro (MO side). Weekly or one-time scooping, doggy playtime, and kitty litter trade. Reliable, affordable, locally owned.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "https://scoop-duty.com",
    title: "Scoop Duty KC — Pet Waste Removal in the KC Metro",
    description:
      "Weekly or one-time scooping, doggy playtime, and kitty litter trade. Book online in minutes.",
    siteName: "Scoop Duty KC",
    images: [
      {
        url: "/images/og-hero.jpg", // optional: add 1200x630 at /public/images/og-hero.jpg
        width: 1200,
        height: 630,
        alt: "Clean yard ready for pets in Kansas City, MO",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Scoop Duty KC — Pet Waste Removal in the KC Metro",
    description:
      "Weekly or one-time scooping, doggy playtime, and kitty litter trade. Book online in minutes.",
    images: ["/images/og-hero.jpg"],
  },
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "Arial, sans-serif" }}>
        <header
          style={{
            borderBottom: "1px solid #eee",
            background: "#fff",
          }}
        >
          <div
            style={{
              maxWidth: 1100,
              margin: "0 auto",
              padding: "0.75rem 1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
            }}
          >
            {/* Site title on the left (intentionally blank—brand appears in hero) */}
            <h1 style={{ margin: 0, fontSize: "1.25rem" }}></h1>

            {/* AuthBar handles Billing + Login/Logout */}
            <AuthBar />
          </div>
        </header>

        <main style={{ padding: "1.25rem" }}>{children}</main>
      </body>
    </html>
  );
}
