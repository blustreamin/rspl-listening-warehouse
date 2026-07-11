/* ==========================================================================
   immersion.js, RSPL Baby Diapers v2
   Vanilla, no deps, loaded with `defer`.

   - Marks <html class="js-reveal"> so immersion.css can animate `.reveal` blocks
     FROM a slightly-off state. Without this class (JS disabled) content is fully
     visible, so the reveal is a pure progressive enhancement.
   - IntersectionObserver fades `.reveal` blocks in as they enter, once, with a
     subtle stagger for blocks that enter together.
   - prefers-reduced-motion OR no IntersectionObserver → reveal everything at once.
   - Smooth in-page scroll for `#` anchor links.
   No-ops safely when the relevant elements are absent.
   ========================================================================== */
(function () {
  "use strict";
  var doc = document;
  var root = doc.documentElement;
  var slice = Array.prototype.slice;

  var reduceMotion = false;
  try {
    reduceMotion =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) {
    reduceMotion = false;
  }

  // Opt the page into the animated start-state as early as possible.
  root.classList.add("js-reveal");

  function revealAll() {
    var els = doc.querySelectorAll(".reveal");
    for (var i = 0; i < els.length; i++) {
      els[i].classList.add("is-visible");
    }
  }

  // ---- scroll reveal ------------------------------------------------------
  // Safety-first: a `.reveal` block must NEVER stay stuck at its off-state.
  //  · A synchronous in-viewport sweep runs on this same tick, so anything the
  //    user can already see (incl. above-the-fold) is revealed before the first
  //    paint after js-reveal is set → no visible→hidden flash.
  //  · The observer uses a non-negative rootMargin + threshold 0, so a block is
  //    caught the instant any pixel of it enters the viewport (no dead band that
  //    a short / barely-scrollable page could leave permanently hidden), and is
  //    robust for blocks taller than the viewport.
  //  · A resize/orientation re-sweep and an absolute reveal-all backstop close
  //    every remaining gap.
  function setupReveal() {
    var targets = slice.call(doc.querySelectorAll(".reveal"));
    if (!targets.length) return;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      revealAll();
      return;
    }

    var pending = targets.slice(); // not-yet-revealed
    var observer = null;

    function reveal(el, delay) {
      if (el.classList.contains("is-visible")) return;
      if (delay > 0) {
        el.style.transitionDelay = delay + "ms";
        // clear the one-shot delay so later transitions (hover) aren't lagged
        window.setTimeout(function () {
          el.style.transitionDelay = "";
        }, 700 + delay);
      }
      el.classList.add("is-visible");
      if (observer) {
        try { observer.unobserve(el); } catch (e) {}
      }
      var i = pending.indexOf(el);
      if (i !== -1) pending.splice(i, 1);
    }

    try {
      observer = new IntersectionObserver(
        function (entries) {
          // stagger blocks that enter in the same batch, in document order
          var batch = [];
          for (var i = 0; i < entries.length; i++) {
            if (entries[i].isIntersecting) batch.push(entries[i].target);
          }
          batch.sort(function (a, b) {
            var rel = a.compareDocumentPosition(b);
            return rel & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
          });
          for (var j = 0; j < batch.length; j++) {
            reveal(batch[j], Math.min(j * 60, 240));
          }
        },
        { root: null, rootMargin: "0px 0px 0px 0px", threshold: 0 }
      );
    } catch (e) {
      observer = null;
    }

    if (!observer) {
      // IntersectionObserver unusable → reveal everything, never leave it hidden
      revealAll();
      return;
    }

    for (var k = 0; k < targets.length; k++) {
      observer.observe(targets[k]);
    }

    // Reveal, synchronously, anything already on screen (no animation, no flash).
    function sweep() {
      if (!pending.length) return;
      var vh = window.innerHeight || doc.documentElement.clientHeight || 0;
      var list = pending.slice(); // copy — reveal() mutates `pending`
      for (var i = 0; i < list.length; i++) {
        var r = list[i].getBoundingClientRect();
        if (r.top < vh && r.bottom > 0) reveal(list[i], 0);
      }
    }

    // Runs on THIS tick (before first post-js-reveal paint) → prevents FOUC and
    // guarantees on-screen content is visible on short / unscrollable pages.
    sweep();

    // Layout can change (font/image load, rotate, responsive reflow): re-sweep.
    var raf = 0;
    function onChange() {
      if (raf) {
        (window.cancelAnimationFrame || window.clearTimeout)(raf);
      }
      raf = (window.requestAnimationFrame || window.setTimeout)(sweep, 0);
    }
    window.addEventListener("resize", onChange, { passive: true });
    window.addEventListener("orientationchange", onChange, { passive: true });
    window.addEventListener("load", sweep);

    // Absolute backstop: whatever is somehow still unrevealed becomes visible.
    // Generous delay so genuine scroll-reveals still animate for engaged readers.
    window.setTimeout(function () {
      var list = pending.slice();
      for (var i = 0; i < list.length; i++) reveal(list[i], 0);
    }, 4000);
  }

  // ---- smooth in-page anchor scroll --------------------------------------
  function setupAnchorScroll() {
    doc.addEventListener(
      "click",
      function (ev) {
        if (ev.defaultPrevented || ev.button !== 0) return;
        if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
        var a = ev.target && ev.target.closest && ev.target.closest('a[href^="#"]');
        if (!a) return;
        var href = a.getAttribute("href");
        if (!href || href.length < 2) return; // ignore bare "#"
        var id = decodeURIComponent(href.slice(1));
        var target = doc.getElementById(id);
        if (!target) {
          try {
            target = doc.querySelector(href);
          } catch (e) {
            target = null;
          }
        }
        if (!target) return;
        ev.preventDefault();
        try {
          target.scrollIntoView({
            behavior: reduceMotion ? "auto" : "smooth",
            block: "start",
          });
        } catch (e) {
          target.scrollIntoView();
        }
        if (typeof history !== "undefined" && history.replaceState) {
          history.replaceState(null, "", href);
        }
      },
      false
    );
  }

  setupReveal();
  setupAnchorScroll();
})();
