/* =========================================================================
   HALCYON — ARCH PERSONA DATABASE · site script v2
   No external libraries. Every module checks for its own markup and exits
   quietly when the current page doesn't use it.
   ========================================================================= */
(function () {
  "use strict";

  var doc = document;
  var root = doc.documentElement;
  root.classList.add("js");

  var RM = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var HOVER = !!(window.matchMedia && window.matchMedia("(hover: hover)").matches);

  function ready(fn) {
    if (doc.readyState !== "loading") fn();
    else doc.addEventListener("DOMContentLoaded", fn);
  }
  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }
  function pad(n) { return String(n).padStart(2, "0"); }
  function store(kind) {
    try { return window[kind]; } catch (e) { return null; }
  }
  var session = store("sessionStorage");
  var local = store("localStorage");
  function sGet(k) { try { return session && session.getItem(k); } catch (e) { return null; } }
  function sSet(k, v) { try { session && session.setItem(k, v); } catch (e) {} }

  function currentPage() {
    var parts = location.pathname.split("/").filter(Boolean);
    var last = parts[parts.length - 1] || "index";
    if (location.pathname.slice(-1) === "/") last = "index";
    last = last.replace(/\.html$/, "");
    if (last === "halcyon") last = "index";
    return last;
  }

  var ICON = {
    prev: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 3 5 8l5 5"/></svg>',
    next: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m6 3 5 5-5 5"/></svg>',
    pause: '<svg viewBox="0 0 16 16" fill="currentColor"><rect x="4" y="3" width="2.5" height="10"/><rect x="9.5" y="3" width="2.5" height="10"/></svg>',
    play: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M4.5 3v10l8-5z"/></svg>',
    close: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m3 3 10 10M13 3 3 13"/></svg>',
    zoom: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 2h4v4M6 14H2v-4M14 2 9 7M2 14l5-5"/></svg>'
  };
  window.HALCYON_ICON = ICON;

  /* ------------------------------------------------------------ TOAST */
  var toastEl, toastTimer;
  function toast(message, code) {
    if (!toastEl) {
      toastEl = doc.createElement("div");
      toastEl.className = "toast";
      toastEl.setAttribute("role", "status");
      toastEl.setAttribute("aria-live", "polite");
      doc.body.appendChild(toastEl);
    }
    toastEl.innerHTML = (code ? '<span class="t_code">' + code + "</span>" : "") + "<span></span>";
    toastEl.lastChild.textContent = message;
    clearTimeout(toastTimer);
    requestAnimationFrame(function () { toastEl.classList.add("is_on"); });
    toastTimer = setTimeout(function () { toastEl.classList.remove("is_on"); }, 2800);
  }
  window.HALCYON_TOAST = toast;

  /* -------------------------------------------- SCROLL LOCK / FOCUS TRAP */
  var lockCount = 0;
  function lockScroll(on) {
    lockCount = Math.max(0, lockCount + (on ? 1 : -1));
    root.classList.toggle("is_locked", lockCount > 0);
  }
  function trapFocus(container, event) {
    if (event.key !== "Tab") return;
    var items = $$('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])', container)
      .filter(function (el) { return el.offsetParent !== null || el === doc.activeElement; });
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (event.shiftKey && doc.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && doc.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  /* ------------------------------------------------- HEADER / NAV */
  function initHeader(header) {
    var page = currentPage();
    var unitPages = ["alpha", "rearguard", "sfs"];

    $$("a[href]", header).forEach(function (link) {
      var target = link.getAttribute("href").split("/").pop().replace(/\.html$/, "") || "index";
      if (target === page) link.setAttribute("aria-current", "page");
    });

    var dropdown = $(".nav_dropdown", header);
    var dropBtn = dropdown && $("button", dropdown);
    if (dropdown && dropBtn) {
      if (unitPages.indexOf(page) > -1) dropBtn.classList.add("is_current");
      dropBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        var open = !dropdown.classList.contains("is_open");
        dropdown.classList.toggle("is_open", open);
        dropBtn.setAttribute("aria-expanded", String(open));
      });
      doc.addEventListener("click", function (e) {
        if (!dropdown.contains(e.target)) {
          dropdown.classList.remove("is_open");
          dropBtn.setAttribute("aria-expanded", "false");
        }
      });
    }

    var toggle = $(".nav_toggle", header);
    function setMenu(open) {
      header.classList.toggle("menu_open", open);
      if (toggle) toggle.setAttribute("aria-expanded", String(open));
      lockScroll(open);
      if (open && dropdown && unitPages.indexOf(page) > -1) {
        dropdown.classList.add("is_open");
        dropBtn.setAttribute("aria-expanded", "true");
      }
    }
    if (toggle) {
      toggle.addEventListener("click", function () { setMenu(!header.classList.contains("menu_open")); });
      $$(".site_nav a", header).forEach(function (a) {
        a.addEventListener("click", function () { if (header.classList.contains("menu_open")) setMenu(false); });
      });
      var mq = window.matchMedia("(min-width: 901px)");
      var onMq = function () { if (mq.matches && header.classList.contains("menu_open")) setMenu(false); };
      if (mq.addEventListener) mq.addEventListener("change", onMq);
    }

    doc.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      if (dropdown && dropdown.classList.contains("is_open")) {
        dropdown.classList.remove("is_open");
        dropBtn.setAttribute("aria-expanded", "false");
        dropBtn.focus();
      }
      if (header.classList.contains("menu_open")) { setMenu(false); toggle.focus(); }
    });

    var clock = $("[data-clock]", header);
    if (clock) {
      var fmt;
      try {
        fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
      } catch (e) { fmt = null; }
      var tick = function () {
        clock.textContent = "KST " + (fmt ? fmt.format(new Date()) : new Date().toTimeString().slice(0, 8));
      };
      tick();
      setInterval(tick, 1000);
    }

    var meter = $(".scroll_meter span", header);
    if (meter) {
      var queued = false;
      var update = function () {
        queued = false;
        var max = doc.documentElement.scrollHeight - window.innerHeight;
        meter.style.setProperty("--progress", max > 0 ? Math.min(1, window.scrollY / max).toFixed(4) : 0);
      };
      window.addEventListener("scroll", function () { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
      window.addEventListener("resize", update);
      update();
    }
  }

  function initNav() {
    var holder = doc.getElementById("nav-placeholder");
    if (!holder) return;
    fetch("./nav.html?v=200")
      .then(function (res) { if (!res.ok) throw new Error(res.status); return res.text(); })
      .then(function (html) {
        holder.innerHTML = html;
        var header = $("[data-site-header]", holder) || $(".site_header", holder);
        if (header) initHeader(header);
      })
      .catch(function () {});
  }

  function initSkipLink() {
    var main = $("main") || $(".record_frame");
    if (!main) return;
    if (!main.id) main.id = "main";
    if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
    var skip = doc.createElement("a");
    skip.className = "skip_link";
    skip.href = "#" + main.id;
    skip.textContent = "본문으로 건너뛰기";
    skip.setAttribute("data-no-transition", "");
    doc.body.insertBefore(skip, doc.body.firstChild);
  }

  /* ------------------------------------------------ PAGE TRANSITIONS */
  function initTransitions() {
    // Arrival veil is drawn by CSS; clear the flag once it has finished.
    if (root.classList.contains("is-arriving")) {
      setTimeout(function () { root.classList.remove("is-arriving"); }, 900);
    }

    var curtain = doc.createElement("div");
    curtain.className = "page_curtain";
    curtain.setAttribute("aria-hidden", "true");
    curtain.innerHTML = '<span class="page_curtain_text"></span>';
    doc.body.appendChild(curtain);
    var curtainText = curtain.firstChild;

    window.addEventListener("pageshow", function (e) {
      if (e.persisted) root.classList.remove("is-leaving", "is-arriving");
    });

    doc.addEventListener("click", function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest && e.target.closest("a[href]");
      if (!a) return;
      if ((a.target && a.target !== "_self") || a.hasAttribute("download") || a.hasAttribute("data-no-transition")) return;
      var raw = a.getAttribute("href");
      if (!raw || raw.charAt(0) === "#" || /^(mailto|tel|javascript):/i.test(raw)) return;
      var url;
      try { url = new URL(a.href, location.href); } catch (err) { return; }
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      if (/\.(png|jpe?g|webp|gif|svg|mp3|mp4|pdf)$/i.test(url.pathname)) return;

      e.preventDefault();
      if (RM) { location.href = url.href; return; }
      var label = url.pathname.split("/").pop().replace(/\.html$/, "") || "index";
      curtainText.textContent = "OPENING /" + label.toUpperCase();
      sSet("hc-arrive", "1");
      root.classList.add("is-leaving");
      setTimeout(function () { location.href = url.href; }, 400);
    });
  }

  /* --------------------------------------------------------- REVEAL */
  var revealObserver = null;
  function observeReveal(el) {
    if (!revealObserver) { el.classList.add("is_in"); return; }
    revealObserver.observe(el);
  }
  function initReveal() {
    var targets = $$("[data-reveal], [data-unfold], .draw_rule");
    if (!("IntersectionObserver" in window) || RM) {
      targets.forEach(function (el) { el.classList.add("is_in"); });
      return;
    }
    revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is_in");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.08 });
    targets.forEach(observeReveal);
  }

  /* ------------------------------------------------------ FIT TEXT
     Display titles unfold from compressed to wide; size them so the
     final (widest) state always fits its column. */
  function initFitText() {
    var els = $$(".home_title, .page_title, .unit_title, .hero_title");
    if (!els.length) return;
    function fit() {
      els.forEach(function (el) {
        el.style.fontSize = "";
        el.classList.add("is_measuring");
        var avail = el.clientWidth;
        var need = 0;
        var lines = $$(".ln > span", el);
        if (lines.length) {
          var left = el.getBoundingClientRect().left;
          lines.forEach(function (l) { need = Math.max(need, l.getBoundingClientRect().right - left); });
        } else {
          need = el.scrollWidth;
        }
        el.classList.remove("is_measuring");
        if (avail > 0 && need > avail) {
          var size = parseFloat(getComputedStyle(el).fontSize);
          el.style.fontSize = Math.floor(size * (avail / need) * 0.98) + "px";
        }
      });
    }
    fit();
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(fit);
    var t;
    window.addEventListener("resize", function () { clearTimeout(t); t = setTimeout(fit, 120); });
  }

  /* --------------------------------------------------- PAGE INDEX */
  function buildPageIndex(host, sections, getTitle) {
    if (sections.length < 3) return null;
    var nav = doc.createElement("nav");
    nav.className = "page_index";
    nav.setAttribute("aria-label", "이 페이지의 섹션");
    nav.innerHTML = '<span class="page_index_title t_label">INDEX</span>';
    var links = sections.map(function (section, i) {
      if (!section.id) section.id = "sec-" + (i + 1);
      var a = doc.createElement("a");
      a.href = "#" + section.id;
      a.setAttribute("data-no-transition", "");
      a.innerHTML = '<span class="n">' + pad(i + 1) + "</span><span></span>";
      a.lastChild.textContent = getTitle(section);
      a.addEventListener("click", function (e) {
        e.preventDefault();
        section.scrollIntoView({ behavior: RM ? "auto" : "smooth", block: "start" });
        if (history.replaceState) history.replaceState(null, "", "#" + section.id);
      });
      nav.appendChild(a);
      return a;
    });
    host.insertBefore(nav, host.firstChild);
    host.classList.add("has_index");

    var queued = false;
    function spy() {
      queued = false;
      var line = window.innerHeight * 0.32;
      var active = 0;
      sections.forEach(function (s, i) { if (s.getBoundingClientRect().top - line < 0) active = i; });
      var atEnd = window.innerHeight + window.scrollY >= doc.documentElement.scrollHeight - 4;
      if (atEnd) active = sections.length - 1;
      links.forEach(function (a, i) {
        var on = i === active;
        a.classList.toggle("is_active", on);
        if (on) a.setAttribute("aria-current", "location"); else a.removeAttribute("aria-current");
      });
    }
    window.addEventListener("scroll", function () { if (!queued) { queued = true; requestAnimationFrame(spy); } }, { passive: true });
    spy();
    return nav;
  }

  function initDocIndex() {
    // Unit pages
    $$("[data-doc-index]").forEach(function (layout) {
      var body = $(".doc_body", layout) || layout;
      var sections = $$(".doc_section", body);
      buildPageIndex(layout, sections, function (s) { var t = $(".sec_title", s); return t ? t.textContent.trim() : ""; });
    });

    // Profile pages (legacy markup, including profile-maker output)
    var frame = $(".profile_shell .record_frame");
    if (frame) {
      var sections = $$(":scope > .section, :scope > .kain-mid-record", frame);
      var nav = buildPageIndex(frame, sections, function (s) {
        var t = $(".section_title", s);
        if (t) return t.textContent.trim();
        return $$(".kain-section-title", s).map(function (x) { return x.textContent.trim(); }).join(" / ");
      });
    }
  }

  /* --------------------------------------------------------- HOME */
  function initBootAndHero() {
    var title = $(".home_title");
    var boot = $("[data-boot]");
    function playHero() {
      if (title) {
        title.classList.add("is_playing");
        setTimeout(function () { title.classList.remove("is_armed"); }, 1600);
      }
    }
    if (!boot) { playHero(); return; }

    if (sGet("hc-boot") || RM) { boot.parentNode.removeChild(boot); playHero(); return; }
    sSet("hc-boot", "1");
    boot.hidden = false;
    boot.setAttribute("aria-hidden", "true");

    var lines = $$(".boot_line", boot);
    var bar = $(".boot_bar span", boot);
    var grant = $(".boot_grant", boot);
    var timers = [];
    var finished = false;

    lines.forEach(function (line) { line.style.visibility = "hidden"; });
    lines.forEach(function (line, i) {
      timers.push(setTimeout(function () { line.style.visibility = "visible"; }, 120 + i * 190));
    });
    if (bar && bar.animate) {
      bar.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { duration: 1250, delay: 150, easing: "cubic-bezier(.65,0,.35,1)", fill: "forwards" });
    }
    timers.push(setTimeout(function () { if (grant) grant.classList.add("is_on"); }, 1400));
    timers.push(setTimeout(finish, 2450));

    function finish() {
      if (finished) return;
      finished = true;
      timers.forEach(clearTimeout);
      boot.classList.add("is_done");
      setTimeout(playHero, 180);
      setTimeout(function () { if (boot.parentNode) boot.parentNode.removeChild(boot); }, 800);
      doc.removeEventListener("keydown", finish);
    }
    boot.addEventListener("click", finish);
    doc.addEventListener("keydown", finish);
  }

  function parseRoster(html) {
    var dom = new DOMParser().parseFromString(html, "text/html");
    return $$(".roster_card", dom).map(function (card) {
      var img = $("img", card);
      var group = card.closest(".roster_group");
      return {
        name: ($(".card_name", card) || {}).textContent || "",
        code: ($(".card_code", card) || {}).textContent || "",
        attr: ($(".attr_tag", card) || {}).textContent || "",
        attrKey: card.getAttribute("data-attr") || "none",
        img: img ? img.getAttribute("src") : "",
        href: card.getAttribute("href"),
        pending: card.hasAttribute("data-pending"),
        unit: group ? ($(".group_name", group).childNodes[0].textContent || "").trim() : "",
        unitSub: group && $(".group_name small", group) ? $(".group_name small", group).textContent.trim() : ""
      };
    });
  }

  function initHomeData() {
    var scanner = $("[data-scanner]");
    var counters = $$("[data-count]");
    if (!scanner && !counters.length) return;

    if (window.HALCYON_PROMPTS) {
      $$('[data-count="prompt"]').forEach(function (el) { el.textContent = pad(window.HALCYON_PROMPTS.length); });
    }
    $$('[data-count="unit"]').forEach(function (el) { el.textContent = pad($$(".unit_links a").length); });

    fetch("./roster.html?v=200")
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (html) {
        var people = parseRoster(html).filter(function (p) { return p.img; });
        $$('[data-count="roster"]').forEach(function (el) { el.textContent = pad(people.length); });
        if (scanner && people.length) runScanner(scanner, people);
      })
      .catch(function () { if (scanner) scanner.hidden = true; });
  }

  function runScanner(el, people) {
    var stage = $(".scanner_stage", el);
    var nameEl = $(".scanner_name", el);
    var subEl = $(".scanner_sub", el);
    var idxEl = $("[data-scanner-index]", el);
    var ticks = $(".scanner_ticks", el);
    var line = $(".scanner_line", el);
    var prevBtn = $("[data-scanner-prev]", el);
    var nextBtn = $("[data-scanner-next]", el);
    var pauseBtn = $("[data-scanner-pause]", el);
    var i = Math.floor(Math.random() * people.length);
    var timer = null;
    var paused = RM;
    var hovering = false;

    ticks.innerHTML = people.map(function () { return "<i></i>"; }).join("");
    var tickEls = $$("i", ticks);

    function setPauseIcon() {
      pauseBtn.innerHTML = paused ? ICON.play : ICON.pause;
      pauseBtn.setAttribute("aria-label", paused ? "자동 순환 재생" : "자동 순환 일시정지");
    }

    function render(animate) {
      var p = people[i];
      var img = new Image();
      img.alt = p.name + " 프로필 이미지";
      img.decoding = "async";
      img.src = p.img;
      var old = $$("img", stage);
      var show = function () {
        if (animate && !RM) {
          img.className = "is_next";
          stage.insertBefore(img, line);
          void img.offsetWidth;
          img.classList.add("is_revealing");
          line.classList.remove("is_running"); void line.offsetWidth; line.classList.add("is_running");
          setTimeout(function () { old.forEach(function (o) { if (o.parentNode) o.parentNode.removeChild(o); }); img.className = ""; }, 950);
        } else {
          old.forEach(function (o) { o.parentNode.removeChild(o); });
          stage.insertBefore(img, line);
        }
      };
      if (img.complete) show(); else { img.onload = show; img.onerror = show; }

      stage.href = p.pending ? "roster" : p.href;
      stage.setAttribute("aria-label", p.name + (p.pending ? " — 명부에서 보기" : " 프로필 열기"));
      nameEl.textContent = p.code || p.name;
      subEl.innerHTML = "";
      [p.name, p.unit + (p.unitSub ? " " + p.unitSub : "")].forEach(function (t) {
        var s = doc.createElement("span"); s.textContent = t; subEl.appendChild(s);
      });
      var a = doc.createElement("span");
      a.className = "attr_tag"; a.setAttribute("data-attr", p.attrKey); a.textContent = p.attr;
      subEl.appendChild(a);
      idxEl.textContent = pad(i + 1) + " / " + pad(people.length);
      tickEls.forEach(function (t, n) { t.classList.toggle("is_on", n === i); });
    }

    function go(step) { i = (i + step + people.length) % people.length; render(true); schedule(); }
    function schedule() {
      clearTimeout(timer);
      if (!paused && !hovering && !doc.hidden) timer = setTimeout(function () { go(1); }, 4200);
    }

    prevBtn.innerHTML = ICON.prev; nextBtn.innerHTML = ICON.next;
    prevBtn.addEventListener("click", function () { go(-1); });
    nextBtn.addEventListener("click", function () { go(1); });
    pauseBtn.addEventListener("click", function () { paused = !paused; setPauseIcon(); schedule(); });
    el.addEventListener("mouseenter", function () { hovering = true; clearTimeout(timer); });
    el.addEventListener("mouseleave", function () { hovering = false; schedule(); });
    el.addEventListener("focusin", function () { hovering = true; clearTimeout(timer); });
    el.addEventListener("focusout", function () { hovering = false; schedule(); });
    doc.addEventListener("visibilitychange", schedule);

    el.hidden = false;
    setPauseIcon();
    render(false);
    schedule();
  }

  /* ------------------------------------------------------- ROSTER */
  function initRoster() {
    var roster = $("[data-roster]");
    if (!roster) return;
    var groups = $$(".roster_group", roster);
    var cards = $$(".roster_card", roster);
    var countEl = $("[data-result-count]");
    var empty = $("[data-roster-empty]");
    var state = { division: "all", attr: "all" };

    // Chip counts
    $$("[data-filter-division]").forEach(function (chip) {
      var v = chip.getAttribute("data-filter-division");
      var n = v === "all" ? cards.length : cards.filter(function (c) { return c.closest(".roster_group").getAttribute("data-division") === v; }).length;
      var slot = $(".n", chip); if (slot) slot.textContent = pad(n);
    });
    $$("[data-filter-attr]").forEach(function (chip) {
      var v = chip.getAttribute("data-filter-attr");
      var n = v === "all" ? cards.length : cards.filter(function (c) { return c.getAttribute("data-attr") === v; }).length;
      var slot = $(".n", chip); if (slot) slot.textContent = pad(n);
      if (n === 0 && v !== "all") chip.hidden = true;
    });

    function apply(animate) {
      var shown = 0;
      groups.forEach(function (g) {
        var divOk = state.division === "all" || g.getAttribute("data-division") === state.division;
        var inGroup = 0;
        $$(".roster_card", g).forEach(function (c) {
          var ok = divOk && (state.attr === "all" || c.getAttribute("data-attr") === state.attr);
          c.hidden = !ok;
          if (ok) inGroup++;
        });
        g.hidden = inGroup === 0;
        var gc = $("[data-group-count]", g);
        if (gc) gc.textContent = pad(inGroup) + " RECORDS";
        shown += inGroup;
      });
      if (countEl) countEl.innerHTML = "<b>" + pad(shown) + "</b> / " + pad(cards.length) + " RECORDS";
      if (empty) empty.hidden = shown !== 0;
      if (animate && !RM) {
        cards.filter(function (c) { return !c.hidden; }).forEach(function (c, n) {
          if (c.animate) c.animate([{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], { duration: 460, delay: Math.min(n, 14) * 28, easing: "cubic-bezier(.16,1,.3,1)", fill: "backwards" });
        });
      }
    }

    function bindChips(attrName, key) {
      var chips = $$("[" + attrName + "]");
      chips.forEach(function (chip) {
        chip.addEventListener("click", function () {
          state[key] = chip.getAttribute(attrName);
          chips.forEach(function (c) { c.setAttribute("aria-pressed", String(c === chip)); });
          apply(true);
        });
      });
    }
    bindChips("data-filter-division", "division");
    bindChips("data-filter-attr", "attr");

    var reset = $("[data-roster-reset]");
    if (reset) reset.addEventListener("click", function () {
      state.division = "all"; state.attr = "all";
      $$("[data-filter-division], [data-filter-attr]").forEach(function (c) {
        c.setAttribute("aria-pressed", String(c.getAttribute("data-filter-division") === "all" || c.getAttribute("data-filter-attr") === "all"));
      });
      apply(true);
    });

    // View toggle (remembered per browser)
    var viewBtns = $$("[data-view]");
    function setView(v, animate) {
      roster.classList.toggle("is_list", v === "list");
      viewBtns.forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-view") === v)); });
      try { local && local.setItem("hc-roster-view", v); } catch (e) {}
      if (animate) apply(true);
    }
    viewBtns.forEach(function (b) { b.addEventListener("click", function () { setView(b.getAttribute("data-view"), true); }); });
    var saved = null;
    try { saved = local && local.getItem("hc-roster-view"); } catch (e) {}
    setView(saved === "list" ? "list" : "grid", false);

    // Records without a published page
    cards.forEach(function (card) {
      if (!card.hasAttribute("data-pending")) return;
      card.addEventListener("click", function (e) {
        e.preventDefault();
        var name = ($(".card_name", card) || {}).textContent || "";
        toast(name + "의 상세 기록은 아직 등록되지 않았습니다.", "RECORD PENDING");
      });
    });

    apply(false);
  }

  /* -------------------------------------------- MEDIA LIGHTBOX (units) */
  function initUnitLightbox() {
    var photoLinks = $$(".member_photo, .sfs_photo, .rgr_photo");
    if (!photoLinks.length) return;

    photoLinks.forEach(function (link) {
      var img = $("img", link);
      if (!img) return;
      var mark = function () { link.classList.add("is_missing"); link.setAttribute("aria-disabled", "true"); };
      if (img.complete && img.naturalWidth === 0) mark();
      img.addEventListener("error", mark);
      if (!$(".zoom_hint", link) && link.classList.contains("member_photo")) {
        var hint = doc.createElement("span");
        hint.className = "zoom_hint"; hint.setAttribute("aria-hidden", "true"); hint.innerHTML = ICON.zoom;
        link.appendChild(hint);
      }
    });

    var lightbox = doc.createElement("div");
    lightbox.className = "unit_media_lightbox";
    lightbox.setAttribute("aria-hidden", "true");
    lightbox.innerHTML =
      '<div class="unit_media_lightbox_inner" role="dialog" aria-modal="true" aria-label="이미지 크게 보기">' +
      '<button class="unit_media_lightbox_close" type="button" aria-label="닫기">' + ICON.close + "</button>" +
      '<img class="unit_media_lightbox_img" src="data:," alt="">' +
      '<div class="unit_media_lightbox_hint">CLICK ANYWHERE OR PRESS ESC TO CLOSE</div>' +
      "</div>";
    doc.body.appendChild(lightbox);
    var lbImg = $(".unit_media_lightbox_img", lightbox);
    var closeBtn = $(".unit_media_lightbox_close", lightbox);
    var lastFocused = null;

    function close() {
      if (!lightbox.classList.contains("is_open")) return;
      lightbox.classList.remove("is_open");
      lightbox.setAttribute("aria-hidden", "true");
      lockScroll(false);
      if (lastFocused) lastFocused.focus();
    }
    function open(link) {
      if (link.classList.contains("is_missing")) return;
      var thumb = $("img", link);
      var full = link.getAttribute("data-full") || link.getAttribute("href") || (thumb ? thumb.getAttribute("src") : "");
      if (!full || full === "#") return;
      lastFocused = link;
      lbImg.src = full;
      lbImg.alt = thumb ? thumb.alt || "확대 이미지" : "확대 이미지";
      lightbox.classList.add("is_open");
      lightbox.setAttribute("aria-hidden", "false");
      lockScroll(true);
      closeBtn.focus();
    }
    photoLinks.forEach(function (link) {
      link.addEventListener("click", function (e) { e.preventDefault(); open(link); });
    });
    lightbox.addEventListener("click", close);
    lightbox.addEventListener("keydown", function (e) { trapFocus(lightbox, e); });
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  }

  /* ----------------------------------------------- PROMPT ARCHIVE */
  function initPromptArchive() {
    var strip = $("[data-prompt-strip]");
    var records = window.HALCYON_PROMPTS || [];
    if (!strip || !records.length) return;

    var nowEl = $("[data-strip-now]");
    var idxEl = $("[data-strip-index]");
    var prevBtn = $("[data-strip-prev]");
    var nextBtn = $("[data-strip-next]");
    var dialog = $("[data-archive-modal]");
    var active = 0;
    var items = [];

    records.forEach(function (record, i) {
      var b = doc.createElement("button");
      b.type = "button";
      b.className = "strip_item";
      b.setAttribute("aria-label", record.title + " 프롬프트 열기 (" + (i + 1) + " / " + records.length + ")");
      var img = doc.createElement("img");
      img.src = record.thumbnail;
      img.alt = "";
      img.decoding = "async";
      img.loading = i < 10 ? "eager" : "lazy";
      b.appendChild(img);
      b.insertAdjacentHTML("beforeend", '<span class="strip_label" aria-hidden="true"></span><span class="strip_open" aria-hidden="true"><b></b><span>' + pad(i + 1) + " / " + pad(records.length) + " · OPEN PROMPT</span></span>");
      $(".strip_label", b).textContent = record.title;
      $(".strip_open b", b).textContent = record.title;
      b.addEventListener("mouseenter", function () { if (HOVER) setActive(i); });
      b.addEventListener("focus", function () { setActive(i); });
      b.addEventListener("click", function () { setActive(i); openDialog(i, b); });
      strip.appendChild(b);
      items.push(b);
    });

    function loadFull(i) {
      var b = items[i];
      if (!b || b.dataset.full) return;
      b.dataset.full = "1";
      var full = new Image();
      full.className = "strip_full";
      full.alt = "";
      full.decoding = "async";
      full.onload = function () { full.classList.add("is_loaded"); };
      full.src = records[i].image;
      b.insertBefore(full, b.children[1]);
    }

    function setActive(i, scroll) {
      active = Math.max(0, Math.min(records.length - 1, i));
      loadFull(active);
      items.forEach(function (b, n) { b.classList.toggle("is_active", n === active); });
      if (nowEl) nowEl.textContent = records[active].title;
      if (idxEl) idxEl.textContent = pad(active + 1) + " / " + pad(records.length);
      if (prevBtn) prevBtn.disabled = active === 0;
      if (nextBtn) nextBtn.disabled = active === records.length - 1;
      if (scroll && items[active].scrollIntoView && strip.scrollWidth > strip.clientWidth) {
        items[active].scrollIntoView({ behavior: RM ? "auto" : "smooth", inline: "nearest", block: "nearest" });
      }
    }
    if (prevBtn) { prevBtn.innerHTML = ICON.prev; prevBtn.addEventListener("click", function () { setActive(active - 1, true); }); }
    if (nextBtn) { nextBtn.innerHTML = ICON.next; nextBtn.addEventListener("click", function () { setActive(active + 1, true); }); }

    strip.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        var n = active + (e.key === "ArrowRight" ? 1 : -1);
        n = Math.max(0, Math.min(records.length - 1, n));
        items[n].focus();
        setActive(n, true);
      }
    });
    setActive(0);

    if (!dialog) return;
    var dTitle = $("[data-modal-title]", dialog);
    var dImg = $("[data-modal-image]", dialog);
    var dPrompt = $("[data-modal-prompt]", dialog);
    var dIdx = $("[data-modal-index]", dialog);
    var dCopy = $("[data-copy-prompt]", dialog);
    var dCopyState = $("[data-copy-state]", dialog);
    var dPrev = $("[data-modal-prev]", dialog);
    var dNext = $("[data-modal-next]", dialog);
    var dClose = $(".dialog_close", dialog);
    var current = 0;
    var returnFocus = null;
    if (dPrev) dPrev.innerHTML = ICON.prev + "<span>PREV</span>";
    if (dNext) dNext.innerHTML = "<span>NEXT</span>" + ICON.next;
    if (dClose) dClose.innerHTML = ICON.close;

    function fill(i) {
      current = i;
      var r = records[i];
      dTitle.textContent = r.title;
      dImg.style.opacity = "0";
      dImg.onload = function () { dImg.style.transition = "opacity .5s"; dImg.style.opacity = "1"; };
      dImg.src = r.image;
      dImg.alt = r.title + " 원본 이미지";
      dPrompt.textContent = r.prompt;
      dIdx.textContent = pad(i + 1) + " / " + pad(records.length);
      dCopy.textContent = "COPY PROMPT";
      dCopyState.textContent = "";
      dCopyState.classList.remove("is_ok");
      dPrev.disabled = i === 0;
      dNext.disabled = i === records.length - 1;
      setActive(i);
    }
    function openDialog(i, source) {
      returnFocus = source;
      fill(i);
      dialog.classList.add("is_open");
      dialog.setAttribute("aria-hidden", "false");
      lockScroll(true);
      setTimeout(function () { dClose.focus(); }, 40);
    }
    function closeDialog() {
      if (!dialog.classList.contains("is_open")) return;
      dialog.classList.remove("is_open");
      dialog.setAttribute("aria-hidden", "true");
      lockScroll(false);
      var back = items[current] || returnFocus;
      if (back) back.focus();
    }
    $$("[data-archive-close]", dialog).forEach(function (b) { b.addEventListener("click", closeDialog); });
    dPrev.addEventListener("click", function () { if (current > 0) fill(current - 1); });
    dNext.addEventListener("click", function () { if (current < records.length - 1) fill(current + 1); });
    dialog.addEventListener("keydown", function (e) {
      trapFocus(dialog, e);
      if (e.key === "ArrowLeft" && current > 0) fill(current - 1);
      if (e.key === "ArrowRight" && current < records.length - 1) fill(current + 1);
    });
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape") closeDialog(); });

    dCopy.addEventListener("click", function () {
      var text = dPrompt.textContent;
      var done = function () {
        dCopy.textContent = "COPIED";
        dCopyState.textContent = "클립보드에 복사됨";
        dCopyState.classList.add("is_ok");
      };
      var fallback = function () {
        var field = doc.createElement("textarea");
        field.value = text; field.setAttribute("readonly", "");
        field.style.position = "fixed"; field.style.opacity = "0";
        doc.body.appendChild(field); field.select();
        try { doc.execCommand("copy"); done(); } catch (e) { dCopyState.textContent = "복사할 수 없습니다. 직접 선택해 복사하세요."; }
        field.remove();
      };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
      else fallback();
    });
  }

  /* --------------------------------------- LEGACY CHARACTER PROMPT MODAL */
  function initLegacyPromptModal() {
    var modal = $("[data-prompt-modal]") || doc.getElementById("characterPromptModal") || doc.getElementById("kainIdModal");
    if (!modal) return;
    var openBtns = $$("[data-open-prompt], #openIdCard, .kain-prompt-card");
    var closeBtns = $$("[data-close-prompt], .kain-modal-close", modal);
    var dim = $(".kain-modal-dim", modal);
    function open(e) { if (e) e.preventDefault(); modal.classList.add("is-open"); modal.setAttribute("aria-hidden", "false"); doc.body.classList.add("prompt-modal-open"); }
    function close(e) { if (e) e.preventDefault(); modal.classList.remove("is-open"); modal.setAttribute("aria-hidden", "true"); doc.body.classList.remove("prompt-modal-open"); }
    openBtns.forEach(function (b) { b.addEventListener("click", open); });
    closeBtns.forEach(function (b) { b.addEventListener("click", close); });
    if (dim) dim.addEventListener("click", close);
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  }

  /* --------------------------------------------------- BACKLOG PAGER */
  function initBacklogPager() {
    $$("[data-backlog-reader]").forEach(function (reader) {
      var pages = $$(".backlog_page", reader);
      var count = $("[data-backlog-count]", reader);
      var prev = $("[data-backlog-prev]", reader);
      var next = $("[data-backlog-next]", reader);
      var index = 0;
      if (!pages.length || !prev || !next) return;
      var live = $(".backlog_novel_body", reader);
      if (live) live.setAttribute("aria-live", "polite");

      function render(dir) {
        pages.forEach(function (page, i) {
          page.classList.toggle("is_active", i === index);
          page.classList.toggle("from_prev", i === index && dir < 0);
        });
        if (count) count.textContent = "Page " + pad(index + 1) + " / " + pad(pages.length);
        prev.disabled = index === 0;
        next.disabled = index === pages.length - 1;
      }
      prev.addEventListener("click", function () { if (index > 0) { index -= 1; render(-1); } });
      next.addEventListener("click", function () { if (index < pages.length - 1) { index += 1; render(1); } });
      render(0);
    });
  }

  /* ------------------------------------------------ BACKLOG LIGHTBOX */
  function initBacklogLightbox() {
    var lightbox = doc.getElementById("backlogLightbox");
    if (!lightbox) return;
    var img = $("img", lightbox);
    var visual = $(".backlog_novel_visual");
    var target = $(".backlog_novel_visual img, .backlog_novel_img");
    var lastFocused = null;
    if (!visual || !target || !img) return;

    visual.setAttribute("role", "button");
    visual.setAttribute("tabindex", "0");
    if (!visual.getAttribute("aria-label")) visual.setAttribute("aria-label", "이미지 크게 보기");

    function open() {
      lastFocused = doc.activeElement;
      img.src = target.src; // follows the image even after LEXI's record swap
      img.alt = target.alt;
      lightbox.classList.add("is_open");
      lightbox.setAttribute("aria-hidden", "false");
      lockScroll(true);
    }
    function close() {
      if (!lightbox.classList.contains("is_open")) return;
      lightbox.classList.remove("is_open");
      lightbox.setAttribute("aria-hidden", "true");
      lockScroll(false);
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    }
    visual.addEventListener("click", open);
    visual.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
    lightbox.addEventListener("click", close);
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  }

  /* ---------------------------------------------- IMAGE SONG PLAYERS */
  function initSongPlayers() {
    $$("[data-image-song-player], #kainImageSongPlayer").forEach(function (card) {
      if (card.dataset.songReady === "true") return;
      card.dataset.songReady = "true";

      var pick = function (a, b) { return $(a, card) || (b ? $(b, card) : null); };
      var audio = pick("[data-song-audio]", "audio");
      var playBtn = pick("[data-song-play]", "#kainSongPlay");
      var progress = pick("[data-song-progress]", 'input[type="range"]');
      var current = pick("[data-song-current]", "#kainSongCurrent");
      var duration = pick("[data-song-duration]", "#kainSongDuration");
      var lyricsOpen = pick("[data-lyrics-open]", ".kain-lyrics-btn");
      var lyricsClose = pick("[data-lyrics-close]", ".kain-lyrics-close");
      var lyricsOverlay = pick("[data-lyrics-overlay]", ".kain-lyrics-overlay");
      var waveBars = $$(".kain-song-wave span", card);
      var audioCtx = null, analyser = null, dataArray = null, sourceNode = null, rafId = null;

      if (playBtn && !playBtn.getAttribute("aria-label")) playBtn.setAttribute("aria-label", "play or pause");
      $$(".kain-song-btn:not(.play)", card).forEach(function (b) { b.disabled = true; b.title = "단일 트랙"; });

      var fmt = function (sec) {
        if (!isFinite(sec)) return "00:00";
        return pad(Math.floor(sec / 60)) + ":" + pad(Math.floor(sec % 60));
      };
      var updateProgress = function () {
        var d = (audio && audio.duration) || 0;
        var c = (audio && audio.currentTime) || 0;
        if (current) current.textContent = fmt(c);
        if (duration) duration.textContent = fmt(d);
        var ratio = d ? c / d : 0;
        if (progress) {
          progress.value = Math.max(0, Math.min(1000, ratio * 1000));
          progress.style.setProperty("--p", (ratio * 100).toFixed(2) + "%");
        }
      };
      var connect = function () {
        if (sourceNode || !audio) return;
        var Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        audioCtx = new Ctx();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.72;
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        sourceNode = audioCtx.createMediaElementSource(audio);
        sourceNode.connect(analyser);
        analyser.connect(audioCtx.destination);
      };
      var renderWave = function () {
        if (!analyser || !audio || audio.paused || audio.ended) { rafId = null; return; }
        analyser.getByteFrequencyData(dataArray);
        waveBars.forEach(function (bar, i) {
          var v = dataArray[Math.floor(i / waveBars.length * dataArray.length)] || 0;
          bar.style.height = (4 + v / 255 * 20).toFixed(1) + "px";
          bar.style.opacity = (0.24 + v / 255 * 0.66).toFixed(2);
        });
        rafId = requestAnimationFrame(renderWave);
      };
      var setBtn = function (playing) {
        if (!playBtn) return;
        playBtn.textContent = playing ? "Ⅱ" : "▶";
        playBtn.setAttribute("aria-pressed", String(playing));
      };
      var pause = function () {
        if (audio) audio.pause();
        card.classList.remove("is-fake-playing", "is-playing");
        setBtn(false);
        waveBars.forEach(function (bar) { bar.style.height = "4px"; bar.style.opacity = ".24"; });
      };
      var play = function () {
        try { connect(); } catch (e) {}
        var resume = audioCtx && audioCtx.state === "suspended" ? audioCtx.resume() : Promise.resolve();
        resume.then(function () { return audio.play(); }).then(function () {
          card.classList.remove("is-fake-playing");
          card.classList.add("is-playing");
          setBtn(true);
          if (!rafId) renderWave();
        }).catch(function () {
          // No audio file yet: keep the visual playback state, as before.
          card.classList.toggle("is-fake-playing");
          setBtn(card.classList.contains("is-fake-playing"));
        });
      };

      if (playBtn) playBtn.addEventListener("click", function () {
        if (card.classList.contains("is-fake-playing") || (audio && !audio.paused)) pause();
        else play();
      });
      if (audio) {
        audio.addEventListener("loadedmetadata", updateProgress);
        audio.addEventListener("timeupdate", updateProgress);
        audio.addEventListener("ended", function () {
          setBtn(false);
          card.classList.remove("is-playing");
          if (progress) { progress.value = 0; progress.style.setProperty("--p", "0%"); }
        });
      }
      if (progress) progress.addEventListener("input", function () {
        if (!audio || !audio.duration) return;
        audio.currentTime = Number(progress.value) / 1000 * audio.duration;
        updateProgress();
      });
      var setLyrics = function (open) {
        if (!lyricsOverlay) return;
        lyricsOverlay.classList.toggle("is-open", open);
        lyricsOverlay.setAttribute("aria-hidden", String(!open));
        if (lyricsOpen) lyricsOpen.setAttribute("aria-expanded", String(open));
        if (open && lyricsClose) lyricsClose.focus();
        else if (!open && lyricsOpen) lyricsOpen.focus();
      };
      if (lyricsOpen) lyricsOpen.addEventListener("click", function () { setLyrics(true); });
      if (lyricsClose) lyricsClose.addEventListener("click", function () { setLyrics(false); });
      if (lyricsOverlay) {
        lyricsOverlay.addEventListener("click", function (e) { if (e.target === lyricsOverlay) setLyrics(false); });
        lyricsOverlay.addEventListener("keydown", function (e) { if (e.key === "Escape") { e.stopPropagation(); setLyrics(false); } });
      }
      updateProgress();
    });
  }
  window.initHalcyonImageSongPlayers = initSongPlayers;

  /* --------------------------------------------------------- BOOT */
  ready(function () {
    initSkipLink();
    initNav();
    initTransitions();
    initFitText();
    initBootAndHero();
    initHomeData();
    initRoster();
    initDocIndex();
    initReveal();
    initUnitLightbox();
    initPromptArchive();
    initLegacyPromptModal();
    initBacklogPager();
    initBacklogLightbox();
    initSongPlayers();
  });
})();
