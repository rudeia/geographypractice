// ===== 세계시민과 지리 빈칸 학습 앱 =====
const state = {
  rawData: null,         // units.json 로드 결과
  unitId: null,          // 현재 선택 단원 id
  pages: [],             // 학습 모드: 페이지별 블록 배열
  pageIdx: 0,
  blanksPerPage: 10,
  // 타임어택
  ta: {
    timer: null,
    timeLeft: 0,
    score: 0,
    right: 0,
    wrong: 0,
    queue: [],     // 출제 대기열 (블록 안의 빈칸 단위)
    current: null, // 현재 문제
    log: [],
  }
};

const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

// ===== 초기 로드 =====
async function init() {
  const res = await fetch('data/units.json');
  state.rawData = await res.json();

  // 단원 셀렉트 채움
  const ul = state.rawData.units_list;
  const unitSelect = $('#unit-select');
  const taUnitSelect = $('#ta-unit-select');
  for (const u of ul) {
    const opt = document.createElement('option');
    opt.value = u.id;
    opt.textContent = `${u.id}. ${u.title}`;
    unitSelect.appendChild(opt);
    taUnitSelect.appendChild(opt.cloneNode(true));
  }
  state.unitId = ul[0].id;
  unitSelect.value = state.unitId;
  taUnitSelect.value = state.unitId;

  // 이벤트
  $$('.tab').forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));
  unitSelect.addEventListener('change', e => { state.unitId = e.target.value; loadStudy(); });
  $('#blanks-per-page').addEventListener('change', e => {
    state.blanksPerPage = Math.max(3, Math.min(40, parseInt(e.target.value)||10));
    loadStudy();
  });
  $('#btn-reload').addEventListener('click', loadStudy);
  $('#btn-prev').addEventListener('click', () => changePage(-1));
  $('#btn-next').addEventListener('click', () => changePage(1));
  $('#btn-check').addEventListener('click', checkAll);
  $('#btn-reveal').addEventListener('click', revealAll);
  $('#ta-start').addEventListener('click', startTimeAttack);
  $('#ta-submit').addEventListener('click', submitTA);
  $('#ta-again').addEventListener('click', () => {
    $('#ta-result').classList.add('hidden');
  });
  $('#ta-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); submitTA(); }
  });

  state.blanksPerPage = parseInt($('#blanks-per-page').value) || 10;
  loadStudy();
}

function switchTab(name) {
  $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  $$('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-'+name));
}

// ===== 학습 모드 =====
function getChapter(id) {
  for (const u of state.rawData.units) {
    for (const c of u.chapters) {
      if (c.id === id) return c;
    }
  }
  return null;
}

function loadStudy() {
  const chapter = getChapter(state.unitId);
  if (!chapter) return;
  // 블록을 페이지로 분할: 빈칸 수가 blanksPerPage에 도달하면 다음 페이지
  const pages = [];
  let currentPage = [];
  let blanksInPage = 0;
  for (const b of chapter.blocks) {
    const bb = b.answers.length;
    // 현재 블록을 넣으면 초과하는 경우, 현재 페이지가 비어있지 않다면 분리
    if (blanksInPage > 0 && blanksInPage + bb > state.blanksPerPage) {
      pages.push(currentPage);
      currentPage = [];
      blanksInPage = 0;
    }
    currentPage.push(b);
    blanksInPage += bb;
  }
  if (currentPage.length > 0) pages.push(currentPage);
  state.pages = pages;
  state.pageIdx = 0;
  renderStudyPage();
}

function renderStudyPage() {
  const ws = $('#worksheet');
  const chapter = getChapter(state.unitId);
  const page = state.pages[state.pageIdx] || [];

  ws.innerHTML = '';
  const title = document.createElement('div');
  title.className = 'chapter-title';
  title.textContent = `${chapter.id}. ${chapter.title}`;
  ws.appendChild(title);

  // 블록 렌더 + l1 변경 시 section-break 삽입
  let lastL1 = '';
  let lastL2 = '';
  for (const b of page) {
    if (b.l1 && b.l1 !== lastL1 && lastL1 !== '') {
      const br = document.createElement('div');
      br.className = 'section-break';
      br.textContent = '· · ·';
      ws.appendChild(br);
    }
    lastL1 = b.l1;
    const div = document.createElement('div');
    div.className = `block level-${b.level}`;
    // 마커
    if (b.level === 1) {
      // 원본: "1." 형태
      div.appendChild(txt(`${b.marker} `));
    } else if (b.level === 2) {
      const m = document.createElement('span');
      m.className = 'marker';
      m.textContent = `${b.marker} `;
      div.appendChild(m);
    } else if (b.level === 3) {
      const m = document.createElement('span');
      m.className = 'marker';
      m.textContent = `${b.marker} `;
      div.appendChild(m);
    } else if (b.level === 4) {
      const m = document.createElement('span');
      m.className = 'marker';
      m.textContent = '- ';
      div.appendChild(m);
    }
    // 파츠
    for (const p of b.parts) {
      if (p.type === 'text') {
        div.appendChild(txt(p.text));
      } else {
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.className = 'blank';
        inp.dataset.answer = p.answer;
        inp.autocomplete = 'off';
        inp.style.width = Math.max(60, p.answer.length * 16) + 'px';
        inp.addEventListener('input', () => {
          const v = normalize(inp.value);
          if (v === normalize(p.answer)) {
            inp.classList.add('correct');
            inp.classList.remove('wrong');
            inp.value = p.answer;
            updateScore();
            // 다음 빈칸 포커스
            const blanks = $$('#worksheet .blank');
            const idx = blanks.indexOf(inp);
            if (idx >= 0 && idx < blanks.length - 1) {
              for (let i = idx+1; i < blanks.length; i++) {
                if (!blanks[i].classList.contains('correct') && !blanks[i].classList.contains('revealed')) {
                  blanks[i].focus();
                  break;
                }
              }
            }
          } else {
            inp.classList.remove('wrong');
          }
        });
        div.appendChild(inp);
      }
    }
    ws.appendChild(div);
  }

  // 페이지 정보
  $('#page-indicator').textContent = `${state.pageIdx + 1} / ${state.pages.length} 페이지`;
  updateScore();
}

function txt(s) { return document.createTextNode(s); }

function normalize(s) {
  return (s || '').replace(/\s+/g, '').trim();
}

function updateScore() {
  const blanks = $$('#worksheet .blank');
  const correct = blanks.filter(b => b.classList.contains('correct')).length;
  const revealed = blanks.filter(b => b.classList.contains('revealed')).length;
  $('#score-indicator').textContent = `정답 ${correct} · 빈칸 ${blanks.length}`;
}

function changePage(delta) {
  const n = state.pages.length;
  if (n === 0) return;
  state.pageIdx = Math.max(0, Math.min(n - 1, state.pageIdx + delta));
  renderStudyPage();
  window.scrollTo({top: 0, behavior: 'smooth'});
}

function checkAll() {
  const blanks = $$('#worksheet .blank');
  let right = 0, wrong = 0;
  for (const inp of blanks) {
    if (inp.classList.contains('correct') || inp.classList.contains('revealed')) { right++; continue; }
    const v = normalize(inp.value);
    const a = normalize(inp.dataset.answer);
    if (!v) continue;
    if (v === a) {
      inp.classList.add('correct');
      inp.value = inp.dataset.answer;
      right++;
    } else {
      inp.classList.add('wrong');
      wrong++;
    }
  }
  const msg = `✅ 정답 ${right}개 · ❌ 오답 ${wrong}개`;
  $('#score-indicator').textContent = msg;
}

function revealAll() {
  if (!confirm('남은 빈칸의 정답을 모두 표시할까요?')) return;
  $$('#worksheet .blank').forEach(inp => {
    if (!inp.classList.contains('correct')) {
      inp.classList.add('revealed');
      inp.value = inp.dataset.answer;
    }
  });
}

// ===== 타임어택 =====
function startTimeAttack() {
  const unitId = $('#ta-unit-select').value;
  const chapter = getChapter(unitId);
  if (!chapter) return;
  // 블록 안에 빈칸이 있는 것만 출제
  const pool = [];
  for (const b of chapter.blocks) {
    if (!b.answers || b.answers.length === 0) continue;
    // 블록 내 각 빈칸을 별도 문제로
    const parts = b.parts;
    let blankIdx = 0;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (p.type !== 'blank') continue;
      // 해당 빈칸만 빈칸이고 다른 빈칸은 정답 표시된 버전
      const displayParts = parts.map((pp, j) => {
        if (pp.type === 'text') return {type:'text', text: pp.text};
        if (j === i) return {type:'blank', answer: pp.answer};
        return {type:'text', text: pp.answer}; // 다른 빈칸은 정답 표시
      });
      pool.push({
        block: b,
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        answer: p.answer,
        parts: displayParts,
      });
      blankIdx++;
    }
  }
  // 셔플
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i+1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const time = Math.max(30, Math.min(1800, parseInt($('#ta-time').value) || 180));
  state.ta = {
    timer: null, timeLeft: time, score: 0, right: 0, wrong: 0,
    queue: pool, current: null, log: [],
    totalTime: time,
  };

  $('#ta-play').classList.remove('hidden');
  $('#ta-result').classList.add('hidden');
  updateTAHud();
  nextTAQuestion();

  state.ta.timer = setInterval(() => {
    state.ta.timeLeft--;
    if (state.ta.timeLeft <= 0) { endTA(); return; }
    updateTAHud();
  }, 1000);
}

function updateTAHud() {
  $('#ta-timer').textContent = state.ta.timeLeft + '초';
  $('#ta-score').textContent = state.ta.score + '점';
}

function nextTAQuestion() {
  if (state.ta.queue.length === 0) { endTA(); return; }
  state.ta.current = state.ta.queue.shift();
  const q = $('#ta-question');
  q.innerHTML = '';
  const hint = document.createElement('span');
  hint.className = 'chapter-hint';
  hint.textContent = `[${state.ta.current.chapterId}. ${state.ta.current.chapterTitle}] — ${state.ta.current.block.l1 || ''}`;
  q.appendChild(hint);
  for (const p of state.ta.current.parts) {
    if (p.type === 'text') {
      q.appendChild(document.createTextNode(p.text));
    } else {
      const span = document.createElement('span');
      span.className = 'ta-blank';
      span.textContent = '____';
      q.appendChild(span);
    }
  }
  $('#ta-input').value = '';
  $('#ta-input').focus();
}

function submitTA() {
  if (!state.ta.current) return;
  const input = $('#ta-input');
  const v = normalize(input.value);
  if (!v) return;
  const a = normalize(state.ta.current.answer);
  const flash = $('#ta-flash');
  flash.className = 'ta-flash';
  const rec = {
    chapterId: state.ta.current.chapterId,
    chapterTitle: state.ta.current.chapterTitle,
    parts: state.ta.current.parts,
    answer: state.ta.current.answer,
    userInput: input.value.trim(),
    correct: v === a,
  };
  state.ta.log.push(rec);
  if (v === a) {
    state.ta.score += 10;
    state.ta.right++;
    flash.textContent = '정답! +10';
    flash.classList.add('show','good');
  } else {
    state.ta.score = Math.max(0, state.ta.score - 5);
    state.ta.wrong++;
    flash.textContent = `오답 -5 · 정답: ${state.ta.current.answer}`;
    flash.classList.add('show','bad');
  }
  updateTAHud();
  setTimeout(() => {
    flash.classList.remove('show');
    nextTAQuestion();
  }, 700);
}

function endTA() {
  if (state.ta.timer) clearInterval(state.ta.timer);
  state.ta.timer = null;
  $('#ta-play').classList.add('hidden');
  $('#ta-result').classList.remove('hidden');
  $('#ta-final-score').textContent = state.ta.score;
  $('#ta-right').textContent = state.ta.right;
  $('#ta-wrong').textContent = state.ta.wrong;

  const log = $('#ta-log');
  log.innerHTML = '';
  if (state.ta.log.length === 0) {
    log.innerHTML = '<p style="color:var(--chalk-text-dim)">풀이 기록이 없습니다.</p>';
    return;
  }
  for (const r of state.ta.log) {
    const item = document.createElement('div');
    item.className = 'ta-log-item ' + (r.correct ? 'correct' : 'wrong');
    const ctx = document.createElement('span');
    ctx.className = 'ctx';
    ctx.textContent = `[${r.chapterId}. ${r.chapterTitle}]`;
    item.appendChild(ctx);
    // 문장 재구성 (정답 채움)
    const text = document.createElement('div');
    for (const p of r.parts) {
      if (p.type === 'text') {
        text.appendChild(document.createTextNode(p.text));
      } else {
        const span = document.createElement('span');
        span.className = 'ans-ok';
        span.textContent = `[${p.answer}]`;
        text.appendChild(span);
      }
    }
    item.appendChild(text);
    if (!r.correct) {
      const mine = document.createElement('div');
      mine.style.fontSize = '12px';
      mine.style.marginTop = '4px';
      mine.innerHTML = `내 입력: <span class="ans-bad">${escapeHtml(r.userInput || '(빈칸)')}</span> · 정답: <span class="ans-ok">${escapeHtml(r.answer)}</span>`;
      item.appendChild(mine);
    }
    log.appendChild(item);
  }
}

function escapeHtml(s) {
  return String(s).replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'})[c]);
}

// 시작
init();
