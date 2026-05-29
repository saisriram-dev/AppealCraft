/* --- Navbar scroll class --- */
const navbar = document.getElementById("navbar");
window.addEventListener("scroll", () => {
  navbar.classList.toggle("scrolled", window.scrollY > 20);
});

/* --- Ticker build --- */
const items = [
  "Unfair bank fees",
  "Denied refunds",
  "Security deposit disputes",
  "Flight cancellations",
  "Gym membership traps",
  "Insurance claim denials",
  "Landlord violations",
  "Hidden charges",
  "Subscription scams",
];
const track = document.getElementById("ticker-track");
// Duplicate for seamless loop
[...items, ...items].forEach((t) => {
  const el = document.createElement("span");
  el.className = "ticker-item";
  el.innerHTML = `<span class="ticker-dot"></span>${t}`;
  track.appendChild(el);
});

/* --- Scroll reveal --- */
const revealEls = document.querySelectorAll(".reveal");
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("visible");
        observer.unobserve(e.target);
      }
    });
  },
  { threshold: 0.15 },
);
revealEls.forEach((el) => observer.observe(el));
