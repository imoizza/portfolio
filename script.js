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
   Recolors the paw into a darker pastel (distinct from the trail
   colors, since a light pastel disappears at favicon size) and
   injects it as a data URI — works the same from any page depth.
   --------------------------------------------------------------------- */
function initFavicon() {
  const FAVICON_COLOR = "#8B6BB8"; // darker pastel plum — visible at tab size
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48.839 48.839">` +
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
  "M132.64,177.859c31.162,0,56.508-34.014,56.508-75.834c0-41.817-25.347-75.841-56.508-75.841" +
  "c-31.153,0-56.502,34.023-56.502,75.841C76.138,143.845,101.487,177.859,132.64,177.859z" +
  "M300.246,251.628c-1.159-1.579-2.27-3.068-2.864-4.348c-12.635-27.046-47.27-58.931-103.382-59.724l-2.159-0.012" +
  "c-55.25,0-89.627,30.197-103.381,58.469c-0.475,0.967-1.52,2.222-2.627,3.549c-1.31,1.555-2.606,3.146-3.714,4.875" +
  "c-11.619,18.075-17.543,38.426-16.669,57.299c0.916,20.037,9.305,36.131,23.581,45.312c5.768,3.705,11.992,5.572,18.522,5.572" +
  "c13.465,0,25.793-7.584,40.079-16.368c9.083-5.598,18.465-11.374,28.886-15.697c1.168-0.385,5.954-0.973,13.781-0.973" +
  "c9.307,0,15.991,0.828,17.419,1.321c10.173,4.491,19.107,10.382,27.748,16.068c13.247,8.731,25.755,16.97,39.326,16.97" +
  "c5.824,0,11.469-1.537,16.795-4.563c29.382-16.693,34.979-62.492,12.484-102.088C302.942,255.303,301.597,253.448,300.246,251.628z" +
  "M252.796,177.859c31.147,0,56.499-34.014,56.499-75.834c0-41.817-25.352-75.841-56.499-75.841" +
  "c-31.165,0-56.511,34.023-56.511,75.841C196.285,143.845,221.631,177.859,252.796,177.859z" +
  "M345.595,138.918c-24.975,0-44.521,25.901-44.521,58.967c0,33.051,19.558,58.955,44.521,58.955" +
  "c24.961,0,44.531-25.904,44.531-58.955C390.126,164.82,370.568,138.918,345.595,138.918z" +
  "M89.048,197.885c0-33.065-19.558-58.967-44.522-58.967C19.561,138.918,0,164.82,0,197.885" +
  "c0,33.051,19.561,58.955,44.526,58.955C69.491,256.84,89.048,230.936,89.048,197.885z";

const PAW_COLORS = ["#D98FBB", "#7C93E0", "#6FC9A8"]; // darker pastel pink, blue, mint

function buildPawImages() {
  return PAW_COLORS.map((color) => {
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48.839 48.839">` +
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

    // A new paw print roughly every ~46px moved, so prints don't crowd.
    const dx = mouseX - lastStepX;
    const dy = mouseY - lastStepY;
    const dist = Math.hypot(dx, dy);
    if (dist > 46) {
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

      p.alpha -= 0.01;
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