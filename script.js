/* =====================================================================
   Interaction layer
   Everything here degrades gracefully: touch devices skip the cursor
   effects, and "prefers-reduced-motion" turns the whole lot off.
   ===================================================================== */

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer  = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

/* ---------------------------------------------------------------------
   1. Dice loader
   Rolls once, settles, then fades out to reveal the page.
   --------------------------------------------------------------------- */
function initLoader() {
  const loader = document.getElementById("loader");
  if (!loader) return;

  const finish = () => loader.classList.add("hide");

  if (reduceMotion) { finish(); return; }

  setTimeout(finish, 1600);
  setTimeout(finish, 4200); // safety net — never trap a visitor
}

/* ---------------------------------------------------------------------
   0. Favicon
   Recolours the paw into a pastel purple and injects it as a data URI,
   so it works from any page depth without a file path.
   --------------------------------------------------------------------- */
function initFavicon() {
  const FAVICON_COLOR = "#A78BD9"; // pastel purple
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="25 26 50 50">` +
    `<path fill="${FAVICON_COLOR}" d="${PAW_PATH_D}"/></svg>`;
  const link = document.createElement("link");
  link.rel = "icon";
  link.type = "image/svg+xml";
  link.href = "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  document.head.appendChild(link);
}

/* ---------------------------------------------------------------------
   Paw print image builder
   Takes the uploaded paw SVG and recolors it into a small set of
   pastel variants, preloaded once as Image objects the cursor trail
   can stamp onto the canvas.
   --------------------------------------------------------------------- */
const PAW_PATH_D =
  "M29.22,44.21c-2,1.14-2.3,4.28-.72,7s4.46,4,6.44,2.89,2.3-4.29.72-7S31.19,43.07,29.22,44.21ZM70.78,44.21c-2-1.14-4.86.15-6.44,2.89s-1.25,5.88.72,7,4.86-.16,6.44-2.89S72.76,45.35,70.78,44.21ZM43.85,45.86c3.07-.71,4.83-4.45,3.93-8.35S43.66,31,40.59,31.73s-4.83,4.45-3.93,8.35S40.78,46.57,43.85,45.86ZM59.41,31.73c-3.07-.71-6.29,1.88-7.19,5.78s.86,7.64,3.93,8.35,6.29-1.88,7.19-5.78S62.48,32.44,59.41,31.73ZM59.42,54.75A40.8,40.8,0,0,1,56,51.63a8.33,8.33,0,0,0-11.94,0,40.8,40.8,0,0,1-3.45,3.12,6.92,6.92,0,0,0-2.81,5.31c0,4.6,5.47,8.32,12.23,8.32s12.23-3.72,12.23-8.32A6.92,6.92,0,0,0,59.42,54.75Z";

const PAW_COLORS = ["#E7A8D0", "#9AB0EE", "#8FDDBE"]; // pastel pink, blue, mint

function buildPawImages() {
  return PAW_COLORS.map((color) => {
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="25 26 50 50">` +
      `<path fill="${color}" d="${PAW_PATH_D}"/></svg>`;
    const img = new Image();
    img.src = "data:image/svg+xml;utf8," + encodeURIComponent(svg);
    return img;
  });
}

/* ---------------------------------------------------------------------
   2. Custom cursor
   A small dot tracks exactly. Moving it leaves paw prints behind —
   alternating left/right, cycling through pastel colors, fading out —
   like walking across the page.
   A floating label appears over anything clickable.
   --------------------------------------------------------------------- */
function initCursor() {
  if (!finePointer || reduceMotion) return;

  const dot = document.querySelector(".cursor-dot");
  if (!dot) return;

  const pawImages = buildPawImages();

  // Canvas for the paw-print trail — created once, reused across the page.
  const canvas = document.createElement("canvas");
  canvas.id = "cursor-trail-canvas";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  // Floating label shown when hovering anything interactive.
  const label = document.createElement("div");
  label.className = "cursor-label";
  document.body.appendChild(label);

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize);

  let mouseX = 0, mouseY = 0;
  let lastStepX = 0, lastStepY = 0;
  let stepSide = 1;
  let colorCounter = 0;
  const steps = [];
  const PAW_SIZE = 40;

  function spawnStep(x, y, dirAngle) {
    const perp = dirAngle + Math.PI / 2;
    stepSide *= -1; // alternate left/right paw
    const offset = 11;
    colorCounter = (colorCounter + 1) % PAW_COLORS.length;
    steps.push({
      x: x + Math.cos(perp) * offset * stepSide,
      y: y + Math.sin(perp) * offset * stepSide,
      dirAngle,
      alpha: 0.55,
      colorIdx: colorCounter,
    });
  }

  document.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    dot.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
    label.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -46px)`;
    document.body.classList.add("cursor-ready");

    // A new paw print roughly every ~28px moved, so the trail stays tight.
    const dx = mouseX - lastStepX;
    const dy = mouseY - lastStepY;
    const dist = Math.hypot(dx, dy);
    if (dist > 28) {
      spawnStep(mouseX, mouseY, Math.atan2(dy, dx));
      lastStepX = mouseX;
      lastStepY = mouseY;
    }
  });

  (function paint() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (let i = steps.length - 1; i >= 0; i--) {
      const p = steps[i];
      const img = pawImages[p.colorIdx];

      if (img.complete && img.naturalWidth > 0) {
        ctx.save();
        ctx.globalAlpha = Math.max(p.alpha, 0);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.dirAngle + Math.PI / 2);
        ctx.drawImage(img, -PAW_SIZE / 2, -PAW_SIZE / 2, PAW_SIZE, PAW_SIZE);
        ctx.restore();
      }

      p.alpha -= 0.003;
      if (p.alpha <= 0) steps.splice(i, 1);
    }
    requestAnimationFrame(paint);
  })();

  const targets = document.querySelectorAll(
    "a, button, .project-row, .hobby-card, .chip, .polaroid"
  );

  targets.forEach((el) => {
    el.addEventListener("mouseenter", () => {
      label.textContent = el.dataset.cursor || "";
      if (el.dataset.cursor) label.classList.add("show");
    });
    el.addEventListener("mouseleave", () => {
      label.classList.remove("show");
    });
  });

  document.addEventListener("mouseleave", () => {
    document.body.classList.remove("cursor-ready");
  });
}

/* ---------------------------------------------------------------------
   3. Scroll reveal
   Fades elements up as they enter the viewport, once each.
   --------------------------------------------------------------------- */
function initReveal() {
  const items = document.querySelectorAll(".reveal");
  if (!items.length) return;

  if (reduceMotion || !("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("in"));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (!entry.isIntersecting) return;
      // Slight stagger so groups cascade instead of popping together.
      setTimeout(() => entry.target.classList.add("in"), i * 70);
      io.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -60px 0px" });

  items.forEach((el) => io.observe(el));
}

/* ---------------------------------------------------------------------
   4. Magnetic buttons
   Nudges the element a few pixels toward the pointer while hovering.
   --------------------------------------------------------------------- */
function initMagnetic() {
  if (!finePointer || reduceMotion) return;

  document.querySelectorAll("[data-magnetic]").forEach((el) => {
    const strength = Number(el.dataset.magnetic) || 0.28;

    el.addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2);
      const y = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
    });

    el.addEventListener("mouseleave", () => { el.style.transform = ""; });
  });
}

/* ---------------------------------------------------------------------
   5. Opal dust
   Scatters small drifting specks around the blob visual. Pure CSS
   handles the motion — JS just randomizes position, size and drift.
   --------------------------------------------------------------------- */
function initOpalDust() {
  const field = document.querySelector(".opal-dust");
  if (!field) return;

  const count = reduceMotion ? 0 : 26;

  for (let i = 0; i < count; i++) {
    const speck = document.createElement("span");
    speck.className = "opal-speck";

    const size = 2 + Math.random() * 4;
    const dx = (Math.random() - 0.5) * 160;
    const dy = -60 - Math.random() * 140;
    const duration = 6 + Math.random() * 8;
    const delay = Math.random() * 8;

    speck.style.width = `${size}px`;
    speck.style.height = `${size}px`;
    speck.style.left = `${45 + Math.random() * 30}%`;
    speck.style.top = `${35 + Math.random() * 40}%`;
    speck.style.setProperty("--dx", `${dx}px`);
    speck.style.setProperty("--dy", `${dy}px`);
    speck.style.animationDuration = `${duration}s`;
    speck.style.animationDelay = `-${delay}s`;

    field.appendChild(speck);
  }
}

/* ---------------------------------------------------------------------
   6. Word-by-word heading reveal
   Wraps each word of the main headings in a span and staggers them in,
   timed to land just as the dice loader finishes fading.
   --------------------------------------------------------------------- */
function initWordReveal() {
  if (reduceMotion) return;

  function wrapWords(node) {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((piece) => {
          if (piece.trim() === "") {
            frag.appendChild(document.createTextNode(piece));
          } else {
            const span = document.createElement("span");
            span.className = "word";
            span.textContent = piece;
            frag.appendChild(span);
          }
        });
        node.replaceChild(frag, child);
      } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== "BR") {
        wrapWords(child);
      }
    });
  }

  const headings = document.querySelectorAll(".hero h1, .page-head h1");
  headings.forEach((h) => wrapWords(h));

  // Land the first word right as the loader finishes (~1.6s), then
  // stagger the rest in shortly after.
  setTimeout(() => {
    headings.forEach((h) => {
      h.querySelectorAll(".word").forEach((w, i) => {
        setTimeout(() => w.classList.add("in"), i * 45);
      });
    });
  }, 1650);
}

/* ---------------------------------------------------------------------
   7. Animated count-up stats
   Numbers on the résumé page count up from 0 the first time they
   scroll into view, preserving whatever prefix/suffix they had
   ("60%", "1,000+", etc).
   --------------------------------------------------------------------- */
function initCountUp() {
  const els = document.querySelectorAll(".stat .big");
  if (!els.length || reduceMotion || !("IntersectionObserver" in window)) return;

  function animate(el) {
    const raw = el.textContent.trim();
    const match = raw.match(/^(\D*)([\d,]+)(.*)$/);
    if (!match) return;

    const [, prefix, numStr, suffix] = match;
    const target = parseInt(numStr.replace(/,/g, ""), 10);
    const hasComma = numStr.includes(",");
    const duration = 1100;
    const start = performance.now();

    function tick(now) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const val = Math.round(target * eased);
      el.textContent = prefix + (hasComma ? val.toLocaleString() : val) + suffix;
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      animate(entry.target);
      io.unobserve(entry.target);
    });
  }, { threshold: 0.4 });

  els.forEach((el) => io.observe(el));
}

/* ---------------------------------------------------------------------
   8. Section progress rail
   On pages with several numbered .cs-section elements (case studies),
   builds a small fixed dot-rail that highlights the section currently
   in view — a lightweight nod to scroll-progress patterns.
   --------------------------------------------------------------------- */
function initSectionRail() {
  const sections = document.querySelectorAll("section.cs-section");
  if (sections.length < 2 || !("IntersectionObserver" in window)) return;

  const rail = document.createElement("div");
  rail.className = "section-rail";
  rail.setAttribute("aria-hidden", "true");

  const dots = Array.from(sections).map(() => {
    const dot = document.createElement("span");
    dot.className = "rail-dot";
    rail.appendChild(dot);
    return dot;
  });
  document.body.appendChild(rail);

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const idx = Array.from(sections).indexOf(entry.target);
      dots.forEach((d) => d.classList.remove("active"));
      dots[idx].classList.add("active");
    });
  }, { threshold: 0.5 });

  sections.forEach((s) => io.observe(s));
}

/* ---------------------------------------------------------------------
   8b. Case-study rail
   The sticky left column on the long-form case studies: highlights the
   section you're reading and fills a progress line as you scroll it.
   --------------------------------------------------------------------- */
function initCaseRail() {
  const rail = document.querySelector(".cs-rail");
  const layout = document.querySelector(".cs-layout");
  const blocks = Array.from(document.querySelectorAll(".cs-block"));
  if (!rail || !layout || blocks.length < 2) return;

  const links = Array.from(rail.querySelectorAll(".cs-rail-list a"));
  const fill = rail.querySelector(".cs-rail-track i");

  const setActive = (id) => {
    links.forEach((a) => {
      a.parentElement.classList.toggle("active", a.getAttribute("href") === "#" + id);
    });
  };

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); });
    }, { rootMargin: "-20% 0px -70% 0px", threshold: 0 });
    blocks.forEach((b) => io.observe(b));
  }

  if (fill && !reduceMotion) {
    let ticking = false;
    const update = () => {
      ticking = false;
      const start = layout.offsetTop - 120;
      const end = layout.offsetTop + layout.offsetHeight - window.innerHeight;
      const p = Math.min(Math.max((window.scrollY - start) / (end - start), 0), 1);
      fill.style.transform = "scaleY(" + p.toFixed(4) + ")";
    };
    document.addEventListener("scroll", () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  }
}

/* ---------------------------------------------------------------------
   9. Hero parallax
   The polaroid drifts very slightly on scroll, independent of its own
   rotation/hover transform (uses `top`, not `transform`, so the two
   never fight each other).
   --------------------------------------------------------------------- */
function initParallax() {
  if (reduceMotion) return;

  const polaroid = document.querySelector(".polaroid");
  if (!polaroid) return;

  polaroid.style.position = "relative";

  window.addEventListener("scroll", () => {
    const offset = Math.min(window.scrollY * 0.08, 24);
    polaroid.style.top = `${offset}px`;
  }, { passive: true });
}

/* ---------------------------------------------------------------------
   10. Sticky nav hairline
   --------------------------------------------------------------------- */
function initNav() {
  const nav = document.querySelector(".site-nav");
  if (!nav) return;

  const onScroll = () => nav.classList.toggle("stuck", window.scrollY > 12);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

/* ---------------------------------------------------------------------
   11. Console note — for the curious few who open dev tools
   --------------------------------------------------------------------- */
function initConsoleNote() {
  console.log(
    "%cYou opened dev tools. Respect.",
    "font-family: monospace; font-size: 13px; color: #14110F;"
  );
  console.log(
    "%cHand-written HTML & CSS. No framework was harmed.\nSay hi: moizzaazhar24@gmail.com",
    "font-family: monospace; font-size: 11px; color: #90867B;"
  );
}

/* --------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  initFavicon();
  initLoader();
  initCursor();
  initReveal();
  initMagnetic();
  initOpalDust();
  initWordReveal();
  initCountUp();
  initSectionRail();
  initCaseRail();
  initParallax();
  initNav();
  initConsoleNote();
});