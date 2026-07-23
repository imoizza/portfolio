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
   Injects the paw icon as the site favicon on every page, working out
   the right relative path whether the page lives at the root or one
   folder down inside /case-studies/.
   --------------------------------------------------------------------- */
function initFavicon() {
  const prefix = window.location.pathname.includes("/case-studies/") ? "../" : "";
  const link = document.createElement("link");
  link.rel = "icon";
  link.type = "image/svg+xml";
  link.href = prefix + "assets/svg/dog-paw-svgrepo-com.svg";
  document.head.appendChild(link);
}

/* ---------------------------------------------------------------------
   Paw print image builder
   Takes the uploaded paw SVG and recolors it into a small set of
   pastel variants, preloaded once as Image objects the cursor trail
   can stamp onto the canvas.
   --------------------------------------------------------------------- */
const PAW_PATH_D =
  "M39.041,36.843c2.054,3.234,3.022,4.951,3.022,6.742c0,3.537-2.627,5.252-6.166,5.252" +
  "c-1.56,0-2.567-0.002-5.112-1.326c0,0-1.649-1.509-5.508-1.354c-3.895-0.154-5.545,1.373-5.545,1.373" +
  "c-2.545,1.323-3.516,1.309-5.074,1.309c-3.539,0-6.168-1.713-6.168-5.252c0-1.791,0.971-3.506,3.024-6.742" +
  "c0,0,3.881-6.445,7.244-9.477c2.43-2.188,5.973-2.18,5.973-2.18h1.093v-0.001c0,0,3.698-0.009,5.976,2.181" +
  "C35.059,30.51,39.041,36.844,39.041,36.843z M16.631,20.878c3.7,0,6.699-4.674,6.699-10.439S20.331,0,16.631,0" +
  "S9.932,4.674,9.932,10.439S12.931,20.878,16.631,20.878z M10.211,30.988c2.727-1.259,3.349-5.723,1.388-9.971" +
  "s-5.761-6.672-8.488-5.414s-3.348,5.723-1.388,9.971C3.684,29.822,7.484,32.245,10.211,30.988z M32.206,20.878" +
  "c3.7,0,6.7-4.674,6.7-10.439S35.906,0,32.206,0s-6.699,4.674-6.699,10.439C25.507,16.204,28.506,20.878,32.206,20.878z" +
  "M45.727,15.602c-2.728-1.259-6.527,1.165-8.488,5.414s-1.339,8.713,1.389,9.972c2.728,1.258,6.527-1.166,8.488-5.414" +
  "S48.455,16.861,45.727,15.602z";

const PAW_COLORS = ["#E7A8D0", "#9AB0EE", "#8FDDBE"]; // pastel pink, blue, mint

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

      p.alpha -= 0.005;
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
   5. Project hover preview
   A floating thumbnail that follows the cursor over each project row.
   --------------------------------------------------------------------- */
function initHoverPreview() {
  if (!finePointer || reduceMotion) return;

  const preview = document.querySelector(".hover-preview");
  const rows = document.querySelectorAll("[data-preview]");
  if (!preview || !rows.length) return;

  rows.forEach((row) => {
    row.addEventListener("mouseenter", () => {
      const src = row.dataset.previewImg;
      preview.innerHTML = src
        ? `<img src="${src}" alt="">`
        : row.dataset.preview;
      preview.classList.add("show");
    });

    row.addEventListener("mousemove", (e) => {
      preview.style.left = e.clientX + "px";
      preview.style.top  = e.clientY + "px";
    });

    row.addEventListener("mouseleave", () => {
      preview.classList.remove("show");
    });
  });
}

/* ---------------------------------------------------------------------
   6. Liquid distortion
   Builds an SVG turbulence/displacement filter and drives its strength
   from cursor speed — the faster you move, the more the hover-preview
   thumbnail ripples, settling flat the moment you stop. A lightweight,
   non-WebGL stand-in for that effect.
   --------------------------------------------------------------------- */
function initLiquidDistortion() {
  if (!finePointer || reduceMotion) return;

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", "0");
  svg.setAttribute("height", "0");
  svg.style.position = "absolute";
  svg.setAttribute("aria-hidden", "true");

  const filter = document.createElementNS(svgNS, "filter");
  filter.setAttribute("id", "liquid-distort");
  filter.setAttribute("x", "-20%");
  filter.setAttribute("y", "-20%");
  filter.setAttribute("width", "140%");
  filter.setAttribute("height", "140%");

  const turb = document.createElementNS(svgNS, "feTurbulence");
  turb.setAttribute("type", "fractalNoise");
  turb.setAttribute("baseFrequency", "0.012 0.03");
  turb.setAttribute("numOctaves", "2");
  turb.setAttribute("seed", "4");
  turb.setAttribute("result", "noise");

  const disp = document.createElementNS(svgNS, "feDisplacementMap");
  disp.setAttribute("in", "SourceGraphic");
  disp.setAttribute("in2", "noise");
  disp.setAttribute("scale", "0");
  disp.setAttribute("xChannelSelector", "R");
  disp.setAttribute("yChannelSelector", "G");

  filter.appendChild(turb);
  filter.appendChild(disp);
  svg.appendChild(filter);
  document.body.appendChild(svg);

  let lastX = 0, lastY = 0, lastT = performance.now();
  let targetScale = 0, currentScale = 0;

  document.addEventListener("mousemove", (e) => {
    const now = performance.now();
    const dt = Math.max(now - lastT, 1);
    const dist = Math.hypot(e.clientX - lastX, e.clientY - lastY);
    const speed = dist / dt; // px per ms

    targetScale = Math.min(speed * 90, 55);

    lastX = e.clientX;
    lastY = e.clientY;
    lastT = now;
  });

  (function settle() {
    currentScale += (targetScale - currentScale) * 0.25;
    targetScale *= 0.9; // decays on its own between mousemove events
    disp.setAttribute("scale", currentScale.toFixed(1));
    requestAnimationFrame(settle);
  })();
}

/* ---------------------------------------------------------------------
   7. Opal dust
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
   8. Sticky nav hairline
   --------------------------------------------------------------------- */
function initNav() {
  const nav = document.querySelector(".site-nav");
  if (!nav) return;

  const onScroll = () => nav.classList.toggle("stuck", window.scrollY > 12);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

/* ---------------------------------------------------------------------
   9. Console note — for the curious few who open dev tools
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
  initHoverPreview();
  initLiquidDistortion();
  initOpalDust();
  initNav();
  initConsoleNote();
});