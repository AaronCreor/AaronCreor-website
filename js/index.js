const canvas = document.getElementById("bg");
const ctx = canvas?.getContext("2d", { alpha: true });

const state = {
  w: 0,
  h: 0,
  dpr: 1,
  particles: [],
  running: true,
  reduced:
    Boolean(window.matchMedia) &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches,
};

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function makeParticle() {
  return {
    x: rand(0, state.w),
    y: rand(0, state.h),
    r: rand(0.8, 2.2),
    vx: rand(-0.18, 0.18),
    vy: rand(-0.12, 0.12),
    a: rand(0.1, 0.3),
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

  const base = Math.floor((state.w * state.h) / 22000);
  const target = state.reduced
    ? Math.max(12, Math.floor(base * 0.35))
    : Math.max(24, Math.min(90, base));

  while (state.particles.length < target) {
    state.particles.push(makeParticle());
  }

  while (state.particles.length > target) {
    state.particles.pop();
  }
}

function drawFrame() {
  if (!canvas || !ctx || !state.running) {
    return;
  }

  ctx.clearRect(0, 0, state.w, state.h);

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

  for (const particle of state.particles) {
    particle.x += particle.vx * (state.reduced ? 0.35 : 1);
    particle.y += particle.vy * (state.reduced ? 0.35 : 1);

    if (particle.x < -10) particle.x = state.w + 10;
    if (particle.x > state.w + 10) particle.x = -10;
    if (particle.y < -10) particle.y = state.h + 10;
    if (particle.y > state.h + 10) particle.y = -10;

    ctx.beginPath();
    ctx.globalAlpha = particle.a;
    ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,1)";
    ctx.fill();
  }

  if (!state.reduced) {
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.strokeStyle = "rgba(145,190,255,1)";

    for (let i = 0; i < state.particles.length; i += 1) {
      for (let j = i + 1; j < state.particles.length; j += 1) {
        const a = state.particles[i];
        const b = state.particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distanceSquared = dx * dx + dy * dy;

        if (distanceSquared < 140 * 140) {
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

  if (!list || !note) {
    return;
  }

  try {
    const response = await fetch("api/github-langs.php?user=AaronCreor");
    if (!response.ok) {
      throw new Error(`API failed: ${response.status}`);
    }

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

function initKeyboardShortcuts() {
  window.addEventListener("keydown", (event) => {
    const key = (event.key || "").toLowerCase();

    if (key === "p") {
      state.running = !state.running;
      if (state.running) {
        requestAnimationFrame(drawFrame);
      }
    }

    if (key === "r") {
      state.reduced = !state.reduced;
      resizeBackground();
    }
  });
}

function initBackground() {
  if (!canvas || !ctx) {
    return;
  }

  window.addEventListener("resize", resizeBackground, { passive: true });
  initKeyboardShortcuts();
  resizeBackground();
  requestAnimationFrame(drawFrame);
}

initBackground();
loadLanguageFrequency();
