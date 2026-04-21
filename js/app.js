// ============ 전역 상태 ============
let UNITS_DATA = null;
const state = {
  study: { unitId: null, blanks: [], sentences: [] },
  ta: {
    unitId: null, running: false, remain: 0, timer: null, score: 0,
    correctCount: 0, wrongCount: 0,
    queue: [], current: null,
    history: [],  // {sectionHeader, sentenceHTML, userAnswer, correctAnswer, isCorrect}
  }
};

// ============ 초기 로드 ============
fetch('data/units.json').then(r => r.json()).then(data => {
  UNITS_DATA = data;
  initUnitSelects();
  loadStudy();
});

function initUnitSelects() {
  ['#unit-select', '#ta-unit-select'].forEach(sel => {
    const el = document.querySelector(sel);
    el.innerHTML = UNITS_DATA.units.map(u =>
      `<option value="${u.id}">${u.id} ${u.title}</option>`).join('');
  });
  state.study.unitId = UNITS_DATA.units[0].id;
  state.ta.unitId = UNITS_DATA.units[0].id;
}

// ============ 탭 전환 ============
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

// ============ 유틸 ============
function getUnit(id) { return UNITS_DATA.units.find(u => u.id === id); }
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ============ 학습 모드 ============
const studyArea = document.getElementById('study-area');
const studyFeedback = document.getElementById('study-feedback');

document.getElementById('unit-select').addEventListener('change', e => {
  state.study.unitId = e.target.value;
  loadStudy();
});
document.getElementById('blank-count').addEventListener('change', loadStudy);
document.getElementById('btn-new').addEventListener('click', loadStudy);
document.getElementById('btn-submit').addEventListener('click', submitStudy);
document.getElementById('btn-reveal').addEventListener('click', revealStudy);

function loadStudy() {
  studyFeedback.textContent = '';
  studyFeedback.className = 'feedback';
  const unit = getUnit(state.study.unitId);
  if (!unit) return;
  const desired = parseInt(document.getElementById('blank-count').value) || 10;

  // 섹션별 문장을 모으되, 섹션 정보 보존
  const allSentencesWithBlank = [];
  unit.sections.forEach((sec, si) => {
    sec.sentences.forEach(sent => {
      const blankTokens = sent.tokens.filter(t => t.blank_ok);
      if (blankTokens.length > 0) {
        allSentencesWithBlank.push({ sent, sec, secIndex: si });
      }
    });
  });

  if (allSentencesWithBlank.length === 0) {
    studyArea.innerHTML = '<div class="ws-sentence">이 단원에는 빈칸을 만들 수 있는 문장이 없습니다.</div>';
    return;
  }

  // 빈칸 개수만큼 문장 랜덤 선택 (문장당 1빈칸 우선)
  const picked = shuffle(allSentencesWithBlank).slice(0, desired);
  // 섹션 순서대로 정렬 (원래 순서 보존)
  picked.sort((a, b) => {
    if (a.secIndex !== b.secIndex) return a.secIndex - b.secIndex;
    return 0;
  });

  // 렌더링
  let html = '';
  let prevSecIndex = -1;
  const blanks = [];
  picked.forEach((item, idx) => {
    const { sent, sec, secIndex } = item;
    if (secIndex !== prevSecIndex) {
      if (prevSecIndex !== -1) {
        html += `<div class="ws-divider">· · ·</div>`;
      }
      html += `<div class="ws-section-header">${escapeHtml(sec.header)}</div>`;
      prevSecIndex = secIndex;
    }
    // 문장 내 빈칸 하나 선택
    const blankTokens = sent.tokens.filter(t => t.blank_ok);
    const chosen = blankTokens[Math.floor(Math.random() * blankTokens.length)];
    const blankId = `bl-${idx}`;
    blanks.push({ id: blankId, answer: chosen.core });
    const parts = sent.tokens.map(t => {
      if (t === chosen) {
        const w = Math.max(3, chosen.core.length + 1);
        return `<input class="blank" id="${blankId}" data-answer="${escapeHtml(chosen.core)}" size="${w}" autocomplete="off" />` +
               escapeHtml(t.trail || '') + (t.josa ? `<span class="josa">${escapeHtml(t.josa)}</span>` : '');
      }
      return escapeHtml(t.raw);
    });
    html += `<div class="ws-sentence">· ${parts.join(' ')}</div>`;
  });
  studyArea.innerHTML = html;
  state.study.blanks = blanks;

  // 실시간 체크
  studyArea.querySelectorAll('.blank').forEach(inp => {
    inp.addEventListener('input', () => {
      const ans = inp.dataset.answer;
      if (inp.value.trim() === ans) {
        inp.classList.add('correct');
        inp.classList.remove('wrong');
        inp.readOnly = true;
      } else {
        inp.classList.remove('wrong');
      }
    });
  });
}

function submitStudy() {
  const inputs = studyArea.querySelectorAll('.blank');
  let ok = 0, bad = 0;
  inputs.forEach(inp => {
    const ans = inp.dataset.answer;
    const val = inp.value.trim();
    if (val === ans) {
      inp.classList.add('correct'); inp.classList.remove('wrong');
      inp.readOnly = true; ok++;
    } else if (val === '') {
      inp.classList.remove('correct', 'wrong');
    } else {
      inp.classList.add('wrong'); inp.classList.remove('correct');
      bad++;
    }
  });
  studyFeedback.className = 'feedback ' + (bad === 0 && ok > 0 ? 'ok' : 'bad');
  if (ok > 0 && bad === 0) {
    studyFeedback.innerHTML = `<span class="summary">🎉 모두 정답! (${ok}/${inputs.length})</span>`;
  } else {
    studyFeedback.innerHTML = `<span class="summary">정답 ${ok}개 · 오답 ${bad}개 — 빨간 칸을 다시 풀어보세요.</span>`;
  }
}

function revealStudy() {
  const inputs = studyArea.querySelectorAll('.blank');
  inputs.forEach(inp => {
    if (!inp.classList.contains('correct')) {
      inp.value = inp.dataset.answer;
      inp.classList.add('revealed');
      inp.classList.remove('wrong');
      inp.readOnly = true;
    }
  });
  studyFeedback.className = 'feedback';
  studyFeedback.innerHTML = `<span class="summary">정답을 표시했습니다.</span>`;
}

// ============ 타임어택 ============
const taArea = document.getElementById('ta-area');
const taReview = document.getElementById('ta-review');
const taReviewList = document.getElementById('ta-review-list');

document.getElementById('ta-unit-select').addEventListener('change', e => {
  state.ta.unitId = e.target.value;
});
document.getElementById('ta-start').addEventListener('click', startTA);
document.getElementById('ta-stop').addEventListener('click', () => stopTA(true));

function startTA() {
  const unit = getUnit(state.ta.unitId);
  if (!unit) return;
  const timeLimit = parseInt(document.getElementById('ta-time').value) || 60;
  state.ta.running = true;
  state.ta.remain = timeLimit;
  state.ta.score = 0;
  state.ta.correctCount = 0;
  state.ta.wrongCount = 0;
  state.ta.history = [];
  // 가능한 모든 문장 모음
  const pool = [];
  unit.sections.forEach(sec => {
    sec.sentences.forEach(sent => {
      if (sent.tokens.some(t => t.blank_ok)) {
        pool.push({ sent, sec });
      }
    });
  });
  state.ta.queue = shuffle(pool);
  taReview.classList.add('hidden');
  updateTAHud();
  nextTAQuestion();
  clearInterval(state.ta.timer);
  state.ta.timer = setInterval(() => {
    state.ta.remain--;
    if (state.ta.remain <= 0) {
      state.ta.remain = 0; stopTA(false);
    }
    updateTAHud();
  }, 1000);
}

function stopTA(userStopped) {
  state.ta.running = false;
  clearInterval(state.ta.timer);
  updateTAHud();
  taArea.innerHTML = `<div class="ws-sentence" style="padding:20px 0; text-align:center; color:#2d6ab2; font-weight:700;">
    ${userStopped ? '⏸ 종료됨' : '⏰ 시간 종료!'} · 최종 점수 <b>${state.ta.score}</b>점
    (정답 ${state.ta.correctCount} / 오답 ${state.ta.wrongCount})
  </div>`;
  showTAReview();
}

function showTAReview() {
  if (state.ta.history.length === 0) {
    taReview.classList.add('hidden'); return;
  }
  const html = state.ta.history.map(h => {
    const cls = h.isCorrect ? 'correct' : 'wrong';
    const badge = h.isCorrect ? '⭕ 정답' : '❌ 오답';
    return `<div class="review-item ${cls}">
      <div class="sec">${badge} · ${escapeHtml(h.sectionHeader)}</div>
      <div>${h.sentenceHTML}</div>
      ${!h.isCorrect ? `<div><span class="user">입력: ${escapeHtml(h.userAnswer || '(미입력)')}</span> <span class="ans">정답: ${escapeHtml(h.correctAnswer)}</span></div>` : ''}
    </div>`;
  }).join('');
  taReviewList.innerHTML = html;
  taReview.classList.remove('hidden');
}

function updateTAHud() {
  document.getElementById('ta-remain').textContent = state.ta.remain;
  document.getElementById('ta-score').textContent = state.ta.score;
  document.getElementById('ta-correct').textContent = state.ta.correctCount;
  document.getElementById('ta-wrong').textContent = state.ta.wrongCount;
}

function nextTAQuestion() {
  if (!state.ta.running) return;
  if (state.ta.queue.length === 0) { stopTA(false); return; }
  const item = state.ta.queue.shift();
  const blankTokens = item.sent.tokens.filter(t => t.blank_ok);
  const chosen = blankTokens[Math.floor(Math.random() * blankTokens.length)];
  state.ta.current = { item, chosen };

  const parts = item.sent.tokens.map(t => {
    if (t === chosen) {
      const w = Math.max(4, chosen.core.length + 2);
      return `<input class="blank" id="ta-blank" size="${w}" autocomplete="off" autofocus />` +
             escapeHtml(t.trail || '') + (t.josa ? escapeHtml(t.josa) : '');
    }
    return escapeHtml(t.raw);
  });
  taArea.innerHTML = `
    <div class="ws-section-header">${escapeHtml(item.sec.header)}</div>
    <div class="ws-sentence">· ${parts.join(' ')}</div>
    <div class="ws-sentence" style="color:#888; font-size:0.88rem;">Enter 또는 입력 확인 버튼</div>
  `;
  // 제출 버튼 생성
  if (!document.getElementById('ta-submit-btn')) {
    const btn = document.createElement('button');
    btn.id = 'ta-submit-btn';
    btn.textContent = '입력 확인';
    btn.className = 'primary';
    btn.style.cssText = 'margin-top:10px; padding:9px 18px; border-radius:6px; border:1px solid #2d6ab2; background:#2d6ab2; color:#fff; font-weight:600; cursor:pointer; font-family:inherit;';
    btn.addEventListener('click', submitTA);
    taArea.parentNode.insertBefore(btn, taArea.nextSibling);
  }
  const inp = document.getElementById('ta-blank');
  inp.focus();
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); submitTA(); }
  });
}

function submitTA() {
  if (!state.ta.running || !state.ta.current) return;
  const inp = document.getElementById('ta-blank');
  if (!inp) return;
  const userVal = inp.value.trim();
  const { item, chosen } = state.ta.current;
  const isCorrect = userVal === chosen.core;
  if (isCorrect) {
    state.ta.score += 10;
    state.ta.correctCount++;
    inp.classList.add('correct');
    flashFeedback('정답! +10', 'ok');
  } else {
    state.ta.score = Math.max(0, state.ta.score - 5);
    state.ta.wrongCount++;
    inp.classList.add('wrong');
    flashFeedback(`오답 −5 · 정답: ${chosen.core}`, 'bad');
  }
  // 복기용 문장 HTML 저장 (정답을 강조)
  const partsReview = item.sent.tokens.map(t => {
    if (t === chosen) {
      return `<b style="color:${isCorrect?'#1e7e34':'#c0392b'};">[${escapeHtml(chosen.core)}]</b>` +
             escapeHtml(t.trail || '') + (t.josa ? escapeHtml(t.josa) : '');
    }
    return escapeHtml(t.raw);
  });
  state.ta.history.push({
    sectionHeader: item.sec.header,
    sentenceHTML: '· ' + partsReview.join(' '),
    userAnswer: userVal,
    correctAnswer: chosen.core,
    isCorrect,
  });
  updateTAHud();
  // 0.6초 후 다음 문제
  setTimeout(() => { if (state.ta.running) nextTAQuestion(); }, 600);
}

function flashFeedback(msg, type) {
  let el = document.getElementById('ta-flash');
  if (!el) {
    el = document.createElement('div');
    el.id = 'ta-flash';
    el.style.cssText = 'position:fixed;left:50%;top:30%;transform:translateX(-50%);padding:14px 22px;border-radius:10px;background:#fff;box-shadow:0 4px 16px rgba(0,0,0,0.2);font-weight:700;font-size:1.1rem;z-index:100;pointer-events:none;transition:opacity .3s;';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.color = type === 'ok' ? '#1e7e34' : '#c0392b';
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.opacity = '0'; }, 600);
}
