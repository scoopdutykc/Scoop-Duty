// app/sitemap.js
export default async function sitemap() {
  const baseUrl = "https://scoop-duty.com";

  // Add/adjust routes as your site grows
  return [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/billing`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];
}
