/* ===== Shared behaviour: reveal, spotlight, nav, ripple, counters, progress ===== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const toast = (msg) => { let t = $('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.append(t); } t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2800); };
(function base() {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // reveal on scroll
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12, rootMargin: '0px 0px -6% 0px' });
  window.observeReveal = (root = document) => $$('[data-r]:not(.in)', root).forEach((el) => io.observe(el));
  observeReveal();
  // counters
  const co = new IntersectionObserver((es) => es.forEach((e) => { if (!e.isIntersecting) return; co.unobserve(e.target); const el = e.target, to = +el.dataset.count, suf = el.dataset.suf || ''; if (reduce) { el.textContent = to + suf; return; } const t0 = performance.now(); (function f(t) { const k = Math.min(1, (t - t0) / 1600), v = 1 - Math.pow(1 - k, 4); el.textContent = Math.round(to * v).toLocaleString() + suf; if (k < 1) requestAnimationFrame(f); })(t0); }), { threshold: .6 });
  $$('[data-count]').forEach((el) => co.observe(el));
  // spotlight + progress + nav state
  const spot = $('.spot'), bar = $('.bar'), nav = $('.nav');
  let mx = innerWidth / 2, my = innerHeight / 3, sx = mx, sy = my;
  addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
  (function loop() { sx += (mx - sx) * .12; sy += (my - sy) * .12; if (spot) spot.style.transform = `translate(${sx}px,${sy}px)`; requestAnimationFrame(loop); })();
  const onScroll = () => { const h = document.documentElement.scrollHeight - innerHeight; if (bar) bar.style.transform = `scaleX(${h > 0 ? scrollY / h : 0})`; if (nav) nav.classList.toggle('sm', scrollY > 30); };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  // nav links highlight + burger
  const links = $$('.links a[href^="#"]');
  const so = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) links.forEach((a) => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id)); }), { threshold: .5 });
  links.forEach((a) => { const s = $(a.getAttribute('href')); if (s) so.observe(s); a.addEventListener('click', () => $('.links')?.classList.remove('open')); });
  $('.burger')?.addEventListener('click', (e) => { const o = $('.links').classList.toggle('open'); e.currentTarget.setAttribute('aria-expanded', o); });
  // ripple
  document.addEventListener('pointerdown', (e) => { const b = e.target.closest('.btn'); if (!b) return; const r = b.getBoundingClientRect(), s = Math.max(r.width, r.height), d = document.createElement('span'); d.className = 'rp'; d.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`; b.append(d); setTimeout(() => d.remove(), 750); });
  // tilt
  if (!reduce && matchMedia('(hover:hover)').matches) document.addEventListener('pointermove', (e) => { const t = e.target.closest?.('[data-tilt]'); $$('[data-tilt].tilting').forEach((x) => { if (x !== t) { x.classList.remove('tilting'); x.style.transform = ''; } }); if (!t) return; const r = t.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5; t.classList.add('tilting'); t.style.transform = `perspective(900px) rotateX(${-py * 7}deg) rotateY(${px * 9}deg) translateY(-6px)`; });
  $$('[data-year]').forEach((y) => (y.textContent = new Date().getFullYear()));
})();
/* ===== Demo 5: form + API (live server if available, otherwise demo mode) ===== */
const STORE = 'postbox-demo-v1';
const rd = () => { try { return JSON.parse(localStorage.getItem(STORE)) || []; } catch { return []; } };
const wr = (v) => { try { localStorage.setItem(STORE, JSON.stringify(v)); } catch {} };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// the same rules the Node server applies (kept identical on purpose)
const validate = (d) => { const e = {}; if (!d.name || d.name.trim().length < 2) e.name = 'Name must be at least 2 characters.'; if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email || '')) e.email = 'Email address is not valid.'; if (!d.topic) e.topic = 'Please choose a topic.'; if (!d.message || d.message.trim().length < 15) e.message = 'Message must be at least 15 characters.'; return e; };
// demo-mode "server": returns a fake Response-like object after a short delay
const demoServer = (d) => new Promise((res) => setTimeout(() => { const e = validate(d); if (d.website) return res({ status: 400, body: { ok: false, error: 'Spam detected' } }); if (Object.keys(e).length) return res({ status: 422, body: { ok: false, errors: e } }); const rec = { id: 'msg_' + Math.random().toString(36).slice(2, 8), name: d.name.trim(), email: d.email.trim(), topic: d.topic, message: d.message.trim(), at: new Date().toISOString() }; const all = rd(); all.unshift(rec); wr(all); res({ status: 201, body: { ok: true, saved: rec } }); }, 900));
async function send(d) { if (location.protocol !== 'file:') try { const r = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d), signal: AbortSignal.timeout(2500) }); if (r.headers.get('content-type')?.includes('json')) { setPill(true); return { status: r.status, body: await r.json() }; } } catch {} setPill(false); return demoServer(d); }
function setPill(live) { $('#pill').classList.toggle('live', live); $('#pillt').textContent = live ? 'Live server' : 'Demo mode'; }

const log = $('#log'), ln = (h) => { const s = document.createElement('span'); s.innerHTML = h + '\n'; log.append(s); log.scrollTop = log.scrollHeight; };
const json = (o) => esc(JSON.stringify(o, null, 2)).replace(/&quot;([^&]+?)&quot;:/g, '<span class="k">"$1"</span>:').replace(/: &quot;(.*?)&quot;/g, ': <span class="s">"$1"</span>');

function renderList() {
  const all = rd(); $('#total').textContent = all.length;
  $('#list').innerHTML = all.length ? all.map((m, i) => `<article class="card msg" data-id="${m.id}" style="--h:${[...m.name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360}"><div class="av">${esc(m.name.trim().slice(0, 1).toUpperCase())}</div><div><h4>${esc(m.name)}<small>${esc(m.email)} · ${new Date(m.at).toLocaleString()}</small></h4><span class="tp">${esc(m.topic)}</span><p>${esc(m.message)}</p></div><button class="x" data-del="${m.id}" aria-label="Delete message">✕</button></article>`).join('') : '<div class="empty">📭<p>No messages yet. Send one using the form above.</p></div>';
}
const f = $('#form'), showErr = (n, m) => { const el = f.elements[n]; if (!el) return; const b = el.closest('.field'); b.classList.toggle('bad', !!m); b.querySelector('.err').textContent = m || ''; };
const data = () => Object.fromEntries(new FormData(f));
['name', 'email', 'topic', 'message'].forEach((n) => { f.elements[n].addEventListener('blur', () => showErr(n, validate(data())[n])); f.elements[n].addEventListener('input', () => f.elements[n].closest('.field').classList.contains('bad') && showErr(n, validate(data())[n])); });
f.elements.message.addEventListener('input', (e) => { const c = $('#count'); c.textContent = `${e.target.value.length} / 500`; c.classList.toggle('warn', e.target.value.length > 450); });
f.addEventListener('submit', async (e) => {
  e.preventDefault(); const d = data(), er = validate(d);
  ['name', 'email', 'topic', 'message'].forEach((n) => showErr(n, er[n]));
  if (Object.keys(er).length) { log.innerHTML = ''; ln('<span class="er">✗ Blocked in the browser</span>'); ln('<span class="d"># Client-side validation failed. No request was sent.</span>'); ln(json({ errors: er })); return toast('Please fix the highlighted fields.'); }
  const btn = $('#send'); btn.disabled = true; btn.classList.add('busy'); $('#sendt').textContent = 'Sending...';
  log.innerHTML = ''; ln('<span class="k">POST</span> /api/contact HTTP/1.1'); ln('<span class="d">Content-Type: application/json</span>'); ln(json({ ...d, website: d.website || '' }));
  const r = await send(d);
  ln(''); ln(`<span class="${r.status < 300 ? 'ok' : 'er'}">HTTP ${r.status} ${r.status === 201 ? 'Created' : r.status === 422 ? 'Unprocessable Entity' : 'Bad Request'}</span>`); ln(json(r.body));
  btn.disabled = false; btn.classList.remove('busy'); $('#sendt').textContent = 'Send message';
  if (r.status === 201) { f.reset(); $('#count').textContent = '0 / 500'; toast('Message saved successfully.'); renderList(); } else { Object.entries(r.body.errors || {}).forEach(([k, v]) => showErr(k, v)); toast('The server rejected the message.'); }
});
$('#list').addEventListener('click', (e) => { const b = e.target.closest('[data-del]'); if (!b) return; const card = b.closest('.msg'); card.classList.add('out'); setTimeout(() => { wr(rd().filter((m) => m.id !== b.dataset.del)); renderList(); }, 330); });
$('#wipe').addEventListener('click', () => { if (!rd().length) return toast('Inbox is already empty.'); wr([]); renderList(); toast('All messages deleted.'); });
renderList(); setPill(false);
