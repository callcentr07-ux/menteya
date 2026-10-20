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

// About photo slider
(function(){
  var slides = document.querySelectorAll('#aboutSlider .about-slide');
  var dots = document.querySelectorAll('#aboutSlider .as-dot');
  if(!slides.length) return;
  var current = 0;
  function show(i){
    slides.forEach(function(s,idx){ s.classList.toggle('active', idx===i); });
    dots.forEach(function(d,idx){ d.classList.toggle('active', idx===i); });
    current = i;
  }
  dots.forEach(function(d){
    d.addEventListener('click', function(){ show(parseInt(d.dataset.i,10)); });
  });
  setInterval(function(){ show((current+1) % slides.length); }, 5000);
})();

// FAQ accordion
(function(){
  var items = document.querySelectorAll('.faq-item');
  items.forEach(function(item){
    var btn = item.querySelector('.faq-q');
    var answer = item.querySelector('.faq-a');
    btn.addEventListener('click', function(){
      var isOpen = item.classList.contains('open');
      items.forEach(function(other){
        other.classList.remove('open');
        other.querySelector('.faq-a').style.maxHeight = null;
      });
      if(!isOpen){
        item.classList.add('open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });
})();

// Intro "read more" toggle
(function(){
  var btn = document.getElementById('introToggle');
  var box = document.getElementById('introMore');
  if(!btn || !box) return;
  var open = false;
  btn.addEventListener('click', function(){
    open = !open;
    box.style.maxHeight = open ? box.scrollHeight + 'px' : null;
    btn.textContent = open ? 'Свернуть ↑' : 'Читать далее ↓';
  });
})();
