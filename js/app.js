
const state = {
  data: null,
  study: { mi: 0, si: 0, di: 0 },
  random: { queue: [], idx: 0, answers: [], running: false },
  attack: { timer: null, timeLeft: 0, score: 0, pool: [], idx: 0, records: [], running: false },
};

function norm(s) {
  if (s == null) return '';
  return String(s).replace(/[\s·•・\/\-_,]/g, '').toLowerCase();
}

async function load() {
  const r = await fetch('data/data.json');
  state.data = await r.json();
  initStudy();
  initRandom();
  initAttack();
  bindTabs();
}

function bindTabs() {
  document.querySelectorAll('.tab').forEach(b=>{
    b.addEventListener('click', ()=>{
      document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      const t = b.dataset.tab;
      document.querySelectorAll('.panel').forEach(p=>p.classList.add('hidden'));
      document.getElementById('panel-'+t).classList.remove('hidden');
    });
  });
}

// ============ STUDY ============
function initStudy() {
  const mi = document.getElementById('study-middle');
  const si = document.getElementById('study-sub');
  const di = document.getElementById('study-detail');
  state.data.forEach((m, i)=>{
    const o = document.createElement('option');
    o.value = i; o.textContent = `${m.id}. ${m.title}`;
    mi.appendChild(o);
  });
  mi.addEventListener('change', ()=>{
    state.study.mi = +mi.value; state.study.si = 0; state.study.di = 0;
    fillSubs(); fillDetails(); renderStudy();
  });
  si.addEventListener('change', ()=>{
    state.study.si = +si.value; state.study.di = 0;
    fillDetails(); renderStudy();
  });
  di.addEventListener('change', ()=>{
    state.study.di = +di.value;
    renderStudy();
  });
  document.getElementById('study-prev').addEventListener('click', ()=>navStudy(-1));
  document.getElementById('study-next').addEventListener('click', ()=>navStudy(1));
  document.getElementById('study-check').addEventListener('click', checkStudy);
  document.getElementById('study-reveal').addEventListener('click', revealStudy);

  fillSubs(); fillDetails(); renderStudy();
}

function fillSubs() {
  const si = document.getElementById('study-sub');
  si.innerHTML = '';
  const m = state.data[state.study.mi];
  m.subs.forEach((s, i)=>{
    const o = document.createElement('option');
    o.value = i; o.textContent = `${s.num}. ${s.title || '(무제)'}`;
    si.appendChild(o);
  });
  si.value = state.study.si;
}

function fillDetails() {
  const di = document.getElementById('study-detail');
  di.innerHTML = '';
  const s = state.data[state.study.mi].subs[state.study.si];
  s.details.forEach((d, i)=>{
    const o = document.createElement('option');
    o.value = i; o.textContent = `${d.num}`;
    di.appendChild(o);
  });
  di.value = state.study.di;
}

function navStudy(dir) {
  const m = state.data[state.study.mi];
  const s = m.subs[state.study.si];
  let di = state.study.di + dir;
  if (di >= s.details.length) {
    if (state.study.si + 1 < m.subs.length) {
      state.study.si++; state.study.di = 0;
    } else if (state.study.mi + 1 < state.data.length) {
      state.study.mi++; state.study.si = 0; state.study.di = 0;
    }
  } else if (di < 0) {
    if (state.study.si > 0) {
      state.study.si--;
      state.study.di = state.data[state.study.mi].subs[state.study.si].details.length - 1;
    } else if (state.study.mi > 0) {
      state.study.mi--;
      state.study.si = state.data[state.study.mi].subs.length - 1;
      state.study.di = state.data[state.study.mi].subs[state.study.si].details.length - 1;
    }
  } else {
    state.study.di = di;
  }
  document.getElementById('study-middle').value = state.study.mi;
  fillSubs(); fillDetails(); renderStudy();
}

function renderStudy() {
  const m = state.data[state.study.mi];
  const s = m.subs[state.study.si];
  const d = s.details[state.study.di];
  const b = document.getElementById('study-board');
  b.innerHTML = '';
  const h = document.createElement('div');
  h.className = 'chapter-title';
  h.textContent = `${m.id}. ${m.title}`;
  b.appendChild(h);
  const sh = document.createElement('div');
  sh.className = 'sub-title';
  sh.textContent = `${s.num}. ${s.title}`;
  b.appendChild(sh);
  renderDetail(b, d, `${m.id}·${s.num}·${d.num}`);
}

function renderDetail(container, d, pathLabel) {
  // Show each line
  d.lines.forEach(ln => {
    const el = document.createElement('div');
    el.className = 'detail-line level-' + ln.level;
    // Replace 【B0】... with inputs, using d.answers
    const parts = ln.body.split(/【B(\d+)】/);
    parts.forEach((p, i) => {
      if (i % 2 === 0) {
        el.appendChild(document.createTextNode(p));
      } else {
        const idx = +p;
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'blank';
        input.dataset.idx = idx;
        const ans = d.answers[idx] || '';
        input.style.minWidth = Math.max(60, ans.length*18) + 'px';
        input.addEventListener('input', (e)=>{
          if (norm(e.target.value) === norm(ans)) {
            e.target.classList.remove('wrong');
            e.target.classList.add('correct');
          } else {
            e.target.classList.remove('correct','wrong');
          }
        });
        el.appendChild(input);
      }
    });
    container.appendChild(el);
  });
  // If first line has num marker, prepend it to the first detail-line
  // Actually we'll just leave as-is; user sees ⑴ via original body when level=detail
  // But our body for detail level may not include ⑴ marker. Let's add manually.
  // Check first child to prepend with detail num
  const firstLine = container.querySelectorAll('.detail-line.level-detail')[0];
  if (firstLine && !firstLine.textContent.trim().startsWith(d.num)) {
    firstLine.insertBefore(document.createTextNode(d.num + ' '), firstLine.firstChild);
  }
}

function checkStudy() {
  const b = document.getElementById('study-board');
  b.querySelectorAll('input.blank').forEach(inp => {
    const idx = +inp.dataset.idx;
    const d = state.data[state.study.mi].subs[state.study.si].details[state.study.di];
    const ans = d.answers[idx];
    if (norm(inp.value) === norm(ans)) {
      inp.classList.remove('wrong');
      inp.classList.add('correct');
    } else {
      inp.classList.remove('correct');
      inp.classList.add('wrong');
    }
  });
}

function revealStudy() {
  const b = document.getElementById('study-board');
  b.querySelectorAll('input.blank').forEach(inp => {
    const idx = +inp.dataset.idx;
    const d = state.data[state.study.mi].subs[state.study.si].details[state.study.di];
    inp.value = d.answers[idx];
    inp.classList.remove('wrong');
    inp.classList.add('correct');
  });
}

// ============ RANDOM ============
function initRandom() {
  const mi = document.getElementById('random-middle');
  state.data.forEach((m, i) => {
    const o = document.createElement('option');
    o.value = i; o.textContent = `${m.id}. ${m.title}`;
    mi.appendChild(o);
  });
  document.getElementById('random-start').addEventListener('click', startRandom);
  document.getElementById('random-reset').addEventListener('click', resetRandom);
}

function startRandom() {
  if (state.random.running) return;
  const mi = +document.getElementById('random-middle').value;
  const count = +document.getElementById('random-count').value || 5;
  const m = state.data[mi];
  const pool = [];
  m.subs.forEach(s => {
    s.details.forEach(d => {
      if (d.answers && d.answers.length > 0) {
        pool.push({m, s, d});
      }
    });
  });
  // shuffle
  for (let i = pool.length -1; i>0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  state.random.queue = pool.slice(0, count);
  state.random.idx = 0;
  state.random.answers = [];
  state.random.running = true;
  document.getElementById('random-result').classList.add('hidden');
  document.getElementById('random-start').disabled = true;
  renderRandom();
}

function resetRandom() {
  state.random.running = false;
  state.random.queue = [];
  state.random.idx = 0;
  state.random.answers = [];
  document.getElementById('random-board').innerHTML = '';
  document.getElementById('random-result').classList.add('hidden');
  document.getElementById('random-start').disabled = false;
}

function renderRandom() {
  const b = document.getElementById('random-board');
  b.innerHTML = '';
  if (state.random.idx >= state.random.queue.length) {
    return showRandomResult();
  }
  const it = state.random.queue[state.random.idx];
  const {m, s, d} = it;
  const header = document.createElement('div');
  header.className = 'chapter-title';
  header.textContent = `[${state.random.idx + 1}/${state.random.queue.length}] ${m.id}. ${m.title}`;
  b.appendChild(header);
  const sh = document.createElement('div');
  sh.className = 'sub-title';
  sh.textContent = `${s.num}. ${s.title}`;
  b.appendChild(sh);
  renderDetail(b, d, `${m.id}·${s.num}·${d.num}`);

  // submit button
  const btn = document.createElement('button');
  btn.textContent = state.random.idx === state.random.queue.length - 1 ? '결과 보기' : '다음 문제 ▶';
  btn.className = '';
  btn.style.cssText = 'margin-top:16px;background:rgba(255,255,255,0.12);color:var(--chalk);border:1px solid var(--chalk-yellow);border-radius:6px;padding:10px 20px;cursor:pointer;font-family:inherit;font-size:14px;';
  btn.addEventListener('click', submitRandom);
  b.appendChild(btn);
}

function submitRandom() {
  const b = document.getElementById('random-board');
  const it = state.random.queue[state.random.idx];
  const inputs = b.querySelectorAll('input.blank');
  const userAnswers = [];
  inputs.forEach(inp => {
    const idx = +inp.dataset.idx;
    userAnswers[idx] = inp.value;
  });
  state.random.answers.push({item: it, user: userAnswers});
  state.random.idx++;
  renderRandom();
}

function showRandomResult() {
  const b = document.getElementById('random-board');
  b.innerHTML = '';
  const r = document.getElementById('random-result');
  r.classList.remove('hidden');
  r.innerHTML = '';
  let totalBlanks = 0, correctBlanks = 0, perfect = 0;
  state.random.answers.forEach(rec => {
    const ans = rec.item.d.answers;
    let pCorr = true;
    ans.forEach((a, i) => {
      totalBlanks++;
      if (norm(rec.user[i] || '') === norm(a)) correctBlanks++;
      else pCorr = false;
    });
    if (pCorr) perfect++;
  });
  const sum = document.createElement('div');
  sum.className = 'result-summary';
  sum.innerHTML = `<div style="font-size:18px;font-weight:700;color:var(--chalk-yellow);margin-bottom:6px;">결과</div>
    완전 정답: <b>${perfect}</b> / ${state.random.answers.length} 문항<br>
    빈칸 정답: <b>${correctBlanks}</b> / ${totalBlanks} 개`;
  r.appendChild(sum);

  state.random.answers.forEach((rec, qi) => {
    const {item, user} = rec;
    const {m, s, d} = item;
    const div = document.createElement('div');
    const ans = d.answers;
    let pCorr = true;
    ans.forEach((a, i) => { if (norm(user[i] || '') !== norm(a)) pCorr = false; });
    div.className = 'result-item ' + (pCorr ? 'correct' : 'wrong');
    const path = document.createElement('div');
    path.className = 'qpath';
    path.textContent = `${qi+1}. ${m.id}. ${m.title} / ${s.num}. ${s.title} / ${d.num}`;
    div.appendChild(path);
    d.lines.forEach(ln => {
      const p = document.createElement('div');
      p.style.paddingLeft = ln.level === 'item' ? '1.6em' : (ln.level === 'dash' ? '2.6em' : '0');
      const parts = ln.body.split(/【B(\d+)】/);
      parts.forEach((pp, i) => {
        if (i % 2 === 0) {
          p.appendChild(document.createTextNode(pp));
        } else {
          const idx = +pp;
          const a = ans[idx];
          const u = user[idx] || '';
          const span = document.createElement('span');
          if (norm(u) === norm(a)) {
            span.className = 'ans-correct';
            span.textContent = `[${a}]`;
          } else {
            span.innerHTML = `<span class="ans-wrong">${u || '(공백)'}</span><span class="ans-correct">[${a}]</span>`;
          }
          p.appendChild(span);
        }
      });
      div.appendChild(p);
    });
    r.appendChild(div);
  });

  state.random.running = false;
  document.getElementById('random-start').disabled = false;
}

// ============ ATTACK ============
function initAttack() {
  const mi = document.getElementById('attack-middle');
  state.data.forEach((m, i) => {
    const o = document.createElement('option');
    o.value = i; o.textContent = `${m.id}. ${m.title}`;
    mi.appendChild(o);
  });
  document.getElementById('attack-start').addEventListener('click', startAttack);
  document.getElementById('attack-reset').addEventListener('click', resetAttack);
}

function startAttack() {
  if (state.attack.running) return;  // prevent multi-speed
  const miVal = document.getElementById('attack-middle').value;
  const time = +document.getElementById('attack-time').value || 60;
  // Build pool
  const pool = [];
  const targets = miVal === 'ALL' ? state.data : [state.data[+miVal]];
  targets.forEach(m => {
    m.subs.forEach(s => {
      s.details.forEach(d => {
        if (d.answers && d.answers.length > 0) {
          d.answers.forEach((a, bi) => {
            pool.push({m, s, d, bi});
          });
        }
      });
    });
  });
  // shuffle
  for (let i = pool.length-1; i>0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  state.attack.pool = pool;
  state.attack.idx = 0;
  state.attack.score = 0;
  state.attack.timeLeft = time;
  state.attack.records = [];
  state.attack.running = true;
  document.getElementById('attack-score').textContent = 0;
  document.getElementById('attack-timer').textContent = time;
  document.getElementById('attack-result').classList.add('hidden');
  document.getElementById('attack-start').disabled = true;
  document.getElementById('attack-middle').disabled = true;
  document.getElementById('attack-time').disabled = true;
  renderAttack();
  state.attack.timer = setInterval(()=>{
    state.attack.timeLeft--;
    document.getElementById('attack-timer').textContent = state.attack.timeLeft;
    if (state.attack.timeLeft <= 0) stopAttack();
  }, 1000);
}

function resetAttack() {
  if (state.attack.timer) {
    clearInterval(state.attack.timer);
    state.attack.timer = null;
  }
  state.attack.running = false;
  state.attack.pool = [];
  state.attack.records = [];
  state.attack.score = 0;
  state.attack.timeLeft = +document.getElementById('attack-time').value || 60;
  document.getElementById('attack-score').textContent = 0;
  document.getElementById('attack-timer').textContent = state.attack.timeLeft;
  document.getElementById('attack-board').innerHTML = '';
  document.getElementById('attack-result').classList.add('hidden');
  document.getElementById('attack-start').disabled = false;
  document.getElementById('attack-middle').disabled = false;
  document.getElementById('attack-time').disabled = false;
}

function stopAttack() {
  if (state.attack.timer) { clearInterval(state.attack.timer); state.attack.timer = null; }
  state.attack.running = false;
  document.getElementById('attack-board').innerHTML = '';
  document.getElementById('attack-start').disabled = false;
  document.getElementById('attack-middle').disabled = false;
  document.getElementById('attack-time').disabled = false;
  // show dedup records
  const r = document.getElementById('attack-result');
  r.classList.remove('hidden');
  r.innerHTML = '';
  const sum = document.createElement('div');
  sum.className = 'result-summary';
  const correct = state.attack.records.filter(x=>x.correct).length;
  const wrong = state.attack.records.filter(x=>!x.correct).length;
  sum.innerHTML = `<div style="font-size:18px;font-weight:700;color:var(--chalk-yellow);margin-bottom:6px;">타임어택 종료</div>
    최종 점수: <b>${state.attack.score}</b> · 정답 ${correct} · 오답 ${wrong}`;
  r.appendChild(sum);
  // Deduplicate: key = m.id|s.num|d.num|bi|userInput
  const seen = new Set();
  state.attack.records.forEach(rec => {
    const key = `${rec.m.id}|${rec.s.num}|${rec.d.num}|${rec.bi}|${rec.user}`;
    if (seen.has(key)) return;
    seen.add(key);
    const div = document.createElement('div');
    div.className = 'result-item ' + (rec.correct ? 'correct' : 'wrong');
    const path = document.createElement('div');
    path.className = 'qpath';
    path.textContent = `${rec.m.id}. ${rec.m.title} / ${rec.s.num}. ${rec.s.title} / ${rec.d.num}`;
    div.appendChild(path);
    // show the specific line with highlighted blank
    const ans = rec.d.answers[rec.bi];
    const p = document.createElement('div');
    // find which line has this blank idx
    for (const ln of rec.d.lines) {
      if (ln.body.includes(`【B${rec.bi}】`)) {
        const parts = ln.body.split(/【B(\d+)】/);
        parts.forEach((pp, i)=>{
          if (i % 2 === 0) p.appendChild(document.createTextNode(pp));
          else {
            const bidx = +pp;
            const sp = document.createElement('span');
            if (bidx === rec.bi) {
              if (rec.correct) {
                sp.className = 'ans-correct';
                sp.textContent = `[${ans}]`;
              } else {
                sp.innerHTML = `<span class="ans-wrong">${rec.user || '(공백)'}</span><span class="ans-correct">[${ans}]</span>`;
              }
            } else {
              sp.textContent = `[${rec.d.answers[bidx]}]`;
              sp.style.color = 'var(--chalk-dim)';
            }
            p.appendChild(sp);
          }
        });
        break;
      }
    }
    div.appendChild(p);
    r.appendChild(div);
  });
}

function renderAttack() {
  const b = document.getElementById('attack-board');
  b.innerHTML = '';
  if (state.attack.idx >= state.attack.pool.length) {
    return stopAttack();
  }
  const it = state.attack.pool[state.attack.idx];
  const {m, s, d, bi} = it;
  // show path
  const header = document.createElement('div');
  header.className = 'chapter-title';
  header.textContent = `${m.id}. ${m.title}`;
  b.appendChild(header);
  const sh = document.createElement('div');
  sh.className = 'sub-title';
  sh.textContent = `${s.num}. ${s.title}`;
  b.appendChild(sh);

  // Render full detail; but only the target blank is editable
  d.lines.forEach(ln => {
    const el = document.createElement('div');
    el.className = 'detail-line level-' + ln.level;
    const parts = ln.body.split(/【B(\d+)】/);
    parts.forEach((p, i) => {
      if (i % 2 === 0) {
        el.appendChild(document.createTextNode(p));
      } else {
        const idx = +p;
        if (idx === bi) {
          const input = document.createElement('input');
          input.type = 'text';
          input.className = 'blank';
          input.autofocus = true;
          const ans = d.answers[idx];
          input.style.minWidth = Math.max(60, ans.length*18) + 'px';
          input.addEventListener('keydown', (e)=>{
            if (e.key === 'Enter') {
              e.preventDefault();
              submitAttack(input.value);
            }
          });
          el.appendChild(input);
        } else {
          // fill with actual answer dimmed
          const span = document.createElement('span');
          span.textContent = d.answers[idx];
          span.style.color = 'var(--chalk-dim)';
          span.style.opacity = '0.5';
          el.appendChild(span);
        }
      }
    });
    b.appendChild(el);
  });

  // submit button
  const btn = document.createElement('button');
  btn.textContent = '입력 확인';
  btn.style.cssText = 'margin-top:16px;background:rgba(255,255,255,0.12);color:var(--chalk);border:1px solid var(--chalk-yellow);border-radius:6px;padding:10px 20px;cursor:pointer;font-family:inherit;font-size:14px;';
  btn.addEventListener('click', ()=>{
    const inp = b.querySelector('input.blank');
    if (inp) submitAttack(inp.value);
  });
  b.appendChild(btn);

  setTimeout(()=>{
    const inp = b.querySelector('input.blank');
    if (inp) inp.focus();
  }, 20);
}

function submitAttack(val) {
  const it = state.attack.pool[state.attack.idx];
  const {m, s, d, bi} = it;
  const ans = d.answers[bi];
  const correct = norm(val) === norm(ans);
  state.attack.records.push({m, s, d, bi, user: val, correct});
  if (correct) {
    state.attack.score += 10;
    flash('correct', '정답! +10');
  } else {
    state.attack.score = Math.max(0, state.attack.score - 5);
    flash('wrong', `오답 −5 · 정답: ${ans}`);
  }
  document.getElementById('attack-score').textContent = state.attack.score;
  state.attack.idx++;
  setTimeout(renderAttack, 600);
}

function flash(kind, msg) {
  const f = document.getElementById('attack-flash');
  f.className = 'flash ' + kind;
  f.textContent = msg;
  f.classList.remove('hidden');
  setTimeout(()=>f.classList.add('hidden'), 550);
}

load();
