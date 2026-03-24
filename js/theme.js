/* Theme toggle for static marketing pages */
(function () {
  var STORAGE_KEY = 'infotograf-theme';

  function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(pref) {
    var theme = pref === 'system' ? getSystemTheme() : pref;
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelectorAll('.theme-check').forEach(function (el) { el.textContent = ''; });
    var active = document.querySelector('.theme-opt[data-value="' + pref + '"] .theme-check');
    if (active) active.textContent = '✓';
  }

  function init() {
    var pref = localStorage.getItem(STORAGE_KEY) || 'system';
    applyTheme(pref);

    // Toggle button
    var btn = document.querySelector('.theme-toggle');
    var menu = document.querySelector('.theme-menu');
    if (!btn || !menu) return;

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      menu.classList.toggle('theme-menu--open');
    });

    document.addEventListener('click', function () {
      menu.classList.remove('theme-menu--open');
    });

    menu.addEventListener('click', function (e) { e.stopPropagation(); });

    document.querySelectorAll('.theme-opt').forEach(function (el) {
      el.addEventListener('click', function () {
        var val = this.getAttribute('data-value');
        localStorage.setItem(STORAGE_KEY, val);
        applyTheme(val);
        menu.classList.remove('theme-menu--open');
      });
    });

    // Listen for OS theme changes when set to system
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
      var p = localStorage.getItem(STORAGE_KEY) || 'system';
      if (p === 'system') applyTheme('system');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
