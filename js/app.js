
// 세계시민과 지리 · 빈칸 학습지
let DATA = null;
let currentUnitIdx = 0;
let currentMiddleIdx = 0;
let currentSubIdx = 0;

// Tab switching
document.querySelectorAll('.tab').forEach(t=>{
  t.addEventListener('click', ()=>{
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('.pane').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    document.getElementById('tab-'+t.dataset.tab).classList.add('active');
  });
});

function normalizeAns(s){
  return (s||'').trim().replace(/\s+/g,'').toLowerCase();
}

// Load data
async function loadData(){
  const res = await fetch('data/units.json');
  DATA = await res.json();
  initStudy();
  initTimeAttack();
}

function initStudy(){
  const sel = document.getElementById('unit-select');
  sel.innerHTML = '';
  DATA.units.forEach((u,i)=>{
    const o = document.createElement('option');
    o.value = i; o.textContent = `${u.key}. ${u.name}`;
    sel.appendChild(o);
  });
  sel.addEventListener('change', e=>{
    currentUnitIdx = +e.target.value;
    currentMiddleIdx = 0; currentSubIdx = 0;
    refreshMiddleSelect();
    renderBoard();
  });
  document.getElementById('middle-select').addEventListener('change', e=>{
    currentMiddleIdx = +e.target.value;
    currentSubIdx = 0;
    refreshSubSelect();
    renderBoard();
  });
  document.getElementById('sub-select').addEventListener('change', e=>{
    currentSubIdx = +e.target.value;
    renderBoard();
  });
  document.getElementById('prev-sub').addEventListener('click', goPrev);
  document.getElementById('next-sub').addEventListener('click', goNext);
  document.getElementById('check-btn').addEventListener('click', checkAll);
  document.getElementById('reveal-btn').addEventListener('click', revealAll);
  refreshMiddleSelect();
  renderBoard();
}

function refreshMiddleSelect(){
  const unit = DATA.units[currentUnitIdx];
  const sel = document.getElementById('middle-select');
  sel.innerHTML = '';
  unit.middles.forEach((m,i)=>{
    const o = document.createElement('option');
    o.value = i; o.textContent = `${m.num}. ${m.title}`;
    sel.appendChild(o);
  });
  refreshSubSelect();
}

function refreshSubSelect(){
  const unit = DATA.units[currentUnitIdx];
  const mid = unit.middles[currentMiddleIdx];
  const sel = document.getElementById('sub-select');
  sel.innerHTML = '';
  const CIRCLE = '⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽⑾⑿⒀⒁⒂⒃⒄⒅⒆⒇';
  mid.subs.forEach((s,i)=>{
    const o = document.createElement('option');
    o.value = i;
    const titleShort = s.title.length>40 ? s.title.slice(0,40)+'…' : s.title;
    o.textContent = `${CIRCLE[s.num-1]||s.num} ${titleShort}`;
    sel.appendChild(o);
  });
}

function goPrev(){
  const unit = DATA.units[currentUnitIdx];
  const mid = unit.middles[currentMiddleIdx];
  if(currentSubIdx>0){ currentSubIdx--; }
  else if(currentMiddleIdx>0){
    currentMiddleIdx--;
    const prev = unit.middles[currentMiddleIdx];
    currentSubIdx = prev.subs.length-1;
  }
  else if(currentUnitIdx>0){
    currentUnitIdx--;
    const prevU = DATA.units[currentUnitIdx];
    currentMiddleIdx = prevU.middles.length-1;
    currentSubIdx = prevU.middles[currentMiddleIdx].subs.length-1;
  }
  syncSelects();
  renderBoard();
}

function goNext(){
  const unit = DATA.units[currentUnitIdx];
  const mid = unit.middles[currentMiddleIdx];
  if(currentSubIdx < mid.subs.length-1){ currentSubIdx++; }
  else if(currentMiddleIdx < unit.middles.length-1){
    currentMiddleIdx++; currentSubIdx = 0;
  }
  else if(currentUnitIdx < DATA.units.length-1){
    currentUnitIdx++; currentMiddleIdx = 0; currentSubIdx = 0;
  }
  syncSelects();
  renderBoard();
}

function syncSelects(){
  document.getElementById('unit-select').value = currentUnitIdx;
  refreshMiddleSelect();
  document.getElementById('middle-select').value = currentMiddleIdx;
  refreshSubSelect();
  document.getElementById('sub-select').value = currentSubIdx;
}

// Render board: show entire 소단원 (the current sub) with its item/children
function renderBoard(){
  const unit = DATA.units[currentUnitIdx];
  const mid = unit.middles[currentMiddleIdx];
  const sub = mid.subs[currentSubIdx];
  const board = document.getElementById('board');
  board.innerHTML = '';

  const h1 = document.createElement('div'); h1.className='daedan';
  h1.textContent = `${unit.key}. ${unit.name}`;
  board.appendChild(h1);

  const h2 = document.createElement('div'); h2.className='middle';
  h2.textContent = `${mid.num}. ${mid.title}`;
  board.appendChild(h2);

  const CIRCLE = '⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽⑾⑿⒀⒁⒂⒃⒄⒅⒆⒇';
  const subDiv = document.createElement('div'); subDiv.className='sub';
  const numSpan = document.createElement('span'); numSpan.className='sub-num';
  numSpan.textContent = CIRCLE[sub.num-1] || `(${sub.num})`;
  subDiv.appendChild(numSpan);
  appendWithBlanks(subDiv, sub.title, sub.title_blanks||[]);
  board.appendChild(subDiv);

  sub.items.forEach(it=>{
    const d = document.createElement('div'); d.className='item';
    const mk = document.createElement('span'); mk.className='marker'; mk.textContent = it.marker;
    const tx = document.createElement('span'); tx.className='text';
    appendWithBlanks(tx, it.text, it.blanks||[]);
    d.appendChild(mk); d.appendChild(tx);
    board.appendChild(d);
    (it.children||[]).forEach(c=>{
      const cd = document.createElement('div'); cd.className='item child';
      const cmk = document.createElement('span'); cmk.className='marker'; cmk.textContent = c.marker||'-';
      const ctx = document.createElement('span'); ctx.className='text';
      appendWithBlanks(ctx, c.text, c.blanks||[]);
      cd.appendChild(cmk); cd.appendChild(ctx);
      board.appendChild(cd);
    });
  });

  document.getElementById('score-summary').textContent = '';
  // Update page nav enable
  const totalSubs = mid.subs.length;
  document.getElementById('prev-sub').disabled = (currentUnitIdx===0 && currentMiddleIdx===0 && currentSubIdx===0);
  document.getElementById('next-sub').disabled = (currentUnitIdx===DATA.units.length-1 && currentMiddleIdx===unit.middles.length-1 && currentSubIdx===totalSubs-1);
  // Focus first blank
  const firstBlank = board.querySelector('.blank');
  if(firstBlank) firstBlank.focus();
}

// Append text with blanks inline
function appendWithBlanks(container, text, blanks){
  if(!blanks || blanks.length===0){
    container.appendChild(document.createTextNode(text));
    return;
  }
  // sort by start
  const sorted = [...blanks].sort((a,b)=>a.start-b.start);
  let cursor = 0;
  sorted.forEach(b=>{
    if(b.start > cursor){
      container.appendChild(document.createTextNode(text.slice(cursor, b.start)));
    }
    const inp = document.createElement('input');
    inp.type='text';
    inp.className='blank';
    inp.dataset.ans = b.accept;
    inp.dataset.display = b.display;
    inp.autocomplete='off';
    inp.autocapitalize='off';
    inp.spellcheck=false;
    // width based on display length
    inp.style.width = Math.max(5, b.display.length*1.2+1) + 'ch';
    inp.addEventListener('input', onBlankInput);
    inp.addEventListener('keydown', onBlankKey);
    container.appendChild(inp);
    cursor = b.end;
  });
  if(cursor < text.length){
    container.appendChild(document.createTextNode(text.slice(cursor)));
  }
}

function onBlankInput(e){
  const inp = e.target;
  const ans = normalizeAns(inp.dataset.ans);
  const v = normalizeAns(inp.value);
  if(v === ans){
    inp.classList.add('correct');
    inp.classList.remove('wrong');
    inp.value = inp.dataset.display; // show nice form
    inp.readOnly = true;
    showToast('정답!', false);
    // focus next
    setTimeout(()=>{
      const all = [...document.querySelectorAll('#board .blank')];
      const idx = all.indexOf(inp);
      for(let i=idx+1;i<all.length;i++){
        if(!all[i].readOnly){ all[i].focus(); break; }
      }
    }, 120);
  } else {
    inp.classList.remove('correct','wrong');
  }
}

function onBlankKey(e){
  if(e.key==='Enter'){
    e.preventDefault();
    const inp = e.target;
    const ans = normalizeAns(inp.dataset.ans);
    const v = normalizeAns(inp.value);
    if(v === ans){
      inp.classList.add('correct'); inp.value=inp.dataset.display; inp.readOnly=true;
      showToast('정답!', false);
    } else if(v){
      inp.classList.add('wrong');
      setTimeout(()=>inp.classList.remove('wrong'), 400);
      showToast('오답', true);
    }
  }
}

function showToast(text, wrong){
  const t = document.createElement('div');
  t.className = 'toast' + (wrong?' wrong':'');
  t.textContent = text;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(), 1200);
}

function checkAll(){
  const all = [...document.querySelectorAll('#board .blank')];
  let correct=0, wrong=0, empty=0;
  all.forEach(inp=>{
    if(inp.classList.contains('correct')){ correct++; return; }
    const v = normalizeAns(inp.value);
    const a = normalizeAns(inp.dataset.ans);
    if(!v){ empty++; return; }
    if(v===a){ inp.classList.add('correct'); inp.value=inp.dataset.display; inp.readOnly=true; correct++; }
    else{ inp.classList.add('wrong'); wrong++; }
  });
  const total = all.length;
  document.getElementById('score-summary').textContent =
    `총 ${total} · 정답 ${correct} · 오답 ${wrong} · 미입력 ${empty}`;
}

function revealAll(){
  document.querySelectorAll('#board .blank').forEach(inp=>{
    if(!inp.classList.contains('correct')){
      inp.value = inp.dataset.display;
      inp.classList.add('revealed');
      inp.readOnly = true;
    }
  });
}

// ============= 타임어택 =============
let timeState = null;

function initTimeAttack(){
  const sel = document.getElementById('time-unit-select');
  sel.innerHTML = '<option value="all">전체</option>';
  DATA.units.forEach((u,i)=>{
    const o = document.createElement('option');
    o.value=i; o.textContent = `${u.key}. ${u.name}`;
    sel.appendChild(o);
  });
  document.getElementById('start-btn').addEventListener('click', startTime);
}

function collectBlankItems(unitIdxOrAll){
  // Flatten blanks with context
  const pool = [];
  const units = unitIdxOrAll==='all' ? DATA.units : [DATA.units[unitIdxOrAll]];
  units.forEach(u=>{
    u.middles.forEach(m=>{
      m.subs.forEach(s=>{
        const section = `${u.key}. ${u.name} · ${m.num}. ${m.title}`;
        // title-level blanks
        (s.title_blanks||[]).forEach(b=>{
          pool.push({section, text: s.title, blank: b});
        });
        s.items.forEach(it=>{
          (it.blanks||[]).forEach(b=>{
            pool.push({section, text: it.text, blank: b});
          });
          (it.children||[]).forEach(c=>{
            (c.blanks||[]).forEach(b=>{
              pool.push({section, text: c.text, blank: b});
            });
          });
        });
      });
    });
  });
  return pool;
}

function startTime(){
  if(timeState && timeState.interval){ clearInterval(timeState.interval); }
  const sec = Math.max(10, +document.getElementById('time-input').value || 60);
  const unitVal = document.getElementById('time-unit-select').value;
  const pool = collectBlankItems(unitVal==='all'?'all':+unitVal);
  // shuffle
  for(let i=pool.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [pool[i],pool[j]] = [pool[j],pool[i]];
  }
  timeState = {
    pool, idx: 0, score: 0, left: sec, history: [], interval: null
  };
  document.getElementById('score').textContent = '0';
  document.getElementById('time-left').textContent = sec;
  document.getElementById('time-result').innerHTML = '';
  renderTimeQuestion();
  timeState.interval = setInterval(()=>{
    timeState.left--;
    document.getElementById('time-left').textContent = timeState.left;
    if(timeState.left<=0){ endTime(); }
  }, 1000);
}

function renderTimeQuestion(){
  const board = document.getElementById('time-board');
  board.innerHTML = '';
  if(timeState.idx >= timeState.pool.length){ endTime(); return; }
  const q = timeState.pool[timeState.idx];
  const sec = document.createElement('div'); sec.className='middle';
  sec.textContent = q.section;
  board.appendChild(sec);

  const p = document.createElement('div'); p.className='item';
  const tx = document.createElement('span'); tx.className='text';
  appendWithBlanks(tx, q.text, [q.blank]);
  p.appendChild(tx);
  board.appendChild(p);

  const inp = board.querySelector('.blank');
  if(inp){
    inp.addEventListener('keydown', e=>{
      if(e.key==='Enter'){
        e.preventDefault(); submitTime(inp);
      }
    });
    // Remove default input-check behavior (we handle submit)
    inp.removeEventListener('input', onBlankInput);
    inp.focus();
  }
}

function submitTime(inp){
  const ans = normalizeAns(inp.dataset.ans);
  const v = normalizeAns(inp.value);
  const q = timeState.pool[timeState.idx];
  const correct = (v === ans);
  if(correct){
    timeState.score += 10;
    flash('정답! +10', false);
  } else {
    timeState.score = Math.max(0, timeState.score - 5);
    flash('오답 -5 · 정답: ' + q.blank.display, true);
  }
  document.getElementById('score').textContent = timeState.score;
  timeState.history.push({
    section: q.section, text: q.text, blank: q.blank,
    userInput: inp.value.trim(), correct
  });
  timeState.idx++;
  setTimeout(()=>{
    if(timeState.left>0) renderTimeQuestion();
  }, 500);
}

function flash(msg, wrong){
  const el = document.getElementById('time-flash');
  el.textContent = msg;
  el.className = 'flash' + (wrong?' wrong':'') + ' show';
  setTimeout(()=>{ el.className = 'flash' + (wrong?' wrong':''); }, 600);
}

function endTime(){
  if(timeState.interval){ clearInterval(timeState.interval); timeState.interval = null; }
  document.getElementById('time-board').innerHTML = '';
  const res = document.getElementById('time-result');
  const total = timeState.history.length;
  const correct = timeState.history.filter(h=>h.correct).length;
  const wrong = total - correct;
  res.innerHTML = `<h2>종료! 최종 점수: ${timeState.score}점 · 정답 ${correct} / 오답 ${wrong}</h2>`;
  if(total===0){
    res.innerHTML += '<p>풀이 기록이 없습니다.</p>'; return;
  }
  const h2w = document.createElement('h2'); h2w.textContent='풀이 기록 (오답 정리)';
  res.appendChild(h2w);
  timeState.history.forEach(h=>{
    const d = document.createElement('div');
    d.className = 'result-item' + (h.correct?'':' wrong');
    const sec = document.createElement('div'); sec.className='r-section'; sec.textContent = h.section;
    d.appendChild(sec);
    const tx = document.createElement('div'); tx.className='r-text';
    // render text with answer filled in green color
    const pre = h.text.slice(0, h.blank.start);
    const post = h.text.slice(h.blank.end);
    tx.appendChild(document.createTextNode(pre));
    const ansSpan = document.createElement('span'); ansSpan.className='r-ans'; ansSpan.textContent = h.blank.display;
    tx.appendChild(ansSpan);
    tx.appendChild(document.createTextNode(post));
    d.appendChild(tx);
    if(!h.correct){
      const cmp = document.createElement('div'); cmp.className='r-compare';
      const u = document.createElement('span'); u.className='user'; u.textContent = '입력: '+(h.userInput||'(없음)');
      const a = document.createElement('span'); a.className='ans'; a.textContent = '정답: '+h.blank.display;
      cmp.appendChild(u); cmp.appendChild(a);
      d.appendChild(cmp);
    }
    res.appendChild(d);
  });
}

loadData();
