/* 세계시민과 지리 · 빈칸 학습 v3 */
(() => {
  const state = {
    chapters: [],
    currentChapter: null,
    pool: [],       // {chapterId, sectionId, sentence, candIdx}
    items: [],      // 화면에 표시 중인 아이템(섹션구분 포함)
    activeBlanks: [],
    // time attack
    ta: {
      timer: null,
      remain: 0,
      score: 0,
      correct: 0,
      wrong: 0,
      pool: [],
      currentItem: null,
      running: false,
    }
  };

  // ====== 유틸 ======
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const shuffle = a => { const b=[...a]; for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];} return b; };
  const rand = n => Math.floor(Math.random()*n);

  function normalize(s){
    return (s||"").trim().replace(/\s+/g,"").toLowerCase();
  }

  // ====== 데이터 로딩 ======
  async function load(){
    const res = await fetch("data/units.json");
    const j = await res.json();
    state.chapters = j.chapters;
    // populate selects
    const opts = state.chapters.map(c =>
      `<option value="${c.id}">${c.full_title}</option>`).join("");
    $("#unitSelect").innerHTML = opts;
    $("#taUnitSelect").innerHTML = opts;
  }

  // ====== 탭 ======
  $$(".tab").forEach(b => b.addEventListener("click", () => {
    $$(".tab").forEach(x => x.classList.remove("active"));
    $$(".panel").forEach(x => x.classList.remove("active"));
    b.classList.add("active");
    $("#"+b.dataset.tab).classList.add("active");
  }));

  // ====== 학습 모드 ======
  function buildPool(chapterId){
    const ch = state.chapters.find(c => c.id === chapterId);
    if (!ch) return [];
    const pool = [];
    ch.sections.forEach(sec => {
      sec.sentences.forEach(sent => {
        if (!sent.candidates || sent.candidates.length === 0) return;
        pool.push({
          chapterId: ch.id,
          sectionId: sec.section_id,
          subLabel: sec.sub_label,
          mainHeading: sec.main_heading,
          sentence: sent
        });
      });
    });
    return pool;
  }

  function generate(){
    const chapterId = $("#unitSelect").value;
    state.currentChapter = state.chapters.find(c => c.id === chapterId);
    let count = parseInt($("#blankCount").value, 10) || 10;
    count = Math.max(1, Math.min(50, count));

    const pool = buildPool(chapterId);
    if (pool.length === 0){
      $("#paper").innerHTML = "<p style='padding:20px'>이 단원에는 빈칸으로 만들 수 있는 문장이 없습니다.</p>";
      return;
    }
    // 랜덤으로 문장 뽑기 (빈칸 수 만큼)
    const shuffled = shuffle(pool).slice(0, count);
    // 섹션 묶음 보이도록 section 순서대로 정렬
    const secOrder = new Map();
    state.currentChapter.sections.forEach((s,i) => secOrder.set(s.section_id, i));
    shuffled.sort((a,b) => (secOrder.get(a.sectionId) - secOrder.get(b.sectionId)));

    // 렌더
    const paper = $("#paper");
    paper.innerHTML = "";
    state.activeBlanks = [];

    let lastSection = null;
    let lastMain = null;

    shuffled.forEach(item => {
      // 섹션 구분선
      if (lastSection !== null && item.sectionId !== lastSection){
        const sep = document.createElement("div");
        sep.className = "section-sep";
        sep.innerHTML = "<span>· · ·</span>";
        paper.appendChild(sep);
      }
      // 섹션이 바뀌었고 main heading도 있으면 제목 1줄 표시
      if (item.sectionId !== lastSection && item.mainHeading){
        if (lastMain !== item.mainHeading){
          const h = document.createElement("div");
          h.className = "heading";
          h.textContent = `${item.mainHeading}  ${item.subLabel||""}`;
          paper.appendChild(h);
          lastMain = item.mainHeading;
        }
      }
      lastSection = item.sectionId;

      // 문장 렌더 (빈칸 1개 랜덤)
      const cands = item.sentence.candidates;
      const pick = cands[rand(cands.length)];
      const row = document.createElement("div");
      row.className = "sent-row";

      const text = item.sentence.text;
      // pick.token 을 input으로 치환 (첫 등장만)
      const idx = text.indexOf(pick.token);
      if (idx < 0){
        row.textContent = text;
      } else {
        const before = text.slice(0, idx);
        const after  = text.slice(idx + pick.token.length);
        row.appendChild(document.createTextNode(before));
        const inp = document.createElement("input");
        inp.className = "blank";
        inp.dataset.answer = pick.answer;
        inp.setAttribute("autocomplete","off");
        inp.setAttribute("autocapitalize","off");
        inp.setAttribute("autocorrect","off");
        inp.setAttribute("spellcheck","false");
        inp.style.width = Math.max(2.5, pick.answer.length * 1.1) + "em";
        inp.addEventListener("input", onBlankInput);
        row.appendChild(inp);
        if (pick.tail) row.appendChild(document.createTextNode(pick.tail));
        row.appendChild(document.createTextNode(after));
        state.activeBlanks.push(inp);
      }
      paper.appendChild(row);
    });

    updateProgress();
    $("#unitInfo").textContent = state.currentChapter.full_title;
  }

  function onBlankInput(e){
    const inp = e.target;
    const ok = normalize(inp.value) === normalize(inp.dataset.answer);
    if (ok){
      inp.classList.add("ok");
      inp.value = inp.dataset.answer;
      inp.blur();
    }
    updateProgress();
  }

  function updateProgress(){
    const total = state.activeBlanks.length;
    const done = state.activeBlanks.filter(i => i.classList.contains("ok") || i.classList.contains("show")).length;
    $("#progress").innerHTML = `<b>${done}</b> / ${total}`;
  }

  function showAllAnswers(){
    state.activeBlanks.forEach(inp => {
      if (!inp.classList.contains("ok")){
        inp.classList.add("show");
        inp.value = inp.dataset.answer;
      }
    });
    updateProgress();
  }

  $("#btnNew").addEventListener("click", generate);
  $("#btnShow").addEventListener("click", showAllAnswers);

  // ====== 타임어택 ======
  function taRender(item){
    const stage = $("#taStage");
    stage.innerHTML = "";
    if (!item){
      stage.innerHTML = "<p class='hint'>문제가 없습니다. 다른 단원을 선택해 주세요.</p>";
      return;
    }
    const heading = document.createElement("div");
    heading.className = "heading";
    heading.textContent = `${item.mainHeading||""}  ${item.subLabel||""}`;
    stage.appendChild(heading);

    const row = document.createElement("div");
    row.className = "sent-row";
    const text = item.sentence.text;
    const pick = item.pick;
    const idx = text.indexOf(pick.token);
    row.appendChild(document.createTextNode(text.slice(0, idx)));
    const inp = document.createElement("input");
    inp.className = "blank";
    inp.id = "taInput";
    inp.setAttribute("autocomplete","off");
    inp.setAttribute("autocapitalize","off");
    inp.setAttribute("autocorrect","off");
    inp.setAttribute("spellcheck","false");
    inp.style.width = Math.max(3, pick.answer.length * 1.1) + "em";
    inp.addEventListener("keydown", e => {
      if (e.key === "Enter"){ e.preventDefault(); taSubmit(); }
    });
    row.appendChild(inp);
    if (pick.tail) row.appendChild(document.createTextNode(pick.tail));
    row.appendChild(document.createTextNode(text.slice(idx + pick.token.length)));
    stage.appendChild(row);

    setTimeout(()=>inp.focus(), 10);
  }

  function taNext(){
    const ta = state.ta;
    if (ta.pool.length === 0){
      // 다시 채우기 (무한 반복)
      const chId = $("#taUnitSelect").value;
      ta.pool = shuffle(buildPool(chId));
    }
    const item = ta.pool.pop();
    if (!item){ taRender(null); return; }
    const pick = item.sentence.candidates[rand(item.sentence.candidates.length)];
    ta.currentItem = { ...item, pick };
    taRender(ta.currentItem);
  }

  function taSubmit(){
    const ta = state.ta;
    if (!ta.running || !ta.currentItem) return;
    const inp = $("#taInput");
    const ans = ta.currentItem.pick.answer;
    const ok = normalize(inp.value) === normalize(ans);
    const stage = $("#taStage");
    if (ok){
      ta.score += 10; ta.correct += 1;
      stage.classList.remove("flash-wrong");
      stage.classList.add("flash-correct");
    } else {
      ta.score = Math.max(0, ta.score - 5); ta.wrong += 1;
      stage.classList.remove("flash-correct");
      stage.classList.add("flash-wrong");
    }
    setTimeout(()=>stage.classList.remove("flash-correct","flash-wrong"), 450);
    taUpdateScore();
    taNext();
  }

  function taUpdateScore(){
    const ta = state.ta;
    $("#taScore").textContent = ta.score;
    $("#taCorrect").textContent = ta.correct;
    $("#taWrong").textContent = ta.wrong;
  }

  function taStart(){
    const ta = state.ta;
    ta.score = 0; ta.correct = 0; ta.wrong = 0;
    ta.remain = Math.max(10, parseInt($("#taTime").value,10) || 60);
    const chId = $("#taUnitSelect").value;
    ta.pool = shuffle(buildPool(chId));
    ta.running = true;
    taUpdateScore();
    $("#taTimer").textContent = ta.remain;
    $("#btnStart").disabled = true;
    $("#btnStop").disabled = false;
    taNext();
    if (ta.timer) clearInterval(ta.timer);
    ta.timer = setInterval(()=>{
      ta.remain -= 1;
      $("#taTimer").textContent = ta.remain;
      if (ta.remain <= 0) taStop(true);
    }, 1000);
  }

  function taStop(finished){
    const ta = state.ta;
    ta.running = false;
    if (ta.timer){ clearInterval(ta.timer); ta.timer = null; }
    $("#btnStart").disabled = false;
    $("#btnStop").disabled = true;
    if (finished){
      const stage = $("#taStage");
      stage.innerHTML =
        `<div class="heading">🎉 종료!</div>
         <div class="sent-row">최종 점수: <b>${ta.score}</b>점 · 정답 ${ta.correct}개 / 오답 ${ta.wrong}개</div>
         <div class="sent-row">다시 시작하려면 상단의 <b>시작</b> 버튼을 누르세요.</div>`;
    }
  }

  $("#btnStart").addEventListener("click", taStart);
  $("#btnStop").addEventListener("click", () => taStop(true));

  // ====== 초기화 ======
  load().then(()=>{
    // 기본 단원 1개 선택 후 자동 생성
    generate();
  }).catch(err => {
    $("#paper").innerHTML = `<p style='padding:20px;color:#c23a3a'>데이터 로드 실패: ${err.message}<br>로컬 파일(file://)로 열면 동작하지 않습니다. <code>python -m http.server</code>로 실행해 주세요.</p>`;
  });

})();
