/**
 * Cloudflare Pages middleware for SPA routing fallback.
 * If a request returns 404 and it's not an API or static file request,
 * serve index.html to enable Vue Router client-side routing.
 */
export async function onRequest(context) {
  const response = await context.next()

  // SPA fallback: serve index.html for non-API, non-file 404s
  if (response.status === 404) {
    const url = new URL(context.request.url)
    if (!url.pathname.startsWith('/api/') && !url.pathname.includes('.')) {
      return context.env.ASSETS.fetch(new URL('/index.html', context.request.url))
    }
  }

  return response
}
