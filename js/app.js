'use strict';

const ICONS = {'breath': `<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><circle cx='12' cy='12' r='8'/><circle cx='12' cy='12' r='4'/></svg>`, 'hand': `<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path d='M8 13V5.5a1.5 1.5 0 0 1 3 0V12'/><path d='M11 11V4.5a1.5 1.5 0 0 1 3 0V11'/><path d='M14 11V6a1.5 1.5 0 0 1 3 0v7c0 4-2.5 7-6 7s-5-1.5-6.5-4L3 12.5a1.5 1.5 0 0 1 2.5-1.5L8 14'/></svg>`, 'cloud': `<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path d='M7 18h10a4 4 0 0 0 0-8 6 6 0 0 0-11.6 1.5A3.3 3.3 0 0 0 7 18z'/></svg>`, 'heart': `<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path d='M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z'/></svg>`};

/* ==========================================================
   Respiro — piccola app per gestire l'ansia.
   Tutti i dati restano sul telefono (localStorage).
   ========================================================== */

// ---------- Archivio dati ----------
const STORE_KEY = 'respiro.v1';
const DEFAULT_DATA = {
  checkins: [],   // { id, ts, level, emotions[], body[], trigger, note }
  thoughts: [],   // { id, ts, situation, thought, before, distortions[], pro, contra, alternative, after }
  settings: {
    name: '',
    contacts: [],   // { name, phone }
    phrases: [
      'Questa sensazione è sgradevole, ma non è pericolosa.',
      'È già passata altre volte, passerà anche ora.',
      'Non devo risolvere tutto adesso. Solo il prossimo respiro.'
    ]
  }
};

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return structuredClone(DEFAULT_DATA);
    const d = JSON.parse(raw);
    return {
      checkins: Array.isArray(d.checkins) ? d.checkins : [],
      thoughts: Array.isArray(d.thoughts) ? d.thoughts : [],
      settings: { ...DEFAULT_DATA.settings, ...(d.settings || {}) }
    };
  } catch {
    return structuredClone(DEFAULT_DATA);
  }
}

let data = load();

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  } catch {
    toast('Impossibile salvare: memoria piena?');
  }
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// ---------- Utilità ----------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
}
function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}
function dayKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function levelColor(n) {
  // 0 = verde calmo, 10 = terracotta
  const hue = 160 - n * 14;
  return `hsl(${hue} 35% 48%)`;
}

let toastTimer;
function toast(msg) {
  let el = $('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

function chips(name, options, selected = []) {
  return `<div class="chips" data-chips="${name}">${options.map((o) =>
    `<button type="button" class="chip${selected.includes(o) ? ' on' : ''}" data-value="${esc(o)}">${esc(o)}</button>`
  ).join('')}</div>`;
}
function readChips(root, name) {
  return $$(`[data-chips="${name}"] .chip.on`, root).map((b) => b.dataset.value);
}

function scale(id, value, left, right) {
  return `
    <div class="scale-value" id="${id}-val" style="color:${levelColor(value)}">${value}</div>
    <input type="range" id="${id}" min="0" max="10" step="1" value="${value}">
    <div class="scale-labels"><span>${left}</span><span>${right}</span></div>`;
}
function bindScale(id) {
  const input = document.getElementById(id);
  const out = document.getElementById(id + '-val');
  input.addEventListener('input', () => {
    out.textContent = input.value;
    out.style.color = levelColor(+input.value);
  });
}

// ---------- Contenuti ----------
const EMOTIONS = ['Ansiosa', 'Preoccupata', 'Agitata', 'Triste', 'Arrabbiata', 'Stanca', 'Sopraffatta', 'Sola', 'Calma', 'Serena', 'Grata'];
const BODY = ['Cuore veloce', 'Fiato corto', 'Nodo allo stomaco', 'Tensione muscolare', 'Mal di testa', 'Tremore', 'Sudore', 'Vertigini', 'Insonnia', 'Niente di particolare'];
const DISTORTIONS = {
  'Catastrofizzare': 'Immaginare lo scenario peggiore come certo.',
  'Leggere nel pensiero': 'Dare per scontato cosa pensano gli altri.',
  'Prevedere il futuro': 'Essere sicura che andrà male.',
  'Tutto o niente': 'Vedere solo bianco o nero, senza vie di mezzo.',
  'Generalizzare': '"Succede sempre", "non va mai bene".',
  'Doverizzazioni': '"Dovrei", "devo assolutamente".',
  'Personalizzare': 'Sentirsi responsabile di tutto ciò che va storto.',
  'Filtro negativo': 'Notare solo ciò che è andato male.',
  'Ragionamento emotivo': '"Lo sento, quindi è vero".'
};

const BREATH_PATTERNS = {
  quadrato: {
    name: 'Respiro quadrato',
    desc: '4 secondi per fase. Stabilizza e aiuta a concentrarsi.',
    phases: [['Inspira', 4, 1], ['Trattieni', 4, 1], ['Espira', 4, 0], ['Trattieni', 4, 0]]
  },
  '478': {
    name: '4 · 7 · 8',
    desc: 'Espirazione lunga: rilassa, utile anche per addormentarsi.',
    phases: [['Inspira', 4, 1], ['Trattieni', 7, 1], ['Espira', 8, 0]]
  },
  coerente: {
    name: 'Respiro coerente',
    desc: '5 secondi dentro, 5 fuori. Ritmo calmo e regolare.',
    phases: [['Inspira', 5, 1], ['Espira', 5, 0]]
  },
  sospiro: {
    name: 'Sospiro fisiologico',
    desc: 'Due inspirazioni dal naso, una lunga espirazione dalla bocca. Calma rapida.',
    phases: [['Inspira', 2, 0.8], ['Ancora un po\'', 1, 1], ['Espira lentamente', 6, 0]]
  }
};

const GROUNDING = [
  { n: 5, sense: 'cose che puoi VEDERE', hint: 'Guardati intorno con calma. Un colore, un oggetto, una luce.' },
  { n: 4, sense: 'cose che puoi TOCCARE', hint: 'I vestiti sulla pelle, il tavolo, i piedi sul pavimento.' },
  { n: 3, sense: 'suoni che puoi SENTIRE', hint: 'Vicini o lontani. Anche il tuo respiro conta.' },
  { n: 2, sense: 'odori che puoi PERCEPIRE', hint: 'Se non ne senti, pensa a due odori che ti piacciono.' },
  { n: 1, sense: 'cosa di cui puoi sentire il SAPORE', hint: 'Oppure una cosa gentile che puoi dire a te stessa.' }
];

const EMERGENCY = [
  { name: 'Emergenze', phone: '112', note: 'Numero unico europeo' },
  { name: 'Telefono Amico Italia', phone: '0223272327', label: '02 2327 2327', note: 'Ascolto telefonico anonimo' },
  { name: 'Samaritans Onlus', phone: '0677208977', label: '06 77208977', note: 'Ascolto telefonico anonimo' }
];

// ---------- Router ----------
const ROUTES = {
  home: { title: () => 'Respiro', render: renderHome, tab: 'home' },
  respira: { title: () => 'Respira', render: renderBreathMenu, tab: 'respira' },
  'respira/': { title: (p) => BREATH_PATTERNS[p]?.name || 'Respira', render: renderBreath, tab: 'respira', back: '#respira' },
  grounding: { title: () => '5 · 4 · 3 · 2 · 1', render: renderGrounding, tab: 'home', back: '#home' },
  diario: { title: () => 'Diario', render: renderDiary, tab: 'diario' },
  'diario/nuovo': { title: () => 'Come stai?', render: renderCheckin, tab: 'diario', back: '#diario' },
  pensieri: { title: () => 'Pensieri', render: renderThoughts, tab: 'pensieri' },
  'pensieri/nuovo': { title: () => 'Esamina un pensiero', render: renderThoughtForm, tab: 'pensieri', back: '#pensieri' },
  sos: { title: () => 'Sono qui con te', render: renderSOS, tab: null, back: '#home' },
  impostazioni: { title: () => 'Altro', render: renderSettings, tab: 'impostazioni' }
};

let cleanup = null;

function route() {
  if (cleanup) { cleanup(); cleanup = null; }
  const hash = location.hash.slice(1) || 'home';
  let key = hash, param = null;
  if (!ROUTES[key]) {
    const i = hash.indexOf('/');
    if (i > 0 && ROUTES[hash.slice(0, i + 1)]) {
      key = hash.slice(0, i + 1);
      param = hash.slice(i + 1);
    } else {
      key = 'home';
    }
  }
  const r = ROUTES[key];
  $('#title').textContent = r.title(param);
  const back = $('#back');
  back.hidden = !r.back;
  back.onclick = () => { location.hash = r.back; };
  $$('.tabbar a').forEach((a) => a.classList.toggle('active', a.dataset.tab === r.tab));
  // Contenitore nuovo a ogni pagina, così i listener non si accumulano
  const old = $('#view');
  const view = old.cloneNode(false);
  old.replaceWith(view);
  window.scrollTo(0, 0);
  cleanup = r.render(view, param) || null;
}

window.addEventListener('hashchange', route);

// Interazione generica con i chip
document.addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (chip && chip.closest('[data-chips]')) chip.classList.toggle('on');
});

// ---------- Home ----------
function greeting() {
  const h = new Date().getHours();
  const n = data.settings.name ? `, ${esc(data.settings.name)}` : '';
  if (h < 6) return `Notte tranquilla${n}`;
  if (h < 13) return `Buongiorno${n}`;
  if (h < 18) return `Buon pomeriggio${n}`;
  return `Buonasera${n}`;
}

function renderHome(view) {
  const today = data.checkins.filter((c) => dayKey(c.ts) === dayKey(Date.now()));
  const phrase = data.settings.phrases.length
    ? data.settings.phrases[Math.floor(Math.random() * data.settings.phrases.length)]
    : '';
  view.innerHTML = `
    <p class="greeting">${greeting()}</p>
    <p class="muted" style="margin-top:4px">Prenditi un momento per te.</p>

    <a class="btn block" href="#diario/nuovo" style="margin-top:12px">Come ti senti adesso?</a>
    ${today.length ? `<p class="small muted center">Oggi hai fatto ${today.length} check-in. Ultimo livello d'ansia: <b>${today[0].level}/10</b></p>` : ''}

    <div class="grid">
      <a class="tile accent" href="#respira"><span class="ico">${ICONS.breath}</span><b>Respira</b><small>Esercizi guidati per rallentare</small></a>
      <a class="tile accent" href="#grounding"><span class="ico">${ICONS.hand}</span><b>Torna al presente</b><small>Tecnica 5-4-3-2-1</small></a>
      <a class="tile" href="#pensieri/nuovo"><span class="ico">${ICONS.cloud}</span><b>Un pensiero mi tormenta</b><small>Guardalo da un'altra prospettiva</small></a>
      <a class="tile warm" href="#sos"><span class="ico">${ICONS.heart}</span><b>Sto male ora</b><small>Aiuto immediato</small></a>
    </div>

    ${phrase ? `<div class="card"><p class="small muted" style="margin:0 0 4px">Ricorda</p><p style="margin:0;font-size:19px">${esc(phrase)}</p></div>` : ''}
  `;
}

// ---------- Respirazione ----------
function renderBreathMenu(view) {
  view.innerHTML = `
    <p class="muted">Scegli un esercizio. Respira dal naso, se puoi, e lascia le spalle morbide.</p>
    ${Object.entries(BREATH_PATTERNS).map(([k, p]) => `
      <a class="card tile" href="#respira/${k}" style="min-height:auto">
        <b>${p.name}</b><small>${p.desc}</small>
      </a>`).join('')}
  `;
}

function renderBreath(view, key) {
  const p = BREATH_PATTERNS[key];
  if (!p) { location.hash = '#respira'; return; }

  view.innerHTML = `
    <p class="muted center small">${p.desc}</p>
    <div class="breath-stage">
      <div class="breath-circle" id="circle"></div>
      <div class="breath-label"><div class="phase" id="phase">Pronta?</div><div class="count" id="count"></div></div>
    </div>
    <p class="center muted small" id="cycles">&nbsp;</p>
    <div class="row">
      <button class="btn" id="toggle">Inizia</button>
    </div>
    <p class="center muted small">Bastano 2–3 minuti. Se ti gira la testa, fermati e respira normalmente.</p>
  `;

  const circle = $('#circle', view), phaseEl = $('#phase', view), countEl = $('#count', view);
  const cyclesEl = $('#cycles', view), btn = $('#toggle', view);
  let running = false, timer = null, cycles = 0, startedAt = 0;

  function runPhase(i, completed = false) {
    if (!running) return;
    if (completed) {
      cycles++;
      const sec = Math.round((Date.now() - startedAt) / 1000);
      cyclesEl.textContent = `${cycles} ${cycles === 1 ? 'ciclo' : 'cicli'} · ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
    }
    const [label, secs, size] = p.phases[i];
    phaseEl.textContent = label;
    circle.style.transitionDuration = `${secs}s`;
    circle.style.transform = `scale(${0.45 + size * 0.55})`;
    let left = secs;
    countEl.textContent = left;
    timer = setInterval(() => {
      left--;
      if (left > 0) { countEl.textContent = left; return; }
      clearInterval(timer);
      const next = (i + 1) % p.phases.length;
      runPhase(next, next === 0);
    }, 1000);
  }

  function stop() {
    running = false;
    clearInterval(timer);
    circle.style.transitionDuration = '1.5s';
    circle.style.transform = 'scale(.45)';
    phaseEl.textContent = cycles ? 'Ben fatto' : 'Pronta?';
    countEl.textContent = '';
    btn.textContent = 'Inizia';
  }

  btn.addEventListener('click', () => {
    if (running) return stop();
    running = true; cycles = 0; startedAt = Date.now();
    cyclesEl.innerHTML = '&nbsp;';
    btn.textContent = 'Ferma';
    runPhase(0);
  });

  return stop;
}

// ---------- Grounding 5-4-3-2-1 ----------
function renderGrounding(view) {
  let step = 0;
  function draw() {
    if (step >= GROUNDING.length) {
      view.innerHTML = `
        <div class="card center">
          <p style="font-size:44px;margin:0">🌿</p>
          <h2>Sei qui, adesso.</h2>
          <p class="muted">Nota come ti senti ora rispetto a qualche minuto fa. Anche un piccolo cambiamento conta.</p>
        </div>
        <div class="stack">
          <a class="btn block" href="#diario/nuovo">Annota come ti senti</a>
          <a class="btn block soft" href="#respira">Fai qualche respiro</a>
          <button class="btn block ghost" id="again">Ricomincia</button>
        </div>`;
      $('#again', view).onclick = () => { step = 0; draw(); };
      return;
    }
    const g = GROUNDING[step];
    view.innerHTML = `
      <div class="progress">${GROUNDING.map((_, i) => `<i class="${i <= step ? 'on' : ''}"></i>`).join('')}</div>
      <div class="card center">
        <div class="ground-num">${g.n}</div>
        <h2>Nota ${g.n} ${g.sense}</h2>
        <p class="muted">${g.hint}</p>
        <p class="small muted">Nominale una alla volta, anche solo nella tua mente. Vai piano.</p>
      </div>
      <div class="row">
        ${step > 0 ? '<button class="btn ghost" id="prev">Indietro</button>' : ''}
        <button class="btn" id="next">${step === GROUNDING.length - 1 ? 'Fine' : 'Fatto, avanti'}</button>
      </div>`;
    $('#next', view).onclick = () => { step++; draw(); };
    const prev = $('#prev', view);
    if (prev) prev.onclick = () => { step--; draw(); };
  }
  draw();
}

// ---------- Diario / check-in ----------
function renderCheckin(view) {
  view.innerHTML = `
    <form id="f">
      <div class="card">
        <h3>Quanta ansia senti?</h3>
        ${scale('level', 5, 'Per niente', 'Moltissima')}
      </div>
      <div class="card">
        <h3>Cosa provi?</h3>
        ${chips('emotions', EMOTIONS)}
      </div>
      <div class="card">
        <h3>Cosa senti nel corpo?</h3>
        ${chips('body', BODY)}
      </div>
      <div class="card">
        <label for="trigger" style="margin-top:0">È successo qualcosa? (facoltativo)</label>
        <input type="text" id="trigger" placeholder="Es. riunione, telefonata, nulla di preciso…">
        <label for="note">Altro che vuoi annotare</label>
        <textarea id="note" placeholder="Scrivi liberamente…"></textarea>
      </div>
      <button class="btn block" type="submit">Salva</button>
    </form>`;
  bindScale('level');
  $('#f', view).addEventListener('submit', (e) => {
    e.preventDefault();
    const entry = {
      id: uid(), ts: Date.now(),
      level: +$('#level', view).value,
      emotions: readChips(view, 'emotions'),
      body: readChips(view, 'body'),
      trigger: $('#trigger', view).value.trim(),
      note: $('#note', view).value.trim()
    };
    data.checkins.unshift(entry);
    save();
    toast('Salvato. Grazie per esserti ascoltata.');
    location.hash = entry.level >= 7 ? '#sos' : '#diario';
  });
}

function chart14(view) {
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - i);
    const items = data.checkins.filter((c) => dayKey(c.ts) === dayKey(d));
    const avg = items.length ? items.reduce((s, c) => s + c.level, 0) / items.length : null;
    days.push({ d, avg });
  }
  const W = 320, H = 130, pad = 18, bw = (W - pad) / 14;
  const bars = days.map((x, i) => {
    const xPos = pad + i * bw + 3;
    const label = `<text x="${xPos + (bw - 6) / 2}" y="${H - 2}" font-size="9" text-anchor="middle" fill="currentColor" opacity=".55">${x.d.getDate()}</text>`;
    if (x.avg === null) return `<rect x="${xPos}" y="${H - 18}" width="${bw - 6}" height="2" rx="1" fill="currentColor" opacity=".15"/>${label}`;
    const h = Math.max(3, (x.avg / 10) * (H - 30));
    return `<rect x="${xPos}" y="${H - 16 - h}" width="${bw - 6}" height="${h}" rx="3" fill="${levelColor(x.avg)}"><title>${x.d.toLocaleDateString('it-IT')}: ${x.avg.toFixed(1)}</title></rect>${label}`;
  }).join('');
  const grid = [0, 5, 10].map((v) => {
    const y = H - 16 - (v / 10) * (H - 30);
    return `<line x1="${pad}" x2="${W}" y1="${y}" y2="${y}" stroke="currentColor" opacity=".1"/><text x="0" y="${y + 3}" font-size="9" fill="currentColor" opacity=".55">${v}</text>`;
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Media dell'ansia negli ultimi 14 giorni">${grid}${bars}</svg>`;
}

function renderDiary(view) {
  const list = data.checkins;
  view.innerHTML = `
    <a class="btn block" href="#diario/nuovo">+ Nuovo check-in</a>
    <div class="card">
      <h3>Ultimi 14 giorni</h3>
      <p class="small muted" style="margin-top:0">Livello medio d'ansia per giorno</p>
      ${chart14(view)}
    </div>
    <div class="card">
      <h3>Le tue note</h3>
      ${list.length ? `<ul class="list">${list.slice(0, 100).map((c) => `
        <li>
          <details>
            <summary class="entry-head">
              <span>${fmtDate(c.ts)} · ${fmtTime(c.ts)}<br><span class="tags">${esc([...c.emotions].slice(0, 3).join(', ')) || '—'}</span></span>
              <span class="badge" style="background:${levelColor(c.level)}">${c.level}</span>
            </summary>
            <dl class="kv">
              ${c.emotions.length ? `<dt>Emozioni</dt><dd>${esc(c.emotions.join(', '))}</dd>` : ''}
              ${c.body.length ? `<dt>Corpo</dt><dd>${esc(c.body.join(', '))}</dd>` : ''}
              ${c.trigger ? `<dt>Cosa è successo</dt><dd>${esc(c.trigger)}</dd>` : ''}
              ${c.note ? `<dt>Note</dt><dd>${esc(c.note)}</dd>` : ''}
            </dl>
            <button class="btn danger small" data-del="${c.id}" style="margin-top:10px;min-height:36px;padding:6px 12px">Elimina</button>
          </details>
        </li>`).join('')}</ul>` : '<p class="muted">Ancora nessuna nota. Il primo check-in richiede meno di un minuto.</p>'}
    </div>`;
  view.addEventListener('click', (e) => {
    const id = e.target.dataset?.del;
    if (!id || !confirm('Eliminare questa nota?')) return;
    data.checkins = data.checkins.filter((c) => c.id !== id);
    save(); route();
  });
}

// ---------- Pensieri (diario cognitivo) ----------
function renderThoughtForm(view) {
  view.innerHTML = `
    <p class="muted">Un pensiero ansioso non è un fatto. Proviamo a guardarlo con un po' di distanza, passo dopo passo.</p>
    <form id="f">
      <div class="card">
        <label for="situation" style="margin-top:0">1. Cosa sta succedendo?</label>
        <textarea id="situation" placeholder="Descrivi la situazione in modo semplice, come la vedrebbe una telecamera."></textarea>
        <label for="thought">2. Che pensiero ti passa per la testa?</label>
        <textarea id="thought" placeholder="Es. «Andrà sicuramente male», «Penseranno che sono incapace»…"></textarea>
      </div>
      <div class="card">
        <h3>3. Quanto ti fa stare in ansia, adesso?</h3>
        ${scale('before', 7, 'Poco', 'Tantissimo')}
      </div>
      <div class="card">
        <h3>4. Riconosci qualcuna di queste trappole?</h3>
        <p class="small muted" style="margin-top:0">Tocca quelle che ti sembrano adatte. Capita a tutti.</p>
        ${chips('distortions', Object.keys(DISTORTIONS))}
        <ul class="small muted" style="padding-left:18px;margin-bottom:0">
          ${Object.entries(DISTORTIONS).map(([k, v]) => `<li><b>${k}</b>: ${v}</li>`).join('')}
        </ul>
      </div>
      <div class="card">
        <label for="pro" style="margin-top:0">5. Cosa sostiene questo pensiero?</label>
        <textarea id="pro" placeholder="Fatti concreti, non sensazioni."></textarea>
        <label for="contra">6. Cosa non lo sostiene?</label>
        <textarea id="contra" placeholder="Volte in cui è andata diversamente, cose che il pensiero ignora…"></textarea>
        <label for="alternative">7. Un modo più equilibrato di vederla</label>
        <textarea id="alternative" placeholder="Cosa diresti a un'amica nella stessa situazione?"></textarea>
      </div>
      <div class="card">
        <h3>8. E ora, quanta ansia senti?</h3>
        ${scale('after', 5, 'Poco', 'Tantissimo')}
      </div>
      <button class="btn block" type="submit">Salva</button>
    </form>`;
  bindScale('before');
  bindScale('after');
  $('#f', view).addEventListener('submit', (e) => {
    e.preventDefault();
    const v = (id) => $('#' + id, view).value.trim();
    if (!v('thought')) { toast('Scrivi almeno il pensiero (punto 2).'); $('#thought', view).focus(); return; }
    const rec = {
      id: uid(), ts: Date.now(),
      situation: v('situation'), thought: v('thought'),
      before: +$('#before', view).value, after: +$('#after', view).value,
      distortions: readChips(view, 'distortions'),
      pro: v('pro'), contra: v('contra'), alternative: v('alternative')
    };
    data.thoughts.unshift(rec);
    save();
    const diff = rec.before - rec.after;
    toast(diff > 0 ? `L'ansia è scesa di ${diff} punti. Ottimo lavoro.` : 'Salvato. Anche solo scriverlo è un passo.');
    location.hash = '#pensieri';
  });
}

function renderThoughts(view) {
  const list = data.thoughts;
  view.innerHTML = `
    <a class="btn block" href="#pensieri/nuovo">+ Esamina un pensiero</a>
    <p class="small muted">Scrivere un pensiero ansioso e metterlo alla prova aiuta a ridurne la forza. È una tecnica della terapia cognitivo-comportamentale.</p>
    <div class="card">
      ${list.length ? `<ul class="list">${list.map((t) => `
        <li>
          <details>
            <summary class="entry-head">
              <span>«${esc(t.thought.length > 70 ? t.thought.slice(0, 70) + '…' : t.thought)}»<br><span class="tags">${fmtDate(t.ts)}</span></span>
              <span class="small" style="white-space:nowrap"><span class="badge" style="background:${levelColor(t.before)}">${t.before}</span> → <span class="badge" style="background:${levelColor(t.after)}">${t.after}</span></span>
            </summary>
            <dl class="kv">
              ${t.situation ? `<dt>Situazione</dt><dd>${esc(t.situation)}</dd>` : ''}
              <dt>Pensiero</dt><dd>${esc(t.thought)}</dd>
              ${t.distortions.length ? `<dt>Trappole</dt><dd>${esc(t.distortions.join(', '))}</dd>` : ''}
              ${t.pro ? `<dt>A favore</dt><dd>${esc(t.pro)}</dd>` : ''}
              ${t.contra ? `<dt>Contro</dt><dd>${esc(t.contra)}</dd>` : ''}
              ${t.alternative ? `<dt>Pensiero equilibrato</dt><dd>${esc(t.alternative)}</dd>` : ''}
            </dl>
            <button class="btn danger" data-del="${t.id}" style="margin-top:10px;min-height:36px;padding:6px 12px">Elimina</button>
          </details>
        </li>`).join('')}</ul>` : '<p class="muted" style="margin:0">Nessun pensiero salvato.</p>'}
    </div>`;
  view.addEventListener('click', (e) => {
    const id = e.target.dataset?.del;
    if (!id || !confirm('Eliminare questo pensiero?')) return;
    data.thoughts = data.thoughts.filter((t) => t.id !== id);
    save(); route();
  });
}

// ---------- SOS ----------
function telHref(p) { return 'tel:' + String(p).replace(/[^\d+]/g, ''); }

function renderSOS(view) {
  const { contacts, phrases } = data.settings;
  view.innerHTML = `
    <div class="sos-hero">
      <p>Sei al sicuro.</p>
      <p>Quello che senti è ansia, e passerà.</p>
      <p class="small muted" style="font-weight:400;font-size:15px;margin-top:10px">Non devi fare niente di difficile. Solo un passo alla volta.</p>
    </div>

    <div class="card">
      <h3>Adesso, prova così</h3>
      <ol class="steps">
        <li>Appoggia bene i piedi a terra e senti il pavimento.</li>
        <li>Espira lentamente, più a lungo di quanto inspiri.</li>
        <li>Rinfrescati: acqua fredda sui polsi o sul viso.</li>
        <li>Guarda intorno e nomina 3 cose che vedi.</li>
      </ol>
      <div class="row" style="margin-top:12px">
        <a class="btn" href="#respira/sospiro">Respira con me</a>
        <a class="btn soft" href="#grounding">5-4-3-2-1</a>
      </div>
    </div>

    ${phrases.length ? `<div class="card"><h3>Le tue frasi</h3><ul class="list">${phrases.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div>` : ''}

    <div class="card">
      <h3>Persone di cui ti fidi</h3>
      ${contacts.length
        ? contacts.map((c) => `<a class="phone" href="${telHref(c.phone)}"><span>${esc(c.name)}</span><b>Chiama</b></a>`).join('')
        : '<p class="muted small" style="margin:0">Puoi aggiungerle da <a href="#impostazioni">Altro</a>, così le avrai sempre a portata di mano.</p>'}
    </div>

    <div class="card">
      <h3>Se ti senti in pericolo</h3>
      ${EMERGENCY.map((n) => `<a class="phone" href="${telHref(n.phone)}"><span>${n.name}<br><span class="small muted">${n.note}</span></span><b>${n.label || n.phone}</b></a>`).join('')}
      <p class="small muted" style="margin-bottom:0">Questa app non sostituisce un medico o uno psicologo. Se l'ansia è frequente o intensa, parlarne con un professionista può fare una grande differenza.</p>
    </div>`;
}

// ---------- Impostazioni ----------
function renderSettings(view) {
  const s = data.settings;
  view.innerHTML = `
    <div class="card">
      <label for="name" style="margin-top:0">Come ti chiami?</label>
      <input type="text" id="name" value="${esc(s.name)}" placeholder="Facoltativo, per il saluto">
    </div>

    <div class="card">
      <h3>Persone da chiamare</h3>
      <ul class="list" id="contacts">${s.contacts.map((c, i) => `
        <li class="entry-head"><span>${esc(c.name)}<br><span class="small muted">${esc(c.phone)}</span></span>
        <button class="btn danger" data-del-contact="${i}" style="min-height:36px;padding:6px 12px">Rimuovi</button></li>`).join('')}
      </ul>
      <form id="addContact">
        <label for="cname">Nome</label><input type="text" id="cname" required>
        <label for="cphone">Telefono</label><input type="tel" id="cphone" inputmode="tel" required>
        <button class="btn soft block" style="margin-top:12px">Aggiungi contatto</button>
      </form>
    </div>

    <div class="card">
      <h3>Frasi che ti aiutano</h3>
      <p class="small muted" style="margin-top:0">Appaiono nella Home e nella schermata SOS.</p>
      <ul class="list">${s.phrases.map((p, i) => `
        <li class="entry-head"><span>${esc(p)}</span>
        <button class="btn danger" data-del-phrase="${i}" style="min-height:36px;padding:6px 12px">✕</button></li>`).join('')}
      </ul>
      <form id="addPhrase">
        <label for="phrase">Nuova frase</label>
        <input type="text" id="phrase" required placeholder="Es. Sono più forte di quanto penso.">
        <button class="btn soft block" style="margin-top:12px">Aggiungi frase</button>
      </form>
    </div>

    <div class="card">
      <h3>I tuoi dati</h3>
      <p class="small muted" style="margin-top:0">Tutto resta solo su questo telefono. Ogni tanto fai un backup: se cancelli l'app dalla Home, i dati vanno persi.</p>
      <div class="stack">
        <button class="btn soft block" id="export">Esporta backup</button>
        <label class="btn soft block" style="margin:0">Importa backup<input type="file" id="import" accept="application/json,.json" hidden></label>
        <button class="btn danger block" id="wipe">Cancella tutti i dati</button>
      </div>
    </div>

    <p class="small muted center">Respiro · versione 1.0</p>`;

  $('#name', view).addEventListener('change', (e) => { s.name = e.target.value.trim(); save(); toast('Salvato'); });

  $('#addContact', view).addEventListener('submit', (e) => {
    e.preventDefault();
    s.contacts.push({ name: $('#cname', view).value.trim(), phone: $('#cphone', view).value.trim() });
    save(); route();
  });
  $('#addPhrase', view).addEventListener('submit', (e) => {
    e.preventDefault();
    s.phrases.push($('#phrase', view).value.trim());
    save(); route();
  });
  view.addEventListener('click', (e) => {
    const c = e.target.dataset?.delContact, p = e.target.dataset?.delPhrase;
    if (c !== undefined) { s.contacts.splice(+c, 1); save(); route(); }
    if (p !== undefined) { s.phrases.splice(+p, 1); save(); route(); }
  });

  $('#export', view).addEventListener('click', async () => {
    const json = JSON.stringify({ app: 'respiro', version: 1, exportedAt: new Date().toISOString(), data }, null, 2);
    const fname = `respiro-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File([json], fname, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Backup Respiro' }); return; }
      catch (err) { if (err.name === 'AbortError') return; }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = fname;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });

  $('#import', view).addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const parsed = JSON.parse(await f.text());
      const d = parsed.data || parsed;
      if (!Array.isArray(d.checkins) || !Array.isArray(d.thoughts)) throw new Error('formato');
      if (!confirm('Sostituire i dati attuali con quelli del backup?')) return;
      localStorage.setItem(STORE_KEY, JSON.stringify(d));
      data = load();
      toast('Backup importato');
      route();
    } catch {
      toast('File non valido');
    }
  });

  $('#wipe', view).addEventListener('click', () => {
    if (!confirm('Cancellare davvero tutte le note, i pensieri e le impostazioni?')) return;
    localStorage.removeItem(STORE_KEY);
    data = load();
    toast('Dati cancellati');
    route();
  });
}

// ---------- Avvio ----------
route();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

// Chiede al browser di non cancellare i dati locali
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
