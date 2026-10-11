// Headless regression for the series episodes sheet. Needs: node tizen-app/tools/devserver.js 8080
const p = require('puppeteer-core'), fs = require('fs'), path = require('path');
const SHOTS = path.join(__dirname, '..', 'design', 'shots'); fs.mkdirSync(SHOTS, { recursive: true });
const KEYS = { Up: 38, Down: 40, Left: 37, Right: 39, Enter: 13, Esc: 27, Back: 10009 };
const mock = () => {
  const SEA = [15, 18, 16, 22], items = [];
  SEA.forEach((n, si) => { for (let e = 1; e <= n; e++) items.push({
    info: { file_id: String((si + 1) * 100 + e), post_id: '77', season: String(si + 1), episode: String(e), title: { english: 'Episode title ' + (si + 1) + 'x' + e + (e % 4 == 0 ? ' with a much longer name that wraps' : '') } },
    options: { token: 't', intro_start: '00:00:05', intro_end: '00:00:30' },
    file: { m3u8: [{ label: 'Auto', default: 'http://x/auto.m3u8' }, { label: '720p', default: 'http://x/720.m3u8' }, { label: '1080p', default: 'http://x/' + ((si + 1) * 100 + e) + '.m3u8' }], subtitle: {} } }); });
  window.__opened = [];
  const dur = 2400000;
  window.webapis = { avplay: { open: u => window.__opened.push(u), close() {}, stop() {}, play() {}, pause() {}, seekTo() {}, getDuration: () => dur,
    setDisplayRect() {}, setDisplayMethod() {}, setListener() {}, prepareAsync: cb => setTimeout(cb, 50), getTotalTrackInfo: () => [], setSelectTrack() {} } };
  window.__mock = {
    test: () => ({ success: true, result: {} }),
    single: () => ({ success: true, result: { id: 77, title: { english: 'Long Show', local: 'سریال طولانی' }, plot: { english: 'A long running series used to test the episodes selector on a TV.' }, options: { is_series: true }, info: { year: 2015, seasons: 4 }, image: {}, genre: [{ name: 'Drama' }], score: {} } }),
    stream: () => ({ success: true, result: { hls: items.slice().reverse(), continue_watching: null } }),
    observer: () => ({ success: true }),
  };
  localStorage.setItem('n30.session', JSON.stringify({ token: 'x', user: { id: 1 } }));
  localStorage.setItem('n30.guest', 'true');
};
(async () => {
  const b = await p.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, defaultViewport: { width: 1920, height: 1080 }, args: ['--force-device-scale-factor=1'] });
  const pg = await b.newPage(); const errs = [];
  pg.on('pageerror', e => errs.push(String(e))); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await pg.evaluateOnNewDocument(mock);
  await pg.goto('http://localhost:8080/', { waitUntil: 'domcontentloaded' });
  const cdp = await pg.createCDPSession();
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const key = async (k, ms = 450) => { const c = KEYS[k]; await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: c, key: k }); await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: c, key: k }); await sleep(ms); };
  const shot = n => pg.screenshot({ path: path.join(SHOTS, 'eps-' + n + '.png') });
  const BACK = process.env.BACKKEY || 'Esc';
  let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
  const st = () => pg.evaluate(() => {
    const cur = N.nav.cur, tr = document.querySelector('.det .eptrack'), tb = document.querySelector('.det .tabs');
    const r = cur && cur.getBoundingClientRect();
    const sheet = document.querySelector('.det .sheet-eps');
    return { cur: cur ? (cur.className + '|' + (cur.textContent || '').slice(0, 12)) : null,
      inDom: !!(cur && document.body.contains(cur)), rect: r && [Math.round(r.left), Math.round(r.right), Math.round(r.top)],
      season: tb && (tb.querySelector('.pill.cur') || {}).textContent, trTf: tr && tr.style.transform, nTiles: tr ? tr.children.length : 0,
      eps: document.querySelector('.det').classList.contains('eps'), sheetVisible: sheet && getComputedStyle(sheet).visibility,
      playing: document.body.classList.contains('playing'), opened: window.__opened.slice(), scopes: N.nav.scopes.length };
  });
  const lastOpened = () => pg.evaluate(() => window.__opened[window.__opened.length - 1]);
  await sleep(2500);
  await pg.evaluate(() => N.go('details', { id: 77 }));
  await sleep(1500);
  await shot('00-details');
  await key('Right'); console.log('focus', (await st()).cur);
  await key('Enter', 900); let s = await st(); ok(s.eps, 'sheet opens'); await shot('01-sheet-open');
  await key('Up'); await key('Right'); await key('Right', 600); s = await st(); ok(/3/.test(s.season || ''), 'on season 3 tab: ' + s.season); await shot('02-s3-tab');
  await key('Down', 600);
  for (let i = 0; i < 12; i++) await key('Right', 250);
  await sleep(500); s = await st(); console.log('after 12 rights', s.cur, s.rect, s.trTf);
  ok(s.rect && s.rect[0] >= 0 && s.rect[1] <= 1920, 'ep13 tile fully visible'); await shot('03-s3-e13');
  await key('Enter', 1200); s = await st();
  ok(/\/313\.m3u8/.test(await lastOpened()), 'played S3E13 (' + (await lastOpened()) + ')');
  ok(s.playing, 'player open'); ok(s.sheetVisible !== 'visible', 'sheet hidden while playing (visibility=' + s.sheetVisible + ', scopes=' + s.scopes + ')');
  await shot('04-playing');
  await key(BACK, 900); s = await st();
  ok(!s.playing, 'player closed'); await shot('05-back-from-player');
  console.log('after back:', JSON.stringify(s));
  ok(s.eps && /3/.test(s.season || ''), 'sheet restored on season 3');
  ok(s.inDom && /ep/.test(s.cur || '') && /13/.test(s.cur), 'focus on E13 tile: ' + s.cur);
  ok(s.rect && s.rect[0] >= 0 && s.rect[1] <= 1920, 'E13 tile visible after restore ' + JSON.stringify(s.rect));
  await key('Up'); await key('Left', 500); await key('Left', 500); s = await st(); console.log('s1 tab', s.season, s.trTf);
  await shot('06-season1'); await key('Right', 400); await key('Right', 700); s = await st(); console.log('back at', s.season, s.trTf);
  await key('Down', 600); s = await st(); console.log('down ->', s.cur, s.rect, s.trTf);
  ok(s.inDom && s.rect && s.rect[0] >= 0 && s.rect[1] <= 1920, 'returning to S3 focuses a visible tile: ' + s.cur); await shot('07-s3-return');
  await key('Left', 300); await key('Left', 300); const f = (await st()).cur; await key('Enter', 1200);
  const o = await lastOpened(); console.log('focused', f, 'played', o);
  const want = /(\d+)/.exec(f.split('|')[1] || '');
  ok(want && new RegExp('/3' + String(want[1]).padStart(2, '0') + '\\.m3u8').test(o), 'Enter played the focused episode');
  await key('Esc', 800); s = await st(); ok(!s.playing && s.eps, 'back again restores sheet');

  // --- in-player episodes sheet, Back via the real TV key (10009)
  s = await st(); await key('Enter', 1200); ok((await st()).playing, 'playing again');
  await key('Down', 900); await shot('08-player-eps'); s = await st(); console.log('player sheet focus', s.cur, s.rect);
  await key('Right', 400); await key('Right', 600); await shot('09-player-eps-moved');
  const fp = (await st()).cur; await key('Enter', 1200); console.log('player sheet picked', fp, 'opened', await lastOpened());
  ok((await lastOpened()).endsWith("/3" + String(fp.split("|")[1].slice(1,3)) + ".m3u8"), "in-player sheet plays the focused tile");
  await key('Back', 900); s = await st(); ok(!s.playing && s.eps && s.inDom, 'Back (10009) returns to sheet'); console.log('restored on', s.cur, s.season);
  // --- rapid season hop then Down
  await key('Up', 300); await key('Right', 20); await key('Down', 700); s = await st(); console.log('hop ->', s.season, s.cur, s.rect);
  ok(/4/.test(s.season) && /E0?1/.test(s.cur) && s.rect[0] >= 0, 'rapid Right+Down lands on S4 first tile');
  await key('Enter', 1000); ok((await lastOpened()).endsWith("/401.m3u8"), 'played S4E01');
  // --- autoplay next across the season boundary
  await pg.evaluate(() => { N.player.index = N.player.items.findIndex(i => i.info.file_id === '316'); N.player.onEnded(); }); await sleep(800);
  ok((await lastOpened()).endsWith("/401.m3u8"), 'autoplay S3E16 -> S4E01');
  await pg.evaluate(() => N.player.playIndex(N.player.items.findIndex(i => i.info.file_id === '102'))); await sleep(500);
  await key('Esc', 900); s = await st(); console.log('after autoplay-ish back', s.season, s.cur);
  ok(/1/.test(s.season) && /E02/.test(s.cur) && s.eps, 'Back restores the episode last played (S1E02)'); await shot('10-restored-s1');
  console.log('errors', errs.slice(0, 5)); console.log(fails ? 'FAILED ' + fails : 'ALL PASS');
  await b.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
