// Cloudflare Worker CORS Proxy
// 部署步驟：
// 1. 登入 https://dash.cloudflare.com/
// 2. 左側選單 Workers & Pages -> Create application -> Create Worker
// 3. 將此程式碼貼上，部署後會得到 https://your-worker.your-subdomain.workers.dev

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
      return new Response('Missing url parameter', { status: 400 });
    }

    try {
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const body = await response.text();

      return new Response(body, {
        status: response.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Content-Type': response.headers.get('Content-Type') || 'text/plain'
        }
      });
    } catch (e) {
      return new Response(`Error: ${e.message}`, { status: 500 });
    }
  }
};
