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
   2. Custom cursor
   A small dot that tracks exactly, plus a ring that lags behind it.
   The ring swells and shows a label over anything clickable.
   --------------------------------------------------------------------- */
function initCursor() {
  if (!finePointer || reduceMotion) return;

  const dot  = document.querySelector(".cursor-dot");
  const ring = document.querySelector(".cursor-ring");
  if (!dot || !ring) return;

  let mouseX = 0, mouseY = 0;
  let ringX  = 0, ringY  = 0;

  document.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    dot.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
    document.body.classList.add("cursor-ready");
  });

  // Ring eases toward the pointer for a soft trailing feel.
  (function trail() {
    ringX += (mouseX - ringX) * 0.16;
    ringY += (mouseY - ringY) * 0.16;
    ring.style.transform = `translate(${ringX}px, ${ringY}px)`;
    requestAnimationFrame(trail);
  })();

  const targets = document.querySelectorAll(
    "a, button, .project-row, .hobby-card, .chip, .polaroid"
  );

  targets.forEach((el) => {
    el.addEventListener("mouseenter", () => {
      ring.classList.add("is-hover");
      dot.classList.add("is-hover");
      ring.setAttribute("data-label", el.dataset.cursor || "");
    });
    el.addEventListener("mouseleave", () => {
      ring.classList.remove("is-hover");
      dot.classList.remove("is-hover");
      ring.setAttribute("data-label", "");
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
   6. Opal dust
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
   7. Sticky nav hairline
   --------------------------------------------------------------------- */
function initNav() {
  const nav = document.querySelector(".site-nav");
  if (!nav) return;

  const onScroll = () => nav.classList.toggle("stuck", window.scrollY > 12);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

/* ---------------------------------------------------------------------
   8. Console note — for the curious few who open dev tools
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
  initLoader();
  initCursor();
  initReveal();
  initMagnetic();
  initHoverPreview();
  initOpalDust();
  initNav();
  initConsoleNote();
});
