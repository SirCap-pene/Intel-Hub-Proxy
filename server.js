const express = require('express');
const fetch = require('node-fetch');
const app = express();

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Expose-Headers': '*',
  'Access-Control-Max-Age': '86400'
};

app.use(express.raw({ type: '*/*', limit: '5mb' }));

app.options('*', (req, res) => res.set(CORS).status(204).end());

app.all('*', async (req, res) => {
  const target = req.url.slice(2); // rimuove '/?'
  if (!target) return res.set(CORS).status(400).send('Missing target URL');

  let targetUrl;
  try { targetUrl = new URL(decodeURIComponent(target)); }
  catch { return res.set(CORS).status(400).send('Invalid URL'); }

  const headers = { ...req.headers };
  ['host','connection','content-length','origin','referer','x-forwarded-for','x-forwarded-proto','x-forwarded-host','x-render-origin-server']
    .forEach(h => delete headers[h]);
  if (!headers['user-agent']) headers['user-agent'] = 'IIHub-Proxy/1.0';

  try {
    const upstream = await fetch(targetUrl.toString(), {
      method: req.method,
      headers,
      body: ['GET','HEAD'].includes(req.method) ? undefined : req.body,
      redirect: 'follow',
      timeout: 25000
    });
    res.status(upstream.status);
    Object.entries(CORS).forEach(([k, v]) => res.set(k, v));
    upstream.headers.forEach((v, k) => {
      if (!['transfer-encoding','content-encoding'].includes(k.toLowerCase())) res.set(k, v);
    });
    upstream.body.pipe(res);
  } catch (e) {
    res.set(CORS).status(502).send('Upstream fetch failed: ' + e.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('IIHub proxy on ' + PORT));
