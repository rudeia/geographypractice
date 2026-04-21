
// ===== 데이터 로드 =====
let DATA = null;
let currentUnit = 0, currentPage = 0;

// 공백 제거 정규화
function norm(s) {
  return (s||'').replace(/\s+/g, '').toLowerCase();
}

// ===== 초기화 =====
async function init() {
  const res = await fetch('data/units.json');
  DATA = await res.json();

  // 탭 전환
  document.querySelectorAll('.tab').forEach(t => {
    t.addEventListener('click', () => switchTab(t.dataset.tab));
  });

  // 단원 셀렉트 채우기
  const unitSel = document.getElementById('unitSel');
  const taUnitSel = document.getElementById('taUnitSel');
  DATA.units.forEach((u, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `${u.id}. ${u.title}`;
    unitSel.appendChild(opt);

    const opt2 = opt.cloneNode(true);
    taUnitSel.appendChild(opt2);
  });

  unitSel.addEventListener('change', () => {
    currentUnit = parseInt(unitSel.value);
    currentPage = 0;
    rebuildChapterSelect();
    renderStudy();
  });
  document.getElementById('chapSel').addEventListener('change', onChapterChange);
  document.getElementById('pageSel').addEventListener('change', onPageChange);

  document.getElementById('prevBtn').addEventListener('click', () => movePage(-1));
  document.getElementById('nextBtn').addEventListener('click', () => movePage(1));
  document.getElementById('checkBtn').addEventListener('click', checkAll);
  document.getElementById('revealBtn').addEventListener('click', revealAll);

  document.getElementById('taStartBtn').addEventListener('click', startTimeAttack);

  rebuildChapterSelect();
  renderStudy();
}

// ===== 학습 탭 =====
function rebuildChapterSelect() {
  const u = DATA.units[currentUnit];
  const chapSel = document.getElementById('chapSel');
  chapSel.innerHTML = '';
  // 중단원 고유 title 추출 (L1 제목)
  const chapters = [];
  const seen = new Set();
  u.pages.forEach((p, idx) => {
    if (!seen.has(p.title)) {
      seen.add(p.title);
      chapters.push({title: p.title, firstIdx: idx});
    }
  });
  chapters.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.firstIdx;
    opt.textContent = c.title;
    chapSel.appendChild(opt);
  });
  // 현재 페이지의 중단원 선택
  const cur = u.pages[currentPage];
  chapSel.value = chapters.find(c => c.title === cur.title).firstIdx;
  rebuildPageSelect();
}

function rebuildPageSelect() {
  const u = DATA.units[currentUnit];
  const pageSel = document.getElementById('pageSel');
  pageSel.innerHTML = '';
  const chapTitle = u.pages[currentPage].title;
  u.pages.forEach((p, idx) => {
    if (p.title === chapTitle) {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = p.sub || `(${idx+1})`;
      pageSel.appendChild(opt);
    }
  });
  pageSel.value = currentPage;
}

function onChapterChange() {
  currentPage = parseInt(document.getElementById('chapSel').value);
  rebuildPageSelect();
  renderStudy();
}
function onPageChange() {
  currentPage = parseInt(document.getElementById('pageSel').value);
  renderStudy();
}
function movePage(delta) {
  const u = DATA.units[currentUnit];
  const next = currentPage + delta;
  if (next < 0 || next >= u.pages.length) return;
  currentPage = next;
  rebuildChapterSelect();
  renderStudy();
}

function renderStudy() {
  const u = DATA.units[currentUnit];
  const p = u.pages[currentPage];
  const area = document.getElementById('studyArea');
  document.getElementById('studyResult').className = 'result';
  document.getElementById('studyResult').textContent = '';

  const html = [`<div class="page-title">${escapeHtml(p.title)} ${escapeHtml(p.sub)}</div>`];
  p.blocks.forEach(blk => {
    html.push(renderBlock(blk));
  });
  area.innerHTML = html.join('');

  // 빈칸 이벤트 바인딩
  area.querySelectorAll('input.blank').forEach(inp => {
    inp.addEventListener('input', () => {
      const ans = inp.dataset.ans;
      if (norm(inp.value) === norm(ans)) {
        markCorrect(inp);
        focusNext(inp);
      } else {
        inp.classList.remove('wrong');
      }
    });
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const ans = inp.dataset.ans;
        if (norm(inp.value) === norm(ans)) {
          markCorrect(inp);
          focusNext(inp);
        } else if (inp.value) {
          inp.classList.add('wrong');
          setTimeout(() => inp.classList.remove('wrong'), 500);
        }
      }
    });
  });
}

function renderBlock(blk) {
  const cls = `block block-lv${blk.lv}`;
  let inner = '';
  blk.segs.forEach(s => {
    if (s.b) {
      const width = Math.max(s.a.length * 1.4, 3.5);
      inner += `<span class="blank-wrap"><input type="text" class="blank" data-ans="${escapeHtml(s.a)}" style="width:${width}em"/>${escapeHtml(s.s||'')}</span>`;
    } else {
      inner += escapeHtml(s.v);
    }
  });
  return `<div class="${cls}"><span class="marker marker-lv${blk.lv}">${escapeHtml(blk.mk)}</span><span class="block-text">${inner}</span></div>`;
}

function markCorrect(inp) {
  inp.classList.add('correct');
  inp.classList.remove('wrong');
  inp.value = inp.dataset.ans;
  // 정답 뱃지 추가 (이미 있으면 skip)
  if (!inp.parentNode.querySelector('.correct-badge')) {
    const badge = document.createElement('span');
    badge.className = 'correct-badge';
    badge.textContent = '정답';
    inp.parentNode.appendChild(badge);
    setTimeout(() => badge.remove(), 1200);
  }
}
function focusNext(inp) {
  const all = [...document.querySelectorAll('input.blank:not(.correct)')];
  const idx = all.indexOf(inp);
  if (idx >= 0 && idx + 1 < all.length) all[idx+1].focus();
}

function checkAll() {
  const inputs = document.querySelectorAll('#studyArea input.blank');
  let correct = 0, wrong = 0, empty = 0;
  inputs.forEach(inp => {
    if (inp.classList.contains('correct')) { correct++; return; }
    if (!inp.value.trim()) { empty++; return; }
    if (norm(inp.value) === norm(inp.dataset.ans)) {
      markCorrect(inp);
      correct++;
    } else {
      inp.classList.add('wrong');
      wrong++;
    }
  });
  const r = document.getElementById('studyResult');
  r.className = 'result show';
  r.textContent = `정답 ${correct}개 · 오답 ${wrong}개 · 미입력 ${empty}개`;
}

function revealAll() {
  document.querySelectorAll('#studyArea input.blank').forEach(inp => {
    if (!inp.classList.contains('correct')) {
      inp.value = inp.dataset.ans;
      inp.classList.add('correct');
    }
  });
}

function escapeHtml(s) {
  return (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ===== 탭 전환 =====
function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById(name + 'Tab').classList.add('active');
}

// ===== 타임어택 =====
let taState = null;

function collectAllBlanks(unitSel) {
  const blanks = [];
  const units = unitSel === 'all' ? DATA.units : [DATA.units[parseInt(unitSel)]];
  units.forEach(u => {
    u.pages.forEach(p => {
      p.blocks.forEach(blk => {
        // 빈칸이 있는 블록만
        const hasBlank = blk.segs.some(s => s.b);
        if (!hasBlank) return;
        blanks.push({
          unit: u.id,
          unitTitle: u.title,
          pageTitle: p.title,
          sub: p.sub,
          block: blk,
        });
      });
    });
  });
  return blanks;
}

function startTimeAttack() {
  const sec = parseInt(document.getElementById('timeSec').value) || 60;
  const unitVal = document.getElementById('taUnitSel').value;
  const pool = collectAllBlanks(unitVal);
  if (pool.length === 0) { alert('빈칸이 없습니다'); return; }

  taState = {
    remaining: sec,
    score: 0,
    pool: pool,
    history: [],
    running: true,
    currentIdx: -1,
  };

  document.getElementById('taReview').innerHTML = '';
  document.getElementById('taFeedback').textContent = '';
  document.getElementById('taFeedback').className = 'ta-feedback';
  updateTAStatus();

  nextTAQuestion();

  // 타이머
  taState.timer = setInterval(() => {
    taState.remaining--;
    updateTAStatus();
    if (taState.remaining <= 0) endTimeAttack();
  }, 1000);
}

function updateTAStatus() {
  document.getElementById('taTime').textContent = taState.remaining;
  document.getElementById('taScore').textContent = taState.score;
}

function nextTAQuestion() {
  if (!taState || !taState.running) return;
  // 랜덤 선택 (같은 문제 연속 회피)
  let idx;
  if (taState.pool.length === 1) idx = 0;
  else {
    do { idx = Math.floor(Math.random() * taState.pool.length); }
    while (idx === taState.currentIdx);
  }
  taState.currentIdx = idx;
  const q = taState.pool[idx];

  const area = document.getElementById('taArea');
  area.innerHTML = `<div class="page-title">${escapeHtml(q.unit)} ${escapeHtml(q.unitTitle)} · ${escapeHtml(q.pageTitle)} ${escapeHtml(q.sub)}</div>` + renderBlock(q.block);

  const inp = area.querySelector('input.blank');
  if (inp) {
    inp.focus();
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitTAAnswer(inp, q);
      }
    });
  }
}

function submitTAAnswer(inp, q) {
  if (!taState || !taState.running) return;
  const userVal = inp.value.trim();
  const ans = inp.dataset.ans;
  const isCorrect = norm(userVal) === norm(ans);

  const fb = document.getElementById('taFeedback');
  if (isCorrect) {
    taState.score += 10;
    fb.textContent = `정답! +10`;
    fb.className = 'ta-feedback correct';
  } else {
    taState.score = Math.max(0, taState.score - 5);
    fb.textContent = `오답 -5 · 정답: ${ans}`;
    fb.className = 'ta-feedback wrong';
  }
  taState.history.push({q: q, user: userVal, ans: ans, correct: isCorrect});
  updateTAStatus();

  setTimeout(() => {
    fb.textContent = '';
    fb.className = 'ta-feedback';
    nextTAQuestion();
  }, 700);
}

function endTimeAttack() {
  if (!taState) return;
  taState.running = false;
  clearInterval(taState.timer);
  document.getElementById('taArea').innerHTML = `<div class="page-title">🏁 종료! 최종 점수: ${taState.score}</div>`;

  // 풀이 기록
  const review = document.getElementById('taReview');
  const cntC = taState.history.filter(h=>h.correct).length;
  const cntW = taState.history.length - cntC;
  let html = `<h3>풀이 기록 (정답 ${cntC} · 오답 ${cntW})</h3>`;
  taState.history.forEach(h => {
    const cls = h.correct ? 'correct' : 'wrong';
    // 블록 렌더: 정답이 표시된 형태로
    let content = '';
    h.q.block.segs.forEach(s => {
      if (s.b) {
        if (h.correct) {
          content += `<span class="rv-ans-correct">[${escapeHtml(s.a)}]</span>${escapeHtml(s.s||'')}`;
        } else {
          content += `<span class="rv-ans-wrong">[${escapeHtml(h.user || '(빈칸)')}]</span> → <span class="rv-ans-correct">[${escapeHtml(s.a)}]</span>${escapeHtml(s.s||'')}`;
        }
      } else {
        content += escapeHtml(s.v);
      }
    });
    html += `<div class="review-item ${cls}"><div class="rv-header">${escapeHtml(h.q.unit)} · ${escapeHtml(h.q.pageTitle)} ${escapeHtml(h.q.sub)}</div><div>${escapeHtml(h.q.block.mk)} ${content}</div></div>`;
  });
  review.innerHTML = html;
}

init();
