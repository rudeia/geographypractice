/* ======================================================
   세계시민과 지리 · 빈칸 학습지 MVP
   - 단원 선택, 빈칸 개수 조절, 정답 실시간 체크
   - 타임어택(제한시간/점수 +10 / -5, 최소 0)
   - 조사 제외하여 빈칸 후보 선정
====================================================== */

const KOREAN_PARTICLES = [
  // 보조사/격조사/접속조사 등 (길이 긴 것부터)
  '에서부터','으로부터','로부터','에서의','에서도','에서는','에서만','에서야','에게서','에게로','에게는','에게도','에게만','한테서','한테는','한테도',
  '이라고','라고','이라는','라는','이란','란','이며','이면서','이면','이고','이나','이야','이든','이지만','이지','이라도','이라서','이어서','이었다',
  '께서는','께서도','께서','께는','께도',
  '까지','부터','마저','조차','처럼','만큼','같이','보다','보단','에게','한테','에도','에는','에만','에야','에의','에다','에선','에는',
  '으로','로써','로서','으로써','으로서','으로도','으로는','으로만','으로써도',
  '과는','와는','과도','와도','과의','와의','이랑','랑',
  '은','는','이','가','을','를','의','에','와','과','도','만','도록','야','며','고','나','든','지','랑','요','죠','네','인','임'
];
// 단어 뒤에 따라붙을 수 있는 조사 (단어 말미에서 잘라냄)
const TRAILING_PARTICLES = KOREAN_PARTICLES.slice().sort((a,b)=>b.length-a.length);

// 빈칸 후보로 부적합한 불용어 (짧거나 너무 일반적인 단어)
const STOPWORDS = new Set([
  '이','그','저','것','수','등','및','또는','또한','그리고','그러나','하지만','즉',
  '때문','때','위해','대해','관한','대한','있는','없는','하는','되는','된','한','할',
  '년','월','일','시','분','초','중','내','외','전','후','및','형성','발달','분포','특징','지역','기후','영향','발생'
  // (너무 자주 나오는 일반 단어 일부는 빈칸 후보에서 빼서 학습 난이도 조절)
]);

let UNITS = [];
let currentUnit = null;
let mode = 'study';     // 'study' | 'timeattack'
let blanks = [];        // {answer, el}
let score = 0;
let timerId = null;
let timeLeft = 0;

/* ===== 데이터 로드 ===== */
async function loadUnits(){
  const res = await fetch('data/units.json');
  UNITS = await res.json();
  const sel = document.getElementById('unitSelect');
  sel.innerHTML = UNITS.map(u => `<option value="${u.id}">${u.title}</option>`).join('');
}

/* ===== 유틸: 단어 추출 / 조사 제거 ===== */
function stripParticle(word){
  // 순수 한글 단어만 대상 (영문/숫자 포함 안 함)
  for (const p of TRAILING_PARTICLES){
    if (word.length > p.length + 1 && word.endsWith(p)){
      return word.slice(0, word.length - p.length);
    }
  }
  return word;
}

function isGoodCandidate(word){
  if (!word) return false;
  if (word.length < 2) return false;
  if (!/^[가-힣]+$/.test(word)) return false;
  if (STOPWORDS.has(word)) return false;
  return true;
}

/* 한 문장에서 빈칸 후보 (단어 원문, 시작인덱스, 끝인덱스, 정답) 리스트를 반환 */
function extractCandidates(sentence){
  // 한글 연속 시퀀스를 단어 단위로 찾는다
  const regex = /[가-힣]+/g;
  const cands = [];
  let m;
  while ((m = regex.exec(sentence)) !== null){
    const raw = m[0];
    const stripped = stripParticle(raw);
    if (isGoodCandidate(stripped)){
      // 원문에서 'stripped' 부분만 빈칸화하고, 조사는 그대로 남긴다
      const startInRaw = 0;           // stripped는 raw의 앞부분
      const blankStart = m.index + startInRaw;
      const blankEnd = blankStart + stripped.length;
      cands.push({
        answer: stripped,
        start: blankStart,
        end: blankEnd
      });
    }
  }
  return cands;
}

/* ===== 학습지 렌더링 ===== */
function shuffle(arr){
  for (let i = arr.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i+1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function renderWorksheet(unit, blankCount){
  const container = document.getElementById('worksheet');
  container.innerHTML = '';
  blanks = [];

  // 모든 문장에서 후보를 모아 그 중 N개를 무작위 선택
  // 단, 같은 정답이 너무 반복되지 않도록 약간 조절
  const allCands = [];
  unit.sentences.forEach((s, sIdx) => {
    extractCandidates(s).forEach(c => {
      allCands.push({ sIdx, ...c });
    });
  });

  // 정답 다양성을 위해 셔플 후, 동일 정답은 최대 2회까지 허용
  shuffle(allCands);
  const chosen = [];
  const counter = {};
  for (const c of allCands){
    const n = counter[c.answer] || 0;
    if (n >= 2) continue;
    chosen.push(c);
    counter[c.answer] = n + 1;
    if (chosen.length >= blankCount) break;
  }

  // 선택된 빈칸을 문장 인덱스별로 묶기
  const bySentence = {};
  chosen.forEach(c => {
    (bySentence[c.sIdx] = bySentence[c.sIdx] || []).push(c);
  });

  // 문장별로 렌더링: 빈칸이 있는 문장만 표시(화면 복잡도 감소)
  const sentenceIndices = Object.keys(bySentence).map(Number).sort((a,b)=>a-b);

  sentenceIndices.forEach(sIdx => {
    const original = unit.sentences[sIdx];
    const cuts = bySentence[sIdx].sort((a,b)=>a.start - b.start);

    const p = document.createElement('div');
    p.className = 'sentence';

    let cursor = 0;
    cuts.forEach(c => {
      // 빈칸 앞 텍스트
      p.appendChild(document.createTextNode(original.slice(cursor, c.start)));
      // 빈칸
      const input = document.createElement('input');
      input.className = 'blank';
      input.type = 'text';
      input.autocomplete = 'off';
      input.spellcheck = false;
      input.dataset.answer = c.answer;
      input.style.width = (Math.max(c.answer.length, 2) * 1.1 + 2) + 'ch';
      input.addEventListener('input', onBlankInput);
      p.appendChild(input);
      blanks.push({ answer: c.answer, el: input });
      cursor = c.end;
    });
    // 남은 부분
    p.appendChild(document.createTextNode(original.slice(cursor)));
    container.appendChild(p);
  });

  if (blanks.length === 0){
    container.innerHTML = '<p class="empty-hint">이 단원에서 빈칸 후보를 찾지 못했습니다. 다른 단원을 선택해 주세요.</p>';
  }

  document.getElementById('correctCount').textContent = '0';
  document.getElementById('totalCount').textContent = blanks.length;
}

/* ===== 빈칸 입력 이벤트 ===== */
function onBlankInput(e){
  const el = e.target;
  const user = el.value.trim();
  const ans = el.dataset.answer;
  const wasCorrect = el.classList.contains('correct');

  if (user === ans){
    if (!wasCorrect){
      el.classList.remove('wrong');
      el.classList.add('correct');
      el.readOnly = true;
      if (mode === 'timeattack'){
        score += 10;
        updateScore();
      }
    }
  } else {
    el.classList.remove('correct');
    // 타임어택: '완전히 비운 상태'가 아닌데 틀린 상태일 때만 체크하도록 처리
    // 여기서는 실시간 감점은 하지 않고, 정답 일치 여부만 판단.
    // 오답 감점은 '엔터'로 명시적으로 제출할 때만 반영.
  }
  updateProgress();
}

// 엔터로 제출하면 오답 감점 (타임어택 전용)
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  const el = document.activeElement;
  if (!el || !el.classList || !el.classList.contains('blank')) return;
  if (mode !== 'timeattack') return;
  const user = el.value.trim();
  const ans = el.dataset.answer;
  if (user.length === 0) return;
  if (user !== ans && !el.classList.contains('correct')){
    el.classList.add('wrong');
    score = Math.max(0, score - 5);
    updateScore();
    // 입력 초기화로 재도전 유도
    setTimeout(()=>{ el.value=''; el.classList.remove('wrong'); el.focus(); }, 350);
  }
});

function updateProgress(){
  const correct = blanks.filter(b => b.el.classList.contains('correct')).length;
  document.getElementById('correctCount').textContent = correct;
  // 모두 맞추면 타임어택 종료 (보너스는 추후)
  if (mode === 'timeattack' && correct === blanks.length && blanks.length > 0){
    endTimeAttack(true);
  }
}
function updateScore(){ document.getElementById('scoreVal').textContent = score; }

/* ===== 정답 확인 / 리셋 ===== */
function revealAll(){
  blanks.forEach(b => {
    if (!b.el.classList.contains('correct')){
      b.el.value = b.answer;
      b.el.classList.remove('wrong');
      b.el.classList.add('revealed');
      b.el.readOnly = true;
    }
  });
}

/* ===== 타임어택 ===== */
function startTimeAttack(){
  const limit = parseInt(document.getElementById('timeLimit').value, 10) || 60;
  timeLeft = limit;
  score = 0;
  updateScore();
  document.getElementById('timeLeft').textContent = timeLeft;
  document.getElementById('timer').classList.remove('hidden');
  document.getElementById('score').classList.remove('hidden');
  clearInterval(timerId);
  timerId = setInterval(() => {
    timeLeft -= 1;
    document.getElementById('timeLeft').textContent = timeLeft;
    if (timeLeft <= 0){ endTimeAttack(false); }
  }, 1000);
}
function endTimeAttack(cleared){
  clearInterval(timerId);
  timerId = null;
  blanks.forEach(b => b.el.readOnly = true);
  const msg = cleared ? `🎉 모두 맞췄습니다! 최종 점수: ${score}` : `⏰ 시간 종료! 최종 점수: ${score}`;
  setTimeout(()=>alert(msg), 100);
}

/* ===== 탭 전환 ===== */
function setMode(next){
  mode = next;
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === next);
  });
  const timeLabel = document.getElementById('timeLabel');
  const timer = document.getElementById('timer');
  const scoreBox = document.getElementById('score');
  if (next === 'timeattack'){
    timeLabel.classList.remove('hidden');
  } else {
    timeLabel.classList.add('hidden');
    timer.classList.add('hidden');
    scoreBox.classList.add('hidden');
    clearInterval(timerId);
  }
}

/* ===== 시작 버튼 ===== */
function onStart(){
  const unitId = document.getElementById('unitSelect').value;
  const count = parseInt(document.getElementById('blankCount').value, 10) || 10;
  currentUnit = UNITS.find(u => u.id === unitId);
  if (!currentUnit) return;
  renderWorksheet(currentUnit, count);
  if (mode === 'timeattack') startTimeAttack();
  else { clearInterval(timerId); document.getElementById('timer').classList.add('hidden'); document.getElementById('score').classList.add('hidden'); }
  // 스크롤 상단으로
  document.getElementById('worksheet').scrollIntoView({behavior:'smooth', block:'start'});
}

/* ===== 이벤트 바인딩 ===== */
document.addEventListener('DOMContentLoaded', async () => {
  await loadUnits();
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => setMode(btn.dataset.tab));
  });
  document.getElementById('startBtn').addEventListener('click', onStart);
  document.getElementById('checkBtn').addEventListener('click', revealAll);
  document.getElementById('resetBtn').addEventListener('click', () => {
    if (currentUnit){
      const count = parseInt(document.getElementById('blankCount').value, 10) || 10;
      renderWorksheet(currentUnit, count);
      if (mode === 'timeattack') startTimeAttack();
    }
  });
});
