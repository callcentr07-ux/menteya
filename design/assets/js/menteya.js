// Шапка: сжатие при прокрутке, меню «Услуги» и «О клинике», мобильное меню
(function(){
  var header = document.getElementById('siteHeader');
  var scrim = document.getElementById('scrim');
  var drawer = document.getElementById('mobileMenu');
  var burger = header.querySelector('.burger');
  var triggers = header.querySelectorAll('[data-menu]');
  var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var openTrigger = null;
  var closeTimer = null;

  var ticking = false;
  function onScroll(){
    if(ticking) return;
    ticking = true;
    requestAnimationFrame(function(){
      header.classList.toggle('is-scrolled', window.scrollY > 8);
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive:true });
  onScroll();

  function panelOf(t){ return document.getElementById(t.getAttribute('aria-controls')); }

  function closeMenu(){
    if(!openTrigger) return;
    openTrigger.setAttribute('aria-expanded', 'false');
    panelOf(openTrigger).classList.remove('open');
    openTrigger = null;
    scrim.classList.remove('show');
  }
  function openMenu(t){
    clearTimeout(closeTimer);
    if(openTrigger === t) return;
    closeMenu();
    openTrigger = t;
    t.setAttribute('aria-expanded', 'true');
    panelOf(t).classList.add('open');
    if(t.dataset.menu === 'mega') scrim.classList.add('show');
  }

  triggers.forEach(function(t){
    var panel = panelOf(t);
    t.addEventListener('click', function(){
      openTrigger === t ? closeMenu() : openMenu(t);
    });
    if(canHover){
      [t, panel].forEach(function(el){
        el.addEventListener('mouseenter', function(){ openMenu(t); });
        el.addEventListener('mouseleave', function(){ closeTimer = setTimeout(closeMenu, 180); });
      });
    }
    panel.addEventListener('click', function(e){ if(e.target.closest('a')) closeMenu(); });
  });

  function setDrawer(open){
    if(open){ drawer.style.top = header.getBoundingClientRect().bottom + 'px'; }
    drawer.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    document.body.classList.toggle('no-scroll', open);
  }
  burger.addEventListener('click', function(){
    setDrawer(!drawer.classList.contains('open'));
  });
  drawer.addEventListener('click', function(e){ if(e.target.closest('a')) setDrawer(false); });

  scrim.addEventListener('click', closeMenu);
  document.addEventListener('click', function(e){
    if(openTrigger && !header.contains(e.target)) closeMenu();
  });
  document.addEventListener('keydown', function(e){
    if(e.key !== 'Escape') return;
    if(openTrigger){ var t = openTrigger; closeMenu(); t.focus(); }
    if(drawer.classList.contains('open')){ setDrawer(false); burger.focus(); }
  });
  window.matchMedia('(min-width: 1200px)').addEventListener('change', function(m){
    if(m.matches) setDrawer(false); else closeMenu();
  });
})();

// Галерея «О клинике»: миниатюры, стрелки, свайп. Автосмену ведёт CSS-полоса прогресса:
// её animationend переключает кадр, поэтому пауза при наведении и вне экрана работает сама.
document.querySelectorAll('.gallery').forEach(function(g){
  var slides = g.querySelectorAll('.gallery-slide');
  var thumbs = g.querySelectorAll('.gallery-thumb');
  var caption = g.querySelector('.gallery-caption span');
  var current = 0;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function show(i){
    current = (i + slides.length) % slides.length;
    slides.forEach(function(s, k){ s.classList.toggle('is-active', k === current); });
    thumbs.forEach(function(t, k){
      t.classList.toggle('is-active', k === current);
      if(k === current) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current');
    });
    caption.textContent = thumbs[current].dataset.caption;
  }

  thumbs.forEach(function(t, k){
    t.addEventListener('click', function(){ show(k); });
    t.querySelector('.bar').addEventListener('animationend', function(){ show(current + 1); });
  });
  g.querySelector('.gallery-btn.prev').addEventListener('click', function(){ show(current - 1); });
  g.querySelector('.gallery-btn.next').addEventListener('click', function(){ show(current + 1); });

  var stage = g.querySelector('.gallery-stage');
  var startX = null;
  stage.addEventListener('pointerdown', function(e){ startX = e.clientX; });
  stage.addEventListener('pointerup', function(e){
    if(startX === null) return;
    var dx = e.clientX - startX;
    startX = null;
    if(Math.abs(dx) > 40) show(current + (dx < 0 ? 1 : -1));
  });
  stage.addEventListener('pointercancel', function(){ startX = null; });

  if(reduce) return;
  g.classList.add('is-playing');
  if('IntersectionObserver' in window){
    new IntersectionObserver(function(entries){
      g.classList.toggle('is-offscreen', !entries[0].isIntersecting);
    }).observe(g);
  }
});

// Досчёт цифр «12 400+», «96%» — один раз, когда карточки появились на экране
(function(){
  var nums = document.querySelectorAll('[data-count]');
  if(!nums.length || !('IntersectionObserver' in window)) return;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var fmt = new Intl.NumberFormat('ru-RU');
  function run(el){
    var target = +el.dataset.count;
    var suffix = el.dataset.suffix || '';
    var t0 = null;
    function frame(t){
      if(t0 === null) t0 = t;
      var p = Math.min((t - t0) / 1400, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt.format(Math.round(target * eased)) + suffix;
      if(p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(!e.isIntersecting) return;
      io.unobserve(e.target);
      run(e.target);
    });
  }, { threshold:.6 });
  nums.forEach(function(el){ io.observe(el); });
})();

// Врачи: фильтр по специализации + поиск по имени. Счётчики считаются по карточкам.
// В WordPress это станет запросом к записям «Врачи» с таксономией «Специализация».
(function(){
  var root = document.getElementById('doctors');
  if(!root) return;
  var cards = Array.prototype.slice.call(root.querySelectorAll('.doc-card'));
  var filters = root.querySelectorAll('.doc-filter');
  var input = root.querySelector('.doc-search input');
  var empty = root.querySelector('.doctors-empty');
  var layout = root.querySelector('.doctors-layout');
  var role = 'all';

  function hasRole(card, r){ return r === 'all' || card.dataset.roles.split(' ').indexOf(r) !== -1; }

  filters.forEach(function(f){
    var r = f.dataset.filter;
    f.querySelector('.count').textContent = cards.filter(function(c){ return hasRole(c, r); }).length;
  });

  function apply(){
    var q = input.value.trim().toLowerCase();
    var shown = 0;
    cards.forEach(function(c){
      var ok = hasRole(c, role) && (!q || c.dataset.search.toLowerCase().indexOf(q) !== -1);
      c.hidden = !ok;
      if(ok) shown++;
    });
    empty.hidden = shown > 0;
    layout.scrollLeft = 0;
  }
  function setRole(r){
    role = r;
    filters.forEach(function(f){ f.setAttribute('aria-pressed', String(f.dataset.filter === r)); });
    apply();
  }

  filters.forEach(function(f){ f.addEventListener('click', function(){ setRole(f.dataset.filter); }); });
  input.addEventListener('input', apply);
  empty.querySelector('button').addEventListener('click', function(){ input.value = ''; setRole('all'); });
})();

// Цены: вкладки категорий (ARIA tabs) — клик, стрелки, Home/End
(function(){
  var list = document.querySelector('#pricing [role="tablist"]');
  if(!list) return;
  var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));

  function select(tab, focus){
    tabs.forEach(function(t){
      var on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      panel.hidden = !on;
      if(on){
        panel.classList.remove('is-entering');
        void panel.offsetWidth;            // перезапуск анимации строк
        panel.classList.add('is-entering');
      }
    });
    if(focus) tab.focus();
    tab.scrollIntoView({ block:'nearest', inline:'nearest' });
  }

  tabs.forEach(function(t){ t.addEventListener('click', function(){ select(t); }); });
  list.addEventListener('keydown', function(e){
    var i = tabs.indexOf(document.activeElement);
    if(i < 0) return;
    var next = null;
    if(e.key === 'ArrowDown' || e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
    if(e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
    if(e.key === 'Home') next = tabs[0];
    if(e.key === 'End') next = tabs[tabs.length - 1];
    if(next){ e.preventDefault(); select(next, true); }
  });
})();

// Вопросы и ответы: открыт один ответ за раз, высоту анимирует CSS (grid-template-rows)
(function(){
  var items = document.querySelectorAll('.faq-item');
  function set(item, open){
    item.classList.toggle('is-open', open);
    item.querySelector('.faq-q').setAttribute('aria-expanded', String(open));
  }
  items.forEach(function(item){
    item.querySelector('.faq-q').addEventListener('click', function(){
      var open = !item.classList.contains('is-open');
      items.forEach(function(other){ set(other, false); });
      set(item, open);
    });
  });
})();

// «Читать далее»: любая кнопка .read-more раскрывает свой .collapse
document.querySelectorAll('.read-more[aria-controls]').forEach(function(btn){
  var box = document.getElementById(btn.getAttribute('aria-controls'));
  var label = btn.firstChild;
  var closedText = label.textContent;
  btn.addEventListener('click', function(){
    var open = btn.getAttribute('aria-expanded') !== 'true';
    btn.setAttribute('aria-expanded', String(open));
    box.classList.toggle('open', open);
    label.textContent = open ? btn.dataset.labelOpen : closedText;
  });
});

// Появление фото-композиций при прокрутке (один раз)
(function(){
  var items = document.querySelectorAll('[data-reveal]');
  if(!('IntersectionObserver' in window)){
    items.forEach(function(el){ el.classList.add('is-in'); });
    return;
  }
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { rootMargin:'0px 0px -12% 0px' });
  items.forEach(function(el){ io.observe(el); });
})();
