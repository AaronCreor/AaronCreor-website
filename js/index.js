const canvas = document.getElementById("bg");
const ctx = canvas?.getContext("2d", { alpha: true });
const themeToggleButton = document.getElementById("themeToggle");

const STORAGE_KEYS = {
  backgroundMode: "siteBackgroundMode",
};

const BACKGROUND_MODES = ["stars", "rain", "off"];
const BACKGROUND_MODE_META = {
  stars: { emoji: "\u2728", label: "stars" },
  rain: { emoji: "\u{1F327}", label: "rain" },
  off: { emoji: "\u274C", label: "off" },
};
const state = {
  w: 0,
  h: 0,
  dpr: 1,
  stars: [],
  raindrops: [],
  running: true,
  mode: "stars",
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

function formatBlogDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function createBlogCard(post) {
  const link = document.createElement("a");
  link.className = "blogCard";
  link.href = post.path;
  link.textContent = "";

  const title = document.createElement("h3");
  title.className = "blogCardTitle";
  title.textContent = post.title;

  const meta = document.createElement("div");
  meta.className = "blogCardMeta";
  meta.textContent = formatBlogDate(post.published);

  const excerpt = document.createElement("div");
  excerpt.className = "blogCardExcerpt";
  excerpt.textContent = post.excerpt || "";

  link.append(title, meta, excerpt);
  return link;
}

async function loadRecentBlogPosts() {
  const list = document.getElementById("recentBlogPosts");
  const note = document.getElementById("blogPostsNote");
  if (!list || !note) return;

  try {
    const response = await fetch("blog/posts.json");
    if (!response.ok) throw new Error(`Blog manifest failed: ${response.status}`);

    const data = await response.json();
    const posts = Array.isArray(data.posts) ? data.posts : [];

    const recent = posts
      .filter(
        (post) =>
          post &&
          typeof post.title === "string" &&
          typeof post.path === "string" &&
          typeof post.published === "string"
      )
      .sort((a, b) => new Date(b.published) - new Date(a.published))
      .slice(0, 3);

    list.innerHTML = "";

    if (recent.length === 0) {
      note.textContent = "No blog posts yet.";
      return;
    }

    for (const post of recent) {
      list.appendChild(createBlogCard(post));
    }

    note.textContent = `Showing ${recent.length} most recent post${recent.length === 1 ? "" : "s"}.`;
  } catch (error) {
    console.warn(error);
    note.textContent = "Couldn't load blog posts.";
  }
}

function updateThemeToggleButton() {
  if (!themeToggleButton) return;

  const meta = BACKGROUND_MODE_META[state.mode];
  themeToggleButton.textContent = meta.emoji;
  themeToggleButton.disabled = false;
  themeToggleButton.setAttribute("aria-label", `Background mode: ${meta.label}`);
  themeToggleButton.title = `Background mode: ${meta.label}`;
}

function saveBackgroundMode() {
  safeLocalStorageSet(STORAGE_KEYS.backgroundMode, state.mode);
}

function cycleBackgroundMode() {
  const currentIndex = BACKGROUND_MODES.indexOf(state.mode);
  state.mode = BACKGROUND_MODES[(currentIndex + 1) % BACKGROUND_MODES.length];
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

function loadStoredPreferences() {
  const storedBackgroundMode = safeLocalStorageGet(STORAGE_KEYS.backgroundMode);
  if (BACKGROUND_MODES.includes(storedBackgroundMode)) {
    state.mode = storedBackgroundMode;
  }
}

function initProjectCarousel() {
  const carousel = document.getElementById("projectCarousel");
  const track = document.getElementById("projectCarouselTrack");
  const prevButton = document.getElementById("projectCarouselPrev");
  const nextButton = document.getElementById("projectCarouselNext");

  if (!carousel || !track || !prevButton || !nextButton) {
    return;
  }

  const originalSlides = Array.from(track.children).filter((child) =>
    child.classList.contains("projectSlide")
  );

  if (originalSlides.length <= 1) {
    prevButton.disabled = true;
    nextButton.disabled = true;
    return;
  }

  const mediaQuery = window.matchMedia("(min-width: 820px)");
  let visibleCount = 1;
  let currentIndex = 0;
  let isAnimating = false;
  let cloneCount = 1;

  function getVisibleCount() {
    return mediaQuery.matches ? Math.min(3, originalSlides.length) : 1;
  }

  function setTransform(withTransition = true) {
    const firstSlide = track.querySelector(".projectSlide");
    const slideWidthPx = firstSlide ? firstSlide.getBoundingClientRect().width : 0;
    const translatePx = currentIndex * slideWidthPx;
    track.style.transition = withTransition ? "transform 220ms ease" : "none";
    track.style.transform = `translateX(-${translatePx}px)`;
  }

  function updateAria() {
    const logicalIndex = ((currentIndex - cloneCount) % originalSlides.length + originalSlides.length) % originalSlides.length;
    carousel.setAttribute(
      "aria-label",
      `Featured projects carousel (${logicalIndex + 1} of ${originalSlides.length})`
    );
  }

  function rebuildTrack() {
    visibleCount = getVisibleCount();
    cloneCount = visibleCount;
    track.style.setProperty("--project-visible-count", String(visibleCount));
    track.innerHTML = "";

    const headClones = originalSlides
      .slice(-cloneCount)
      .map((slide) => slide.cloneNode(true));
    const tailClones = originalSlides
      .slice(0, cloneCount)
      .map((slide) => slide.cloneNode(true));

    for (const slide of headClones) track.appendChild(slide);
    for (const slide of originalSlides) track.appendChild(slide);
    for (const slide of tailClones) track.appendChild(slide);

    currentIndex = cloneCount;
    setTransform(false);
    updateAria();
  }

  function goToNext() {
    if (isAnimating) return;
    isAnimating = true;
    currentIndex += 1;
    setTransform(true);
    updateAria();
  }

  function goToPrev() {
    if (isAnimating) return;
    isAnimating = true;
    currentIndex -= 1;
    setTransform(true);
    updateAria();
  }

  track.addEventListener("transitionend", () => {
    const maxRealIndex = cloneCount + originalSlides.length - 1;

    if (currentIndex > maxRealIndex) {
      currentIndex = cloneCount;
      setTransform(false);
    } else if (currentIndex < cloneCount) {
      currentIndex = cloneCount + originalSlides.length - 1;
      setTransform(false);
    }

    updateAria();
    isAnimating = false;
  });

  prevButton.addEventListener("click", goToPrev);
  nextButton.addEventListener("click", goToNext);

  carousel.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goToPrev();
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goToNext();
    }
  });

  carousel.tabIndex = 0;
  rebuildTrack();

  mediaQuery.addEventListener("change", () => {
    isAnimating = false;
    rebuildTrack();
  });
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
  // Removed: site now uses dark mode only.
}

function initBackground() {
  if (!canvas || !ctx) return;

  loadStoredPreferences();
  window.addEventListener("resize", resizeBackground, { passive: true });
  initKeyboardShortcuts();
  initThemeToggle();
  initColorModeToggle();
  resizeBackground();
  requestAnimationFrame(drawFrame);
}

initBackground();
initProjectCarousel();
loadLanguageFrequency();
loadRecentBlogPosts();
