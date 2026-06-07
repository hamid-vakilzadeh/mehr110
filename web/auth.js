/* ============================================================
   auth.js — auth guard for protected pages. Include in <head>
   AFTER firebase-config.js and BEFORE the app scripts.

   • DEMO mode (FB_LIVE=false): a localStorage gate (accept-anything login),
     so the public static site is browsable with no backend.
   • LIVE mode (FB_LIVE=true): real Firebase Auth. The synchronous part hides
     the page; api.js completes the guard via onAuthStateChanged and either
     reveals the page or redirects to the login (index.html).

   Pages embedded in our own (already-authorized) gallery skip the redirect.
   window.ffAuth.{user, logout} stays stable across both modes.
   ============================================================ */
(function () {
  var KEY = "ff_auth";
  var LIVE = !!window.FB_LIVE;

  var embedded = false;
  try { embedded = window.top !== window.self; } catch (e) { embedded = true; }

  function demoAuthed() {
    try { return !!localStorage.getItem(KEY); } catch (e) { return false; }
  }

  if (LIVE) {
    // Hide content until Firebase resolves the session (api.js reveals/redirects).
    window.__authPending = true;
    try {
      var s = document.createElement("style");
      s.id = "__auth_hide";
      s.textContent = "body{visibility:hidden}";
      (document.head || document.documentElement).appendChild(s);
    } catch (e) {}
    // api.js calls this once Firebase Auth state is known.
    window.__resolveAuth = function (user) {
      window.__authPending = false;
      var hide = document.getElementById("__auth_hide");
      if (!user && !embedded) {
        location.replace("index.html");
        return;
      }
      if (hide) hide.remove();
    };
    window.ffAuth = {
      user: function () { return window.__fbUser || null; },
      logout: function () {
        if (window.API && window.API.signOut) window.API.signOut();
        else location.replace("index.html");
      },
    };
  } else {
    // DEMO mode — synchronous gate.
    if (!embedded && !demoAuthed()) {
      location.replace("index.html");
    }
    window.ffAuth = {
      user: function () {
        try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; }
      },
      logout: function () {
        try { localStorage.removeItem(KEY); } catch (e) {}
        location.replace("index.html");
      },
    };
  }
})();
