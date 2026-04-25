// me — app.js
// Two views: AGENT (raw markdown) · HUMAN (rendered, themeable).

const HUMAN_THEMES = [
  { value: "editorial", label: "Editorial" },
  { value: "brutalist", label: "Brutalist" },
  { value: "newspaper", label: "Newspaper" },
  { value: "soft", label: "Soft" },
  { value: "minimal", label: "Minimal" },
];

const VALID_VIEWS = new Set(["agent", "human"]);
const VALID_HUMAN_THEMES = new Set(HUMAN_THEMES.map((t) => t.value));

const KEYS = {
  view: "zd:view",
  humanTheme: "zd:humanTheme",
};

const html = document.documentElement;

const els = {
  agentSource: document.getElementById("agent-source"),
  humanBody: document.getElementById("human-body"),
  themeSelect: document.getElementById("human-theme"),
  copyBtn: document.getElementById("copy-btn"),
  infoBtn: document.getElementById("info-btn"),
  infoWrap: document.querySelector(".info"),
  tabs: Array.from(document.querySelectorAll('[role="tab"][data-view]')),
};

const state = {
  view: VALID_VIEWS.has(html.dataset.view) ? html.dataset.view : "agent",
  humanTheme: VALID_HUMAN_THEMES.has(html.dataset.humanTheme) ? html.dataset.humanTheme : "editorial",
  markdown: "",
};

let copyTimer = null;

// ---- Persistence helpers ------------------------------------

function lsSet(key, val) {
  try { localStorage.setItem(key, val); } catch (e) {}
}

// ---- URL handling -------------------------------------------

function readViewFromUrl() {
  const params = new URLSearchParams(location.search);
  const v = params.get("view");
  if (VALID_VIEWS.has(v)) state.view = v;
}

function syncUrl() {
  const url = new URL(location.href);
  if (state.view === "agent") url.searchParams.delete("view");
  else url.searchParams.set("view", state.view);
  history.replaceState({}, "", url);
}

// ---- Theme select dropdown ----------------------------------

function populateThemeSelect() {
  const frag = document.createDocumentFragment();
  HUMAN_THEMES.forEach(({ value, label }) => {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = label;
    frag.appendChild(opt);
  });
  els.themeSelect.appendChild(frag);
  els.themeSelect.value = state.humanTheme;
}

// ---- State application --------------------------------------

function applyState({ persist = true } = {}) {
  html.dataset.view = state.view;
  html.dataset.humanTheme = state.humanTheme;

  els.tabs.forEach((btn) => {
    const active = btn.dataset.view === state.view;
    btn.setAttribute("aria-selected", String(active));
    btn.tabIndex = active ? 0 : -1;
  });

  if (els.themeSelect.value !== state.humanTheme) {
    els.themeSelect.value = state.humanTheme;
  }

  syncUrl();

  if (persist) {
    lsSet(KEYS.view, state.view);
    lsSet(KEYS.humanTheme, state.humanTheme);
  }

  document.querySelectorAll("[data-view-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.viewPanel !== state.view;
  });
}

// ---- Copy button --------------------------------------------

function setCopyState(status, label) {
  els.copyBtn.dataset.copyState = status;
  els.copyBtn.setAttribute("aria-label", label);
  els.copyBtn.title = label;
  clearTimeout(copyTimer);
  copyTimer = status === "idle"
    ? null
    : setTimeout(() => setCopyState("idle", "Copy markdown"), 1400);
}

async function copyMarkdown() {
  if (!state.markdown) return;
  try {
    await navigator.clipboard.writeText(state.markdown);
    setCopyState("copied", "Copied");
  } catch (e) {
    setCopyState("failed", "Copy failed");
  }
}

// ---- Markdown rendering -------------------------------------

function renderMarkdown() {
  els.agentSource.textContent = state.markdown;
  if (typeof marked !== "undefined") {
    marked.setOptions({ gfm: true, breaks: true });
    els.humanBody.innerHTML = marked.parse(state.markdown);
  } else {
    els.humanBody.innerHTML =
      "<p>The Markdown renderer failed to load. Switching to the AGENT view, which shows the raw source.</p>";
    if (state.view === "human") {
      state.view = "agent";
      applyState();
    }
  }
}

function renderError(msg) {
  const isFile = location.protocol === "file:";
  const hint = isFile
    ? "<p>Try serving this directory locally first: <code>python3 -m http.server 8000</code>, then open <a href='http://localhost:8000'>http://localhost:8000</a>.</p>"
    : "";
  els.humanBody.innerHTML = `<h1>Could not load ZAC_DUTHIE.md</h1><p>${msg}</p>${hint}`;
  const fileNote = isFile ? "\n\n# Tip: serve via `python3 -m http.server 8000`\n" : "";
  els.agentSource.textContent = `# Could not load ZAC_DUTHIE.md\n\n${msg}${fileNote}`;
}

async function loadMarkdown() {
  const res = await fetch("./ZAC_DUTHIE.md", { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// ---- Events -------------------------------------------------

function bindEvents() {
  els.tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.view === state.view) return;
      state.view = btn.dataset.view;
      applyState();
    });
    btn.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const idx = els.tabs.indexOf(btn);
        const next = els.tabs[(idx + (e.key === "ArrowRight" ? 1 : els.tabs.length - 1)) % els.tabs.length];
        next.focus();
        next.click();
      }
    });
  });

  els.themeSelect.addEventListener("change", (e) => {
    if (VALID_HUMAN_THEMES.has(e.target.value)) {
      state.humanTheme = e.target.value;
      applyState();
    }
  });

  els.copyBtn.addEventListener("click", copyMarkdown);

  // Info tooltip — hover/focus drives it on desktop; tap toggles on touch.
  if (els.infoBtn && els.infoWrap) {
    els.infoBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = els.infoWrap.classList.toggle("is-open");
      els.infoBtn.setAttribute("aria-expanded", String(open));
    });
    document.addEventListener("click", (e) => {
      if (!els.infoWrap.contains(e.target)) {
        els.infoWrap.classList.remove("is-open");
        els.infoBtn.setAttribute("aria-expanded", "false");
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && els.infoWrap.classList.contains("is-open")) {
        els.infoWrap.classList.remove("is-open");
        els.infoBtn.setAttribute("aria-expanded", "false");
        els.infoBtn.focus();
      }
    });
  }

  window.addEventListener("popstate", () => {
    readViewFromUrl();
    applyState();
  });
}

// ---- Bootstrap ---------------------------------------------

readViewFromUrl();
populateThemeSelect();
bindEvents();
applyState({ persist: false });
setCopyState("idle", "Copy markdown");

loadMarkdown()
  .then((md) => {
    state.markdown = md;
    renderMarkdown();
  })
  .catch((err) => renderError(err.message));
