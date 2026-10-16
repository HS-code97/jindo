/* ============ 보배섬 진도, 가을 노을 — 앱 ============ */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const store = {
    get(k, d) { try { const v = localStorage.getItem("jd26:" + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem("jd26:" + k, JSON.stringify(v)); } catch {} },
  };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const gmap = q => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q);
  const nmap = q => "https://map.naver.com/p/search/" + encodeURIComponent(q);
  const won = n => (Math.round(n) || 0).toLocaleString("ko-KR") + "원";
  const TYPE_LABEL = { spot: "SIGHT · 관광", food: "EAT · 식사", stay: "STAY · 숙소" };
  const WALK = { 1: ["w1", "🟢 걷기 편함"], 2: ["w2", "🟡 조금 걸음"], 3: ["w3", "🔴 계단·오르막"] };
  const FALLBACK_BG = "linear-gradient(135deg,#ffd9c2,#fff1e6)";
  const TZ = "Asia/Seoul";

  // 일정 카드의 선택지: options가 있으면 1·2·3번, 없으면 카드 자체가 하나의 선택지
  const optsOf = it => it.options || [{ title: it.title, text: it.text, place: it.place }];

  // 선택한 일정: 주소 ?plan=2 → 이 폰에 저장된 선택 → 기본(일정 1)
  const planById = id => PLANS.find(p => p.id === id);
  const urlPlan = new URLSearchParams(location.search).get("plan");
  let plan = planById("p" + urlPlan) || planById(store.get("plan", "")) || PLANS[0];
  let DAYS = plan.days;

  // 장소가 등장하는 날짜 매핑 (일정을 바꾸면 다시 계산)
  let placeDays = {};
  function computePlaceDays() {
    placeDays = {};
    DAYS.forEach((d, i) => d.items.forEach(it => optsOf(it).forEach(o => {
      if (!o.place) return;
      (placeDays[o.place] ||= new Set()).add(i);
    })));
  }
  computePlaceDays();

  /* ---------- 윤슬 캔버스 (바다 위 반짝임이 천천히 떠오름) ---------- */
  function glow() {
    const cv = $("#glow"), ctx = cv.getContext("2d");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W, H, dots = [], dpr = Math.min(devicePixelRatio || 1, 2), running = true;
    const COLORS = ["255,214,170", "255,183,140", "255,240,220", "255,160,120"];
    function resize() {
      W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = reduce ? 0 : Math.round(Math.min(70, W * H / 14000));
      dots = Array.from({ length: n }, () => mk(true));
    }
    function mk(any) {
      const r = Math.random() * 1.8 + .5;
      return { x: Math.random() * W, y: any ? Math.random() * H : H + 10, r, s: r * .18 + .08, w: Math.random() * Math.PI * 2,
        t: Math.random() * Math.PI * 2, c: COLORS[Math.floor(Math.random() * COLORS.length)] };
    }
    function tick() {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      for (const f of dots) {
        f.w += .008; f.t += .03; f.y -= f.s; f.x += Math.sin(f.w) * .25;
        if (f.y < -10) Object.assign(f, mk(false));
        const o = .25 + (Math.sin(f.t) + 1) * .28;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7);
        ctx.shadowColor = `rgba(${f.c},.9)`; ctx.shadowBlur = 8;
        ctx.fillStyle = `rgba(${f.c},${o})`; ctx.fill();
      }
      ctx.shadowBlur = 0;
      requestAnimationFrame(tick);
    }
    addEventListener("resize", resize);
    document.addEventListener("visibilitychange", () => { running = !document.hidden; if (running) tick(); });
    resize(); tick();
  }

  /* ---------- 카운트다운 ---------- */
  function countdown() {
    const el = $("#countdown"), start = new Date(TRIP.start), end = new Date(TRIP.end);
    function draw() {
      const now = new Date();
      if (now >= start && now <= end) {
        const dayIdx = todayIndex();
        el.innerHTML = `<div class="cd-msg">🌅 지금 진도 여행 중! 오늘은 ${DAYS[dayIdx]?.label || ""} · ${esc(DAYS[dayIdx]?.title || "")}</div>`;
        return;
      }
      if (now > end) { el.innerHTML = `<div class="cd-msg">📸 추억 저장 완료! 장인·장모님과 또 떠나요.</div>`; return; }
      let s = Math.floor((start - now) / 1000);
      const d = Math.floor(s / 86400); s %= 86400;
      const h = Math.floor(s / 3600); s %= 3600;
      const m = Math.floor(s / 60);
      el.innerHTML = [[`D-${d}`, "DAYS"], [String(h).padStart(2, "0"), "HOURS"], [String(m).padStart(2, "0"), "MIN"]]
        .map(([v, l]) => `<div class="cd-box"><b>${v}</b><span>${l}</span></div>`).join("");
    }
    draw(); setInterval(draw, 30000);
  }
  function todayIndex() {
    const t = new Date().toLocaleDateString("sv-SE", { timeZone: TZ });
    return DAYS.findIndex(d => d.date === t);
  }

  /* ---------- 이미지 ---------- */
  function fallback(el, p) { el.textContent = p.emoji; el.style.background = FALLBACK_BG; }
  function bg(el, p) {
    if (!p.img) return fallback(el, p);
    const im = new Image();
    im.referrerPolicy = "no-referrer";
    im.onload = () => { el.style.backgroundImage = `url("${p.img}")`; el.textContent = ""; };
    im.onerror = () => fallback(el, p);
    el.textContent = p.emoji;
    im.src = p.img;
  }
  // 화면에 들어올 때 로드
  const io = "IntersectionObserver" in window ? new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; io.unobserve(e.target); bg(e.target, PLACES[e.target.dataset.img]);
  }), { rootMargin: "300px" }) : null;
  function lazy(root) { $$("[data-img]", root).forEach(el => io ? io.observe(el) : bg(el, PLACES[el.dataset.img])); }
  const walkTag = p => p?.walk ? `<span class="walk ${WALK[p.walk[0]][0]}">${WALK[p.walk[0]][1]}</span>` : "";

  /* ---------- 개요 ---------- */
  function overview() {
    $("#overview").innerHTML = `
      <h2 class="ov-title">한눈에 보는 1박 2일 · ${esc(plan.label)}</h2>
      <p class="ov-plan"><b>${esc(plan.label)} · ${esc(plan.title)}</b><br>${esc(plan.note)}</p>
      <div class="ov-list">
        ${DAYS.map((d, i) => `
          <button class="ov-item" data-go="${i}">
            <div class="ov-date"><b>${+d.date.slice(8)}</b><small>10월 · ${d.dow}</small></div>
            <div class="ov-main"><b>${esc(d.title)}</b><span>${esc(d.subtitle)}</span></div>
            <i class="ov-dot" style="background:${d.hue};color:${d.hue}"></i>
          </button>`).join("")}
      </div>
      <p class="ov-note">🏨 숙소: 쏠비치 호텔&amp;리조트 진도 (의신면 · 바다 전망)<br>🦀 꽃게 밥상 · 🥁 토요민속공연 · 🎨 운림산방 · 🌊 인피니티풀 · 🚡 해상케이블카<br>🕘 광양 09:30 출발 → 다음 날 17:00 전 도착</p>`;
    $$(".ov-item").forEach(b => b.onclick = () => { selectDay(+b.dataset.go); $("#daybarWrap").scrollIntoView({ behavior: "smooth" }); });
  }

  /* ---------- 일정 ---------- */
  let curDay = 0, team = store.get("team", "all");
  function daybar() {
    const ti = todayIndex();
    $("#daybar").innerHTML = DAYS.map((d, i) => `
      <button class="day-chip" role="tab" data-i="${i}">
        <b style="color:${d.hue}">${d.label}${i === ti ? '<span class="today">TODAY</span>' : ""}</b>
        <span>10/${+d.date.slice(8)}</span><small>${d.dow}</small>
      </button>`).join("");
    $$(".day-chip").forEach(b => b.onclick = () => selectDay(+b.dataset.i));
  }
  function selectDay(i) {
    curDay = i;
    $$(".day-chip").forEach(b => b.classList.toggle("active", +b.dataset.i === i));
    $(".day-chip.active")?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    store.set("day", i);
    renderDay();
  }
  function nowItemIndex(d, items) {
    if (todayIndex() !== DAYS.indexOf(d)) return -1;
    const hm = new Date().toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
    let idx = -1; items.forEach((it, k) => { if (it.time <= hm) idx = k; });
    return idx;
  }
  // 카드별 선택된 번호 (날짜 탭을 오가도 유지, 새로고침하면 1번으로)
  const optSel = {};
  function optBodyHTML(o) {
    const p = o.place && PLACES[o.place];
    return `
      <h4>${esc(o.title)}</h4>
      <p>${esc(o.text)}</p>
      ${p ? `
        <button class="tl-place" data-open="${o.place}">
          <div class="tl-thumb" data-img="${o.place}"></div>
          <div class="tl-place-main"><b>${esc(p.name)}</b><span>${esc(p.area || "")}</span><br>${walkTag(p)}${p.menu ? ` <em>👨‍👩‍👧 우리 가족 맞춤 메뉴 보기</em>` : ""}</div>
          <span class="tl-arrow">›</span>
        </button>` : ""}`;
  }
  function bindOptTabs(card, d, items) {
    const key = card.dataset.key;
    const it = items.find(x => d.id + ":" + x.k === key);
    const opts = it.options;
    const tabs = $$(".opt-tab", card), wrap = $(".opt-wrap", card), body = $(".opt-body", card);
    const bindBody = () => {
      lazy(body);
      $$("[data-open]", body).forEach(b => b.onclick = () => openSheet(b.dataset.open));
    };
    let timer;
    function select(n, focus) {
      if (n === (optSel[key] || 0)) { if (focus) tabs[n].focus(); return; }
      optSel[key] = n;
      tabs.forEach((t, i) => {
        t.classList.toggle("active", i === n);
        t.setAttribute("aria-selected", i === n);
        t.tabIndex = i === n ? 0 : -1;
      });
      body.setAttribute("aria-labelledby", tabs[n].id);
      if (focus) tabs[n].focus();
      // 가벼운 페이드 + 높이 보간
      clearTimeout(timer);
      wrap.style.height = wrap.offsetHeight + "px";
      body.classList.add("fade");
      timer = setTimeout(() => {
        body.innerHTML = optBodyHTML(opts[n]);
        bindBody();
        wrap.style.height = body.offsetHeight + "px";
        body.classList.remove("fade");
        timer = setTimeout(() => { wrap.style.height = ""; }, 280);
      }, 130);
    }
    tabs.forEach((t, i) => {
      t.onclick = () => select(i);
      t.onkeydown = e => {
        const last = tabs.length - 1;
        const to = e.key === "ArrowRight" ? (i + 1) % tabs.length : e.key === "ArrowLeft" ? (i - 1 + tabs.length) % tabs.length
          : e.key === "Home" ? 0 : e.key === "End" ? last : -1;
        if (to < 0) return;
        e.preventDefault(); select(to, true);
      };
    });
  }

  function renderDay() {
    const d = DAYS[curDay];
    let items = d.items.map((it, k) => ({ ...it, k }));
    if (d.split) {
      if (team !== "all") items = items.filter(it => it.team === "all" || it.team === team);
      items.sort((a, b) => a.time.localeCompare(b.time) || a.k - b.k);
    }
    const nowIdx = nowItemIndex(d, items);
    const missionKey = "mission:" + plan.id + ":" + d.id;
    const missionDone = store.get(missionKey, []);
    const teamNote = d.teamNote || {};
    $("#dayPanel").innerHTML = `
      <div class="day-head" style="--hue:${d.hue}">
        <div class="dh-label">${d.label} · 10월 ${+d.date.slice(8)}일 (${d.dow})</div>
        <div class="dh-title">${esc(d.title)}</div>
        <div class="dh-sub">${esc(d.subtitle)}</div>
        <div class="dh-meta">
          <span>🌡️ ${d.temp}</span><span>🌇 일몰 ${d.sunset}</span>
          <span>🚶 활동량 ${"●".repeat(d.stamina)}${"○".repeat(3 - d.stamina)}</span>
          ${d.holiday ? `<span class="dh-holiday">🧺 ${esc(d.holiday)}</span>` : ""}
        </div>
      </div>
      ${d.split ? `
        <div class="team-switch" id="teamSwitch">
          <button data-team="all">👨‍👩‍👧‍👦 전체</button>
          <button data-team="pool">🌊 물놀이팀</button>
          <button data-team="rest">🌅 발코니팀</button>
        </div>
        <p class="team-note">${esc(teamNote[team] || teamNote.all || "")}</p>` : ""}
      <div class="timeline">
        ${items.map((it, k) => {
          const opts = optsOf(it), multi = !!it.options;
          const key = d.id + ":" + it.k;
          const sel = multi ? Math.min(optSel[key] || 0, opts.length - 1) : 0;
          const badge = it.team === "rest" ? '<span class="tl-badge girls">🌅 발코니팀 · 나·장인어른</span>' : it.team === "pool" ? '<span class="tl-badge boy">🌊 물놀이팀 · 장모님·아내·딸</span>' : "";
          return `
          <div class="tl-item">
            <div class="tl-time"><b>${it.time}</b><div class="tl-icon">${it.icon}</div></div>
            <div class="tl-card${k === nowIdx ? " now" : ""}" ${multi ? `data-key="${key}"` : ""}>
              ${multi ? `<div class="opt-row">
                <div class="opt-tabs" role="tablist" aria-label="선택지">
                  ${opts.map((o, n) => {
                    const nm = PLACES[o.place]?.name || o.title;
                    return `<button type="button" class="opt-tab${n === sel ? " active" : ""}" role="tab" id="ot-${key.replace(":", "-")}-${n}" aria-controls="op-${key.replace(":", "-")}" aria-selected="${n === sel}" tabindex="${n === sel ? 0 : -1}" data-n="${n}" title="${esc(nm)}" aria-label="${n + 1}번 ${esc(nm)}">${n + 1}</button>`;
                  }).join("")}
                </div>${badge}</div>` : badge}
              <div class="opt-wrap">
                <div class="opt-body"${multi ? ` role="tabpanel" id="op-${key.replace(":", "-")}" aria-labelledby="ot-${key.replace(":", "-")}-${sel}"` : ""}>${optBodyHTML(opts[sel])}</div>
              </div>
              ${it.care ? `<div class="tl-care">${esc(it.care)}</div>` : ""}
            </div>
          </div>`;
        }).join("")}
      </div>
      <div class="mission">
        <h3>✨ 오늘의 가족 미션</h3>
        ${d.mission.map((m, k) => `
          <label class="check"><input type="checkbox" data-m="${k}" ${missionDone.includes(k) ? "checked" : ""}><span>${esc(m)}</span></label>`).join("")}
      </div>
      <div class="day-nav">
        <button id="prevDay" ${curDay === 0 ? "disabled" : ""}>‹ 이전 날</button>
        <button id="nextDay" ${curDay === DAYS.length - 1 ? "disabled" : ""}>다음 날 ›</button>
      </div>`;
    lazy($("#dayPanel"));
    $$("[data-open]", $("#dayPanel")).forEach(b => b.onclick = () => openSheet(b.dataset.open));
    $$(".tl-card[data-key]", $("#dayPanel")).forEach(card => bindOptTabs(card, d, items));
    $$(".mission input").forEach(cb => cb.onchange = () => {
      const done = $$(".mission input").filter(x => x.checked).map(x => +x.dataset.m);
      store.set(missionKey, done);
      if (cb.checked) toast("미션 완료! 🌅");
    });
    if (d.split) {
      $$("#teamSwitch button").forEach(b => {
        b.classList.toggle("active", b.dataset.team === team);
        b.onclick = () => { team = b.dataset.team; store.set("team", team); renderDay(); };
      });
    }
    $("#prevDay").onclick = () => { selectDay(curDay - 1); $("#daybarWrap").scrollIntoView({ behavior: "smooth" }); };
    $("#nextDay").onclick = () => { selectDay(curDay + 1); $("#daybarWrap").scrollIntoView({ behavior: "smooth" }); };
  }

  /* ---------- 바텀시트 ---------- */
  const sheet = $("#sheet"), backdrop = $("#sheetBackdrop");
  let sheetOpen = false;
  function openSheet(id) {
    const p = PLACES[id]; if (!p) return;
    const days = [...(placeDays[id] || [])].map(i => DAYS[i].label);
    $("#sheetBody").innerHTML = `
      <div class="sh-img" id="shImg">${p.imgNote ? `<span class="note">${esc(p.imgNote)}</span>` : ""}</div>
      ${p.credit ? `<p class="photo-credit">📷 ${esc(p.credit)}</p>` : ""}
      <div class="sh-content">
        <div class="sh-type">${TYPE_LABEL[p.type]}</div>
        <h2>${esc(p.name)}</h2>
        <div class="sh-jp">${esc(p.sub || "")}</div>
        <div class="sh-meta">
          ${p.area ? `<span>📍 ${esc(p.area)}</span>` : ""}
          ${days.length ? `<span>🗓️ ${days.join(", ")}</span>` : ""}
          ${p.price ? `<span>💳 ${esc(p.price)}</span>` : ""}
        </div>
        <p>${esc(p.desc)}</p>
        ${p.walk ? `<div class="sh-walk"><b>🚶 동선 · ${WALK[p.walk[0]][1]}</b>${esc(p.walk[1])}</div>` : ""}
        ${p.menu ? `<h4>🍽️ 우리 가족 맞춤 메뉴</h4>${menuHTML(p)}` : ""}
        ${p.tips?.length ? `<h4>💡 알아두면 좋은 팁</h4><ul class="sh-tips">${p.tips.map(t => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
        <div class="sh-actions">
          <a class="btn dark" href="${nmap(p.q || p.name)}" target="_blank" rel="noopener">🧭 네이버 길찾기</a>
          <a class="btn light" href="${gmap(p.q || p.name)}" target="_blank" rel="noopener">🗺️ 구글맵</a>
        </div>
        <div class="sh-actions" style="margin-top:8px">
          ${p.lat ? `<button class="btn light" id="shOnMap">📍 지도에서 보기</button>` : ""}
          ${p.src ? `<a class="btn light" href="${p.src}" target="_blank" rel="noopener">📖 소개 페이지</a>` : ""}
        </div>
      </div>`;
    const img = $("#shImg");
    if (p.img) {
      const im = new Image();
      im.referrerPolicy = "no-referrer";
      im.onload = () => { img.style.backgroundImage = `url("${p.img}")`; };
      im.onerror = () => { img.insertAdjacentText("beforeend", p.emoji); img.style.background = FALLBACK_BG; };
      im.src = p.img;
    } else { img.insertAdjacentText("beforeend", p.emoji); img.style.background = FALLBACK_BG; }
    const onMap = $("#shOnMap");
    if (onMap) onMap.onclick = () => { closeSheet(); showView("map"); setTimeout(() => focusPlace(id), 350); };
    $("#sheetBody").scrollTop = 0;
    backdrop.hidden = false;
    requestAnimationFrame(() => { backdrop.classList.add("show"); sheet.classList.add("open"); });
    sheet.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    if (!sheetOpen) history.pushState({ sheet: 1 }, "");
    sheetOpen = true;
  }
  function closeSheet(fromPop) {
    if (!sheetOpen) return;
    sheetOpen = false;
    sheet.classList.remove("open"); backdrop.classList.remove("show");
    sheet.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    setTimeout(() => { backdrop.hidden = true; }, 300);
    if (!fromPop && history.state?.sheet) history.back();
  }
  addEventListener("popstate", () => closeSheet(true));
  backdrop.onclick = () => closeSheet();
  $("#sheetClose").onclick = () => closeSheet();
  // 아래로 스와이프해서 닫기
  (() => {
    let y0 = null, dy = 0;
    const body = $("#sheetBody");
    sheet.addEventListener("touchstart", e => { if (body.scrollTop <= 0) { y0 = e.touches[0].clientY; dy = 0; sheet.style.transition = "none"; } }, { passive: true });
    sheet.addEventListener("touchmove", e => { if (y0 === null) return; dy = Math.max(0, e.touches[0].clientY - y0); if (dy > 0) sheet.style.transform = `translateY(${dy}px)`; }, { passive: true });
    sheet.addEventListener("touchend", () => { if (y0 === null) return; sheet.style.transition = ""; sheet.style.transform = ""; if (dy > 110) closeSheet(); y0 = null; });
  })();

  function menuHTML(p) {
    return `<div class="menu-grid">
      <div class="menu-col a"><h5>👴👵 장인·장모님</h5><ul>${p.menu.senior.map(m => `<li>${esc(m)}</li>`).join("")}</ul></div>
      <div class="menu-col t"><h5>👨‍👩‍👧 우리 가족 3명</h5><ul>${p.menu.family.map(m => `<li>${esc(m)}</li>`).join("")}</ul></div>
    </div>`;
  }

  /* ---------- 맛집 ---------- */
  const FOOD_FILTERS = [
    ["all", "전체"], ["meal", "🍽️ 식사"], ["sweet", "☕ 카페"], ["near", "🏨 리조트 근처"], ["eup", "🏘️ 진도읍"],
    ["d0", "DAY 1"], ["d1", "DAY 2"],
  ];
  const SWEET = new Set(["cafe"]);
  const NEAR = new Set(["yongcheon", "seafood", "haenyeo"]);
  const EUP = new Set(["shinhodeung", "dalnim", "ihwa"]);
  let foodFilter = "all";
  function foodView() {
    $("#foodFilters").innerHTML = FOOD_FILTERS.map(([k, l]) => `<button class="chip" data-f="${k}">${l}</button>`).join("");
    $$("#foodFilters .chip").forEach(b => b.onclick = () => { foodFilter = b.dataset.f; renderFood(); });
    renderFood();
  }
  function renderFood() {
    $$("#foodFilters .chip").forEach(b => b.classList.toggle("active", b.dataset.f === foodFilter));
    const ids = Object.keys(PLACES).filter(id => PLACES[id].menu).filter(id => {
      if (foodFilter === "all") return true;
      if (foodFilter === "meal") return !SWEET.has(id);
      if (foodFilter === "sweet") return SWEET.has(id);
      if (foodFilter === "near") return NEAR.has(id);
      if (foodFilter === "eup") return EUP.has(id);
      return placeDays[id]?.has(+foodFilter.slice(1));
    }).sort((a, b) => Math.min(...(placeDays[a] || [9])) - Math.min(...(placeDays[b] || [9])));
    $("#foodList").innerHTML = ids.map(id => {
      const p = PLACES[id];
      const days = [...(placeDays[id] || [])].sort().map(i => `<span style="background:${DAYS[i].hue};color:#141a33">${DAYS[i].label}</span>`).join("");
      return `
      <article class="food-card">
        <div class="fc-img" data-img="${id}">
          <div class="days">${days}</div>
          ${p.price ? `<span class="price">${esc(p.price)}</span>` : ""}
          ${p.imgNote ? `<span class="note">${esc(p.imgNote)}</span>` : ""}
        </div>
        <div class="fc-body">
          <h3>${p.emoji} ${esc(p.name)}</h3>
          <div class="fc-jp">${esc(p.sub || "")} · ${esc(p.area || "")}</div>
          <p>${esc(p.desc)}</p>
          ${p.walk ? `<p style="margin:-4px 0 10px">${walkTag(p)}</p>` : ""}
          ${menuHTML(p)}
          <div class="fc-actions">
            <button class="btn light" data-open="${id}">자세히 · 팁</button>
            <a class="btn dark" href="${nmap(p.q || p.name)}" target="_blank" rel="noopener">🧭 길찾기</a>
          </div>
        </div>
      </article>`;
    }).join("");
    // fc-img 안의 배지가 지워지지 않도록 전용 로더
    $$("#foodList .fc-img").forEach(el => {
      const p = PLACES[el.dataset.img]; el.removeAttribute("data-img");
      const fb = () => { el.insertAdjacentText("beforeend", p.emoji); el.style.background = FALLBACK_BG; };
      const load = () => {
        if (!p.img) return fb();
        const im = new Image();
        im.referrerPolicy = "no-referrer";
        im.onload = () => { el.style.backgroundImage = `url("${p.img}")`; };
        im.onerror = fb; im.src = p.img;
      };
      if (io) { const o = new IntersectionObserver(es => { if (es[0].isIntersecting) { o.disconnect(); load(); } }, { rootMargin: "300px" }); o.observe(el); } else load();
    });
    $$("#foodList [data-open]").forEach(b => b.onclick = () => openSheet(b.dataset.open));
  }

  /* ---------- 지도 ---------- */
  let map, markers = {}, mapFilter = "all";
  const HOME = "solbeach";
  const VIEWS = {
    eup: [[34.476, 126.256], [34.489, 126.274]],
    resort: [[34.396, 126.296], [34.470, 126.342]],
    bridge: [[34.562, 126.296], [34.575, 126.312]],
    sebang: [[34.430, 126.090], [34.450, 126.115]],
  };
  function initMap() {
    if (map || !window.L) return;
    map = L.map("map", { zoomControl: false, attributionControl: true });
    L.control.zoom({ position: "topright" }).addTo(map);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    layer = L.layerGroup().addTo(map);
    drawMarkers();
    $$("#jumpRow button").forEach(b => b.onclick = () => {
      const k = b.dataset.fly;
      if (k === "all") map.flyToBounds(allBounds(), { duration: 1 });
      else map.flyToBounds(VIEWS[k], { duration: 1 });
    });
    map.fitBounds(allBounds());
  }
  // 마커·동선·날짜 필터 (일정을 바꾸면 다시 그림)
  let layer;
  function drawMarkers() {
    layer.clearLayers(); markers = {};
    Object.entries(PLACES).forEach(([id, p]) => {
      if (!p.lat) return;
      const di = [...(placeDays[id] || [])];
      const color = id === HOME ? "#ff6b4a" : di.length ? DAYS[Math.min(...di)].hue : "#f6b48a";
      const icon = L.divIcon({
        className: "", iconSize: [34, 34], iconAnchor: [4, 34], popupAnchor: [13, -30],
        html: `<div class="pin${id === HOME ? " home" : ""}" style="background:${color}"><span>${p.emoji}</span></div>`,
      });
      const m = L.marker([p.lat, p.lng], { icon, zIndexOffset: id === HOME ? 1000 : 0 }).addTo(layer);
      m.bindPopup(`<div class="pop"><b>${p.emoji} ${esc(p.name)}</b><span>${esc(p.area || "")} ${di.map(i => DAYS[i].label).join(" · ")}</span><br><button data-pop="${id}">자세히 보기</button></div>`);
      m.on("popupopen", e => { e.popup.getElement().querySelector("[data-pop]").onclick = () => openSheet(id); });
      markers[id] = { m, days: id === HOME ? [0, 1] : di };
    });
    // 동선 (차량 이동 순서) — 일정마다 다름
    plan.routes.forEach((ids, i) => L.polyline(ids.map(k => [PLACES[k].lat, PLACES[k].lng]),
      { color: DAYS[i].hue, weight: 3, opacity: .8, dashArray: "6 8" }).addTo(layer));
    $("#mapFilters").innerHTML = [["all", "전체", "#fff"], ...DAYS.map((d, i) => [String(i), `${d.label} · ${d.title}`, d.hue])]
      .map(([k, l, c]) => `<button class="chip" data-mf="${k}"><i style="background:${c}"></i>${esc(l)}</button>`).join("");
    $$("#mapFilters .chip").forEach(b => b.onclick = () => filterMap(b.dataset.mf));
    filterMap("all");
  }
  const allBounds = () => L.latLngBounds(Object.values(markers).map(x => x.m.getLatLng())).pad(.08);
  function filterMap(k) {
    mapFilter = k;
    $$("#mapFilters .chip").forEach(b => b.classList.toggle("active", b.dataset.mf === k));
    const vis = [];
    Object.entries(markers).forEach(([id, { m, days }]) => {
      const show = k === "all" || days.includes(+k);
      if (show) { layer.addLayer(m); vis.push(m.getLatLng()); } else layer.removeLayer(m);
    });
    if (k !== "all" && vis.length) map.flyToBounds(L.latLngBounds(vis).pad(.15), { duration: .9, maxZoom: 15 });
  }
  function focusPlace(id) {
    if (!map) initMap();
    if (!map) return;
    if (mapFilter !== "all") filterMap("all");
    const mk = markers[id]; if (!mk) return;
    map.flyTo(mk.m.getLatLng(), 16, { duration: .9 });
    setTimeout(() => mk.m.openPopup(), 950);
  }

  /* ---------- 특산품 ---------- */
  function shopView() {
    const done = new Set(store.get("shop", []));
    const total = SHOPLIST.reduce((a, g) => a + g.items.length, 0);
    $("#shopList").innerHTML = SHOPLIST.map((g, gi) => `
      <div class="list-card"><h4>${g.cat}</h4>
        ${g.items.map((it, ii) => `<label class="check"><input type="checkbox" data-k="${gi}-${ii}" ${done.has(`${gi}-${ii}`) ? "checked" : ""}><span>${esc(it)}</span></label>`).join("")}
      </div>`).join("");
    const prog = () => {
      const n = store.get("shop", []).length;
      $("#shopProgress").innerHTML = `<p>특산품 장바구니</p><b>${n} / ${total}</b><div class="bar"><i style="width:${n / total * 100}%"></i></div>`;
    };
    $$("#shopList input").forEach(cb => cb.onchange = () => {
      store.set("shop", $$("#shopList input").filter(x => x.checked).map(x => x.dataset.k)); prog();
      if (cb.checked) toast("장바구니에 쏙 🧺");
    });
    prog();
  }

  /* ---------- 준비 ---------- */
  function infoView() {
    const done = new Set(store.get("pack", []));
    const total = PACKING.reduce((a, g) => a + g.items.length, 0);
    $("#packList").innerHTML = PACKING.map((g, gi) => `
      <div class="pack-group"><h4>${g.cat}</h4>
        ${g.items.map((it, ii) => `<label class="check"><input type="checkbox" data-k="${gi}-${ii}" ${done.has(`${gi}-${ii}`) ? "checked" : ""}><span>${esc(it)}</span></label>`).join("")}
      </div>`).join("");
    const cnt = () => { $("#packCount").textContent = `${store.get("pack", []).length}/${total}`; };
    $$("#packList input").forEach(cb => cb.onchange = () => { store.set("pack", $$("#packList input").filter(x => x.checked).map(x => x.dataset.k)); cnt(); });
    cnt();

    // 진도 말 한마디 (한국어 음성)
    $("#phrases").innerHTML = PHRASES.map((p, i) => `
      <button class="phrase" data-i="${i}"><b>${esc(p.ko)}</b><span class="jp">${esc(p.jp)}</span><small>${esc(p.read)}</small><span class="spk">🔊</span></button>`).join("");
    $$(".phrase").forEach(b => b.onclick = () => {
      const p = PHRASES[+b.dataset.i];
      if (!("speechSynthesis" in window)) return toast("이 기기는 음성 재생을 지원하지 않아요");
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(p.ko);
      u.lang = "ko-KR"; u.rate = .9;
      const ko = speechSynthesis.getVoices().find(v => v.lang?.startsWith("ko"));
      if (ko) u.voice = ko;
      $$(".phrase").forEach(x => x.classList.remove("playing")); b.classList.add("playing");
      u.onend = () => b.classList.remove("playing");
      speechSynthesis.speak(u);
    });

    // 경비 계산기
    const saved = store.get("costs", null);
    const vals = COSTS.map((c, i) => saved?.[i] ?? c.v);
    $("#costList").innerHTML = COSTS.map((c, i) => `
      <label class="cost-row"><span>${esc(c.label)}${c.note ? `<small>${esc(c.note)}</small>` : ""}</span>
        <input type="number" inputmode="numeric" step="1000" min="0" data-c="${i}" value="${vals[i]}"></label>`).join("");
    const sum = () => {
      const v = $$("#costList input").map(x => +x.value || 0);
      store.set("costs", v);
      const t = v.reduce((a, b) => a + b, 0);
      $("#costSum").innerHTML = `<div><b>${won(t)}</b><span>합계</span></div><div><b>${won(t / 2)}</b><span>두 집 반반</span></div><div><b>${won(t / 5)}</b><span>1인당</span></div>`;
    };
    $$("#costList input").forEach(x => x.oninput = sum);
    sum();

    // 사진 출처
    $("#credits").innerHTML = creditList().map(([src, line]) =>
      `<li><a href="${esc(src)}" target="_blank" rel="noopener">${esc(line)}</a></li>`).join("");
  }

  /* ---------- 탭 전환 ---------- */
  function showView(v) {
    $$(".view").forEach(s => s.classList.toggle("active", s.id === "view-" + v));
    $$(".tab").forEach(t => t.classList.toggle("active", t.dataset.view === v));
    scrollTo({ top: 0, behavior: "instant" in document.documentElement.style ? "instant" : "auto" });
    if (v === "map") { initMap(); setTimeout(() => map && map.invalidateSize(), 60); }
    store.set("view", v);
  }
  $$(".tab").forEach(t => t.onclick = () => showView(t.dataset.view));

  /* ---------- 공유 / 토스트 ---------- */
  let tt;
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(tt); tt = setTimeout(() => t.classList.remove("show"), 1600); }
  $("#shareBtn").onclick = async () => {
    const url = location.origin + location.pathname + "?plan=" + plan.id.slice(1);
    const data = { title: "🌅 보배섬 진도, 가을 노을", text: `장인·장모님과 함께하는 진도 1박 2일 — ${plan.label}: ${plan.title} (2026.10.17–10.18)`, url };
    try {
      if (navigator.share) await navigator.share(data);
      else { await navigator.clipboard.writeText(url); toast("링크를 복사했어요 📋"); }
    } catch {}
  };

  /* ---------- 시작 ---------- */
  (() => {
    const box = $("#heroBg"), list = TRIP.heroes;
    const slides = list.map(h => {
      const d = document.createElement("div");
      d.className = "hero-slide"; d.style.backgroundImage = `url("${h.src}")`; d.style.backgroundPosition = h.pos || "center";
      box.appendChild(d); return d;
    });
    let i = Math.floor(Math.random() * slides.length);
    slides[i].classList.add("on");
    if (slides.length < 2 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setInterval(() => {
      if (document.hidden) return;
      slides[i].classList.remove("on"); i = (i + 1) % slides.length; slides[i].classList.add("on");
    }, 8000);
  })();
  /* ---------- 일정 선택 (맨 위 [일정 1] [일정 2]) ---------- */
  function planSwitch() {
    $("#planSwitch").innerHTML = PLANS.map(p => `
      <button class="plan-btn${p.id === plan.id ? " active" : ""}" data-plan="${p.id}" aria-pressed="${p.id === plan.id}">
        <b>${esc(p.label)}</b><span>${esc(p.short)}</span>
      </button>`).join("");
    $$(".plan-btn").forEach(b => b.onclick = () => setPlan(b.dataset.plan));
  }
  function setPlan(id) {
    if (id === plan.id) return;
    plan = planById(id); DAYS = plan.days;
    store.set("plan", plan.id);
    history.replaceState(history.state, "", "?plan=" + plan.id.slice(1));
    computePlaceDays();
    planSwitch(); overview(); daybar();
    const t = todayIndex();
    selectDay(t >= 0 ? t : Math.min(curDay, DAYS.length - 1));
    renderFood();
    if (map) { drawMarkers(); map.flyToBounds(allBounds(), { duration: .8 }); }
    toast(`${plan.label} · ${plan.title}`);
  }

  glow(); countdown(); planSwitch(); overview(); daybar();
  const ti = todayIndex();
  selectDay(ti >= 0 ? ti : store.get("day", 0));
  foodView(); shopView(); infoView();
})();
