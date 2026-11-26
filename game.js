// ================================================================
//  FLAG QUIZ — PewPlay
//  @bg #0f1f3d
//  @accent #ffcc4d
//  @files flags.js
//  @dirs flags
//  12 domande a giro: "che bandiera è?" o "qual è la bandiera di…?".
//  4 risposte, 10 secondi, punti bonus per la velocità, serie.
// ================================================================
(function () {
  'use strict';
  const { clamp, sfx, store } = PP;

  const GAME_ID = 'flag-quiz';
  const FL = window.FLAGS;
  const REGIONS = ['World', 'Europe', 'Asia', 'Africa', 'Americas', 'Oceania'];
  const QN = 12, TIME = 10;

  let region = 0;
  let pool, questions, qi, opts, answered, picked, timeLeft, score, correct, streak, bestStreak, missed, feedT;
  let btns = [];

  const inRegion = f => region === 0 || f[1] === REGIONS[region];

  function start() {
    pool = FL.list.filter(inRegion);
    questions = PP.shuffle(pool.slice()).slice(0, Math.min(QN, pool.length));
    questions.forEach(FL.image);   // carica in anticipo le bandiere del giro
    qi = 0; score = 0; correct = 0; streak = 0; bestStreak = 0; missed = [];
    ask();
  }
  function ask() {
    const q = questions[qi];
    // risposte sbagliate: soprattutto dallo stesso continente, così sono più insidiose
    const similar = PP.shuffle(FL.list.filter(f => f !== q && f[1] === q[1]));
    const others = PP.shuffle(FL.list.filter(f => f !== q && !similar.includes(f)));
    opts = PP.shuffle([q, ...similar.slice(0, 2), ...others].slice(0, 4));
    opts.forEach(FL.image);
    q.mode = qi % 3 === 2 ? 'pick-flag' : 'pick-name';
    answered = false; picked = null; timeLeft = TIME; feedT = 0;
  }
  function answer(o) {
    if (answered) return;
    answered = true; picked = o;
    const q = questions[qi];
    if (o === q) {
      correct++; streak++; bestStreak = Math.max(bestStreak, streak);
      const pts = 100 + Math.round(timeLeft * 10) + Math.min(streak - 1, 5) * 20;
      score += pts;
      PP.floatText(`+${pts}`, PP.W / 2, PP.H * 0.3, '#7dffb0', 26);
      sfx.chord([660, 880], 0.12, 'triangle', 0.14, 0.05);
    } else {
      streak = 0; missed.push(q[0]);
      sfx.tone(200, 0.2, 'sawtooth', 0.08, 140); PP.shake = 5;
    }
    feedT = 1.3;
  }
  function next() {
    if (qi + 1 >= questions.length) { feedT = Infinity; return finish(); }   // resta sull'ultima domanda
    qi++;
    ask();
  }
  function finish() {
    const key = `best-${region}`, b = store.get(key, 0), rec = score > b;
    if (rec) store.set(key, score);
    if (correct >= questions.length * 0.7) sfx.win(); else sfx.lose();
    if (correct === questions.length) PP.burst(PP.W / 2, PP.H / 2, ['#ffcc4d', '#fff', '#4fb3ff', '#ff6b6b'], 70, 420, 5, 1.4, 300);
    PP.game.overDelay = 200;
    const miss = missed.length ? `\nTo review: ${missed.slice(0, 6).join(', ')}${missed.length > 6 ? '…' : ''}` : '\nPerfect round!';
    PP.over(rec ? 'New best score!' : 'Quiz complete', `${REGIONS[region]} · ${correct}/${questions.length} correct · ${score} points\nBest streak ${bestStreak} · Best score ${Math.max(b, score)}${miss}`);
  }

  function update(dt) {
    // il tempo parte solo quando le bandiere della domanda sono pronte
    const q = questions[qi];
    const ready = q.mode === 'pick-flag' ? opts.every(FL.ready) : FL.ready(q);
    if (!answered && ready) { timeLeft -= dt; if (timeLeft <= 0) { timeLeft = 0; answer(null); } }
    else { feedT -= dt; if (feedT <= 0) next(); }
  }

  // ── DISEGNO ─────────────────────────────────────
  function ratio() { return 4 / 3; }
  function draw(ctx, W, H) {
    const g = ctx.createRadialGradient(W / 2, H * 0.3, 20, W / 2, H / 2, Math.max(W, H) * 0.8);
    g.addColorStop(0, '#1d3a6b'); g.addColorStop(1, '#0a1630');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (PP.state === 'menu' || !questions) { drawMenuWall(ctx, W, H); return; }
    const q = questions[qi];
    btns = [];
    // barra superiore
    PP.text(`${qi + 1}/${questions.length}`, 16, 28, 18, '#fff', 'left', 900);
    PP.text(`${score} pts${streak >= 2 ? ` · streak ${streak}` : ''}`, 16, 50, 12, 'rgba(255,255,255,.7)', 'left', 700);
    const bw = Math.min(W - 40, 520), bx = W / 2 - bw / 2;
    PP.rr(bx, 70, bw, 8, 4); ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fill();
    PP.rr(bx, 70, bw * clamp(timeLeft / TIME, 0, 1), 8, 4); ctx.fillStyle = timeLeft < 3 ? '#ff6b6b' : '#ffcc4d'; ctx.fill();

    const land = W > H * 1.2;
    if (q.mode === 'pick-name') {
      // bandiera grande + 4 nomi
      const areaH = land ? H - 110 : (H - 100) * 0.45;
      const fw = Math.min(land ? W * 0.45 : W - 60, areaH * 1.5, 520), fh = fw / ratio(q);
      const fx = land ? W * 0.27 - fw / 2 : W / 2 - fw / 2, fy = land ? 100 + (H - 120 - fh) / 2 : 100 + (areaH - fh) / 2;
      PP.text('Which country is this?', land ? W * 0.27 : W / 2, fy - 18, 16, 'rgba(255,255,255,.85)', 'center', 800);
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8; ctx.fillStyle = '#000'; ctx.fillRect(fx, fy, fw, fh); ctx.restore();
      FL.draw(ctx, q, fx, fy, fw, fh);
      const ox = land ? W * 0.55 : 16, ow = land ? W * 0.42 : W - 32, oy0 = land ? 110 : fy + fh + 30;
      const oh = Math.min(64, ((land ? H - 130 : H - oy0 - 16) - 30) / 4);
      opts.forEach((o, i) => {
        const b = { o, x: ox, y: oy0 + i * (oh + 10), w: ow, h: oh };
        btns.push(b);
        const state = !answered ? '' : o === q ? 'good' : o === picked ? 'bad' : 'dim';
        PP.rr(b.x, b.y, b.w, b.h, 14);
        ctx.fillStyle = state === 'good' ? '#2fbf71' : state === 'bad' ? '#e5484d' : state === 'dim' ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.12)'; ctx.fill();
        PP.text(o[0], b.x + b.w / 2, b.y + b.h / 2 + 1, Math.min(20, b.w / Math.max(8, o[0].length * 0.62)), state === 'dim' ? 'rgba(255,255,255,.45)' : '#fff', 'center', 800);
      });
    } else {
      PP.text(`Which is the flag of ${q[0]}?`, W / 2, 104, Math.min(22, W / 18), '#fff', 'center', 900);
      const cols = land ? 4 : 2, rows = land ? 1 : 2, gap = 16;
      const cw = (W - 32 - gap * (cols - 1)) / cols;
      const chMax = Math.min((H - 150 - gap * (rows - 1)) / rows, (cw - 16) / 1.5 + 48);
      const top0 = 130 + Math.max(0, (H - 150 - rows * chMax - gap * (rows - 1)) / 2);
      opts.forEach((o, i) => {
        const r = ratio(o);
        let fw = Math.min(cw - 16, (chMax - 16) * r), fh = fw / r;
        const cx = 16 + (i % cols) * (cw + gap) + cw / 2, cy = top0 + Math.floor(i / cols) * (chMax + gap) + chMax / 2;
        const b = { o, x: cx - cw / 2, y: cy - chMax / 2, w: cw, h: chMax };
        btns.push(b);
        const state = !answered ? '' : o === q ? 'good' : o === picked ? 'bad' : 'dim';
        PP.rr(b.x, b.y, b.w, b.h, 16); ctx.fillStyle = state === 'good' ? 'rgba(47,191,113,.35)' : state === 'bad' ? 'rgba(229,72,77,.35)' : 'rgba(255,255,255,.07)'; ctx.fill();
        if (state === 'good' || state === 'bad') { ctx.strokeStyle = state === 'good' ? '#2fbf71' : '#e5484d'; ctx.lineWidth = 4; ctx.stroke(); }
        ctx.globalAlpha = state === 'dim' ? 0.4 : 1;
        FL.draw(ctx, o, cx - fw / 2, cy - fh / 2, fw, fh);
        ctx.globalAlpha = 1;
        if (answered && (state === 'good' || state === 'bad')) PP.text(o[0], cx, cy + fh / 2 + 14, 13, '#fff', 'center', 800);
      });
    }
    if (answered && !picked) PP.text("Time's up!", W / 2, H - 24, 18, '#ff6b6b', 'center', 900);
    PP.drawFx();
  }

  let wall = null;
  function drawMenuWall(ctx, W, H) {
    if (!wall) { wall = PP.shuffle(FL.list.slice()).slice(0, 30); wall.forEach(FL.image); }
    const fw = 88, fh = 66;
    const off = (PP.time * 20) % (fw + 14);
    for (let r = 0; r < Math.ceil(H / (fh + 14)) + 1; r++) for (let c = -1; c < Math.ceil(W / (fw + 14)) + 1; c++) {
      const f = wall[(r * 7 + c + 30 * 5) % wall.length];
      ctx.globalAlpha = 0.35;
      FL.draw(ctx, f, c * (fw + 14) + (r % 2 ? off : -off) + 10, r * (fh + 14) + 10, fw, fh);
    }
    ctx.globalAlpha = 1;
  }

  function pointerDown(p) {
    if (answered) { if (feedT < 1.0) { feedT = 0; } return; }
    for (const b of btns) if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) { answer(b.o); return; }
  }
  function keyDown(code) {
    const i = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(code);
    if (i >= 0 && !answered && opts[i]) answer(opts[i]);
    if ((code === 'Enter' || code === 'Space') && answered) feedT = 0;
  }

  function demo(n) {
    region = [0, 0, 1, 3][n];
    start();
    qi = [0, 3, 2, 7][n]; score = [0, 420, 380, 1210][n]; streak = [0, 3, 2, 5][n];
    const names = { 1: 'Japan', 2: 'Germany', 3: 'Ghana' }[n];
    questions[qi] = FL.list.find(f => f[0] === names);
    ask();
    questions[qi].mode = n === 2 ? 'pick-flag' : 'pick-name';
    if (n === 2) { opts = ['Germany', 'Belgium', 'Lithuania', 'Armenia'].map(x => FL.list.find(f => f[0] === x)); }
    if (n === 3) { answer(opts.find(o => o === questions[qi])); PP.clearFx(); }
    timeLeft = [10, 6.4, 8.2, 4][n];
    PP.game.update = () => {};
  }

  function icon(c, S) {
    const g = c.createRadialGradient(S / 2, S / 2, 10, S / 2, S / 2, S * 0.7); g.addColorStop(0, '#2a4f8f'); g.addColorStop(1, '#0a1630');
    c.fillStyle = g; c.fillRect(0, 0, S, S);
    const pick = n => FL.list.find(f => f[0] === n);
    c.save(); c.translate(S * 0.42, S * 0.42); c.rotate(-0.12); FL.draw(c, pick('Japan'), -S * 0.2, -S * 0.15, S * 0.4, S * 0.3); c.restore();
    c.save(); c.translate(S * 0.58, S * 0.6); c.rotate(0.1); FL.draw(c, pick('Jamaica'), -S * 0.2, -S * 0.15, S * 0.4, S * 0.3); c.restore();
    c.fillStyle = '#ffcc4d'; c.font = `900 ${S * 0.16}px system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', S * 0.78, S * 0.3);
  }

  const realUpdate = update;
  PP.run({
    id: GAME_ID,
    title: 'Flag Quiz',
    intro: 'How well do you know the flags of the world?\n12 questions, 10 seconds each. Answer fast for bonus points.',
    choices: () => [{ label: 'Region', options: REGIONS, value: region, onChange: i => { region = i; store.set('region', i); PP.showMain(); } }],
    bestText: () => { const b = store.get(`best-${region}`, 0); return b ? `Best score (${REGIONS[region]}): ${b}` : ''; },
    pauseText: () => `Question ${qi + 1}/${questions.length} · ${score} pts`,
    init() { region = store.get('region', 0); ['Japan', 'Jamaica'].forEach(n => FL.image(FL.list.find(f => f[0] === n))); },
    start() { PP.game.update = realUpdate; start(); },
    update, draw, pointerDown, keyDown, demo, icon,
  });
})();
