// app/robots.js
export default function robots() {
  const base = "https://scoop-duty.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Keep private/utility routes out of search
        disallow: ["/checkout", "/intake", "/api/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
