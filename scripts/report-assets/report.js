/* ==========================================================================
   report.js — Agent 2 (NAVIGATION & FOOTER)
   RSPL "Baby Diapers — Category Report" v2 bundle.

   Vanilla, no dependencies, defer-loaded (DOM is parsed when this runs). Every
   feature is guarded so the whole file no-ops on pages without the sticky nav
   (e.g. the cover). Nothing here fabricates navigation targets — prev/next come
   from the rendered nav links; the overlay from the #rpt-nav-data island.

   Provides:
     • ← / → keyboard navigation to the prev/next section.
     • § Contents overlay (built from #rpt-nav-data, current highlighted,
       Esc / backdrop-click to close, no page reload to open).
     • Reading-progress bar updated on scroll.
     • Download PDF is a native <a target="_blank"> to print.html (Agent 3's
       print.html self-triggers the print dialog) — no JS interception needed.
   ========================================================================== */
(function () {
  "use strict";

  var doc = document;

  /* ---- Reading-progress bar -------------------------------------------- */
  (function () {
    var fill = doc.querySelector(".rnav-progress-fill");
    if (!fill) return;
    var ticking = false;
    function update() {
      ticking = false;
      var el = doc.documentElement;
      var y = window.pageYOffset || el.scrollTop || 0;
      var max = el.scrollHeight - window.innerHeight;
      var p = max > 0 ? y / max : 0;
      if (p < 0) p = 0;
      if (p > 1) p = 1;
      fill.style.width = (p * 100).toFixed(2) + "%";
    }
    function onScroll() {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    update();
  })();

  /* ---- Prev / Next links (source of truth for keyboard nav) ------------- */
  function navHref(kind) {
    var el = doc.querySelector(".rnav-" + kind);
    if (el && el.tagName === "A" && !el.classList.contains("is-disabled")) {
      var href = el.getAttribute("href");
      if (href) return href;
    }
    return null;
  }

  /* ---- § Contents overlay ---------------------------------------------- */
  var overlay = null;
  var lastFocus = null;

  function escText(s) {
    var d = doc.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }

  function buildOverlay() {
    if (overlay) return overlay;
    var dataEl = doc.getElementById("rpt-nav-data");
    if (!dataEl) return null;
    var data;
    try {
      data = JSON.parse(dataEl.textContent || "{}");
    } catch (e) {
      return null;
    }
    var secs = (data && data.sections) || [];
    var current = data && typeof data.current === "number" ? data.current : -1;

    overlay = doc.createElement("div");
    overlay.className = "rtoc-overlay";
    overlay.id = "rtoc-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Report contents");

    var backdrop = doc.createElement("div");
    backdrop.className = "rtoc-backdrop";
    overlay.appendChild(backdrop);

    var panel = doc.createElement("div");
    panel.className = "rtoc-panel";

    var head = doc.createElement("div");
    head.className = "rtoc-head";
    head.innerHTML =
      '<span class="rtoc-title">Contents</span>' +
      '<span class="rtoc-sub">' + secs.length + " sections</span>";
    var closeBtn = doc.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "rtoc-close";
    closeBtn.setAttribute("aria-label", "Close contents");
    closeBtn.innerHTML = "&times;";
    head.appendChild(closeBtn);
    panel.appendChild(head);

    var list = doc.createElement("div");
    list.className = "rtoc-list";
    secs.forEach(function (s, i) {
      var a = doc.createElement("a");
      a.className = "rtoc-item" + (i === current ? " is-current" : "");
      a.setAttribute("href", s.target || "#");
      if (i === current) a.setAttribute("aria-current", "page");
      a.innerHTML =
        '<span class="rtoc-num">' + escText(s.num) + "</span>" +
        '<span class="rtoc-ttl">' + escText(s.title) + "</span>";
      list.appendChild(a);
    });
    panel.appendChild(list);
    overlay.appendChild(panel);
    doc.body.appendChild(overlay);

    backdrop.addEventListener("click", closeOverlay);
    closeBtn.addEventListener("click", closeOverlay);
    return overlay;
  }

  function isOpen() {
    return overlay && overlay.classList.contains("is-open");
  }

  function openOverlay() {
    var o = buildOverlay();
    if (!o) return;
    lastFocus = doc.activeElement;
    o.classList.add("is-open");
    doc.documentElement.classList.add("rtoc-lock");
    var btn = doc.querySelector(".rnav-toc");
    if (btn) btn.setAttribute("aria-expanded", "true");
    var target = o.querySelector(".rtoc-item.is-current") || o.querySelector(".rtoc-item");
    if (target && target.focus) target.focus();
  }

  function closeOverlay() {
    if (!overlay) return;
    overlay.classList.remove("is-open");
    doc.documentElement.classList.remove("rtoc-lock");
    var btn = doc.querySelector(".rnav-toc");
    if (btn) btn.setAttribute("aria-expanded", "false");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function toggleOverlay() {
    if (isOpen()) closeOverlay();
    else openOverlay();
  }

  // Focusable elements inside the overlay, in DOM order (close button + links).
  function focusables() {
    if (!overlay) return [];
    var sel = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
    return Array.prototype.slice.call(overlay.querySelectorAll(sel)).filter(function (el) {
      return el.offsetWidth > 0 || el.offsetHeight > 0 || el === doc.activeElement;
    });
  }

  // Keep Tab focus inside the open modal: Tab past the last element wraps to the
  // first, Shift+Tab past the first wraps to the last, and a stray focus that
  // has escaped the overlay is pulled back in.
  function trapTab(e) {
    var f = focusables();
    if (!f.length) {
      e.preventDefault();
      return;
    }
    var first = f[0];
    var last = f[f.length - 1];
    var active = doc.activeElement;
    if (e.shiftKey) {
      if (active === first || !overlay.contains(active)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (active === last || !overlay.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  var tocBtn = doc.querySelector(".rnav-toc");
  if (tocBtn) {
    tocBtn.addEventListener("click", toggleOverlay);
    // Build the overlay up-front (it stays hidden until opened) so the button's
    // aria-controls="rtoc-overlay" IDREF resolves on page load instead of
    // dangling until the first open. Defer-loaded, so the DOM is ready here.
    buildOverlay();
  }

  /* ---- Keyboard: Esc closes overlay, ← / → navigate -------------------- */
  doc.addEventListener("keydown", function (e) {
    if (e.defaultPrevented) return;
    var open = isOpen();

    // Focus trap first — must run before the modifier early-return below so
    // Shift+Tab isn't swallowed by the shiftKey guard.
    if (open && (e.key === "Tab" || e.keyCode === 9)) {
      trapTab(e);
      return;
    }

    if (e.key === "Escape" || e.key === "Esc") {
      if (open) {
        e.preventDefault();
        closeOverlay();
      }
      return;
    }

    var t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
    if (open) return; // let the user browse the overlay without page jumps

    if (e.key === "ArrowLeft") {
      var p = navHref("prev");
      if (p) {
        e.preventDefault();
        window.location.href = p;
      }
    } else if (e.key === "ArrowRight") {
      var n = navHref("next");
      if (n) {
        e.preventDefault();
        window.location.href = n;
      }
    }
  });
})();
