
// ================================
// 세계시민과 지리 - 빈칸 학습지 v12
// ================================
let DATA = null;

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const norm = s => (s||'').replace(/\s+/g,'').toLowerCase();

async function load(){
  const res = await fetch('data/units.json');
  DATA = await res.json();
  initStudy();
  initRandom();
  initTime();
  bindTabs();
}

function bindTabs(){
  $$('.tab').forEach(b=>{
    b.addEventListener('click',()=>{
      $$('.tab').forEach(x=>x.classList.remove('active'));
      $$('.tab-panel').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      $('#tab-'+b.dataset.tab).classList.add('active');
    });
  });
}

// --- 공통: detail 렌더 ---
function renderDetail(det, container, opt={}){
  // opt: {showSuTitle, suTitle, muTitle}
  container.innerHTML = '';
  if(opt.muTitle){
    const h = document.createElement('div');
    h.className = 'mu-title';
    h.textContent = opt.muTitle;
    container.appendChild(h);
  }
  if(opt.suTitle){
    const h = document.createElement('div');
    h.className = 'su-title';
    h.textContent = opt.suTitle;
    container.appendChild(h);
  }
  const block = document.createElement('div');
  block.className = 'det-block';
  // mark (⑴)
  const markSpan = document.createElement('span');
  markSpan.className = 'det-mark';
  markSpan.textContent = det.mark + ' ';

  det.lines.forEach((line, idx)=>{
    const lineEl = document.createElement('div');
    lineEl.className = 'line lv'+line.level;
    if(idx===0 && line.level===0){
      // 첫 라인에 mark 붙임
      lineEl.appendChild(markSpan.cloneNode(true));
    } else if(line.mark){
      const m = document.createElement('span');
      m.className='mark';
      m.textContent = line.mark+' ';
      lineEl.appendChild(m);
    }
    line.segs.forEach(seg=>{
      if(seg.t === 't'){
        lineEl.appendChild(document.createTextNode(seg.v));
      } else {
        const inp = document.createElement('input');
        inp.className = 'blank';
        inp.type = 'text';
        inp.autocomplete = 'off';
        inp.spellcheck = false;
        inp.dataset.answer = seg.v;
        // 너비 힌트: 정답 길이에 비례
        const w = Math.max(70, seg.v.replace(/\s/g,'').length * 18 + 30);
        inp.style.minWidth = w+'px';
        lineEl.appendChild(inp);
      }
    });
    block.appendChild(lineEl);
  });
  container.appendChild(block);
}

// ================================
// 학습 탭
// ================================
let studyState = {muIdx:0, suIdx:0, detIdx:0};

function initStudy(){
  const selMu = $('#sel-mu');
  DATA.units.forEach((mu, i)=>{
    const o = document.createElement('option');
    o.value = i;
    o.textContent = `${mu.roman}-${mu.num}. ${mu.title}`;
    selMu.appendChild(o);
  });
  selMu.addEventListener('change',()=>{
    studyState.muIdx = +selMu.value;
    studyState.suIdx = 0; studyState.detIdx = 0;
    fillSu(); renderStudy();
  });
  $('#sel-su').addEventListener('change',()=>{
    studyState.suIdx = +$('#sel-su').value;
    studyState.detIdx = 0;
    fillDet(); renderStudy();
  });
  $('#sel-det').addEventListener('change',()=>{
    studyState.detIdx = +$('#sel-det').value;
    renderStudy();
  });
  $('#btn-prev').addEventListener('click', ()=>moveStudy(-1));
  $('#btn-next').addEventListener('click', ()=>moveStudy(1));
  $('#btn-check').addEventListener('click', checkStudy);
  $('#btn-reveal').addEventListener('click', revealStudy);

  fillSu(); renderStudy();
}

function fillSu(){
  const mu = DATA.units[studyState.muIdx];
  const selSu = $('#sel-su'); selSu.innerHTML='';
  mu.subunits.forEach((su, i)=>{
    const o = document.createElement('option');
    o.value = i; o.textContent = `${su.num}. ${su.title}`;
    selSu.appendChild(o);
  });
  selSu.value = studyState.suIdx;
  fillDet();
}
function fillDet(){
  const mu = DATA.units[studyState.muIdx];
  const su = mu.subunits[studyState.suIdx];
  const selDet = $('#sel-det'); selDet.innerHTML='';
  su.details.forEach((d, i)=>{
    const o = document.createElement('option');
    o.value = i; o.textContent = d.mark;
    selDet.appendChild(o);
  });
  selDet.value = studyState.detIdx;
}
function moveStudy(dir){
  const mu = DATA.units[studyState.muIdx];
  const su = mu.subunits[studyState.suIdx];
  let {muIdx,suIdx,detIdx} = studyState;
  detIdx += dir;
  if(detIdx < 0){
    suIdx -= 1;
    if(suIdx<0){
      muIdx -= 1;
      if(muIdx<0){ muIdx=0; suIdx=0; detIdx=0; }
      else {
        suIdx = DATA.units[muIdx].subunits.length - 1;
        detIdx = DATA.units[muIdx].subunits[suIdx].details.length - 1;
      }
    } else {
      detIdx = DATA.units[muIdx].subunits[suIdx].details.length - 1;
    }
  } else if(detIdx >= su.details.length){
    suIdx += 1;
    if(suIdx >= mu.subunits.length){
      muIdx += 1;
      if(muIdx >= DATA.units.length){ muIdx = DATA.units.length-1; suIdx = mu.subunits.length-1; detIdx = su.details.length-1;}
      else { suIdx=0; detIdx=0; }
    } else {
      detIdx = 0;
    }
  }
  studyState = {muIdx,suIdx,detIdx};
  $('#sel-mu').value = muIdx;
  fillSu();
  $('#sel-su').value = suIdx;
  fillDet();
  $('#sel-det').value = detIdx;
  renderStudy();
}

function renderStudy(){
  $('#study-status').textContent = '';
  const mu = DATA.units[studyState.muIdx];
  const su = mu.subunits[studyState.suIdx];
  const det = su.details[studyState.detIdx];
  const container = $('#board-study');
  renderDetail(det, container, {
    muTitle: `${mu.roman}-${mu.num}. ${mu.title}`,
    suTitle: `${su.num}. ${su.title}`,
  });
  // 실시간 체크
  container.querySelectorAll('input.blank').forEach(inp=>{
    inp.addEventListener('input', ()=>{
      if(norm(inp.value) === norm(inp.dataset.answer)){
        inp.classList.add('correct'); inp.classList.remove('wrong');
        inp.readOnly = true;
      } else {
        inp.classList.remove('correct','wrong');
      }
    });
    inp.addEventListener('keydown', e=>{
      if(e.key==='Enter') checkStudy();
    });
  });
}

function checkStudy(){
  const inps = $$('#board-study input.blank');
  let ok=0, ng=0;
  inps.forEach(inp=>{
    if(norm(inp.value) === norm(inp.dataset.answer)){
      inp.classList.add('correct'); inp.classList.remove('wrong');
      inp.readOnly = true;
      ok++;
    } else {
      inp.classList.add('wrong'); inp.classList.remove('correct');
      ng++;
    }
  });
  $('#study-status').textContent = `정답 ${ok} · 오답 ${ng}`;
}
function revealStudy(){
  $$('#board-study input.blank').forEach(inp=>{
    inp.value = inp.dataset.answer;
    inp.classList.add('correct');
    inp.readOnly = true;
  });
}

// ================================
// 랜덤 학습 탭
// ================================
let rndState = {pool:[], idx:0, records:[], count:5};

function initRandom(){
  const sel = $('#rnd-mu');
  DATA.units.forEach((mu, i)=>{
    const o = document.createElement('option');
    o.value = i;
    o.textContent = `${mu.roman}-${mu.num}. ${mu.title}`;
    sel.appendChild(o);
  });
  $('#rnd-start').addEventListener('click', startRandom);
  $('#rnd-reset').addEventListener('click', resetRandom);
  $('#rnd-check').addEventListener('click', submitRandomDetail);
  $('#rnd-next').addEventListener('click', nextRandomDetail);
}

function startRandom(){
  const muIdx = +$('#rnd-mu').value;
  const mu = DATA.units[muIdx];
  const count = Math.max(1, Math.min(30, +$('#rnd-count').value || 5));
  // 전체 세부내용 pool
  const pool = [];
  mu.subunits.forEach((su, si)=>{
    su.details.forEach((d, di)=>{
      pool.push({su, det:d, mu});
    });
  });
  // 섞기
  for(let i=pool.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [pool[i],pool[j]] = [pool[j],pool[i]];
  }
  rndState = {
    pool: pool.slice(0, Math.min(count, pool.length)),
    idx: 0, records: [],
    count: Math.min(count, pool.length)
  };
  $('#rnd-summary').style.display = 'none';
  $('#rnd-summary').innerHTML = '';
  $('#rnd-controls').style.display = 'flex';
  $('#rnd-start').disabled = true;
  $('#rnd-mu').disabled = true;
  $('#rnd-count').disabled = true;
  showRandomDetail();
}
function resetRandom(){
  rndState = {pool:[], idx:0, records:[], count:5};
  $('#board-random').innerHTML = '';
  $('#rnd-summary').style.display = 'none';
  $('#rnd-summary').innerHTML = '';
  $('#rnd-controls').style.display = 'none';
  $('#rnd-status').textContent = '';
  $('#rnd-start').disabled = false;
  $('#rnd-mu').disabled = false;
  $('#rnd-count').disabled = false;
}
function showRandomDetail(){
  $('#rnd-status').textContent = `${rndState.idx+1} / ${rndState.count}`;
  const {su, det, mu} = rndState.pool[rndState.idx];
  const container = $('#board-random');
  renderDetail(det, container, {
    muTitle: `${mu.roman}-${mu.num}. ${mu.title}`,
    suTitle: `${su.num}. ${su.title}`,
  });
  container.querySelectorAll('input.blank').forEach(inp=>{
    inp.addEventListener('input', ()=>{
      if(norm(inp.value) === norm(inp.dataset.answer)){
        inp.classList.add('correct'); inp.classList.remove('wrong');
        inp.readOnly = true;
      } else {
        inp.classList.remove('correct','wrong');
      }
    });
    inp.addEventListener('keydown', e=>{
      if(e.key==='Enter') submitRandomDetail();
    });
  });
  $('#rnd-next').textContent = (rndState.idx === rndState.count-1) ? '결과 보기 ▶' : '다음 문항 ▶';
}
function submitRandomDetail(){
  const inps = $$('#board-random input.blank');
  let ok=0, ng=0;
  const {su, det, mu} = rndState.pool[rndState.idx];
  const segsCopy = det.lines.map(l=>l.segs);
  const userAnswers = [];
  let bi = 0;
  inps.forEach(inp=>{
    const correct = norm(inp.value) === norm(inp.dataset.answer);
    if(correct){ inp.classList.add('correct'); inp.readOnly=true; ok++; }
    else { inp.classList.add('wrong'); ng++; }
    userAnswers.push({answer: inp.dataset.answer, user: inp.value, correct});
    bi++;
  });
  $('#rnd-status').textContent = `정답 ${ok} · 오답 ${ng} (${rndState.idx+1}/${rndState.count})`;
  // 기록 (한번만)
  if(!rndState.pool[rndState.idx]._recorded){
    rndState.pool[rndState.idx]._recorded = true;
    rndState.records.push({
      mu, su, det, userAnswers,
      allCorrect: ng===0
    });
  }
}
function nextRandomDetail(){
  // 먼저 제출 안 한 상태면 기록
  if(!rndState.pool[rndState.idx]._recorded){
    submitRandomDetail();
  }
  if(rndState.idx >= rndState.count-1){
    showRandomSummary();
    return;
  }
  rndState.idx++;
  showRandomDetail();
}
function showRandomSummary(){
  $('#board-random').innerHTML = '';
  $('#rnd-controls').style.display = 'none';
  const sum = $('#rnd-summary'); sum.style.display = 'block';
  const recs = rndState.records;
  const okCnt = recs.filter(r=>r.allCorrect).length;
  sum.innerHTML = `<h3>결과: ${okCnt} / ${recs.length} 완전 정답</h3>`;
  recs.forEach((r, idx)=>{
    const div = document.createElement('div');
    div.className = 'record ' + (r.allCorrect ? 'ok' : 'ng');
    // 문장 재구성: 맞춘 것은 정답으로, 틀린 것은 사용자 입력과 정답 둘다 표시
    let html = `<b>Q${idx+1}.</b> [${r.mu.roman}-${r.mu.num} / ${r.su.num}. ${r.su.title} ${r.det.mark}] `;
    // 각 라인 재구성
    const parts = [];
    let ai = 0;
    r.det.lines.forEach(line=>{
      const frag = [];
      line.segs.forEach(seg=>{
        if(seg.t==='t') frag.push(escapeHtml(seg.v));
        else {
          const a = r.userAnswers[ai++];
          if(a.correct){
            frag.push(`<span class="ans-correct">${escapeHtml(seg.v)}</span>`);
          } else {
            if(a.user.trim()===''){
              frag.push(`<span class="ans-wrong">____</span> → <span class="ans-correct">${escapeHtml(seg.v)}</span>`);
            } else {
              frag.push(`<span class="ans-wrong">${escapeHtml(a.user)}</span> → <span class="ans-correct">${escapeHtml(seg.v)}</span>`);
            }
          }
        }
      });
      parts.push(frag.join(''));
    });
    html += '<br>' + parts.join('<br>');
    div.innerHTML = html;
    sum.appendChild(div);
  });
  $('#rnd-status').textContent = '완료!';
  $('#rnd-start').disabled = false;
  $('#rnd-mu').disabled = false;
  $('#rnd-count').disabled = false;
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

// ================================
// 타임어택 탭
// ================================
let taState = null;
let taTimer = null;

function initTime(){
  const sel = $('#ta-mu');
  DATA.units.forEach((mu, i)=>{
    const o = document.createElement('option');
    o.value = i;
    o.textContent = `${mu.roman}-${mu.num}. ${mu.title}`;
    sel.appendChild(o);
  });
  $('#ta-start').addEventListener('click', startTA);
  $('#ta-reset').addEventListener('click', resetTA);
}

function buildTABlankPool(muIdx){
  // 빈칸 pool: {muTitle, suTitle, detMark, text(문장), answer}
  // 세부내용의 각 line별 각 빈칸을 개별 문제로
  const items = [];
  const units = (muIdx === '__ALL__') ? DATA.units : [DATA.units[+muIdx]];
  units.forEach(mu=>{
    mu.subunits.forEach(su=>{
      su.details.forEach(det=>{
        det.lines.forEach(line=>{
          if(!line.segs.some(s=>s.t==='b')) return;
          // 빈칸이 여러개인 라인은 각 빈칸을 개별 문제로
          const blanks = line.segs.map((s,i)=>({s,i})).filter(x=>x.s.t==='b');
          blanks.forEach(b=>{
            items.push({
              mu, su, det, line, blankIdx: b.i,
              answer: b.s.v
            });
          });
        });
      });
    });
  });
  return items;
}

function startTA(){
  if(taTimer) return; // 중복 방지
  const muVal = $('#ta-mu').value;
  const time = Math.max(10, +$('#ta-time').value || 120);
  const pool = buildTABlankPool(muVal);
  // shuffle
  for(let i=pool.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [pool[i],pool[j]]=[pool[j],pool[i]];
  }
  taState = {
    pool, idx:0, score:0, correct:0, wrong:0,
    records:[], remain:time, totalTime:time
  };
  $('#ta-start').disabled = true;
  $('#ta-mu').disabled = true;
  $('#ta-time').disabled = true;
  $('#ta-hud').style.display = 'flex';
  $('#ta-summary').style.display = 'none';
  $('#ta-summary').innerHTML = '';
  updateTAHud();
  showTAItem();
  taTimer = setInterval(()=>{
    taState.remain--;
    updateTAHud();
    if(taState.remain<=0){
      endTA();
    }
  }, 1000);
}

function resetTA(){
  if(taTimer){ clearInterval(taTimer); taTimer=null; }
  taState = null;
  $('#ta-start').disabled = false;
  $('#ta-mu').disabled = false;
  $('#ta-time').disabled = false;
  $('#ta-hud').style.display = 'none';
  $('#board-time').innerHTML = '';
  $('#ta-summary').style.display = 'none';
  $('#ta-summary').innerHTML = '';
  $('#ta-flash').style.display = 'none';
  $('#ta-flash').className = 'flash';
  $('#ta-remain').textContent = '0';
  $('#ta-score').textContent = '0';
  $('#ta-correct').textContent = '0';
  $('#ta-wrong').textContent = '0';
}

function updateTAHud(){
  if(!taState) return;
  $('#ta-remain').textContent = Math.max(0, taState.remain);
  $('#ta-score').textContent = taState.score;
  $('#ta-correct').textContent = taState.correct;
  $('#ta-wrong').textContent = taState.wrong;
}

function showTAItem(){
  if(!taState) return;
  if(taState.idx >= taState.pool.length){ endTA(); return; }
  const item = taState.pool[taState.idx];
  const container = $('#board-time');
  container.innerHTML = '';
  // 헤더
  const h1 = document.createElement('div');
  h1.className = 'mu-title';
  h1.textContent = `${item.mu.roman}-${item.mu.num}. ${item.mu.title}`;
  container.appendChild(h1);
  const h2 = document.createElement('div');
  h2.className = 'su-title';
  h2.textContent = `${item.su.num}. ${item.su.title} · ${item.det.mark}`;
  container.appendChild(h2);
  // 문장(해당 line만) 렌더. 같은 라인의 다른 빈칸은 정답으로 채워서 표시
  const lineDiv = document.createElement('div');
  lineDiv.className = 'line';
  if(item.line.mark){
    const m = document.createElement('span');
    m.className = 'mark'; m.textContent = item.line.mark+' ';
    lineDiv.appendChild(m);
  }
  item.line.segs.forEach((seg, i)=>{
    if(seg.t==='t'){
      lineDiv.appendChild(document.createTextNode(seg.v));
    } else if(i === item.blankIdx){
      const inp = document.createElement('input');
      inp.className = 'blank'; inp.type='text';
      inp.autocomplete='off'; inp.spellcheck=false;
      inp.dataset.answer = seg.v;
      inp.style.minWidth = Math.max(80, seg.v.replace(/\s/g,'').length*18+30)+'px';
      lineDiv.appendChild(inp);
    } else {
      // 이 라인의 다른 빈칸은 정답으로 미리 채움 (맥락 유지)
      const span = document.createElement('span');
      span.style.color = '#aaa';
      span.style.textDecoration = 'underline dotted';
      span.textContent = seg.v;
      lineDiv.appendChild(span);
    }
  });
  container.appendChild(lineDiv);
  const inp = lineDiv.querySelector('input.blank');
  inp.focus();
  inp.addEventListener('keydown', e=>{
    if(e.key==='Enter'){ submitTA(); }
  });
}

function flashTA(msg, type){
  const el = $('#ta-flash');
  el.textContent = msg;
  el.className = 'flash ' + type;
  setTimeout(()=>{ el.className='flash'; el.style.display='none'; }, 500);
}

function submitTA(){
  if(!taState) return;
  const inp = $('#board-time input.blank');
  if(!inp) return;
  const item = taState.pool[taState.idx];
  const user = inp.value;
  const ok = norm(user) === norm(item.answer);
  taState.records.push({
    mu:item.mu, su:item.su, det:item.det, line:item.line, blankIdx:item.blankIdx,
    answer:item.answer, user, correct:ok
  });
  if(ok){
    taState.score += 10;
    taState.correct++;
    flashTA('정답! +10', 'ok');
  } else {
    taState.score = Math.max(0, taState.score - 5);
    taState.wrong++;
    flashTA(`오답 -5 · 정답: ${item.answer}`, 'ng');
  }
  updateTAHud();
  taState.idx++;
  setTimeout(()=>{ showTAItem(); }, 550);
}

function endTA(){
  if(taTimer){ clearInterval(taTimer); taTimer=null; }
  $('#board-time').innerHTML = '';
  $('#ta-start').disabled = false;
  $('#ta-mu').disabled = false;
  $('#ta-time').disabled = false;
  // 결과 렌더
  const sum = $('#ta-summary'); sum.style.display='block';
  const recs = taState.records;
  const okCnt = recs.filter(r=>r.correct).length;
  sum.innerHTML = `<h3>타임어택 종료 — 점수: ${taState.score} · 정답 ${okCnt} / ${recs.length}</h3>`;
  // 중복 제거 없이 순서대로, 단 같은 문항이 연속 두번 나오는 버그 방지용 dedup(record key)
  const seen = new Set();
  const unique = [];
  recs.forEach(r=>{
    const key = `${r.mu.id}|${r.su.num}|${r.det.idx}|${r.blankIdx}|${r.user}`;
    if(seen.has(key)) return;
    seen.add(key);
    unique.push(r);
  });
  unique.forEach((r, idx)=>{
    const div = document.createElement('div');
    div.className = 'record ' + (r.correct ? 'ok' : 'ng');
    // 문장 렌더
    const loc = `[${r.mu.roman}-${r.mu.num} / ${r.su.num}. ${r.su.title} ${r.det.mark}]`;
    const frag = [];
    r.line.segs.forEach((seg, i)=>{
      if(seg.t==='t') frag.push(escapeHtml(seg.v));
      else if(i === r.blankIdx){
        if(r.correct){
          frag.push(`<span class="ans-correct">${escapeHtml(seg.v)}</span>`);
        } else {
          if(!r.user || r.user.trim()===''){
            frag.push(`<span class="ans-wrong">____</span> → <span class="ans-correct">${escapeHtml(seg.v)}</span>`);
          } else {
            frag.push(`<span class="ans-wrong">${escapeHtml(r.user)}</span> → <span class="ans-correct">${escapeHtml(seg.v)}</span>`);
          }
        }
      } else {
        frag.push(`<span style="color:#aaa">${escapeHtml(seg.v)}</span>`);
      }
    });
    div.innerHTML = `<b>${idx+1}.</b> <span style="color:#ffd860">${loc}</span><br>` + frag.join('');
    sum.appendChild(div);
  });
}

load();
