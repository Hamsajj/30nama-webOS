// Simulates Cloudflare 429 / HTML responses for the scheduler in js/api.js. Needs: node tizen-app/tools/devserver.js 8080
const p = require('puppeteer-core');
const pre = () => {
  window.__calls = []; window.__fail = { home_stream: 2 };
  const json = o => new Response(JSON.stringify(o), { status: 200 });
  window.fetch = (u, o) => {
    const m = /\/action\/([a-z_]+)/.exec(String(u)); if (!m) return Promise.reject(new Error('net'));
    const n = m[1]; window.__calls.push(n);
    if (n === 'test') return Promise.resolve(json({ success: true, result: {} }));
    if (window.__fail[n] > 0) { window.__fail[n]--; return Promise.resolve(new Response('error code: 1015', { status: 429, headers: { 'Retry-After': '1' } })); }
    if (window.__fail[n] === -1) return Promise.resolve(new Response('<html>502</html>', { status: 502 }));
    return new Promise(r => setTimeout(() => r(json({ success: true, result: { posts: [], n } })), 60));
  };
  localStorage.setItem('n30.guest', 'true');
};
(async () => {
  const b = await p.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, defaultViewport: { width: 1920, height: 1080 } });
  const pg = await b.newPage(); await pg.evaluateOnNewDocument(pre);
  await pg.goto('http://localhost:8080/', { waitUntil: 'domcontentloaded' }); await new Promise(r => setTimeout(r, 3000));
  let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
  // 1. retry with backoff succeeds
  await pg.evaluate(() => { window.__calls.length = 0; window.__fail = { single: 2 }; window.__t0 = Date.now(); });
  const r1 = await pg.evaluate(() => N.api.get('single', { post_id: 1 }).then(r => ({ ok: true, calls: window.__calls.filter(c => c === 'single').length, ms: Date.now() - window.__t0 }), e => ({ ok: false, m: e.message })));
  console.log(JSON.stringify(r1)); ok(r1.ok && r1.calls === 3 && r1.ms >= 1900, 'two 429s are retried (Retry-After honoured) then succeed');
  // 2. gives up after retries (persistent 502) with a retry-able error
  await pg.evaluate(() => { window.__fail = { single: -1 }; });
  const r2 = await pg.evaluate(() => N.api.get('single', { post_id: 1 }).then(() => 'ok', e => e.message));
  ok(/bad json/.test(r2), 'persistent 5xx finally rejects: ' + r2);
  // 3. priority: core call overtakes queued background calls, max 2 in flight
  await pg.evaluate(() => { window.__fail = {}; window.__calls.length = 0; window.__order = []; window.__maxf = 0; });
  const r3 = await pg.evaluate(async () => {
    const bgs = []; for (let i = 0; i < 10; i++) bgs.push(N.api.get('search', { query: 'q' + i }, { bg: true }).then(() => window.__order.push('bg')));
    const core = N.api.get('home_stream').then(() => window.__order.push('CORE'));
    await Promise.all(bgs.concat([core])); return window.__order.indexOf('CORE');
  });
  ok(r3 <= 2, 'core call finishes before most background calls (position ' + r3 + ' of 11)');
  // 4. Home falls back to cached data
  await pg.evaluate(() => { localStorage.setItem('n30.homeCache', JSON.stringify({ posts: [], cached: true })); window.__fail = { home_stream: -1 }; N.dropHome(); });
  const r4 = await pg.evaluate(() => N.getHome().then(r => r && r.cached, e => 'ERR ' + e.message));
  ok(r4 === true, 'failing home_stream returns last good cached Home');
  await pg.evaluate(() => { localStorage.removeItem('n30.homeCache'); N.dropHome(); });
  const r5 = await pg.evaluate(() => N.getHome().then(() => 'ok', e => 'err'));
  ok(r5 === 'err', 'no cache: error propagates to the retry view');
  await b.close(); console.log(fails ? 'FAILED ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
