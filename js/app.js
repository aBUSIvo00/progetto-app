'use strict';

/* ==========================================================
   Fusa — piccola app per l'ansia, con un gatto.
   Tutti i dati restano sul telefono (localStorage).
   ========================================================== */

// ---------- Icone ----------
const ic = (body) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const ICONS = {
  breath: ic('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/>'),
  hand: ic('<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12"/><path d="M11 11V4.5a1.5 1.5 0 0 1 3 0V11"/><path d="M14 11V6a1.5 1.5 0 0 1 3 0v7c0 4-2.5 7-6 7s-5-1.5-6.5-4L3 12.5a1.5 1.5 0 0 1 2.5-1.5L8 14"/>'),
  loop: ic('<path d="M4 12a8 8 0 0 1 14-5.3L20 9"/><path d="M20 4v5h-5"/><path d="M20 12a8 8 0 0 1-14 5.3L4 15"/><path d="M4 20v-5h5"/>'),
  eyes: ic('<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/>'),
  box: ic('<path d="M3 8l9-4 9 4-9 4-9-4z"/><path d="M3 8v8l9 4 9-4V8"/><path d="M12 12v8"/>'),
  sparkle: ic('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>'),
  cloud: ic('<path d="M7 18h10a4 4 0 0 0 0-8 6 6 0 0 0-11.6 1.5A3.3 3.3 0 0 0 7 18z"/>'),
  heart: ic('<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>')
};

// Gatto disegnato in SVG. mood: 'happy' (occhi a ^), 'sleep' (occhi chiusi), 'open'
function cat(mood = 'happy', extra = '') {
  const eyes = {
    happy: '<path d="M38 60q6-7 12 0M70 60q6-7 12 0" fill="none"/>',
    sleep: '<path d="M37 59q7 6 14 0M69 59q7 6 14 0" fill="none"/>',
    open: '<circle cx="44" cy="58" r="5" fill="var(--cat-line)" stroke="none"/><circle cx="76" cy="58" r="5" fill="var(--cat-line)" stroke="none"/><circle cx="45.5" cy="56.5" r="1.6" fill="#fff" stroke="none"/><circle cx="77.5" cy="56.5" r="1.6" fill="#fff" stroke="none"/>'
  }[mood];
  return `<svg class="cat ${extra}" viewBox="0 0 120 108" aria-hidden="true" stroke="var(--cat-line)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 46L26 8l28 22z" fill="var(--cat)"/><path d="M100 46L94 8 66 30z" fill="var(--cat)"/>
    <path d="M27 36l3-18 13 11z" fill="var(--cat-inner)" stroke="none"/><path d="M93 36l-3-18-13 11z" fill="var(--cat-inner)" stroke="none"/>
    <ellipse cx="60" cy="62" rx="44" ry="38" fill="var(--cat)"/>
    <ellipse cx="34" cy="74" rx="7" ry="4.5" fill="var(--cat-inner)" stroke="none" opacity=".75"/>
    <ellipse cx="86" cy="74" rx="7" ry="4.5" fill="var(--cat-inner)" stroke="none" opacity=".75"/>
    ${eyes}
    <path d="M56 69h8l-4 4z" fill="var(--cat-inner)" stroke-width="1.8"/>
    <path d="M60 73q-3 6-9 3M60 73q3 6 9 3" fill="none" stroke-width="2"/>
    <path d="M22 66l-14-3M22 72l-14 2M98 66l14-3M98 72l14 2" stroke-width="1.6"/>
  </svg>`;
}

// ---------- Archivio dati ----------
const STORE_KEY = 'respiro.v1'; // nome storico, non cambiarlo o si perdono i dati
const DEFAULT_SETTINGS = {
  name: '',
  catName: 'Micio',
  contacts: [],
  phrases: [
    'Un pensiero non è un fatto. Nemmeno se lo ripeto cento volte.',
    'Gli altri pensano a me molto meno di quanto creda: sono impegnati a pensare a se stessi.',
    'Non devo essere perfetta. Abbastanza va benissimo.',
    'Ho già superato giornate così. Questa non fa eccezione.'
  ],
  customActivities: []
};

function load() {
  let d = {};
  try { d = JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { d = {}; }
  const arr = (x) => (Array.isArray(x) ? x : []);
  return {
    checkins: arr(d.checkins),   // { id, ts, level, topics[], emotions[], body[], trigger, note }
    thoughts: arr(d.thoughts),   // { id, ts, topic, situation, thought, before, after, distortions[], pro, contra, alts[], yearLater, alternative }
    worries: arr(d.worries),     // { id, ts, text, topics[], prob, outcome, resolvedTs }
    steps: arr(d.steps),         // { id, ts, text, done }
    experiments: d.experiments && typeof d.experiments === 'object' ? d.experiments : {}, // { nome: { yes, no } }
    settings: { ...structuredClone(DEFAULT_SETTINGS), ...(d.settings || {}) }
  };
}

let data = load();

function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); }
  catch { toast('Impossibile salvare: memoria piena?'); }
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const catName = () => data.settings.catName || 'Micio';

// Testo passato tra uno strumento e l'altro (es. dal "pensiero in loop" alla scatola)
let draft = '';

// ---------- Utilità ----------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
const fmtDate = (ts) => new Date(ts).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
const fmtTime = (ts) => new Date(ts).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
function dayKey(ts) { const d = new Date(ts); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }

// 0 = azzurro calmo, 10 = rosa intenso
const levelColor = (n) => `hsl(${200 + n * 14.5} 45% 55%)`;

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
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

function chips(name, options, selected = []) {
  return `<div class="chips" data-chips="${name}">${options.map((o) =>
    `<button type="button" class="chip${selected.includes(o) ? ' on' : ''}" data-value="${esc(o)}">${esc(o)}</button>`
  ).join('')}</div>`;
}
const readChips = (root, name) => $$(`[data-chips="${name}"] .chip.on`, root).map((b) => b.dataset.value);

function scale(id, value, left, right, max = 10, step = 1, suffix = '') {
  return `
    <div class="scale-value" id="${id}-val" style="color:${levelColor(value * 10 / max)}">${value}${suffix}</div>
    <input type="range" id="${id}" min="0" max="${max}" step="${step}" value="${value}" data-suffix="${suffix}">
    <div class="scale-labels"><span>${left}</span><span>${right}</span></div>`;
}
function bindScale(id) {
  const input = document.getElementById(id);
  const out = document.getElementById(id + '-val');
  input.addEventListener('input', () => {
    out.textContent = input.value + input.dataset.suffix;
    out.style.color = levelColor(+input.value * 10 / +input.max);
  });
}

function catSays(text, mood = 'happy') {
  return `<div class="cat-row"><div>${cat(mood)}<div class="purr-text"></div></div>
    <div class="bubble">${text}<small>— ${esc(catName())}</small></div></div>`;
}
function bindCat(view, lines) {
  const c = $('.cat-row .cat', view);
  if (!c) return;
  c.addEventListener('click', () => {
    c.classList.remove('purr'); void c.offsetWidth; c.classList.add('purr');
    $('.cat-row .purr-text', view).textContent = pick(['prrr…', 'prrrrr', 'miao', '♡ prr ♡']);
    if (lines) $('.cat-row .bubble', view).firstChild.textContent = pick(lines);
  });
}

// ---------- Contenuti ----------
const TOPICS = ['Lavoro', 'Studio', 'Cosa pensano gli altri', 'Altro'];
const EMOTIONS = ['Ansiosa', 'In loop', 'Paranoica', 'Giudicata', 'Insicura', 'Sopraffatta', 'Stanca', 'Triste', 'Arrabbiata', 'Calma', 'Fiera di me'];
const BODY = ['Cuore veloce', 'Fiato corto', 'Nodo allo stomaco', 'Tensione', 'Mal di testa', 'Testa piena', 'Insonnia', 'Niente di particolare'];
const DISTORTIONS = {
  'Leggere nel pensiero': 'Dare per scontato cosa pensano gli altri di te.',
  'Prevedere il futuro': 'Essere sicura che andrà male, senza prove.',
  'Catastrofizzare': 'Un errore piccolo diventa la fine del mondo.',
  'Effetto riflettore': 'Credere che tutti ti notino e ti giudichino.',
  'Tutto o niente': '"Se non è perfetto, è un disastro".',
  'Generalizzare': '"Sbaglio sempre", "non ce la faccio mai".',
  'Doverizzazioni': '"Dovrei essere più brava", "devo assolutamente".',
  'Filtro negativo': 'Vedere solo l\'unica cosa andata storta.',
  'Ragionamento emotivo': '"Lo sento, quindi è vero".'
};

const CAT_LINES = [
  'Il tuo cervello sta facendo gli straordinari. Non è nemmeno pagato: digli di staccare.',
  'Io dormo sedici ore al giorno e nessuno mi giudica. Prendi appunti.',
  'Cosa pensano gli altri di te? Spoiler: stanno pensando a se stessi.',
  'Non tutti i pensieri meritano una risposta. Alcuni meritano solo un\'occhiata da gatto.',
  'Sei più brava di quanto il tuo cervello voglia farti credere. Fidati, io sono un gatto, non mento (quasi mai).',
  'Un errore al lavoro non è una sentenza. È solo un martedì.',
  'L\'ansia è un allarme che suona anche per una foglia. Tu non sei in pericolo, sei solo sotto una foglia.',
  'Hai il diritto di non avere tutto sotto controllo. Io per esempio non controllo niente e sto benissimo.',
  'Respira. Poi, se serve, una merenda. È la mia filosofia di vita.',
  'Quel pensiero che gira in tondo? Lascialo girare, come io con la coda. Prima o poi si stanca.',
  'Sei abbastanza così. Anzi, più che abbastanza.',
  'Oggi basta fare una cosa alla volta. Anche zero, se è una giornata da divano.',
  'Se qualcuno ti giudica, è un problema suo. Io lo graffierei, ma tu sei più educata.',
  'Ricordati che le paranoie hanno una pessima media come indovine.'
];

const BREATH_PATTERNS = {
  fusa: {
    name: 'Respiro delle fusa',
    desc: '5 secondi dentro, 5 fuori. Lento e regolare, come un gatto al sole.',
    phases: [['Inspira', 5, 1], ['Espira', 5, 0]]
  },
  quadrato: {
    name: 'Respiro quadrato',
    desc: '4 secondi per fase. Aiuta quando la testa corre troppo.',
    phases: [['Inspira', 4, 1], ['Trattieni', 4, 1], ['Espira', 4, 0], ['Trattieni', 4, 0]]
  },
  '478': {
    name: '4 · 7 · 8',
    desc: 'Espirazione lunga: rilassa, ottimo anche per addormentarsi.',
    phases: [['Inspira', 4, 1], ['Trattieni', 7, 1], ['Espira', 8, 0]]
  },
  sospiro: {
    name: 'Sospiro di sollievo',
    desc: 'Due inspirazioni dal naso, una lunga espirazione. La calma più veloce che c\'è.',
    phases: [['Inspira', 2, 0.8], ['Ancora un po\'', 1, 1], ['Espira lentamente', 6, 0]]
  }
};

const GROUNDING = [
  { n: 5, sense: 'cose che puoi VEDERE', hint: 'Un colore, un oggetto, una luce. Se c\'è un gatto vale doppio.' },
  { n: 4, sense: 'cose che puoi TOCCARE', hint: 'I vestiti sulla pelle, il tavolo, i piedi sul pavimento, una coperta morbida.' },
  { n: 3, sense: 'suoni che puoi SENTIRE', hint: 'Vicini o lontani. Anche il tuo respiro conta.' },
  { n: 2, sense: 'odori che puoi SENTIRE', hint: 'Se non ne senti, pensa a due odori che ami.' },
  { n: 1, sense: 'cosa gentile da dirti', hint: 'Una sola. Come la diresti alla tua migliore amica.' }
];

const ACTIVITIES = [
  'Guarda foto o video di gatti per 3 minuti',
  'Accarezza un animale (o un cuscino morbido, non giudichiamo)',
  'Acqua fredda su viso e polsi',
  'Cammina 5 minuti, anche solo per casa',
  'Metti una canzone e cantala, stonata è meglio',
  'Scrivi tutto quello che hai in testa per 3 minuti, senza rileggere',
  'Gioco: un animale per ogni lettera dell\'alfabeto',
  'Doccia calda',
  'Riordina una cosa piccola (un cassetto, non la vita)',
  'Manda un meme a qualcuno',
  'Tieni in mano qualcosa di molto freddo o molto caldo',
  'Disegna un gatto, anche bruttissimo'
];

const EMERGENCY = [
  { name: 'Emergenze', phone: '112', note: 'Numero unico europeo' },
  { name: 'Telefono Amico Italia', phone: '0223272327', label: '02 2327 2327', note: 'Ascolto telefonico anonimo' },
  { name: 'Samaritans Onlus', phone: '0677208977', label: '06 77208977', note: 'Ascolto telefonico anonimo' }
];

// ---------- Router ----------
const ROUTES = {
  home: { title: () => 'Fusa', render: renderHome, tab: 'home' },
  respira: { title: () => 'Respira', render: renderBreathMenu, tab: 'respira' },
  'respira/': { title: (p) => BREATH_PATTERNS[p]?.name || 'Respira', render: renderBreath, tab: 'respira', back: '#respira' },
  grounding: { title: () => '5 · 4 · 3 · 2 · 1', render: renderGrounding, tab: 'home', back: '#home' },
  diario: { title: () => 'Diario', render: renderDiary, tab: 'diario' },
  'diario/nuovo': { title: () => 'Come stai?', render: renderCheckin, tab: 'diario', back: '#diario' },
  pensieri: { title: () => 'Pensieri', render: renderThoughtsHub, tab: 'pensieri' },
  loop: { title: () => 'Pensiero in loop', render: renderLoop, tab: 'pensieri', back: '#pensieri' },
  scatola: { title: () => 'Scatola delle paranoie', render: renderWorryBox, tab: 'pensieri', back: '#pensieri' },
  'pensieri/nuovo': { title: () => 'Esamina un pensiero', render: (v) => renderThoughtForm(v, 'generico'), tab: 'pensieri', back: '#pensieri' },
  'pensieri/giudizio': { title: () => 'Cosa penseranno di me?', render: (v) => renderThoughtForm(v, 'giudizio'), tab: 'pensieri', back: '#pensieri' },
  pausa: { title: () => 'Pausa dal cervello', render: renderPause, tab: 'home', back: '#home' },
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
    if (i > 0 && ROUTES[hash.slice(0, i + 1)]) { key = hash.slice(0, i + 1); param = hash.slice(i + 1); }
    else key = 'home';
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

document.addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  const group = chip.closest('[data-chips]');
  if (!group) return;
  if (group.dataset.single !== undefined) $$('.chip', group).forEach((c) => c !== chip && c.classList.remove('on'));
  chip.classList.toggle('on');
});

// ---------- Home ----------
function greeting() {
  const h = new Date().getHours();
  const n = data.settings.name ? `, ${esc(data.settings.name)}` : '';
  if (h < 6) return `Ancora sveglia${n}?`;
  if (h < 13) return `Buongiorno${n}`;
  if (h < 18) return `Ciao${n}`;
  return `Buonasera${n}`;
}

const pendingWorries = () => data.worries.filter((w) => !w.outcome && Date.now() - w.ts > 864e5);
const openSteps = () => data.steps.filter((s) => !s.done);

function tile(href, icon, title, sub, cls = '') {
  return `<a class="tile ${cls}" href="${href}"><span class="ico">${icon}</span><b>${title}</b><small>${sub}</small></a>`;
}

function renderHome(view) {
  const today = data.checkins.filter((c) => dayKey(c.ts) === dayKey(Date.now()));
  const pw = pendingWorries(), os = openSteps();
  const phrase = data.settings.phrases.length ? pick(data.settings.phrases) : '';
  view.innerHTML = `
    <p class="greeting">${greeting()}</p>
    ${catSays(esc(pick(CAT_LINES)))}

    <a class="btn block" href="#diario/nuovo" style="margin-top:6px">Come ti senti adesso?</a>
    ${today.length ? `<p class="small muted center">Oggi: ${today.length} check-in · ultimo livello <b>${today[0].level}/10</b></p>` : ''}

    ${pw.length ? `<a class="card tile full" href="#scatola">${cat('open')}<div><b>${pw.length === 1 ? 'Una paranoia da verificare' : `${pw.length} paranoie da verificare`}</b><small>Vediamo se il tuo cervello ci aveva preso. (Spoiler: di solito no.)</small></div></a>` : ''}
    ${os.length ? `<a class="card tile full" href="#pensieri"><span class="ico">${ICONS.sparkle}</span><div><b>Il tuo piccolo passo</b><small>${esc(os[0].text)}</small></div></a>` : ''}

    <div class="grid">
      ${tile('#loop', ICONS.loop, 'Pensiero in loop', 'Quando la testa gira in tondo', 'accent')}
      ${tile('#pensieri/giudizio', ICONS.eyes, 'Cosa penseranno di me?', 'Per le paranoie sugli altri', 'accent')}
      ${tile('#respira', ICONS.breath, 'Respira', 'Con il gatto, piano piano')}
      ${tile('#scatola', ICONS.box, 'Scatola delle paranoie', 'Parcheggia un pensiero e verificalo dopo')}
      ${tile('#pausa', ICONS.sparkle, 'Pausa dal cervello', 'Scopri cosa funziona per te')}
      ${tile('#grounding', ICONS.hand, 'Torna al presente', 'Tecnica 5-4-3-2-1')}
      <a class="tile warm full" href="#sos"><span class="ico">${ICONS.heart}</span><div><b>Sto male ora</b><small>Aiuto immediato</small></div></a>
    </div>

    ${phrase ? `<div class="card"><p class="small muted" style="margin:0 0 4px">Ricorda</p><p style="margin:0;font-size:19px">${esc(phrase)}</p></div>` : ''}
  `;
  bindCat(view, CAT_LINES);
}

// ---------- Respirazione ----------
function renderBreathMenu(view) {
  view.innerHTML = `
    ${catSays('Scegline uno. Respira dal naso se puoi, e lascia cadere le spalle. Sì, proprio quelle, che stanno vicino alle orecchie.', 'sleep')}
    ${Object.entries(BREATH_PATTERNS).map(([k, p]) => `
      <a class="card tile" href="#respira/${k}" style="min-height:auto"><b>${p.name}</b><small>${p.desc}</small></a>`).join('')}
  `;
  bindCat(view);
}

function renderBreath(view, key) {
  const p = BREATH_PATTERNS[key];
  if (!p) { location.hash = '#respira'; return; }
  view.innerHTML = `
    <p class="muted center small">${p.desc}</p>
    <div class="breath-stage">
      <div class="breath-circle" id="circle">${cat('sleep')}</div>
      <div class="breath-text"><div class="phase" id="phase">Pronta?</div><div class="count" id="count"></div></div>
    </div>
    <p class="center muted small" id="cycles">&nbsp;</p>
    <button class="btn block" id="toggle">Inizia</button>
    <p class="center muted small">Bastano 2–3 minuti. Se ti gira la testa, fermati e respira normalmente.</p>`;

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
    phaseEl.textContent = cycles ? pick(['Brava.', 'Ben fatto.', 'Il gatto approva.']) : 'Pronta?';
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

// ---------- Grounding ----------
function renderGrounding(view) {
  let step = 0;
  function draw() {
    if (step >= GROUNDING.length) {
      view.innerHTML = `
        ${catSays('Sei qui, adesso. Nota come ti senti rispetto a qualche minuto fa: anche un pochino meglio conta.')}
        <div class="stack" style="margin-top:12px">
          <a class="btn block" href="#diario/nuovo">Annota come ti senti</a>
          <a class="btn block soft" href="#respira">Fai qualche respiro</a>
          <button class="btn block ghost" id="again">Ricomincia</button>
        </div>`;
      bindCat(view);
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
        <p class="small muted">Nominale una alla volta, anche solo nella tua testa. Vai piano.</p>
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

// ---------- Pensiero in loop ----------
function renderLoop(view) {
  let thought = draft; draft = '';
  function stepWrite() {
    view.innerHTML = `
      ${catSays('Ok, il criceto nella tua testa sta correndo sulla ruota. Scriviamo cosa sta pensando, così lo guardiamo da fuori.', 'open')}
      <div class="card">
        <label for="t" style="margin-top:0">Che pensiero sta girando?</label>
        <textarea id="t" placeholder="Es. «Ho sbagliato quella cosa e ora penseranno che non sono capace»">${esc(thought)}</textarea>
      </div>
      <button class="btn block" id="go">Avanti</button>`;
    bindCat(view);
    $('#go', view).onclick = () => {
      thought = $('#t', view).value.trim();
      if (!thought) { toast('Scrivi anche solo due parole.'); return; }
      stepAsk();
    };
  }
  function stepAsk() {
    view.innerHTML = `
      <div class="card"><p class="quote">${esc(thought)}</p></div>
      <div class="card">
        <h3>C'è qualcosa di concreto che puoi fare, adesso o a breve?</h3>
        <p class="small muted" style="margin-top:0">Rimuginare sembra utile, ma di solito è come girare in macchina in un parcheggio: tanta strada, zero destinazione.</p>
        <div class="stack">
          <button class="btn block" id="yes">Sì, c'è qualcosa da fare</button>
          <button class="btn block soft" id="no">No, posso solo pensarci</button>
          <button class="btn block soft" id="dunno">Non lo so</button>
        </div>
      </div>`;
    $('#yes', view).onclick = stepAction;
    $('#no', view).onclick = stepLetGo;
    $('#dunno', view).onclick = stepLetGo;
  }
  function stepAction() {
    view.innerHTML = `
      <div class="card"><p class="quote">${esc(thought)}</p></div>
      <div class="card">
        <label for="s" style="margin-top:0">Qual è il passo più piccolo possibile?</label>
        <p class="small muted" style="margin-top:0">Piccolo davvero: «scrivere due righe al prof», non «sistemare la mia vita entro venerdì».</p>
        <input type="text" id="s" placeholder="Il mio piccolo passo…">
      </div>
      <button class="btn block" id="save">Fatto, me lo segno</button>`;
    $('#save', view).onclick = () => {
      const text = $('#s', view).value.trim();
      if (!text) { toast('Scrivi il passo, anche minuscolo.'); return; }
      data.steps.unshift({ id: uid(), ts: Date.now(), text, done: false });
      save();
      view.innerHTML = `
        ${catSays('Perfetto. Adesso il pensiero ha un piano e può smettere di urlare. Il passo lo trovi nella Home finché non lo spunti.')}
        <div class="stack" style="margin-top:12px">
          <a class="btn block" href="#home">Torna alla Home</a>
          <a class="btn block soft" href="#respira/sospiro">Un respiro prima di iniziare</a>
        </div>`;
      bindCat(view);
    };
  }
  function stepLetGo() {
    const aboutOthers = /pens|giudic|dir[aà]|crede|vist|guard|figur|sembr/i.test(thought);
    view.innerHTML = `
      <div class="card"><p class="quote">${esc(thought)}</p></div>
      ${catSays('Allora girarci intorno non lo risolve: lo allena e basta. Un pensiero non è un ordine, è rumore di fondo. Tipo me che miagolo alle 5 di mattina.')}
      <div class="card">
        <h3>Cosa vuoi farne?</h3>
        <div class="stack">
          <button class="btn block" id="park">Mettilo nella scatola e verifichiamo dopo</button>
          <button class="btn block soft" id="exam">${aboutOthers ? 'Analizziamo cosa penseranno gli altri' : 'Esaminiamolo con calma'}</button>
          <a class="btn block soft" href="#pausa">Distraimi 5 minuti</a>
          <a class="btn block soft" href="#respira/fusa">Respiriamo</a>
        </div>
      </div>`;
    bindCat(view);
    $('#park', view).onclick = () => { draft = thought; location.hash = '#scatola'; };
    $('#exam', view).onclick = () => { draft = thought; location.hash = aboutOthers ? '#pensieri/giudizio' : '#pensieri/nuovo'; };
  }
  stepWrite();
}

// ---------- Scatola delle paranoie ----------
const OUTCOMES = {
  no: { label: 'Non è successo', short: 'Non successo' },
  gestito: { label: 'È successo, ma l\'ho gestito', short: 'Gestito' },
  si: { label: 'È successo ed è stato brutto', short: 'Successo' }
};

function worryStats() {
  const done = data.worries.filter((w) => w.outcome);
  const n = done.length;
  const cnt = (o) => done.filter((w) => w.outcome === o).length;
  const avgProb = n ? Math.round(done.reduce((s, w) => s + w.prob, 0) / n) : 0;
  return { n, no: cnt('no'), gestito: cnt('gestito'), si: cnt('si'), avgProb };
}

function renderWorryBox(view) {
  const text = draft; draft = '';
  const st = worryStats();
  const pending = data.worries.filter((w) => !w.outcome);
  const done = data.worries.filter((w) => w.outcome);
  const okPct = st.n ? Math.round(((st.no + st.gestito) / st.n) * 100) : 0;
  let verdict = '';
  if (st.n >= 3) {
    verdict = okPct >= 80 ? 'Come indovino, il tuo cervello è licenziato. Con affetto.'
      : okPct >= 50 ? 'Il tuo cervello ci prende meno di quanto creda. Molto meno.'
        : 'A volte le cose vanno storte davvero. Ma guarda quante ne hai gestite.';
  }

  view.innerHTML = `
    ${catSays('Le paranoie sono bravissime a sembrare profezie. Mettiamole qui dentro e poi controlliamo se ci avevano preso.', 'open')}

    ${st.n ? `<div class="card">
      <h3>Il tuo cervello come indovino</h3>
      <div class="stat-row">
        <div><b>${st.n}</b><span>verificate</span></div>
        <div><b>${st.no}</b><span>non successe</span></div>
        <div><b>${st.gestito}</b><span>gestite</span></div>
        <div><b>${st.si}</b><span>andate male</span></div>
      </div>
      <p style="margin:6px 0 0">Ne eri sicura in media al <b>${st.avgProb}%</b>. Sono andate bene o le hai gestite nel <b>${okPct}%</b> dei casi.</p>
      ${verdict ? `<p class="small muted" style="margin-bottom:0">${verdict}</p>` : ''}
    </div>` : ''}

    <form class="card" id="f">
      <label for="w" style="margin-top:0">Cosa temi che succeda?</label>
      <textarea id="w" placeholder="Es. «Domani il capo mi dirà che ho fatto un disastro»">${esc(text)}</textarea>
      <label>Di cosa si tratta?</label>
      ${chips('topics', TOPICS)}
      <label>Quanto ne sei sicura, adesso?</label>
      ${scale('prob', 70, 'Per niente', 'Sicurissima', 100, 10, '%')}
      <button class="btn block" style="margin-top:14px">Metti nella scatola</button>
    </form>

    ${pending.length ? `<div class="card"><h3>Da verificare</h3>
      <p class="small muted" style="margin-top:0">Quando è passato il momento, dimmi com'è andata.</p>
      <ul class="list">${pending.map((w) => `
        <li>
          <div class="entry-head"><span class="small muted">${fmtDate(w.ts)}${w.topics?.length ? ' · ' + esc(w.topics.join(', ')) : ''}</span><span class="small muted">sicura al ${w.prob}%</span></div>
          <p style="margin:4px 0 10px">${esc(w.text)}</p>
          <div class="stack">${Object.entries(OUTCOMES).map(([k, o]) => `<button class="btn soft sm block" data-out="${k}" data-id="${w.id}">${o.label}</button>`).join('')}</div>
          <button class="btn danger sm" data-del="${w.id}" style="margin-top:8px">Elimina</button>
        </li>`).join('')}</ul></div>` : ''}

    ${done.length ? `<div class="card"><details><summary><h3 style="margin:0">Già verificate (${done.length}) ›</h3></summary>
      <ul class="list" style="margin-top:8px">${done.map((w) => `
        <li><div class="entry-head"><span>${esc(w.text)}</span><span class="small" style="white-space:nowrap">${OUTCOMES[w.outcome].short}</span></div>
        <span class="small muted">${fmtDate(w.ts)} · eri sicura al ${w.prob}%</span></li>`).join('')}</ul>
    </details></div>` : ''}
  `;
  bindCat(view);
  bindScale('prob');

  $('#f', view).addEventListener('submit', (e) => {
    e.preventDefault();
    const t = $('#w', view).value.trim();
    if (!t) { toast('Scrivi cosa temi.'); return; }
    data.worries.unshift({ id: uid(), ts: Date.now(), text: t, topics: readChips(view, 'topics'), prob: +$('#prob', view).value, outcome: null });
    save();
    toast('Chiusa nella scatola. Ora puoi smettere di sorvegliarla.');
    route();
  });
  view.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.out) {
      const w = data.worries.find((x) => x.id === b.dataset.id);
      if (!w) return;
      w.outcome = b.dataset.out; w.resolvedTs = Date.now();
      save();
      toast({ no: 'Visto? Il cervello aveva torto.', gestito: 'E l\'hai gestita. Brava.', si: 'Mi dispiace. Ma sei ancora qui, e ce l\'hai fatta.' }[w.outcome]);
      route();
    } else if (b.dataset.del && confirm('Eliminare questa paranoia?')) {
      data.worries = data.worries.filter((x) => x.id !== b.dataset.del);
      save(); route();
    }
  });
}

// ---------- Pausa dal cervello (esperimenti) ----------
function renderPause(view) {
  const all = [...ACTIVITIES, ...data.settings.customActivities];
  const score = (a) => { const e = data.experiments[a] || { yes: 0, no: 0 }; return e.yes - e.no * 0.5; };
  const sorted = all.slice().sort((a, b) => score(b) - score(a));
  const tried = Object.values(data.experiments).reduce((s, e) => s + e.yes + e.no, 0);
  view.innerHTML = `
    ${catSays(tried < 5
      ? 'Non sappiamo ancora cosa ti calma, quindi facciamo esperimenti. Scegline una, provala 5 minuti, poi dimmi com\'è andata. Io intanto dormo.'
      : 'In cima trovi quello che finora ha funzionato meglio per te. Ma ogni tanto prova anche qualcosa di nuovo.', 'sleep')}
    <div class="card">
      <ul class="list">${sorted.map((a) => {
        const e = data.experiments[a] || { yes: 0, no: 0 };
        const works = e.yes >= 2 && e.yes > e.no;
        return `<li>
          <div>${esc(a)}${works ? '<span class="good">funziona per te</span>' : ''}</div>
          <div class="row" style="margin-top:8px;align-items:center">
            <button class="btn soft sm" data-yes="${esc(a)}">Ha aiutato</button>
            <button class="btn soft sm" data-no="${esc(a)}">Non molto</button>
            ${e.yes + e.no ? `<span class="small muted" style="flex:none">${e.yes}👍 ${e.no}👎</span>` : ''}
          </div></li>`;
      }).join('')}</ul>
    </div>
    <form class="card" id="add">
      <label for="act" style="margin-top:0">Aggiungi un'idea tua</label>
      <input type="text" id="act" required placeholder="Es. Guardare una puntata di una serie comfort">
      <button class="btn soft block" style="margin-top:12px">Aggiungi</button>
    </form>`;
  bindCat(view);
  view.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || !(b.dataset.yes || b.dataset.no)) return;
    const a = b.dataset.yes || b.dataset.no;
    const ex = data.experiments[a] || (data.experiments[a] = { yes: 0, no: 0 });
    if (b.dataset.yes) { ex.yes++; toast('Segnato! Questa la teniamo.'); }
    else { ex.no++; toast('Ok, ne proviamo un\'altra la prossima volta.'); }
    save(); route();
  });
  $('#add', view).addEventListener('submit', (e) => {
    e.preventDefault();
    const v = $('#act', view).value.trim();
    if (v && !all.includes(v)) { data.settings.customActivities.push(v); save(); }
    route();
  });
}

// ---------- Diario / check-in ----------
function renderCheckin(view) {
  view.innerHTML = `
    <form id="f">
      <div class="card"><h3>Quanta ansia senti?</h3>${scale('level', 5, 'Zero', 'Tantissima')}</div>
      <div class="card"><h3>Di cosa si tratta?</h3>${chips('topics', TOPICS)}</div>
      <div class="card"><h3>Come ti senti?</h3>${chips('emotions', EMOTIONS)}</div>
      <div class="card"><h3>E il corpo?</h3>${chips('body', BODY)}</div>
      <div class="card">
        <label for="trigger" style="margin-top:0">È successo qualcosa? (facoltativo)</label>
        <input type="text" id="trigger" placeholder="Es. riunione, esame, un messaggio senza risposta…">
        <label for="note">Altro che vuoi annotare</label>
        <textarea id="note" placeholder="Scrivi liberamente, il gatto non legge."></textarea>
      </div>
      <button class="btn block" type="submit">Salva</button>
    </form>`;
  bindScale('level');
  $('#f', view).addEventListener('submit', (e) => {
    e.preventDefault();
    const entry = {
      id: uid(), ts: Date.now(),
      level: +$('#level', view).value,
      topics: readChips(view, 'topics'),
      emotions: readChips(view, 'emotions'),
      body: readChips(view, 'body'),
      trigger: $('#trigger', view).value.trim(),
      note: $('#note', view).value.trim()
    };
    data.checkins.unshift(entry);
    save();
    if (entry.level >= 7) { toast('Salvato. Vieni, facciamo qualcosa insieme.'); location.hash = '#sos'; }
    else if (entry.emotions.includes('In loop') || entry.emotions.includes('Paranoica')) { toast('Salvato. Proviamo a fermare la giostra?'); location.hash = '#loop'; }
    else { toast('Salvato. Grazie per esserti ascoltata.'); location.hash = '#diario'; }
  });
}

function chart14() {
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - i);
    const items = data.checkins.filter((c) => dayKey(c.ts) === dayKey(d));
    days.push({ d, avg: items.length ? items.reduce((s, c) => s + c.level, 0) / items.length : null });
  }
  const W = 320, H = 130, pad = 18, bw = (W - pad) / 14;
  const bars = days.map((x, i) => {
    const xPos = pad + i * bw + 3;
    const label = `<text x="${xPos + (bw - 6) / 2}" y="${H - 2}" font-size="9" text-anchor="middle" fill="currentColor" opacity=".55">${x.d.getDate()}</text>`;
    if (x.avg === null) return `<rect x="${xPos}" y="${H - 18}" width="${bw - 6}" height="2" rx="1" fill="currentColor" opacity=".15"/>${label}`;
    const h = Math.max(3, (x.avg / 10) * (H - 30));
    return `<rect x="${xPos}" y="${H - 16 - h}" width="${bw - 6}" height="${h}" rx="3" fill="${levelColor(x.avg)}"/>${label}`;
  }).join('');
  const grid = [0, 5, 10].map((v) => {
    const y = H - 16 - (v / 10) * (H - 30);
    return `<line x1="${pad}" x2="${W}" y1="${y}" y2="${y}" stroke="currentColor" opacity=".1"/><text x="0" y="${y + 3}" font-size="9" fill="currentColor" opacity=".55">${v}</text>`;
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Media dell'ansia negli ultimi 14 giorni">${grid}${bars}</svg>`;
}

function topicBars() {
  const since = Date.now() - 30 * 864e5;
  const counts = Object.fromEntries(TOPICS.map((t) => [t, 0]));
  const add = (list) => list.forEach((t) => { if (t in counts) counts[t]++; });
  data.checkins.filter((c) => c.ts > since).forEach((c) => add(c.topics || []));
  data.worries.filter((w) => w.ts > since).forEach((w) => add(w.topics || []));
  data.thoughts.filter((t) => t.ts > since).forEach((t) => add(t.topic === 'giudizio' ? ['Cosa pensano gli altri'] : (t.topics || [])));
  const max = Math.max(...Object.values(counts));
  if (!max) return '';
  return `<div class="card"><h3>Cosa ti agita di più</h3><p class="small muted" style="margin-top:0">Ultimi 30 giorni</p>
    ${Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([t, n]) => `
      <div class="hbar"><span>${t}</span><i style="width:${Math.max(4, (n / max) * 100)}%;max-width:calc(100% - 160px)"></i><span class="muted">${n}</span></div>`).join('')}
  </div>`;
}

function renderDiary(view) {
  const list = data.checkins;
  view.innerHTML = `
    <a class="btn block" href="#diario/nuovo">+ Nuovo check-in</a>
    <div class="card"><h3>Ultimi 14 giorni</h3><p class="small muted" style="margin-top:0">Livello medio d'ansia per giorno</p>${chart14()}</div>
    ${topicBars()}
    <div class="card">
      <h3>Le tue note</h3>
      ${list.length ? `<ul class="list">${list.slice(0, 100).map((c) => `
        <li><details>
          <summary class="entry-head">
            <span>${fmtDate(c.ts)} · ${fmtTime(c.ts)}<br><span class="tags">${esc([...(c.topics || []), ...c.emotions].slice(0, 3).join(', ')) || '—'}</span></span>
            <span class="badge" style="background:${levelColor(c.level)}">${c.level}</span>
          </summary>
          <dl class="kv">
            ${c.topics?.length ? `<dt>Argomento</dt><dd>${esc(c.topics.join(', '))}</dd>` : ''}
            ${c.emotions.length ? `<dt>Emozioni</dt><dd>${esc(c.emotions.join(', '))}</dd>` : ''}
            ${c.body.length ? `<dt>Corpo</dt><dd>${esc(c.body.join(', '))}</dd>` : ''}
            ${c.trigger ? `<dt>Cosa è successo</dt><dd>${esc(c.trigger)}</dd>` : ''}
            ${c.note ? `<dt>Note</dt><dd>${esc(c.note)}</dd>` : ''}
          </dl>
          <button class="btn danger sm" data-del="${c.id}" style="margin-top:10px">Elimina</button>
        </details></li>`).join('')}</ul>` : '<p class="muted">Ancora nessuna nota. Il primo check-in richiede meno di un minuto.</p>'}
    </div>`;
  view.addEventListener('click', (e) => {
    const id = e.target.dataset?.del;
    if (!id || !confirm('Eliminare questa nota?')) return;
    data.checkins = data.checkins.filter((c) => c.id !== id);
    save(); route();
  });
}

// ---------- Pensieri ----------
function renderThoughtsHub(view) {
  const list = data.thoughts;
  view.innerHTML = `
    <div class="grid">
      ${tile('#loop', ICONS.loop, 'Pensiero in loop', 'Ferma la giostra', 'accent')}
      ${tile('#pensieri/giudizio', ICONS.eyes, 'Cosa penseranno di me?', 'Smonta la paranoia', 'accent')}
      ${tile('#scatola', ICONS.box, 'Scatola delle paranoie', 'Verifica dopo')}
      ${tile('#pensieri/nuovo', ICONS.cloud, 'Esamina un pensiero', 'Lavoro, studio, altro')}
    </div>

    ${data.steps.length ? `<div class="card"><h3>Piccoli passi</h3><ul class="list">${data.steps.slice(0, 15).map((s) => `
      <li><label class="check ${s.done ? 'done' : ''}" style="margin:0;font-weight:400"><input type="checkbox" data-step="${s.id}" ${s.done ? 'checked' : ''}><span>${esc(s.text)}</span></label></li>`).join('')}
    </ul></div>` : ''}

    <div class="card">
      <h3>Pensieri esaminati</h3>
      ${list.length ? `<ul class="list">${list.map((t) => `
        <li><details>
          <summary class="entry-head">
            <span>«${esc(t.thought.length > 70 ? t.thought.slice(0, 70) + '…' : t.thought)}»<br><span class="tags">${fmtDate(t.ts)}${t.topic === 'giudizio' ? ' · giudizio altrui' : ''}</span></span>
            <span class="small" style="white-space:nowrap"><span class="badge" style="background:${levelColor(t.before)}">${t.before}</span> → <span class="badge" style="background:${levelColor(t.after)}">${t.after}</span></span>
          </summary>
          <dl class="kv">
            ${t.situation ? `<dt>Situazione</dt><dd>${esc(t.situation)}</dd>` : ''}
            <dt>Pensiero</dt><dd>${esc(t.thought)}</dd>
            ${t.distortions?.length ? `<dt>Trappole</dt><dd>${esc(t.distortions.join(', '))}</dd>` : ''}
            ${t.evidence ? `<dt>Lo so o lo suppongo?</dt><dd>${esc(t.evidence)}</dd>` : ''}
            ${t.pro ? `<dt>A favore</dt><dd>${esc(t.pro)}</dd>` : ''}
            ${t.contra ? `<dt>Contro</dt><dd>${esc(t.contra)}</dd>` : ''}
            ${t.alts?.length ? `<dt>Altre spiegazioni</dt><dd>${esc(t.alts.join('\n'))}</dd>` : ''}
            ${t.yearLater ? `<dt>Tra un anno</dt><dd>${esc(t.yearLater)}</dd>` : ''}
            ${t.alternative ? `<dt>Pensiero più gentile</dt><dd>${esc(t.alternative)}</dd>` : ''}
          </dl>
          <button class="btn danger sm" data-del="${t.id}" style="margin-top:10px">Elimina</button>
        </details></li>`).join('')}</ul>` : '<p class="muted" style="margin:0">Ancora nessuno. Quando un pensiero ti tormenta, prova uno degli strumenti qui sopra.</p>'}
    </div>`;
  view.addEventListener('change', (e) => {
    const id = e.target.dataset?.step;
    if (!id) return;
    const s = data.steps.find((x) => x.id === id);
    s.done = e.target.checked;
    save();
    if (s.done) toast('Fatto! Il gatto è fiero di te.');
    route();
  });
  view.addEventListener('click', (e) => {
    const id = e.target.dataset?.del;
    if (!id || !confirm('Eliminare questo pensiero?')) return;
    data.thoughts = data.thoughts.filter((t) => t.id !== id);
    save(); route();
  });
}

function renderThoughtForm(view, mode) {
  const g = mode === 'giudizio';
  const pre = draft; draft = '';
  const ALT_SUGGESTIONS = ['Era distratto/a', 'Aveva fretta', 'Ha i suoi pensieri', 'Non ci ha fatto caso', 'Era stanco/a', 'Non c\'entro io', 'Non ha ancora visto il messaggio'];

  view.innerHTML = `
    ${g
      ? catSays('Analizziamo questa cosa del «cosa penseranno». Spoiler: gli umani pensano a se stessi il 95% del tempo. Il restante 5% pensano al cibo.', 'open')
      : catSays('Un pensiero ansioso non è un fatto. Guardiamolo con un po\' di distanza, passo dopo passo.', 'open')}
    <form id="f">
      <div class="card">
        ${g ? '' : `<h3 style="margin-top:0">Di cosa si tratta?</h3>${chips('topics', TOPICS.filter((t) => t !== 'Cosa pensano gli altri'))}`}
        <label for="situation" ${g ? 'style="margin-top:0"' : ''}>${g ? '1. Cos\'è successo?' : '1. Cosa sta succedendo?'}</label>
        <textarea id="situation" placeholder="${g ? 'Es. ho fatto una domanda in riunione / non mi ha risposto al messaggio / il prof mi ha guardata strano' : 'Es. ho un esame tra una settimana / ho una consegna e sono indietro'}"></textarea>
        <label for="thought">${g ? '2. Cosa temi che pensino di te?' : '2. Che pensiero ti passa per la testa?'}</label>
        <textarea id="thought" placeholder="${g ? 'Es. «Pensa che sono incapace / antipatica / stupida»' : 'Es. «Non ce la farò mai», «Farò una figuraccia»'}">${esc(pre)}</textarea>
      </div>

      <div class="card"><h3>3. Quanta ansia ti dà, adesso?</h3>${scale('before', 7, 'Poca', 'Tantissima')}</div>

      ${g ? `
      <div class="card">
        <h3>4. Lo sai o lo stai supponendo?</h3>
        <div class="chips" data-chips="evidence" data-single>
          ${['Me l\'ha detto chiaramente', 'L\'ho dedotto da un dettaglio', 'Me lo sento e basta'].map((o) => `<button type="button" class="chip" data-value="${o}">${o}</button>`).join('')}
        </div>
        <div class="tip">Leggere nel pensiero è un superpotere che nessun umano ha. Nemmeno io, e sono un gatto.</div>
      </div>
      <div class="card">
        <h3>5. Trova almeno 3 spiegazioni alternative</h3>
        <p class="small muted" style="margin-top:0">Tocca un suggerimento per usarlo, o scrivine di tue.</p>
        <div class="chips" id="sugg">${ALT_SUGGESTIONS.map((s) => `<button type="button" class="chip" data-sugg="${esc(s)}">${esc(s)}</button>`).join('')}</div>
        <input type="text" class="alt" placeholder="Spiegazione 1" style="margin-top:12px">
        <input type="text" class="alt" placeholder="Spiegazione 2" style="margin-top:8px">
        <input type="text" class="alt" placeholder="Spiegazione 3" style="margin-top:8px">
      </div>
      <div class="card">
        <label for="yearLater" style="margin-top:0">6. E se anche lo pensasse davvero? Tra un anno quanto conterà?</label>
        <textarea id="yearLater" placeholder="Cosa cambierebbe, concretamente?"></textarea>
        <div class="tip">Si chiama <b>effetto riflettore</b>: crediamo che gli altri notino i nostri errori molto più di quanto succeda davvero.</div>
      </div>` : `
      <div class="card">
        <h3>4. Riconosci qualcuna di queste trappole?</h3>
        <p class="small muted" style="margin-top:0">Tocca quelle che ti sembrano adatte. Le ha anche il gatto.</p>
        ${chips('distortions', Object.keys(DISTORTIONS))}
        <ul class="small muted" style="padding-left:18px;margin-bottom:0">
          ${Object.entries(DISTORTIONS).map(([k, v]) => `<li><b>${k}</b>: ${v}</li>`).join('')}
        </ul>
      </div>
      <div class="card">
        <label for="pro" style="margin-top:0">5. Cosa sostiene questo pensiero?</label>
        <textarea id="pro" placeholder="Fatti concreti, non sensazioni."></textarea>
        <label for="contra">6. Cosa non lo sostiene?</label>
        <textarea id="contra" placeholder="Volte in cui è andata bene, cose che hai già superato, complimenti ricevuti…"></textarea>
      </div>`}

      <div class="card">
        <label for="alternative" style="margin-top:0">7. Un modo più gentile di vederla</label>
        <textarea id="alternative" placeholder="Cosa diresti alla tua migliore amica nella stessa situazione?"></textarea>
      </div>
      <div class="card"><h3>8. E ora, quanta ansia senti?</h3>${scale('after', 5, 'Poca', 'Tantissima')}</div>
      <button class="btn block" type="submit">Salva</button>
    </form>`;
  bindCat(view);
  bindScale('before');
  bindScale('after');

  const sugg = $('#sugg', view);
  if (sugg) sugg.addEventListener('click', (e) => {
    const s = e.target.dataset?.sugg;
    if (!s) return;
    const empty = $$('.alt', view).find((i) => !i.value.trim());
    if (empty) { empty.value = s; e.target.classList.add('on'); }
    else toast('Ne hai già tre. Ottimo!');
  });

  $('#f', view).addEventListener('submit', (e) => {
    e.preventDefault();
    const v = (id) => ($('#' + id, view)?.value || '').trim();
    if (!v('thought')) { toast('Scrivi almeno il pensiero (punto 2).'); $('#thought', view).focus(); return; }
    const rec = {
      id: uid(), ts: Date.now(), topic: g ? 'giudizio' : 'generico',
      topics: g ? ['Cosa pensano gli altri'] : readChips(view, 'topics'),
      situation: v('situation'), thought: v('thought'),
      before: +$('#before', view).value, after: +$('#after', view).value,
      distortions: g ? ['Leggere nel pensiero'] : readChips(view, 'distortions'),
      evidence: g ? (readChips(view, 'evidence')[0] || '') : '',
      pro: v('pro'), contra: v('contra'),
      alts: $$('.alt', view).map((i) => i.value.trim()).filter(Boolean),
      yearLater: v('yearLater'),
      alternative: v('alternative')
    };
    data.thoughts.unshift(rec);
    save();
    const diff = rec.before - rec.after;
    toast(diff > 0 ? `L'ansia è scesa di ${diff} punti. Il gatto applaude (a modo suo).` : 'Salvato. Anche solo scriverlo è un passo.');
    location.hash = '#pensieri';
  });
}

// ---------- SOS ----------
const telHref = (p) => 'tel:' + String(p).replace(/[^\d+]/g, '');

function renderSOS(view) {
  const { contacts, phrases } = data.settings;
  view.innerHTML = `
    <div class="sos-hero">
      ${cat('sleep').replace('class="cat ', 'style="width:90px;margin:0 auto 8px" class="cat ')}
      <p>Ehi. Sei al sicuro.</p>
      <p>È ansia: fastidiosissima, ma non pericolosa. E passa.</p>
      <p class="small muted" style="font-weight:400;font-size:15px;margin-top:10px">Non devi risolvere niente adesso. Solo il prossimo respiro.</p>
    </div>

    <div class="card">
      <h3>Adesso, prova così</h3>
      <ol class="steps">
        <li>Appoggia bene i piedi a terra e senti il pavimento.</li>
        <li>Espira lentamente, più a lungo di quanto inspiri.</li>
        <li>Acqua fredda sui polsi o sul viso.</li>
        <li>Se c'è un gatto, accarezzalo. Se non c'è, guarda una foto di un gatto. È scienza (più o meno).</li>
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
      <p class="small muted" style="margin-bottom:0">Questa app non sostituisce un medico o uno psicologo. Se l'ansia diventa frequente o troppo intensa, parlarne con un professionista può fare una grande differenza.</p>
    </div>`;
}

// ---------- Impostazioni ----------
function renderSettings(view) {
  const s = data.settings;
  view.innerHTML = `
    <div class="card">
      <label for="name" style="margin-top:0">Come ti chiami?</label>
      <input type="text" id="name" value="${esc(s.name)}" placeholder="Anche un soprannome">
      <label for="catName">Come si chiama il gatto?</label>
      <input type="text" id="catName" value="${esc(s.catName)}" placeholder="Micio">
    </div>

    <div class="card">
      <h3>Persone da chiamare</h3>
      <ul class="list">${s.contacts.map((c, i) => `
        <li class="entry-head"><span>${esc(c.name)}<br><span class="small muted">${esc(c.phone)}</span></span>
        <button class="btn danger sm" data-del-contact="${i}">Rimuovi</button></li>`).join('')}
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
        <button class="btn danger sm" data-del-phrase="${i}">✕</button></li>`).join('')}
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

    <p class="small muted center">Fusa · versione 2.0</p>`;

  $('#name', view).addEventListener('change', (e) => { s.name = e.target.value.trim(); save(); toast('Salvato'); });
  $('#catName', view).addEventListener('change', (e) => { s.catName = e.target.value.trim() || 'Micio'; save(); toast(`Piacere, ${s.catName}!`); });
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
    const json = JSON.stringify({ app: 'fusa', version: 2, exportedAt: new Date().toISOString(), data }, null, 2);
    const fname = `fusa-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File([json], fname, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Backup Fusa' }); return; }
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
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
