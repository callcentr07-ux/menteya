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

// ДНК — одна полупрозрачная нить через всю страницу, из тех же объёмных сфер, что в логотипе.
// Идёт по полю сбоку от разделов, а в пустом отступе над разделом переходит на другую сторону —
// «прошивает» страницу и не ложится на текст. Лежит под плитками и едет вместе со страницей.
// Медленно вращается; пока страницу листают — замирает, чтобы не кружилась голова.
// Холсты — полосами по высоте страницы, рисуются только у экрана; при «уменьшить движение» — неподвижная.
(function(){
  if(!document.body || !document.createElement('canvas').getContext) return;
  var still = window.matchMedia('(prefers-reduced-motion: reduce)');
  var TWIST = .55;                // поворот спирали на одну пару оснований
  var GROOVE = Math.PI * .8;      // сдвиг второй нити: широкая и узкая бороздки, как у настоящей ДНК
  var DS = 2;                     // шаг выборки пути, px
  var STRIP = 1024;               // высота холста-полосы
  var layer = document.createElement('div');
  layer.className = 'dna-layer';
  layer.setAttribute('aria-hidden', 'true');
  document.body.insertBefore(layer, document.body.firstChild);
  var strips = [], path = null, width = 0, spin = .6, rate = 1;
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function(es){
    es.forEach(function(e){ if(e.target._strip) setNear(e.target._strip, e.isIntersecting); });
  }, { rootMargin:'100% 0px' }) : null;   // полосы готовим заранее, за экран до появления

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

  // Путь: старт под шапкой справа, вниз по полю; в середине отступа над каждым разделом — переход на другое поле.
  // Углы скруглены дугами. Выборка через DS px длины: точка и нормаль к пути
  function buildPath(W, H){
    var wrap = document.querySelector('.wrap');
    var edge = wrap.getBoundingClientRect().left + parseFloat(getComputedStyle(wrap).paddingLeft);   // где начинается содержимое
    var amp = Math.max(13, Math.min(W * .016, 32));
    // поле вмещает нить — идёт посередине поля; узкое (телефон) — за краем экрана, видны только переходы
    var xl = edge / 2 >= amp * 1.3 + 4 ? edge / 2 : -(amp * 1.4 + 6), xr = W - xl;
    var R = Math.max(44, Math.min(amp * 3.2, 110));   // радиус поворота
    var top0 = document.body.getBoundingClientRect().top;
    var pts = [[xr, -60]], x = xr, y0 = -60;
    [].forEach.call(document.querySelectorAll('main > .sec, .site-footer'), function(sec){
      var pad = parseFloat(getComputedStyle(sec).paddingTop);
      var y = sec.getBoundingClientRect().top - top0 + pad / 2;   // середина пустого отступа над разделом
      if(pad < 56 || y < y0 + 8) return;
      pts.push([x, y]);
      x = x === xr ? xl : xr;
      pts.push([x, y]);
      y0 = y;
    });
    pts.push([x, H + 60]);

    var X = [], Y = [], NX = [], NY = [], s = 0, done = 0, from = pts[0];
    function emit(len, at){
      for(; s <= done + len; s += DS){
        var q = at(s - done);
        X.push(q[0]); Y.push(q[1]); NX.push(-q[3]); NY.push(q[2]);
      }
      done += len;
    }
    function line(a, b){
      var len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if(!len) return;
      var tx = (b[0] - a[0]) / len, ty = (b[1] - a[1]) / len;
      emit(len, function(u){ return [a[0] + tx * u, a[1] + ty * u, tx, ty]; });
    }
    function arc(c, d1, d2, r){   // четверть окружности: входим по d1, выходим по d2
      emit(r * Math.PI / 2, function(u){
        var f = u / r, cs = Math.cos(f), sn = Math.sin(f);
        return [c[0] + r * (d1[0] * sn - d2[0] * cs), c[1] + r * (d1[1] * sn - d2[1] * cs), d1[0] * cs + d2[0] * sn, d1[1] * cs + d2[1] * sn];
      });
    }
    for(var i = 1; i < pts.length - 1; i++){
      var Q = pts[i - 1], P = pts[i], N = pts[i + 1];
      var l1 = Math.hypot(P[0] - Q[0], P[1] - Q[1]), l2 = Math.hypot(N[0] - P[0], N[1] - P[1]);
      var d1 = [(P[0] - Q[0]) / l1, (P[1] - Q[1]) / l1], d2 = [(N[0] - P[0]) / l2, (N[1] - P[1]) / l2];
      var r = Math.min(R, l1 / 2, l2 / 2);
      var t1 = [P[0] - d1[0] * r, P[1] - d1[1] * r];
      line(from, t1);
      arc([t1[0] + d2[0] * r, t1[1] + d2[1] * r], d1, d2, r);
      from = [P[0] + d2[0] * r, P[1] + d2[1] * r];
    }
    line(from, pts[pts.length - 1]);
    return { X:X, Y:Y, NX:NX, NY:NY, amp:amp, K:Math.max(5, Math.round(amp * .4)), scale:amp / 25, line:amp / 22 };
  }

  function lower(arr, v){   // первая выборка не выше v (путь идёт только вниз)
    var lo = 0, hi = arr.length;
    while(lo < hi){ var mid = (lo + hi) >> 1; if(arr[mid] < v) lo = mid + 1; else hi = mid; }
    return lo;
  }

  // Кусок нити в полосе: пары оснований, попадающие в её высоту (с запасом на толщину)
  function draw(st){
    var g = st.g, P = path;
    if(!st.c.width) return;
    g.setTransform(st.dpr, 0, 0, st.dpr, 0, -st.top * st.dpr);   // рисуем в координатах страницы
    g.clearRect(0, st.top, width, st.h);
    if(!P) return;
    var K = P.K, n = P.Y.length, m = P.amp * 2 + 10;
    var j0 = Math.floor(lower(P.Y, st.top - m) / K), j1 = Math.min(Math.ceil(lower(P.Y, st.top + st.h + m) / K), Math.floor((n - 1) / K) - 1);
    function pt(i, s){   // i — номер выборки, s — нить 0 или 1
      var k = Math.min(n - 1, Math.round(i)), a = i / K * TWIST + spin + (s ? GROOVE : 0), off = P.amp * Math.sin(a);
      return { x:P.X[k] + P.NX[k] * off, y:P.Y[k] + P.NY[k] * off, z:Math.cos(a) };
    }
    var back = [], front = [];
    for(var j = j0; j <= j1; j++){
      for(var s = 0; s < 2; s++){
        var A = pt(j * K, s), B = pt((j + 1) * K, s);
        var seg = { seg:true, j:j, s:s, z:(A.z + B.z) / 2 };
        (seg.z < 0 ? back : front).push(seg);
        (A.z < 0 ? back : front).push({ x:A.x, y:A.y, z:A.z, c:(j * 7 + s * 3) % 9 });
      }
    }
    function paint(list){
      list.forEach(function(q){
        var dz = (q.z + 1) / 2;   // впереди — крупнее, толще и ярче; сзади — меньше и бледнее
        if(q.seg){
          g.beginPath();
          for(var u = 0; u <= 4; u++){
            var p = pt((q.j + u / 4) * K, q.s);
            u ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y);
          }
          g.strokeStyle = 'rgba(72,56,214,' + (.22 + .5 * dz).toFixed(3) + ')';
          g.lineWidth = (1.3 + 1.7 * dz) * P.line;
          g.lineCap = 'round';
          g.stroke();
        } else {
          var r = (3.2 + 2.8 * dz) * P.scale;
          g.globalAlpha = .5 + .5 * dz;
          g.drawImage(SPHERES[q.c < 1 ? 1 : q.c < 2 ? 2 : 0], q.x - r * 2.3, q.y - r * 2.3, r * 4.6, r * 4.6);
          g.globalAlpha = 1;
        }
      });
    }
    paint(back);
    // перемычки между нитями — «пары оснований», с небольшим разрывом посередине
    g.lineWidth = 2.4 * P.line;
    g.lineCap = 'round';
    for(j = j0; j <= j1; j++){
      var a0 = pt(j * K, 0), b0 = pt(j * K, 1);
      if(Math.hypot(a0.x - b0.x, a0.y - b0.y) < 4) continue;
      var mx = (a0.x + b0.x) / 2, my = (a0.y + b0.y) / 2;
      g.strokeStyle = 'rgba(' + BASES[j % 3] + ',.5)';
      g.beginPath(); g.moveTo(a0.x, a0.y); g.lineTo(a0.x + (mx - a0.x) * .84, a0.y + (my - a0.y) * .84); g.stroke();
      g.strokeStyle = 'rgba(' + BASES[(j + 1) % 3] + ',.5)';
      g.beginPath(); g.moveTo(b0.x, b0.y); g.lineTo(b0.x + (mx - b0.x) * .84, b0.y + (my - b0.y) * .84); g.stroke();
    }
    paint(front);
  }

  // Полоса у экрана — выделяем память и рисуем; далеко — освобождаем
  function setNear(st, on){
    st.near = on;
    if(on){ size(st); draw(st); }
    else { st.c.width = 0; st.c.height = 0; }
  }
  function size(st){
    var w = Math.round(width * st.dpr), h = Math.round(st.h * st.dpr);
    if(st.c.width !== w) st.c.width = w;
    if(st.c.height !== h) st.c.height = h;
  }

  function layout(){
    var W = document.documentElement.clientWidth, H = document.body.offsetHeight;
    var dpr = Math.min(window.devicePixelRatio || 1, W < 700 ? 2 : 1.5);   // нить мягкая — чётче 1,5 на компьютере не нужно
    width = W;
    path = buildPath(W, H);
    var n = Math.ceil(H / STRIP);
    while(strips.length > n){ var old = strips.pop(); if(io) io.unobserve(old.c); old.c.remove(); }
    while(strips.length < n){
      var c = document.createElement('canvas');
      c.width = c.height = 0;
      var st = { c:c, g:c.getContext('2d'), near:!io };
      c._strip = st;
      layer.appendChild(c);
      strips.push(st);
      if(io) io.observe(c);
    }
    strips.forEach(function(st, i){
      st.top = i * STRIP;
      st.h = Math.min(STRIP, H - st.top);
      st.dpr = dpr;
      st.c.style.top = st.top + 'px';
      st.c.style.height = st.h + 'px';
      if(st.near){ size(st); draw(st); }
    });
  }

  var last = 0, scrolled = -1e9;
  window.addEventListener('scroll', function(){ scrolled = performance.now(); }, { passive:true });
  function tick(t){
    requestAnimationFrame(tick);
    // на телефоне 15 кадров в секунду — вращение медленное, разницы не видно, а батарея целее
    if(document.hidden || still.matches || !path || t - last < (width < 700 ? 66 : 33)) return;
    var dt = last ? Math.min((t - last) / 1000, .1) : 0;
    last = t;
    // листают — вращение быстро затихает; полсекунды покоя — плавно возвращается
    var calm = t - scrolled > 500 ? 1 : 0;
    rate += (calm - rate) * Math.min(1, dt * (calm ? 1.6 : 14));
    if(rate < .01) return;   // нить стоит — перерисовывать нечего, страница листается без нагрузки
    spin += dt * .3 * rate;
    var y = window.scrollY, vh = window.innerHeight;
    strips.forEach(function(st){ if(st.near && st.top < y + vh && st.top + st.h > y) draw(st); });
  }

  var timer = null;
  function later(){ clearTimeout(timer); timer = setTimeout(layout, 150); }
  // ширина окна, раскрытый вопрос, догрузка шрифта меняют высоту страницы — путь пересчитываем
  if('ResizeObserver' in window) new ResizeObserver(later).observe(document.body);
  else window.addEventListener('resize', later);
  window.addEventListener('load', layout);
  still.addEventListener('change', function(){ strips.forEach(function(st){ if(st.near) draw(st); }); });
  layout();
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
