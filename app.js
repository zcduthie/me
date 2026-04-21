const THEMES = [
  {
    value: "minimal",
    label: "Minimal",
    description: "Quiet, plain, and readable.",
  },
  {
    value: "mono",
    label: "Mono",
    description: "Slightly more technical and document-like.",
  },
  {
    value: "editorial",
    label: "Editorial",
    description: "A softer long-form reading mode.",
  },
  {
    value: "terminal",
    label: "Terminal",
    description: "A restrained terminal-flavored option.",
  },
  {
    value: "brutalist",
    label: "Brutalist",
    description: "Bold, graphic, and hard-edged.",
  },
  {
    value: "cv",
    label: "CV",
    description: "Structured and resume-like.",
  },
  {
    value: "newspaper",
    label: "Newspaper",
    description: "An old-school editorial treatment.",
  },
  {
    value: "soft",
    label: "Soft",
    description: "A gentle serif reading mode.",
  },
];

const STORAGE_KEYS = {
  theme: "zac-duthie-theme",
  view: "zac-duthie-view",
};

const DEFAULT_STATE = {
  markdown: "",
  theme: THEMES[0].value,
  view: "agent",
};

const VALID_VIEWS = new Set(["agent", "human"]);

marked.setOptions({
  gfm: true,
  breaks: false,
});

const elements = {
  body: document.body,
  humanView: document.getElementById("human-view"),
  agentView: document.getElementById("agent-view"),
  agentCode: document.querySelector("#agent-view code"),
  copyButton: document.getElementById("copy-markdown-button"),
  themeControls: document.getElementById("theme-controls"),
  themeSelect: document.getElementById("theme-select"),
  viewButtons: [...document.querySelectorAll("[data-view-target]")],
};

const state = {
  ...DEFAULT_STATE,
  ...readInitialState(),
};

let copyFeedbackTimer = null;

function themeFor(value) {
  return THEMES.find((theme) => theme.value === value) ?? THEMES[0];
}

function resolveTheme(value) {
  return themeFor(value).value;
}

function resolveView(value) {
  return VALID_VIEWS.has(value) ? value : DEFAULT_STATE.view;
}

function readInitialState() {
  const params = new URLSearchParams(window.location.search);
  const theme = params.get("theme") ?? localStorage.getItem(STORAGE_KEYS.theme);
  const view = params.get("view") ?? localStorage.getItem(STORAGE_KEYS.view);

  return {
    theme: resolveTheme(theme),
    view: resolveView(view),
  };
}

function populateThemeSelect() {
  const fragment = document.createDocumentFragment();

  THEMES.forEach(({ value, label }) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    fragment.appendChild(option);
  });

  elements.themeSelect.appendChild(fragment);
}

function syncUrl() {
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set("theme", state.theme);
  nextUrl.searchParams.set("view", state.view);
  window.history.replaceState({}, "", nextUrl);
}

function syncUi() {
  const activeTheme = themeFor(state.theme);
  const isHumanView = state.view === "human";

  elements.body.dataset.theme = activeTheme.value;
  elements.body.dataset.view = state.view;
  elements.themeSelect.value = activeTheme.value;
  elements.themeSelect.title = activeTheme.description;
  elements.themeControls.setAttribute("aria-hidden", String(!isHumanView));
  elements.humanView.hidden = !isHumanView;
  elements.agentView.hidden = isHumanView;

  elements.viewButtons.forEach((button) => {
    const isActive = button.dataset.viewTarget === state.view;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  localStorage.setItem(STORAGE_KEYS.theme, activeTheme.value);
  localStorage.setItem(STORAGE_KEYS.view, state.view);
  syncUrl();
}

function renderMarkdown() {
  elements.humanView.innerHTML = marked.parse(state.markdown);
  elements.agentCode.textContent = state.markdown;
}

function renderError(message) {
  elements.humanView.innerHTML = `
    <h1>Missing markdown</h1>
    <p>${message}</p>
    <p>Make sure <code>ZAC_DUTHIE.md</code> exists in the site root.</p>
  `;
  elements.agentCode.textContent = message;
}

function setCopyButtonState(status, title) {
  elements.copyButton.dataset.copyState = status;
  elements.copyButton.title = title;
  elements.copyButton.setAttribute("aria-label", title);

  if (copyFeedbackTimer) {
    window.clearTimeout(copyFeedbackTimer);
    copyFeedbackTimer = null;
  }

  if (status === "idle") {
    return;
  }

  copyFeedbackTimer = window.setTimeout(() => {
    setCopyButtonState("idle", "Copy markdown");
  }, 1400);
}

async function copyMarkdown() {
  if (!state.markdown) {
    return;
  }

  try {
    await navigator.clipboard.writeText(state.markdown);
    setCopyButtonState("copied", "Copied markdown");
  } catch (error) {
    setCopyButtonState("failed", "Copy failed");
  }
}

async function loadMarkdown() {
  const response = await fetch("./ZAC_DUTHIE.md", { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Unable to load ZAC_DUTHIE.md (${response.status})`);
  }

  return response.text();
}

function bindEvents() {
  elements.themeSelect.addEventListener("change", (event) => {
    state.theme = resolveTheme(event.target.value);
    syncUi();
  });

  elements.viewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.view = resolveView(button.dataset.viewTarget);
      syncUi();
    });
  });

  elements.copyButton.addEventListener("click", () => {
    copyMarkdown();
  });

  window.addEventListener("popstate", () => {
    const params = new URLSearchParams(window.location.search);
    state.theme = resolveTheme(params.get("theme"));
    state.view = resolveView(params.get("view"));
    syncUi();
  });
}

async function init() {
  populateThemeSelect();
  bindEvents();
  syncUi();
  setCopyButtonState("idle", "Copy markdown");

  try {
    state.markdown = await loadMarkdown();
    renderMarkdown();
  } catch (error) {
    renderError(error.message);
  }
}

init();
