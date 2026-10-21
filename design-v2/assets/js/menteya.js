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
        el.addEventListener('mouseleave', function(){
          closeTimer = setTimeout(function(){
            // человек печатает в поиске меню — не закрываем из-под курсора
            if(document.activeElement && document.activeElement.matches('input') && panel.contains(document.activeElement)) return;
            closeMenu();
          }, 180);
        });
      });
    }
    panel.addEventListener('click', function(e){ if(e.target.closest('a') && !e.defaultPrevented) closeMenu(); });
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
  window.matchMedia('(min-width: 1100px)').addEventListener('change', function(m){
    if(m.matches) setDrawer(false); else closeMenu();
  });
})();

// Поиск по каталогу услуг: «лечение панических атак» найдёт «Панические атаки», «тревога» — «Тревожность»
var catalogSearch = (function(){
  var STOP = ['лечение', 'лечения', 'помощь', 'при', 'в', 'во', 'на', 'и', 'с', 'у', 'к', 'о', 'для', 'от', 'по', 'москве', 'москва', 'клиника', 'клинике'];
  function words(q){
    return q.toLowerCase().replace(/ё/g, 'е').split(/[^a-zа-я0-9]+/).filter(function(w){
      return w && STOP.indexOf(w) < 0;
    }).map(function(w){
      // грубо отрезаем окончание: «депрессии» → «депресси», «тревога» → «трево»
      return w.length >= 7 ? w.slice(0, -2) : w.length >= 5 ? w.slice(0, -1) : w;
    });
  }
  function match(el, ws){
    var hay = (el.textContent + ' ' + (el.dataset.k || '')).toLowerCase().replace(/ё/g, 'е');
    return ws.every(function(w){ return hay.indexOf(w) > -1; });
  }
  return { words:words, match:match };
})();

// Мега-меню «Услуги»: рубрика слева показывает свои страницы справа, поиск — по всем рубрикам
(function(){
  var mega = document.getElementById('megaServices');
  if(!mega) return;
  var cats = mega.querySelectorAll('.mega-cat');
  var input = mega.querySelector('.mega-search input');
  var empty = mega.querySelector('.mega-empty');
  var status = mega.querySelector('[data-search-status]');
  var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var timer = null;

  function activate(cat){
    cats.forEach(function(c){ c.classList.toggle('is-active', c === cat); });
  }
  cats.forEach(function(cat){
    var link = cat.querySelector('.mega-cat-link');
    link.addEventListener('focus', function(){ activate(cat); });
    if(canHover){
      // короткая задержка: ведёте мышь наискосок к списку — рубрика по пути не переключается
      link.addEventListener('mouseenter', function(){
        clearTimeout(timer);
        timer = setTimeout(function(){ activate(cat); }, 90);
      });
      link.addEventListener('mouseleave', function(){ clearTimeout(timer); });
    } else {
      // касание: первое показывает страницы рубрики, второе открывает саму рубрику
      link.addEventListener('click', function(e){
        if(!cat.classList.contains('is-active')){ e.preventDefault(); activate(cat); }
      });
    }
  });

  input.addEventListener('input', function(){
    var ws = catalogSearch.words(input.value);
    var found = 0;
    mega.classList.toggle('is-searching', ws.length > 0);
    mega.querySelectorAll('.mega-list li').forEach(function(li){
      var ok = !ws.length || catalogSearch.match(li, ws);
      li.hidden = !ok;
      if(ok && ws.length) found++;
    });
    mega.querySelectorAll('.mega-cat, .mega-group').forEach(function(g){
      g.hidden = ws.length > 0 && !g.querySelector('li:not([hidden])');
    });
    empty.hidden = !ws.length || found > 0;
    empty.querySelector('span').textContent = input.value.trim();
    status.textContent = ws.length ? 'Найдено: ' + found : '';
  });

  // Кнопка-лупа в шапке открывает каталог и ставит курсор в поиск
  var searchBtn = document.querySelector('.search-btn');
  var trigger = document.querySelector('[aria-controls="megaServices"]');
  if(searchBtn && trigger){
    searchBtn.addEventListener('click', function(){
      if(trigger.getAttribute('aria-expanded') !== 'true') trigger.click();
      input.focus();
    });
  }
})();

// Мобильное меню: каталог услуг собираем из мега-меню, чтобы список страниц был в одном месте
(function(){
  var mega = document.getElementById('megaServices');
  var box = document.querySelector('[data-services]');
  if(!mega || !box) return;

  var search = document.createElement('label');
  search.className = 'drawer-search';
  search.innerHTML = '<svg class="i"><use href="#i-search"/></svg><input type="search" placeholder="Найти заболевание или услугу" aria-label="Поиск по услугам" autocomplete="off" enterkeyhint="search">';
  box.append(search);

  mega.querySelectorAll('.mega-cat').forEach(function(cat){
    var link = cat.querySelector('.mega-cat-link');
    var details = document.createElement('details');
    var summary = document.createElement('summary');
    var list = document.createElement('div');
    details.className = 'drawer-cat';
    list.className = 'drawer-cat-list';
    ['.ic', '.t', '.n', '.chev'].forEach(function(sel){ summary.append(link.querySelector(sel).cloneNode(true)); });
    if(link.hasAttribute('href')){
      var all = document.createElement('a');
      all.className = 'drawer-cat-all';
      all.href = link.getAttribute('href');
      all.textContent = 'Всё о направлении';
      list.append(all);
    }
    cat.querySelectorAll('.mega-list li').forEach(function(li){
      var a = li.querySelector('a').cloneNode(true);
      if(li.dataset.k) a.dataset.k = li.dataset.k;
      list.append(a);
    });
    details.append(summary, list);
    box.append(details);
  });
  mega.querySelectorAll('.mega-direct').forEach(function(a){
    var copy = a.cloneNode(true);
    copy.className = 'drawer-direct';
    box.append(copy);
  });
  var empty = document.createElement('p');
  empty.className = 'drawer-empty';
  empty.hidden = true;
  empty.textContent = 'Ничего не нашли. Позвоните или напишите — администратор подскажет, к какому врачу обратиться.';
  box.append(empty);

  var input = search.querySelector('input');
  input.addEventListener('input', function(){
    var ws = catalogSearch.words(input.value);
    var found = 0;
    box.classList.toggle('is-searching', ws.length > 0);
    box.querySelectorAll('.drawer-cat').forEach(function(d){
      var n = 0;
      d.querySelectorAll('.drawer-cat-list a:not(.drawer-cat-all)').forEach(function(a){
        var ok = !ws.length || catalogSearch.match(a, ws);
        a.hidden = !ok;
        if(ok) n++;
      });
      d.hidden = ws.length > 0 && !n;
      d.open = ws.length > 0 && n > 0;   // при поиске рубрики с совпадениями раскрыты
      if(ws.length) found += n;
    });
    box.querySelectorAll('.drawer-direct').forEach(function(a){ a.hidden = ws.length > 0; });
    empty.hidden = !ws.length || found > 0;
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
  if(!root || !root.querySelector('.doc-filter')) return;   // на внутренних страницах карточки без фильтров
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

// Страница цен: поиск по прайсу — те же правила, что в каталоге услуг
(function(){
  var input = document.querySelector('.price-search input');
  if(!input) return;
  var groups = document.querySelectorAll('.price-group');
  var empty = document.querySelector('.price-empty');
  input.addEventListener('input', function(){
    var ws = catalogSearch.words(input.value);
    var found = 0;
    groups.forEach(function(g){
      var n = 0;
      g.querySelectorAll('.price-row').forEach(function(row){
        var ok = !ws.length || catalogSearch.match(row, ws);
        row.hidden = !ok;
        if(ok) n++;
      });
      g.hidden = ws.length > 0 && !n;
      found += n;
    });
    empty.hidden = !ws.length || found > 0;
  });
})();

// Форма записи: маска телефона, проверка полей, защита от спама, «Заявка принята».
// Одна логика для формы на главной и во всплывающем окне.
// В прототипе заявка никуда не отправляется — в WordPress сюда подключится обработчик формы.
function setupBookingForm(form){
  var phone = form.elements.phone;
  var name = form.elements.name;
  var consent = form.elements.consent;
  var body = form.querySelector('.form-body');
  var success = form.querySelector('.form-success');
  var openedAt = Date.now();
  var prevDigits = '';

  function format(d){
    var r = d.slice(1, 11), out = '+7';
    if(r.length) out += ' (' + r.slice(0, 3);
    if(r.length >= 3) out += ')';
    if(r.length > 3) out += ' ' + r.slice(3, 6);
    if(r.length > 6) out += '-' + r.slice(6, 8);
    if(r.length > 8) out += '-' + r.slice(8, 10);
    return out;
  }
  phone.addEventListener('input', function(e){
    var d = phone.value.replace(/\D/g, '');
    if(!d){ phone.value = ''; prevDigits = ''; return; }
    if(d[0] === '8') d = '7' + d.slice(1);
    else if(d[0] !== '7') d = '7' + d;
    // Стёрли скобку или дефис — цифр не убавилось: убираем последнюю цифру, иначе «застрянет»
    if(e.inputType === 'deleteContentBackward' && d === prevDigits) d = d.slice(0, -1);
    prevDigits = d.slice(0, 11);
    phone.value = d.length > 1 ? format(prevDigits) : '';
  });

  var checks = [
    [name, function(){ return name.value.trim().length > 0; }],
    [phone, function(){ return phone.value.replace(/\D/g, '').length === 11; }],
    [consent, function(){ return consent.checked; }]
  ];
  function validate(el, test){
    var ok = test();
    el.closest('.field').classList.toggle('is-invalid', !ok);
    el.setAttribute('aria-invalid', String(!ok));
    return ok;
  }
  checks.forEach(function(c){
    var ev = c[0].type === 'checkbox' ? 'change' : 'input';
    c[0].addEventListener(ev, function(){
      if(c[0].closest('.field').classList.contains('is-invalid')) validate(c[0], c[1]);
    });
  });

  form.addEventListener('submit', function(e){
    e.preventDefault();
    var firstBad = null;
    checks.forEach(function(c){ if(!validate(c[0], c[1]) && !firstBad) firstBad = c[0]; });
    if(firstBad){ firstBad.focus(); return; }
    // Защита от спама: бот заполнил скрытое поле или отправил форму быстрее чем за 3 секунды —
    // показываем «принято», но не отправляем. В WordPress то же проверяет сервер, плюс невидимая Яндекс SmartCaptcha
    var isBot = form.elements.website.value !== '' || Date.now() - openedAt < 3000;
    if(!isBot){ /* здесь заявка уходит обработчику формы WordPress */ }
    body.hidden = true;
    success.hidden = false;
    success.querySelector('b').focus();
  });

  function reset(){
    form.reset();
    prevDigits = '';
    openedAt = Date.now();
    checks.forEach(function(c){
      c[0].closest('.field').classList.remove('is-invalid');
      c[0].removeAttribute('aria-invalid');
    });
    success.hidden = true;
    body.hidden = false;
  }
  var again = form.querySelector('.form-again');
  if(again) again.addEventListener('click', function(){ reset(); name.focus(); });
  return { reset:reset };
}
(function(){
  var form = document.getElementById('bookingForm');
  if(form) setupBookingForm(form);
})();

// Запись во всплывающем окне: любая кнопка «Записаться» (ссылка #booking) открывает окно с формой.
// В окне видно, что выбрали: услугу из прайса или врача из карточки.
(function(){
  var modal = document.getElementById('bookingModal');
  if(!modal || typeof modal.showModal !== 'function') return;   // старый браузер — ссылка просто ведёт к блоку записи
  var form = modal.querySelector('form');
  var context = modal.querySelector('.modal-context');
  var booking = setupBookingForm(form);
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var trigger = null;

  function contextOf(link){
    var row = link.closest('.price-row');
    if(row) return 'Услуга: ' + row.querySelector('.pr-name').firstChild.textContent.trim();
    var card = link.closest('.doc-card');
    if(card) return 'Врач: ' + card.querySelector('.doc-name').textContent.trim();
    var doctor = document.querySelector('.doctor-hero h1');   // страница врача: кнопки в первом экране и боковой карточке
    if(doctor && link.closest('.doctor-hero, .article-side')) return 'Врач: ' + doctor.textContent.trim();
    return '';
  }
  function open(link){
    trigger = link;
    booking.reset();
    var text = contextOf(link);
    context.hidden = !text;
    context.querySelector('span').textContent = text;
    form.elements.service.value = text;
    modal.showModal();
    document.documentElement.classList.add('modal-open');
  }
  function close(){
    if(!modal.open || modal.classList.contains('is-closing')) return;
    modal.classList.add('is-closing');
    setTimeout(function(){
      modal.classList.remove('is-closing');
      modal.close();
    }, reduce.matches ? 0 : 200);
  }

  document.addEventListener('click', function(e){
    var link = e.target.closest('a[href="#booking"]');
    if(!link) return;
    e.preventDefault();
    open(link);
  });
  modal.addEventListener('close', function(){
    document.documentElement.classList.remove('modal-open');
    if(trigger && document.contains(trigger)) trigger.focus({ preventScroll:true });
  });
  modal.addEventListener('cancel', function(e){ e.preventDefault(); close(); });   // Esc — тоже с анимацией
  modal.addEventListener('click', function(e){ if(e.target === modal) close(); });  // клик по затемнению
  modal.querySelector('.modal-close').addEventListener('click', close);
  modal.querySelector('.modal-done').addEventListener('click', close);
})();

// Согласие на cookie (152-ФЗ): статистика подключается только после «Принять»; выбор помним в браузере
(function(){
  var banner = document.getElementById('cookieBanner');
  if(!banner) return;
  var KEY = 'menteya-cookie';
  function read(){ try { return localStorage.getItem(KEY); } catch(e){ return null; } }
  function save(choice){ try { localStorage.setItem(KEY, choice + '|' + new Date().toISOString().slice(0, 10)); } catch(e){} }
  function loadAnalytics(){ /* здесь подключается Яндекс Метрика — только после согласия */ }

  var saved = read();
  if(saved && saved.indexOf('accept') === 0) loadAnalytics();
  if(!saved) banner.hidden = false;

  banner.addEventListener('click', function(e){
    var button = e.target.closest('[data-cookie]');
    if(!button) return;
    save(button.dataset.cookie);
    if(button.dataset.cookie === 'accept') loadAnalytics();
    banner.classList.add('is-hiding');
    setTimeout(function(){ banner.hidden = true; banner.classList.remove('is-hiding'); }, 200);
  });
  // «Настройки cookie» в подвале — показать выбор снова (согласие можно отозвать)
  document.querySelectorAll('[data-cookie-settings]').forEach(function(link){
    link.addEventListener('click', function(e){ e.preventDefault(); banner.hidden = false; });
  });
})();

// Внутренние страницы: подсветка текущего раздела в липкой навигации
(function(){
  var nav = document.querySelector('.page-nav');
  if(!nav || !('IntersectionObserver' in window)) return;
  var list = nav.querySelector('ul');
  var map = {};
  nav.querySelectorAll('a[href^="#"]').forEach(function(a){
    var id = a.getAttribute('href').slice(1);
    if(document.getElementById(id)) map[id] = a;
  });
  var ids = Object.keys(map);
  var current = null;
  function activate(id){
    if(current === id) return;
    current = id;
    ids.forEach(function(k){
      map[k].classList.toggle('is-active', k === id);
      if(k === id) map[k].setAttribute('aria-current', 'true'); else map[k].removeAttribute('aria-current');
    });
    if(!id) return;
    var a = map[id], lr = list.getBoundingClientRect(), ar = a.getBoundingClientRect();
    list.scrollTo({ left:list.scrollLeft + (ar.left - lr.left) - (lr.width - ar.width) / 2, behavior:'smooth' });
  }
  // Текущий — последний раздел, чей верх поднялся выше линии на 35% высоты экрана; над первым разделом — никакой.
  // Наблюдатель лишь будит пересчёт, когда раздел пересекает полосу 25–35% экрана.
  function update(){
    var line = innerHeight * .35, active = null;
    ids.forEach(function(id){
      var el = document.getElementById(id);
      // скрытый поиском раздел не считаем — у него нет положения на странице
      if(el.getClientRects().length && el.getBoundingClientRect().top <= line) active = id;
    });
    activate(active);
  }
  var io = new IntersectionObserver(update, { rootMargin:'-25% 0px -65% 0px' });
  ids.forEach(function(id){ io.observe(document.getElementById(id)); });
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

// «Сейчас открыто»: время Москвы, приём 9:00–21:00. Без скриптов видны обычные часы работы
(function(){
  var tiles = document.querySelectorAll('[data-open]');
  if(!tiles.length) return;
  try {
    var p = new Intl.DateTimeFormat('ru-RU', { timeZone:'Europe/Moscow', hour:'2-digit', minute:'2-digit', hourCycle:'h23' }).formatToParts(new Date());
    var h = +p.find(function(x){ return x.type === 'hour'; }).value;
    var m = +p.find(function(x){ return x.type === 'minute'; }).value;
    var t = h * 60 + m, open = t >= 540 && t < 1260;
    tiles.forEach(function(tile){
      tile.querySelector('[data-open-title]').textContent = open ? 'Сейчас открыто, до 21:00' : 'Сейчас закрыто, откроемся в 9:00';
      tile.classList.toggle('is-closed', !open);
      var big = tile.querySelector('[data-open-big]'), note = tile.querySelector('[data-open-note]');
      if(!open && big) big.textContent = 'Оставьте заявку — перезвоним утром';
      if(!open && note) note.textContent = 'Вызов психиатра на дом — круглосуточно';
    });
  } catch(e){}
})();

// Подсветка плитки под курсором — только там, где есть мышь
(function(){
  if(!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  document.addEventListener('pointermove', function(e){
    var tile = e.target.closest && e.target.closest('.tile');
    if(!tile) return;
    var r = tile.getBoundingClientRect();
    tile.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    tile.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }, { passive:true });
})();

// ДНК — фирменный узор второго дизайна: спирали из тех же объёмных сфер, что в логотипе.
// Большая спираль — главный образ первого экрана: входит в плитку через край. Между разделами
// спирали выходят прямо из-за края экрана в полную яркость и уходят за плитки.
// Крутятся медленно и на месте, едут вместе со страницей — без параллакса, голова не кружится.
// Рисуем только видимые спирали и не чаще 30 раз в секунду; при «уменьшить движение» — неподвижная картинка.
(function(){
  var hero = document.querySelector('.t-hero');
  if(!hero || !document.createElement('canvas').getContext) return;
  var still = window.matchMedia('(prefers-reduced-motion: reduce)');
  var TWIST = .4;   // поворот спирали на одну пару
  var items = [];
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function(es){
    es.forEach(function(e){ if(e.target._dna) e.target._dna.visible = e.isIntersecting; });
  }, { rootMargin:'120px 0px' }) : null;

  // Сферы рисуем заранее: блик, насыщенное тело с тёмным краем и мягкое свечение — как у знака в логотипе
  function sphere(hi, mid, deep, rim, glow){
    var c = document.createElement('canvas');
    c.width = c.height = 64;
    var g = c.getContext('2d');
    var halo = g.createRadialGradient(32, 32, 10, 32, 32, 32);
    halo.addColorStop(0, glow);
    halo.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = halo;
    g.fillRect(0, 0, 64, 64);
    var body = g.createRadialGradient(27, 26, 1, 32, 32, 15);
    body.addColorStop(0, hi);
    body.addColorStop(.38, mid);
    body.addColorStop(.82, deep);
    body.addColorStop(1, rim);
    g.fillStyle = body;
    g.beginPath();
    g.arc(32, 32, 14, 0, Math.PI * 2);
    g.fill();
    return c;
  }
  var SPHERES = [
    sphere('#ffffff', '#c9bfff', '#4a36dc', '#2f21a8', 'rgba(110,90,255,.42)'),   // фиолетовая — основная
    sphere('#ffffff', '#ffc4b0', '#ec6d48', '#b84a2b', 'rgba(255,140,110,.36)'),   // персиковая
    sphere('#ffffff', '#b6efd3', '#1a9e66', '#0f6b44', 'rgba(60,190,130,.34)')     // мятная
  ];
  var BASES = ['80,62,222', '236,109,72', '26,158,102'];   // цвета перемычек — «пар оснований»

  function ease(v){ v = Math.max(0, Math.min(1, v)); return v * v * (3 - 2 * v); }

  // Одна спираль вдоль оси (x0,y0)→(x1,y1). fadeA/fadeB — доля длины, где растворяется начало/конец
  // (у края экрана — 0: спираль выходит из-за края в полную яркость). keep — прямоугольники текста: там спираль бледнее
  function drawHelix(g, o){
    var dx = o.x1 - o.x0, dy = o.y1 - o.y0, len = Math.hypot(dx, dy);
    var ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
    var n = Math.ceil(len / o.step);
    function pt(i, s){
      var a = i * TWIST + o.spin, k = (s ? -1 : 1) * o.amp * Math.sin(a), along = i * o.step;
      return { x:o.x0 + ux * along + nx * k, y:o.y0 + uy * along + ny * k, z:(s ? -1 : 1) * Math.cos(a), along:along };
    }
    function vis(p){
      var f = (o.fadeA ? ease(p.along / (len * o.fadeA)) : 1) * (o.fadeB ? ease((len - p.along) / (len * o.fadeB)) : 1);
      (o.keep || []).forEach(function(r){
        var ex = Math.max(r.l - p.x, 0, p.x - r.r), ey = Math.max(r.t - p.y, 0, p.y - r.b);
        f *= .38 + .62 * ease(Math.hypot(ex, ey) / 48);
      });
      return f * o.alpha;
    }
    var back = [], front = [];
    for(var i = 0; i <= n; i++){
      for(var s = 0; s < 2; s++){
        var a = pt(i, s), b = pt(i + 1, s), f = vis(a);
        if(f <= .01) continue;
        var seg = { seg:true, i:i, s:s, f:Math.min(f, vis(b)), z:(a.z + b.z) / 2 };
        (seg.z < 0 ? back : front).push(seg);
        var boost = 0;
        o.pulses.forEach(function(pl){ if(pl.s === s){ var d = i - pl.p; boost += Math.exp(-d * d / 3); } });
        (a.z < 0 ? back : front).push({ x:a.x, y:a.y, z:a.z, f:f, boost:Math.min(boost, 1), c:(i * 7 + s * 3) % 9 });
      }
    }
    function paint(list){
      list.forEach(function(q){
        var dz = (q.z + 1) / 2;   // впереди — крупнее, толще и ярче; сзади — меньше и бледнее
        if(q.seg){
          g.beginPath();
          for(var u = 0; u <= 4; u++){
            var p = pt(q.i + u / 4, q.s);
            u ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y);
          }
          g.strokeStyle = 'rgba(72,56,214,' + (q.f * (.22 + .5 * dz)).toFixed(3) + ')';
          g.lineWidth = (1.3 + 1.7 * dz) * o.line;
          g.lineCap = 'round';
          g.stroke();
        } else {
          var r = (3.2 + 2.8 * dz) * o.scale * (1 + .5 * q.boost);
          g.globalAlpha = Math.min(1, q.f * (.5 + .5 * dz + .4 * q.boost));
          g.drawImage(SPHERES[q.c < 1 ? 1 : q.c < 2 ? 2 : 0], q.x - r * 2.3, q.y - r * 2.3, r * 4.6, r * 4.6);
          g.globalAlpha = 1;
        }
      });
    }
    paint(back);
    // перемычки между нитями — «пары оснований», с небольшим разрывом посередине
    g.lineWidth = 2.4 * o.line;
    g.lineCap = 'round';
    for(var j = 0; j <= n; j++){
      var A = pt(j, 0), B = pt(j, 1), fr = Math.min(vis(A), vis(B));
      if(fr <= .01 || Math.hypot(A.x - B.x, A.y - B.y) < 4) continue;
      var mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
      g.strokeStyle = 'rgba(' + BASES[j % 3] + ',' + (fr * .5).toFixed(3) + ')';
      g.beginPath(); g.moveTo(A.x, A.y); g.lineTo(A.x + (mx - A.x) * .84, A.y + (my - A.y) * .84); g.stroke();
      g.strokeStyle = 'rgba(' + BASES[(j + 1) % 3] + ',' + (fr * .5).toFixed(3) + ')';
      g.beginPath(); g.moveTo(B.x, B.y); g.lineTo(B.x + (mx - B.x) * .84, B.y + (my - B.y) * .84); g.stroke();
    }
    paint(front);
    return n;
  }

  // Холст под спираль: размер в пикселях экрана, отрисовка — по кадрам
  function add(canvas, w, h, opts, keepEl){
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    var it = { canvas:canvas, g:canvas.getContext('2d'), w:w, h:h, dpr:dpr, o:opts, visible:!io, n:0, keepEl:keepEl };
    opts.spin = opts.phase;
    opts.pulses = [0, 1].map(function(s){ return { s:s, p:Math.random() * 14, v:(1.1 + Math.random() * .8) * (opts.flow || 1) }; });
    canvas._dna = it;
    if(io) io.observe(canvas);
    items.push(it);
    render(it, 0, 0);
  }
  function render(it, t, dt){
    var o = it.o;
    if(!still.matches){
      o.spin = o.phase + t * .0003 * o.dir;   // медленно, чтобы не отвлекать
      o.pulses.forEach(function(pl){
        pl.p += dt * pl.v;
        if(pl.p > it.n + 6) pl.p = -6;
        if(pl.p < -6) pl.p = it.n + 6;
      });
    }
    it.g.setTransform(it.dpr, 0, 0, it.dpr, 0, 0);
    it.g.clearRect(0, 0, it.w, it.h);
    it.n = drawHelix(it.g, o);
  }

  // Прямоугольники текста внутри плитки — там спираль бледнее
  function rectsIn(box, k, nodes){
    return nodes.filter(Boolean).map(function(el){
      var r = el.getBoundingClientRect();
      return { l:(r.left - box.left) / k, r:(r.right - box.left) / k, t:(r.top - box.top) / k, b:(r.bottom - box.top) / k };
    });
  }

  // Где между разделами выходит спираль: номер раздела (над ним — полоса) и край экрана.
  // После разделов с мелким текстом внизу слева спираль выходит справа, чтобы не задеть текст
  var EDGES = { 0:'right', 2:'left', 4:'right', 7:'left', 9:'right', 10:'left' };

  function build(){
    items.forEach(function(it){ if(io) io.unobserve(it.canvas); if(!it.keepEl) it.canvas.remove(); });
    items = [];
    var W = document.documentElement.clientWidth;
    var mobile = W < 700;

    // 1. Большая спираль первого экрана: справа, наклонно, входит и выходит через края плитки
    var hb = hero.getBoundingClientRect(), hw = hero.offsetWidth, hh = hero.offsetHeight;
    var k0 = hb.width / hw || 1;   // плитка может ещё «подниматься» при появлении
    var keep = rectsIn(hb, k0, [hero.querySelector('.chip'), hero.querySelector('h1'), hero.querySelector('.hero-lead'), hero.querySelector('.hero-cta')]);
    var amp, hopts;
    if(mobile){
      amp = Math.min(hw * .09, 32);
      hopts = { x0:-hw * .1, y0:hh - 62, x1:hw * 1.1, y1:hh - 140, amp:amp, step:amp * .64, scale:amp / 24, line:1.1, alpha:1, fadeA:0, fadeB:0, keep:keep, phase:.6, dir:1, flow:1 };
    } else {
      amp = Math.max(44, Math.min(hw * .085, 96));
      hopts = { x0:hw * .9, y0:-hh * .14, x1:hw * .66, y1:hh * 1.14, amp:amp, step:amp * .6, scale:amp / 27, line:1.5, alpha:1, fadeA:0, fadeB:0, keep:keep, phase:.6, dir:1, flow:1 };
    }
    add(hero.querySelector('.hero-dna'), hw, hh, hopts, true);

    // 2. Между разделами — в пустой полосе над заголовком, из-за края экрана
    var wrap = document.querySelector('.wrap');
    var wb = wrap.getBoundingClientRect();
    var edge = wb.left + parseFloat(getComputedStyle(wrap).paddingLeft);   // где начинается содержимое
    var scale = mobile ? .62 : Math.max(.9, Math.min(edge / 78, 1.3));
    var secs = [].slice.call(document.querySelectorAll('main > .sec, .site-footer'));
    secs.forEach(function(sec, k){
      var side = EDGES[k], first = sec.querySelector('.wrap > *');
      if(!side || !first) return;
      var band = first.getBoundingClientRect().top - sec.getBoundingClientRect().top;   // пустая полоса над заголовком
      if(band < 60) return;
      var L = mobile ? Math.round(W * .62) : Math.round(Math.max(380, Math.min(W * .34, 620)));
      var ang = (mobile ? 12 + (k * 3) % 6 : 16 + (k * 5) % 9) * Math.PI / 180, cs = Math.cos(ang), sn = Math.sin(ang);
      var T = Math.round(108 * scale), halfT = T / 2, out = mobile ? 24 : 40;
      // внешний конец — за краем экрана; у края содержимого ось проходит над заголовком раздела
      var yO = band - 16 - halfT / cs + (edge + out) * Math.tan(ang);
      var cx = side === 'left' ? -out + L / 2 * cs : W + out - L / 2 * cs;
      var cy = yO - L / 2 * sn;
      var c = document.createElement('canvas');
      c.className = 'dna';
      c.style.width = L + 'px';
      c.style.height = T + 'px';
      c.style.left = (cx - L / 2) + 'px';
      c.style.top = (cy - halfT) + 'px';
      c.style.transform = 'rotate(' + (side === 'left' ? -ang : ang) + 'rad)';
      sec.appendChild(c);
      add(c, L, T, {
        x0:0, y0:halfT, x1:L, y1:halfT, amp:28 * scale, step:26 * scale, scale:scale * 1.05, line:1.15, alpha:1,
        // у края экрана — полная яркость, внутренний конец уходит за плитки и тает
        fadeA:side === 'left' ? 0 : .22, fadeB:side === 'left' ? .22 : 0,
        keep:null, phase:k * 1.3, dir:side === 'left' ? 1 : -1, flow:side === 'left' ? 1 : -1
      }, false);
    });
  }

  var last = 0;
  function tick(t){
    requestAnimationFrame(tick);
    // на телефоне 15 кадров в секунду — вращение медленное, разницы не видно, а батарея целее
    if(document.hidden || still.matches || t - last < (width < 700 ? 66 : 33)) return;
    var dt = last ? Math.min((t - last) / 1000, .1) : 0;
    last = t;
    items.forEach(function(it){ if(it.visible) render(it, t, dt); });
  }

  var width = 0, timer = null;
  function rebuild(force){
    var w = document.documentElement.clientWidth;
    if(!force && w === width) return;   // на телефоне меняется только высота (строка адреса) — не пересобираем
    width = w;
    build();
  }
  rebuild(true);
  window.addEventListener('resize', function(){ clearTimeout(timer); timer = setTimeout(function(){ rebuild(false); }, 200); });
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ rebuild(true); });   // шрифт меняет размеры текста
  window.addEventListener('load', function(){ rebuild(true); });
  still.addEventListener('change', function(){ items.forEach(function(it){ render(it, 0, 0); }); });
  requestAnimationFrame(tick);
})();

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
