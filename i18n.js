/**
 * i18n — English/Spanish switcher
 * Translate elements with data-i18n attribute using window.__T data.
 * Runs immediately in <head> and again on DOMContentLoaded.
 */
(function() {
  var currentLang = localStorage.getItem("lang") || "es";
  var T = window.__T;

  function apply() {
    var lang = localStorage.getItem("lang") || "es";
    currentLang = lang;
    document.documentElement.setAttribute("lang", lang === "es" ? "es" : "en");
    if (!T) return;
    var els = document.querySelectorAll("[data-i18n]");
    for (var i = 0; i < els.length; i++) {
      var key = els[i].getAttribute("data-i18n");
      if (T[key] && T[key][lang]) {
        els[i].textContent = T[key][lang];
      }
    }
    // Update switcher buttons
    var btns = document.querySelectorAll("[data-lang-btn]");
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle("lang-active", btns[i].getAttribute("data-lang-btn") === lang);
    }
  }

  // Apply immediately for elements already in DOM
  apply();

  // Apply again when DOM finishes loading (catches elements after <head>)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply);
  }

  // Expose toggle function globally
  window.__switchLang = function(newLang) {
    localStorage.setItem("lang", newLang);
    apply();
  };
})();
