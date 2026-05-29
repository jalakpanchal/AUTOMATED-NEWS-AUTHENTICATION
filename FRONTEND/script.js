const API_BASE = "http://127.0.0.1:5000";

const getEl = (id) => document.getElementById(id);

const themeToggle = getEl("themeToggle");

const analyzeBtn = getEl("analyzeBtn");
const newsInput = getEl("newsInput");

const resultBox = getEl("resultBox");
const resultBadge = getEl("resultBadge");
const resultLabel = getEl("resultLabel");
const confidenceText = getEl("confidenceText");
const confidenceBar = getEl("confidenceBar");
const resultMessage = getEl("resultMessage");
const summaryText = getEl("summaryText");

const totalSearches = getEl("totalSearches");
const accuracyValue = getEl("accuracyValue");
const fakeDetected = getEl("fakeDetected");

const sideSearches = getEl("sideSearches");
const sideAccuracy = getEl("sideAccuracy");
const sideFakeDetected = getEl("sideFakeDetected");
const sideRealDetected = getEl("sideRealDetected");
const sideUncertainDetected = getEl("sideUncertainDetected");

const levelBadge = getEl("levelBadge");
const analystRank = getEl("analystRank");
const xpFill = getEl("xpFill");
const xpText = getEl("xpText");
const userXp = getEl("userXp");

const resetStatsBtn = getEl("resetStatsBtn");

const liveNewsQuery = getEl("liveNewsQuery");
const loadLiveNewsBtn = getEl("loadLiveNewsBtn");

const searchInput = getEl("searchInput");
const newsFeed = getEl("newsFeed");

const filterButtons = document.querySelectorAll(".filter-btn");
const categoryButtons = document.querySelectorAll(".category-btn");

let currentFilter = "all";
let currentCategory = "all";

let stats = JSON.parse(localStorage.getItem("truthlensStats")) || {
  searches: 0,
  fake: 0,
  real: 0,
  uncertain: 0,
  totalConfidence: 0,
  xp: 0,
  streakDays: []
};

let feedItems = [];

const demoNews = [
  {
    title: "Scientists confirm new deep-sea species found near Mariana Trench",
    category: "science",
    status: "real",
    confidence: 96,
    source: "Nature Journal",
    time: "2h ago",
    reads: "3.2k",
    description:
      "Marine biologists have catalogued a previously unknown species found at extreme ocean depths after months of validated field study.",
    trending: true,
    url: ""
  },
  {
    title: "5G towers are secretly controlling weather patterns",
    category: "tech",
    status: "fake",
    confidence: 89,
    source: "Unknown Blog",
    time: "4h ago",
    reads: "8.4k",
    description:
      "This claim mirrors previously debunked misinformation and lacks reliable scientific evidence or verified sources.",
    trending: true,
    url: ""
  },
  {
    title: "New bipartisan infrastructure bill passes Senate 78-22",
    category: "politics",
    status: "real",
    confidence: 95,
    source: "Reuters",
    time: "1h ago",
    reads: "5.8k",
    description:
      "The legislation allocates major funding toward road, bridge, broadband, and water infrastructure improvements.",
    trending: false,
    url: ""
  },
  {
    title: "Doctors discover one fruit that cures all diseases overnight",
    category: "health",
    status: "fake",
    confidence: 87,
    source: "Viral Post",
    time: "7h ago",
    reads: "7.1k",
    description:
      "The article uses exaggerated health claims and provides no clinical evidence, medical citation, or trusted source verification.",
    trending: false,
    url: ""
  }
];

feedItems = [...demoNews];


// ============================================================
// THEME
// ============================================================

themeToggle?.addEventListener("click", () => {
  document.body.classList.toggle("light");
});


// ============================================================
// STATS
// ============================================================

function saveStats() {
  localStorage.setItem("truthlensStats", JSON.stringify(stats));
}

function getAverageConfidence() {
  if (stats.searches <= 0) {
    return 0;
  }

  return Math.round(stats.totalConfidence / stats.searches);
}

function updateStatsUI() {
  const avgConfidence = getAverageConfidence();

  if (totalSearches) totalSearches.innerText = stats.searches;
  if (accuracyValue) accuracyValue.innerText = `${avgConfidence}%`;
  if (fakeDetected) fakeDetected.innerText = stats.fake;

  if (sideSearches) sideSearches.innerText = stats.searches;
  if (sideAccuracy) sideAccuracy.innerText = `${avgConfidence}%`;
  if (sideFakeDetected) sideFakeDetected.innerText = stats.fake;
  if (sideRealDetected) sideRealDetected.innerText = stats.real;
  if (sideUncertainDetected) sideUncertainDetected.innerText = stats.uncertain;

  const level = Math.floor(stats.xp / 1000) + 1;
  const currentLevelXp = stats.xp % 1000;
  const xpPercent = Math.min((currentLevelXp / 1000) * 100, 100);

  if (levelBadge) levelBadge.innerText = `LVL ${level}`;
  if (analystRank) analystRank.innerText = `Level ${level} Analyst`;
  if (xpFill) xpFill.style.width = `${xpPercent}%`;
  if (xpText) xpText.innerText = `${currentLevelXp}/1000 XP`;
  if (userXp) userXp.innerText = `${stats.xp.toLocaleString()} XP`;

  updateStreakUI();
  updateBadgesUI();
}

function updateStreakUI() {
  document.querySelectorAll(".streak-row span").forEach((span) => {
    const day = Number(span.dataset.day);
    span.classList.toggle("active-day", stats.streakDays.includes(day));
  });
}

function updateBadgesUI() {
  const badgeFirst = getEl("badgeFirst");
  const badgeTruth = getEl("badgeTruth");
  const badgeGuardian = getEl("badgeGuardian");
  const badgeExpert = getEl("badgeExpert");

  if (badgeFirst) badgeFirst.classList.toggle("locked", stats.searches < 1);
  if (badgeTruth) badgeTruth.classList.toggle("locked", stats.searches < 5);
  if (badgeGuardian) badgeGuardian.classList.toggle("locked", stats.fake < 3);
  if (badgeExpert) badgeExpert.classList.toggle("locked", stats.searches < 10);
}

function addNewSearchToStats(prediction, confidence) {
  const today = new Date().getDay();

  stats.searches += 1;
  stats.totalConfidence += Number(confidence) || 0;
  stats.xp += 100 + Math.round(Number(confidence) || 0);

  if (!stats.streakDays.includes(today)) {
    stats.streakDays.push(today);
  }

  if (prediction === "FAKE") {
    stats.fake += 1;
  } else if (prediction === "REAL") {
    stats.real += 1;
  } else if (prediction === "UNCERTAIN") {
    stats.uncertain += 1;
  }

  saveStats();
  updateStatsUI();
}

resetStatsBtn?.addEventListener("click", () => {
  stats = {
    searches: 0,
    fake: 0,
    real: 0,
    uncertain: 0,
    totalConfidence: 0,
    xp: 0,
    streakDays: []
  };

  saveStats();
  updateStatsUI();

  if (summaryText) {
    summaryText.innerText = "Stats reset successfully. Start analyzing again.";
  }
});


// ============================================================
// RESULT UI
// ============================================================

function showResult(label, confidence, message) {
  resultBox.classList.remove("hidden");

  resultLabel.classList.remove("result-real", "result-fake", "result-uncertain");
  confidenceBar.classList.remove("real", "fake", "uncertain");

  resultBadge.innerText = "Prediction Result";
  resultLabel.innerText = label;
  confidenceText.innerText = `${confidence}%`;
  confidenceBar.style.width = `${confidence}%`;
  resultMessage.innerText = message;

  if (label === "REAL") {
    resultLabel.classList.add("result-real");
    confidenceBar.classList.add("real");
  } else if (label === "FAKE") {
    resultLabel.classList.add("result-fake");
    confidenceBar.classList.add("fake");
  } else {
    resultLabel.classList.add("result-uncertain");
    confidenceBar.classList.add("uncertain");
  }
}

function updateSummary(prediction, confidence, sourceMode) {
  if (prediction === "REAL") {
    summaryText.innerText =
      `The app classified this news as REAL with ${confidence}% confidence. ${sourceMode}`;
  } else if (prediction === "FAKE") {
    summaryText.innerText =
      `The app classified this news as FAKE with ${confidence}% confidence. ${sourceMode}`;
  } else {
    summaryText.innerText =
      `The app is not fully confident. This news needs manual verification. ${sourceMode}`;
  }
}


// ============================================================
// SAFETY FIX
// Only very low confidence becomes uncertain.
// This avoids showing everything as uncertain.
// ============================================================

function applySafetyFix(prediction, confidence, message) {
  let finalPrediction = prediction;
  let finalMessage = message;

  if (confidence < 55) {
    finalPrediction = "UNCERTAIN";
    finalMessage =
      "The confidence is low. This news needs manual verification from trusted sources.";
  }

  return {
    prediction: finalPrediction,
    message: finalMessage
  };
}


// ============================================================
// ANALYZE NEWS
// ============================================================

async function analyzeNews(customText = "") {
  const text = customText.trim() || newsInput.value.trim();

  if (text === "") {
    showResult("EMPTY", 0, "Please enter a news headline or article text first.");
    return;
  }

  analyzeBtn.innerText = "Analyzing...";
  analyzeBtn.disabled = true;

  try {
    const response = await fetch(`${API_BASE}/predict`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text: text
      })
    });

    const data = await response.json();

    if (!response.ok || data.status === "failed") {
      throw new Error(data.error || "Prediction failed");
    }

    let prediction = data.prediction;
    const confidence = Number(data.confidence || 0);
    let message = data.message || "Analysis completed successfully.";
    const sourceMode = data.source_mode || "ML model used.";

    const fixedResult = applySafetyFix(prediction, confidence, message);
    prediction = fixedResult.prediction;
    message = fixedResult.message;

    if (newsInput) {
      newsInput.value = text;
    }

    showResult(prediction, confidence, message);
    updateSummary(prediction, confidence, sourceMode);
    addNewSearchToStats(prediction, confidence);

  } catch (error) {
    showResult(
      "ERROR",
      0,
      "Backend is not responding. First run Flask backend using: python app.py"
    );

    console.error(error);
  }

  analyzeBtn.innerText = "Analyze News";
  analyzeBtn.disabled = false;
}

analyzeBtn?.addEventListener("click", () => {
  analyzeNews();
});

newsInput?.addEventListener("keydown", (event) => {
  if (event.ctrlKey && event.key === "Enter") {
    analyzeNews();
  }
});


// ============================================================
// LIVE NEWS FEED
// ============================================================

function mapPredictionToStatus(prediction, confidence = 0) {
  if (confidence < 55) {
    return "uncertain";
  }

  if (prediction === "REAL") {
    return "real";
  }

  if (prediction === "FAKE") {
    return "fake";
  }

  return "uncertain";
}

function getStatusLabel(status) {
  if (status === "real") {
    return "✓ Verified";
  }

  if (status === "fake") {
    return "✕ Flagged";
  }

  return "! Uncertain";
}

function formatTime(value) {
  if (!value) {
    return "Recent";
  }

  try {
    const date = new Date(value);
    return date.toLocaleString();
  } catch {
    return "Recent";
  }
}

async function loadLiveNews() {
  loadLiveNewsBtn.innerText = "Loading...";
  loadLiveNewsBtn.disabled = true;

  try {
    const query = liveNewsQuery.value.trim();
    const params = new URLSearchParams();

    if (query) {
      params.append("q", query);
    }

    const response = await fetch(`${API_BASE}/news?${params.toString()}`);
    const data = await response.json();

    if (!response.ok || data.status === "failed") {
      throw new Error(data.message || data.error || "Unable to load live news.");
    }

    feedItems = data.articles.map((article) => {
      const confidence = Number(article.confidence || 0);

      return {
        title: article.title || "Untitled news",
        category: "world",
        status: mapPredictionToStatus(article.prediction, confidence),
        confidence: confidence,
        source: article.source || "Live Source",
        time: formatTime(article.published_at),
        reads: "Live",
        description: article.description || "No description available.",
        trending: true,
        url: article.url || ""
      };
    });

    renderNewsFeed();

  } catch (error) {
    newsFeed.innerHTML = `
      <div class="news-card uncertain">
        <div class="news-top">
          <span class="category-label">Live Feed</span>
          <span class="status-badge uncertain">! Error</span>
        </div>

        <h2>Live news could not be loaded</h2>

        <p>
          ${error.message}
          <br><br>
          Manual Analyze News button will still work.
        </p>
      </div>
    `;

    console.error(error);
  }

  loadLiveNewsBtn.innerText = "Load Live News";
  loadLiveNewsBtn.disabled = false;
}

loadLiveNewsBtn?.addEventListener("click", loadLiveNews);


// ============================================================
// RENDER NEWS CARDS
// ============================================================

function renderNewsFeed() {
  if (!newsFeed) return;

  let filteredNews = [...feedItems];

  if (currentFilter === "real") {
    filteredNews = filteredNews.filter((item) => item.status === "real");
  }

  if (currentFilter === "fake") {
    filteredNews = filteredNews.filter((item) => item.status === "fake");
  }

  if (currentFilter === "uncertain") {
    filteredNews = filteredNews.filter((item) => item.status === "uncertain");
  }

  if (currentFilter === "trending") {
    filteredNews = filteredNews.filter((item) => item.trending === true);
  }

  if (currentCategory !== "all") {
    filteredNews = filteredNews.filter((item) => item.category === currentCategory);
  }

  const searchValue = searchInput ? searchInput.value.toLowerCase().trim() : "";

  if (searchValue !== "") {
    filteredNews = filteredNews.filter((item) =>
      item.title.toLowerCase().includes(searchValue) ||
      item.description.toLowerCase().includes(searchValue) ||
      item.category.toLowerCase().includes(searchValue) ||
      item.source.toLowerCase().includes(searchValue)
    );
  }

  newsFeed.innerHTML = "";

  if (filteredNews.length === 0) {
    newsFeed.innerHTML = `
      <div class="news-card uncertain">
        <div class="news-top">
          <span class="category-label">No Results</span>
          <span class="status-badge uncertain">! Empty</span>
        </div>

        <h2>No news found</h2>

        <p>Try changing the filter, search keyword, or live news query.</p>
      </div>
    `;

    return;
  }

  filteredNews.forEach((item) => {
    const card = document.createElement("article");
    card.className = `news-card ${item.status}`;

    const fillClass = item.status;
    const statusLabel = getStatusLabel(item.status);

    card.innerHTML = `
      <div class="news-top">
        <span class="category-label">${item.category}</span>
        <span class="status-badge ${item.status}">
          ${statusLabel}
        </span>
      </div>

      <h2>${item.title}</h2>

      <div class="news-meta">
        <span>${item.source}</span>
        <span>${item.time}</span>
        <span>${item.reads}</span>
      </div>

      <p>${item.description}</p>

      <div class="confidence-row">
        <span>Confidence</span>
        <b>${item.confidence}%</b>
      </div>

      <div class="progress-track">
        <div class="progress-fill ${fillClass}" style="width: ${item.confidence}%;"></div>
      </div>

      <div class="card-actions"></div>
    `;

    const actionBox = card.querySelector(".card-actions");

    const analyzeCardBtn = document.createElement("button");
    analyzeCardBtn.innerText = "Analyze This";

    analyzeCardBtn.addEventListener("click", () => {
      const textToAnalyze = `${item.title}. ${item.description}`;

      newsInput.value = textToAnalyze;

      document.getElementById("analyze").scrollIntoView({
        behavior: "smooth"
      });

      setTimeout(() => {
        analyzeNews(textToAnalyze);
      }, 400);
    });

    actionBox.appendChild(analyzeCardBtn);

    if (item.url) {
      const openSourceBtn = document.createElement("button");
      openSourceBtn.innerText = "Open Source";

      openSourceBtn.addEventListener("click", () => {
        window.open(item.url, "_blank");
      });

      actionBox.appendChild(openSourceBtn);
    }

    newsFeed.appendChild(card);
  });
}


// ============================================================
// FILTER EVENTS
// ============================================================

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    filterButtons.forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");

    currentFilter = button.dataset.filter;

    renderNewsFeed();
  });
});

categoryButtons.forEach((button) => {
  button.addEventListener("click", () => {
    categoryButtons.forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");

    currentCategory = button.dataset.category;

    renderNewsFeed();
  });
});

searchInput?.addEventListener("input", renderNewsFeed);


// ============================================================
// INITIAL LOAD
// ============================================================

updateStatsUI();
renderNewsFeed();

const openLoginBtn = document.getElementById("openLoginBtn");
const openSignupBtn = document.getElementById("openSignupBtn");
const authModal = document.getElementById("authModal");
const closeAuthBtn = document.getElementById("closeAuthBtn");
const authTitle = document.getElementById("authTitle");
const authSubtitle = document.getElementById("authSubtitle");
const authForm = document.getElementById("authForm");
const authSubmitBtn = document.getElementById("authSubmitBtn");
const nameField = document.getElementById("nameField");
const authName = document.getElementById("authName");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const switchAuthBtn = document.getElementById("switchAuthBtn");
const authSwitchText = document.getElementById("authSwitchText");

let authMode = "login";

function openAuthModal(mode) {
  authMode = mode;
  authModal.classList.remove("hidden");

  if (mode === "login") {
    authTitle.innerText = "Login";
    authSubtitle.innerText = "Welcome back to TruthLens";
    authSubmitBtn.innerText = "Login";
    nameField.classList.add("hidden");
    authSwitchText.innerText = "Don't have an account?";
    switchAuthBtn.innerText = "Sign Up";
  } else {
    authTitle.innerText = "Create Account";
    authSubtitle.innerText = "Join TruthLens and start analyzing news";
    authSubmitBtn.innerText = "Sign Up";
    nameField.classList.remove("hidden");
    authSwitchText.innerText = "Already have an account?";
    switchAuthBtn.innerText = "Login";
  }
}

function closeAuthModal() {
  authModal.classList.add("hidden");
}

openLoginBtn?.addEventListener("click", () => {
  openAuthModal("login");
});

openSignupBtn?.addEventListener("click", () => {
  openAuthModal("signup");
});

closeAuthBtn?.addEventListener("click", closeAuthModal);

authModal?.addEventListener("click", (event) => {
  if (event.target === authModal) {
    closeAuthModal();
  }
});

switchAuthBtn?.addEventListener("click", () => {
  if (authMode === "login") {
    openAuthModal("signup");
  } else {
    openAuthModal("login");
  }
});

authForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  const email = authEmail.value.trim();
  const password = authPassword.value.trim();
  const name = authName.value.trim();

  if (!email || !password) {
    alert("Please enter email and password.");
    return;
  }

  if (authMode === "signup" && !name) {
    alert("Please enter your full name.");
    return;
  }

  const user = {
    name: name || email.split("@")[0],
    email: email
  };

  localStorage.setItem("truthlensUser", JSON.stringify(user));

  openLoginBtn.innerText = user.name;
  openSignupBtn.innerText = "Logout";

  closeAuthModal();

  alert(authMode === "login" ? "Login successful!" : "Account created successfully!");
});

openSignupBtn?.addEventListener("dblclick", () => {
  localStorage.removeItem("truthlensUser");
});

const savedUser = JSON.parse(localStorage.getItem("truthlensUser"));

if (savedUser) {
  openLoginBtn.innerText = savedUser.name;
  openSignupBtn.innerText = "Logout";
}

openSignupBtn?.addEventListener("click", () => {
  const savedUserNow = JSON.parse(localStorage.getItem("truthlensUser"));

  if (savedUserNow && openSignupBtn.innerText === "Logout") {
    localStorage.removeItem("truthlensUser");
    openLoginBtn.innerText = "Login";
    openSignupBtn.innerText = "Sign Up";
    alert("Logged out successfully.");
  }
});
