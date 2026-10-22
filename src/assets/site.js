(function () {
  // Mobile menu
  var btn = document.querySelector('.menu-btn');
  var nav = document.getElementById('site-nav');
  if (btn && nav) {
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
  }

  // Share button: the device's own share menu; falls back to copying the link
  document.querySelectorAll('[data-share]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var url = btn.getAttribute('data-share-url'), title = btn.getAttribute('data-share-title');
      var html = btn.innerHTML;
      var copied = function () { btn.textContent = 'Link copied'; setTimeout(function () { btn.innerHTML = html; }, 2000); };
      if (navigator.share) {
        navigator.share({ title: title, url: url }).catch(function () {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(copied, function () { window.prompt('Copy this link:', url); });
      } else {
        window.prompt('Copy this link:', url);
      }
    });
  });

  // Board-only: show "share to Facebook group" when signed in to the board editor
  // (the /admin sign-in stores the user in localStorage on this site)
  var signedIn = false;
  try { signedIn = !!window.localStorage.getItem('gotrue.user'); } catch (e) {}
  if (signedIn) {
    document.querySelectorAll('[data-board-only]').forEach(function (el) { el.hidden = false; });
  }
  document.querySelectorAll('[data-group-share]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var box = btn.closest('.board-share');
      var text = box.querySelector('.board-share-text').textContent;
      var label = btn.textContent, ok = false;
      // Copy synchronously first so it still works after the new tab opens
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { ok = document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
      if (!ok && navigator.clipboard) { navigator.clipboard.writeText(text).catch(function () {}); ok = true; }
      window.open(btn.getAttribute('data-group-url'), '_blank', 'noopener');
      btn.textContent = ok ? 'Copied. Paste it in the group' : 'Copy the text above, then paste it in the group';
      setTimeout(function () { btn.textContent = label; }, 4000);
    });
  });

  // Footer year
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  // "Today" in Central time, as YYYY-MM-DD; a meeting stays "upcoming" through its own day
  function todayCentral() {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    } catch (e) {
      return new Date().toISOString().slice(0, 10);
    }
  }
  var today = todayCentral();

  // Schedule: dim past meetings, highlight the next one
  var marked = false;
  document.querySelectorAll('#schedule li[data-date]').forEach(function (li) {
    var d = li.getAttribute('data-date');
    if (d < today) {
      li.classList.add('past');
    } else if (!marked) {
      li.classList.add('next');
      marked = true;
    }
  });
  document.querySelectorAll('#schedule li.past').forEach(function (li) {
    li.querySelectorAll('[data-cal]').forEach(function (el) { el.hidden = true; });
    var b = li.querySelector('.btn');
    if (b) { var t = document.createElement('span'); t.className = 'tag done'; t.textContent = 'Held'; b.replaceWith(t); }
    else { var tag = li.querySelector('.tag'); if (tag) { tag.className = 'tag done'; tag.textContent = 'Held'; } }
  });

  // Next-meeting card: show the first meeting (with a join link) that hasn't happened yet
  var cards = Array.prototype.slice.call(document.querySelectorAll('.next-meeting[data-meeting]'));
  var groups = {};
  cards.forEach(function (c) { var p = c.parentNode; (groups[p.dataset.g || (p.dataset.g = Math.random())] = groups[p.dataset.g] || []).push(c); });
  Object.keys(groups).forEach(function (k) {
    var list = groups[k], shown = false;
    list.forEach(function (c) { c.hidden = true; });
    list.forEach(function (c) {
      var d = c.getAttribute('data-meeting');
      if (!shown && d !== 'none' && d >= today) { c.hidden = false; shown = true; }
    });
    if (!shown) list.forEach(function (c) { if (c.getAttribute('data-meeting') === 'none') c.hidden = false; });
  });

  // Home-page notices: hide once their "show until" day has passed
  document.querySelectorAll('.notice[data-until]').forEach(function (el) {
    if (el.getAttribute('data-until') < today) el.hidden = true;
  });

  // Events: label ones that have already happened
  document.querySelectorAll('[data-event-date]').forEach(function (el) {
    if (el.getAttribute('data-event-date') < today) {
      var t = el.querySelector('[data-past-tag]'); if (t) t.hidden = false;
    }
  });
})();
