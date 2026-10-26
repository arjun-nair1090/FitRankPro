(() => {
  "use strict";

  // ---------- helpers ----------
  const $ = (s, root = document) => root.querySelector(s);
  const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  class Raw { constructor(s) { this.s = s; } }
  const out = v => v instanceof Raw ? v.s : Array.isArray(v) ? v.map(out).join("") : v == null || v === false ? "" : String(v).replace(/[&<>"']/g, c => ESC[c]);
  /** Tagged template: every interpolation is HTML-escaped unless it is itself an h`` result. */
  const h = (strs, ...vals) => new Raw(strs.reduce((acc, s, i) => acc + s + (i < vals.length ? out(vals[i]) : ""), ""));
  const calm = matchMedia("(prefers-reduced-motion: reduce)");
  const DAY = 864e5, WEEK = 7 * DAY;
  const uid = () => Math.random().toString(36).slice(2, 10);
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const sum = (list, f = x => x) => list.reduce((t, x) => t + (+f(x) || 0), 0);
  const by = f => (a, b) => f(b) - f(a);
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
  };
  const K = { token: "fitrank-token", demo: "fitrank-demo", live: "fitrank-live" };

  // numbers, units, dates
  const settings = () => (state.user && state.user.settings) || {};
  const unit = () => settings().units === "lb" ? "lb" : "kg";
  const toU = kg => unit() === "lb" ? kg * 2.20462 : kg;
  const fromU = v => unit() === "lb" ? v / 2.20462 : v;
  const n1 = v => (Math.round(v * 10) / 10).toLocaleString();
  const fmtW = kg => n1(toU(kg));
  const fmtVol = kg => { const v = toU(kg); return v >= 1e4 ? (v / 1000).toFixed(1).replace(/\.0$/, "") + "k" : Math.round(v).toLocaleString(); };
  const ts = x => Date.parse(x.loggedAt);
  const dayKey = t => new Date(t).toLocaleDateString("en-CA");
  const weekStart = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return +d; };
  const fmtDate = (t, o = { weekday: "short", month: "short", day: "numeric" }) => new Date(t).toLocaleDateString(undefined, o);
  const fmtTime = t => new Date(t).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const midnight = t => new Date(t).setHours(0, 0, 0, 0);
  const agoLower = t => ago(t).replace(/^(Today|Yesterday)$/, m => m.toLowerCase());
  const ago = t => { const d = Math.round((midnight(Date.now()) - midnight(t)) / DAY); return d <= 0 ? "Today" : d === 1 ? "Yesterday" : d < 7 ? d + " days ago" : fmtDate(t, { month: "short", day: "numeric" }); };
  const clock = s => { s = Math.max(0, Math.floor(s)); const m = Math.floor(s / 60), r = String(s % 60).padStart(2, "0"); return m >= 60 ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}:${r}` : `${m}:${r}`; };

  // training maths
  const vol = w => w.volume != null ? w.volume : sum(w.sets, s => s.weight * s.reps);
  const e1rm = (w, r) => !(w > 0 && r > 0) || r > 12 ? 0 : r === 1 ? w : w * (1 + r / 30); // Epley, trusted up to 12 reps
  const inRange = (list, from, to = Infinity) => list.filter(x => ts(x) >= from && ts(x) < to);
  const thisWeek = () => weekStart(Date.now());
  const weekly = (n, f = vol) => Array.from({ length: n }, (_, i) => {
    const start = thisWeek() - (n - 1 - i) * WEEK;
    return { label: fmtDate(start, { month: "short", day: "numeric" }), value: sum(inRange(state.workouts, start, start + WEEK), f) };
  });
  const premium = () => !!state.user && (state.user.plan === "PREMIUM" || state.user.role === "ADMIN");

  // ---------- icons (24px grid, 1.75 stroke) ----------
  const ICONS = {
    home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
    log: "M6.5 6v12M3.5 9v6M17.5 6v12M20.5 9v6M6.5 12h11",
    history: "M12 7v5l3 2M3.5 12a8.5 8.5 0 1 0 2.5-6L3.5 8.5M3.5 4v4.5H8",
    progress: "M4 20h16M5 15l4.5-4.5 3.5 3.5L20 7M15 7h5v5",
    routines: "M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01",
    food: "M7 3v8m-2.5-8v5a2.5 2.5 0 0 0 5 0V3M7 11v10M17 21V3c-2.2 1.2-3.5 3.8-3.5 7 0 2 1.5 3 3.5 3",
    import: "M12 3v12m-4.5-4.5L12 15l4.5-4.5M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2",
    insights: "M12 3.5l2.5 5.3 5.8.7-4.3 4 1.1 5.7L12 16.4l-5.1 2.8L8 13.5l-4.3-4 5.8-.7z",
    account: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 21a7.5 7.5 0 0 1 15 0",
    admin: "M12 3l7.5 3v5.5c0 4.6-3.2 8.4-7.5 9.5-4.3-1.1-7.5-4.9-7.5-9.5V6zM9 12l2 2 4-4",
    more: "M5 12h.01M12 12h.01M19 12h.01",
    plus: "M12 5v14M5 12h14",
    check: "M5 12.5l4.5 4.5L19 7.5",
    x: "M6 6l12 12M18 6 6 18",
    trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M9 7V4h6v3",
    up: "M6 15l6-6 6 6",
    down: "M6 9l6 6 6-6",
    timer: "M12 9v4.5l2.5 1.5M9.5 2.5h5M12 21.5a8 8 0 1 0 0-16 8 8 0 0 0 0 16z",
    logout: "M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3",
    search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4",
    repeat: "M17 2.5l3.5 3.5L17 9.5M3.5 11V9.5A3.5 3.5 0 0 1 7 6h13.5M7 21.5L3.5 18 7 14.5M20.5 13v1.5A3.5 3.5 0 0 1 17 18H3.5",
    edit: "M4 20h4L19.5 8.5l-4-4L4 16zM13.5 6.5l4 4",
    download: "M12 3v12m-4.5-4.5L12 15l4.5-4.5M5 21h14",
    trophy: "M8 4h8v5a4 4 0 0 1-8 0zM8 6H5v1a3 3 0 0 0 3 3M16 6h3v1a3 3 0 0 1-3 3M12 13v4M8 21h8M10 17h4",
    flame: "M12 3c.8 3.5 5 5.2 5 10a5 5 0 0 1-10 0c0-2 .8-3.3 2-4.3.2 1.8 1 3 2.2 3.3C11 9.5 10.7 6.2 12 3z",
    lock: "M6 11h12v10H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3",
    play: "M7.5 4.5v15l12-7.5z",
    heart: "M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z",
    activity: "M3 12h4l3-8 4 16 3-8h4",
    scale: "M5 4h14a1 1 0 0 1 1 1l-1.5 14a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2L4 5a1 1 0 0 1 1-1zM9.5 9.5 12 12",
    menu: "M12 5h.01M12 12h.01M12 19h.01",
    server: "M4 5h16v6H4zM4 13h16v6H4zM8 8h.01M8 16h.01",
    browser: "M3 5h18v14H3zM3 9h18",
  };
  const icon = (name, size = 20) => h`<svg class="i" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[name]}"/></svg>`;

  // ---------- exercise library: name|group|equipment|pattern ----------
  const LIB = `Barbell Bench Press|Chest|Barbell|press;Incline Barbell Bench Press|Chest|Barbell|press;Decline Bench Press|Chest|Barbell|press;Dumbbell Bench Press|Chest|Dumbbell|press;Incline Dumbbell Press|Chest|Dumbbell|press;Cable Fly|Chest|Cable|fly;Pec Deck|Chest|Machine|fly;Push Up|Chest|Bodyweight|press;Dip|Chest|Bodyweight|press;Machine Chest Press|Chest|Machine|press;Smith Machine Incline Press|Chest|Machine|press;Pull Up|Back|Bodyweight|pull;Chin Up|Back|Bodyweight|pull;Assisted Pull Up|Back|Machine|pull;Lat Pulldown|Back|Cable|pull;Seated Cable Row|Back|Cable|row;Chest Supported Row|Back|Machine|row;Barbell Row|Back|Barbell|row;Pendlay Row|Back|Barbell|row;Single Arm Dumbbell Row|Back|Dumbbell|row;T Bar Row|Back|Machine|row;Machine Row|Back|Machine|row;Face Pull|Back|Cable|row;Straight Arm Pulldown|Back|Cable|pull;Back Extension|Back|Bodyweight|hinge;Back Squat|Legs|Barbell|squat;Front Squat|Legs|Barbell|squat;Goblet Squat|Legs|Dumbbell|squat;Hack Squat|Legs|Machine|squat;Leg Press|Legs|Machine|squat;Smith Machine Squat|Legs|Machine|squat;Walking Lunge|Legs|Dumbbell|lunge;Bulgarian Split Squat|Legs|Dumbbell|lunge;Step Up|Legs|Dumbbell|lunge;Romanian Deadlift|Legs|Barbell|hinge;Conventional Deadlift|Legs|Barbell|hinge;Sumo Deadlift|Legs|Barbell|hinge;Hip Thrust|Legs|Barbell|hinge;Glute Bridge|Legs|Bodyweight|hinge;Good Morning|Legs|Barbell|hinge;Hamstring Curl|Legs|Machine|curl;Nordic Curl|Legs|Bodyweight|curl;Leg Extension|Legs|Machine|extension;Adductor Machine|Legs|Machine|extension;Abductor Machine|Legs|Machine|extension;Standing Calf Raise|Legs|Machine|calf;Seated Calf Raise|Legs|Machine|calf;Overhead Press|Shoulders|Barbell|press;Seated Dumbbell Press|Shoulders|Dumbbell|press;Arnold Press|Shoulders|Dumbbell|press;Landmine Press|Shoulders|Barbell|press;Push Press|Shoulders|Barbell|press;Lateral Raise|Shoulders|Dumbbell|raise;Cable Lateral Raise|Shoulders|Cable|raise;Front Raise|Shoulders|Dumbbell|raise;Rear Delt Fly|Shoulders|Dumbbell|raise;Upright Row|Shoulders|Barbell|row;Shrug|Shoulders|Dumbbell|carry;Barbell Curl|Arms|Barbell|curl;EZ Bar Curl|Arms|Barbell|curl;Dumbbell Curl|Arms|Dumbbell|curl;Hammer Curl|Arms|Dumbbell|curl;Preacher Curl|Arms|Machine|curl;Cable Curl|Arms|Cable|curl;Triceps Pushdown|Arms|Cable|triceps;Overhead Triceps Extension|Arms|Cable|triceps;Skull Crusher|Arms|Barbell|triceps;Close Grip Bench Press|Arms|Barbell|press;Wrist Curl|Arms|Dumbbell|curl;Plank|Core|Bodyweight|core;Side Plank|Core|Bodyweight|core;Hanging Leg Raise|Core|Bodyweight|core;Cable Crunch|Core|Cable|core;Ab Wheel Rollout|Core|Bodyweight|core;Dead Bug|Core|Bodyweight|core;Pallof Press|Core|Cable|core;Russian Twist|Core|Bodyweight|core;Farmer Carry|Full Body|Dumbbell|carry;Sled Push|Full Body|Sled|carry;Kettlebell Swing|Full Body|Kettlebell|hinge;Thruster|Full Body|Barbell|press;Power Clean|Full Body|Barbell|hinge;Clean and Jerk|Full Body|Barbell|hinge;Snatch|Full Body|Barbell|hinge;Box Jump|Full Body|Plyo Box|jump;Burpee|Full Body|Bodyweight|cardio;Treadmill Run|Cardio|Machine|cardio;Bike Erg|Cardio|Machine|cardio;Rowing Machine|Cardio|Machine|cardio;Elliptical|Cardio|Machine|cardio;Jump Rope|Cardio|Rope|cardio`
    .split(";").map(r => { const [name, group, equipment, pattern] = r.split("|"); return { name, group, equipment, pattern }; });
  const GROUPS = ["Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Full Body", "Cardio"];
  const CUES = {
    press: ["Brace before you unrack", "Control the lowering", "Finish with wrists stacked over elbows"],
    fly: ["Keep a soft bend in the elbows", "Open only as far as you control", "Squeeze to close"],
    row: ["Lead with the elbows", "Keep the ribcage down", "Pause at the contraction"],
    pull: ["Start by pulling the shoulders down", "Drive elbows to your sides", "Lower all the way under control"],
    squat: ["Brace and breathe before each rep", "Knees track over toes", "Drive up through mid-foot"],
    lunge: ["Stay tall", "Push through the front foot", "Keep the back knee soft"],
    hinge: ["Push the hips back", "Keep a neutral spine", "Finish with glutes, not the lower back"],
    curl: ["Keep upper arms still", "Use the full range", "Lower slower than you lift"],
    triceps: ["Pin the elbows", "Lock out smoothly", "No torso swing"],
    raise: ["Lead with the elbows", "Stop at shoulder height", "No momentum"],
    extension: ["Move in both directions with control", "Pause at the end range", "Don't snap the joint"],
    calf: ["Full stretch at the bottom", "Pause at the top", "Stay balanced"],
    core: ["Exhale through the effort", "Ribs down, brace", "Keep tension the whole set"],
    cardio: ["Smooth rhythm", "Stay tall", "Breathe steadily"],
    carry: ["Stand tall", "Shoulders packed", "Short, quick steps"],
    jump: ["Load the hips", "Land softly", "Reset between reps"],
  };
  // Hevy names carry the equipment in brackets ("Lateral Raise (Dumbbell)"); match on the base name.
  const baseName = name => String(name).replace(/\s*\([^)]*\)\s*$/, "").toLowerCase();
  const lib = name => LIB.find(e => e.name.toLowerCase() === baseName(name));
  const groupOf = name => {
    const e = lib(name); if (e) return e.group;
    const n = baseName(name);
    return /\b(plank|crunch|abs?\b|core|twist|sit up|knee raise|leg raise)/.test(n) ? "Core"
      : /\b(squat|leg|lunge|deadlift|calf|hip|glute|hamstring|quad|adduct|abduct)/.test(n) ? "Legs"
      : /\b(run|bike|cycl|walk|cardio|elliptical|jump rope|treadmill|stair|rowing machine|erg\b)/.test(n) ? "Cardio"
      : /\b(delts?\b|lateral|shoulder|overhead press|military|arnold|upright row|front raise)/.test(n) ? "Shoulders"
      : /\b(curl|triceps?\b|biceps?\b|skull|hammer|forearm|wrist|pushdown)/.test(n) ? "Arms"
      : /\b(row|pull|lats?\b|chin|face pull|back|shrug)/.test(n) ? "Back"
      : /\b(bench|chest|fly|flye|dip|push up|pec|butterfly)/.test(n) ? "Chest"
      : /\b(press|raise)/.test(n) ? "Shoulders"
      : "Full Body";
  };

  // ---------- data: Java API or browser-only demo ----------
  const token = () => store.get(K.token, null);
  async function http(method, path, body) {
    const t = token();
    const res = await fetch("api" + path, {
      method,
      headers: Object.assign({ "Content-Type": "application/json" }, t ? { Authorization: "Bearer " + t } : {}),
      body: body == null ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && t) { store.set(K.token, null); state.user = null; render(); }
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }
  const server = {
    me: () => http("GET", "/me"),
    login: b => http("POST", "/auth/login", b),
    signup: b => http("POST", "/auth/signup", b),
    forgot: b => http("POST", "/auth/forgot", b),
    reset: b => http("POST", "/auth/reset", b),
    saveMe: b => http("PUT", "/me", b),
    password: b => http("PUT", "/me/password", b),
    deleteMe: () => http("DELETE", "/me"),
    save: (kind, x) => x.id ? http("PUT", `/${kind}/${x.id}`, x) : http("POST", `/${kind}`, x),
    remove: (kind, id) => http("DELETE", `/${kind}/${id}`),
    admin: {
      stats: () => http("GET", "/admin/stats"),
      users: q => http("GET", "/admin/users?q=" + encodeURIComponent(q || "")),
      plan: (id, plan) => http("PUT", `/admin/users/${id}`, { plan }),
      remove: id => http("DELETE", `/admin/users/${id}`),
    },
  };
  const demo = {
    read: () => store.get(K.demo, null),
    write(d) { store.set(K.demo, d); return d; },
    async me() { const d = this.read(); if (!d) throw new Error("Demo not started"); return d; },
    async start() {
      const seed = await fetch("seed.json").then(r => r.json()).catch(() => ({ workouts: [] }));
      const latest = Math.max(0, ...seed.workouts.map(ts));
      const shift = latest ? Date.now() - DAY - latest : 0; // the sample's last session lands yesterday
      let seq = 0;
      const workouts = seed.workouts.map(w => ({ ...w, id: ++seq, loggedAt: new Date(ts(w) + shift).toISOString(), volume: vol(w) }));
      return this.write({ seq, user: { id: 1, name: "Demo Athlete", email: "demo@fitrank.local", goal: "Strength", role: "USER", plan: "PREMIUM", settings: {} }, workouts, meals: [], weights: [] });
    },
    async saveMe(b) { const d = this.read(); d.user = { ...d.user, ...b }; this.write(d); return d.user; },
    async save(kind, x) {
      const d = this.read(), item = { ...x, id: x.id || ++d.seq };
      if (kind === "workouts") item.volume = vol({ sets: item.sets });
      d[kind] = [item, ...d[kind].filter(o => o.id !== item.id)];
      this.write(d);
      return item;
    },
    async remove(kind, id) { const d = this.read(); d[kind] = d[kind].filter(o => o.id !== id); this.write(d); },
    async deleteMe() { store.set(K.demo, null); },
  };
  let db = demo;

  // ---------- state ----------
  const state = {
    mode: "demo", store: "", user: null, workouts: [], meals: [], weights: [],
    route: "home", enter: true, auth: { view: "signin", error: "", info: "", email: "" },
    sheet: null, live: store.get(K.live, null), flash: null, armed: null,
    range: "12w", exercise: "", admin: null, adminQ: "", preview: null, importing: null, busy: false,
  };
  const sortDesc = list => list.slice().sort(by(ts));
  function load(d) {
    state.user = d.user;
    state.workouts = sortDesc(d.workouts || []);
    state.meals = sortDesc(d.meals || []);
    state.weights = sortDesc(d.weights || []);
  }
  const saveLive = () => store.set(K.live, state.live);
  async function saveSettings(patch) {
    const next = { ...settings(), ...patch };
    state.user = await db.saveMe({ settings: next });
  }

  // ---------- rendering ----------
  const NAV = [
    ["home", "Home", "home"], ["log", "Log", "log"], ["history", "History", "history"], ["progress", "Progress", "progress"],
    ["routines", "Routines", "routines"], ["nutrition", "Nutrition", "food"], ["import", "Import", "import"],
    ["insights", "Insights", "insights"], ["account", "Account", "account"], ["admin", "Admin", "admin"],
  ];
  const TABS = ["home", "log", "history", "progress"];
  const routes = () => NAV.filter(n => n[0] !== "admin" || (state.user && state.user.role === "ADMIN"));
  const PAGES = { home, log: logPage, history: historyPage, progress, routines, nutrition, import: importPage, insights, account, admin: adminPage };

  function render() {
    $("#app").innerHTML = out(state.user ? shell() : authPage());
    document.title = state.user ? `${(NAV.find(n => n[0] === state.route) || NAV[0])[1]} · FitRank` : "FitRank";
    afterRender();
  }

  function go(route, push = true, sheet = null) {
    if (!PAGES[route] || !routes().some(n => n[0] === route)) route = "home";
    if (push && location.hash !== "#/" + route) { history.pushState(null, "", "#/" + route); }
    const swap = () => { state.route = route; state.enter = true; state.sheet = sheet; render(); scrollTo(0, 0); };
    if (route === state.route) return swap();
    document.startViewTransition && !calm.matches ? document.startViewTransition(swap) : swap();
    if (route === "admin") loadAdmin();
  }

  const modeChip = () => state.mode === "server"
    ? (state.store === "postgres"
      ? h`<span class="chip ok" title="Signed in to the FitRank server; data is stored in PostgreSQL">${icon("server", 14)}Server</span>`
      : h`<span class="chip warn" title="The server has no database: data is lost when it restarts">${icon("server", 14)}Server · not saved</span>`)
    : h`<span class="chip" title="No server reachable: data is saved only in this browser">${icon("browser", 14)}Demo · this browser</span>`;

  function shell() {
    const r = state.route, u = state.user;
    const navLink = ([id, label, ic]) => h`<a href="#/${id}" class="nav-link" ${r === id ? h`aria-current="page"` : ""}>${icon(ic)}<span>${label}</span></a>`;
    return h`
    <div class="shell">
      <aside class="side">
        <a class="brand" href="#/home"><img src="assets/icon.svg" alt="" width="30" height="30"><span>FitRank</span></a>
        <nav aria-label="Main">${routes().map(navLink)}</nav>
        <div class="side-foot">
          ${modeChip()}
          <div class="me"><span class="avatar">${initials(u.name)}</span><div><b>${u.name}</b><small>${premium() ? "Premium" : "Free plan"}</small></div></div>
        </div>
      </aside>
      <header class="topbar">
        <a class="brand" href="#/home"><img src="assets/icon.svg" alt="" width="26" height="26"><span>FitRank</span></a>
        ${modeChip()}
      </header>
      <main id="main" class="main${state.enter && !calm.matches ? " enter" : ""}">${PAGES[r]()}</main>
      <nav class="tabs" aria-label="Main">
        ${TABS.map(id => navLink(NAV.find(n => n[0] === id)))}
        <button class="nav-link" data-act="sheet" data-sheet="more" ${TABS.includes(r) ? "" : h`aria-current="page"`}>${icon("more")}<span>More</span></button>
      </nav>
      ${sheetView()}
    </div>`;
  }

  const initials = name => String(name || "FR").trim().split(/\s+/).slice(0, 2).map(p => p[0].toUpperCase()).join("");
  const count = (value, fmt = "int", suffix = "") => h`<span class="num" data-count="${value}" data-fmt="${fmt}">${formatCount(value, fmt)}</span>${suffix}`;
  const formatCount = (v, fmt) => fmt === "vol" ? fmtVol(v) : fmt === "w" ? fmtW(v) : fmt === "1" ? n1(v) : Math.round(v).toLocaleString();
  const empty = (ic, title, text, action) => h`<div class="empty">${icon(ic, 28)}<h3>${title}</h3><p>${text}</p>${action || ""}</div>`;
  const armedBtn = (key, act, label, extra = "") => state.armed === key
    ? h`<button class="btn danger" data-act="${act}" data-key="${key}" ${new Raw(extra)}>${icon("trash", 16)}Tap again to confirm</button>`
    : h`<button class="btn danger-quiet" data-act="arm" data-key="${key}">${icon("trash", 16)}${label}</button>`;

  /** Ring gauge. pct 0-100; anything above 100 draws a brighter second lap over the full ring. */
  function dial(label, pct, value, sub, tone = "accent") {
    const off = 100 - clamp(pct, 0, 100), over = clamp(pct - 100, 0, 100);
    return h`<div class="dial tone-${tone}${pct > 0 ? "" : " zero"}">
      <svg viewBox="0 0 120 120" aria-hidden="true"><circle class="track" cx="60" cy="60" r="52" pathLength="100"/><circle class="val" cx="60" cy="60" r="52" pathLength="100" style="--off:${off}"/>${over ? h`<circle class="lap" cx="60" cy="60" r="52" pathLength="100" style="--off:${100 - over}"/>` : ""}</svg>
      <div class="dial-text"><b>${value}</b><span>${label}</span></div>
      <p class="dial-sub">${sub}</p>
    </div>`;
  }

  function bars(series, fmt = v => fmtVol(v), opts = {}) {
    const max = Math.max(...series.map(s => s.value), 0);
    if (!max) return empty("progress", opts.emptyTitle || "Nothing logged yet", opts.emptyText || "Finished workouts show up here.");
    const last = series.length - 1, ref = opts.ref && opts.ref.value ? Math.min(opts.ref.value / max, 1) * 100 : 0;
    return h`<div class="bars" role="img" aria-label="${opts.label || "Bar chart"}">
      ${ref ? h`<div class="bar-ref" style="--y:${ref}"><span>${opts.ref.label} ${fmt(opts.ref.value)}</span></div>` : ""}
      ${series.map((s, i) => h`<div class="bar-col" style="--i:${i}">
        <div class="bar${i === last ? " now" : ""}" style="--h:${(s.value / max) * 100}%" tabindex="0" aria-label="${s.label}: ${fmt(s.value)}"><span class="tip">${fmt(s.value)}</span></div>
        <span class="bar-label">${i === 0 || i === last || i === Math.floor(last / 2) ? s.label : ""}</span>
      </div>`)}
    </div>`;
  }

  /** Line + area chart with a pointer scrubber. points: [{t, v, label}] in time order. opts.records marks each new best. */
  function line(points, fmt, opts = {}) {
    if (points.length < 2) return empty(opts.icon || "progress", opts.emptyTitle || "Not enough data", opts.emptyText || "Log this at least twice to see a trend.");
    const vs = points.map(p => p.v), lo = Math.min(...vs), hi = Math.max(...vs), pad = (hi - lo) * 0.15 || hi * 0.05 || 1;
    const min = lo - pad, max = hi + pad, t0 = points[0].t, span = points[points.length - 1].t - t0 || 1;
    const xy = points.map(p => [((p.t - t0) / span) * 100, 100 - ((p.v - min) / (max - min)) * 100]);
    let d = `M${xy[0][0]},${xy[0][1]}`;
    for (let i = 1; i < xy.length; i++) { // smooth curve through the points
      const [x0, y0] = xy[i - 1], [x1, y1] = xy[i], cx = (x1 - x0) / 2;
      d += ` C${x0 + cx},${y0} ${x1 - cx},${y1} ${x1},${y1}`;
    }
    let best = vs[0];
    const rec = vs.map((v, i) => opts.records && i > 0 && v > best && (best = v));
    const data = points.map((p, i) => [+xy[i][0].toFixed(2), +xy[i][1].toFixed(2), p.label, fmt(p.v), rec[i] ? 1 : 0]);
    const lastP = xy[xy.length - 1];
    return h`<div class="line-chart" data-points="${JSON.stringify(data)}" role="img" aria-label="${opts.label || "Trend"}: ${fmt(vs[0])} to ${fmt(vs[vs.length - 1])}${opts.records ? `, ${rec.filter(Boolean).length} records` : ""}">
      <div class="y-axis"><span>${fmt(max - pad)}</span><span>${fmt(min + pad)}</span></div>
      <div class="plot">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <defs><linearGradient id="fill-${opts.id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".32"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>
          <path class="area" d="${d} L100,100 L0,100 Z" fill="url(#fill-${opts.id})"/>
          <path class="stroke" d="${d}" pathLength="1"/>
        </svg>
        ${xy.map(([x, y], i) => rec[i] && i < xy.length - 1 ? h`<span class="pr-dot" style="left:${x}%;top:${y}%;--d:${(0.3 + x * 0.006).toFixed(2)}s"></span>` : "")}
        <span class="end-dot${rec[xy.length - 1] ? " pr" : ""}" style="left:${lastP[0]}%;top:${lastP[1]}%"></span>
        <div class="scrub" hidden><span class="scrub-dot"></span><span class="scrub-tip"></span></div>
      </div>
      <div class="x-axis"><span>${points[0].label}</span><span>${points[points.length - 1].label}</span></div>
    </div>`;
  }

  // ---------- pages ----------
  function home() {
    const now = Date.now(), wk = thisWeek(), s = settings();
    const week = inRange(state.workouts, wk);
    const weekVol = sum(week, vol);
    const avg = sum(inRange(state.workouts, wk - 4 * WEEK, wk), vol) / 4;
    const loadPct = avg ? (weekVol / avg) * 100 : weekVol ? 100 : 0;
    const target = s.target || 4;
    const today = state.meals.filter(m => dayKey(ts(m)) === dayKey(now));
    const kcal = sum(today, m => m.calories), kcalTarget = s.kcal || 2400;
    const last = state.workouts[0];
    const hour = new Date().getHours();
    const prs = recentRecords(30).slice(0, 4);
    return h`
      <section class="hello" style="--i:0">
        <div>
          <h1>${hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"}, ${state.user.name.split(" ")[0]}</h1>
          <p class="muted">${fmtDate(now, { weekday: "long", month: "long", day: "numeric" })} · ${streakText()}</p>
        </div>
        ${state.live
          ? h`<a class="btn primary big" href="#/log">${icon("play", 18)}Resume ${state.live.title}</a>`
          : h`<button class="btn primary big" data-act="start">${icon("plus", 18)}Start workout</button>`}
      </section>
      <section class="card dials" style="--i:1" aria-label="This week">
        ${dial("Weekly load", loadPct, h`${count(weekVol, "vol")}<small>${unit()}</small>`, avg ? `${Math.round(loadPct)}% of your 4‑week average` : "No 4‑week baseline yet")}
        ${dial("Sessions", (week.length / target) * 100, h`${count(week.length)}<small>/${target}</small>`, week.length >= target ? "Weekly target hit" : `${target - week.length} to go this week`, "good")}
        ${dial("kcal today", (kcal / kcalTarget) * 100, count(kcal), `${Math.round(sum(today, m => m.protein))} g protein of ${s.protein || 160} g`, "warm")}
      </section>
      <div class="grid two">
        <section class="card" style="--i:2">
          <header class="card-head"><h2>Last workout</h2><a class="link" href="#/history">History</a></header>
          ${last ? workoutSummary(last) : empty("log", "No workouts yet", "Start one, or import your Hevy history.", h`<a class="btn" href="#/import">${icon("import", 16)}Import</a>`)}
        </section>
        <section class="card" style="--i:3">
          <header class="card-head"><h2>Volume per week</h2><span class="muted">${unit()} · 12 weeks</span></header>
          ${bars(weekly(12), fmtVol, { label: "Weekly volume", ref: { value: avg, label: "4-wk avg" } })}
        </section>
      </div>
      <section class="card" style="--i:4">
        <header class="card-head"><h2>Recent records</h2><span class="muted">Last 30 days</span></header>
        ${prs.length ? h`<ul class="records">${prs.map(p => h`<li>${icon("trophy", 18)}<div><b>${p.exercise}</b><span class="muted">${fmtW(p.weight)} ${unit()} × ${p.reps} · e1RM ${fmtW(p.e1)} ${unit()}</span></div><time>${ago(p.t)}</time></li>`)}</ul>`
          : empty("trophy", "No new records this month", "Beat an estimated 1RM and it lands here.")}
      </section>`;
  }

  function streakText() {
    let weeks = 0, start = thisWeek();
    if (!inRange(state.workouts, start).length) start -= WEEK;
    while (inRange(state.workouts, start, start + WEEK).length) { weeks++; start -= WEEK; }
    return weeks ? `${weeks}-week training streak` : "No streak yet";
  }

  /** Best set per exercise that beat every earlier e1RM within the window, newest first. */
  function recentRecords(days) {
    const best = {}, found = {};
    for (const w of state.workouts.slice().reverse()) {
      for (const s of w.sets) {
        const e = e1rm(s.weight, s.reps);
        if (!e) continue;
        if (best[s.exercise] && e > best[s.exercise] + 0.01 && ts(w) > Date.now() - days * DAY) found[s.exercise] = { ...s, e1: e, t: ts(w) };
        best[s.exercise] = Math.max(best[s.exercise] || 0, e);
      }
    }
    return Object.values(found).sort(by(p => p.t));
  }

  function groupSets(sets) {
    const map = new Map();
    for (const s of sets) { if (!map.has(s.exercise)) map.set(s.exercise, []); map.get(s.exercise).push(s); }
    return [...map].map(([name, list]) => ({ name, sets: list, best: list.reduce((b, s) => (e1rm(s.weight, s.reps) > e1rm(b.weight, b.reps) ? s : b), list[0]) }));
  }

  function workoutSummary(w) {
    const ex = groupSets(w.sets);
    return h`<div class="summary">
      <div class="summary-top"><b>${w.title}</b><span class="muted">${ago(ts(w))} · ${fmtTime(ts(w))}</span></div>
      <div class="stat-row">
        <div><span class="muted">Duration</span><b>${w.durationMinutes ? w.durationMinutes + " min" : "–"}</b></div>
        <div><span class="muted">Volume</span><b>${fmtVol(vol(w))} ${unit()}</b></div>
        <div><span class="muted">Sets</span><b>${w.sets.length}</b></div>
      </div>
      <ul class="ex-lines">${ex.slice(0, 5).map(e => h`<li><span>${e.name}</span><span class="muted">${e.sets.length} ${e.sets.length === 1 ? "set" : "sets"} · best ${fmtW(e.best.weight)} × ${e.best.reps}</span></li>`)}
      ${ex.length > 5 ? h`<li class="muted">+${ex.length - 5} more</li>` : ""}</ul>
    </div>`;
  }

  // live logger
  function previousSets(name) {
    for (const w of state.workouts) { const s = w.sets.filter(x => x.exercise === name); if (s.length) return s; }
    return [];
  }
  const bestE1 = name => Math.max(0, ...state.workouts.flatMap(w => w.sets.filter(s => s.exercise === name).map(s => e1rm(s.weight, s.reps))));
  const liveDone = () => state.live.exercises.flatMap(x => x.sets.filter(s => s.done).map(s => ({ exercise: x.name, weight: fromU(+s.weight || 0), reps: +s.reps || 0 })));

  function logPage() {
    if (!state.live) {
      const rs = settings().routines || [];
      return h`
        <section class="card start-card" style="--i:0">
          <h1>Ready when you are</h1>
          <p class="muted">Start empty and add exercises as you go, or run one of your routines.</p>
          <button class="btn primary big" data-act="start">${icon("plus", 18)}Start empty workout</button>
        </section>
        ${rs.length ? h`<section class="card" style="--i:1"><header class="card-head"><h2>Routines</h2><a class="link" href="#/routines">Manage</a></header>
          <div class="routine-list">${rs.map(r => h`<button class="routine-pick" data-act="start" data-routine="${r.id}"><b>${r.name}</b><span class="muted">${r.exercises.length} exercises</span>${icon("play", 16)}</button>`)}</div></section>` : ""}`;
    }
    const L = state.live, done = liveDone();
    return h`
      <header class="card log-head" style="--i:0">
        <input class="title-input" data-bind="title" value="${L.title}" aria-label="Workout name" maxlength="160">
        <button class="btn primary" data-act="finish">${icon("check", 16)}Finish</button>
        <div class="stat-row log-meta">
          <div><span class="muted">Duration</span><b id="live-clock">${clock((Date.now() - L.startedAt) / 1000)}</b></div>
          <div><span class="muted">Volume</span><b>${fmtVol(sum(done, s => s.weight * s.reps))} <small>${unit()}</small></b></div>
          <div><span class="muted">Sets</span><b>${done.length}</b></div>
        </div>
      </header>
      ${L.exercises.length ? L.exercises.map(exerciseCard) : h`<section class="card" style="--i:1">${empty("log", "No exercises yet", "Add the first one to start logging sets.")}</section>`}
      <button class="btn wide" data-act="pick" style="--i:2">${icon("plus", 18)}Add exercise</button>
      <div class="danger-zone">${armedBtn("discard", "discard", "Discard workout")}</div>`;
  }

  function exerciseCard(x, xi) {
    const prev = previousSets(x.name);
    const u = unit();
    return h`<section class="card exercise" style="--i:${xi + 1}" data-ex="${x.id}">
      <header class="card-head">
        <div><h2>${x.name}</h2><span class="muted">${groupOf(x.name)}${prev.length ? "" : " · first time"}</span></div>
        <button class="icon-btn" data-act="sheet" data-sheet="exercise" data-ex="${x.id}" aria-label="Options for ${x.name}">${icon("menu")}</button>
      </header>
      <div class="sets">
        <div class="set head"><span>Set</span><span>Previous</span><span>${u}</span><span>Reps</span><span class="sr">Done</span></div>
        ${x.sets.map((s, i) => {
          const p = prev[i];
          const flash = state.flash && state.flash.set === s.id;
          return h`<div class="set${s.done ? " done" : ""}${flash ? " just-done" : ""}" data-set="${s.id}">
            <span class="n">${i + 1}</span>
            <span class="prev">${p ? `${fmtW(p.weight)} × ${p.reps}` : "–"}</span>
            <input inputmode="decimal" data-bind="weight" value="${s.weight}" placeholder="${p ? n1(toU(p.weight)) : "–"}" aria-label="${x.name} set ${i + 1} weight in ${u}">
            <input inputmode="numeric" data-bind="reps" value="${s.reps}" placeholder="${p ? p.reps : "–"}" aria-label="${x.name} set ${i + 1} reps">
            <button class="tick" data-act="tick" aria-pressed="${!!s.done}" aria-label="Mark ${x.name} set ${i + 1} done">${icon("check", 18)}</button>
            ${flash && state.flash.pr ? h`<span class="pr-badge" role="status">PR</span><span class="burst" aria-hidden="true">${Array.from({ length: 10 }, (_, k) => h`<i style="--a:${k * 36}deg"></i>`)}</span>` : ""}
          </div>`;
        })}
      </div>
      <button class="btn ghost" data-act="add-set">${icon("plus", 16)}Add set</button>
    </section>`;
  }

  function historyPage() {
    if (!state.workouts.length) return h`<h1 class="page-title">History</h1><section class="card">${empty("history", "No workouts yet", "Finished workouts and Hevy imports show up here.", h`<a class="btn" href="#/import">${icon("import", 16)}Import history</a>`)}</section>`;
    const months = new Map();
    state.workouts.forEach(w => { const k = fmtDate(ts(w), { month: "long", year: "numeric" }); if (!months.has(k)) months.set(k, []); months.get(k).push(w); });
    let i = 0;
    return h`<h1 class="page-title">History</h1>
      ${[...months].map(([month, list]) => h`<section class="month">
        <h2 class="month-title">${month}<span class="muted">${list.length} workouts · ${fmtVol(sum(list, vol))} ${unit()}</span></h2>
        ${list.map(w => h`<article class="card workout" style="--i:${Math.min(i++, 8)}">
          ${workoutSummary(w)}
          <details><summary>All ${w.sets.length} sets</summary>
            ${groupSets(w.sets).map(e => h`<div class="detail-ex"><b>${e.name}</b><ol>${e.sets.map(s => h`<li>${fmtW(s.weight)} ${unit()} × ${s.reps}</li>`)}</ol></div>`)}
          </details>
          <div class="row-actions">
            <button class="btn ghost" data-act="repeat" data-id="${w.id}">${icon("repeat", 16)}Repeat</button>
            <button class="btn ghost" data-act="sheet" data-sheet="rename" data-id="${w.id}">${icon("edit", 16)}Rename</button>
            <span class="spacer"></span>
            ${armedBtn("w" + w.id, "delete-workout", "Delete", `data-id="${w.id}"`)}
          </div>
        </article>`)}
      </section>`)}`;
  }

  function progress() {
    const ranges = { "4w": 4, "12w": 12, "1y": 52, all: 0 };
    const weeks = ranges[state.range];
    const from = weeks ? thisWeek() - (weeks - 1) * WEEK : 0;
    const ws = inRange(state.workouts, from).reverse();
    const freq = {};
    state.workouts.forEach(w => w.sets.forEach(s => { if (e1rm(s.weight, s.reps)) freq[s.exercise] = (freq[s.exercise] || 0) + 1; }));
    const lifts = Object.keys(freq).sort(by(k => freq[k]));
    const ex = lifts.includes(state.exercise) ? state.exercise : lifts[0];
    const strength = ws.map(w => ({ t: ts(w), v: Math.max(0, ...w.sets.filter(s => s.exercise === ex).map(s => e1rm(s.weight, s.reps))) }))
      .filter(p => p.v).map(p => ({ ...p, label: fmtDate(p.t, { month: "short", day: "numeric" }) }));
    const bw = inRange(state.weights, from).reverse().map(w => ({ t: ts(w), v: w.kg, label: fmtDate(ts(w), { month: "short", day: "numeric" }) }));
    const groups = {};
    ws.forEach(w => w.sets.forEach(s => { const g = groupOf(s.exercise); groups[g] = (groups[g] || 0) + 1; }));
    const gmax = Math.max(1, ...Object.values(groups));
    const prs = lifts.slice(0, 8).map(name => {
      let best = null;
      state.workouts.forEach(w => w.sets.forEach(s => { if (s.exercise === name && (!best || e1rm(s.weight, s.reps) > best.e1)) best = { ...s, e1: e1rm(s.weight, s.reps), t: ts(w) }; }));
      return best;
    }).filter(Boolean).sort(by(p => p.e1));
    const weekCount = weeks || Math.max(1, Math.ceil((Date.now() - Math.min(...state.workouts.map(ts), Date.now())) / WEEK));
    return h`
      <div class="page-head">
        <h1 class="page-title">Progress</h1>
        <div class="seg" role="group" aria-label="Range">${Object.keys(ranges).map(k => h`<button data-act="range" data-range="${k}" aria-pressed="${state.range === k}">${k === "all" ? "All" : k.toUpperCase()}</button>`)}</div>
      </div>
      <div class="grid two">
        <section class="card" style="--i:0">
          <header class="card-head"><h2>Estimated 1RM</h2>
            ${lifts.length ? h`<select data-change="exercise" aria-label="Exercise">${lifts.slice(0, 40).map(n => h`<option ${n === ex ? "selected" : ""}>${n}</option>`)}</select>` : ""}
          </header>
          ${lifts.length ? line(strength, v => fmtW(v) + " " + unit(), { id: "e1", label: ex + " estimated 1RM", records: true }) : empty("progress", "No lifts yet", "Sets of 12 reps or fewer feed the strength chart.")}
        </section>
        <section class="card" style="--i:1">
          <header class="card-head"><h2>Volume per week</h2><span class="muted">${unit()}</span></header>
          ${bars(weekly(Math.min(weekCount, 52)), fmtVol, { label: "Weekly volume" })}
        </section>
        <section class="card" style="--i:2">
          <header class="card-head"><h2>Body weight</h2>${state.weights[0] ? h`<span class="muted">Latest ${fmtW(state.weights[0].kg)} ${unit()}</span>` : ""}</header>
          ${line(bw, v => fmtW(v) + " " + unit(), { id: "bw", icon: "scale", label: "Body weight", emptyTitle: "Log your weight", emptyText: "Two weigh-ins draw the trend." })}
          <form class="inline-form" data-form="weight">
            <label class="field"><span>Weight (${unit()})</span><input name="kg" inputmode="decimal" required placeholder="${state.weights[0] ? n1(toU(state.weights[0].kg)) : "75"}"></label>
            <button class="btn">${icon("plus", 16)}Log</button>
          </form>
        </section>
        <section class="card" style="--i:3">
          <header class="card-head"><h2>Sets per muscle group</h2><span class="muted">${weeks ? `Last ${weeks} weeks` : "All time"}</span></header>
          ${Object.keys(groups).length ? h`<ul class="hbars">${GROUPS.filter(g => groups[g]).sort(by(g => groups[g])).map((g, i) => h`<li style="--i:${i}"><span>${g}</span><span class="hbar"><i style="--w:${(groups[g] / gmax) * 100}%"></i></span><b>${groups[g]}</b></li>`)}</ul>`
            : empty("activity", "No sets in this range", "Pick a longer range or log a workout.")}
        </section>
      </div>
      <section class="card" style="--i:4">
        <header class="card-head"><h2>Personal records</h2><span class="muted">Best estimated 1RM per lift</span></header>
        ${prs.length ? h`<div class="table-wrap"><table class="table">
          <thead><tr><th>Exercise</th><th>Best set</th><th class="r">e1RM</th><th class="r">Date</th></tr></thead>
          <tbody>${prs.map(p => h`<tr><td>${p.exercise}</td><td>${fmtW(p.weight)} ${unit()} × ${p.reps}</td><td class="r"><b>${fmtW(p.e1)}</b></td><td class="r muted">${fmtDate(p.t, { month: "short", day: "numeric", year: "2-digit" })}</td></tr>`)}</tbody>
        </table></div>` : empty("trophy", "No records yet", "Log a few workouts to fill this table.")}
      </section>`;
  }

  function routines() {
    const rs = settings().routines || [];
    return h`<div class="page-head"><h1 class="page-title">Routines</h1><button class="btn primary" data-act="sheet" data-sheet="routine">${icon("plus", 16)}New routine</button></div>
      ${rs.length ? h`<div class="grid two">${rs.map((r, i) => {
        const lastDone = state.workouts.find(w => w.title === r.name);
        return h`<article class="card routine" style="--i:${i}">
          <header class="card-head"><div><h2>${r.name}</h2><span class="muted">${lastDone ? "Last done " + agoLower(ts(lastDone)) : "Not done yet"}</span></div></header>
          <ul class="chips">${r.exercises.map(e => h`<li>${e}</li>`)}</ul>
          <div class="row-actions">
            <button class="btn primary" data-act="start" data-routine="${r.id}">${icon("play", 16)}Start</button>
            <button class="btn ghost" data-act="sheet" data-sheet="routine" data-id="${r.id}">${icon("edit", 16)}Edit</button>
            <span class="spacer"></span>
            ${armedBtn("r" + r.id, "delete-routine", "Delete", `data-id="${r.id}"`)}
          </div>
        </article>`;
      })}</div>` : h`<section class="card">${empty("routines", "No routines yet", "Save a workout as a routine, or build one here.")}</section>`}`;
  }

  function nutrition() {
    const s = settings(), today = state.meals.filter(m => dayKey(ts(m)) === dayKey(Date.now()));
    const kcal = sum(today, m => m.calories), protein = sum(today, m => m.protein), water = sum(today, m => m.water);
    const days = Array.from({ length: 7 }, (_, i) => { const t = Date.now() - (6 - i) * DAY; return { label: fmtDate(t, { weekday: "short" }), value: sum(state.meals.filter(m => dayKey(ts(m)) === dayKey(t)), m => m.calories) }; });
    return h`<h1 class="page-title">Nutrition</h1>
      <section class="card dials" style="--i:0" aria-label="Today">
        ${dial("Calories", (kcal / (s.kcal || 2400)) * 100, count(kcal), `of ${(s.kcal || 2400).toLocaleString()} kcal`, "warm")}
        ${dial("Protein", (protein / (s.protein || 160)) * 100, h`${count(protein)}<small>g</small>`, `of ${s.protein || 160} g`, "accent")}
        ${dial("Water", (water / (s.water || 3)) * 100, h`${count(water, "1")}<small>L</small>`, `of ${s.water || 3} L`, "good")}
      </section>
      <div class="grid two">
        <section class="card" style="--i:1">
          <header class="card-head"><h2>Log a meal</h2></header>
          <form class="form" data-form="meal">
            <label class="field"><span>What you ate</span><input name="name" required maxlength="160" placeholder="Chicken rice bowl"></label>
            <div class="form-row">
              <label class="field"><span>Calories</span><input name="calories" inputmode="numeric" required placeholder="650"></label>
              <label class="field"><span>Protein (g)</span><input name="protein" inputmode="decimal" placeholder="42"></label>
              <label class="field"><span>Water (L)</span><input name="water" inputmode="decimal" placeholder="0.5"></label>
            </div>
            <button class="btn primary">${icon("plus", 16)}Save meal</button>
          </form>
        </section>
        <section class="card" style="--i:2">
          <header class="card-head"><h2>Today</h2><span class="muted">${today.length} meals</span></header>
          ${today.length ? h`<ul class="list">${today.map(m => h`<li><div><b>${m.name}</b><span class="muted">${fmtTime(ts(m))} · ${m.protein} g protein${m.water ? ` · ${m.water} L` : ""}</span></div><b class="num">${m.calories}</b>
            <button class="icon-btn" data-act="delete-meal" data-id="${m.id}" aria-label="Delete ${m.name}">${icon("trash", 18)}</button></li>`)}</ul>`
            : empty("food", "Nothing logged today", "Meals you log show up here.")}
        </section>
      </div>
      <section class="card" style="--i:3"><header class="card-head"><h2>Last 7 days</h2><span class="muted">kcal</span></header>
        ${bars(days, v => Math.round(v).toLocaleString() + " kcal", { label: "Calories per day", emptyTitle: "No meals this week", emptyText: "Daily calories chart once you log meals." })}</section>`;
  }

  function importPage() {
    const p = state.preview, im = state.importing, hl = settings().health;
    return h`<h1 class="page-title">Import</h1>
      <div class="grid two">
        <section class="card" style="--i:0">
          <header class="card-head"><h2>Hevy</h2></header>
          <p class="muted">In Hevy, open Settings › Export data and download your workouts CSV. FitRank's own JSON export also works here.</p>
          <label class="btn primary file">${icon("import", 16)}Choose CSV or JSON<input type="file" accept=".csv,.json,text/csv,application/json" data-file="hevy"></label>
        </section>
        <section class="card" style="--i:1">
          <header class="card-head"><h2>Apple Health</h2></header>
          <p class="muted">On iPhone: Health › your profile › Export All Health Data. Unzip it and choose <code>export.xml</code>. It's read in this browser in chunks, so large files are fine.</p>
          <label class="btn primary file">${icon("heart", 16)}Choose export.xml<input type="file" accept=".xml,text/xml" data-file="health"></label>
        </section>
      </div>
      ${im ? h`<section class="card" aria-live="polite"><header class="card-head"><h2>${im.label}</h2><span class="muted" id="import-count">${im.done} / ${im.total}</span></header>
        <div class="progress"><i id="import-bar" style="--w:${im.total ? (im.done / im.total) * 100 : 0}%"></i></div></section>` : ""}
      ${p && !im ? h`<section class="card preview" style="--i:2">
        <header class="card-head"><h2>Ready to import</h2><span class="muted">${p.file}</span></header>
        <div class="stat-row">
          ${p.workouts ? h`<div><span class="muted">New workouts</span><b>${p.workouts.length}</b></div>` : ""}
          ${p.weights ? h`<div><span class="muted">Weigh-ins</span><b>${p.weights.length}</b></div>` : ""}
          ${p.skipped ? h`<div><span class="muted">Already here</span><b>${p.skipped}</b></div>` : ""}
          ${p.health ? h`<div><span class="muted">Avg daily steps</span><b>${p.health.steps.toLocaleString()}</b></div><div><span class="muted">Resting HR</span><b>${p.health.restingHr || "–"}</b></div>` : ""}
        </div>
        ${p.range ? h`<p class="muted">${p.range}</p>` : ""}
        <div class="row-actions"><button class="btn primary" data-act="import-go">${icon("check", 16)}Import</button><button class="btn ghost" data-act="import-cancel">Cancel</button></div>
      </section>` : ""}
      ${hl ? h`<section class="card" style="--i:3"><header class="card-head"><h2>Apple Health summary</h2><span class="muted">Imported ${agoLower(Date.parse(hl.importedAt))} · last 30 days</span></header>
        <div class="stat-row">
          <div><span class="muted">Avg daily steps</span><b>${hl.steps.toLocaleString()}</b></div>
          <div><span class="muted">Active energy / day</span><b>${hl.activeKcal.toLocaleString()} kcal</b></div>
          <div><span class="muted">Resting heart rate</span><b>${hl.restingHr ? hl.restingHr + " bpm" : "–"}</b></div>
        </div></section>` : ""}`;
  }

  function insights() {
    if (!premium()) {
      return h`<h1 class="page-title">Insights</h1><section class="card locked" style="--i:0">${icon("lock", 28)}
        <h2>Insights are part of Premium</h2>
        <ul class="ticks"><li>Strength board: every lift's e1RM against 4 weeks ago</li><li>Consistency pace against your weekly target</li><li>Coaching notes from your own logged sets</li><li>Form cues for every exercise in the logger</li></ul>
        <p class="muted">Premium is assigned by your FitRank admin. Your data and exports stay available on every plan.</p></section>`;
    }
    const board = Object.entries(state.workouts.reduce((acc, w) => { w.sets.forEach(s => { acc[s.exercise] = (acc[s.exercise] || 0) + 1; }); return acc; }, {}))
      .sort(by(e => e[1])).slice(0, 6).map(([name]) => {
        const now = bestBefore(name, Infinity), then = bestBefore(name, Date.now() - 4 * WEEK);
        return { name, now, delta: then ? ((now - then) / then) * 100 : null };
      }).filter(b => b.now);
    const last4 = inRange(state.workouts, thisWeek() - 4 * WEEK, thisWeek()).length / 4;
    const target = settings().target || 4;
    return h`<h1 class="page-title">Insights</h1>
      <div class="grid two">
        <section class="card" style="--i:0"><header class="card-head"><h2>Strength board</h2><span class="muted">e1RM · vs 4 weeks ago</span></header>
          ${board.length ? h`<ul class="list">${board.map(b => h`<li><div><b>${b.name}</b></div><b class="num">${fmtW(b.now)} ${unit()}</b>
            <span class="delta ${b.delta > 0.5 ? "up" : b.delta < -0.5 ? "down" : ""}">${b.delta == null ? "new" : (b.delta > 0 ? "+" : "") + b.delta.toFixed(1) + "%"}</span></li>`)}</ul>`
            : empty("trophy", "No lifts yet", "Log some sets first.")}
        </section>
        <section class="card" style="--i:1"><header class="card-head"><h2>Consistency</h2></header>
          <div class="big-stat">${count(last4, "1")}<span>sessions a week</span></div>
          <p class="muted">Average over the last 4 full weeks, against your target of ${target}. ${last4 >= target ? "You're on pace." : last4 ? `Adding ${Math.ceil((target - last4) * 4)} sessions over the next 4 weeks gets you there.` : "Log a workout to start the count."}</p>
        </section>
      </div>
      <section class="card" style="--i:2"><header class="card-head"><h2>Coaching notes</h2><span class="muted">Rules applied to your logged sets</span></header>
        <ul class="notes">${coachingNotes().map(n => h`<li class="${n.tone}">${icon(n.icon, 18)}<div><b>${n.title}</b><span class="muted">${n.text}</span></div></li>`)}</ul>
      </section>`;
  }

  const bestBefore = (name, t) => Math.max(0, ...state.workouts.filter(w => ts(w) < t).flatMap(w => w.sets.filter(s => s.exercise === name).map(s => e1rm(s.weight, s.reps))));

  function coachingNotes() {
    const notes = [], wk = thisWeek();
    const avg = sum(inRange(state.workouts, wk - 4 * WEEK, wk), vol) / 4, now = sum(inRange(state.workouts, wk), vol);
    if (avg && now > avg * 1.3) notes.push({ tone: "warn", icon: "flame", title: `Load is ${Math.round((now / avg - 1) * 100)}% above your 4-week average`, text: "Big jumps are where aches start. Keep the next session moderate." });
    const recent = inRange(state.workouts, Date.now() - 14 * DAY);
    if (state.workouts.length >= 4) {
      ["Chest", "Back", "Legs", "Shoulders"].filter(g => !recent.some(w => w.sets.some(s => groupOf(s.exercise) === g)))
        .forEach(g => notes.push({ tone: "info", icon: "activity", title: `No ${g.toLowerCase()} sets in 14 days`, text: "Plan it into your next session to keep things balanced." }));
    }
    const top = Object.entries(state.workouts.reduce((a, w) => { w.sets.forEach(s => { if (e1rm(s.weight, s.reps)) a[s.exercise] = (a[s.exercise] || 0) + 1; }); return a; }, {})).sort(by(e => e[1]))[0];
    if (top) {
      const sessions = state.workouts.filter(w => ts(w) > Date.now() - 6 * WEEK && w.sets.some(s => s.exercise === top[0])).length;
      if (sessions >= 3 && bestBefore(top[0], Infinity) <= bestBefore(top[0], Date.now() - 6 * WEEK)) {
        notes.push({ tone: "info", icon: "progress", title: `${top[0]} hasn't set a new e1RM in 6 weeks`, text: "Try a different rep range for a few weeks, e.g. 3×5 heavier or 3×10 lighter." });
      }
    }
    if (recentRecords(14).length) notes.push({ tone: "good", icon: "trophy", title: `${recentRecords(14).length} new records in the last 2 weeks`, text: "Whatever you're doing, it's working." });
    if (!notes.length) notes.push({ tone: "good", icon: "check", title: "Nothing to flag", text: "Training looks steady. Keep stacking sessions." });
    return notes;
  }

  function account() {
    const u = state.user, s = settings();
    return h`<h1 class="page-title">Account</h1>
      <div class="grid two">
        <section class="card" style="--i:0"><header class="card-head"><h2>Profile</h2><span class="muted">${u.email}</span></header>
          <form class="form" data-form="profile">
            <label class="field"><span>Name</span><input name="name" value="${u.name}" required maxlength="120"></label>
            <label class="field"><span>Goal</span><select name="goal">${["Strength", "Muscle gain", "Fat loss", "General fitness", "Endurance"].map(g => h`<option ${u.goal === g ? "selected" : ""}>${g}</option>`)}</select></label>
            <label class="field"><span>Bio</span><textarea name="bio" rows="2" maxlength="300">${s.bio || ""}</textarea></label>
            <button class="btn primary">Save profile</button>
          </form>
        </section>
        <section class="card" style="--i:1"><header class="card-head"><h2>Training preferences</h2></header>
          <form class="form" data-form="prefs">
            <div class="form-row">
              <label class="field"><span>Units</span><select name="units"><option value="kg" ${unit() === "kg" ? "selected" : ""}>Kilograms</option><option value="lb" ${unit() === "lb" ? "selected" : ""}>Pounds</option></select></label>
              <label class="field"><span>Rest timer</span><select name="rest">${[0, 60, 90, 120, 180, 240].map(v => h`<option value="${v}" ${(s.rest ?? 90) === v ? "selected" : ""}>${v ? clock(v) : "Off"}</option>`)}</select></label>
              <label class="field"><span>Sessions / week</span><input name="target" inputmode="numeric" value="${s.target || 4}"></label>
            </div>
            <div class="form-row">
              <label class="field"><span>Calories / day</span><input name="kcal" inputmode="numeric" value="${s.kcal || 2400}"></label>
              <label class="field"><span>Protein (g)</span><input name="protein" inputmode="numeric" value="${s.protein || 160}"></label>
              <label class="field"><span>Water (L)</span><input name="water" inputmode="decimal" value="${s.water || 3}"></label>
            </div>
            <button class="btn primary">Save preferences</button>
          </form>
        </section>
        ${state.mode === "server" ? h`<section class="card" style="--i:2"><header class="card-head"><h2>Password</h2></header>
          <form class="form" data-form="password">
            <label class="field"><span>Current password</span><input name="current" type="password" autocomplete="current-password" required></label>
            <label class="field"><span>New password</span><input name="password" type="password" autocomplete="new-password" minlength="8" required></label>
            <button class="btn">Change password</button>
          </form></section>` : ""}
        <section class="card" style="--i:3"><header class="card-head"><h2>Your data</h2><span class="muted">${state.workouts.length} workouts · ${state.meals.length} meals · ${state.weights.length} weigh-ins</span></header>
          <p class="muted">${state.mode === "server" ? `Stored on the FitRank server${state.store === "memory" ? ", in memory only: it's gone when the server restarts" : " in PostgreSQL"}.` : "Stored only in this browser. Export it before clearing site data."}</p>
          <div class="row-actions"><button class="btn" data-act="export" data-format="json">${icon("download", 16)}Export JSON</button><button class="btn" data-act="export" data-format="csv">${icon("download", 16)}Export CSV</button></div>
        </section>
      </div>
      <section class="card danger-card" style="--i:4">
        <div class="row-actions"><button class="btn" data-act="signout">${icon("logout", 16)}${state.mode === "demo" ? "Leave demo" : "Sign out"}</button></div>
        ${u.role === "ADMIN" ? "" : h`<div class="danger-zone">${armedBtn("account", "delete-account", state.mode === "demo" ? "Erase demo data" : "Delete account and all data")}</div>`}
      </section>`;
  }

  function adminPage() {
    const a = state.admin;
    if (!a) return h`<h1 class="page-title">Admin</h1><section class="card"><div class="skeleton"></div><div class="skeleton"></div></section>`;
    const st = a.stats, topMax = Math.max(1, ...st.topExercises.map(t => t.sets));
    return h`<h1 class="page-title">Admin</h1>
      <section class="card tiles" style="--i:0">
        <div><span class="muted">Users</span><b>${count(st.users)}</b></div>
        <div><span class="muted">Premium</span><b>${count(st.premium)}</b></div>
        <div><span class="muted">Workouts</span><b>${count(st.workouts)}</b></div>
        <div><span class="muted">Sets</span><b>${count(st.sets)}</b></div>
        <div><span class="muted">Volume lifted</span><b>${count(st.volume, "vol")}<small> kg</small></b></div>
      </section>
      <div class="grid two">
        <section class="card" style="--i:1"><header class="card-head"><h2>Users</h2>
          <label class="search">${icon("search", 16)}<input data-bind="admin-q" value="${state.adminQ}" placeholder="Search name or email" aria-label="Search users"></label></header>
          <ul class="list users">${a.users.map(u => h`<li>
            <span class="avatar">${initials(u.name)}</span>
            <div><b>${u.name}</b><span class="muted">${u.email} · joined ${u.createdAt ? fmtDate(Date.parse(u.createdAt), { month: "short", day: "numeric", year: "numeric" }) : "–"}</span></div>
            ${u.role === "ADMIN" ? h`<span class="chip ok">Admin</span>` : h`
              <select data-change="plan" data-id="${u.id}" aria-label="Plan for ${u.name}"><option value="FREE" ${u.plan === "FREE" ? "selected" : ""}>Free</option><option value="PREMIUM" ${u.plan === "PREMIUM" ? "selected" : ""}>Premium</option></select>
              ${armedBtn("u" + u.id, "delete-user", "Delete", `data-id="${u.id}"`)}`}
          </li>`)}</ul>
          ${a.users.length ? "" : empty("search", "No users match", "Try another search.")}
        </section>
        <section class="card" style="--i:2"><header class="card-head"><h2>Most logged exercises</h2><span class="muted">All users · sets</span></header>
          ${st.topExercises.length ? h`<ul class="hbars">${st.topExercises.map((t, i) => h`<li style="--i:${i}"><span>${t.exercise}</span><span class="hbar"><i style="--w:${(t.sets / topMax) * 100}%"></i></span><b>${t.sets}</b></li>`)}</ul>`
            : empty("activity", "No sets logged yet", "This fills as members train.")}
        </section>
      </div>`;
  }

  // auth / demo entry
  function authPage() {
    const a = state.auth;
    const err = a.error ? h`<p class="form-error" role="alert">${a.error}</p>` : "";
    const info = a.info ? h`<p class="form-info" role="status">${a.info}</p>` : "";
    let card;
    if (state.mode === "demo") {
      card = h`<h2>Explore FitRank</h2>
        <p class="muted">No FitRank server is reachable from this page, so it runs as a demo: sample training history, and everything you add is saved only in this browser.</p>
        <button class="btn primary big wide" data-act="demo">${icon("play", 18)}Open the demo</button>
        <p class="fine">To sign in and keep data in PostgreSQL, run the Java server and open the address it prints.</p>`;
    } else if (a.view === "reset") {
      card = h`<h2>Reset password</h2>
        <form class="form" data-form="forgot"><label class="field"><span>Email</span><input name="email" type="email" value="${a.email}" required autocomplete="email"></label>
          <button class="btn wide">Send reset code</button></form>
        <p class="fine">There's no email service: the 6-digit code appears in the console of the FitRank server.</p>
        <form class="form" data-form="reset">
          <input type="hidden" name="email" value="${a.email}">
          <label class="field"><span>6-digit code</span><input name="code" inputmode="numeric" autocomplete="one-time-code" required maxlength="6"></label>
          <label class="field"><span>New password</span><input name="password" type="password" autocomplete="new-password" minlength="8" required></label>
          ${err}${info}
          <button class="btn primary wide">Set new password</button>
        </form>
        <button class="link" data-act="auth-view" data-view="signin">Back to sign in</button>`;
    } else {
      const up = a.view === "signup";
      card = h`<div class="seg wide" role="tablist">
          <button role="tab" data-act="auth-view" data-view="signin" aria-selected="${!up}">Sign in</button>
          <button role="tab" data-act="auth-view" data-view="signup" aria-selected="${up}">Create account</button></div>
        <form class="form" data-form="${up ? "signup" : "signin"}">
          ${up ? h`<label class="field"><span>Name</span><input name="name" required maxlength="120" autocomplete="name"></label>` : ""}
          <label class="field"><span>Email</span><input name="email" type="email" value="${a.email}" required autocomplete="email"></label>
          <label class="field"><span>Password</span><input name="password" type="password" required ${up ? h`minlength="8" autocomplete="new-password"` : h`autocomplete="current-password"`}></label>
          ${up ? h`<label class="field"><span>Main goal</span><select name="goal">${["Strength", "Muscle gain", "Fat loss", "General fitness", "Endurance"].map(g => h`<option>${g}</option>`)}</select></label>` : ""}
          ${err}${info}
          <button class="btn primary big wide" ${state.busy ? "disabled" : ""}>${up ? "Create account" : "Sign in"}</button>
        </form>
        ${up ? "" : h`<button class="link" data-act="auth-view" data-view="reset">Forgot password?</button>`}`;
    }
    return h`<div class="auth">
      <canvas id="pulse" aria-hidden="true"></canvas>
      <section class="auth-copy">
        <div class="brand"><img src="assets/icon.svg" alt="" width="34" height="34"><span>FitRank</span></div>
        <h1>Every set, ranked against your last.</h1>
        <p>Log lifts fast, bring in your Hevy and Apple Health history, and watch real progress land in your charts.</p>
      </section>
      <section class="card auth-card">${card}</section>
    </div>`;
  }

  // ---------- sheets ----------
  function sheetView() {
    const s = state.sheet;
    if (!s) return "";
    const body = SHEETS[s.type](s);
    return h`<div class="sheet-backdrop${state.shownSheet ? "" : " in"}" data-act="close-sheet"></div>
      <div class="sheet${state.shownSheet === s.type ? "" : " in"}" role="dialog" aria-modal="true" aria-label="${body.title}">
        <header class="sheet-head"><h2>${body.title}</h2><button class="icon-btn" data-act="close-sheet" aria-label="Close">${icon("x")}</button></header>
        <div class="sheet-body">${body.html}</div>
      </div>`;
  }

  const SHEETS = {
    more: () => ({ title: "More", html: h`<nav class="more-grid">${routes().filter(n => !TABS.includes(n[0])).map(([id, label, ic]) => h`<a href="#/${id}" class="more-link">${icon(ic, 22)}<span>${label}</span></a>`)}</nav>` }),
    picker: s => ({ title: s.forRoutine ? "Add to routine" : "Add exercise", html: h`
      <label class="search big">${icon("search", 18)}<input data-bind="pick-q" value="${s.q || ""}" placeholder="Search 90+ exercises" aria-label="Search exercises" autofocus></label>
      <div class="seg scroll" role="group" aria-label="Muscle group">${["All", ...GROUPS].map(g => h`<button data-act="pick-group" data-group="${g}" aria-pressed="${(s.group || "All") === g}">${g}</button>`)}</div>
      <div id="pick-list" class="pick-list">${new Raw(pickList(s))}</div>
      ${s.forRoutine ? h`<button class="btn primary wide" data-act="close-sheet">Done</button>` : ""}` }),
    exercise: s => {
      const x = state.live.exercises.find(e => e.id === s.ex), meta = lib(x.name);
      return { title: x.name, html: h`<div class="menu">
        <button data-act="cues" data-ex="${x.id}">${icon(premium() ? "insights" : "lock", 18)}Form cues${premium() ? "" : " (Premium)"}</button>
        <button data-act="move" data-dir="-1" data-ex="${x.id}">${icon("up", 18)}Move up</button>
        <button data-act="move" data-dir="1" data-ex="${x.id}">${icon("down", 18)}Move down</button>
        <button data-act="pick" data-replace="${x.id}">${icon("repeat", 18)}Replace exercise</button>
        <div class="danger-zone">${armedBtn("ex" + x.id, "remove-exercise", "Remove from workout", `data-ex="${x.id}"`)}</div>
      </div>${meta ? h`<p class="fine">${meta.group} · ${meta.equipment}</p>` : ""}` };
    },
    cues: s => {
      const meta = lib(s.name) || { pattern: "", group: groupOf(s.name), equipment: "Any" };
      const path = /curl|raise|fly/.test(meta.pattern) ? "M30 90 Q30 30 90 30" : /row|pull|carry|cardio/.test(meta.pattern) ? "M20 60 H100" : "M60 95 V25";
      return { title: s.name, html: h`<div class="cue-demo" aria-hidden="true"><svg viewBox="0 0 120 120"><path class="cue-track" d="${path}"/><path class="cue-path" d="${path}" pathLength="1"/><circle class="cue-dot" r="7" style="offset-path:path('${path}')"/></svg></div>
        <ol class="cues">${(CUES[meta.pattern] || ["Move with control", "Use a pain-free range", "Brace before each rep"]).map(c => h`<li>${c}</li>`)}</ol>
        <p class="fine">${meta.group} · ${meta.equipment}. Stop if anything hurts.</p>` };
    },
    rename: s => {
      const w = state.workouts.find(x => x.id === s.id);
      return { title: "Rename workout", html: h`<form class="form" data-form="rename"><input type="hidden" name="id" value="${w.id}">
        <label class="field"><span>Name</span><input name="title" value="${w.title}" required maxlength="160" autofocus></label><button class="btn primary wide">Save</button></form>` };
    },
    routine: s => ({ title: s.id ? "Edit routine" : "New routine", html: h`<form class="form" data-form="routine">
        <label class="field"><span>Name</span><input name="name" value="${s.name || ""}" required maxlength="80" placeholder="Push day" data-bind="routine-name"></label>
        <ol class="routine-edit">${(s.exercises || []).map((e, i) => h`<li><span>${e}</span><button type="button" class="icon-btn" data-act="routine-drop" data-index="${i}" aria-label="Remove ${e}">${icon("x", 18)}</button></li>`)}</ol>
        <button type="button" class="btn wide" data-act="pick" data-for-routine="1">${icon("plus", 16)}Add exercises</button>
        <button class="btn primary wide" ${(s.exercises || []).length ? "" : "disabled"}>Save routine</button>
      </form>` }),
    summary: ({ workout: w, prev: p, prs }) => ({ title: "Workout saved", html: h`<div class="finish">
        <div class="finish-ring">${icon("check", 40)}</div>
        <h3>${w.title}</h3>
        <div class="stat-row center">
          <div><span class="muted">Duration</span><b>${count(w.durationMinutes)} min</b>${p && p.durationMinutes ? delta(w.durationMinutes - p.durationMinutes, v => v + " min", false) : ""}</div>
          <div><span class="muted">Volume</span><b>${count(vol(w), "vol")} ${unit()}</b>${p ? delta(vol(w) - vol(p), v => Math.round(toU(v)).toLocaleString() + " " + unit()) : ""}</div>
          <div><span class="muted">Sets</span><b>${count(w.sets.length)}</b>${p ? delta(w.sets.length - p.sets.length, v => v + (v === 1 ? " set" : " sets")) : ""}</div>
        </div>
        ${p ? h`<p class="muted compare">Compared with your last ${p.title} · ${agoLower(ts(p))}</p>` : ""}
        ${prs.length ? h`<ul class="records">${prs.map(p => h`<li>${icon("trophy", 18)}<div><b>${p.exercise}</b><span class="muted">New e1RM ${fmtW(p.e1)} ${unit()}</span></div></li>`)}</ul>` : ""}
        <div class="row-actions center"><button class="btn" data-act="save-routine-from" data-id="${w.id}">${icon("routines", 16)}Save as routine</button><button class="btn primary" data-act="close-sheet">Done</button></div>
      </div>` }),
  };

  /** Change against the last session; green only when more is better. */
  const delta = (d, f, better = true) => h`<small class="vs${better && d > 0 ? " up" : ""}">${d ? (d > 0 ? "+" : "−") + f(Math.abs(d)) : "Same"}</small>`;

  function pickList(s) {
    const q = (s.q || "").trim().toLowerCase(), g = s.group || "All";
    const used = new Set(state.workouts.flatMap(w => w.sets.map(x => x.exercise)));
    const names = [...new Set([...LIB.map(e => e.name), ...used])];
    const found = names.filter(n => (g === "All" || groupOf(n) === g) && (!q || n.toLowerCase().includes(q))).sort((a, b) => used.has(b) - used.has(a) || a.localeCompare(b)).slice(0, 80);
    const chosen = new Set(s.forRoutine ? (state.sheetReturn && state.sheetReturn.exercises) || [] : []);
    return out(h`${found.map(n => h`<button class="pick" data-act="pick-one" data-name="${n}" ${chosen.has(n) ? h`aria-pressed="true"` : ""}><b>${n}</b><span class="muted">${groupOf(n)}${(lib(n) || {}).equipment ? " · " + lib(n).equipment : ""}${used.has(n) ? " · logged before" : ""}</span>${icon(chosen.has(n) ? "check" : "plus", 18)}</button>`)}
      ${q && !names.some(n => n.toLowerCase() === q) ? h`<button class="pick custom" data-act="pick-one" data-name="${s.q.trim()}"><b>Add “${s.q.trim()}”</b><span class="muted">Custom exercise</span>${icon("plus", 18)}</button>` : ""}
      ${found.length || q ? "" : empty("search", "Nothing here", "Try another group.")}`);
  }

  // ---------- actions ----------
  const toast = (text, tone = "") => {
    const t = $("#toast");
    t.className = "toast show " + tone;
    t.textContent = text;
    clearTimeout(toast.t);
    toast.t = setTimeout(() => { t.className = "toast"; }, 2800);
  };
  const fail = e => toast(e.message || String(e), "bad");
  const findLive = id => state.live.exercises.find(x => x.id === id);
  const newExercise = name => {
    const prev = previousSets(name);
    return { id: uid(), name, sets: Array.from({ length: Math.max(1, prev.length) }, () => ({ id: uid(), weight: "", reps: "", done: false })) };
  };

  function startWorkout(routineId) {
    if (state.live) return go("log");
    const r = routineId && (settings().routines || []).find(x => x.id === routineId);
    state.live = { title: r ? r.name : defaultTitle(), startedAt: Date.now(), exercises: r ? r.exercises.map(newExercise) : [] };
    saveLive();
    go("log");
  }
  const defaultTitle = () => { const hr = new Date().getHours(); return hr < 12 ? "Morning workout" : hr < 18 ? "Afternoon workout" : "Evening workout"; };

  function tick(row) {
    const x = findLive(row.closest("[data-ex]").dataset.ex), s = x.sets.find(y => y.id === row.dataset.set);
    if (s.done) { s.done = false; state.flash = null; saveLive(); return render(); }
    const [wIn, rIn] = row.querySelectorAll("input");
    const previous = input => /^[\d.,]+$/.test(input.placeholder) ? input.placeholder.replace(/,/g, "") : "";
    s.weight = wIn.value || previous(wIn);
    s.reps = rIn.value || previous(rIn);
    if (!(+s.reps > 0)) { rIn.focus(); return toast("Enter reps first"); }
    s.done = true;
    const e = e1rm(fromU(+s.weight || 0), +s.reps);
    const sessionBest = Math.max(0, ...x.sets.filter(y => y.done && y !== s).map(y => e1rm(fromU(+y.weight || 0), +y.reps)));
    const historic = bestE1(x.name);
    state.flash = { set: s.id, pr: historic > 0 && e > historic + 0.01 && e > sessionBest + 0.01 };
    if (navigator.vibrate) navigator.vibrate(state.flash.pr ? [12, 40, 12] : 10);
    saveLive();
    render();
    state.flash = null;
    rest.start(settings().rest ?? 90);
  }

  async function finish(btn) {
    const sets = liveDone();
    if (!sets.length) return toast("Complete at least one set first");
    const L = state.live;
    btn.disabled = true;
    try {
      const title = L.title.trim() || defaultTitle(), prev = state.workouts.find(w => w.title.trim().toLowerCase() === title.toLowerCase());
      const prs = groupSets(sets).map(e => ({ exercise: e.name, e1: Math.max(...e.sets.map(s => e1rm(s.weight, s.reps))) })).filter(p => bestE1(p.exercise) && p.e1 > bestE1(p.exercise) + 0.01);
      const saved = await db.save("workouts", {
        title, loggedAt: new Date(L.startedAt).toISOString(),
        durationMinutes: Math.max(1, Math.round((Date.now() - L.startedAt) / 60000)), calories: 0, notes: "",
        sets: sets.map(s => ({ ...s, rpe: 0, tag: "normal" })),
      });
      state.workouts = sortDesc([saved, ...state.workouts]);
      state.live = null;
      saveLive();
      rest.stop();
      go("home", true, { type: "summary", workout: saved, prev, prs });
    } catch (e) { btn.disabled = false; fail(e); }
  }

  async function removeEntry(kind, id, listKey, label) {
    try {
      await db.remove(kind, id);
      state[listKey] = state[listKey].filter(x => x.id !== id);
      state.armed = null;
      render();
      toast(label);
    } catch (e) { fail(e); }
  }

  async function loadAdmin() {
    try {
      const [stats, users] = await Promise.all([server.admin.stats(), server.admin.users(state.adminQ)]);
      state.admin = { stats, users };
      if (state.route === "admin") { state.enter = true; render(); }
    } catch (e) { fail(e); }
  }

  const ACTIONS = {
    start: el => startWorkout(el.dataset.routine),
    finish: el => finish(el),
    tick: el => tick(el.closest(".set")),
    "add-set": el => { findLive(el.closest("[data-ex]").dataset.ex).sets.push({ id: uid(), weight: "", reps: "", done: false }); saveLive(); render(); },
    discard: () => { state.live = null; saveLive(); rest.stop(); state.armed = null; go("home"); toast("Workout discarded"); },
    arm: el => { state.armed = el.dataset.key; render(); clearTimeout(ACTIONS.t); ACTIONS.t = setTimeout(() => { state.armed = null; render(); }, 3500); },
    sheet: el => { const d = el.dataset; state.sheet = d.sheet === "routine" ? routineDraft(d.id) : { type: d.sheet, ex: d.ex, id: d.id && +d.id }; render(); },
    "close-sheet": () => closeSheet(),
    pick: el => {
      if (el.dataset.forRoutine) { state.sheetReturn = state.sheet; state.sheetReturn.name = $("[data-bind=routine-name]").value; state.sheet = { type: "picker", forRoutine: true }; }
      else state.sheet = { type: "picker", replace: el.dataset.replace };
      render();
    },
    "pick-group": el => { state.sheet.group = el.dataset.group; render(); },
    "pick-one": el => {
      const name = el.dataset.name, s = state.sheet;
      if (s.forRoutine) {
        const r = state.sheetReturn, list = r.exercises;
        list.includes(name) ? list.splice(list.indexOf(name), 1) : list.push(name);
        $("#pick-list").innerHTML = pickList(s);
        return;
      }
      if (!state.live) startWorkout();
      if (s.replace) { const x = findLive(s.replace); Object.assign(x, newExercise(name), { id: x.id }); }
      else state.live.exercises.push(newExercise(name));
      saveLive();
      state.sheet = null;
      render();
    },
    move: el => { const L = state.live.exercises, i = L.findIndex(x => x.id === el.dataset.ex), j = i + +el.dataset.dir; if (j >= 0 && j < L.length) [L[i], L[j]] = [L[j], L[i]]; saveLive(); state.sheet = null; render(); },
    "remove-exercise": el => { state.live.exercises = state.live.exercises.filter(x => x.id !== el.dataset.ex); saveLive(); state.sheet = null; state.armed = null; render(); },
    cues: el => { if (!premium()) return toast("Form cues are part of Premium"); state.sheet = { type: "cues", name: findLive(el.dataset.ex).name }; render(); },
    repeat: el => {
      if (state.live) return toast("Finish or discard the current workout first");
      const w = state.workouts.find(x => x.id === +el.dataset.id);
      state.live = { title: w.title, startedAt: Date.now(), exercises: groupSets(w.sets).map(e => newExercise(e.name)) };
      saveLive();
      go("log");
    },
    "delete-workout": el => removeEntry("workouts", +el.dataset.id, "workouts", "Workout deleted"),
    "delete-meal": el => removeEntry("meals", +el.dataset.id, "meals", "Meal deleted"),
    "delete-routine": async el => { try { await saveSettings({ routines: (settings().routines || []).filter(r => r.id !== el.dataset.id) }); state.armed = null; render(); toast("Routine deleted"); } catch (e) { fail(e); } },
    "routine-drop": el => { const s = state.sheet; s.name = $("[data-bind=routine-name]").value; s.exercises.splice(+el.dataset.index, 1); render(); },
    "save-routine-from": el => { const w = state.workouts.find(x => x.id === +el.dataset.id); state.sheet = { type: "routine", name: w.title, exercises: groupSets(w.sets).map(e => e.name) }; render(); },
    range: el => { state.range = el.dataset.range; state.enter = true; render(); },
    export: el => exportData(el.dataset.format),
    "import-go": () => runImport(),
    "import-cancel": () => { state.preview = null; render(); },
    "auth-view": el => { state.auth = { ...state.auth, view: el.dataset.view, error: "", info: "" }; render(); },
    demo: async () => { load(demo.read() || await demo.start()); go("home"); },
    signout: () => { store.set(K.token, null); state.user = null; state.sheet = null; state.admin = null; rest.stop(); history.replaceState(null, "", "#/home"); render(); },
    "delete-account": async () => {
      try { await db.deleteMe(); store.set(K.token, null); store.set(K.live, null); state.live = null; state.user = null; state.armed = null; render(); toast(state.mode === "demo" ? "Demo data erased" : "Account deleted"); } catch (e) { fail(e); }
    },
    "delete-user": async el => {
      try { await server.admin.remove(+el.dataset.id); state.armed = null; await loadAdmin(); toast("User deleted"); } catch (e) { fail(e); }
    },
  };

  /** A picker opened from the routine editor closes back into it. */
  function closeSheet() {
    state.sheet = state.sheet && state.sheet.forRoutine ? state.sheetReturn : null;
    render();
  }

  const routineDraft = id => {
    const r = (settings().routines || []).find(x => x.id === id);
    return { type: "routine", id, name: r ? r.name : "", exercises: r ? r.exercises.slice() : [] };
  };

  const FORMS = {
    async signin(f) { const r = await server.login(f); store.set(K.token, r.token); load(await server.me()); go("home"); },
    async signup(f) { const r = await server.signup(f); store.set(K.token, r.token); load(await server.me()); go("home"); toast("Welcome to FitRank"); },
    async forgot(f) { const r = await server.forgot(f); state.auth = { ...state.auth, email: f.email, info: r.message, error: "" }; },
    async reset(f) { const r = await server.reset(f); store.set(K.token, r.token); load(await server.me()); go("home"); toast("Password updated"); },
    async weight(f) {
      const kg = fromU(parseFloat(f.kg));
      if (!(kg > 0)) throw new Error("Enter your weight");
      state.weights = sortDesc([await db.save("weights", { kg, loggedAt: new Date().toISOString() }), ...state.weights]);
      toast("Weight logged");
    },
    async meal(f) {
      const m = await db.save("meals", { name: f.name, calories: +f.calories || 0, protein: +f.protein || 0, water: +f.water || 0, loggedAt: new Date().toISOString() });
      state.meals = sortDesc([m, ...state.meals]);
      toast("Meal saved");
    },
    async profile(f) { state.user = await db.saveMe({ name: f.name, goal: f.goal, settings: { ...settings(), bio: f.bio } }); toast("Profile saved"); },
    async prefs(f) {
      await saveSettings({ units: f.units, rest: +f.rest, target: clamp(+f.target || 4, 1, 14), kcal: +f.kcal || 2400, protein: +f.protein || 160, water: +f.water || 3 });
      toast("Preferences saved");
    },
    async password(f, form) { await server.password(f); form.reset(); toast("Password changed"); },
    async rename(f) {
      const w = state.workouts.find(x => x.id === +f.id);
      const saved = await db.save("workouts", { ...w, title: f.title });
      state.workouts = state.workouts.map(x => x.id === saved.id ? saved : x);
      state.sheet = null;
      toast("Renamed");
    },
    async routine(f) {
      const s = state.sheet, list = (settings().routines || []).slice();
      const r = { id: s.id || uid(), name: f.name.trim(), exercises: s.exercises };
      const i = list.findIndex(x => x.id === r.id);
      i >= 0 ? (list[i] = r) : list.push(r);
      await saveSettings({ routines: list });
      state.sheet = null;
      toast("Routine saved");
    },
  };

  // ---------- import / export ----------
  function parseCsv(text) {
    const rows = []; let row = [], cell = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
      else if (c === '"') q = true;
      else if (c === ",") { row.push(cell); cell = ""; }
      else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
      else cell += c;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(r => r.some(Boolean));
  }
  const MONTHS = "janfebmaraprmayjunjulaugsepoctnovdec";
  /** Hevy writes "18 Apr 2026, 18:22"; Safari can't parse that natively. */
  function parseDate(s) {
    const m = String(s).match(/(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4}),?\s+(\d{1,2}):(\d{2})/);
    const t = m ? +new Date(+m[3], MONTHS.indexOf(m[2].toLowerCase()) / 3, +m[1], +m[4], +m[5]) : Date.parse(s);
    return isNaN(t) ? null : t;
  }

  function fromHevyCsv(text) {
    const rows = parseCsv(text.replace(/^\uFEFF/, "")), head = (rows.shift() || []).map(x => x.trim().toLowerCase());
    const col = k => head.indexOf(k);
    if (col("exercise_title") < 0 || col("start_time") < 0) throw new Error("That CSV isn't a Hevy workout export (no exercise_title / start_time columns).");
    const lb = col("weight_kg") < 0 && col("weight_lbs") >= 0, wCol = lb ? col("weight_lbs") : col("weight_kg");
    const map = new Map();
    for (const r of rows) {
      const start = parseDate(r[col("start_time")]);
      if (!start) continue;
      const key = r[col("title")] + "|" + start;
      if (!map.has(key)) {
        const end = parseDate(r[col("end_time")]);
        map.set(key, { title: r[col("title")] || "Workout", loggedAt: new Date(start).toISOString(), durationMinutes: end ? Math.max(0, Math.round((end - start) / 60000)) : 0, calories: 0, notes: "", sets: [] });
      }
      const w = parseFloat(r[wCol]) || 0;
      map.get(key).sets.push({ exercise: r[col("exercise_title")], weight: lb ? w / 2.20462 : w, reps: parseInt(r[col("reps")], 10) || 0, rpe: parseFloat(r[col("rpe")]) || 0, tag: r[col("set_type")] || "normal" });
    }
    return { workouts: [...map.values()] };
  }

  function fromJson(text) {
    const d = JSON.parse(text), list = Array.isArray(d) ? d : d.workouts || [];
    const workouts = list.map(w => {
      const start = parseDate(w.loggedAt || w.start_time || w.date || w.createdAt) || Date.now(), end = parseDate(w.end_time);
      const sets = w.sets && w.sets.length && w.sets[0].exercise ? w.sets
        : (w.exercises || []).flatMap(e => (e.sets || []).map(s => ({ exercise: e.title || e.name, weight: +(s.weight_kg ?? s.weight ?? 0), reps: +(s.reps || 0), rpe: +(s.rpe || 0), tag: s.type || "normal" })));
      return { title: w.title || w.name || "Workout", loggedAt: new Date(start).toISOString(), durationMinutes: w.durationMinutes || (end ? Math.round((end - start) / 60000) : 0), calories: w.calories || 0, notes: w.notes || "", sets: sets.map(s => ({ exercise: s.exercise, weight: +s.weight || 0, reps: +s.reps || 0, rpe: +s.rpe || 0, tag: s.tag || "normal" })) };
    }).filter(w => w.sets.length);
    const weights = (d.weights || []).map(x => ({ kg: +x.kg, loggedAt: x.loggedAt })).filter(x => x.kg > 0 && x.loggedAt);
    return { workouts, weights };
  }

  /** Streams an Apple Health export.xml (often hundreds of MB) without loading it whole. */
  async function fromHealth(file, onProgress) {
    const since = Date.now() - 30 * DAY, steps = {}, energy = {}, resting = [], mass = {};
    const reader = file.stream().pipeThrough(new TextDecoderStream()).getReader();
    const attr = (tag, k) => { const m = tag.match(new RegExp(`\\b${k}="([^"]*)"`)); return m ? m[1] : ""; };
    const when = s => Date.parse(s.replace(" ", "T").replace(/ ([+-]\d\d)(\d\d)$/, "$1:$2"));
    let buf = "", read = 0;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += value; read += value.length;
      const re = /<Record\b[^>]*>/g; let m, last = 0;
      while ((m = re.exec(buf))) {
        last = re.lastIndex;
        const tag = m[0];
        if (!/StepCount|ActiveEnergy|RestingHeartRate|BodyMass"/.test(tag)) continue;
        const type = attr(tag, "type"), t = when(attr(tag, "startDate")), v = parseFloat(attr(tag, "value"));
        if (!(v > 0) || isNaN(t)) continue;
        if (type.endsWith("BodyMass")) mass[dayKey(t)] = { t, kg: attr(tag, "unit") === "lb" ? v / 2.20462 : v };
        else if (t < since) continue;
        else if (type.endsWith("StepCount")) steps[dayKey(t)] = (steps[dayKey(t)] || 0) + v;
        else if (type.endsWith("ActiveEnergyBurned")) energy[dayKey(t)] = (energy[dayKey(t)] || 0) + (attr(tag, "unit") === "kJ" ? v / 4.184 : v);
        else if (type.endsWith("RestingHeartRate")) resting.push(v);
      }
      buf = buf.slice(Math.max(last, buf.lastIndexOf("<")));
      onProgress(read / file.size);
    }
    const avg = o => { const v = Object.values(o); return v.length ? Math.round(sum(v) / v.length) : 0; };
    return {
      health: { steps: avg(steps), activeKcal: avg(energy), restingHr: resting.length ? Math.round(sum(resting) / resting.length) : 0, importedAt: new Date().toISOString() },
      weights: Object.values(mass).filter(x => x.t > Date.now() - 2 * 365 * DAY).map(x => ({ kg: Math.round(x.kg * 10) / 10, loggedAt: new Date(x.t).toISOString() })),
    };
  }

  async function readFile(input) {
    const file = input.files[0];
    input.value = "";
    if (!file) return;
    try {
      let parsed;
      if (input.dataset.file === "health") {
        state.importing = { label: "Reading " + file.name, done: 0, total: 100 };
        render();
        parsed = await fromHealth(file, p => {
          const bar = $("#import-bar"), c = $("#import-count");
          if (bar) bar.style.setProperty("--w", Math.round(p * 100) + "%");
          if (c) c.textContent = Math.round(p * 100) + "%";
        });
        state.importing = null;
      } else {
        const text = await file.text();
        parsed = /\.json$/i.test(file.name) || text.trim().startsWith("{") || text.trim().startsWith("[") ? fromJson(text) : fromHevyCsv(text);
      }
      const seen = new Set(state.workouts.map(w => Math.round(ts(w) / 60000)));
      const fresh = (parsed.workouts || []).filter(w => !seen.has(Math.round(ts(w) / 60000)));
      const days = new Set(state.weights.map(w => dayKey(ts(w))));
      const weights = (parsed.weights || []).filter(w => !days.has(dayKey(ts(w))));
      const times = fresh.map(ts);
      state.preview = {
        file: file.name, workouts: parsed.workouts ? fresh : null, weights: parsed.weights ? weights : null, health: parsed.health,
        skipped: (parsed.workouts || []).length - fresh.length + (parsed.weights || []).length - weights.length,
        range: times.length ? `${fmtDate(Math.min(...times), { month: "short", day: "numeric", year: "numeric" })} – ${fmtDate(Math.max(...times), { month: "short", day: "numeric", year: "numeric" })}` : "",
      };
      if (!fresh.length && !weights.length && !parsed.health) { state.preview = null; toast("Nothing new in that file: everything is already here"); }
      render();
    } catch (e) { state.importing = null; render(); fail(e); }
  }

  async function runImport() {
    const p = state.preview, items = [...(p.workouts || []).map(x => ["workouts", x]), ...(p.weights || []).map(x => ["weights", x])];
    state.importing = { label: "Importing", done: 0, total: items.length };
    render();
    try {
      for (const [kind, x] of items) {
        const saved = await db.save(kind, x);
        state[kind].push(saved);
        state.importing.done++;
        const bar = $("#import-bar"), c = $("#import-count");
        if (bar) bar.style.setProperty("--w", (state.importing.done / items.length) * 100 + "%");
        if (c) c.textContent = `${state.importing.done} / ${items.length}`;
      }
      if (p.health) await saveSettings({ health: p.health });
      toast(`Imported ${items.length} records`, "good");
      state.preview = null;
    } catch (e) { fail(e); }
    state.workouts = sortDesc(state.workouts);
    state.weights = sortDesc(state.weights);
    state.importing = null;
    render();
  }

  function exportData(format) {
    const stamp = new Date().toISOString().slice(0, 10);
    let blob, name;
    if (format === "csv") {
      const rows = [["date", "workout", "exercise", "set", "weight_kg", "reps", "rpe"]];
      state.workouts.forEach(w => w.sets.forEach((s, i) => rows.push([w.loggedAt, w.title, s.exercise, i + 1, s.weight, s.reps, s.rpe || ""])));
      blob = new Blob([rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")], { type: "text/csv" });
      name = `fitrank-workouts-${stamp}.csv`;
    } else {
      const u = state.user;
      blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), user: { name: u.name, email: u.email, goal: u.goal, settings: u.settings }, workouts: state.workouts, meals: state.meals, weights: state.weights }, null, 2)], { type: "application/json" });
      name = `fitrank-export-${stamp}.json`;
    }
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: name });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ---------- rest timer (lives outside #app so re-renders never reset it) ----------
  const rest = {
    start(seconds) {
      if (!seconds) return;
      this.end = Date.now() + seconds * 1000;
      this.total = seconds;
      const el = $("#rest");
      el.hidden = false;
      el.innerHTML = out(h`<div class="rest-bar"><i></i></div><div class="rest-row">${icon("timer", 18)}<b id="rest-left">${clock(seconds)}</b><span class="muted">Rest</span>
        <span class="spacer"></span><button class="btn ghost" data-rest="-15" aria-label="15 seconds less">−15</button><button class="btn ghost" data-rest="15" aria-label="15 seconds more">+15</button><button class="btn" data-rest="0">Skip</button></div>`);
      this.paint();
      clearInterval(this.iv);
      this.iv = setInterval(() => this.paint(), 250);
    },
    paint() {
      const left = (this.end - Date.now()) / 1000, el = $("#rest");
      if (left <= 0) {
        this.stop();
        if (navigator.vibrate) navigator.vibrate([30, 60, 30]);
        return toast("Rest's up. Next set!", "good");
      }
      $("#rest-left").textContent = clock(Math.ceil(left));
      el.querySelector(".rest-bar i").style.transform = `scaleX(${left / this.total})`;
    },
    add(sec) { if (!sec) return this.stop(); this.end += sec * 1000; this.total = Math.max(this.total, (this.end - Date.now()) / 1000); this.paint(); },
    stop() { clearInterval(this.iv); const el = $("#rest"); el.hidden = true; el.innerHTML = ""; },
  };

  // ---------- motion ----------
  function afterRender() {
    const main = $("#main");
    if (main && main.classList.contains("enter")) {
      main.querySelectorAll("[data-count]").forEach(countUp);
      setTimeout(() => main.classList.remove("enter"), 1800);
    }
    document.querySelectorAll(".sheet [data-count]").forEach(countUp);
    state.enter = false;
    state.shownSheet = state.sheet && state.sheet.type;
    const auto = $(".sheet [autofocus]");
    if (auto) auto.focus();
    if (!state.user) pulse.start(); else pulse.stop();
  }

  function countUp(el) {
    const to = +el.dataset.count, fmt = el.dataset.fmt;
    if (calm.matches || !to) return;
    const t0 = performance.now(), dur = 1100;
    const step = now => {
      const p = Math.min(1, (now - t0) / dur), eased = 1 - Math.pow(2, -10 * p);
      el.textContent = formatCount(p < 1 ? to * eased : to, fmt);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /** Auth backdrop: slow heart-rate traces drifting across a dark field. */
  const pulse = {
    start() {
      const c = $("#pulse");
      if (!c || this.c === c) return;
      this.stop();
      this.c = c;
      const ctx = c.getContext("2d"), dpr = Math.min(2, devicePixelRatio || 1);
      const size = () => { c.width = c.clientWidth * dpr; c.height = c.clientHeight * dpr; };
      size();
      this.onResize = size;
      addEventListener("resize", size);
      const beat = x => { const p = ((x % 1) + 1) % 1; return p > 0.42 && p < 0.47 ? -Math.sin((p - 0.42) / 0.05 * Math.PI) * 1.0 : p > 0.47 && p < 0.52 ? Math.sin((p - 0.47) / 0.05 * Math.PI) * 0.45 : Math.sin(p * Math.PI * 2) * 0.03; };
      const draw = t => {
        const w = c.width, hgt = c.height, lines = 9;
        ctx.clearRect(0, 0, w, hgt);
        for (let i = 0; i < lines; i++) {
          const y0 = hgt * (0.12 + (i / (lines - 1)) * 0.76), amp = hgt * 0.07 * (1 - Math.abs(i - 4) / 6), speed = 0.00004 * (1 + i * 0.15);
          ctx.beginPath();
          for (let x = 0; x <= w; x += 3 * dpr) {
            const y = y0 + beat(x / (w * 0.55) - t * speed + i * 0.13) * amp;
            x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          }
          ctx.strokeStyle = i === 4 ? "rgba(61,123,255,.85)" : `rgba(61,123,255,${0.1 + (1 - Math.abs(i - 4) / 4) * 0.22})`;
          ctx.lineWidth = (i === 4 ? 2 : 1.25) * dpr;
          ctx.stroke();
        }
        if (!calm.matches && !document.hidden) this.raf = requestAnimationFrame(draw);
      };
      this.raf = requestAnimationFrame(draw);
    },
    stop() { cancelAnimationFrame(this.raf); if (this.onResize) removeEventListener("resize", this.onResize); this.c = null; },
  };

  // chart scrubber: one delegated listener for every line chart
  function scrub(e) {
    const chart = e.target.closest && e.target.closest(".line-chart");
    document.querySelectorAll(".line-chart .scrub:not([hidden])").forEach(s => { if (!chart || !chart.contains(s)) s.hidden = true; });
    if (!chart) return;
    const plot = chart.querySelector(".plot"), r = plot.getBoundingClientRect(), pts = JSON.parse(chart.dataset.points);
    const x = ((e.clientX - r.left) / r.width) * 100;
    const p = pts.reduce((best, q) => Math.abs(q[0] - x) < Math.abs(best[0] - x) ? q : best);
    const s = plot.querySelector(".scrub");
    s.hidden = false;
    s.style.setProperty("--x", p[0] + "%");
    s.style.setProperty("--y", p[1] + "%");
    s.querySelector(".scrub-tip").textContent = `${p[3]} · ${p[2]}${p[4] ? " · PR" : ""}`;
    s.classList.toggle("flip", p[0] > 70);
  }

  // ---------- events ----------
  document.addEventListener("click", e => {
    const restBtn = e.target.closest("[data-rest]");
    if (restBtn) return rest.add(+restBtn.dataset.rest);
    const el = e.target.closest("[data-act]");
    if (!el || el.disabled) {
      if (e.target.closest(".more-link")) state.sheet = null;
      return;
    }
    e.preventDefault();
    Promise.resolve(ACTIONS[el.dataset.act](el, e)).catch(fail);
  });

  document.addEventListener("submit", async e => {
    const form = e.target, name = form.dataset.form;
    if (!FORMS[name]) return;
    e.preventDefault();
    const btn = form.querySelector("button:not([type=button])");
    if (btn) btn.disabled = true;
    state.busy = true;
    try {
      await FORMS[name](Object.fromEntries(new FormData(form)), form);
      state.auth.error = "";
      render();
    } catch (err) {
      if (!state.user) { state.auth.error = err.message; state.auth.info = ""; render(); } else fail(err);
    } finally {
      state.busy = false;
      if (btn && btn.isConnected) btn.disabled = false;
    }
  });

  let qTimer;
  document.addEventListener("input", e => {
    const el = e.target, b = el.dataset.bind;
    if (!b) return;
    if (b === "title") { state.live.title = el.value; saveLive(); }
    else if (b === "weight" || b === "reps") {
      const x = findLive(el.closest("[data-ex]").dataset.ex), s = x.sets.find(y => y.id === el.closest(".set").dataset.set);
      s[b] = el.value.replace(",", ".").replace(/[^\d.]/g, "");
      saveLive();
    } else if (b === "routine-name") state.sheet.name = el.value;
    else if (b === "pick-q") { state.sheet.q = el.value; $("#pick-list").innerHTML = pickList(state.sheet); }
    else if (b === "admin-q") { state.adminQ = el.value; clearTimeout(qTimer); qTimer = setTimeout(async () => { state.admin.users = await server.admin.users(state.adminQ); const pos = el.selectionStart; render(); const i = $("[data-bind=admin-q]"); i.focus(); i.setSelectionRange(pos, pos); }, 250); }
  });

  document.addEventListener("change", async e => {
    const el = e.target;
    if (el.dataset.file) return readFile(el);
    const c = el.dataset.change;
    if (c === "exercise") { state.exercise = el.value; state.enter = true; render(); }
    if (c === "plan") {
      try { await server.admin.plan(+el.dataset.id, el.value); toast("Plan updated"); loadAdmin(); } catch (err) { fail(err); }
    }
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && state.sheet) closeSheet();
    if (e.key === "Enter" && e.target.dataset.bind === "reps") { e.preventDefault(); tick(e.target.closest(".set")); }
  });
  document.addEventListener("pointermove", scrub, { passive: true });
  document.addEventListener("pointerdown", scrub, { passive: true });
  addEventListener("hashchange", () => go(location.hash.replace(/^#\/?/, ""), false));
  setInterval(() => { const c = $("#live-clock"); if (c && state.live) c.textContent = clock((Date.now() - state.live.startedAt) / 1000); }, 1000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && !state.user) { pulse.stop(); pulse.start(); } });

  // ---------- boot ----------
  async function boot() {
    try {
      const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 2500);
      const res = await fetch("api/health", { cache: "no-store", signal: ctl.signal });
      clearTimeout(timer);
      const j = res.ok ? await res.json() : null;
      if (j && j.status === "ok") { state.mode = "server"; state.store = j.store; db = server; }
    } catch { /* no server: demo mode */ }
    try {
      if (state.mode === "server" ? token() : demo.read()) load(await db.me());
    } catch { store.set(K.token, null); }
    state.route = location.hash.replace(/^#\/?/, "") || "home";
    if (!routes().some(n => n[0] === state.route)) state.route = "home";
    render();
    if (state.route === "admin" && state.user) loadAdmin();
    if ("serviceWorker" in navigator && isSecureContext) navigator.serviceWorker.register("service-worker.js").catch(() => {});
  }
  boot();
})();
