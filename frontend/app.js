(function () {
  var API = defaultApiBase();
  var STORAGE = {
    user: "fitrank-user",
    admin: "fitrank-admin",
    users: "fitrank-users",
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
  var ADMIN_PAGES = ["admin", "integrations", "settings"];
  var PREMIUM_PAGES = ["analytics"];
  var PREMIUM_EXPORT_ACTIONS = ["export-data"];

  var state = {
    authMode: "login",
    showPassword: false,
    rememberMe: true,
    authError: "",
    toast: "",
    page: location.hash.replace("#", "") || "login",
    search: "",
    user: load(STORAGE.user, null),
    admin: load(STORAGE.admin, null),
    users: load(STORAGE.users, []),
    workouts: load(STORAGE.workouts, []),
    weightLogs: load(STORAGE.weight, []),
    meals: load(STORAGE.meals, []),
    healthData: load(STORAGE.health, {
      source: "",
      steps: 0,
      activeCalories: 0,
      heartRate: 0,
      recovery: 0,
      importedAt: null
    }),
    routines: load(STORAGE.routines, [
      { id: uid(), name: "Push Day", days: "Mon / Thu", focus: "Chest, Shoulders, Triceps" },
      { id: uid(), name: "Pull Day", days: "Tue / Fri", focus: "Back, Rear Delts, Biceps" },
      { id: uid(), name: "Legs", days: "Wed", focus: "Quads, Glutes, Hamstrings" },
      { id: uid(), name: "Upper Lower", days: "Sat", focus: "Balanced hypertrophy" },
      { id: uid(), name: "Full Body", days: "Sun", focus: "General fitness" }
    ]),
    integrations: load(STORAGE.integrations, {
      appleHealth: { connected: false, autoSync: false, lastSync: null, method: "file_import" },
      appleWatch: { connected: false, autoSync: false, lastSync: null, method: "file_import" },
      hevyImport: { connected: false, autoSync: true, lastSync: null, method: "file_import" }
    }),
    preferences: load(STORAGE.prefs, {
      units: "kg",
      distance: "km",
      restTimer: 90,
      autoComplete: false,
      smartSuggestions: true,
      compactMode: false,
      accent: "blue-purple",
      syncFrequency: "Hourly"
    }),
    profile: load(STORAGE.profile, {
      fullName: "Arjun Nair",
      bio: "Training for strength and longevity.",
      avatar: "AN",
      joinDate: "2026-04-01T09:00:00.000Z"
    }),
    pendingMeal: { name: "", calories: "", protein: "", water: "" },
    pendingWeight: "",
    selectedExercise: "All",
    dateRange: "30d",
    importPreview: [],
    liveWorkout: loadLiveWorkout(),
    healthImportDetails: load("fitrank-health-import-details", [])
  };

  if (!state.users.length) {
    state.users = [
      { id: 1, name: "Arjun Nair", email: "athlete@fitrank.app", goal: "Strength", plan: "FREE", role: "USER", createdAt: "2026-04-01T09:00:00.000Z" },
      { id: 999, name: "FitRank Admin", email: "admin@fitrank.app", goal: "Administration", plan: "ADMIN", role: "ADMIN", createdAt: "2026-04-01T09:00:00.000Z" }
    ];
  }

  window.addEventListener("hashchange", function () {
    state.page = location.hash.replace("#", "") || (state.user ? (state.admin ? "admin" : "dashboard") : "login");
    render();
  });

  setInterval(function () {
    if (state.user && state.page === "workouts") {
      render();
    }
  }, 1000);

  document.addEventListener("click", handleClick);
  document.addEventListener("submit", handleSubmit);
  document.addEventListener("input", handleInput);
  document.addEventListener("change", handleChange);

  render();

  function defaultApiBase() {
    return location.protocol === "file:" ? "http://localhost:8080/api" : location.protocol + "//" + location.hostname + ":8080/api";
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
      name: "Upper Power",
      startedAt: Date.now(),
      heartRate: 0,
      notes: "",
      exercises: [
        {
          id: uid(),
          name: "Bench Press",
          notes: "",
          sets: [
            { id: uid(), previous: "80 x 8", weight: "82.5", reps: "8", done: false },
            { id: uid(), previous: "80 x 8", weight: "82.5", reps: "7", done: false }
          ]
        },
        {
          id: uid(),
          name: "Chest Supported Row",
          notes: "",
          sets: [
            { id: uid(), previous: "55 x 10", weight: "57.5", reps: "10", done: false }
          ]
        }
      ]
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
    save(STORAGE.workouts, state.workouts);
    save(STORAGE.weight, state.weightLogs);
    save(STORAGE.meals, state.meals);
    save(STORAGE.health, state.healthData);
    save(STORAGE.routines, state.routines);
    save(STORAGE.integrations, state.integrations);
    save(STORAGE.prefs, state.preferences);
    save(STORAGE.profile, state.profile);
    save("fitrank-health-import-details", state.healthImportDetails);
  }

  function allowedPages() {
    return state.admin ? ADMIN_PAGES : MEMBER_PAGES;
  }

  function ensureRouteAccess() {
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
              '<p>Responsive dashboard, live logging, routines, analytics, nutrition, integrations, profile, settings, and premium upgrade flows with a polished SaaS feel.</p>' +
              '<div class="pill-row">' +
                '<span>Apple Health import</span>' +
                '<span>Apple Watch export support</span>' +
                '<span>Hevy import</span>' +
                '<span>Real progress charts</span>' +
              '</div>' +
            '</div>' +
          '</section>' +
          '<section class="glass auth-card">' + renderMemberCard() + '</section>' +
        '</div>' +
      '</div>';
  }

  function renderMemberCard() {
    var signup = state.authMode === "signup";
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
        (state.authError ? '<div class="auth-error">' + escapeHtml(state.authError) + "</div>" : "") +
        '<button class="btn" type="submit">' + (signup ? "Create Account" : "Login") + "</button>" +
      "</form>" +
      '<div style="height:18px"></div>' +
      '<div class="divider">OR</div>' +
      '<div style="height:18px"></div>' +
      '<div class="form-row">' +
        '<button class="btn-secondary" data-action="oauth-google" type="button">Continue with Google</button>' +
        '<button class="btn-secondary" data-action="oauth-apple" type="button">Continue with Apple</button>' +
      "</div>" +
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
      ["admin", "Admin Dashboard"],
      ["integrations", "Integrations"],
      ["settings", "Settings"]
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
            '<div class="user-chip"><div class="avatar">' + escapeHtml((state.user.name || "FR").slice(0, 2).toUpperCase()) + "</div><div><strong>" + escapeHtml(state.user.name) + "</strong><p>" + escapeHtml(state.user.email) + '</p></div><button class="btn-ghost" data-action="logout">Logout</button></div>' +
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
    var hasHealth = state.integrations.appleHealth.connected && state.healthData.importedAt;
    return '' +
      '<div class="cards-two">' +
        '<section class="glass-strong panel hero-panel">' +
          '<div><p class="eyebrow">Dashboard</p><h2>Welcome back, ' + escapeHtml(state.user.name) + '.</h2><p>Your training hub combines workouts, recovery, nutrition, imported health data, and progress.</p></div>' +
          '<div class="quick-actions">' +
            button("Start Workout", "workouts", true) +
            button("Continue Routine", "routines", false) +
            button("Log Weight", "progress", false) +
            button("Nutrition", "nutrition", false) +
          "</div>" +
        "</section>" +
        '<section class="glass panel"><p class="eyebrow">Apple Health / Watch</p>' +
          (hasHealth
            ? '<div class="cards-two">' +
                metric("Steps", number(state.healthData.steps)) +
                metric("Active Calories", number(state.healthData.activeCalories) + " kcal") +
                metric("Heart Rate", number(state.healthData.heartRate) + " bpm") +
                metric("Recovery", number(state.healthData.recovery) + "%") +
              "</div>"
            : '<div class="mini-card"><strong>Not connected</strong><p>Direct Apple Health and Apple Watch sync requires a native iOS bridge. In this web build, import an Apple Health export from Integrations.</p></div>') +
          '<div style="height:16px"></div><div class="mini-card"><strong>' + escapeHtml(stats.quote) + '</strong><p>Motivational quote</p></div></section>' +
      "</div>" +
      '<div class="stats-four">' +
        stat("Workout streak", stats.streak + " days", "Based on real saved workouts") +
        stat("Weekly calories burned", number(stats.weeklyCalories), "From workout history") +
        stat("Goal progress", stats.goalProgress + "%", stats.goalHelper) +
        stat("Nutrition progress", mealProgress() + "%", "From meal logging") +
      "</div>" +
      '<div class="cards-three">' +
        '<section class="glass panel"><h3>Goal Progress Rings</h3><div class="ring-grid">' +
          ring("Workouts", stats.goalProgress) +
          ring("Recovery", hasHealth ? number(state.healthData.recovery) : 0) +
          ring("Nutrition", mealProgress()) +
        "</div></section>" +
        '<section class="glass panel"><h3>Recent Workouts</h3>' +
          (recentWorkouts().length
            ? recentWorkouts().map(function (workout) {
                return '<div class="mini-card"><strong>' + escapeHtml(workout.title) + "</strong><p>" + formatDateTime(workout.createdAt) + " - " + workout.durationMinutes + " min - " + number(workout.volume) + " kg volume</p></div>";
              }).join("")
            : "<p>No workouts yet. Start a session to populate your dashboard.</p>") +
        "</section>" +
        '<section class="glass panel"><h3>Quick Sync Status</h3>' +
          Object.keys(state.integrations).map(function (key) {
            var item = state.integrations[key];
            return '<div class="mini-card"><strong>' + escapeHtml(labelize(key)) + "</strong><p>" + (item.connected ? "Last sync " + formatDateTime(item.lastSync || new Date().toISOString()) : "Not connected") + "</p></div>";
          }).join("") +
        "</section>" +
      "</div>";
  }

  function renderWorkouts() {
    var watchConnected = state.integrations.appleWatch.connected && state.healthData.heartRate;
    return '' +
      '<div class="page-head">' +
        '<div><p class="eyebrow">Live Workout Tracker</p><h2>' + escapeHtml(state.liveWorkout.name) + '</h2><p>Running timer, inline set editing, routine starts, and honest Apple Watch export support.</p></div>' +
        '<div class="button-row">' +
          '<div class="mini-card"><strong>' + workoutTimer() + '</strong><p>Running Timer</p></div>' +
          '<div class="mini-card"><strong>' + (watchConnected ? number(state.healthData.heartRate) + " bpm" : "Not imported") + '</strong><p>Apple Watch Heart Rate</p></div>' +
          '<button class="btn" data-action="finish-workout">Finish Workout</button>' +
        "</div>" +
      "</div>" +
      state.liveWorkout.exercises.map(renderExerciseCard).join("") +
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
          return '<div class="glass panel routine-card"><h3>' + escapeHtml(routine.name) + "</h3><p>" + escapeHtml(routine.focus) + "</p><p>" + escapeHtml(routine.days) + '</p><div class="button-row"><button class="btn" data-action="start-routine" data-routine="' + routine.id + '">Start</button><button class="btn-secondary" data-action="edit-routine" data-routine="' + routine.id + '">Edit</button><button class="btn-secondary" data-action="duplicate-routine" data-routine="' + routine.id + '">Duplicate</button><button class="btn-secondary" data-action="delete-routine" data-routine="' + routine.id + '">Delete</button></div></div>';
        }).join("") +
      "</div>";
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
        '<div><p class="eyebrow">Progress & Analytics</p><h2>Real charts from your saved data</h2></div>' +
        '<div class="button-row">' +
          select('range-filter', state.dateRange, ['7d', '30d', '90d']) +
          select('exercise-filter', state.selectedExercise, exerciseOptions()) +
          '<button class="btn-secondary" data-action="export-data">Export Data</button>' +
        '</div>' +
      '</div>' +
      '<div class="cards-two">' +
        chartCard('Strength progression', renderLineChart(analytics.strength)) +
        chartCard('Volume lifted', renderBars(analytics.volume.values)) +
        chartCard('Workout consistency', renderLineChart(analytics.consistency)) +
        chartCard('Body weight graph', renderLineChart(analytics.bodyWeight)) +
        chartCard('Heart rate trend analysis', renderLineChart(analytics.heartRate)) +
        chartCard('Calories vs workouts graph', renderBars(analytics.calories.values)) +
      '</div>' +
      '<div class="cards-three">' +
        '<section class="glass panel"><h3>PR Tracker</h3>' + prCards + '</section>' +
        '<section class="glass panel"><h3>Muscle Group Frequency</h3><div class="heatmap">' + heatCards + '</div></section>' +
        '<section class="glass panel"><h3>Log Body Weight</h3>' +
          field('Weight', '<input data-input="weight-log" value="' + escapeAttr(state.pendingWeight) + '" placeholder="Enter body weight">') +
          '<div class="button-row"><button class="btn" data-action="save-weight">Save Weight</button></div>' +
          '<div style="height:12px"></div>' +
          '<div class="mini-card"><strong>' + analytics.recoveryScore + '%</strong><p>Recovery score from imported heart-rate context and workout consistency.</p></div>' +
        '</section>' +
      '</div>';
  }

  function renderAnalytics() {
    var premium = isPremiumUser();
    var analytics = buildAnalytics();
    if (!premium) {
      return '' +
        '<div class="cards-two">' +
          '<section class="glass panel"><p class="eyebrow">Premium Analytics</p><h2>Premium required</h2><p>Free members can use Progress charts. Premium unlocks recovery summaries, average volume insights, deeper coaching panels, and premium exports. Ask an admin to upgrade your account.</p><div class="badge">Admin-managed feature</div></section>' +
          '<section class="glass panel"><h3>Available Now</h3><div class="pill-row"><span>Workout logging</span><span>Routine library</span><span>Progress charts</span><span>Nutrition logging</span><span>Hevy import</span></div></section>' +
        "</div>";
    }

    return '' +
      '<div class="cards-three">' +
        '<section class="glass panel"><h3>Advanced Analytics</h3>' +
          metric("Recovery score", analytics.recoveryScore + "%") +
          metric("Resting HR", analytics.restingHeartRate + " bpm") +
          metric("Average volume", number(Math.round(analytics.averageVolume)) + " kg") +
        "</section>" +
        '<section class="glass panel"><h3>Training Insight</h3><p>' + escapeHtml(trainingInsight(analytics)) + '</p></section>' +
        '<section class="glass panel"><h3>Habit Summary</h3><p>Nutrition adherence is at ' + mealProgress() + "% today. Weekly workout target is " + analytics.goalHelper + ".</p></section>" +
      "</div>";
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
          '</p><div class="button-row"><button class="btn-secondary" data-action="import-health-export">Import Health Export</button><button class="btn-secondary" data-action="toggle-auto-sync" data-key="appleHealth">Import Status ' + (state.integrations.appleHealth.autoSync ? "Tracked" : "Manual") + '</button></div><input id="health-import-file" class="hidden" type="file" data-input="health-file" accept=".xml,.json,.txt"></section>' +
        '<section class="glass panel integration-card"><h3>Apple Watch</h3><p>' +
          (state.integrations.appleWatch.connected
            ? "Watch-derived heart rate was detected in the imported health export."
            : "Live watch sync requires the same iOS HealthKit bridge as Apple Health. This web build supports import-based workflows only.") +
          '</p><div class="button-row"><button class="btn-secondary" data-action="import-health-export">Import Watch Data</button></div></section>' +
        '<section class="glass panel integration-card"><h3>Hevy Import</h3><p>' +
          (state.integrations.hevyImport.connected
            ? "Last import " + formatDateTime(state.integrations.hevyImport.lastSync)
            : "Import actual CSV or JSON exports from Hevy to merge workouts, routines, and weight history.") +
          '</p><div class="button-row"><button class="btn" data-action="import-hevy-file">Import Hevy File</button>' +
          (premium
            ? '<button class="btn-secondary" data-action="toggle-auto-sync" data-key="hevyImport">Duplicate Detection ' + (state.integrations.hevyImport.autoSync ? "On" : "Off") + '</button>'
            : '<span class="badge">Duplicate detection is premium</span>') +
          '</div><input id="hevy-import-file" class="hidden" type="file" data-input="hevy-file" accept=".csv,.json"></section>' +
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
            "</div>"
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
          switchRow("Auto complete sets", state.preferences.autoComplete, "toggle-pref", "autoComplete") +
          switchRow("Smart suggestions", state.preferences.smartSuggestions, "toggle-pref", "smartSuggestions") +
          '<div class="form-row">' +
            select("pref-units", state.preferences.units, ["kg", "lbs"]) +
            select("pref-distance", state.preferences.distance, ["km", "miles"]) +
            select("pref-rest", String(state.preferences.restTimer), ["60", "90", "120"]) +
            select("pref-sync", state.preferences.syncFrequency, ["Realtime", "Hourly", "Daily"]) +
          "</div>" +
        "</section>" +
        '<section class="glass panel"><h3>Appearance</h3><div class="form-row">' +
          select("theme-selector", "Dark", ["Dark", "Light", "System"]) +
          select("pref-accent", state.preferences.accent, ["blue-purple", "electric-blue", "violet"]) +
        "</div>" + switchRow("Compact mode", state.preferences.compactMode, "toggle-pref", "compactMode") + "</section>" +
        '<section class="glass panel"><h3>Notifications</h3>' +
          switchRow("Workout reminders", true, "noop", "") +
          switchRow("Recovery alerts", true, "noop", "") +
          switchRow("Goal milestone alerts", true, "noop", "") +
        "</section>" +
        '<section class="glass panel"><h3>Data & Privacy</h3><div class="button-row">' +
          (premium ? '<button class="btn-secondary" data-action="export-data">Export JSON</button>' : '<span class="badge">Premium export</span>') +
          '<button class="btn-secondary" data-action="clear-cache">Clear Cache</button></div></section>' +
        '<section class="glass panel"><h3>Health & Device Sync</h3>' +
          switchRow("Apple Health import available", state.integrations.appleHealth.connected, "toggle-integration", "appleHealth") +
          switchRow("Apple Watch import available", state.integrations.appleWatch.connected, "toggle-integration", "appleWatch") +
          switchRow("Hevy import active", state.integrations.hevyImport.connected, "toggle-integration", "hevyImport") +
        "</section>" +
      "</div>";
  }

  function renderPro() {
    var premium = isPremiumUser();
    return '' +
      '<div class="page-head"><div><p class="eyebrow">Premium</p><h2>' + (premium ? "Premium is active" : "Unlock premium training intelligence") + "</h2></div></div>" +
      '<div class="cards-three">' +
        '<section class="glass panel"><h3>Working Premium Features</h3><div class="pill-row"><span>Advanced analytics</span><span>Premium export</span><span>Hevy duplicate detection</span><span>Enhanced recovery insights</span><span>Priority device setup</span></div><div style="height:16px"></div>' + (premium ? '<div class="success-banner">This user is currently premium.</div>' : '<div class="mini-card"><strong>Premium is admin-managed</strong><p>Ask an admin to upgrade your account. Members cannot change their own plan.</p></div>') + "</section>" +
        pricing("Monthly", "$12", "Ask admin to assign this plan") +
        '<div class="cards-two">' + pricing("Yearly", "$89", "Admin assigned") + pricing("Lifetime", "$249", "Admin assigned") + "</div>" +
      "</div>";
  }

  function renderAdmin() {
    var totalWorkouts = state.workouts.length;
    var premiumUsers = state.users.filter(function (user) { return user.plan === "PRO"; }).length;
    var normalUsers = state.users.filter(function (user) { return user.role !== "ADMIN"; });
    return '' +
      '<div class="page-head"><div><p class="eyebrow">Admin Dashboard</p><h2>Control users and view platform stats</h2></div></div>' +
      '<div class="stats-four">' +
        stat("Total users", String(normalUsers.length), "Registered members") +
        stat("Premium users", String(premiumUsers), "Upgraded members") +
        stat("Total workouts", String(totalWorkouts), "Across all users") +
        stat("Hevy imports", String(state.importPreview.length), "Latest import previews") +
      "</div>" +
      '<div class="cards-two">' +
        '<section class="glass panel"><h3>User Management</h3>' +
          (normalUsers.length
            ? normalUsers.map(function (user) {
                return '<div class="mini-card"><strong>' + escapeHtml(user.name) + "</strong><p>" + escapeHtml(user.email) + " - " + escapeHtml(user.goal) + " - " + escapeHtml(user.plan) + '</p><div class="button-row"><button class="btn-secondary" data-action="upgrade-user" data-user="' + user.id + '">Upgrade to Premium</button><button class="btn-secondary" data-action="downgrade-user" data-user="' + user.id + '">Downgrade to Free</button><button class="btn-secondary" data-action="delete-user" data-user="' + user.id + '">Delete User</button></div></div>';
              }).join("")
            : "<p>No member users found.</p>") +
        "</section>" +
        '<section class="glass panel"><h3>Platform Analytics</h3>' +
          metric("Average workouts per user", normalUsers.length ? (totalWorkouts / normalUsers.length).toFixed(1) : "0") +
          metric("Total meal logs", String(state.meals.length)) +
          metric("Connected Apple imports", String(state.integrations.appleHealth.connected ? 1 : 0)) +
          metric("Current active admin", state.admin ? state.admin.email : "None") +
        "</section>" +
      "</div>";
  }

  function renderMobileNav() {
    var items = state.admin
      ? [["admin", "Admin"], ["integrations", "Sync"], ["settings", "Settings"]]
      : [["dashboard", "Home"], ["workouts", "Workout"], ["progress", "Progress"], ["nutrition", "Meals"], ["settings", "Settings"]];

    return '<div class="glass mobile-nav"><div class="mobile-nav-inner">' + items.map(function (item) {
      return '<button class="' + (state.page === item[0] ? "active" : "") + '" data-nav="' + item[0] + '">' + item[1] + "</button>";
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

  function renderBars(values) {
    if (!values.length || !hasPositive(values)) return "<p>No data yet. Save workouts to build this chart.</p>";
    var max = Math.max.apply(null, values) || 1;
    return '<div class="chart-box">' + values.map(function (value) {
      return '<div class="bar" style="height:' + Math.max(12, Math.round((value / max) * 220)) + 'px"></div>';
    }).join("") + "</div>";
  }

  function renderLineChart(data) {
    if (!data.values.length || !hasPositive(data.values)) return "<p>No data yet. Save workouts to build this chart.</p>";
    var width = 520;
    var height = 220;
    var max = Math.max.apply(null, data.values) || 1;
    var points = [];
    for (var i = 0; i < data.values.length; i += 1) {
      var x = data.values.length === 1 ? width / 2 : 20 + (i * ((width - 40) / (data.values.length - 1)));
      var y = height - 20 - ((data.values[i] / max) * (height - 40));
      points.push(x + "," + y);
    }
    return '<div class="line-chart"><svg class="line-svg" viewBox="0 0 ' + width + " " + height + '" preserveAspectRatio="none"><polyline fill="none" stroke="#8db0ff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" points="' + points.join(" ") + '"></polyline>' +
      points.map(function (point) {
        var xy = point.split(",");
        return '<circle cx="' + xy[0] + '" cy="' + xy[1] + '" r="5" fill="#b050ff"></circle>';
      }).join("") +
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

  function handleClick(event) {
    var nav = event.target.closest("[data-nav]");
    if (nav) {
      setPage(nav.getAttribute("data-nav"));
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
      state.authError = "";
      render();
    } else if (action === "toggle-password") {
      state.showPassword = !state.showPassword;
      render();
    } else if (action === "remember-me") {
      state.rememberMe = !state.rememberMe;
      render();
    } else if (action === "forgot") {
      toast("Password reset email queued.");
    } else if (action === "oauth-google") {
      toast("Google login needs real provider credentials, redirect URIs, and a deployed HTTPS domain.");
    } else if (action === "oauth-apple") {
      toast("Apple login needs real provider credentials, redirect URIs, and a deployed HTTPS domain.");
    } else if (action === "logout") {
      state.user = null;
      state.admin = null;
      setPage("login");
      render();
    } else if (action === "finish-workout") {
      finishWorkout();
    } else if (action === "add-exercise") {
      addExercise();
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
      replaceExercise(exerciseId);
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
    } else if (action === "clear-cache") {
      localStorage.clear();
      location.reload();
    } else if (action === "upgrade") {
      toast("Premium is managed by admin. Ask an admin to change this account plan.");
    } else if (action === "noop") {
      toast("Setting saved.");
    }
  }

  function handleSubmit(event) {
    var form = event.target.getAttribute("data-form");
    if (!form) return;
    event.preventDefault();
    if (form === "member") submitMember(event.target);
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
    else if (selectName === "pref-accent") state.preferences.accent = value;
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
      setPage("admin");
      toast("Logged in with admin privileges.");
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
    state.admin = null;
    state.profile.fullName = state.user.name;
    state.profile.avatar = initials(state.user.name);
    syncCurrentUserRecord();
    setPage("dashboard");
    toast(state.authMode === "signup" ? "Account created." : "Logged in successfully.");
    render();
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

  function addExercise() {
    state.liveWorkout.exercises.push({
      id: uid(),
      name: "New Exercise",
      notes: "",
      sets: [{ id: uid(), previous: "No data", weight: "", reps: "", done: false }]
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

  function replaceExercise(exerciseId) {
    var name = prompt("Replace exercise with");
    if (!name) return;
    state.liveWorkout.exercises.forEach(function (exercise) {
      if (exercise.id === exerciseId) exercise.name = name;
    });
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

    var steps = sum(stepMatches) || extractFirstNumber(text, /steps[^0-9]*([0-9]+)/i);
    var activeCalories = Math.round(sum(calorieMatches) || extractFirstNumber(text, /active[^0-9]*([0-9]+)/i));
    var heartRate = average(heartMatches) || extractFirstNumber(text, /heart[^0-9]*([0-9]+)/i);

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
        { label: "Heart-rate records", value: String(heartMatches.length) }
      ]
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
    var workouts = filteredWorkouts();
    var weekly = state.workouts.filter(function (workout) {
      return new Date(workout.createdAt).getTime() >= Date.now() - 7 * 24 * 60 * 60 * 1000;
    });
    return {
      strength: chartData(workouts.map(function (workout) { return maxWeight(workout); })),
      volume: chartData(workouts.map(function (workout) { return Math.round(workout.volume); })),
      consistency: chartData(workouts.map(function (_, index) { return index + 1; })),
      bodyWeight: chartData(state.weightLogs.slice(0, 8).reverse().map(function (entry) { return entry.value; })),
      heartRate: chartData(workouts.map(function (workout) { return workout.health.heartRateAvg || 0; })),
      calories: chartData(workouts.map(function (workout) { return workout.calories || 0; })),
      prs: prList(),
      heat: muscleHeat(workouts),
      recoveryScore: state.healthData.recovery || (workouts.length ? Math.min(96, 70 + workouts.length * 2) : 0),
      restingHeartRate: state.healthData.heartRate ? Math.max(48, state.healthData.heartRate - 12) : 0,
      averageVolume: workouts.length ? workouts.reduce(function (acc, workout) { return acc + workout.volume; }, 0) / workouts.length : 0,
      goalHelper: weekly.length + " of 4 weekly workouts completed"
    };
  }

  function filteredWorkouts() {
    var days = state.dateRange === "7d" ? 7 : state.dateRange === "90d" ? 90 : 30;
    var cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return state.workouts.filter(function (workout) {
      var inRange = new Date(workout.createdAt).getTime() >= cutoff;
      var matchExercise = state.selectedExercise === "All" || workout.exercises.some(function (exercise) {
        return exercise.name === state.selectedExercise;
      });
      return inRange && matchExercise;
    }).slice(0, 8).reverse();
  }

  function chartData(values) {
    return { values: values.length ? values : [] };
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
      quote: motivationalQuote()
    };
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
