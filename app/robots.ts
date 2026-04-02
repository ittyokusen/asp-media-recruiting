import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const allowIndexing = process.env.APP_ALLOW_INDEXING === 'true'
  const appBaseUrl = process.env.APP_BASE_URL

  if (!allowIndexing) {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
    }
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: appBaseUrl ? `${appBaseUrl.replace(/\/$/, '')}/sitemap.xml` : undefined,
  }
}
