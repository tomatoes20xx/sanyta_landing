/* Sanyta site — shared interactions */
(function () {
  // ---- Reveal on scroll ----
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });

  // ---- FAQ accordion ----
  document.querySelectorAll('.faq-item').forEach(function (item) {
    var q = item.querySelector('.faq-q');
    var a = item.querySelector('.faq-a');
    if (!q || !a) return;
    q.addEventListener('click', function () {
      var open = item.classList.contains('open');
      // close siblings
      var parent = item.parentElement;
      parent.querySelectorAll('.faq-item.open').forEach(function (other) {
        if (other !== item) { other.classList.remove('open'); other.querySelector('.faq-a').style.maxHeight = null; }
      });
      if (open) { item.classList.remove('open'); a.style.maxHeight = null; }
      else { item.classList.add('open'); a.style.maxHeight = a.scrollHeight + 'px'; }
    });
  });

  // ---- Store links (placeholders) ----
  // Replace these with real URLs when the app goes live.
  var STORE_URLS = {
    ios: '#',      // e.g. https://apps.apple.com/app/idXXXXXXXXX
    android: '#'   // e.g. https://play.google.com/store/apps/details?id=app.sanyta
  };
  document.querySelectorAll('[data-store]').forEach(function (el) {
    var key = el.getAttribute('data-store');
    var url = STORE_URLS[key];
    if (url && url !== '#') { el.setAttribute('href', url); el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noopener'); }
    else {
      el.addEventListener('click', function (ev) {
        ev.preventDefault();
        el.classList.add('is-soon');
        if (!el.querySelector('.sb-soon')) {
          var b = document.createElement('span');
          b.className = 'sb-soon'; b.textContent = 'მალე';
          el.appendChild(b);
        }
      });
    }
  });
})();
