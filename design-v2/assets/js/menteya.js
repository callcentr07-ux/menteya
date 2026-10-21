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

// Спирали ДНК по краям страницы — из тех же объёмных сфер, что в логотипе.
// Медленно вращаются, «вкручиваются» при прокрутке и едут чуть медленнее страницы; по нитям бегут импульсы.
// Один холст под содержимым. На телефоне рисуем только при прокрутке (бережём батарею),
// при «уменьшить движение» — неподвижная картинка.
(function(){
  var wrap = document.querySelector('.wrap');
  var canvas = document.createElement('canvas');
  if(!wrap || !canvas.getContext) return;
  canvas.className = 'helix-bg';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  var ctx = canvas.getContext('2d');
  var still = window.matchMedia('(prefers-reduced-motion: reduce)');
  var STEP = 28;      // расстояние между парами, px
  var TWIST = .38;    // поворот спирали на одну пару
  var PAR = .55;      // спираль едет на 55% скорости страницы — ощущение глубины
  var W = 0, H = 0, dpr = 1, mobile = false, scale = 1, sides = [];
  var mouse = { x:-999, y:-999 };
  var last = 0, lastScroll = -1, dirty = true;

  // Сферы рисуем заранее: блик, тело и мягкое свечение — как у знака в логотипе
  function sphere(hi, mid, deep, glow){
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
    body.addColorStop(.45, mid);
    body.addColorStop(1, deep);
    g.fillStyle = body;
    g.beginPath();
    g.arc(32, 32, 14, 0, Math.PI * 2);
    g.fill();
    return c;
  }
  var SPHERES = [
    sphere('#ffffff', '#d4ccff', '#5b4be0', 'rgba(124,108,255,.38)'),   // фиолетовая — основная
    sphere('#ffffff', '#ffd9cb', '#ef8a6a', 'rgba(255,160,130,.32)'),   // персиковая
    sphere('#ffffff', '#cdf3df', '#36a372', 'rgba(80,190,140,.30)')     // мятная
  ];
  var BASES = ['91,75,224', '239,138,106', '54,163,114'];   // цвета перемычек — «пар оснований»

  function layout(){
    var r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    var box = wrap.getBoundingClientRect();
    var edge = box.left + parseFloat(getComputedStyle(wrap).paddingLeft);   // где начинается содержимое
    mobile = W < 700;
    // на широких экранах поля шире — спираль крупнее; на телефоне — тонкая цепочка в узком поле у края, не заходит на текст
    scale = mobile ? .5 : Math.max(.85, Math.min(edge / 80, 1.3));
    STEP = Math.round((mobile ? 36 : 28) * scale);
    var amp = mobile ? Math.max(3, edge * .32) : Math.max(13, Math.min(edge * .3, 38));
    var cx = edge / 2;
    sides = [
      { x:cx, amp:amp, phase:0, dir:1, pulses:[] },
      { x:W - cx, amp:amp, phase:2.1, dir:-1, pulses:[] }
    ];
    sides.forEach(function(s){
      for(var k = 0; k < 2; k++) s.pulses.push({ p:-1e9, strand:k, speed:1.6 + Math.random() * 1.2 });
    });
    dirty = true;
  }

  function ease(v){ v = Math.max(0, Math.min(1, v)); return v * v * (3 - 2 * v); }

  function draw(t, dt){
    var sy = still.matches ? 0 : window.scrollY;
    var shift = sy * PAR;
    var from = Math.floor(shift / STEP) - 2, to = Math.ceil((shift + H) / STEP) + 2;
    var fadeEdge = mobile ? 90 : 150;
    var base = mobile ? .8 : 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    sides.forEach(function(s){
      var spin = s.phase + (still.matches ? 0 : t * .00022 * s.dir) + sy * .0035 * s.dir;
      // импульсы: бегут вниз по нитям; ушёл за экран — стартует снова сверху
      s.pulses.forEach(function(pl){
        if(!still.matches && !mobile) pl.p += dt * pl.speed;
        if(pl.p > to + 4 || pl.p < from - 40) { pl.p = from - 2 - Math.random() * 18; pl.strand = Math.random() < .5 ? 0 : 1; }
      });
      function point(i, strand){
        var a = i * TWIST + spin, sin = Math.sin(a);
        return { x:s.x + (strand ? -1 : 1) * s.amp * sin, y:i * STEP - shift, z:(strand ? -1 : 1) * Math.cos(a) };
      }
      var back = [], front = [];
      for(var i = from; i <= to; i++){
        for(var strand = 0; strand < 2; strand++){
          var a = point(i, strand), b = point(i + 1, strand);
          var f = ease(a.y / fadeEdge) * ease((H - a.y) / fadeEdge) * base;
          if(f <= 0) continue;
          // нить: плавная кривая между соседними сферами
          var seg = { kind:'seg', i:i, strand:strand, f:f, z:(a.z + b.z) / 2 };
          (seg.z < 0 ? back : front).push(seg);
          // сфера: впереди крупнее и ярче, сзади меньше и бледнее; импульс и курсор её подсвечивают
          var boost = 0;
          s.pulses.forEach(function(pl){ if(pl.strand === strand){ var d = i - pl.p; boost += Math.exp(-d * d / 3); } });
          var dm = Math.hypot(a.x - mouse.x, a.y - mouse.y);
          var near = dm < 110 ? 1 - dm / 110 : 0;
          var node = { kind:'node', x:a.x, y:a.y, z:a.z, f:f, boost:Math.min(boost, 1), near:near, color:((i * 7 + strand * 3) % 9 + 9) % 9 };
          (a.z < 0 ? back : front).push(node);
        }
      }
      function paint(list){
        list.forEach(function(o){
          if(o.kind === 'seg'){
            ctx.beginPath();
            for(var u = 0; u <= 4; u++){
              var p = point(o.i + u / 4, o.strand);
              u ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
            }
            var dz = (o.z + 1) / 2;   // нить спереди толще и ярче, сзади тоньше и бледнее
            ctx.strokeStyle = 'rgba(91,75,224,' + (o.f * (.14 + .36 * dz)).toFixed(3) + ')';
            ctx.lineWidth = mobile ? .6 + .6 * dz : 1.1 + 1.3 * dz;
            ctx.lineCap = 'round';
            ctx.stroke();
          } else {
            var depth = (o.z + 1) / 2;
            var rad = (3.2 + 2.8 * depth) * scale;
            rad *= 1 + .7 * o.boost + .45 * o.near;
            ctx.globalAlpha = Math.min(1, o.f * (.32 + .6 * depth + .45 * o.boost + .3 * o.near));
            var img = SPHERES[o.color < 1 ? 1 : o.color < 2 ? 2 : 0];
            ctx.drawImage(img, o.x - rad * 2.3, o.y - rad * 2.3, rad * 4.6, rad * 4.6);
            ctx.globalAlpha = 1;
          }
        });
      }
      paint(back);
      // перемычки между нитями — «пары оснований», с небольшим разрывом посередине
      for(var j = from; j <= to; j++){
        var A = point(j, 0), B = point(j, 1);
        var fr = ease(A.y / fadeEdge) * ease((H - A.y) / fadeEdge) * base;
        if(fr <= 0 || Math.abs(A.x - B.x) < 4) continue;
        var mx = (A.x + B.x) / 2, gap = (B.x - A.x) * .08;
        ctx.lineWidth = mobile ? .8 : 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(' + BASES[j % 3] + ',' + (fr * .34).toFixed(3) + ')';
        ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(mx - gap, A.y); ctx.stroke();
        ctx.strokeStyle = 'rgba(' + BASES[(j + 1) % 3] + ',' + (fr * .34).toFixed(3) + ')';
        ctx.beginPath(); ctx.moveTo(mx + gap, B.y); ctx.lineTo(B.x, B.y); ctx.stroke();
      }
      paint(front);
    });
  }

  function tick(t){
    requestAnimationFrame(tick);
    if(document.hidden) return;
    var sy = window.scrollY, moved = sy !== lastScroll;
    var idle = !mobile && !still.matches;   // на компьютере спираль живёт и без прокрутки
    if(!dirty && !moved && !(idle && t - last > 33)) return;
    if(still.matches && !dirty) return;
    var dt = last ? Math.min((t - last) / 1000, .1) : 0;
    last = t; lastScroll = sy; dirty = false;
    draw(t, dt);
  }

  layout();
  window.addEventListener('resize', layout);
  still.addEventListener('change', function(){ dirty = true; });
  if(window.matchMedia('(hover: hover) and (pointer: fine)').matches){
    document.addEventListener('pointermove', function(e){ mouse.x = e.clientX; mouse.y = e.clientY; }, { passive:true });
    document.addEventListener('pointerleave', function(){ mouse.x = mouse.y = -999; });
  }
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
