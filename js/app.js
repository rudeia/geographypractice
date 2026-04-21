
// ========== 데이터 로드 ==========
let DATA = null;

async function loadData() {
  const res = await fetch('data/units.json');
  DATA = await res.json();
  initUI();
}

function initUI() {
  const selS = document.getElementById('unit-select');
  const selT = document.getElementById('ta-unit-select');
  DATA.units.forEach((u, i) => {
    const o1 = new Option(`${u.unit_code}. ${u.title}`, i);
    const o2 = new Option(`${u.unit_code}. ${u.title}`, i);
    selS.add(o1); selT.add(o2);
  });
  selS.addEventListener('change', renderStudy);
  document.getElementById('reload-btn').addEventListener('click', renderStudy);
  document.getElementById('check-btn').addEventListener('click', checkStudy);
  document.getElementById('reveal-btn').addEventListener('click', revealStudy);
  document.getElementById('blank-count').addEventListener('change', renderStudy);
  // tabs
  document.querySelectorAll('.tab').forEach(t => {
    t.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(x=>x.classList.remove('active'));
      t.classList.add('active');
      document.getElementById(t.dataset.tab).classList.add('active');
    });
  });
  document.getElementById('ta-start').addEventListener('click', startTA);
  document.getElementById('ta-stop').addEventListener('click', stopTA);
  renderStudy();
}

// ========== 유틸 ==========
function normalizeAnswer(s) {
  return (s||'').replace(/\s+/g,'').toLowerCase().trim();
}
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length-1; i>0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 섹션별로 묶인 문장을 빈칸 수 맞춰 선택
function pickSentences(unit, targetBlanks) {
  // section 단위로 순서 유지
  // 각 섹션에서 빈칸 있는 문장만 대상
  const sections = unit.sections.map(s => ({
    heading: s.heading,
    sentences: s.sentences.filter(x => x.blank_count > 0)
  })).filter(s => s.sentences.length > 0);
  if (!sections.length) return [];
  // 섹션 순서 랜덤
  const shuffled = shuffle(sections);
  const chosen = []; // [{heading, sentences}]
  let total = 0;
  for (const sec of shuffled) {
    if (total >= targetBlanks) break;
    const picks = shuffle(sec.sentences);
    const subs = [];
    for (const s of picks) {
      subs.push(s);
      total += s.blank_count;
      if (total >= targetBlanks) break;
    }
    chosen.push({heading: sec.heading, sentences: subs});
  }
  return chosen;
}

// ========== 학습 모드 ==========
function renderStudy() {
  const ui = document.getElementById('unit-select');
  const bc = parseInt(document.getElementById('blank-count').value) || 10;
  const unit = DATA.units[parseInt(ui.value)||0];
  const area = document.getElementById('study-area');
  const summary = document.getElementById('study-summary');
  summary.textContent = ''; summary.className = 'summary';
  area.innerHTML = '';
  const picked = pickSentences(unit, bc);
  picked.forEach((sec, si) => {
    const h = document.createElement('p');
    h.className = 'section-head';
    h.textContent = sec.heading;
    area.appendChild(h);
    sec.sentences.forEach(sent => {
      const p = document.createElement('p');
      p.className = 'sentence';
      sent.segments.forEach(seg => {
        if (seg.blank) {
          const inp = document.createElement('input');
          inp.className = 'blank';
          inp.dataset.answer = seg.answer;
          inp.size = Math.max(seg.answer.length+1, 5);
          inp.addEventListener('input', e => {
            const v = normalizeAnswer(e.target.value);
            const a = normalizeAnswer(e.target.dataset.answer);
            e.target.classList.remove('wrong');
            if (v === a) {
              e.target.classList.add('correct');
              e.target.readOnly = true;
              e.target.value = e.target.dataset.answer;
            } else {
              e.target.classList.remove('correct');
            }
          });
          p.appendChild(inp);
        } else {
          p.appendChild(document.createTextNode(seg.text));
        }
      });
      area.appendChild(p);
    });
    if (si < picked.length-1) {
      const d = document.createElement('p');
      d.className = 'section-divider';
      d.textContent = '· · ·';
      area.appendChild(d);
    }
  });
}

function checkStudy() {
  const inputs = document.querySelectorAll('#study-area .blank');
  let ok = 0, ng = 0;
  inputs.forEach(inp => {
    if (inp.classList.contains('correct') || inp.classList.contains('revealed')) {
      if (inp.classList.contains('correct')) ok++;
      return;
    }
    const v = normalizeAnswer(inp.value);
    const a = normalizeAnswer(inp.dataset.answer);
    if (v === a) {
      inp.classList.add('correct');
      inp.readOnly = true;
      inp.value = inp.dataset.answer;
      ok++;
    } else {
      inp.classList.remove('correct');
      inp.classList.add('wrong');
      ng++;
    }
  });
  const summary = document.getElementById('study-summary');
  summary.textContent = `정답 ${ok}개 · 오답 ${ng}개`;
  summary.className = 'summary' + (ng===0 && ok>0 ? ' ok' : '');
}

function revealStudy() {
  document.querySelectorAll('#study-area .blank').forEach(inp => {
    if (!inp.classList.contains('correct')) {
      inp.value = inp.dataset.answer;
      inp.classList.remove('wrong');
      inp.classList.add('revealed');
      inp.readOnly = true;
    }
  });
}

// ========== 타임어택 ==========
let TA = null;

function startTA() {
  const ui = document.getElementById('ta-unit-select');
  const time = parseInt(document.getElementById('ta-time').value) || 60;
  const unit = DATA.units[parseInt(ui.value)||0];
  TA = {
    score: 0, correct: 0, wrong: 0,
    timeLeft: time,
    history: [],  // {heading, segments, userInputs(per blank): string, correct: bool[]}
    unit,
    currentSentence: null,
    currentHeading: null,
    remainingSentences: flattenSentences(unit),
    timer: null,
  };
  if (!TA.remainingSentences.length) {
    alert('이 단원에는 빈칸 문장이 없습니다.');
    return;
  }
  TA.remainingSentences = shuffle(TA.remainingSentences);
  document.getElementById('ta-start').disabled = true;
  document.getElementById('ta-stop').disabled = false;
  document.getElementById('ta-history').innerHTML = '';
  updateTAStatus();
  nextTASentence();
  TA.timer = setInterval(() => {
    TA.timeLeft--;
    if (TA.timeLeft <= 0) {
      TA.timeLeft = 0;
      endTA();
    }
    updateTAStatus();
  }, 1000);
}

function flattenSentences(unit) {
  const list = [];
  unit.sections.forEach(sec => {
    sec.sentences.forEach(s => {
      if (s.blank_count > 0) list.push({heading: sec.heading, ...s});
    });
  });
  return list;
}

function stopTA() { endTA(); }

function endTA() {
  if (!TA) return;
  clearInterval(TA.timer);
  document.getElementById('ta-start').disabled = false;
  document.getElementById('ta-stop').disabled = true;
  document.getElementById('ta-area').innerHTML = '';
  renderTAHistory();
  TA = null;
}

function updateTAStatus() {
  if (!TA) return;
  document.getElementById('ta-score').textContent = TA.score;
  document.getElementById('ta-timer').textContent = TA.timeLeft + 's';
  document.getElementById('ta-count').textContent = `${TA.correct} / ${TA.wrong}`;
}

function nextTASentence() {
  if (!TA) return;
  if (!TA.remainingSentences.length) {
    TA.remainingSentences = shuffle(flattenSentences(TA.unit));
  }
  const sent = TA.remainingSentences.shift();
  TA.currentSentence = sent;
  const area = document.getElementById('ta-area');
  area.innerHTML = '';
  // heading
  const h = document.createElement('p');
  h.className = 'section-head';
  h.textContent = sent.heading;
  area.appendChild(h);
  const p = document.createElement('p');
  p.className = 'sentence';
  const inputs = [];
  sent.segments.forEach(seg => {
    if (seg.blank) {
      const inp = document.createElement('input');
      inp.className = 'blank';
      inp.dataset.answer = seg.answer;
      inp.size = Math.max(seg.answer.length+1, 5);
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          submitTA();
        }
      });
      p.appendChild(inp);
      inputs.push(inp);
    } else {
      p.appendChild(document.createTextNode(seg.text));
    }
  });
  area.appendChild(p);
  // 확인 버튼
  const btn = document.createElement('button');
  btn.className = 'btn primary';
  btn.textContent = '입력 확인';
  btn.style.marginTop = '12px';
  btn.addEventListener('click', submitTA);
  area.appendChild(btn);
  TA.currentInputs = inputs;
  if (inputs.length) inputs[0].focus();
}

function submitTA() {
  if (!TA || !TA.currentSentence) return;
  const inputs = TA.currentInputs;
  const userInputs = [];
  const correctFlags = [];
  let allCorrect = true;
  inputs.forEach(inp => {
    const v = normalizeAnswer(inp.value);
    const a = normalizeAnswer(inp.dataset.answer);
    const ok = (v === a);
    userInputs.push(inp.value);
    correctFlags.push(ok);
    if (!ok) allCorrect = false;
  });
  // 점수 반영
  if (allCorrect && inputs.length > 0) {
    TA.score += 10;
    TA.correct++;
    flash('정답! +10', 'ok');
  } else {
    TA.score = Math.max(0, TA.score - 5);
    TA.wrong++;
    flash('오답 -5', 'ng');
  }
  // 기록
  TA.history.push({
    heading: TA.currentSentence.heading,
    segments: TA.currentSentence.segments,
    userInputs,
    correctFlags,
    allCorrect,
  });
  updateTAStatus();
  setTimeout(() => { if (TA) nextTASentence(); }, 600);
}

function flash(text, cls) {
  const el = document.getElementById('ta-flash');
  el.textContent = text;
  el.className = 'flash show ' + cls;
  setTimeout(() => { el.classList.remove('show'); }, 550);
}

function renderTAHistory() {
  const el = document.getElementById('ta-history');
  el.innerHTML = '';
  const score = TA ? TA.score : document.getElementById('ta-score').textContent;
  const title = document.createElement('h3');
  title.textContent = `📝 풀이 기록 (${arguments.length > 0 ? '' : ''}${document.getElementById('ta-count').textContent})`;
  el.appendChild(title);
  // history from module-level backup (since TA might be nulled)
  const hist = TA_HISTORY_BACKUP;
  if (!hist.length) {
    const p = document.createElement('p');
    p.style.color = 'var(--muted)';
    p.style.fontSize = '14px';
    p.textContent = '풀이 기록이 없습니다.';
    el.appendChild(p);
    return;
  }
  hist.forEach((h, idx) => {
    const div = document.createElement('div');
    div.className = 'history-item ' + (h.allCorrect ? 'ok' : 'ng');
    const hd = document.createElement('div');
    hd.className = 'heading';
    hd.textContent = `${idx+1}. ${h.heading}  ${h.allCorrect ? '⭕' : '❌'}`;
    div.appendChild(hd);
    const sentDiv = document.createElement('div');
    let bi = 0;
    h.segments.forEach(seg => {
      if (seg.blank) {
        const ok = h.correctFlags[bi];
        const user = h.userInputs[bi] || '(빈칸)';
        if (ok) {
          const span = document.createElement('span');
          span.className = 'ans-ok';
          span.textContent = seg.answer;
          sentDiv.appendChild(span);
        } else {
          const span1 = document.createElement('span');
          span1.className = 'ans-ng';
          span1.textContent = user;
          sentDiv.appendChild(span1);
          sentDiv.appendChild(document.createTextNode(' → '));
          const span2 = document.createElement('span');
          span2.className = 'ans-correct';
          span2.textContent = seg.answer;
          sentDiv.appendChild(span2);
        }
        bi++;
      } else {
        sentDiv.appendChild(document.createTextNode(seg.text));
      }
    });
    div.appendChild(sentDiv);
    el.appendChild(div);
  });
}

// history backup for when TA ends
let TA_HISTORY_BACKUP = [];
const _origEndTA = endTA;
endTA = function() {
  if (TA) { TA_HISTORY_BACKUP = TA.history.slice(); }
  _origEndTA();
};

loadData();
