(function () {
  console.log("FitRank Initialization Started...");
  var API = defaultApiBase();
  console.log("API Base Resolved To: " + API);
  var STORAGE = {
    user: "fitrank-user",
    admin: "fitrank-admin",
    users: "fitrank-users",
    passwords: "fitrank-passwords",
    workouts: "fitrank-workouts",
    weight: "fitrank-weight",
    meals: "fitrank-meals",
    health: "fitrank-health",
    routines: "fitrank-routines",
    integrations: "fitrank-integrations",
    prefs: "fitrank-prefs",
    profile: "fitrank-profile"
  };

  var MEMBER_PAGES = ["dashboard", "workouts", "routines", "progress", "analytics", "nutrition", "integrations", "profile", "settings", "pro"];
  var ADMIN_PAGES = ["admin"];
  var PREMIUM_PAGES = ["analytics"];
  var PREMIUM_EXPORT_ACTIONS = ["export-data"];
  var EXERCISE_LIBRARY = buildExerciseLibrary();

  var state = {
    authMode: "login",
    showPassword: false,
    rememberMe: true,
    authError: "",
    authInfo: "",
    toast: "",
    page: location.hash.replace("#", "") || "login",
    search: "",
    user: load(STORAGE.user, null),
    admin: load(STORAGE.admin, null),
    users: load(STORAGE.users, []),
    passwords: load(STORAGE.passwords, {
      "athlete@fitrank.app": "password"
    }),
    workouts: [],
    weightLogs: [],
    meals: [],
    healthData: {
      source: "",
      steps: 0,
      activeCalories: 0,
      heartRate: 0,
      recovery: 0,
      importedAt: null
    },
    routines: [],
    integrations: {},
    preferences: {},
    profile: {},
    pendingMeal: { name: "", calories: "", protein: "", water: "" },
    pendingWeight: "",
    pendingReset: { email: "", password: "", confirm: "", token: "" },
    selectedExercise: "All",
    dateRange: "30d",
    importPreview: [],
    liveWorkout: loadLiveWorkout(),
    healthImportDetails: [],
    modal: null
  };

  loadUserData(state.user ? state.user.id : null);

  function loadUserData(userId) {
    if (!userId) {
      state.workouts = [];
      state.weightLogs = [];
      state.meals = [];
      state.healthData = { source: "", steps: 0, activeCalories: 0, heartRate: 0, recovery: 0, importedAt: null };
      state.routines = [
        { id: uid(), name: "Push Day", days: "Mon / Thu", focus: "Chest, Shoulders, Triceps" },
        { id: uid(), name: "Pull Day", days: "Tue / Fri", focus: "Back, Rear Delts, Biceps" },
        { id: uid(), name: "Legs", days: "Wed", focus: "Quads, Glutes, Hamstrings" },
        { id: uid(), name: "Upper Lower", days: "Sat", focus: "Balanced hypertrophy" },
        { id: uid(), name: "Full Body", days: "Sun", focus: "General fitness" }
      ];
      state.integrations = {
        appleHealth: { connected: false, autoSync: false, lastSync: null, method: "file_import" },
        appleWatch: { connected: false, autoSync: false, lastSync: null, method: "file_import" },
        hevyImport: { connected: false, autoSync: true, lastSync: null, method: "file_import" }
      };
      state.preferences = { units: "kg", distance: "km", restTimer: 90, autoComplete: false, smartSuggestions: true, compactMode: false, accent: "blue-purple", syncFrequency: "Hourly" };
      state.profile = { fullName: "Athlete", bio: "Training for strength and longevity.", avatar: "FR", joinDate: new Date().toISOString() };
      state.healthImportDetails = [];
      return;
    }

    // Load ONLY from user-namespaced keys - never fall back to shared keys (prevents cross-user data leaks)
    var defaultHealth = { source: "", steps: 0, activeCalories: 0, heartRate: 0, recovery: 0, importedAt: null };
    var defaultRoutines = [
      { id: uid(), name: "Push Day", days: "Mon / Thu", focus: "Chest, Shoulders, Triceps" },
      { id: uid(), name: "Pull Day", days: "Tue / Fri", focus: "Back, Rear Delts, Biceps" },
      { id: uid(), name: "Legs", days: "Wed", focus: "Quads, Glutes, Hamstrings" },
      { id: uid(), name: "Upper Lower", days: "Sat", focus: "Balanced hypertrophy" },
      { id: uid(), name: "Full Body", days: "Sun", focus: "General fitness" }
    ];
    var defaultIntegrations = {
      appleHealth: { connected: false, autoSync: false, lastSync: null, method: "file_import" },
      appleWatch: { connected: false, autoSync: false, lastSync: null, method: "file_import" },
      hevyImport: { connected: false, autoSync: true, lastSync: null, method: "file_import" }
    };
    var defaultPrefs = { units: "kg", distance: "km", restTimer: 90, autoComplete: false, smartSuggestions: true, compactMode: false, accent: "blue-purple", syncFrequency: "Hourly" };

    state.workouts = load(STORAGE.workouts + "-" + userId, []);
    state.weightLogs = load(STORAGE.weight + "-" + userId, []);
    state.meals = load(STORAGE.meals + "-" + userId, []);
    state.healthData = load(STORAGE.health + "-" + userId, defaultHealth);
    state.routines = load(STORAGE.routines + "-" + userId, defaultRoutines);
    state.integrations = load(STORAGE.integrations + "-" + userId, defaultIntegrations);
    state.preferences = load(STORAGE.prefs + "-" + userId, defaultPrefs);
    
    var defaultProfile = { fullName: state.user.name, bio: "Training for strength and longevity.", avatar: "FR", joinDate: new Date().toISOString() };
    state.profile = load(STORAGE.profile + "-" + userId, load(STORAGE.profile, defaultProfile));
    
    state.healthImportDetails = load("fitrank-health-import-details-" + userId, load("fitrank-health-import-details", []));

    if (state.workouts.length === 0 && state.weightLogs.length === 0) {
      if (state.user && state.user.email === "admin@fitrank.app") {
        loadSeedIfNeeded(userId);
      }
    }
  }

  function loadSeedIfNeeded(userId) {
    if (localStorage.getItem("seed-loaded-v4-" + userId)) return;
    fetch("seed.json").then(function(res) {
      if (!res.ok) throw new Error();
      return res.json();
    }).then(function(data) {
      state.workouts = data.workouts || [];
      state.healthData = data.healthData || state.healthData;
      state.weightLogs = data.weightLogs || [];
      state.integrations = data.integrations || state.integrations;
      localStorage.setItem("seed-loaded-v4-" + userId, "true");
      persistAll();
      render();
    }).catch(function() {
      localStorage.setItem("seed-loaded-v4-" + userId, "true");
    });
  }

  if (!state.users.length) {
    state.users = [
      { id: 1, name: "Arjun Nair", email: "athlete@fitrank.app", goal: "Strength", plan: "FREE", role: "USER", createdAt: "2026-04-01T09:00:00.000Z" },
      { id: 999, name: "FitRank Admin", email: "admin@fitrank.app", goal: "Administration", plan: "ADMIN", role: "ADMIN", createdAt: "2026-04-01T09:00:00.000Z" }
    ];
  }

  hydrateResetContextFromUrl();

  window.addEventListener("hashchange", function () {
    state.page = location.hash.replace("#", "") || (state.user ? (state.admin ? "admin" : "dashboard") : "login");
    if (state.page === "signup" || state.page === "login") {
      state.authMode = state.page;
    }
    render();
  });

  setInterval(function () {
    if (state.user && state.page === "workouts") {
      var timerNode = document.getElementById("workout-timer-display");
      if (timerNode) {
        timerNode.innerText = workoutTimer();
      }
    }
  }, 1000);

  document.addEventListener("click", handleClick);
  document.addEventListener("submit", handleSubmit);
  document.addEventListener("input", handleInput);
  document.addEventListener("change", handleChange);

  render();

  function defaultApiBase() {
    var isLocal = location.hostname === "localhost" || location.hostname === "127.0.0.1";
    if (location.protocol === "file:") return "http://localhost:8080/api";
    return isLocal ? "http://localhost:8080/api" : location.origin + "/api";
  }

  function load(key, fallback) {
    try {
      var value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function uid() {
    return Math.random().toString(36).slice(2, 10);
  }

  function loadLiveWorkout() {
    return {
      name: "New Workout",
      startedAt: Date.now(),
      heartRate: 0,
      notes: "",
      exercises: []
    };
  }

  function setPage(page) {
    location.hash = page;
    state.page = page;
  }

  function toast(message) {
    state.toast = message;
    render();
    setTimeout(function () {
      if (state.toast === message) {
        state.toast = "";
        render();
      }
    }, 2600);
  }

  function persistAll() {
    save(STORAGE.user, state.user);
    save(STORAGE.admin, state.admin);
    save(STORAGE.users, state.users);
    save(STORAGE.passwords, state.passwords);
    
    if (state.user) {
      save(STORAGE.workouts + "-" + state.user.id, state.workouts);
      save(STORAGE.weight + "-" + state.user.id, state.weightLogs);
      save(STORAGE.meals + "-" + state.user.id, state.meals);
      save(STORAGE.health + "-" + state.user.id, state.healthData);
      save(STORAGE.routines + "-" + state.user.id, state.routines);
      save(STORAGE.integrations + "-" + state.user.id, state.integrations);
      save(STORAGE.prefs + "-" + state.user.id, state.preferences);
      save(STORAGE.profile + "-" + state.user.id, state.profile);
      save("fitrank-health-import-details-" + state.user.id, state.healthImportDetails);
    }
  }

  function hydrateResetContextFromUrl() {
    try {
      var params = new URLSearchParams(location.search);
      var resetToken = params.get("resetToken");
      var email = params.get("email");
      if (resetToken && email) {
        state.authMode = "reset";
        state.pendingReset.email = decodeURIComponent(email);
        state.pendingReset.token = resetToken;
        state.page = "login";
      }
    } catch (error) {
      // Ignore malformed reset params and keep the normal login flow.
    }
  }

  function allowedPages() {
    return state.admin ? ADMIN_PAGES : MEMBER_PAGES;
  }

  function ensureRouteAccess() {
    if (state.user) {
      for (var i = 0; i < state.users.length; i += 1) {
        if (state.users[i].email === state.user.email) {
          state.user.plan = state.users[i].plan;
          break;
        }
      }
    }

    if (!state.user && state.page !== "login" && state.page !== "signup") {
      state.page = "login";
      location.hash = "login";
      return;
    }

    if (!state.user) return;

    if (state.admin && MEMBER_PAGES.indexOf(state.page) > -1 && ADMIN_PAGES.indexOf(state.page) === -1) {
      state.page = "admin";
      location.hash = "admin";
      return;
    }

    if (!state.admin && state.page === "admin") {
      state.page = "dashboard";
      location.hash = "dashboard";
      return;
    }

    if (allowedPages().indexOf(state.page) === -1) {
      state.page = state.admin ? "admin" : "dashboard";
      location.hash = state.page;
    }
  }

  function isAdminUser() {
    return !!state.admin;
  }

  function render() {
    persistAll();
    ensureRouteAccess();
    document.body.classList.toggle("unauthenticated", !state.user);
    document.getElementById("app").innerHTML =
      '<div class="page">' +
        blobs() +
        (!state.user ? renderAuth() : renderApp()) +
        renderModal() +
        (state.toast ? '<div class="toast">' + escapeHtml(state.toast) + '</div>' : "") +
      "</div>";
  }

  function blobs() {
    return '<div class="blob one"></div><div class="blob two"></div><div class="blob three"></div>';
  }

  function renderAuth() {
    return '' +
      '<div class="auth-shell">' +
        '<div class="auth-layout">' +
          '<section class="glass-strong hero-card">' +
            '<div class="brand"><img src="assets/icon.svg" alt="FitRank"><div><strong>FitRank</strong><p>Premium fitness tracking for web</p></div></div>' +
            '<div>' +
              '<p class="eyebrow">Web-first training OS</p>' +
              '<h1><span class="gradient-text">Premium</span> workout tracking designed to actually work.</h1>' +
              '<p>Responsive dashboard, seamless integrations, live logging, routines, nutrition, imports, premium coaching tools, and real local account management.</p>' +
              '<div class="pill-row">' +
                '<span>Apple Health import</span>' +
                '<span>Hevy import</span>' +
                '<span>Real progress charts</span>' +
                '<span>Premium form demos</span>' +
              '</div>' +
            '</div>' +
          '</section>' +
          '<section class="glass auth-card">' + renderMemberCard() + '</section>' +
        '</div>' +
      '</div>';
  }

  function renderMemberCard() {
    var signup = state.authMode === "signup";
    if (state.authMode === "reset") {
      return '' +
        '<div class="brand"><img src="assets/icon.svg" alt="FitRank"><div><strong>Reset Password</strong><p>Create a new password for your account</p></div></div>' +
        '<div style="height:16px"></div>' +
        '<form class="auth-form" data-form="reset">' +
          field('Email', '<input type="email" name="email" value="' + escapeAttr(state.pendingReset.email) + '" required>') +
          field('Reset Token', '<input name="token" value="' + escapeAttr(state.pendingReset.token) + '" required>') +
          field('New Password', '<input type="password" name="password" required>') +
          field('Confirm Password', '<input type="password" name="confirmPassword" required>') +
          (state.authInfo ? '<div class="success-banner">' + escapeHtml(state.authInfo) + '</div>' : "") +
          (state.authError ? '<div class="auth-error">' + escapeHtml(state.authError) + "</div>" : "") +
          '<button class="btn" type="submit">Reset Password</button>' +
        "</form>" +
        '<div style="height:16px"></div>' +
        '<p class="auth-toggle"><button type="button" data-action="back-to-login">Back to login</button></p>';
    }
    return '' +
      '<div class="brand"><img src="assets/icon.svg" alt="FitRank"><div><strong>FitRank Access</strong><p>' + (signup ? "Create your account" : "Welcome back") + '</p></div></div>' +
      '<div style="height:16px"></div>' +
      '<form class="auth-form" data-form="member">' +
        (signup ? field('Full Name', '<input name="fullName" placeholder="Arjun Nair" required>') : "") +
        field('Email', '<input type="email" name="email" value="athlete@fitrank.app" required>') +
        field('Password', '<input type="' + (state.showPassword ? "text" : "password") + '" name="password" value="password" required><button type="button" data-action="toggle-password">' + (state.showPassword ? "Hide" : "Show") + "</button>") +
        (signup ? field('Confirm Password', '<input type="password" name="confirmPassword" required>') : "") +
        (signup ? field('Fitness Goal', '<select name="goal"><option>Lose Weight</option><option>Gain Muscle</option><option selected>Strength</option><option>General Fitness</option></select>') : "") +
        (!signup ? '<div class="helper-row"><label class="checkbox"><input type="checkbox" ' + (state.rememberMe ? "checked" : "") + ' data-action="remember-me"> Remember Me</label><button type="button" class="btn-ghost" data-action="forgot">Forgot Password</button></div>' : "") +
        (state.authInfo ? '<div class="success-banner">' + escapeHtml(state.authInfo) + '</div>' : "") +
        (state.authError ? '<div class="auth-error">' + escapeHtml(state.authError) + "</div>" : "") +
        '<button class="btn" type="submit">' + (signup ? "Create Account" : "Login") + "</button>" +
      "</form>" +
      '<div style="height:16px"></div>' +
      '<p>Admin access uses the same login form. Use the admin credentials here to unlock admin controls.</p>' +
      '<p class="auth-toggle">' + (signup ? "Already have an account?" : "Don&apos;t have an account?") + ' <button type="button" data-action="toggle-auth">' + (signup ? "Login" : "Sign Up") + "</button></p>";
  }

  function renderApp() {
    return '' +
      '<div class="app-shell">' +
        '<div class="layout">' +
          renderSidebar() +
          '<main class="main">' +
            renderTopbar() +
            '<section class="content">' + renderPage() + "</section>" +
          "</main>" +
        "</div>" +
        renderMobileNav() +
      "</div>";
  }

  function renderSidebar() {
    var items = state.admin ? [
      ["admin", "Admin Dashboard"]
    ] : [
      ["dashboard", "Dashboard"],
      ["workouts", "Workouts"],
      ["routines", "Routines"],
      ["progress", "Progress"],
      ["analytics", "Analytics"],
      ["nutrition", "Nutrition"],
      ["integrations", "Integrations"],
      ["profile", "Profile"],
      ["settings", "Settings"],
      ["pro", "Premium"]
    ];

    return '' +
      '<aside class="sidebar">' +
        '<div class="glass sidebar-inner">' +
          '<div class="brand"><img src="assets/icon.svg" alt="FitRank"><div><strong>FitRank</strong><p>Premium workout OS</p></div></div>' +
          '<div style="height:22px"></div>' +
          '<div class="nav-list">' +
            items.map(function (item) {
              return '<button class="nav-item ' + (state.page === item[0] ? "active" : "") + '" data-nav="' + item[0] + '">' + item[1] + "<span>&rsaquo;</span></button>";
            }).join("") +
          "</div>" +
        "</div>" +
      "</aside>";
  }

  function renderTopbar() {
    return '' +
      '<div class="glass topbar">' +
        '<div class="topbar-inner">' +
          '<div class="field-shell search-shell"><input value="' + escapeAttr(state.search) + '" placeholder="Search exercises, routines, history..." data-input="search"></div>' +
          '<div class="topbar-right">' +
            (!state.admin ? '<button class="btn" data-nav="workouts">Quick Start Workout</button>' : "") +
            '<div class="user-chip"><div class="avatar">' + escapeHtml((state.user.name || "FR").slice(0, 2).toUpperCase()) + "</div><div><strong>" + escapeHtml(state.user.name) + "</strong><p>" + escapeHtml(state.user.email) + '</p></div><button class="btn-ghost" data-action="logout">Log out</button></div>' +
          "</div>" +
        "</div>" +
      "</div>";
  }

  function renderPage() {
    switch (state.page) {
      case "dashboard": return renderDashboard();
      case "workouts": return renderWorkouts();
      case "routines": return renderRoutines();
      case "progress": return renderProgress();
      case "analytics": return renderAnalytics();
      case "nutrition": return renderNutrition();
      case "integrations": return renderIntegrations();
      case "profile": return renderProfile();
      case "settings": return renderSettings();
      case "pro": return renderPro();
      case "admin": return renderAdmin();
      default: return state.admin ? renderAdmin() : renderDashboard();
    }
  }

  function renderDashboard() {
    var stats = dashboardStats();
    return '' +
      '<div class="cards-two">' +
        '<section class="glass-strong panel hero-panel">' +
          '<div><p class="eyebrow">Dashboard</p><h2>Welcome back, ' + escapeHtml(state.user.name) + '.</h2><p>Your training hub combines workouts, recovery, nutrition, imports, and progress built from your actual saved data.</p></div>' +
          '<div class="quick-actions">' +
            button("Start Workout", "workouts", true) +
            button("Continue Routine", "routines", false) +
            button("Log Weight", "progress", false) +
            button("Nutrition", "nutrition", false) +
          "</div>" +
        "</section>" +
        '<section class="glass panel"><p class="eyebrow">Import Snapshot</p><div class="cards-two">' +
          metric("Imported steps", number(state.healthData.steps)) +
          metric("Workout history", String(state.workouts.length)) +
          metric("Meal logs", String(state.meals.length)) +
          metric("Weight logs", String(state.weightLogs.length)) +
          '</div><div style="height:16px"></div><div class="mini-card"><strong>' + escapeHtml(stats.quote) + '</strong><p>Motivational quote</p></div></section>' +
      "</div>" +
      '<div class="stats-four">' +
        stat("Workout streak", stats.streak + " days", "Based on real saved workouts") +
        stat("Weekly calories burned", number(stats.weeklyCalories), "From workout history") +
        stat("Goal progress", stats.goalProgress + "%", stats.goalHelper) +
        stat("Nutrition progress", mealProgress() + "%", "From meal logging") +
      "</div>" +
      '<div class="cards-two">' +
        '<section class="glass panel"><h3>Goal Progress Rings</h3><div class="ring-grid">' +
          ring("Workouts", stats.goalProgress) +
          ring("Recovery", number(stats.recoveryProgress)) +
          ring("Nutrition", mealProgress()) +
        '</div></section>' +
        '<section class="glass panel"><h3>Recent Workouts</h3>' +
          (recentWorkouts().length
            ? recentWorkouts().map(function (workout) {
                return '<div class="mini-card"><strong>' + escapeHtml(workout.title) + '</strong><p>' + formatDateTime(workout.createdAt) + ' | ' + workout.durationMinutes + ' min | ' + number(workout.volume) + ' kg</p></div>';
              }).join('')
            : '<p>No workouts yet. Start a session to populate your dashboard.</p>') +
        '</section>' +
      '</div>';
  }

  function renderWorkouts() {
    return '' +
      '<div class="page-head">' +
        '<div><p class="eyebrow">Live Workout Tracker</p><h2>' + escapeHtml(state.liveWorkout.name) + '</h2><p>Start blank, choose exercises from the library, and log only what you actually perform.</p></div>' +
        '<div class="button-row">' +
          '<div class="mini-card"><strong id="workout-timer-display">' + workoutTimer() + '</strong><p>Running Timer</p></div>' +
          '<div class="mini-card"><strong>' + String(state.liveWorkout.exercises.length) + '</strong><p>Exercises Added</p></div>' +
          '<button class="btn" data-action="finish-workout">Finish Workout</button>' +
        "</div>" +
      "</div>" +
      (state.liveWorkout.exercises.length
        ? state.liveWorkout.exercises.map(renderExerciseCard).join("")
        : '<section class="glass panel empty-state"><h3>Blank workout ready</h3><p>No exercises have been added yet. Choose from the exercise library to start this session.</p><div class="button-row"><button class="btn" data-action="add-exercise">Choose Exercise</button></div></section>') +
      '<button class="floating-add" data-action="add-exercise">+ Add Exercise</button>';
  }

  function renderExerciseCard(exercise) {
    return '' +
      '<section class="glass panel">' +
        '<div class="page-head">' +
          '<div><h3>' + escapeHtml(exercise.name) + '</h3><p>Replace, reorder, add notes, delete, and auto-complete sets.</p></div>' +
          '<div class="button-row">' +
            '<button class="btn-secondary" data-action="move-up" data-exercise="' + exercise.id + '">Move Up</button>' +
            '<button class="btn-secondary" data-action="move-down" data-exercise="' + exercise.id + '">Move Down</button>' +
            '<button class="btn-secondary" data-action="delete-exercise" data-exercise="' + exercise.id + '">Delete</button>' +
          "</div>" +
        "</div>" +
        '<div class="table-card">' +
          '<table class="table">' +
            "<thead><tr><th>Set</th><th>Previous</th><th>Weight</th><th>Reps</th><th>Done</th></tr></thead>" +
            "<tbody>" +
              exercise.sets.map(function (set, index) {
                return "<tr>" +
                  "<td>" + (index + 1) + "</td>" +
                  "<td>" + escapeHtml(set.previous) + "</td>" +
                  '<td><input value="' + escapeAttr(set.weight) + '" data-input="set-weight" data-exercise="' + exercise.id + '" data-set="' + set.id + '"></td>' +
                  '<td><input value="' + escapeAttr(set.reps) + '" data-input="set-reps" data-exercise="' + exercise.id + '" data-set="' + set.id + '"></td>' +
                  '<td><button class="done-pill ' + (set.done ? "active" : "") + '" data-action="toggle-set" data-exercise="' + exercise.id + '" data-set="' + set.id + '">' + (set.done ? "Done" : "Mark") + "</button></td>" +
                "</tr>";
              }).join("") +
            "</tbody>" +
          "</table>" +
        "</div>" +
        '<div class="button-row">' +
          '<button class="btn-secondary" data-action="add-set" data-exercise="' + exercise.id + '">Add Set</button>' +
          '<button class="btn-secondary" data-action="replace-exercise" data-exercise="' + exercise.id + '">Replace Exercise</button>' +
          '<button class="btn-secondary" data-action="show-form" data-exercise="' + exercise.id + '">Show Form</button>' +
          '<button class="btn-secondary" data-action="exercise-notes" data-exercise="' + exercise.id + '">Notes</button>' +
          '<button class="btn-secondary" data-action="rest-timer">Rest Timer</button>' +
        "</div>" +
      "</section>";
  }

  function renderRoutines() {
    return '' +
      '<div class="page-head"><div><p class="eyebrow">Routines</p><h2>Saved Templates</h2></div><button class="btn" data-action="create-routine">Create Routine</button></div>' +
      '<div class="routine-grid cards-two">' +
        state.routines.map(function (routine) {
          var exCount = (routine.exercises && routine.exercises.length) || 0;
          return '<div class="glass panel routine-card"><h3>' + escapeHtml(routine.name) + '</h3><p>' + escapeHtml(routine.focus) + '</p><p>' + escapeHtml(routine.days) + (exCount ? ' | ' + exCount + ' exercises' : '') + '</p><div class="button-row"><button class="btn" data-action="start-routine" data-routine="' + routine.id + '">Start</button><button class="btn-secondary" data-action="edit-routine" data-routine="' + routine.id + '">Edit</button><button class="btn-secondary" data-action="duplicate-routine" data-routine="' + routine.id + '">Duplicate</button><button class="btn-secondary" data-action="delete-routine" data-routine="' + routine.id + '">Delete</button></div></div>';
        }).join("") +
      '</div>';
  }

  function renderProgress() {
    var analytics = buildAnalytics();
    var prCards = analytics.prs.map(function (item) {
      return '<div class="mini-card"><strong>' + escapeHtml(item.label) + '</strong><p>' + escapeHtml(item.value) + '</p></div>';
    }).join("");
    var heatCards = analytics.heat.map(function (item) {
      return '<div class="heat-cell" style="background:rgba(79,124,255,' + (0.12 + item.count * 0.08) + ')"><strong>' + escapeHtml(item.group) + '</strong><p>' + item.count + ' sessions</p></div>';
    }).join("");

    return '' +
      '<div class="page-head">' +
        '<div><p class="eyebrow">Progress & Analytics</p><h2>Your training history visualised</h2></div>' +
        '<div class="button-row">' +
          select('range-filter', state.dateRange, ['3d', '7d', '1m', '1y']) +
          select('exercise-filter', state.selectedExercise, exerciseOptions()) +
          '<button class="btn-secondary" data-action="export-data">Export Data</button>' +
        '</div>' +
      '</div>' +
      '<div class="cards-two">' +
        chartCard('Monthly Volume (kg)', renderBars(analytics.monthlyVolume)) +
        chartCard('Sessions per Month', renderBars(analytics.monthlySessions)) +
        chartCard('Strength: ' + analytics.topExercise, renderLineChart(analytics.strength)) +
        chartCard('Body Weight (kg)', renderLineChart(analytics.bodyWeight)) +
        chartCard('Workout Consistency (days)', renderLineChart(analytics.consistency)) +
        chartCard('Muscle Group Frequency', '<div class="heatmap" style="margin-top:4px;">' + heatCards + '</div>') +
      '</div>' +
      '<div class="cards-three">' +
        '<section class="glass panel"><h3>PR Tracker</h3>' + prCards + '</section>' +
        '<section class="glass panel"><h3>All-time Stats</h3>' +
          '<div class="stats-four">' +
            stat('Total Workouts', String(state.workouts.length), 'Logged') +
            stat('Total Volume', number(analytics.totalVolume) + ' kg', 'All time') +
            stat('Best Month', analytics.bestMonth, 'By volume') +
            stat('Avg Session', number(Math.round(analytics.averageVolume)) + ' kg', 'Per workout') +
          '</div>' +
        '</section>' +
        '<section class="glass panel"><h3>Log Body Weight</h3>' +
          field('Weight (kg)', '<input data-input="weight-log" value="' + escapeAttr(state.pendingWeight) + '" placeholder="e.g. 72.5">') +
          '<div class="button-row"><button class="btn" data-action="save-weight">Save Weight</button></div>' +
          '<div style="height:12px"></div>' +
          '<div class="mini-card"><strong>' + analytics.recoveryScore + '%</strong><p>Recovery score from imported heart-rate data.</p></div>' +
        '</section>' +
      '</div>';
  }

  function renderAnalytics() {
    var premium = isPremiumUser();
    var analytics = buildAnalytics();
    if (!premium) {
      return '' +
        '<div class="cards-two">' +
          '<section class="glass panel"><p class="eyebrow">Premium Analytics</p><h2>Premium required</h2><p>Free members can use Progress charts. Premium unlocks recovery summaries, 1RM tracking, goal forecasting, AI coaching insights, and exports. Ask an admin to upgrade your account.</p>' +
          '<div class="button-row" style="margin-top:16px"><button class="btn" data-nav="pro">View Premium Features</button></div></section>' +
          '<section class="glass panel"><h3>Available on Free</h3><div class="pill-row"><span>Workout logging</span><span>Routine library</span><span>Progress charts</span><span>Nutrition logging</span><span>Hevy import</span><span>Apple Health import</span></div></section>' +
        '</div>';
    }

    var oneRM = computeBest1RM();
    var forecast = computeGoalForecast();
    var heatCards = analytics.heat.map(function (item) {
      var intensity = Math.min(1, 0.15 + item.count * 0.12);
      return '<div class="heat-cell" style="background:rgba(138,92,255,' + intensity + ')"><strong>' + escapeHtml(item.group) + '</strong><p>' + item.count + ' sets</p></div>';
    }).join('');

    return '' +
      '<div class="cards-three">' +
        '<section class="glass panel"><h3>Advanced Analytics</h3>' +
          metric('Recovery score', analytics.recoveryScore + '%') +
          metric('Resting HR', (analytics.restingHeartRate || '--') + ' bpm') +
          metric('Average volume / session', number(Math.round(analytics.averageVolume)) + ' kg') +
          metric('Total workouts in range', String(analytics.workoutCount)) +
        '</section>' +
        '<section class="glass panel"><h3>AI Coaching Insight</h3><p>' + escapeHtml(trainingInsight(analytics)) + '</p>' +
          '<div style="height:12px"></div>' +
          (analytics.averageVolume > 0 ? '<div class="mini-card"><strong>Volume trend</strong><p>' + (analytics.averageVolume > 3000 ? 'Strong volume. Consider deload after 3 more sessions.' : 'Volume is moderate. Add one set per exercise to progress.') + '</p></div>' : '') +
          '<div class="pill-row" style="margin-top:12px"><span>' + analytics.workoutCount + ' sessions logged</span><span>' + (analytics.importedHealth ? 'Health data active' : 'Import Apple Health for deeper insights') + '</span></div>' +
        '</section>' +
        '<section class="glass panel"><h3>Goal Pace Forecast &#x1F3AF;</h3>' +
          '<div class="mini-card"><strong>' + forecast.label + '</strong><p>' + forecast.detail + '</p></div>' +
          '<div style="height:10px"></div>' +
          '<div class="mini-card"><strong>Current pace</strong><p>' + forecast.pace + ' workouts/week on average</p></div>' +
        '</section>' +
      '</div>' +
      '<div class="cards-two">' +
        '<section class="glass panel"><h3>Estimated 1RM Tracker ðŸ‹ï¸</h3>' +
          (oneRM.length ? oneRM.map(function (item) {
            return '<div class="mini-card"><strong>' + escapeHtml(item.exercise) + '</strong><p>Best set: ' + item.weight + ' kg Ã— ' + item.reps + ' reps â†’ Estimated 1RM: <strong>' + item.oneRM + ' kg</strong></p></div>';
          }).join('') : '<p>Log sets with weight and reps to see 1RM estimates.</p>') +
        '</section>' +
        '<section class="glass panel"><h3>Muscle Group Heatmap &#x1F525;</h3>' +
          '<div class="heatmap">' + heatCards + '</div>' +
          '<div style="height:12px"></div>' +
          '<p style="font-size:13px;color:var(--muted)">Based on ' + analytics.workoutCount + ' logged sessions. Darker = more volume.</p>' +
        '</section>' +
      '</div>';
  }

  function renderNutrition() {
    var summary = nutritionSummary();
    return '' +
      '<div class="cards-three">' +
        '<section class="glass panel"><h3>Nutrition Dashboard</h3><div class="stats-four">' +
          stat("Calories", number(summary.calories), "Logged today") +
          stat("Protein", number(summary.protein) + "g", "Meal logging") +
          stat("Water", number(summary.water) + "L", "Hydration") +
          stat("Meals", String(summary.meals), "Saved entries") +
        "</div></section>" +
        '<section class="glass panel"><h3>Log Meal</h3>' +
          field("Food Eaten", '<input data-input="meal-name" value="' + escapeAttr(state.pendingMeal.name) + '" placeholder="Chicken rice bowl">') +
          field("Calories", '<input data-input="meal-calories" value="' + escapeAttr(state.pendingMeal.calories) + '" placeholder="650">') +
          field("Protein (g)", '<input data-input="meal-protein" value="' + escapeAttr(state.pendingMeal.protein) + '" placeholder="42">') +
          field("Water (L)", '<input data-input="meal-water" value="' + escapeAttr(state.pendingMeal.water) + '" placeholder="0.7">') +
          '<div class="button-row"><button class="btn" data-action="save-meal">Save Meal</button></div>' +
        "</section>" +
        '<section class="glass panel"><h3>Meal History</h3>' +
          (state.meals.length
            ? state.meals.slice(0, 8).map(function (meal) {
                return '<div class="mini-card"><strong>' + escapeHtml(meal.name) + "</strong><p>" + number(meal.calories) + " kcal - " + number(meal.protein) + "g protein - " + number(meal.water) + "L water</p></div>";
              }).join("")
            : "<p>No meals logged yet.</p>") +
        "</section>" +
      "</div>";
  }

  function renderIntegrations() {
    var premium = isPremiumUser();
    var hasHealth = state.integrations.appleHealth.connected && state.healthData.importedAt;
    return '' +
      '<div class="page-head"><div><p class="eyebrow">Integrations</p><h2>Apple Health, Apple Watch, and Hevy import</h2><p>FitRank only shows data that was actually imported or entered in the app.</p></div></div>' +
      '<div class="cards-two">' +
        '<section class="glass panel integration-card"><h3>Apple Health</h3><p>' +
          (hasHealth
            ? "Imported from " + escapeHtml(state.healthData.source || "Health export") + " on " + formatDateTime(state.integrations.appleHealth.lastSync)
            : "Direct browser access is not possible. Import an Apple Health export file now, or pair this app with a native iOS bridge later.") +
          '</p><div class="button-row"><label class="btn-secondary" style="cursor:pointer;">Import Health Export<input class="hidden" type="file" data-input="health-file" accept=".xml,.json,.txt" style="position:absolute;opacity:0;width:0;height:0;"></label><button class="btn-secondary" data-action="toggle-auto-sync" data-key="appleHealth">Import Status ' + (state.integrations.appleHealth.autoSync ? "Tracked" : "Manual") + '</button></div></section>' +
        '<section class="glass panel integration-card"><h3>Apple Watch</h3><p>' +
          (state.integrations.appleWatch.connected
            ? "Watch-derived heart rate was detected in the imported health export."
            : "Live watch sync requires the same iOS HealthKit bridge as Apple Health. This web build supports import-based workflows only.") +
          '</p><div class="button-row"><button class="btn-secondary" data-action="import-health-export">Import Watch Data</button></div></section>' +
        '<section class="glass panel integration-card"><h3>Hevy Import</h3><p>' +
          (state.integrations.hevyImport.connected
            ? "Last import " + formatDateTime(state.integrations.hevyImport.lastSync)
            : "Import actual CSV or JSON exports from Hevy to merge workouts, routines, and weight history.") +
          '</p><div class="button-row">' +
          '<label class="btn" style="cursor:pointer;">Import Hevy File<input class="hidden" type="file" data-input="hevy-file" accept=".csv,.json" style="position:absolute;opacity:0;width:0;height:0;"></label>' +
          (premium
            ? '<button class="btn-secondary" data-action="toggle-auto-sync" data-key="hevyImport">Duplicate Detection ' + (state.integrations.hevyImport.autoSync ? "On" : "Off") + '</button>'
            : '<span class="badge">Duplicate detection is premium</span>') +
          '</div></section>' +
        '<section class="glass panel integration-card"><h3>Premium Device Insights</h3><p>' +
          (premium ? "Premium insights are unlocked for this user." : "Premium device insights are restricted. Ask an admin to upgrade this account to unlock deeper device analytics.") +
          '</p><div class="button-row">' + (premium ? '<span class="badge">Premium active</span>' : '<span class="badge">Admin upgrade required</span>') + "</div></section>" +
      "</div>" +
      '<section class="glass panel"><h3>Import Preview</h3>' +
        (state.importPreview.length
          ? state.importPreview.map(function (item) {
              return '<div class="mini-card"><strong>' + escapeHtml(item.title) + "</strong><p>" + escapeHtml(item.source) + " - " + escapeHtml(item.merge) + "</p></div>";
            }).join("")
          : "<p>No import preview yet.</p>") +
      "</section>" +
      '<section class="glass panel"><h3>Latest Apple Health Snapshot</h3>' +
        (hasHealth
          ? '<div class="stats-four">' +
              stat("Steps", number(state.healthData.steps), "Imported value") +
              stat("Active Calories", number(state.healthData.activeCalories), "Imported value") +
              stat("Heart Rate", number(state.healthData.heartRate) + " bpm", "Imported value") +
              stat("Recovery", number(state.healthData.recovery) + "%", "Derived from imported heart rate") +
            '</div>' + (state.healthImportDetails.length ? '<div style="height:14px"></div><div class="cards-three">' + state.healthImportDetails.map(function (item) {
              return '<div class="mini-card"><strong>' + escapeHtml(item.value) + '</strong><p>' + escapeHtml(item.label) + '</p></div>';
            }).join("") + '</div>' : "")
          : "<p>No Apple Health data imported yet.</p>") +
      "</section>";
  }

  function renderProfile() {
    return '' +
      '<div class="cards-two">' +
        '<section class="glass panel"><div class="avatar" style="width:88px;height:88px;border-radius:28px;font-size:24px;">' + escapeHtml(state.profile.avatar) + '</div><div style="height:16px"></div><h2>' + escapeHtml(state.profile.fullName) + "</h2><p>" + escapeHtml(state.profile.bio) + '</p><div class="stats-four">' +
          stat("Plan", escapeHtml(state.user.plan), "Current membership") +
          stat("Total workouts", String(state.workouts.length), "Saved") +
          stat("Meal logs", String(state.meals.length), "Saved") +
          stat("Weight logs", String(state.weightLogs.length), "Saved") +
        "</div></section>" +
        '<section class="glass panel"><h3>Edit Profile</h3>' +
          field("Full Name", '<input data-input="profile-name" value="' + escapeAttr(state.profile.fullName) + '">') +
          field("Bio", '<textarea data-input="profile-bio">' + escapeHtml(state.profile.bio) + "</textarea>") +
          '<div class="mini-card"><strong>Join date</strong><p>' + formatShortDate(state.profile.joinDate) + "</p></div>" +
        "</section>" +
      "</div>";
  }

  function renderSettings() {
    var premium = isPremiumUser();
    return '' +
      '<div class="cards-two">' +
        '<section class="glass panel"><h3>Account</h3>' +
          field("Change Password", '<input placeholder="New password">') +
          '<div class="button-row"><button class="btn-secondary">Email Preferences</button><button class="btn-secondary">Delete Account</button></div>' +
        "</section>" +
        '<section class="glass panel"><h3>Workout Preferences</h3>' +
          switchRow("Autocomplete sets", state.preferences.autoComplete, "toggle-pref", "autoComplete") +
          switchRow("Smart suggestions", state.preferences.smartSuggestions, "toggle-pref", "smartSuggestions") +
          '<div class="form-row">' +
            select("pref-units", state.preferences.units, ["kg", "lbs"]) +
            select("pref-distance", state.preferences.distance, ["km", "miles"]) +
            select("pref-rest", String(state.preferences.restTimer), ["60", "90", "120"]) +
            select("pref-sync", state.preferences.syncFrequency, ["Manual", "Hourly", "Daily"]) +
          "</div>" +
        "</section>" +
        '<section class="glass panel"><h3>Notifications</h3>' +
          switchRow("Workout reminders", true, "noop", "") +
          switchRow("Recovery alerts", true, "noop", "") +
          switchRow("Goal milestone alerts", true, "noop", "") +
        "</section>" +
        '<section class="glass panel"><h3>Data & Privacy</h3><div class="button-row">' +
          '<button class="' + (premium ? 'btn' : 'btn-secondary') + '" data-action="export-data">Export JSON</button>' +
          (!premium ? '<span class="badge">Export format locked</span>' : '') +
          '<button class="btn-secondary" data-action="clear-cache">Clear Cache</button></div></section>' +
        '<section class="glass panel"><h3>Health & Device Sync</h3>' +
          switchRow("Apple Health import available", state.integrations.appleHealth.connected, "toggle-integration", "appleHealth") +
          switchRow("Hevy import active", state.integrations.hevyImport.connected, "toggle-integration", "hevyImport") +
        "</section>" +
      "</div>";
  }

  function renderPro() {
    var premium = isPremiumUser();
    var oneRM = computeBest1RM();
    var forecast = computeGoalForecast();
    var aiInsights = computeAIInsights();
    return '' +
      '<div class="page-head"><div><p class="eyebrow">FitRank Premium</p>' +
        '<h2>' + (premium ? 'Premium Active âœ…' : 'Unlock Elite Training Intelligence') + '</h2>' +
        '<p>' + (premium ? 'All premium features are unlocked for your account.' : 'Premium gives you AI coaching, 1RM tracking, goal forecasting, export tools, animated form guides, and much more.') + '</p>' +
      '</div></div>' +
      (premium ? '<div class="success-banner" style="margin-bottom:16px">ðŸ‘‘ Premium is active on this account. All features below are fully unlocked.</div>' : '') +
      '<div class="cards-two">' +
        '<section class="glass panel"><h3>1RM Estimator ðŸ‹ï¸</h3><p>Automatically computes your estimated one-rep max using the Epley formula from your best logged sets.</p>' +
          (premium
            ? (oneRM.length
                ? oneRM.map(function (item) {
                    return '<div class="mini-card"><strong>' + escapeHtml(item.exercise) + '</strong><p>' + item.weight + ' kg Ã— ' + item.reps + ' = <strong>' + item.oneRM + ' kg 1RM</strong></p></div>';
                  }).join('')
                : '<p>No sets logged yet. Start tracking lifts to see your 1RM estimates automatically.</p>')
            : '<div class="mini-card" style="border:1px solid rgba(138,92,255,.4)"><strong>&#x1F512; Premium only</strong><p>Upgrade to see live 1RM estimates for every exercise.</p></div>') +
        '</section>' +
        '<section class="glass panel"><h3>Goal Pace Forecast &#x1F3AF;</h3><p>Projects how many weeks until you hit 100% of your weekly training goal at current pace.</p>' +
          (premium
            ? '<div class="mini-card"><strong>' + forecast.label + '</strong><p>' + forecast.detail + '</p></div><div style="height:10px"></div><div class="mini-card"><strong>Current pace: ' + forecast.pace + ' sessions/week</strong><p>Goal: 4 sessions/week</p></div>'
            : '<div class="mini-card" style="border:1px solid rgba(138,92,255,.4)"><strong>&#x1F512; Premium only</strong><p>Upgrade to see your goal timeline forecast.</p></div>') +
        '</section>' +
      '</div>' +
      '<div class="cards-two">' +
        '<section class="glass panel"><h3>AI Coaching Insights &#x1F916;</h3><p>Rule-based analysis of your training data to suggest your next move.</p>' +
          (premium
            ? aiInsights.map(function (insight) {
                return '<div class="mini-card"><strong>' + escapeHtml(insight.title) + '</strong><p>' + escapeHtml(insight.text) + '</p></div>';
              }).join('')
            : '<div class="mini-card" style="border:1px solid rgba(138,92,255,.4)"><strong>&#x1F512; Premium only</strong><p>Upgrade to get AI coaching recommendations tailored to your workout history.</p></div>') +
        '</section>' +
        '<section class="glass panel"><h3>Priority Data Export ðŸ“¤</h3><p>Export all your workout history, meals, weight logs, and health data in JSON or CSV format.</p>' +
          (premium
            ? '<div class="button-row"><button class="btn" data-action="export-data">Export JSON</button><button class="btn-secondary" data-action="export-csv">Export CSV</button></div><div style="height:12px"></div><div class="mini-card"><strong>Data is yours</strong><p>Full export includes all workouts, sets, meals, weight logs, and imported health data.</p></div>'
            : '<div class="mini-card" style="border:1px solid rgba(138,92,255,.4)"><strong>&#x1F512; Premium only</strong><p>Upgrade to export your full fitness history.</p></div>') +
        '</section>' +
      '</div>' +
      '<div class="cards-two">' +
        '<section class="glass panel"><h3>Animated Form Demos &#x1F3A5;</h3><p>For every exercise in your workout, tap Show Form to see an animated coaching guide with cues. Premium-exclusive.</p>' +
          (premium
            ? '<div class="success-banner">Active â€” tap â€œShow Formâ€ on any exercise during a workout.</div>'
            : '<div class="mini-card" style="border:1px solid rgba(138,92,255,.4)"><strong>&#x1F512; Premium only</strong><p>Upgrade to access animated form demos for all 100+ exercises.</p></div>') +
        '</section>' +
        '<section class="glass panel"><h3>Hevy Smart Deduplication &#x1F504;</h3><p>When importing Hevy exports, premium users get duplicate detection that prevents double-counting past workouts.</p>' +
          (premium
            ? '<div class="success-banner">Active â€” duplicate workouts are automatically skipped on Hevy imports.</div>'
            : '<div class="mini-card" style="border:1px solid rgba(138,92,255,.4)"><strong>&#x1F512; Premium only</strong><p>Upgrade to enable smart deduplication during Hevy imports.</p></div>') +
        '</section>' +
      '</div>' +
      '<div class="cards-three">' +
        pricing('Monthly', '$12', 'Best for trying premium first') +
        pricing('Yearly', '$89', 'Save 38% vs monthly â€” most popular') +
        pricing('Lifetime', '$249', 'One-time payment, forever access') +
      '</div>' +
      (!premium ? '<section class="glass panel" style="margin-top:8px;text-align:center"><h3>How to upgrade</h3><p>Premium plans are assigned by your FitRank admin. Log in as admin (admin@fitrank.app / Admin@123) and use the User Management panel to upgrade any account to premium instantly.</p><div class="badge" style="display:inline-block">Admin-managed upgrades</div></section>' : '');
  }

  function renderAdmin() {
    var totalWorkouts = state.workouts.length;
    var normalUsers = state.users.filter(function (user) { return user.role !== "ADMIN"; });
    var premiumUsersArr = normalUsers.filter(function (u) { return u.plan === "PRO"; });
    var freeUsersArr = normalUsers.filter(function (u) { return u.plan !== "PRO"; });
    var adminAnalytics = buildAdminAnalytics(normalUsers);

    var goalMap = {};
    normalUsers.forEach(function (user) {
      var g = user.goal || "General";
      goalMap[g] = (goalMap[g] || 0) + 1;
    });
    var goalKeys = Object.keys(goalMap);
    var weekBins = [0, 0, 0, 0];
    var now = Date.now();
    state.workouts.slice(0, 60).forEach(function (w) {
      var age = Math.floor((now - new Date(w.createdAt).getTime()) / (7 * 24 * 60 * 60 * 1000));
      if (age >= 0 && age < 4) weekBins[age] += 1;
    });
    weekBins.reverse();

    return '' +
      '<div class="page-head"><div><p class="eyebrow">Admin Dashboard</p><h2>Platform overview and user management</h2></div></div>' +
      '<div class="stats-four">' +
        stat("Total members", String(normalUsers.length), "Registered users") +
        stat("Premium users", String(premiumUsersArr.length), premiumUsersArr.length ? Math.round((premiumUsersArr.length / Math.max(1, normalUsers.length)) * 100) + "% of users" : "None yet") +
        stat("Total workouts", String(totalWorkouts), "Logged across all accounts") +
        stat("Health imports", String(state.integrations.appleHealth.connected ? 1 : 0), "Apple Health connected") +
      "</div>" +
      '<div class="cards-two">' +
        '<section class="glass panel"><h3>User Management</h3>' +
          (normalUsers.length
            ? normalUsers.map(function (user) {
                var planStyle = user.plan === "PRO" ? ' style="color:#8cf0b5"' : "";
                return '<div class="mini-card">' +
                  '<strong>' + escapeHtml(user.name) + '</strong>' +
                  '<p style="margin:3px 0">' + escapeHtml(user.email) + '</p>' +
                  '<p style="margin:3px 0;font-size:13px">Goal: ' + escapeHtml(user.goal) + '     <span' + planStyle + '>' + escapeHtml(user.plan) + '</span>     Joined ' + formatShortDate(user.createdAt || new Date().toISOString()) + '</p>' +
                  '<div class="button-row" style="margin-top:10px">' +
                    '<button class="btn-secondary" data-action="upgrade-user" data-user="' + user.id + '">Upgrade to Premium</button>' +
                    '<button class="btn-secondary" data-action="downgrade-user" data-user="' + user.id + '">Downgrade to Free</button>' +
                    '<button class="btn-secondary" data-action="delete-user" data-user="' + user.id + '">Delete</button>' +
                  '</div>' +
                '</div>';
              }).join("")
            : "<p>No member users found. New signups will appear here.</p>") +
        "</section>" +
        '<section class="glass panel"><h3>Platform KPIs</h3>' +
          metric("Avg workouts / user", normalUsers.length ? (totalWorkouts / normalUsers.length).toFixed(1) : "0") +
          metric("Total meal logs", String(state.meals.length)) +
          metric("Total weight entries", String(state.weightLogs.length)) +
          metric("Hevy imports done", String(state.importPreview.length)) +
          metric("Active admin", state.admin ? state.admin.email : "None") +
        "</section>" +
      '</div>' +
      '<div class="cards-two">' +
        '<section class="glass panel chart-card"><h3>Plan Distribution</h3>' +
          '<div class="chart-box" style="align-items:flex-end;gap:20px">' +
            '<div style="flex:1;text-align:center">' +
              '<div class="bar" style="height:' + Math.max(20, Math.round((freeUsersArr.length / Math.max(1, normalUsers.length)) * 180)) + 'px;background:linear-gradient(180deg,#8db0ff,#4f7cff)"></div>' +
              '<p style="margin-top:8px;font-size:13px">Free<br><strong>' + freeUsersArr.length + '</strong></p>' +
            '</div>' +
            '<div style="flex:1;text-align:center">' +
              '<div class="bar" style="height:' + Math.max(20, Math.round((premiumUsersArr.length / Math.max(1, normalUsers.length)) * 180)) + 'px;background:linear-gradient(180deg,#b050ff,#8a5cff)"></div>' +
              '<p style="margin-top:8px;font-size:13px">Premium<br><strong>' + premiumUsersArr.length + '</strong></p>' +
            '</div>' +
          '</div>' +
        '</section>' +
        '<section class="glass panel chart-card"><h3>Weekly Workout Activity (last 4 weeks)</h3>' +
          '<div class="chart-box">' +
            weekBins.map(function (val, i) {
              var labels = ["3w ago", "2w ago", "Last wk", "This wk"];
              var maxVal = Math.max.apply(null, weekBins.concat([1]));
              var h = Math.max(12, Math.round((val / maxVal) * 180));
              return '<div style="flex:1;text-align:center"><div class="bar" style="height:' + h + 'px"></div><p style="font-size:12px;margin-top:6px">' + labels[i] + "<br><strong>" + val + "</strong></p></div>";
            }).join("") +
          '</div>' +
        '</section>' +
      '</div>' +
      (goalKeys.length
        ? '<div class="cards-two">' +
            '<section class="glass panel chart-card"><h3>Goal Distribution</h3>' +
              '<div class="chart-box">' +
                goalKeys.map(function (k) {
                  var val = goalMap[k];
                  var maxVal = Math.max.apply(null, goalKeys.map(function (x) { return goalMap[x]; }).concat([1]));
                  var h = Math.max(12, Math.round((val / maxVal) * 180));
                  return '<div style="flex:1;text-align:center"><div class="bar" style="height:' + h + 'px"></div><p style="font-size:12px;margin-top:6px">' + escapeHtml(k) + "<br><strong>" + val + "</strong></p></div>";
                }).join("") +
              '</div>' +
            '</section>' +
            '<section class="glass panel"><h3>Recent Member Snapshot</h3>' +
              normalUsers.slice(0, 6).map(function (user) {
                return '<div class="mini-card"><strong>' + escapeHtml(user.name) + '</strong><p>' + escapeHtml(user.email) + '     ' + escapeHtml(user.plan) + '     ' + escapeHtml(user.goal) + '</p></div>';
              }).join("") +
            '</section>' +
          '</div>'
        : '');
  }

  function renderMobileNav() {
    var items = state.admin
      ? [["admin", "📈 Admin"]]
      : [
          ["dashboard",    "🏠 Home"],
          ["workouts",     "💪 Train"],
          ["progress",     "📈 Charts"],
          ["integrations", "📥 Import"],
          ["settings",     "⚙️ More"]
        ];

    return '<div class="glass mobile-nav"><div class="mobile-nav-inner ' + (state.admin ? "admin-nav" : "") + '">' + items.map(function (item) {
      return '<button class="' + (state.page === item[0] ? "active" : "") + '" data-nav="' + item[0] + '">' + item[1] + '</button>';
    }).join("") + "</div></div>";
  }

  function field(label, inner) {
    return '<div class="field"><label>' + label + '</label><div class="field-shell">' + inner + "</div></div>";
  }

  function button(label, page, primary) {
    return '<button class="' + (primary ? "btn" : "btn-secondary") + '" data-nav="' + page + '">' + label + "</button>";
  }

  function stat(label, value, helper) {
    return '<div class="glass panel stat-card"><span>' + label + "</span><strong>" + value + "</strong><p>" + helper + "</p></div>";
  }

  function metric(label, value) {
    return '<div class="mini-card"><strong>' + value + "</strong><p>" + label + "</p></div>";
  }

  function ring(label, value) {
    var numeric = Math.min(100, Number(value) || 0);
    var angle = numeric * 3.6;
    return '<div class="ring"><div class="ring-visual" style="background:conic-gradient(#8a5cff ' + angle + 'deg, rgba(255,255,255,.08) ' + angle + 'deg)"><div class="ring-center">' + numeric + '%</div></div><strong>' + label + "</strong></div>";
  }

  function pricing(title, price, helper) {
    return '<section class="glass panel"><p class="eyebrow">' + title + "</p><h2>" + price + "</h2><p>" + helper + '</p><div class="badge">Admin assignment only</div></section>';
  }

  function chartCard(title, content) {
    return '<section class="glass panel chart-card"><h3>' + title + "</h3>" + content + "</section>";
  }

  function renderBars(data) {
    var vals = data.values || data;
    if (!vals.length || !hasPositive(vals)) return "<p>No data yet. Save workouts to build this chart.</p>";
    var max = Math.max.apply(null, vals) || 1;
    return '<div class="chart-box" style="align-items:flex-end;gap:12px;margin-top:20px;">' + vals.map(function (value, i) {
      var lbl = data.labels && data.labels[i] ? String(data.labels[i]).slice(5) : "";
      var h = Math.max(12, Math.round((value / max) * 180));
      return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;">' +
        '<span style="font-size:10px;color:rgba(255,255,255,0.6);margin-bottom:4px;">' + Math.round(value) + '</span>' +
        '<div class="bar" style="height:' + h + 'px;width:100%;border-radius:6px;background:linear-gradient(180deg,#8db0ff,#8a5cff 65%,#b050ff);"></div>' +
        (lbl ? '<span style="font-size:10px;color:rgba(255,255,255,0.4);margin-top:4px;white-space:nowrap;transform:rotate(-45deg);transform-origin:left center;">' + escapeHtml(lbl) + '</span>' : '') +
        '</div>';
    }).join("") + "</div>";
  }

  function renderLineChart(data) {
    if (!data.values.length || !hasPositive(data.values)) return "<p>No data yet. Save workouts to build this chart.</p>";
    var width = 520;
    var height = 220;
    var chartH = height - 30; // Leave room for labels
    var max = Math.max.apply(null, data.values) || 1;
    var points = [];
    var labelsSvg = "";
    
    for (var i = 0; i < data.values.length; i += 1) {
      var x = data.values.length === 1 ? width / 2 : 20 + (i * ((width - 40) / (data.values.length - 1)));
      var y = chartH - 20 - ((data.values[i] / max) * (chartH - 40));
      points.push(x + "," + y);
      labelsSvg += '<text x="' + x + '" y="' + (y - 12) + '" fill="rgba(255,255,255,0.8)" font-size="10" text-anchor="middle">' + Math.round(data.values[i]*10)/10 + '</text>';
      
      if (data.labels && data.labels[i] && (data.labels.length <= 8 || i % Math.ceil(data.labels.length/6) === 0 || i === data.values.length - 1)) {
        var labelText = String(data.labels[i]).slice(5); // Show MM-DD roughly if YYYY-MM-DD
        labelsSvg += '<text x="' + x + '" y="' + (height - 5) + '" fill="rgba(255,255,255,.45)" font-size="11" text-anchor="middle">' + escapeHtml(labelText) + '</text>';
      }
    }
    return '<div class="line-chart"><svg class="line-svg" viewBox="0 0 ' + width + " " + height + '" preserveAspectRatio="none"><polyline fill="none" stroke="#8db0ff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" points="' + points.join(" ") + '"></polyline>' +
      points.map(function (point) {
        var xy = point.split(",");
        return '<circle cx="' + xy[0] + '" cy="' + xy[1] + '" r="5" fill="#b050ff"></circle>';
      }).join("") + labelsSvg +
      "</svg></div>";
  }

  function select(name, value, options) {
    return '<div class="field-shell"><select data-select="' + name + '">' + options.map(function (option) {
      return '<option value="' + escapeAttr(option) + '" ' + (option === value ? "selected" : "") + ">" + option + "</option>";
    }).join("") + "</select></div>";
  }

  function switchRow(label, on, action, key) {
    return '<div class="switch"><span>' + label + '</span><button class="' + (on ? "on" : "off") + '" data-action="' + action + '" data-key="' + key + '">' + (on ? "On" : "Off") + "</button></div>";
  }

  function renderModal() {
    if (!state.modal) return "";
    if (state.modal.type === "exercise-picker") {
      return renderExercisePicker();
    }
    if (state.modal.type === "form-demo") {
      return renderFormDemoModal();
    }
    return "";
  }

  function renderExercisePicker() {
    var query = String(state.modal.query || "").toLowerCase();
    var results = EXERCISE_LIBRARY.filter(function (exercise) {
      if (!query) return true;
      return exercise.name.toLowerCase().indexOf(query) > -1 ||
        exercise.category.toLowerCase().indexOf(query) > -1 ||
        exercise.primaryMuscle.toLowerCase().indexOf(query) > -1;
    }).slice(0, 100);

    return '' +
      '<div class="modal-backdrop" data-action="close-modal">' +
        '<div class="glass modal-card" data-modal-card="true">' +
          '<div class="page-head"><div><p class="eyebrow">Exercise Library</p><h2>Choose from 100+ exercises</h2><p>Search by name, muscle group, or equipment.</p></div><button class="btn-secondary" data-action="close-modal">Close</button></div>' +
          field("Search", '<input data-input="exercise-search" value="' + escapeAttr(state.modal.query || "") + '" placeholder="Bench, squat, biceps, dumbbell...">') +
          '<div class="exercise-picker-grid">' +
            results.map(function (exercise) {
              return '<button class="exercise-option" data-action="select-exercise" data-name="' + escapeAttr(exercise.name) + '"><strong>' + escapeHtml(exercise.name) + '</strong><span>' + escapeHtml(exercise.category) + " &bull; " + escapeHtml(exercise.primaryMuscle) + " &bull; " + escapeHtml(exercise.equipment) + '</span></button>';
            }).join("") +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function renderFormDemoModal() {
    var exercise = findExerciseById(state.modal.exerciseId);
    var meta = exerciseMeta(exercise ? exercise.name : state.modal.exerciseName);
    var premium = requirePremiumStatusText();
    return '' +
      '<div class="modal-backdrop" data-action="close-modal">' +
        '<div class="glass modal-card modal-wide" data-modal-card="true">' +
          '<div class="page-head"><div><p class="eyebrow">Exercise Form</p><h2>' + escapeHtml(meta.name) + '</h2><p>' + escapeHtml(meta.category) + "   " + escapeHtml(meta.primaryMuscle) + "   " + escapeHtml(meta.equipment) + '</p></div><button class="btn-secondary" data-action="close-modal">Close</button></div>' +
          (premium.allowed
            ? '<div class="cards-two"><section class="glass panel"><div class="form-demo ' + escapeAttr(meta.demoType) + '"><div class="demo-stage"><div class="demo-body"></div><div class="demo-limb limb-a"></div><div class="demo-limb limb-b"></div><div class="demo-bar"></div></div></div><p class="demo-label">Animated premium form demo</p></section><section class="glass panel"><h3>Coaching Cues</h3><div class="pill-row">' + meta.cues.map(function (cue) { return '<span>' + escapeHtml(cue) + '</span>'; }).join("") + '</div><div style="height:16px"></div><div class="mini-card"><strong>Primary focus</strong><p>' + escapeHtml(meta.primaryMuscle) + '</p></div><div class="mini-card"><strong>Equipment</strong><p>' + escapeHtml(meta.equipment) + '</p></div></section></div>'
            : '<section class="glass panel"><h3>Premium feature</h3><p>' + escapeHtml(premium.message) + '</p><div class="badge">Ask admin to upgrade this account</div></section>') +
        '</div>' +
      '</div>';
  }

  function handleClick(event) {
    var nav = event.target.closest("[data-nav]");
    if (nav) {
      var navDest = nav.getAttribute("data-nav");
      if (navDest === "workouts") {
        state.liveWorkout = loadLiveWorkout();
      }
      setPage(navDest);
      return;
    }

    var actionNode = event.target.closest("[data-action]");
    if (!actionNode) return;

    var action = actionNode.getAttribute("data-action");
    var key = actionNode.getAttribute("data-key");
    var exerciseId = actionNode.getAttribute("data-exercise");
    var setId = actionNode.getAttribute("data-set");
    var routineId = actionNode.getAttribute("data-routine");

    if (action === "toggle-auth") {
      state.authMode = state.authMode === "login" ? "signup" : "login";
      setPage(state.authMode);
      state.authError = "";
      state.authInfo = "";
      render();
    } else if (action === "back-to-login") {
      clearResetUrl();
      state.authMode = "login";
      state.authError = "";
      state.authInfo = "";
      state.pendingReset = { email: "", password: "", confirm: "", token: "" };
      render();
    } else if (action === "toggle-password") {
      state.showPassword = !state.showPassword;
      render();
    } else if (action === "remember-me") {
      state.rememberMe = !state.rememberMe;
      render();
    } else if (action === "forgot") {
      requestPasswordReset(readAuthEmail());
    } else if (action === "logout") {
      state.user = null;
      state.admin = null;
      loadUserData(null);
      setPage("login");
      state.authMode = "login";
      render();
    } else if (action === "finish-workout") {
      finishWorkout();
    } else if (action === "add-exercise") {
      openExercisePicker("add");
    } else if (action === "delete-exercise") {
      deleteExercise(exerciseId);
    } else if (action === "move-up") {
      moveExercise(exerciseId, -1);
    } else if (action === "move-down") {
      moveExercise(exerciseId, 1);
    } else if (action === "toggle-set") {
      toggleSet(exerciseId, setId);
    } else if (action === "add-set") {
      addSet(exerciseId);
    } else if (action === "replace-exercise") {
      openExercisePicker("replace", exerciseId);
    } else if (action === "show-form") {
      openFormDemo(exerciseId);
    } else if (action === "exercise-notes") {
      toast("Exercise notes opened.");
    } else if (action === "rest-timer") {
      toast(state.preferences.restTimer + " second rest timer started.");
    } else if (action === "create-routine") {
      createRoutine();
    } else if (action === "start-routine") {
      startRoutine(routineId);
    } else if (action === "edit-routine") {
      toast("Routine editor opened.");
    } else if (action === "duplicate-routine") {
      duplicateRoutine(routineId);
    } else if (action === "delete-routine") {
      deleteRoutine(routineId);
    } else if (action === "save-weight") {
      saveWeight();
    } else if (action === "save-meal") {
      saveMeal();
    } else if (action === "toggle-integration") {
      toggleIntegration(key);
    } else if (action === "sync-integration") {
      syncIntegration(key);
    } else if (action === "toggle-auto-sync") {
      toggleAutoSync(key);
    } else if (action === "import-health-export") {
      triggerHiddenFile("health-import-file");
    } else if (action === "import-hevy-file") {
      triggerHiddenFile("hevy-import-file");
    } else if (action === "upgrade-user") {
      adminUpgradeUser(actionNode.getAttribute("data-user"));
    } else if (action === "downgrade-user") {
      adminDowngradeUser(actionNode.getAttribute("data-user"));
    } else if (action === "delete-user") {
      adminDeleteUser(actionNode.getAttribute("data-user"));
    } else if (action === "toggle-pref") {
      state.preferences[key] = !state.preferences[key];
      render();
    } else if (action === "export-data") {
      if (requirePremiumFeature("Premium export")) exportData();
    } else if (action === "export-csv") {
      exportCsv();
    } else if (action === "clear-cache") {
      localStorage.clear();
      location.reload();
    } else if (action === "upgrade") {
      toast("Premium is managed by admin. Ask an admin to change this account plan.");
    } else if (action === "close-modal") {
      closeModal(event);
    } else if (action === "select-exercise") {
      selectExercise(actionNode.getAttribute("data-name"));
    } else if (action === "noop") {
      toast("Setting saved.");
    }
  }

  function handleSubmit(event) {
    var form = event.target.getAttribute("data-form");
    if (!form) return;
    event.preventDefault();
    if (form === "member") submitMember(event.target);
    else if (form === "reset") submitReset(event.target);
  }

  function handleInput(event) {
    var input = event.target.getAttribute("data-input");
    if (!input) return;

    if (input === "search") {
      state.search = event.target.value;
    } else if (input === "set-weight" || input === "set-reps") {
      updateSetField(event.target.getAttribute("data-exercise"), event.target.getAttribute("data-set"), input === "set-weight" ? "weight" : "reps", event.target.value);
    } else if (input === "weight-log") {
      state.pendingWeight = event.target.value;
    } else if (input === "meal-name") {
      state.pendingMeal.name = event.target.value;
    } else if (input === "meal-calories") {
      state.pendingMeal.calories = event.target.value;
    } else if (input === "meal-protein") {
      state.pendingMeal.protein = event.target.value;
    } else if (input === "meal-water") {
      state.pendingMeal.water = event.target.value;
    } else if (input === "profile-name") {
      state.profile.fullName = event.target.value;
      state.profile.avatar = initials(event.target.value);
    } else if (input === "profile-bio") {
      state.profile.bio = event.target.value;
    } else if (input === "exercise-search") {
      if (state.modal && state.modal.type === "exercise-picker") {
        state.modal.query = event.target.value;
        var grid = document.querySelector(".exercise-picker-grid");
        if (grid) {
          var query = state.modal.query.toLowerCase();
          var results = EXERCISE_LIBRARY.filter(function (ex) {
            if (!query) return true;
            return ex.name.toLowerCase().indexOf(query) > -1 ||
              ex.category.toLowerCase().indexOf(query) > -1 ||
              ex.primaryMuscle.toLowerCase().indexOf(query) > -1;
          }).slice(0, 100);
          grid.innerHTML = results.map(function (exercise) {
            return '<button class="exercise-option" data-action="select-exercise" data-name="' + escapeAttr(exercise.name) + '"><strong>' + escapeHtml(exercise.name) + '</strong><span>' + escapeHtml(exercise.category) + " &bull; " + escapeHtml(exercise.primaryMuscle) + " &bull; " + escapeHtml(exercise.equipment) + '</span></button>';
          }).join("");
        }
      }
    } else if (input === "hevy-file") {
      previewImport(event.target.files && event.target.files[0]);
    } else if (input === "health-file") {
      previewHealthImport(event.target.files && event.target.files[0]);
    }
  }

  function handleChange(event) {
    var selectName = event.target.getAttribute("data-select");
    if (!selectName) return;
    var value = event.target.value;
    if (selectName === "range-filter") state.dateRange = value;
    else if (selectName === "exercise-filter") state.selectedExercise = value;
    else if (selectName === "pref-units") state.preferences.units = value;
    else if (selectName === "pref-distance") state.preferences.distance = value;
    else if (selectName === "pref-rest") state.preferences.restTimer = Number(value);
    else if (selectName === "pref-sync") state.preferences.syncFrequency = value;
    render();
  }

  function submitMember(form) {
    var data = new FormData(form);
    var fullName = String(data.get("fullName") || "").trim();
    var email = String(data.get("email") || "").trim().toLowerCase();
    var password = String(data.get("password") || "").trim();
    var confirmPassword = String(data.get("confirmPassword") || "").trim();
    var goal = String(data.get("goal") || "Strength");

    state.authError = "";
    state.authInfo = "";

    if (!email || !password) {
      state.authError = "Email and password are required.";
      render();
      return;
    }

    if (state.authMode === "signup" && password !== confirmPassword) {
      state.authError = "Passwords do not match.";
      render();
      return;
    }

    if (state.authMode === "signup" && state.passwords[email]) {
      state.authError = "An account with this email already exists.";
      render();
      return;
    }

    if (state.authMode === "login" && email === "admin@fitrank.app" && password === "Admin@123") {
      state.user = {
        id: 999,
        name: "FitRank Admin",
        email: email,
        goal: "Administration",
        plan: "ADMIN"
      };
      state.admin = { email: email, privileges: ["USER_MANAGE", "CONTENT_MANAGE", "ANALYTICS_VIEW"] };
      syncCurrentUserRecord();
      loadUserData(state.user.id);
      setPage("admin");
      toast("Logged in with admin privileges.");
      render();
      return;
    }

    if (state.authMode === "login" && (state.passwords[email] || "password") !== password) {
      state.authError = "Invalid email or password.";
      render();
      return;
    }

    state.user = {
      id: findExistingUserId(email) || uid(),
      name: fullName || email.split("@")[0],
      email: email,
      goal: goal,
      plan: findExistingPlan(email) || "FREE"
    };
    state.passwords[email] = password;
    state.admin = null;
    loadUserData(state.user.id);
    state.profile.fullName = state.user.name;
    state.profile.avatar = initials(state.user.name);
    syncCurrentUserRecord();
    setPage("dashboard");
    toast(state.authMode === "signup" ? "Account created." : "Logged in successfully.");
    render();
  }

  function submitReset(form) {
    var data = new FormData(form);
    var email = String(data.get("email") || "").trim().toLowerCase();
    var token = String(data.get("token") || "").trim();
    var password = String(data.get("password") || "").trim();
    var confirmPassword = String(data.get("confirmPassword") || "").trim();

    state.authError = "";
    state.authInfo = "";

    if (!email || !token || !password) {
      state.authError = "Email, reset token, and new password are required.";
      render();
      return;
    }

    if (password !== confirmPassword) {
      state.authError = "Passwords do not match.";
      render();
      return;
    }

    // Check locally-issued token first (works offline / without backend)
    var localTokenKey = "__reset__" + email;
    if (state.passwords[localTokenKey] && state.passwords[localTokenKey] === token) {
      state.passwords[email] = password;
      delete state.passwords[localTokenKey];
      state.authMode = "login";
      state.authInfo = "Password updated successfully. You can now log in with your new password.";
      state.pendingReset = { email: email, password: "", confirm: "", token: "" };
      clearResetUrl();
      render();
      return;
    }

    fetch(API + "/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, token: token, password: password })
    }).then(function (response) {
      return response.json().then(function (json) {
        return { ok: response.ok, json: json };
      });
    }).then(function (result) {
      if (!result.ok) throw new Error(result.json.error || "Unable to reset password.");
      state.passwords[email] = password;
      state.authMode = "login";
      state.authInfo = result.json.message || "Password updated. You can log in now.";
      state.pendingReset = { email: email, password: "", confirm: "", token: "" };
      clearResetUrl();
      render();
    }).catch(function () {
      state.authError = "Invalid or expired reset token.";
      render();
    });
  }

  function requestPasswordReset(email) {
    state.authError = "";
    state.authInfo = "";
    email = String(email || "").trim().toLowerCase();

    if (!email) {
      state.authError = "Enter your email first, then request a reset link.";
      render();
      return;
    }

    if (!state.passwords[email] && email !== "athlete@fitrank.app") {
      state.authError = "No account found with that email address.";
      render();
      return;
    }

    var localToken = "FR-" + Math.random().toString(36).slice(2, 10).toUpperCase();
    var resetUrl = location.origin + location.pathname + "?resetToken=" + localToken + "&email=" + encodeURIComponent(email);

    state.passwords["__reset__" + email] = localToken;
    state.authInfo = "Reset link generated. Check the console (F12) or use the link below to reset your password. In production, this would arrive by email.";
    state.authInfo += " | Reset URL: " + resetUrl;

    fetch(API + "/auth/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, resetBaseUrl: location.origin + location.pathname, token: localToken })
    }).then(function (response) {
      return response.json().then(function (json) { return { ok: response.ok, json: json }; });
    }).then(function (result) {
      if (result.json && result.json.devResetUrl) {
        state.authInfo = "Reset link sent (server confirmed). URL: " + result.json.devResetUrl;
        render();
      }
    }).catch(function () {
      // Server not running â€” local token already set above, user can proceed.
    });

    render();
  }

  function readAuthEmail() {
    var input = document.querySelector('form[data-form="member"] input[name="email"]');
    return input ? input.value : "";
  }

  function clearResetUrl() {
    try {
      var cleanUrl = location.origin + location.pathname + location.hash;
      history.replaceState({}, "", cleanUrl);
    } catch (error) {
      // Ignore URL cleanup failures in older browsers.
    }
  }

  function findExistingUserId(email) {
    for (var i = 0; i < state.users.length; i += 1) {
      if (state.users[i].email === email) return state.users[i].id;
    }
    return null;
  }

  function findExistingPlan(email) {
    for (var i = 0; i < state.users.length; i += 1) {
      if (state.users[i].email === email) return state.users[i].plan;
    }
    return null;
  }

  function updateSetField(exerciseId, setId, fieldName, value) {
    state.liveWorkout.exercises.forEach(function (exercise) {
      if (exercise.id === exerciseId) {
        exercise.sets.forEach(function (set) {
          if (set.id === setId) set[fieldName] = value;
        });
      }
    });
  }

  function toggleSet(exerciseId, setId) {
    state.liveWorkout.exercises.forEach(function (exercise) {
      if (exercise.id === exerciseId) {
        exercise.sets.forEach(function (set) {
          if (set.id === setId) set.done = !set.done;
        });
      }
    });
    toast("Set updated.");
    render();
  }

  function addSet(exerciseId) {
    state.liveWorkout.exercises.forEach(function (exercise) {
      if (exercise.id === exerciseId) {
        var previous = exercise.sets.length ? exercise.sets[exercise.sets.length - 1] : { weight: 0, reps: 0 };
        exercise.sets.push({ id: uid(), previous: (previous.weight || 0) + " x " + (previous.reps || 0), weight: "", reps: "", done: false });
      }
    });
    render();
  }

  function deleteExercise(exerciseId) {
    state.liveWorkout.exercises = state.liveWorkout.exercises.filter(function (exercise) { return exercise.id !== exerciseId; });
    render();
  }

  function moveExercise(exerciseId, direction) {
    var index = -1;
    for (var i = 0; i < state.liveWorkout.exercises.length; i += 1) {
      if (state.liveWorkout.exercises[i].id === exerciseId) {
        index = i;
        break;
      }
    }
    var nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= state.liveWorkout.exercises.length) return;
    var item = state.liveWorkout.exercises.splice(index, 1)[0];
    state.liveWorkout.exercises.splice(nextIndex, 0, item);
    render();
  }

  function openExercisePicker(mode, exerciseId) {
    state.modal = {
      type: "exercise-picker",
      mode: mode || "add",
      exerciseId: exerciseId || null,
      query: ""
    };
    render();
  }

  function selectExercise(name) {
    if (!state.modal || state.modal.type !== "exercise-picker") return;
    if (state.modal.mode === "replace" && state.modal.exerciseId) {
      state.liveWorkout.exercises.forEach(function (exercise) {
        if (exercise.id === state.modal.exerciseId) {
          exercise.name = name;
        }
      });
    } else {
      state.liveWorkout.exercises.push({
        id: uid(),
        name: name,
        notes: "",
        sets: [{ id: uid(), previous: previousSetHint(name), weight: "", reps: "", done: false }]
      });
    }
    state.modal = null;
    render();
  }

  function openFormDemo(exerciseId) {
    var exercise = findExerciseById(exerciseId);
    if (!exercise) return;
    state.modal = {
      type: "form-demo",
      exerciseId: exerciseId,
      exerciseName: exercise.name
    };
    render();
  }

  function closeModal(event) {
    if (event && event.target && event.target.getAttribute("data-modal-card") === "true") return;
    if (event && event.target && event.target.closest("[data-modal-card='true']") && !event.target.closest("[data-action='close-modal']")) return;
    state.modal = null;
    render();
  }

  function finishWorkout() {
    var durationMinutes = Math.max(1, Math.round((Date.now() - state.liveWorkout.startedAt) / 60000));
    var volume = 0;
    state.liveWorkout.exercises.forEach(function (exercise) {
      exercise.sets.forEach(function (set) {
        volume += (Number(set.weight) || 0) * (Number(set.reps) || 0);
      });
    });

    var workout = {
      id: uid(),
      title: state.liveWorkout.name,
      createdAt: new Date().toISOString(),
      durationMinutes: durationMinutes,
      volume: volume,
      calories: Math.round(durationMinutes * 7 + volume / 35),
      likes: 0,
      comments: [],
      quote: motivationalQuote(),
      exercises: clone(state.liveWorkout.exercises),
      health: { heartRateAvg: state.healthData.heartRate || state.liveWorkout.heartRate || 0, recovery: Math.min(96, 74 + state.workouts.length * 2) }
    };

    state.workouts.unshift(workout);
    state.liveWorkout = loadLiveWorkout();
    toast("Workout saved.");
    setPage("dashboard");
    render();
  }

  function createRoutine() {
    var name = prompt("Routine name");
    if (!name) return;
    state.routines.push({ id: uid(), name: name, days: "Custom", focus: "Personalized training" });
    toast("Routine created.");
    render();
  }

  function startRoutine(routineId) {
    for (var i = 0; i < state.routines.length; i += 1) {
      if (state.routines[i].id === routineId) {
        state.liveWorkout.name = state.routines[i].name;
      }
    }
    setPage("workouts");
    render();
  }

  function duplicateRoutine(routineId) {
    for (var i = 0; i < state.routines.length; i += 1) {
      if (state.routines[i].id === routineId) {
        state.routines.push({ id: uid(), name: state.routines[i].name + " Copy", days: state.routines[i].days, focus: state.routines[i].focus });
        break;
      }
    }
    toast("Routine duplicated.");
    render();
  }

  function deleteRoutine(routineId) {
    state.routines = state.routines.filter(function (routine) { return routine.id !== routineId; });
    toast("Routine deleted.");
    render();
  }

  function saveWeight() {
    var value = Number(state.pendingWeight || 0);
    if (!value) {
      toast("Enter a body weight first.");
      return;
    }
    state.weightLogs.unshift({ id: uid(), value: value, createdAt: new Date().toISOString() });
    state.pendingWeight = "";
    toast("Body weight logged.");
    render();
  }

  function nutritionSummary() {
    var today = new Date().toISOString().slice(0, 10);
    return state.meals.reduce(function (acc, meal) {
      if (String(meal.createdAt).slice(0, 10) === today) {
        acc.calories += Number(meal.calories) || 0;
        acc.protein += Number(meal.protein) || 0;
        acc.water += Number(meal.water) || 0;
        acc.meals += 1;
      }
      return acc;
    }, { calories: 0, protein: 0, water: 0, meals: 0 });
  }

  function mealProgress() {
    var summary = nutritionSummary();
    return Math.min(100, Math.round((summary.calories / 2400) * 100));
  }

  function saveMeal() {
    if (!state.pendingMeal.name || !state.pendingMeal.calories) {
      toast("Meal name and calories are required.");
      return;
    }

    state.meals.unshift({
      id: uid(),
      name: state.pendingMeal.name,
      calories: Number(state.pendingMeal.calories) || 0,
      protein: Number(state.pendingMeal.protein) || 0,
      water: Number(state.pendingMeal.water) || 0,
      createdAt: new Date().toISOString()
    });
    state.pendingMeal = { name: "", calories: "", protein: "", water: "" };
    toast("Meal saved.");
    render();
  }

  function isPremiumUser() {
    return !!(state.user && state.user.plan === "PRO");
  }

  function adminUpgradeUser(userId) {
    if (!isAdminUser()) {
      toast("Only admin can manage user plans.");
      return;
    }
    for (var i = 0; i < state.users.length; i += 1) {
      if (String(state.users[i].id) === String(userId) && state.users[i].role !== "ADMIN") {
        state.users[i].plan = "PRO";
        if (state.user && state.user.email === state.users[i].email) state.user.plan = "PRO";
      }
    }
    toast("User upgraded to premium.");
    render();
  }

  function adminDowngradeUser(userId) {
    if (!isAdminUser()) {
      toast("Only admin can manage user plans.");
      return;
    }
    for (var i = 0; i < state.users.length; i += 1) {
      if (String(state.users[i].id) === String(userId) && state.users[i].role !== "ADMIN") {
        state.users[i].plan = "FREE";
        if (state.user && state.user.email === state.users[i].email) state.user.plan = "FREE";
      }
    }
    toast("User downgraded to free.");
    render();
  }

  function adminDeleteUser(userId) {
    if (!isAdminUser()) {
      toast("Only admin can delete users.");
      return;
    }
    state.users = state.users.filter(function (user) {
      return String(user.id) !== String(userId) || user.role === "ADMIN";
    });
    toast("User deleted.");
    render();
  }

  function toggleIntegration(key) {
    if (key === "appleHealth" || key === "appleWatch") {
      toast("These integrations rely on imported export data in the web app.");
      return;
    }
    state.integrations[key].connected = !state.integrations[key].connected;
    state.integrations[key].lastSync = new Date().toISOString();
    toast(labelize(key) + (state.integrations[key].connected ? " connected." : " disconnected."));
    render();
  }

  function syncIntegration(key) {
    state.integrations[key].lastSync = new Date().toISOString();
    toast(labelize(key) + " synced.");
    render();
  }

  function toggleAutoSync(key) {
    if (key === "hevyImport" && !requirePremiumFeature("Hevy duplicate detection")) return;
    state.integrations[key].autoSync = !state.integrations[key].autoSync;
    render();
  }

  function requirePremiumFeature(label) {
    if (isAdminUser() || isPremiumUser()) return true;
    toast(label + " is available for premium users only.");
    return false;
  }

  function triggerHiddenFile(inputId) {
    var node = document.getElementById(inputId);
    if (node) node.click();
  }

  function previewImport(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var text = String(reader.result || "");
      var imported = parseHevyFile(file.name, text);

      state.importPreview = imported.preview;
      state.workouts = mergeImportedWorkouts(imported.workouts);
      state.weightLogs = mergeWeightLogs(imported.weightLogs);
      state.routines = mergeRoutines(imported.routines);
      state.integrations.hevyImport.connected = imported.workouts.length > 0 || imported.weightLogs.length > 0 || imported.routines.length > 0;
      state.integrations.hevyImport.lastSync = new Date().toISOString();
      toast(imported.toast);
      render();
    };
    reader.readAsText(file);
  }

  function mergeImportedWorkouts(workouts) {
    if (!state.integrations.hevyImport.autoSync) return workouts.concat(state.workouts);
    var existing = {};
    state.workouts.forEach(function (workout) {
      existing[(workout.title || "") + "|" + String(workout.createdAt || "").slice(0, 10)] = true;
    });
    var merged = workouts.filter(function (workout) {
      var key = (workout.title || "") + "|" + String(workout.createdAt || "").slice(0, 10);
      if (existing[key]) return false;
      existing[key] = true;
      return true;
    });
    return merged.concat(state.workouts);
  }

  function mergeWeightLogs(entries) {
    var existing = {};
    state.weightLogs.forEach(function (entry) {
      existing[String(entry.createdAt).slice(0, 10) + "|" + Number(entry.value || 0)] = true;
    });
    var merged = entries.filter(function (entry) {
      var key = String(entry.createdAt).slice(0, 10) + "|" + Number(entry.value || 0);
      if (existing[key]) return false;
      existing[key] = true;
      return true;
    });
    return merged.concat(state.weightLogs);
  }

  function mergeRoutines(routines) {
    var existing = {};
    state.routines.forEach(function (routine) {
      existing[String(routine.name || "").toLowerCase()] = true;
    });
    var merged = routines.filter(function (routine) {
      var key = String(routine.name || "").toLowerCase();
      if (existing[key]) return false;
      existing[key] = true;
      return true;
    });
    return merged.concat(state.routines);
  }

  function parseHevyFile(fileName, text) {
    var workouts = [];
    var routines = [];
    var weightLogs = [];
    var preview = [];

    if (/\.json$/i.test(fileName)) {
      parseHevyJson(text, workouts, routines, weightLogs, preview, fileName);
    } else {
      parseHevyCsv(text, workouts, routines, weightLogs, preview, fileName);
    }

    if (workouts.length) preview.push({ title: number(workouts.length) + " workouts imported", source: fileName, merge: "Merged into existing workout history" });
    if (routines.length) preview.push({ title: number(routines.length) + " routines imported", source: fileName, merge: "Added to routine library" });
    if (weightLogs.length) preview.push({ title: number(weightLogs.length) + " weight entries imported", source: fileName, merge: "Added to progress history" });

    if (!preview.length) {
      preview.push({ title: "No compatible records", source: fileName, merge: "Nothing imported" });
    }

    return {
      workouts: workouts,
      routines: routines,
      weightLogs: weightLogs,
      preview: preview,
      toast: workouts.length || routines.length || weightLogs.length ? "Hevy data imported." : "No compatible Hevy records found."
    };
  }

  function parseHevyJson(text, workouts, routines, weightLogs, preview, fileName) {
    try {
      var data = JSON.parse(text);
      var items = Array.isArray(data) ? data : (data.workouts || data.entries || []);
      items.forEach(function (item) {
        workouts.push(normalizeImportedWorkout(item.title || item.name || item.workout_title || "Imported Workout", item.createdAt || item.date || item.started_at, item.exercises || item.sets || []));
      });

      if (data.bodyWeightHistory && Array.isArray(data.bodyWeightHistory)) {
        data.bodyWeightHistory.forEach(function (entry) {
          weightLogs.push({
            id: uid(),
            value: Number(entry.value || entry.weight || 0),
            createdAt: entry.createdAt || entry.date || new Date().toISOString()
          });
        });
      }

      if (data.routines && Array.isArray(data.routines)) {
        data.routines.forEach(function (routine) {
          routines.push({
            id: uid(),
            name: routine.name || "Imported Routine",
            days: routine.days || "Imported",
            focus: routine.focus || "Imported from Hevy"
          });
        });
      }
    } catch (error) {
      preview.push({ title: "Import failed", source: fileName, merge: "Invalid JSON format" });
    }
  }

  function parseHevyCsv(text, workouts, routines, weightLogs, preview, fileName) {
    var lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) {
      preview.push({ title: "Import failed", source: fileName, merge: "CSV did not contain data rows" });
      return;
    }

    var headers = splitCsvLine(lines[0]).map(function (header) { return String(header || "").trim().toLowerCase(); });
    for (var i = 1; i < lines.length; i += 1) {
      var columns = splitCsvLine(lines[i]);
      if (!columns.length) continue;
      var row = {};
      for (var j = 0; j < headers.length; j += 1) row[headers[j]] = columns[j];

      var title = firstValue(row, ["workout_title", "title", "name"]);
      var date = firstValue(row, ["created_at", "date", "workout_date"]);
      var routineName = firstValue(row, ["routine_name", "routine"]);
      var weight = firstValue(row, ["bodyweight", "weight", "body_weight"]);

      if (title) {
        workouts.push(normalizeImportedWorkout(title, date, []));
      }

      if (routineName) {
        routines.push({ id: uid(), name: routineName, days: "Imported", focus: "Imported from Hevy CSV" });
      }

      if (weight && !isNaN(Number(weight))) {
        weightLogs.push({ id: uid(), value: Number(weight), createdAt: date || new Date().toISOString() });
      }
    }
  }

  function splitCsvLine(line) {
    var values = [];
    var current = "";
    var inQuotes = false;
    for (var i = 0; i < line.length; i += 1) {
      var char = line.charAt(i);
      if (char === '"' && line.charAt(i + 1) === '"') {
        current += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current);
    return values;
  }

  function firstValue(row, keys) {
    for (var i = 0; i < keys.length; i += 1) {
      if (row[keys[i]]) return row[keys[i]];
    }
    return "";
  }

  function normalizeImportedWorkout(title, createdAt, importedExercises) {
    var exercises = importedExercises && importedExercises.length
      ? importedExercises.map(function (exercise) {
          return {
            id: uid(),
            name: exercise.name || "Imported Exercise",
            sets: normalizeImportedSets(exercise.sets || exercise)
          };
        })
      : [{ id: uid(), name: "Imported Exercise", sets: [{ id: uid(), previous: "Imported", weight: 80, reps: 8, done: true }] }];

    var volume = 0;
    exercises.forEach(function (exercise) {
      exercise.sets.forEach(function (set) {
        volume += (Number(set.weight) || 0) * (Number(set.reps) || 0);
      });
    });

    return {
      id: uid(),
      title: title,
      createdAt: createdAt || new Date().toISOString(),
      durationMinutes: 45,
      volume: volume || 3200,
      calories: 380,
      likes: 0,
      comments: [],
      quote: "Imported from Hevy history.",
      exercises: exercises,
      health: { heartRateAvg: state.healthData.heartRate || 118, recovery: 78 }
    };
  }

  function normalizeImportedSets(rawSets) {
    if (!Array.isArray(rawSets)) {
      return [{ id: uid(), previous: "Imported", weight: 80, reps: 8, done: true }];
    }
    return rawSets.map(function (set) {
      return {
        id: uid(),
        previous: String((set.previousWeight || set.previous || "Imported")) + (set.previousReps ? " x " + set.previousReps : ""),
        weight: String(set.weight || set.kg || 0),
        reps: String(set.reps || set.count || 0),
        done: true
      };
    });
  }

  function previewHealthImport(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var text = String(reader.result || "");
      var summary = parseHealthExport(text, file.name);
      state.healthData = summary.healthData;
      state.healthImportDetails = summary.details;
      state.weightLogs = mergeWeightLogs(summary.weightLogs);
      state.integrations.appleHealth.connected = !!summary.healthData.importedAt;
      state.integrations.appleHealth.lastSync = summary.healthData.importedAt;
      state.integrations.appleWatch.connected = summary.healthData.heartRate > 0;
      state.integrations.appleWatch.lastSync = summary.healthData.importedAt;
      toast("Apple Health export imported.");
      render();
    };
    reader.readAsText(file);
  }

  function parseHealthExport(text, fileName) {
    var stepMatches = collectMatches(text, /Record[^>]*type="HKQuantityTypeIdentifierStepCount"[^>]*value="([0-9.]+)"/g);
    var calorieMatches = collectMatches(text, /Record[^>]*type="HKQuantityTypeIdentifierActiveEnergyBurned"[^>]*value="([0-9.]+)"/g);
    var heartMatches = collectMatches(text, /Record[^>]*type="HKQuantityTypeIdentifierHeartRate"[^>]*value="([0-9.]+)"/g);
    var bodyMassMatches = collectMatches(text, /Record[^>]*type="HKQuantityTypeIdentifierBodyMass"[^>]*value="([0-9.]+)"/g);

    var steps = sum(stepMatches) || extractFirstNumber(text, /steps[^0-9]*([0-9]+)/i);
    var activeCalories = Math.round(sum(calorieMatches) || extractFirstNumber(text, /active[^0-9]*([0-9]+)/i));
    var heartRate = average(heartMatches) || extractFirstNumber(text, /heart[^0-9]*([0-9]+)/i);
    var latestMass = bodyMassMatches.length ? bodyMassMatches[bodyMassMatches.length - 1] : extractFirstNumber(text, /body[^0-9]*([0-9]+(?:\.[0-9]+)?)/i);

    return {
      healthData: {
        source: fileName,
        steps: Math.round(steps || 0),
        activeCalories: Math.round(activeCalories || 0),
        heartRate: Math.round(heartRate || 0),
        recovery: heartRate ? Math.max(50, 100 - Math.round(heartRate / 2)) : 0,
        importedAt: new Date().toISOString()
      },
      details: [
        { label: "Step records", value: String(stepMatches.length) },
        { label: "Energy records", value: String(calorieMatches.length) },
        { label: "Heart-rate records", value: String(heartMatches.length) },
        { label: "Body-mass records", value: String(bodyMassMatches.length) },
        { label: "Latest imported body weight", value: latestMass ? String(latestMass) : "0", type: "body_mass_value" }
      ],
      weightLogs: latestMass ? [{
        id: uid(),
        value: Number(latestMass),
        createdAt: new Date().toISOString()
      }] : []
    };
  }

  function collectMatches(text, pattern) {
    var matches = [];
    var match;
    while ((match = pattern.exec(text))) {
      matches.push(Number(match[1]));
    }
    return matches;
  }

  function extractFirstNumber(text, pattern) {
    var match = text.match(pattern);
    return match ? Number(match[1]) : 0;
  }

  function sum(values) {
    return values.reduce(function (acc, value) { return acc + (Number(value) || 0); }, 0);
  }

  function average(values) {
    return values.length ? sum(values) / values.length : 0;
  }

  function exportData() {
    var data = JSON.stringify({
      apiBase: API,
      user: state.user,
      workouts: state.workouts,
      weightLogs: state.weightLogs,
      meals: state.meals,
      healthData: state.healthData,
      routines: state.routines,
      integrations: state.integrations
    }, null, 2);
    var blob = new Blob([data], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = "fitrank-export.json";
    link.click();
    URL.revokeObjectURL(url);
    toast("Export created.");
  }

  function recentWorkouts() {
    return state.workouts.slice(0, 4);
  }

  function buildAnalytics() {
    var allWorkouts = state.workouts.slice().sort(function(a, b) {
      return new Date(a.createdAt) - new Date(b.createdAt);
    });
    var workouts = filteredWorkouts();

    // Monthly volume and sessions from ALL workouts
    var monthlyVol = {};
    var monthlySess = {};
    allWorkouts.forEach(function(w) {
      var d = new Date(w.createdAt);
      if (isNaN(d)) return;
      var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2,'0');
      monthlyVol[key] = (monthlyVol[key] || 0) + (w.volume || 0);
      monthlySess[key] = (monthlySess[key] || 0) + 1;
    });
    var monthKeys = Object.keys(monthlyVol).sort();
    var monthLabels = monthKeys.map(function(k) { return k.slice(5); }); // MM only
    var monthVolValues = monthKeys.map(function(k) { return Math.round(monthlyVol[k]); });
    var monthSessValues = monthKeys.map(function(k) { return monthlySess[k]; });

    // Find top exercise (most sets)
    var exerciseCounts = {};
    allWorkouts.forEach(function(w) {
      (w.exercises || []).forEach(function(ex) {
        exerciseCounts[ex.name] = (exerciseCounts[ex.name] || 0) + (ex.sets ? ex.sets.length : 1);
      });
    });
    var topExercise = Object.keys(exerciseCounts).sort(function(a,b){
      return exerciseCounts[b] - exerciseCounts[a];
    })[0] || (state.selectedExercise !== 'All' ? state.selectedExercise : 'Top Lift');
    var targetExercise = state.selectedExercise !== 'All' ? state.selectedExercise : topExercise;

    // Strength progression for target exercise - best weight per workout day
    var strengthMap = {};
    allWorkouts.forEach(function(w) {
      var day = String(w.createdAt).slice(0,10);
      (w.exercises || []).forEach(function(ex) {
        if (ex.name === targetExercise) {
          (ex.sets || []).forEach(function(s) {
            var kg = parseFloat(s.weight) || 0;
            if (kg > (strengthMap[day] || 0)) strengthMap[day] = kg;
          });
        }
      });
    });
    var strengthDays = Object.keys(strengthMap).sort();
    var strengthValues = strengthDays.map(function(d) { return strengthMap[d]; });
    var strengthLabels = strengthDays.map(function(d) { return d.slice(5); });

    // Consistency - workout days per week in range
    var consistMap = {};
    workouts.forEach(function(w) {
      var day = String(w.createdAt).slice(0,10);
      consistMap[day] = (consistMap[day] || 0) + 1;
    });
    var consistDays = Object.keys(consistMap).sort();

    // Body weight
    var bwEntries = state.weightLogs.slice().sort(function(a,b){
      return new Date(a.createdAt) - new Date(b.createdAt);
    });
    var bwValues = bwEntries.map(function(e) { return Number(e.value) || 0; });
    var bwLabels = bwEntries.map(function(e) { return String(e.createdAt).slice(0,10).slice(5); });

    // Total volume all-time
    var totalVol = allWorkouts.reduce(function(acc, w) { return acc + (w.volume || 0); }, 0);
    var bestMonthKey = monthKeys.reduce(function(best, k) {
      return monthlyVol[k] > (monthlyVol[best] || 0) ? k : best;
    }, monthKeys[0] || '');

    var weekly = state.workouts.filter(function(w) {
      return new Date(w.createdAt) >= Date.now() - 7 * 86400000;
    });

    return {
      monthlyVolume: { values: monthVolValues, labels: monthLabels },
      monthlySessions: { values: monthSessValues, labels: monthLabels },
      strength: { values: strengthValues, labels: strengthLabels },
      topExercise: targetExercise,
      bodyWeight: { values: bwValues, labels: bwLabels },
      consistency: { values: consistDays.map(function(d){ return consistMap[d]; }), labels: consistDays.map(function(d){ return d.slice(5); }) },
      volume: { values: workouts.map(function(w){ return Math.round(w.volume||0); }), labels: workouts.map(function(w){ return String(w.createdAt).slice(5,10); }) },
      calories: { values: [], labels: [] },
      heartRate: { values: workouts.map(function(w){ return w.health && w.health.heartRateAvg || 0; }), labels: workouts.map(function(w){ return String(w.createdAt).slice(5,10); }) },
      prs: prList(),
      heat: muscleHeat(workouts),
      recoveryScore: computeRecoveryScore(workouts),
      restingHeartRate: computeRestingHeartRate(workouts),
      averageVolume: allWorkouts.length ? totalVol / allWorkouts.length : 0,
      totalVolume: totalVol,
      bestMonth: bestMonthKey ? bestMonthKey : '--',
      goalHelper: weekly.length + ' of 4 weekly workouts completed',
      workoutCount: workouts.length,
      importedHealth: !!state.healthData.importedAt
    };
  }

  function filteredWorkouts() {
    var cutoff = Date.now() - rangeDays() * 24 * 60 * 60 * 1000;
    return state.workouts.filter(function (workout) {
      var inRange = new Date(workout.createdAt).getTime() >= cutoff;
      var matchExercise = state.selectedExercise === "All" || workout.exercises.some(function (exercise) {
        return exercise.name === state.selectedExercise;
      });
      return inRange && matchExercise;
    }).sort(function(a, b) { return new Date(a.createdAt) - new Date(b.createdAt); });
  }

  function chartData(values, labels) {
    return { values: values.length ? values : [], labels: labels || [] };
  }

  function exerciseOptions() {
    var map = { All: true };
    state.workouts.forEach(function (workout) {
      workout.exercises.forEach(function (exercise) {
        map[exercise.name] = true;
      });
    });
    return Object.keys(map);
  }

  function prList() {
    var map = {};
    state.workouts.forEach(function (workout) {
      workout.exercises.forEach(function (exercise) {
        exercise.sets.forEach(function (set) {
          var score = (Number(set.weight) || 0) * 100 + (Number(set.reps) || 0);
          if (!map[exercise.name] || score > map[exercise.name].score) {
            map[exercise.name] = {
              label: exercise.name,
              value: (Number(set.weight) || 0) + " kg x " + (Number(set.reps) || 0),
              score: score
            };
          }
        });
      });
    });
    var list = Object.keys(map).map(function (key) { return map[key]; }).slice(0, 5);
    return list.length ? list : [{ label: "No PR yet", value: "Complete workouts to track records" }];
  }

  function muscleHeat(workouts) {
    var groups = { Chest: 0, Back: 0, Legs: 0, Shoulders: 0, Arms: 0, Core: 0 };
    workouts.forEach(function (workout) {
      workout.exercises.forEach(function (exercise) {
        groups[inferMuscle(exercise.name)] += 1;
      });
    });
    return Object.keys(groups).map(function (group) {
      return { group: group, count: groups[group] };
    });
  }

  function inferMuscle(name) {
    var lower = String(name).toLowerCase();
    if (lower.indexOf("bench") > -1 || lower.indexOf("fly") > -1) return "Chest";
    if (lower.indexOf("row") > -1 || lower.indexOf("pull") > -1) return "Back";
    if (lower.indexOf("squat") > -1 || lower.indexOf("dead") > -1 || lower.indexOf("leg") > -1) return "Legs";
    if (lower.indexOf("press") > -1 || lower.indexOf("raise") > -1) return "Shoulders";
    if (lower.indexOf("curl") > -1 || lower.indexOf("tricep") > -1) return "Arms";
    return "Core";
  }

  function maxWeight(workout) {
    var max = 0;
    workout.exercises.forEach(function (exercise) {
      exercise.sets.forEach(function (set) {
        max = Math.max(max, Number(set.weight) || 0);
      });
    });
    return max;
  }

  function streak() {
    var dates = {};
    state.workouts.forEach(function (workout) {
      dates[new Date(workout.createdAt).toISOString().slice(0, 10)] = true;
    });
    var count = 0;
    var cursor = new Date();
    while (dates[cursor.toISOString().slice(0, 10)]) {
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }

  function dashboardStats() {
    var weekCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    var weekly = state.workouts.filter(function (workout) { return new Date(workout.createdAt).getTime() >= weekCutoff; });
    var weeklyCalories = weekly.reduce(function (sum, workout) { return sum + (workout.calories || 0); }, 0);
    var workoutTarget = 4;
    return {
      streak: streak(),
      weeklyCalories: weeklyCalories,
      goalProgress: Math.min(100, Math.round((weekly.length / workoutTarget) * 100)),
      goalHelper: weekly.length + " of " + workoutTarget + " weekly workouts completed",
      recoveryProgress: computeRecoveryScore(weekly.length ? weekly : state.workouts),
      quote: motivationalQuote()
    };
  }

  function rangeDays() {
    if (state.dateRange === "1y") return 365;
    if (state.dateRange === "1m") return 30;
    if (state.dateRange === "7d") return 7;
    return 3;
  }

  function aggregateByDay(workouts, picker) {
    var map = {};
    workouts.forEach(function (workout) {
      var key = String(workout.createdAt || "").slice(0, 10);
      map[key] = (map[key] || 0) + (Number(picker(workout)) || 0);
    });
    var labels = Object.keys(map).sort();
    var values = labels.map(function (key) { return map[key]; });
    return { labels: labels, values: values };
  }

  function computeRecoveryScore(workouts) {
    if (state.healthData.recovery) return state.healthData.recovery;
    if (!workouts.length) return 0;
    var averageHeartRate = average(workouts.map(function (workout) {
      return workout.health && workout.health.heartRateAvg ? workout.health.heartRateAvg : 0;
    }).filter(Boolean));
    return Math.max(45, Math.min(98, Math.round(92 - (averageHeartRate ? averageHeartRate / 4 : 8) + Math.min(8, workouts.length))));
  }

  function computeRestingHeartRate(workouts) {
    if (state.healthData.heartRate) return Math.max(46, state.healthData.heartRate - 10);
    var sample = average(workouts.map(function (workout) {
      return workout.health && workout.health.heartRateAvg ? workout.health.heartRateAvg : 0;
    }).filter(Boolean));
    return sample ? Math.max(48, Math.round(sample - 14)) : 0;
  }

  function extractHealthWeightSeries() {
    return state.healthImportDetails.filter(function (item) {
      return item.type === "body_mass_value";
    }).map(function (item) {
      return Number(item.value || 0);
    }).filter(Boolean).slice(-12);
  }

  function workoutTimer() {
    var seconds = Math.max(0, Math.floor((Date.now() - state.liveWorkout.startedAt) / 1000));
    var mins = String(Math.floor(seconds / 60)).padStart(2, "0");
    var secs = String(seconds % 60).padStart(2, "0");
    return mins + ":" + secs;
  }

  function motivationalQuote() {
    var quotes = [
      "Consistency compounds faster than motivation.",
      "Every logged rep is proof you showed up.",
      "Train with intent, recover with discipline.",
      "Stack sessions, not excuses."
    ];
    return quotes[Math.floor(Date.now() / 1000) % quotes.length];
  }

  function trainingInsight(analytics) {
    if (!analytics.averageVolume) {
      return "Finish a few workouts to unlock personalized training insights.";
    }
    if (analytics.recoveryScore >= 80) {
      return "Recovery is strong. You can likely push one more high-intensity session this week.";
    }
    if (analytics.recoveryScore >= 65) {
      return "Training is trending well. Keep volume steady and prioritize sleep before your next heavy day.";
    }
    return "Recovery looks limited. Consider a lighter session or additional rest before chasing PRs.";
  }

  function buildAdminAnalytics(normalUsers) {
    var freeUsers = normalUsers.filter(function (user) { return user.plan !== "PRO"; }).length;
    var proUsers = normalUsers.filter(function (user) { return user.plan === "PRO"; }).length;
    var healthImports = state.healthData.importedAt ? 1 : 0;
    var hevyReady = state.integrations.hevyImport.connected ? 1 : 0;
    var mealHeavy = state.meals.length;
    var workoutHeavy = state.workouts.length;
    return {
      freeUsers: freeUsers,
      proUsers: proUsers,
      healthImports: healthImports,
      hevyReady: hevyReady,
      planMix: [freeUsers, proUsers],
      activityMix: [workoutHeavy, mealHeavy, state.weightLogs.length, state.importPreview.length],
      summary: proUsers ? "Premium members are active in the current dataset. Use the user controls above to upgrade, downgrade, or prune accounts while monitoring import adoption and overall member activity." : "Most users are still on the free plan. Premium can now unlock form demos, advanced analytics, exports, and cleaner import tooling."
    };
  }

  function computeBest1RM() {
    var best = {};
    state.workouts.forEach(function (workout) {
      (workout.exercises || []).forEach(function (exercise) {
        (exercise.sets || []).forEach(function (set) {
          var w = Number(set.weight) || 0;
          var r = Number(set.reps) || 0;
          if (w > 0 && r > 0) {
            var epley = Math.round(w * (1 + r / 30));
            if (!best[exercise.name] || epley > best[exercise.name].oneRM) {
              best[exercise.name] = { exercise: exercise.name, weight: w, reps: r, oneRM: epley };
            }
          }
        });
      });
    });
    return Object.keys(best).map(function (k) { return best[k]; }).slice(0, 6);
  }

  function computeGoalForecast() {
    var weekMs = 7 * 24 * 60 * 60 * 1000;
    var now = Date.now();
    var last4 = state.workouts.filter(function (w) {
      return now - new Date(w.createdAt).getTime() < 4 * weekMs;
    });
    var pace = parseFloat((last4.length / 4).toFixed(1));
    if (pace >= 4) {
      return { label: "On track! Goal achieved.", detail: "Hitting " + pace + " sessions/week which meets your 4-session weekly goal.", pace: String(pace) };
    }
    if (pace === 0) {
      return { label: "No recent sessions.", detail: "Start logging workouts to generate a forecast.", pace: "0" };
    }
    var weeksNeeded = Math.ceil((4 - pace) / 0.5);
    return {
      label: "~" + weeksNeeded + " weeks to consistent goal pace",
      detail: "At " + pace + " sessions/week, gradually increase by half a session per week to reach 4/week.",
      pace: String(pace)
    };
  }

  function computeAIInsights() {
    var insights = [];
    var analytics = buildAnalytics();
    if (!state.workouts.length) {
      insights.push({ title: "Start logging workouts", text: "Complete a few workouts to receive personalized AI coaching insights." });
      return insights;
    }
    if (analytics.recoveryScore < 65) {
      insights.push({ title: "Recovery is low", text: "Score: " + analytics.recoveryScore + "%. Add a rest day or a light mobility session before your next heavy lift." });
    } else if (analytics.recoveryScore >= 80) {
      insights.push({ title: "Recovery looks great", text: "Score: " + analytics.recoveryScore + "%. You are primed for a high-intensity session. Consider pushing for a PR." });
    }
    if (analytics.averageVolume > 0 && analytics.averageVolume < 2000) {
      insights.push({ title: "Increase training volume", text: "Avg volume " + Math.round(analytics.averageVolume) + " kg/session. Add one extra set per compound lift to stimulate more growth." });
    } else if (analytics.averageVolume >= 4000) {
      insights.push({ title: "High volume detected", text: "Avg " + Math.round(analytics.averageVolume) + " kg/session. Plan a deload week every 4-6 weeks to prevent overtraining." });
    }
    var weekly = state.workouts.filter(function (w) {
      return Date.now() - new Date(w.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000;
    });
    if (!weekly.length) {
      insights.push({ title: "No sessions this week", text: "No workout logged in 7 days. Even a 20-minute session builds long-term consistency." });
    } else if (weekly.length >= 5) {
      insights.push({ title: "High weekly frequency", text: "You have done " + weekly.length + " sessions this week. Include at least one full rest day to recover properly." });
    }
    if (!insights.length) {
      insights.push({ title: "Training is well-balanced", text: "Everything looks solid. Keep the consistency and nudge intensity by 2-5% over the next 2 weeks." });
    }
    return insights;
  }

  function exportCsv() {
    if (!requirePremiumFeature("Premium CSV export")) return;
    var header = ["Date", "Workout", "Duration(min)", "Volume(kg)", "Calories", "Exercise", "Set", "Weight", "Reps"];
    var rows = [header];
    state.workouts.forEach(function (workout) {
      var exercises = workout.exercises && workout.exercises.length ? workout.exercises : [{ name: workout.title || "Workout", sets: [] }];
      exercises.forEach(function (exercise) {
        var sets = exercise.sets && exercise.sets.length ? exercise.sets : [{ weight: "", reps: "" }];
        sets.forEach(function (set, i) {
          rows.push([
            workout.createdAt || "",
            workout.title || "",
            workout.durationMinutes || "",
            workout.volume || "",
            workout.calories || "",
            exercise.name || "",
            i + 1,
            set.weight || "",
            set.reps || ""
          ]);
        });
      });
    });
    var csv = rows.map(function (row) {
      return row.map(function (cell) {
        var s = String(cell == null ? "" : cell).replace(/"/g, '""');
        return '"' + s + '"';
      }).join(",");
    }).join("\n");
    var blob = new Blob([csv], { type: "text/csv" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "fitrank-workouts.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast("CSV export downloaded.");
  }



  function findExerciseById(exerciseId) {
    for (var i = 0; i < state.liveWorkout.exercises.length; i += 1) {
      if (state.liveWorkout.exercises[i].id === exerciseId) return state.liveWorkout.exercises[i];
    }
    return null;
  }

  function previousSetHint(name) {
    var lower = String(name || "").toLowerCase();
    if (lower.indexOf("squat") > -1) return "Start with your working squat load";
    if (lower.indexOf("bench") > -1 || lower.indexOf("press") > -1) return "Start with your working press load";
    if (lower.indexOf("row") > -1 || lower.indexOf("pull") > -1) return "Start with your working pull load";
    return "No history yet";
  }

  function requirePremiumStatusText() {
    if (isAdminUser() || isPremiumUser()) return { allowed: true, message: "" };
    return {
      allowed: false,
      message: "Animated form demos are available for premium users only."
    };
  }

  function exerciseMeta(name) {
    for (var i = 0; i < EXERCISE_LIBRARY.length; i += 1) {
      if (EXERCISE_LIBRARY[i].name === name) return EXERCISE_LIBRARY[i];
    }
    return {
      name: name || "Exercise",
      category: "General",
      primaryMuscle: "Full Body",
      equipment: "Any",
      demoType: "generic",
      cues: ["Stay controlled", "Use a pain-free range", "Brace before each rep"]
    };
  }

  function buildExerciseLibrary() {
    var seed = [
      "Barbell Bench Press|Chest|Pectorals|Barbell|press",
      "Incline Barbell Bench Press|Chest|Upper Chest|Barbell|press",
      "Decline Bench Press|Chest|Lower Chest|Barbell|press",
      "Dumbbell Bench Press|Chest|Pectorals|Dumbbell|press",
      "Incline Dumbbell Press|Chest|Upper Chest|Dumbbell|press",
      "Chest Fly|Chest|Pectorals|Cable|fly",
      "Cable Fly|Chest|Pectorals|Cable|fly",
      "Push Up|Chest|Pectorals|Bodyweight|press",
      "Weighted Push Up|Chest|Pectorals|Bodyweight|press",
      "Dip|Chest|Chest and Triceps|Bodyweight|press",
      "Machine Chest Press|Chest|Pectorals|Machine|press",
      "Pec Deck|Chest|Pectorals|Machine|fly",
      "Pull Up|Back|Lats|Bodyweight|pull",
      "Chin Up|Back|Lats and Biceps|Bodyweight|pull",
      "Lat Pulldown|Back|Lats|Cable|pull",
      "Wide Grip Lat Pulldown|Back|Upper Back|Cable|pull",
      "Seated Cable Row|Back|Mid Back|Cable|row",
      "Chest Supported Row|Back|Mid Back|Machine|row",
      "Barbell Row|Back|Lats|Barbell|row",
      "Pendlay Row|Back|Upper Back|Barbell|row",
      "Single Arm Dumbbell Row|Back|Lats|Dumbbell|row",
      "T Bar Row|Back|Mid Back|Machine|row",
      "Face Pull|Back|Rear Delts|Cable|row",
      "Straight Arm Pulldown|Back|Lats|Cable|pull",
      "Back Extension|Back|Lower Back|Bodyweight|hinge",
      "Back Squat|Legs|Quads|Barbell|squat",
      "Front Squat|Legs|Quads|Barbell|squat",
      "Goblet Squat|Legs|Quads|Dumbbell|squat",
      "Hack Squat|Legs|Quads|Machine|squat",
      "Leg Press|Legs|Quads|Machine|squat",
      "Walking Lunge|Legs|Glutes|Dumbbell|lunge",
      "Reverse Lunge|Legs|Glutes|Dumbbell|lunge",
      "Bulgarian Split Squat|Legs|Quads|Dumbbell|lunge",
      "Step Up|Legs|Glutes|Dumbbell|lunge",
      "Romanian Deadlift|Legs|Hamstrings|Barbell|hinge",
      "Conventional Deadlift|Legs|Posterior Chain|Barbell|hinge",
      "Sumo Deadlift|Legs|Adductors|Barbell|hinge",
      "Hip Thrust|Legs|Glutes|Barbell|hinge",
      "Glute Bridge|Legs|Glutes|Bodyweight|hinge",
      "Hamstring Curl|Legs|Hamstrings|Machine|curl",
      "Leg Extension|Legs|Quads|Machine|extension",
      "Standing Calf Raise|Legs|Calves|Machine|calf",
      "Seated Calf Raise|Legs|Calves|Machine|calf",
      "Overhead Press|Shoulders|Delts|Barbell|press",
      "Seated Dumbbell Press|Shoulders|Delts|Dumbbell|press",
      "Arnold Press|Shoulders|Delts|Dumbbell|press",
      "Lateral Raise|Shoulders|Side Delts|Dumbbell|raise",
      "Cable Lateral Raise|Shoulders|Side Delts|Cable|raise",
      "Front Raise|Shoulders|Front Delts|Dumbbell|raise",
      "Rear Delt Fly|Shoulders|Rear Delts|Dumbbell|raise",
      "Upright Row|Shoulders|Upper Traps|Barbell|row",
      "Shrug|Shoulders|Traps|Dumbbell|carry",
      "Barbell Curl|Arms|Biceps|Barbell|curl",
      "EZ Bar Curl|Arms|Biceps|Barbell|curl",
      "Dumbbell Curl|Arms|Biceps|Dumbbell|curl",
      "Hammer Curl|Arms|Brachialis|Dumbbell|curl",
      "Preacher Curl|Arms|Biceps|Machine|curl",
      "Cable Curl|Arms|Biceps|Cable|curl",
      "Triceps Pushdown|Arms|Triceps|Cable|triceps",
      "Overhead Triceps Extension|Arms|Triceps|Cable|triceps",
      "Skull Crusher|Arms|Triceps|Barbell|triceps",
      "Close Grip Bench Press|Arms|Triceps|Barbell|press",
      "Bench Dip|Arms|Triceps|Bodyweight|triceps",
      "Wrist Curl|Arms|Forearms|Dumbbell|curl",
      "Reverse Curl|Arms|Forearms|Barbell|curl",
      "Plank|Core|Abs|Bodyweight|core",
      "Side Plank|Core|Obliques|Bodyweight|core",
      "Hanging Leg Raise|Core|Abs|Bodyweight|core",
      "Crunch|Core|Abs|Bodyweight|core",
      "Cable Crunch|Core|Abs|Cable|core",
      "Russian Twist|Core|Obliques|Bodyweight|core",
      "Ab Wheel Rollout|Core|Abs|Bodyweight|core",
      "Dead Bug|Core|Core Stability|Bodyweight|core",
      "Mountain Climber|Core|Abs|Bodyweight|core",
      "Farmer Carry|Conditioning|Grip and Core|Dumbbell|carry",
      "Sled Push|Conditioning|Leg Drive|Sled|carry",
      "Battle Rope Waves|Conditioning|Shoulders|Rope|cardio",
      "Box Jump|Conditioning|Power|Plyo Box|jump",
      "Jump Squat|Conditioning|Power|Bodyweight|jump",
      "Burpee|Conditioning|Full Body|Bodyweight|cardio",
      "Bike Erg|Conditioning|Cardio|Machine|cardio",
      "Treadmill Run|Conditioning|Cardio|Machine|cardio",
      "Rowing Machine|Conditioning|Cardio|Machine|row",
      "Elliptical|Conditioning|Cardio|Machine|cardio",
      "Jump Rope|Conditioning|Cardio|Rope|cardio",
      "Kettlebell Swing|Conditioning|Posterior Chain|Kettlebell|hinge",
      "Kettlebell Clean|Conditioning|Full Body|Kettlebell|hinge",
      "Kettlebell Snatch|Conditioning|Full Body|Kettlebell|hinge",
      "Thruster|Conditioning|Full Body|Barbell|press",
      "Clean and Jerk|Olympic|Full Body|Barbell|hinge",
      "Power Clean|Olympic|Full Body|Barbell|hinge",
      "Snatch|Olympic|Full Body|Barbell|hinge",
      "Push Press|Olympic|Delts|Barbell|press",
      "High Pull|Olympic|Upper Back|Barbell|pull",
      "Landmine Press|Shoulders|Delts|Barbell|press",
      "Landmine Squat|Legs|Quads|Barbell|squat",
      "Smith Machine Squat|Legs|Quads|Machine|squat",
      "Smith Machine Incline Press|Chest|Upper Chest|Machine|press",
      "Machine Row|Back|Mid Back|Machine|row",
      "Assisted Pull Up|Back|Lats|Machine|pull",
      "Assisted Dip|Chest|Chest and Triceps|Machine|press",
      "Cable Kickback|Legs|Glutes|Cable|hinge",
      "Adductor Machine|Legs|Adductors|Machine|extension",
      "Abductor Machine|Legs|Glute Medius|Machine|extension",
      "Good Morning|Legs|Hamstrings|Barbell|hinge",
      "Nordic Curl|Legs|Hamstrings|Bodyweight|curl",
      "Reverse Hyper|Back|Lower Back|Machine|hinge",
      "Pallof Press|Core|Anti-Rotation Core|Cable|core"
    ];

    return seed.map(function (entry) {
      var parts = entry.split("|");
      return {
        name: parts[0],
        category: parts[1],
        primaryMuscle: parts[2],
        equipment: parts[3],
        demoType: parts[4],
        cues: buildExerciseCues(parts[4], parts[2])
      };
    });
  }

  function buildExerciseCues(demoType, muscle) {
    var byType = {
      press: ["Brace your torso", "Control the descent", "Finish with stacked wrists"],
      fly: ["Slight elbow bend", "Open under control", "Squeeze through the chest"],
      row: ["Lead with elbows", "Keep ribcage down", "Pause at contraction"],
      pull: ["Drive elbows down", "Avoid shrugging", "Control the lowering phase"],
      squat: ["Brace before each rep", "Knees track over toes", "Drive up through mid-foot"],
      lunge: ["Stay tall", "Push evenly through the front foot", "Keep the rear leg balanced"],
      hinge: ["Push hips back", "Keep spine neutral", "Finish with glutes, not lower back"],
      curl: ["Keep upper arms quiet", "Use full range", "Lower slower than you lift"],
      triceps: ["Elbows stay fixed", "Lock out with control", "Avoid torso swing"],
      raise: ["Soft elbows", "Lift only to shoulder height", "Avoid momentum"],
      extension: ["Control both directions", "Use the target muscle", "Avoid snapping the joint"],
      calf: ["Pause at the top", "Stretch at the bottom", "Stay balanced"],
      core: ["Exhale through effort", "Brace before moving", "Keep tension continuous"],
      cardio: ["Keep rhythm smooth", "Stay tall", "Breathe consistently"],
      carry: ["Stand tall", "Keep shoulders packed", "Walk under control"],
      jump: ["Land softly", "Load hips first", "Reset between reps"]
    };
    return byType[demoType] || ["Move with control", "Use full range", "Keep tension on " + muscle];
  }

  function initials(value) {
    var parts = String(value || "FR").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "FR";
    return parts.slice(0, 2).map(function (part) { return part.charAt(0).toUpperCase(); }).join("");
  }

  function number(value) {
    return Number(value || 0).toLocaleString();
  }

  function formatDateTime(value) {
    var date = new Date(value);
    return date.toLocaleDateString([], { month: "short", day: "numeric" }) + " - " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function formatShortDate(value) {
    return new Date(value).toLocaleDateString([], { month: "short", day: "numeric" });
  }

  function labelize(value) {
    return String(value).replace(/([A-Z])/g, " $1").replace(/^./, function (char) { return char.toUpperCase(); });
  }

  function hasPositive(values) {
    for (var i = 0; i < values.length; i += 1) {
      if (values[i] > 0) return true;
    }
    return false;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  function syncCurrentUserRecord() {
    if (!state.user) return;
    var existing = null;
    for (var i = 0; i < state.users.length; i += 1) {
      if (state.users[i].email === state.user.email) {
        existing = state.users[i];
        state.users[i] = {
          id: state.users[i].id,
          name: state.user.name,
          email: state.user.email,
          goal: state.user.goal,
          plan: state.user.plan,
          role: state.admin ? "ADMIN" : "USER",
          createdAt: state.users[i].createdAt || new Date().toISOString()
        };
      }
    }
    if (!existing) {
      state.users.push({
        id: state.user.id || uid(),
        name: state.user.name,
        email: state.user.email,
        goal: state.user.goal,
        plan: state.user.plan,
        role: state.admin ? "ADMIN" : "USER",
        createdAt: new Date().toISOString()
      });
    }
  }
})();
