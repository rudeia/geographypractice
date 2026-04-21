// ========= 데이터 로드 =========
let DATA = null;
let currentUnit = null;
let pages = [];          // [ [blockIdx...], [...] ]
let currentPageIdx = 0;

// 타임어택 state
let ta = {
  running: false,
  timer: null,
  remaining: 0,
  score: 0,
  correctCount: 0,
  wrongCount: 0,
  blocks: [],      // 빈칸 있는 블록만
  idx: 0,
  history: [],     // {block, userAnswers:[{ans, user, ok}], sub, marker}
  unit: null,
};

// ========= 유틸 =========
function norm(s) {
  return String(s||'').trim().replace(/\s+/g,'');
}
function checkAnswer(user, correct) {
  if (!user) return false;
  return norm(user) === norm(correct);
}

// ========= 초기화 =========
async function init() {
  const res = await fetch('data/units.json');
  DATA = await res.json();
  const sel1 = document.getElementById('unit-select');
  const sel2 = document.getElementById('ta-unit-select');
  DATA.units.forEach((u,i) => {
    const opt1 = document.createElement('option');
    opt1.value = i; opt1.textContent = `${u.id}. ${u.title}`;
    sel1.appendChild(opt1);
    sel2.appendChild(opt1.cloneNode(true));
  });

  // 탭
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.dataset.tab;
      document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
      document.getElementById('panel-' + target).classList.add('active');
    });
  });

  // 학습 모드 이벤트
  document.getElementById('reload-btn').addEventListener('click', startLearn);
  document.getElementById('check-btn').addEventListener('click', checkPage);
  document.getElementById('reveal-btn').addEventListener('click', revealPage);
  document.getElementById('prev-btn').addEventListener('click', ()=>navPage(-1));
  document.getElementById('next-btn').addEventListener('click', ()=>navPage(+1));

  // 타임어택 이벤트
  document.getElementById('ta-start').addEventListener('click', startTimeAttack);
  document.getElementById('ta-submit').addEventListener('click', submitTA);
  document.getElementById('ta-skip').addEventListener('click', skipTA);
  document.getElementById('ta-restart').addEventListener('click', () => {
    document.getElementById('ta-result').classList.add('hidden');
  });

  // 첫 단원 자동 시작
  startLearn();
}

// ========= 학습 모드 =========
function startLearn() {
  const idx = +document.getElementById('unit-select').value || 0;
  currentUnit = DATA.units[idx];
  const perPage = Math.max(3, +document.getElementById('blanks-per-page').value || 10);

  // 페이지 분할: 블록 순차로 쌓다가 빈칸 누적 >= perPage이면 page 확정, sub 경계도 강제 개행
  pages = [];
  let cur = [];
  let curBlanks = 0;
  let prevSub = null;
  currentUnit.blocks.forEach((b, i) => {
    if (prevSub !== null && b.sub !== prevSub && cur.length) {
      pages.push(cur); cur = []; curBlanks = 0;
    }
    cur.push(i);
    curBlanks += b.blanks.length;
    if (curBlanks >= perPage) {
      pages.push(cur); cur = []; curBlanks = 0;
    }
    prevSub = b.sub;
  });
  if (cur.length) pages.push(cur);

  currentPageIdx = 0;
  renderPage();
}

function renderPage() {
  const ws = document.getElementById('worksheet');
  ws.innerHTML = '';
  if (!pages.length) return;
  const page = pages[currentPageIdx];
  let prevSub = null;
  page.forEach(bi => {
    const b = currentUnit.blocks[bi];
    if (prevSub !== null && b.sub !== prevSub) {
      const div = document.createElement('div');
      div.className = 'sub-divider';
      div.textContent = '· · ·';
      ws.appendChild(div);
    }
    prevSub = b.sub;
    ws.appendChild(renderBlock(b, bi));
  });

  // 메타
  const meta = document.getElementById('page-meta');
  meta.textContent = `${currentUnit.id}. ${currentUnit.title} · 페이지 ${currentPageIdx+1}/${pages.length}`;
  document.getElementById('check-result').textContent = '';
  document.getElementById('check-result').className = 'check-result';
}

function renderBlock(b, bi) {
  const row = document.createElement('div');
  row.className = `block level-${b.level}`;
  row.dataset.blockIndex = bi;

  const marker = document.createElement('span');
  marker.className = 'marker';
  marker.textContent = b.marker;
  row.appendChild(marker);

  const body = document.createElement('span');
  body.className = 'body';
  // 본문 렌더: blanks 기준 분할
  let pos = 0;
  b.blanks.forEach((bk, bki) => {
    if (bk.start > pos) {
      body.appendChild(document.createTextNode(b.body.slice(pos, bk.start)));
    }
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.className = 'blank';
    inp.dataset.answer = bk.answer;
    inp.dataset.bi = bi;
    inp.dataset.bki = bki;
    // 너비: 답 길이에 비례
    inp.style.width = Math.max(3, bk.answer.replace(/\s/g,'').length) + 'em';
    inp.autocomplete = 'off';
    inp.spellcheck = false;
    inp.addEventListener('input', onBlankInput);
    body.appendChild(inp);
    pos = bk.end;
  });
  if (pos < b.body.length) {
    body.appendChild(document.createTextNode(b.body.slice(pos)));
  }
  row.appendChild(body);
  return row;
}

function onBlankInput(e) {
  const inp = e.target;
  if (checkAnswer(inp.value, inp.dataset.answer)) {
    inp.classList.add('correct');
    inp.classList.remove('wrong');
    inp.value = inp.dataset.answer;
    // 포커스 다음으로
    const inps = [...document.querySelectorAll('.blank:not(.correct):not(.revealed)')];
    if (inps.length) inps[0].focus();
  }
}

function checkPage() {
  const inps = document.querySelectorAll('#worksheet .blank');
  let correct = 0, wrong = 0, empty = 0;
  inps.forEach(inp => {
    if (inp.classList.contains('correct')) { correct++; return; }
    if (inp.classList.contains('revealed')) return;
    if (!inp.value.trim()) { empty++; return; }
    if (checkAnswer(inp.value, inp.dataset.answer)) {
      inp.classList.add('correct'); inp.classList.remove('wrong');
      inp.value = inp.dataset.answer;
      correct++;
    } else {
      inp.classList.add('wrong');
      wrong++;
    }
  });
  const r = document.getElementById('check-result');
  if (wrong === 0 && empty === 0) {
    r.textContent = `🎉 모두 정답! (${correct}개)`;
    r.className = 'check-result success';
  } else {
    r.textContent = `정답 ${correct}개 · 오답 ${wrong}개 · 빈칸 ${empty}개`;
    r.className = 'check-result warn';
  }
}

function revealPage() {
  const inps = document.querySelectorAll('#worksheet .blank');
  inps.forEach(inp => {
    if (inp.classList.contains('correct')) return;
    inp.value = inp.dataset.answer;
    inp.classList.remove('wrong');
    inp.classList.add('revealed');
  });
}

function navPage(delta) {
  const next = currentPageIdx + delta;
  if (next < 0 || next >= pages.length) return;
  currentPageIdx = next;
  renderPage();
  window.scrollTo({top: 0, behavior:'smooth'});
}

// ========= 타임어택 =========
function startTimeAttack() {
  const idx = +document.getElementById('ta-unit-select').value || 0;
  const secs = Math.max(10, +document.getElementById('ta-time').value || 180);
  ta.unit = DATA.units[idx];
  ta.blocks = ta.unit.blocks.filter(b => b.blanks.length > 0);
  // 섞기
  for (let i = ta.blocks.length-1; i>0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [ta.blocks[i], ta.blocks[j]] = [ta.blocks[j], ta.blocks[i]];
  }
  ta.idx = 0;
  ta.score = 0;
  ta.correctCount = 0;
  ta.wrongCount = 0;
  ta.history = [];
  ta.remaining = secs;
  ta.running = true;

  document.getElementById('ta-status').classList.remove('hidden');
  document.getElementById('ta-block').classList.remove('hidden');
  document.getElementById('ta-actions').classList.remove('hidden');
  document.getElementById('ta-result').classList.add('hidden');
  document.getElementById('ta-total').textContent = ta.blocks.length;

  updateTAStatus();
  renderTABlock();
  if (ta.timer) clearInterval(ta.timer);
  ta.timer = setInterval(() => {
    ta.remaining--;
    updateTAStatus();
    if (ta.remaining <= 0) endTA();
  }, 1000);
}

function updateTAStatus() {
  document.getElementById('ta-remaining').textContent = ta.remaining;
  document.getElementById('ta-score').textContent = ta.score;
  document.getElementById('ta-idx').textContent = Math.min(ta.idx+1, ta.blocks.length);
}

function renderTABlock() {
  if (ta.idx >= ta.blocks.length) { endTA(); return; }
  const b = ta.blocks[ta.idx];
  const ws = document.getElementById('ta-block');
  ws.innerHTML = '';
  const row = renderBlock(b, ta.idx);
  row.classList.add('level-' + b.level);
  ws.appendChild(row);
  // 첫 빈칸 포커스
  const first = ws.querySelector('.blank');
  if (first) first.focus();

  // Enter로 제출
  ws.querySelectorAll('.blank').forEach(inp => {
    // TA에서는 input 이벤트로 자동 정답 확정 X (한번에 확인)
    inp.removeEventListener('input', onBlankInput);
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); submitTA(); }
    });
  });
}

function submitTA() {
  if (!ta.running) return;
  const b = ta.blocks[ta.idx];
  const inps = document.querySelectorAll('#ta-block .blank');
  const userAnswers = [];
  let thisCorrect = 0, thisWrong = 0;
  inps.forEach(inp => {
    const user = inp.value.trim();
    const ans = inp.dataset.answer;
    const ok = checkAnswer(user, ans);
    userAnswers.push({ans, user, ok});
    if (ok) {
      ta.score += 10;
      ta.correctCount++;
      thisCorrect++;
      inp.classList.add('correct');
      inp.value = ans;
    } else {
      ta.score = Math.max(0, ta.score - 5);
      ta.wrongCount++;
      thisWrong++;
      inp.classList.add('wrong');
    }
  });
  ta.history.push({
    marker: b.marker,
    level: b.level,
    body: b.body,
    blanks: b.blanks,
    userAnswers,
    sub: b.sub,
  });
  // 플래시
  const fl = document.getElementById('ta-flash');
  if (thisWrong === 0) {
    fl.className = 'ta-flash correct';
    fl.textContent = `정답! +${thisCorrect*10}`;
  } else {
    fl.className = 'ta-flash wrong';
    fl.textContent = `오답 포함 (정답 +${thisCorrect*10} / 오답 -${thisWrong*5})`;
  }
  updateTAStatus();
  // 0.7초 후 다음
  setTimeout(() => {
    fl.textContent = '';
    ta.idx++;
    renderTABlock();
  }, 750);
}

function skipTA() {
  if (!ta.running) return;
  const b = ta.blocks[ta.idx];
  ta.history.push({
    marker: b.marker,
    level: b.level,
    body: b.body,
    blanks: b.blanks,
    userAnswers: b.blanks.map(bk => ({ans: bk.answer, user: '', ok: false})),
    sub: b.sub,
    skipped: true,
  });
  ta.idx++;
  renderTABlock();
}

function endTA() {
  ta.running = false;
  clearInterval(ta.timer);
  document.getElementById('ta-status').classList.add('hidden');
  document.getElementById('ta-block').classList.add('hidden');
  document.getElementById('ta-actions').classList.add('hidden');
  const res = document.getElementById('ta-result');
  res.classList.remove('hidden');
  document.getElementById('ta-final-score').textContent = ta.score;
  document.getElementById('ta-final-correct').textContent = ta.correctCount;
  document.getElementById('ta-final-wrong').textContent = ta.wrongCount;

  // 히스토리 렌더
  const hbox = document.getElementById('ta-history');
  hbox.innerHTML = '';
  if (!ta.history.length) {
    hbox.innerHTML = '<div class="history-item">기록이 없습니다.</div>';
    return;
  }
  ta.history.forEach(h => {
    const item = document.createElement('div');
    const allCorrect = h.userAnswers.every(u=>u.ok);
    item.className = 'history-item ' + (allCorrect ? 'correct' : 'wrong');
    // 본문 렌더
    let html = `<span class="h-marker">${h.marker}</span> `;
    let pos = 0;
    h.blanks.forEach((bk, i) => {
      if (bk.start > pos) html += escapeHtml(h.body.slice(pos, bk.start));
      const u = h.userAnswers[i];
      if (u.ok) {
        html += `<span class="h-answer">[${escapeHtml(bk.answer)}]</span>`;
      } else {
        if (u.user) html += `<span class="h-user-wrong">[${escapeHtml(u.user)}]</span> → <span class="h-answer">[${escapeHtml(bk.answer)}]</span>`;
        else html += `<span class="h-answer">[${escapeHtml(bk.answer)}]</span>`;
      }
      pos = bk.end;
    });
    if (pos < h.body.length) html += escapeHtml(h.body.slice(pos));
    item.innerHTML = html;
    hbox.appendChild(item);
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

// ========= 실행 =========
init();
