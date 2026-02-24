const canvas = document.getElementById("bg");
const ctx = canvas?.getContext("2d", { alpha: true });
const themeToggleButton = document.getElementById("themeToggle");
const colorModeToggleButton = document.getElementById("colorModeToggle");

const STORAGE_KEYS = {
  backgroundMode: "siteBackgroundMode",
  colorMode: "siteColorMode",
};

const BACKGROUND_MODES = ["stars", "rain", "off"];
const BACKGROUND_MODE_META = {
  stars: { emoji: "\u2728", label: "stars" },
  rain: { emoji: "\u{1F327}", label: "rain" },
  off: { emoji: "\u274C", label: "off" },
};
const COLOR_MODE_META = {
  dark: { emoji: "\u26AB", label: "dark" },
  light: { emoji: "\u26AA", label: "light" },
};

const state = {
  w: 0,
  h: 0,
  dpr: 1,
  stars: [],
  raindrops: [],
  running: true,
  mode: "stars",
  darkModeBackgroundMode: "stars",
  colorMode: "dark",
  reduced:
    Boolean(window.matchMedia) &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches,
};

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function safeLocalStorageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore restricted storage
  }
}

function makeStar() {
  return {
    x: rand(0, state.w),
    y: rand(0, state.h),
    r: rand(0.8, 2.2),
    vx: rand(-0.18, 0.18),
    vy: rand(-0.12, 0.12),
    a: rand(0.1, 0.3),
  };
}

function makeRaindrop() {
  return {
    x: rand(0, state.w),
    y: rand(-state.h, state.h),
    len: rand(10, 22),
    speed: rand(5.5, 10.5),
    a: rand(0.18, 0.38),
  };
}

function resizeBackground() {
  if (!canvas || !ctx) {
    return;
  }

  state.dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  state.w = Math.floor(window.innerWidth);
  state.h = Math.floor(window.innerHeight);

  canvas.width = Math.floor(state.w * state.dpr);
  canvas.height = Math.floor(state.h * state.dpr);
  canvas.style.width = `${state.w}px`;
  canvas.style.height = `${state.h}px`;
  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

  const starBase = Math.floor((state.w * state.h) / 22000);
  const starTarget = state.reduced
    ? Math.max(12, Math.floor(starBase * 0.35))
    : Math.max(24, Math.min(90, starBase));

  while (state.stars.length < starTarget) state.stars.push(makeStar());
  while (state.stars.length > starTarget) state.stars.pop();

  const rainBase = Math.floor((state.w * state.h) / 9000);
  const rainTarget = state.reduced
    ? Math.max(20, Math.floor(rainBase * 0.45))
    : Math.max(40, Math.min(220, rainBase));

  while (state.raindrops.length < rainTarget) state.raindrops.push(makeRaindrop());
  while (state.raindrops.length > rainTarget) state.raindrops.pop();
}

function drawVignette() {
  if (!ctx) return;

  ctx.save();
  ctx.globalAlpha = 0.2;
  const gradient = ctx.createRadialGradient(
    state.w / 2,
    state.h / 2,
    50,
    state.w / 2,
    state.h / 2,
    Math.max(state.w, state.h) * 0.65
  );
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, state.w, state.h);
  ctx.restore();
}

function drawStars() {
  if (!ctx) return;

  for (const star of state.stars) {
    star.x += star.vx * (state.reduced ? 0.35 : 1);
    star.y += star.vy * (state.reduced ? 0.35 : 1);

    if (star.x < -10) star.x = state.w + 10;
    if (star.x > state.w + 10) star.x = -10;
    if (star.y < -10) star.y = state.h + 10;
    if (star.y > state.h + 10) star.y = -10;

    ctx.beginPath();
    ctx.globalAlpha = star.a;
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,1)";
    ctx.fill();
  }

  if (state.reduced) return;

  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.strokeStyle = "rgba(145,190,255,1)";

  for (let i = 0; i < state.stars.length; i += 1) {
    for (let j = i + 1; j < state.stars.length; j += 1) {
      const a = state.stars[i];
      const b = state.stars[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      if (dx * dx + dy * dy < 140 * 140) {
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }

  ctx.restore();
}

function drawRain() {
  if (!ctx) return;

  ctx.save();
  ctx.lineWidth = 1.2;
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(185, 220, 255, 1)";

  for (const drop of state.raindrops) {
    drop.y += drop.speed * (state.reduced ? 0.55 : 1);

    if (drop.y - drop.len > state.h) {
      drop.x = rand(0, state.w);
      drop.y = -rand(8, state.h * 0.35);
      drop.len = rand(10, 22);
      drop.speed = rand(5.5, 10.5);
      drop.a = rand(0.18, 0.38);
    }

    ctx.globalAlpha = drop.a;
    ctx.beginPath();
    ctx.moveTo(drop.x, drop.y);
    ctx.lineTo(drop.x, drop.y + drop.len);
    ctx.stroke();
  }

  ctx.restore();
}

function drawFrame() {
  if (!canvas || !ctx || !state.running) return;

  ctx.clearRect(0, 0, state.w, state.h);

  if (state.mode !== "off") {
    drawVignette();
  }

  if (state.mode === "stars") drawStars();
  if (state.mode === "rain") drawRain();

  requestAnimationFrame(drawFrame);
}

function createLanguageRow(lang, pct) {
  const row = document.createElement("div");
  row.className = "langRow";

  const top = document.createElement("div");
  top.className = "langTop";
  const name = document.createElement("span");
  name.textContent = lang;
  const percent = document.createElement("span");
  percent.textContent = `${pct}%`;
  top.append(name, percent);

  const bar = document.createElement("div");
  bar.className = "langBar";
  const fill = document.createElement("div");
  fill.className = "langFill";
  fill.style.width = `${pct}%`;
  bar.appendChild(fill);

  row.append(top, bar);
  return row;
}

async function loadLanguageFrequency() {
  const list = document.getElementById("ghLangList");
  const note = document.getElementById("ghLangNote");
  if (!list || !note) return;

  try {
    const response = await fetch("api/github-langs.php?user=AaronCreor");
    if (!response.ok) throw new Error(`API failed: ${response.status}`);

    const data = await response.json();
    const entries = (data.languages || []).filter((entry) => (entry.pct ?? 0) > 0);

    list.innerHTML = "";
    if (entries.length === 0) {
      note.textContent = "No language data available.";
      return;
    }

    for (const { lang, pct } of entries) {
      list.appendChild(createLanguageRow(lang, pct));
    }

    note.innerHTML =
      `Based on ${data.sampled_repos} recent repos ` +
      `&middot; <a href="https://github.com/AaronCreor" target="_blank" rel="noreferrer">GitHub</a>`;
  } catch (error) {
    console.warn(error);
    note.textContent = "Couldn't load language stats.";
  }
}

function updateThemeToggleLockState() {
  if (!themeToggleButton) return;

  const locked = state.colorMode === "light";
  themeToggleButton.disabled = locked;
  if (locked) {
    themeToggleButton.setAttribute("aria-label", "Background mode: off (locked in light mode)");
    themeToggleButton.title = "Background mode: off (locked in light mode)";
  }
}

function updateThemeToggleButton() {
  if (!themeToggleButton) return;

  const meta = BACKGROUND_MODE_META[state.mode];
  themeToggleButton.textContent = meta.emoji;
  if (state.colorMode !== "light") {
    themeToggleButton.setAttribute("aria-label", `Background mode: ${meta.label}`);
    themeToggleButton.title = `Background mode: ${meta.label}`;
  }
  updateThemeToggleLockState();
}

function updateColorModeToggleButton() {
  if (!colorModeToggleButton) return;

  const meta = COLOR_MODE_META[state.colorMode];
  colorModeToggleButton.textContent = meta.emoji;
  colorModeToggleButton.setAttribute("aria-label", `Color mode: ${meta.label}`);
  colorModeToggleButton.title = `Color mode: ${meta.label}`;
}

function applyColorMode() {
  document.documentElement.setAttribute("data-color-mode", state.colorMode);
  if (document.body) {
    document.body.setAttribute("data-color-mode", state.colorMode);
  }
}

function saveBackgroundMode() {
  safeLocalStorageSet(STORAGE_KEYS.backgroundMode, state.darkModeBackgroundMode);
}

function saveColorMode() {
  safeLocalStorageSet(STORAGE_KEYS.colorMode, state.colorMode);
}

function cycleBackgroundMode() {
  if (state.colorMode === "light") return;

  const currentIndex = BACKGROUND_MODES.indexOf(state.darkModeBackgroundMode);
  state.darkModeBackgroundMode = BACKGROUND_MODES[(currentIndex + 1) % BACKGROUND_MODES.length];
  state.mode = state.darkModeBackgroundMode;
  updateThemeToggleButton();
  saveBackgroundMode();

  if (canvas && ctx && state.mode === "off") {
    ctx.clearRect(0, 0, state.w, state.h);
  }

  if (!state.running) {
    state.running = true;
    requestAnimationFrame(drawFrame);
  }
}

function cycleColorMode() {
  if (state.colorMode === "dark") {
    state.colorMode = "light";
    state.mode = "off";
  } else {
    state.colorMode = "dark";
    state.mode = state.darkModeBackgroundMode;
  }

  applyColorMode();
  updateColorModeToggleButton();
  updateThemeToggleButton();
  saveColorMode();

  if (!state.running) {
    state.running = true;
    requestAnimationFrame(drawFrame);
  }
}

function loadStoredPreferences() {
  const storedBackgroundMode = safeLocalStorageGet(STORAGE_KEYS.backgroundMode);
  if (BACKGROUND_MODES.includes(storedBackgroundMode)) {
    state.darkModeBackgroundMode = storedBackgroundMode;
  }

  const storedColorMode = safeLocalStorageGet(STORAGE_KEYS.colorMode);
  if (storedColorMode === "dark" || storedColorMode === "light") {
    state.colorMode = storedColorMode;
  }

  state.mode = state.colorMode === "light" ? "off" : state.darkModeBackgroundMode;
}

function initKeyboardShortcuts() {
  window.addEventListener("keydown", (event) => {
    const key = (event.key || "").toLowerCase();

    if (key === "p") {
      state.running = !state.running;
      if (state.running) requestAnimationFrame(drawFrame);
    }

    if (key === "r") {
      state.reduced = !state.reduced;
      resizeBackground();
    }
  });
}

function initThemeToggle() {
  updateThemeToggleButton();
  if (!themeToggleButton) return;
  themeToggleButton.addEventListener("click", cycleBackgroundMode);
}

function initColorModeToggle() {
  applyColorMode();
  updateColorModeToggleButton();
  if (!colorModeToggleButton) return;
  colorModeToggleButton.addEventListener("click", cycleColorMode);
}

function initBackground() {
  if (!canvas || !ctx) return;

  loadStoredPreferences();
  applyColorMode();
  window.addEventListener("resize", resizeBackground, { passive: true });
  initKeyboardShortcuts();
  initThemeToggle();
  initColorModeToggle();
  resizeBackground();
  requestAnimationFrame(drawFrame);
}

initBackground();
loadLanguageFrequency();
