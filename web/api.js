/* ============================================================
   api.js — the single client gateway to the backend.

   • DEMO mode (FB_LIVE=false): no network. window.FUND comes from data.js;
     mutation helpers resolve as no-ops so the prototype's success screens
     still work. The public static site is fully browsable.
   • LIVE mode (FB_LIVE=true): initializes Firebase (Auth + Functions),
     loads the dashboard via the `dashboard` callable, and assembles the
     exact window.FUND shape the UI expects. EVERY mutation goes through a
     callable here — the browser never touches Firestore directly.

   Exposes window.API.{ live, boot, loadFund, signIn, signOut,
     createMember, updateMember, deleteMember, addShare,
     recordSeed, recordInstallment, issueLoan,
     reorderLoanOrder, markReceived, startNewRound, updateSettings, call }.
   ============================================================ */
(function () {
  var LIVE = !!window.FB_LIVE;
  var REGION = window.FB_REGION || "us-central1";
  var SDK = "https://www.gstatic.com/firebasejs/10.12.5/";

  // ---------- Jalali (Persian-calendar) formatting ----------
  var faMonthYear = new Intl.DateTimeFormat("fa-IR", { calendar: "persian", month: "long", year: "numeric" });
  var faFullDate = new Intl.DateTimeFormat("fa-IR", { calendar: "persian", day: "numeric", month: "long", year: "numeric" });
  var monthYearLabel = function (msIn) { return msIn ? faMonthYear.format(new Date(msIn)) : ""; };
  var fullDateLabel = function (msIn) { return msIn ? faFullDate.format(new Date(msIn)) : ""; };

  // jalaali-js (compact) — convert a Jalali date to epoch ms (UTC) for the API.
  function div(a, b) { return Math.floor(a / b); }
  function jalaaliToGregorian(jy, jm, jd) {
    jy += 1595;
    var days = -355668 + 365 * jy + div(jy, 33) * 8 + div((jy % 33) + 3, 4) + jd + (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
    var gy = 400 * div(days, 146097);
    days %= 146097;
    if (days > 36524) { gy += 100 * div(--days, 36524); days %= 36524; if (days >= 365) days++; }
    gy += 4 * div(days, 1461);
    days %= 1461;
    if (days > 365) { gy += div(days - 1, 365); days = (days - 1) % 365; }
    var gd = days + 1;
    var sal_a = [0, 31, (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    var gm;
    for (gm = 0; gm < 13; gm++) { var v = sal_a[gm]; if (gd <= v) break; gd -= v; }
    return { gy: gy, gm: gm, gd: gd };
  }
  function jalaliToMs(jy, jm, jd) {
    var g = jalaaliToGregorian(Number(jy), Number(jm), Number(jd));
    return Date.UTC(g.gy, g.gm - 1, g.gd);
  }

  // ---------- Firebase (live) ----------
  var fb = { app: null, auth: null, functions: null };
  var authReadyResolve;
  var authReady = new Promise(function (r) { authReadyResolve = r; });

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src; s.onload = resolve; s.onerror = function () { reject(new Error("load failed: " + src)); };
      document.head.appendChild(s);
    });
  }

  async function initFirebase() {
    await loadScript(SDK + "firebase-app-compat.js");
    await Promise.all([
      loadScript(SDK + "firebase-auth-compat.js"),
      loadScript(SDK + "firebase-functions-compat.js"),
    ]);
    /* global firebase */
    fb.app = firebase.initializeApp(window.FB_CONFIG);
    fb.auth = firebase.auth();
    fb.functions = fb.app.functions(REGION);
    if (window.FB_USE_EMULATOR) {
      try { fb.auth.useEmulator("http://localhost:9099", { disableWarnings: true }); } catch (e) {}
      try { fb.functions.useEmulator("localhost", 5001); } catch (e) {}
    }
    fb.auth.onAuthStateChanged(function (user) {
      window.__fbUser = user || null;
      if (typeof window.__resolveAuth === "function") window.__resolveAuth(user);
      authReadyResolve(user);
    });
  }

  if (LIVE) { initFirebase().catch(function (e) { console.error("Firebase init failed:", e); authReadyResolve(null); }); }

  // call a callable and unwrap .data
  async function call(name, payload) {
    if (!LIVE) return { ok: true, demo: true };
    if (!fb.functions) await authReady;
    var fn = fb.functions.httpsCallable(name);
    var res = await fn(payload || {});
    return res.data;
  }

  // ---------- assemble window.FUND from the dashboard payload ----------
  function assembleFund(p) {
    var byId = {};
    var members = p.members.map(function (m) {
      var openedMs = (m.shares[0] && m.shares[0].openedAt) || m.createdAt;
      var enrichedShares = m.shares.map(function (s) {
        return Object.assign({}, s, { sinceLabel: monthYearLabel(s.openedAt) });
      });
      var enriched = Object.assign({}, m, {
        shares: enrichedShares,
        sinceLabel: monthYearLabel(openedMs),
        since: openedMs ? { y: new Date(openedMs).getUTCFullYear(), m: new Date(openedMs).getUTCMonth() + 1 } : { y: 0, m: 0 },
        dobLabel: fullDateLabel(m.dob),
        // UI expects referredBy to be a display NAME (or null); keep id separately
        referredBy: m.referredByName || null,
        referredById: m.referredBy || null,
        seedReceipts: (m.seedReceipts || []).map(function (r) { return Object.assign({}, r, { date: fullDateLabel(r.date) }); }),
        installmentReceipts: (m.installmentReceipts || []).map(function (r) { return Object.assign({}, r, { date: fullDateLabel(r.date) }); }),
      });
      if (m.pendingShare) {
        enriched.pendingShare = Object.assign({}, m.pendingShare, { sinceLabel: monthYearLabel(m.pendingShare.openedAt) });
      }
      if (m.loan) {
        enriched.loan = Object.assign({}, m.loan, { term: m.loan.termMonths, installmentsPaid: Math.round((m.loan.principal - m.loan.outstanding) / (m.loan.monthly || 1)) });
      }
      byId[m.id] = enriched;
      return enriched;
    });

    var families = p.families.map(function (f) {
      return Object.assign({}, f, { members: f.memberIds.map(function (id) { return byId[id]; }).filter(Boolean) });
    });
    var resolve = function (ids) { return (ids || []).map(function (id) { return byId[id]; }).filter(Boolean); };

    return {
      meta: { label: p.meta.label, name: p.meta.name, currency: p.meta.currency, asOf: monthYearLabel(p.meta.asOf) },
      settings: p.settings,
      members: members,
      families: families,
      familiesCount: p.familiesCount,
      purchasing: resolve(p.purchasingIds),
      purchaseAgg: p.purchaseAgg,
      loanOrder: resolve(p.loanOrderIds),
      loanNext: byId[p.loanNextId] || null,
      nextUp: byId[p.loanNextId] || null,
      loanRound: p.loanRound,
      loanReceivedCount: p.loanReceivedCount,
      loanTotal: p.loanTotal,
      queue: resolve(p.queueIds),
      growth: p.growth,
      kpis: p.kpis,
      derived: p.derived,
    };
  }

  async function loadFund() {
    if (!LIVE) return window.FUND; // demo: data.js already set it
    try {
      var payload = await call("dashboard");
      window.FUND = assembleFund(payload);
    } catch (e) {
      console.error("loadFund failed, falling back to demo data:", e);
      // window.FUND may already be the data.js fallback
    }
    return window.FUND;
  }

  // ---------- boot: wait for auth (live) + data, then render ----------
  async function boot(render) {
    if (LIVE) {
      var user = await authReady;
      var embedded = false;
      try { embedded = window.top !== window.self; } catch (e) { embedded = true; }
      if (!user && !embedded) return; // auth.js is redirecting to login
      await loadFund();
    }
    render();
  }

  // ---------- auth (login page) ----------
  async function signIn(email, password) {
    if (!LIVE) { try { localStorage.setItem("ff_auth", JSON.stringify({ name: email, at: Date.now() })); } catch (e) {} return { ok: true, demo: true }; }
    await authReady.catch(function () {});
    if (!fb.auth) await initFirebase();
    await fb.auth.signInWithEmailAndPassword(email, password);
    return { ok: true };
  }
  async function signOut() {
    if (LIVE && fb.auth) { try { await fb.auth.signOut(); } catch (e) {} }
    try { localStorage.removeItem("ff_auth"); } catch (e) {}
    location.replace("index.html");
  }

  // ---------- mutation helpers (1:1 with callables) ----------
  window.API = {
    live: LIVE,
    boot: boot,
    loadFund: loadFund,
    call: call,
    authReady: LIVE ? authReady : Promise.resolve(null),
    jalaliToMs: jalaliToMs,
    signIn: signIn,
    signOut: signOut,

    createMember: function (d) { return call("membersCreate", d); },
    updateMember: function (d) { return call("membersUpdate", d); },
    deleteMember: function (id) { return call("membersDelete", { id: id }); },
    addShare: function (d) { return call("sharesAdd", d); },
    recordSeed: function (d) { return call("paymentsRecordSeed", d); },
    recordInstallment: function (d) { return call("paymentsRecordInstallment", d); },
    issueLoan: function (d) { return call("loansIssue", d); },
    reorderLoanOrder: function (order) { return call("loanOrderReorder", { order: order }); },
    markReceived: function (memberId, received) { return call("loanOrderMarkReceived", { memberId: memberId, received: received }); },
    startNewRound: function () { return call("loanOrderStartNewRound", {}); },
    updateSettings: function (d) { return call("settingsUpdate", d); },

    // current admin display name / email (for the settings page + UI)
    adminName: function () {
      if (LIVE) { var u = window.__fbUser; return (u && (u.displayName || u.email)) || ""; }
      try { var s = JSON.parse(localStorage.getItem("ff_auth") || "null"); return (s && s.name) || ""; } catch (e) { return ""; }
    },
    adminEmail: function () {
      if (LIVE) { var u = window.__fbUser; return (u && u.email) || ""; }
      return "";
    },
    setAdminName: async function (name) {
      if (!LIVE) {
        try { var s = JSON.parse(localStorage.getItem("ff_auth") || "null") || {}; s.name = name; localStorage.setItem("ff_auth", JSON.stringify(s)); } catch (e) {}
        return { ok: true, name: name };
      }
      var res = await call("setAdminName", { name: name });
      // refresh the cached user + token so the new name flows into audit writes
      try {
        if (fb.auth && fb.auth.currentUser) {
          await fb.auth.currentUser.reload();
          await fb.auth.currentUser.getIdToken(true);
          window.__fbUser = fb.auth.currentUser;
        }
      } catch (e) {}
      return res;
    },
  };
})();
