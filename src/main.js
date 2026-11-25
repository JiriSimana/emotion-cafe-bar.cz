// Emotion Cafe & Bar — drobná interaktivita (bez knihoven)
(() => {
  const doc = document.documentElement;
  doc.classList.add('js');

  // Nadpisy: rozdělení na písmena kvůli animaci při načtení
  document.querySelectorAll('.display').forEach((h) => {
    const text = h.textContent.trim();
    h.setAttribute('aria-label', text);
    let i = 0;
    h.innerHTML = text.split(' ').map((word) =>
      `<span class="w" aria-hidden="true">${[...word].map((ch) =>
        `<span class="c" style="--i:${i++}">${ch === '&' ? '&amp;' : ch}</span>`).join('')}</span>`
    ).join(' ');
  });
  requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add('is-ready')));

  // Postupné objevování bloků při scrollu
  const reveal = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { threshold: 0 });
    reveal.forEach((el) => io.observe(el));
  } else {
    reveal.forEach((el) => el.classList.add('is-in'));
  }

  // Celoobrazovkové menu
  const overlay = document.getElementById('menu');
  const openBtn = document.querySelector('[data-menu-open]');
  const closeBtn = document.querySelector('[data-menu-close]');
  if (overlay && openBtn && closeBtn) {
    const set = (open) => {
      overlay.classList.toggle('is-open', open);
      overlay.setAttribute('aria-hidden', String(!open));
      openBtn.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
      (open ? closeBtn : openBtn).focus({ preventScroll: true });
    };
    openBtn.addEventListener('click', () => set(true));
    closeBtn.addEventListener('click', () => set(false));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && overlay.classList.contains('is-open')) set(false); });
  }

  // Slidery a pás fotek: šipky posouvají o jednu položku
  document.querySelectorAll('[data-slider]').forEach((root) => {
    const track = root.querySelector('ul');
    const prev = root.querySelector('[data-prev]');
    const next = root.querySelector('[data-next]');
    const step = () => {
      const li = track.querySelector('li');
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return li.getBoundingClientRect().width + gap;
    };
    const update = () => {
      const max = track.scrollWidth - track.clientWidth - 1;
      prev.disabled = track.scrollLeft <= 1;
      next.disabled = track.scrollLeft >= max;
    };
    prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
    next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  });

  // Video na úvodu spustit až po načtení stránky
  const video = document.querySelector('video[data-autoplay]');
  if (video) {
    const play = () => video.play().catch(() => {});
    if (document.readyState === 'complete') play(); else window.addEventListener('load', play);
  }
})();
