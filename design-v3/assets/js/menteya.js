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
      // мышью меню уже открылось наведением — клик по той же кнопке его не закрывает, иначе оно «мигает»
      if(openTrigger === t && !(canHover && t.matches(':hover'))) closeMenu(); else openMenu(t);
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
    // текст ошибки связан с полем, только пока ошибка есть: иначе экранный диктор читает его как подсказку
    var err = el.closest('.field').querySelector('.error');
    if(err && err.id){ if(ok) el.removeAttribute('aria-describedby'); else el.setAttribute('aria-describedby', err.id); }
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
      c[0].removeAttribute('aria-describedby');
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
    if(link.dataset.service) return 'Услуга: ' + link.dataset.service;   // кнопка сама называет услугу: «Вызвать врача» → «Выезд психиатра на дом»
    var promo = link.closest('.promo-ticket');
    if(promo) return 'Акция: ' + promo.querySelector('.h3').textContent.trim();
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
    }, reduce.matches || document.documentElement.classList.contains('no-motion') ? 0 : 200);
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
      var title = tile.querySelector('[data-open-title]');
      if(title) title.textContent = open ? 'Сейчас открыто, до 21:00' : 'Сейчас закрыто, откроемся в 9:00';
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

// Свет: «шёлк» — медленно текущий свет в глубине воды — и стекло, сквозь которое он преломляется (WebGL).
// Два шейдера на общей основе (шум, шёлк, затемнение под текстом):
//  • мозг — первый экран (.scene-gl): живой фон и стеклянный мозг справа от текста. Форма — поле расстояний из эллипсоидов
//    (полушария, височные доли, мозжечок, ствол), извилины — изогнутый гироид; по бороздам бегут волны мятного света;
//  • линза — шары у краёв разделов (.lens canvas, стили — sections.css) и неподвижный фон разделов и подвала:
//    кадр рисуется один раз и кладётся картинкой в --silk ([data-silk]).
// Камера стоит, к прокрутке ничего не привязано. Не больше 30 кадров в секунду, рисуется только то, что у экрана;
// если видеокарта не успевает, первый экран сам переходит на меньшее разрешение.
// «Уменьшить движение» в системе или кнопка в подвале — неподвижный кадр. Без WebGL остаются CSS-градиенты
(function(){
  if(!window.WebGLRenderingContext) return;
  var BASE = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    // uMode: 0 — фон во весь холст, 1 — шар на прозрачном фоне; uShade: 0 — ровно, 1 — темнее слева (текст), 2 — темнее под линзой или мозгом
    'uniform vec2 uRes; uniform float uTime; uniform vec3 uLens; uniform float uShade; uniform float uMode; uniform vec2 uSeed; uniform float uDim;',
    'float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }',
    'float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);',
    '  return mix(mix(hash(i), hash(i + vec2(1., 0.)), u.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), u.x), u.y); }',
    'float fbm(vec2 p){ float v = 0., a = .5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6);',
    '  for(int i = 0; i < 5; i++){ v += a * noise(p); p = m * p; a *= .5; } return v; }',
    // шёлк: поле шума, дважды «закрученное» само в себя, окрашено от ночной воды через бирюзу в мяту и тёплый рассвет
    'vec3 silk(vec2 p, float t){',
    '  vec2 q = vec2(fbm(p * 1.1 + vec2(0., t * .6)), fbm(p * 1.1 + vec2(5.2, 1.3) - t * .5));',
    '  vec2 r = vec2(fbm(p * 1.3 + 3. * q + vec2(1.7, 9.2) + t * .35), fbm(p * 1.3 + 3. * q + vec2(8.3, 2.8) - t * .3));',
    '  float f = fbm(p * 1.2 + 3.2 * r);',
    '  vec3 col = mix(vec3(.043, .118, .137), vec3(.086, .2, .227), smoothstep(.15, .5, f));',
    '  col = mix(col, vec3(.13, .4, .4), smoothstep(.42, .78, f));',
    '  col = mix(col, vec3(.5, .84, .73), smoothstep(.45, 1., f * f * 1.35) * .75);',
    '  col = mix(col, vec3(.95, .73, .54), smoothstep(.55, 1., r.x) * smoothstep(.42, .9, f) * .5);',
    '  float ridge = pow(1. - abs(fract(f * 6. + q.x * 2.) - .5) * 2., 12.);',
    '  return col + vec3(.5, .84, .73) * ridge * .1;',
    '}',
    // там, где текст, фон темнее
    'float shadeAt(vec2 p){ return uShade < .5 ? 0. : uShade < 1.5 ? smoothstep(.2, -.8, p.x - uLens.x + .45) : smoothstep(uLens.y - uLens.z, uLens.y - uLens.z - .45, p.y); }'
  ];

  // Линза: шар со шёлком внутри
  var LENS = BASE.concat([
    'void main(){',
    '  vec2 p = (gl_FragCoord.xy - .5 * uRes) / uRes.y;',
    '  float t = uTime * .065;',
    '  vec2 d = p - uLens.xy; float R = uLens.z * (1. + .012 * sin(uTime * .5)), r = length(d);',   // линза едва заметно «дышит»
    '  float edge = R > 0. ? smoothstep(R, R - 2.5 / uRes.y, r) : 0.;',
    '  float glow = R > 0. ? exp(-pow(max(r - R, 0.) / (R * .32), 2.)) * (1. - edge) : 0.;',
    '  vec3 inner = vec3(0.);',
    '  if(edge > 0.){',
    '    float z = sqrt(max(0., 1. - r * r / (R * R)));',
    '    inner = silk(uLens.xy + uSeed + d * (.4 + .22 * (1. - z)) + vec2(.3, -.2), t * 1.15) * 1.25 + vec3(.02, .05, .05);',
    '    inner = mix(inner, vec3(.86, .97, .93), pow(1. - z, 2.4) * .5);',   // светлая кромка стекла
    '    vec2 h1 = d / R - vec2(-.36, .42); inner += exp(-dot(h1, h1) * 15.) * .5;',   // блик сверху слева
    '    vec2 h2 = d / R - vec2(.34, -.52); inner += vec3(.95, .74, .55) * exp(-dot(h2, h2) * 9.) * .2;',   // тёплый рефлекс снизу
    '  }',
    '  if(uMode > .5){',   // шар: цвет уже умножен на прозрачность
    '    gl_FragColor = vec4(inner * edge + vec3(.5, .84, .73) * glow * .4, clamp(edge + glow * .4, 0., 1.));',
    '    return;',
    '  }',
    '  vec3 col = silk(p + uSeed, t) * uDim;',
    '  col *= 1. - .5 * shadeAt(p);',
    '  col *= 1. - .22 * dot(p * vec2(.55, 1.), p * vec2(.55, 1.));',
    '  col += vec3(.5, .84, .73) * glow * .12;',   // свечение вокруг линзы
    '  col = mix(col, inner, edge);',
    '  col += (hash(gl_FragCoord.xy + fract(uTime)) - .5) * .022;',   // зерно, чтобы не было полос в градиенте
    '  gl_FragColor = vec4(col, 1.);',
    '}'
  ]).join('\n');

  // Мозг: uLens — центр (xy) и масштаб (z: ширина мозга ≈ 2,5·z) в долях высоты холста. Единица модели — длина мозга;
  // x — поперёк, y — вверх, z — ко лбу. Камера смотрит сверху-сбоку: лоб слева, видны макушка, щель между полушариями и висок
  var BRAIN = BASE.concat([
    'float sdEll(vec3 p, vec3 r){ float k0 = length(p / r), k1 = length(p / (r * r)); return k0 * (k0 - 1.) / k1; }',
    'float smin(float a, float b, float k){ float h = clamp(.5 + .5 * (b - a) / k, 0., 1.); return mix(b, a, h) - k * h * (1. - h); }',
    'float smax(float a, float b, float k){ return -smin(-a, -b, k); }',
    'float gyroid(vec3 w){ return dot(sin(w), cos(w.yzx)); }',
    // извилины: гироид, дважды изогнутый синусами, плюс мелкая октава — борозды ветвятся; вдоль оси «лоб — затылок» вытянуты
    'float gyri(vec3 p){',
    '  vec3 w = p * vec3(42., 40., 27.);',
    '  w += 1.9 * sin(w.yzx * .2 + vec3(1.3, 4.1, 2.7));',
    '  w += .9 * sin(w.zxy * .45 + vec3(5.2, .7, 3.3));',
    '  return gyroid(w) + .32 * gyroid(w * 1.93 + 2.1);',
    '}',
    // расстояния до частей: x — большие полушария, y — мозжечок, z — ствол с мостом
    'vec3 parts(vec3 p){',
    '  vec3 q = vec3(abs(p.x), p.y, p.z);',
    '  vec3 h = q - vec3(0., .06, -.01);',
    '  h.x *= 1. + .22 * smoothstep(0., .5, p.z) + .12 * smoothstep(.1, .5, -p.z);',   // уже ко лбу и к затылку
    '  float c = sdEll(h, vec3(.4, .31, .5));',
    '  c = smax(c, -.15 - p.y, .08);',   // плоское основание лобной и затылочной долей
    '  c = smin(c, sdEll(q - vec3(.26, -.13, .03), vec3(.145, .13, .27)), .035);',   // височная доля; складка над ней — сильвиева борозда
    '  c = smax(c, .008 - q.x, .035);',   // плоская внутренняя сторона полушарий: между ними продольная щель
    '  float cb = sdEll(q - vec3(.11, -.21, -.27), vec3(.16, .1, .12));',
    '  vec3 a = vec3(0., -.12, -.05), ba = vec3(0., -.34, -.08);',
    '  float hh = clamp(dot(p - a, ba) / dot(ba, ba), 0., 1.);',
    '  float bs = smin(length(p - a - ba * hh) - mix(.068, .045, hh), sdEll(p - vec3(0., -.22, -.04), vec3(.085, .075, .07)), .04);',
    '  return vec3(c, cb, bs);',
    '}',
    'float map(vec3 p){',
    '  vec3 d = parts(p);',
    '  if(d.x < .05){ float u = clamp(abs(gyri(p)) / 1.25, 0., 1.); d.x += .013 - .017 * (1. - (1. - u) * (1. - u)); }',   // борозда вдавлена, извилина скруглена
    '  if(d.y < .03) d.y += .003 * sin(p.y * 110. + 10. * length(p.xz - vec2(0., -.27)));',   // листки мозжечка
    '  return min(min(d.x, d.y), d.z);',
    '}',
    // цвет точки поверхности: шёлк сквозь стекло, объём от света сверху слева, светящиеся борозды, кромка, блики
    'vec3 brain(vec3 pos, vec3 rdc, mat3 rot, vec2 p){',
    '  const vec2 e = vec2(.0015, -.0015);',
    '  vec3 n = normalize(e.xyy * map(pos + e.xyy) + e.yyx * map(pos + e.yyx) + e.yxy * map(pos + e.yxy) + e.xxx * map(pos + e.xxx));',
    '  vec3 nc = rot * n, d = parts(pos);',
    '  float g = gyri(pos);',
    '  float sul = exp(-g * g * 10.) * step(d.x, min(d.y, d.z) + .01);',   // 1 — дно борозды, только на коре
    '  float ndv = clamp(-dot(nc, rdc), 0., 1.), fres = pow(1. - ndv, 2.5);',
    '  vec3 L = normalize(vec3(-.55, .75, .55)), rf = reflect(rdc, nc);',
    '  float dif = clamp(dot(nc, L) * .6 + .4, 0., 1.);',
    '  float spec = pow(clamp(dot(rf, L), 0., 1.), 30.);',
    '  float warm = pow(clamp(dot(rf, normalize(vec3(.7, -.5, .5))), 0., 1.), 5.);',
    '  vec3 c = silk(p * .8 + uSeed + nc.xy * .25 + vec2(.3, -.2), uTime * .075) * 1.35 + vec3(.03, .07, .07);',
    '  c += vec3(.08, .22, .2) * pow(ndv, 3.) * (.75 + .25 * sin(uTime * .6));',   // свет в толще стекла медленно «дышит»
    '  c *= (.62 + .55 * dif) * (1. - .3 * sul);',
    '  float wave = pow(.5 + .5 * sin(dot(pos, vec3(.5, .8, 2.4)) * 6. - uTime * 1.2), 10.);',   // волны света бегут по бороздам
    '  c += vec3(.5, .84, .73) * sul * (.18 + .9 * wave);',
    '  c = mix(c, vec3(.86, .97, .93), fres * .55);',   // светлая кромка стекла
    '  c += spec * .4 * (1. - .8 * sul);',
    '  c += vec3(.95, .74, .55) * warm * .3;',   // тёплый рефлекс снизу справа
    '  return c;',
    '}',
    'void main(){',
    '  vec2 p = (gl_FragCoord.xy - .5 * uRes) / uRes.y;',
    '  vec3 col = silk(p + uSeed, uTime * .065) * uDim;',
    '  col *= 1. - .5 * shadeAt(p);',
    '  col *= 1. - .22 * dot(p * vec2(.55, 1.), p * vec2(.55, 1.));',
    // мозг медленно покачивается и чуть всплывает; поворот модели в камеру — сначала вокруг вертикали, потом наклон
    '  float yaw = -1.13 + .21 * sin(uTime * .16), pitch = .34 + .05 * sin(uTime * .11 + 1.);',
    '  float cy = cos(yaw), sy = sin(yaw), cp = cos(pitch), sp = sin(pitch);',
    '  mat3 rot = mat3(1., 0., 0., 0., cp, sp, 0., -sp, cp) * mat3(cy, 0., -sy, 0., 1., 0., sy, 0., cy);',
    '  float k = .4 / uLens.z;',
    '  vec2 m = (p - uLens.xy) * k;',
    '  m.y += .012 * sin(uTime * .35);',
    '  vec3 rdc = normalize(vec3(m, -3.5));',
    '  vec3 ro = vec3(0., 0., 3.5) * rot, rd = rdc * rot;',   // луч — в пространство модели (v * M — обратный поворот)
    '  vec3 oc = ro - vec3(0., -.06, -.02);',
    '  float b = dot(oc, rd), disc = b * b - dot(oc, oc) + .36;',   // сфера-оболочка радиусом .6: мимо неё луч не шагает
    '  if(disc > 0.){',
    '    float sq = sqrt(disc), t = -b - sq, t1 = -b + sq;',
    '    float px = 1.4 * k / uRes.y, dm = 1e3, tm = t, hit = 0.;',
    '    for(int i = 0; i < 110; i++){',
    '      float d = map(ro + rd * t);',
    '      if(d < dm){ dm = d; tm = t; }',
    '      if(d < .0005){ hit = 1.; break; }',
    '      t += d * .5;',
    '      if(t > t1) break;',
    '    }',
    '    vec3 pos = ro + rd * (hit > .5 ? t : tm);',
    '    float cover = (hit > .5 ? 1. : 1. - smoothstep(0., px, dm)) * smoothstep(-.47, -.27, pos.y);',   // мягкий край; ствол книзу растворяется в воде
    '    col += vec3(.5, .84, .73) * exp(-dm * dm / .0025) * (1. - cover) * .18 * smoothstep(-.5, -.25, pos.y);',   // ореол
    '    if(cover > 0.) col = mix(col, brain(pos, rdc, rot, p), cover);',
    '  }',
    '  col += (hash(gl_FragCoord.xy + fract(uTime)) - .5) * .022;',
    '  gl_FragColor = vec4(col, 1.);',
    '}'
  ]).join('\n');

  var VS = 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }';
  var root = document.documentElement;
  var still = window.matchMedia('(prefers-reduced-motion: reduce)');
  function calm(){ return still.matches || root.classList.contains('no-motion'); }
  var start = performance.now() - 40000;   // не с нулевого кадра — узор уже «раскручен»

  // Программа на холсте; null — если WebGL нет или шейдер не собрался
  function renderer(canvas, alpha, src){
    var gl = canvas.getContext('webgl', { alpha:alpha, premultipliedAlpha:true, antialias:false, depth:false, stencil:false, preserveDrawingBuffer:false, powerPreference:'low-power' });
    if(!gl) return null;
    function shader(type, s){ var o = gl.createShader(type); gl.shaderSource(o, s); gl.compileShader(o); return gl.getShaderParameter(o, gl.COMPILE_STATUS) ? o : null; }
    var vs = shader(gl.VERTEX_SHADER, VS), fs = shader(gl.FRAGMENT_SHADER, src);
    if(!vs || !fs) return null;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, 'a');
    gl.linkProgram(prog);
    if(!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);   // один треугольник на весь холст
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    var loc = {};
    ['uRes', 'uTime', 'uLens', 'uShade', 'uMode', 'uSeed', 'uDim'].forEach(function(n){ loc[n] = gl.getUniformLocation(prog, n); });
    gl.uniform1f(loc.uDim, 1);
    return {
      gl:gl,
      size:function(w, h){
        w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
        if(canvas.width !== w || canvas.height !== h){ canvas.width = w; canvas.height = h; }
        gl.viewport(0, 0, w, h);
        gl.uniform2f(loc.uRes, w, h);
      },
      set:function(n, a, b, c){ var l = loc[n]; if(c !== undefined) gl.uniform3f(l, a, b, c); else if(b !== undefined) gl.uniform2f(l, a, b); else gl.uniform1f(l, a); },
      draw:function(sec){ gl.uniform1f(loc.uTime, sec); gl.drawArrays(gl.TRIANGLES, 0, 3); }
    };
  }
  function now(){ return (performance.now() - start) / 1000; }

  var live = [];   // что течёт: { r, el, visible, resize, slow }
  function watch(item, margin){
    live.push(item);
    if(!('IntersectionObserver' in window)){ item.visible = true; return; }
    new IntersectionObserver(function(es){
      item.visible = es[0].isIntersecting;
      if(item.visible && item.wake) item.wake();
    }, { rootMargin:margin || '0px' }).observe(item.el);
  }

  // 1. Первый экран: мозг справа от текста; на планшете и телефоне — над текстом, в отступе .hero-in (hero.css)
  var heroCanvas = document.querySelector('.scene-gl');
  var hr = heroCanvas && renderer(heroCanvas, false, BRAIN);
  if(hr){
    var heroQ = 1;   // доля разрешения: уменьшается, если кадры не успевают
    hr.set('uSeed', 0, 0);
    var heroResize = function(){
      var W = heroCanvas.clientWidth, H = heroCanvas.clientHeight, phone = W < 700, narrow = W < 1100;
      var q = (phone ? .6 : Math.min(Math.max((window.devicePixelRatio || 1) * .6, .75), 1.2)) * heroQ;   // фон мягкий — полное разрешение не нужно
      hr.size(W * q, H * q);
      hr.set('uShade', narrow ? 2 : 1);
      if(narrow){
        var head = parseFloat(getComputedStyle(root).getPropertyValue('--header-h')) || 72;
        var space = phone ? Math.min(W * .54, 300) : Math.min(W * .4, 340);
        hr.set('uLens', phone ? 0 : W * .16 / H, .5 - (head + space / 2) / H, space * .38 / H);   // мозг — во всю ширину отступа над текстом
      } else {
        var R = Math.min(.27, .169 * W / H);   // узкий компьютер — мозг меньше, чтобы не заходить на текст
        hr.set('uLens', Math.min(W / H * .5 - .04 - 1.25 * R, .5), .06, R);   // правый край мозга — в 4% высоты от края экрана
      }
      hr.draw(now());
    };
    heroResize();
    heroCanvas.classList.add('is-on');
    heroCanvas.addEventListener('webglcontextlost', function(e){ e.preventDefault(); heroCanvas.classList.remove('is-on'); });   // остаётся CSS-градиент
    watch({ r:hr, el:heroCanvas, visible:true, resize:heroResize, slow:function(){
      if(heroQ <= .5) return;
      heroQ = Math.max(.5, heroQ * .75);
      heroResize();
    } });
  }

  // 2. Линзы у краёв разделов: контекст WebGL создаём, только когда линза подъехала к экрану
  document.querySelectorAll('.lens canvas').forEach(function(c, i){
    var seed = +(c.parentNode.getAttribute('data-seed') || i + 1);
    var item = { el:c, visible:false, r:null };
    // слабый телефон может отобрать контекст WebGL — тогда возвращается CSS-пятно, а у экрана шар создаётся заново
    c.addEventListener('webglcontextlost', function(e){ e.preventDefault(); item.r = null; c.classList.remove('is-on'); });
    c.addEventListener('webglcontextrestored', function(){ if(item.visible && item.wake) item.wake(); });
    item.resize = function(){
      if(!item.r) return;
      var q = window.innerWidth < 700 ? .6 : Math.min(window.devicePixelRatio || 1, 2) * .55;
      item.r.size(c.clientWidth * q, c.clientHeight * q);
      item.r.draw(now());
    };
    item.wake = function(){
      if(item.r) return;
      item.r = renderer(c, true, LENS);
      if(!item.r){ item.wake = null; return; }
      item.r.set('uMode', 1); item.r.set('uShade', 0);
      item.r.set('uSeed', seed * 3.7, seed * 1.9);
      item.r.set('uLens', 0, 0, .36);
      item.resize();
      c.classList.add('is-on');
    };
    watch(item, '200px 0px');
  });

  // 3. Неподвижный шёлк: один временный контекст рисует кадры по очереди и отдаёт их картинками, потом освобождается
  var flats = Array.prototype.slice.call(document.querySelectorAll('[data-silk]'));
  if(flats.length) setTimeout(function(){
    var off = document.createElement('canvas');
    var fr = renderer(off, false, LENS);
    if(!fr) return;
    fr.set('uMode', 0); fr.set('uShade', 0); fr.set('uDim', .8);
    (function next(i){
      if(i >= flats.length){
        var lose = fr.gl.getExtension('WEBGL_lose_context');
        if(lose) lose.loseContext();
        return;
      }
      var el = flats[i], W = Math.min(el.clientWidth, 1600) || 1200, H = Math.max(Math.min(el.clientHeight * W / (el.clientWidth || W), 1000), 300);
      fr.size(W * .7, H * .7);
      fr.set('uSeed', 11.3 + i * 4.1, 3.7 + i * 2.3);
      if(el.getAttribute('data-silk') === 'lens') fr.set('uLens', W / H * .5 - .32, .02, .26);
      else fr.set('uLens', 0, 0, 0);
      fr.draw(37 + i * 13);
      off.toBlob(function(blob){
        if(blob) el.style.setProperty('--silk', 'url("' + URL.createObjectURL(blob) + '")');
        next(i + 1);
      }, 'image/webp', .9);
    })(0);
  }, 700);

  // Общий цикл: рисуем только видимое и не чаще 30 раз в секунду.
  // Кадры раз за разом дольше 60 мс — видеокарта не справляется: первый экран рисуется в меньшем разрешении
  var last = 0, lag = 0;
  function loop(t){
    requestAnimationFrame(loop);
    if(document.hidden || calm()){ last = 0; return; }
    if(t - last < 33) return;
    if(last){
      var gap = t - last;
      if(gap > 60 && gap < 250) lag++; else if(lag) lag--;   // паузы дольше четверти секунды — не видеокарта, а фоновая вкладка или занятый поток
      if(lag > 40){ lag = 0; live.forEach(function(it){ if(it.visible && it.slow) it.slow(); }); }
    }
    last = t;
    var s = now();
    live.forEach(function(it){ if(it.visible && it.r) it.r.draw(s); });
  }
  requestAnimationFrame(loop);
  var timer = null;
  window.addEventListener('resize', function(){
    clearTimeout(timer);
    timer = setTimeout(function(){ live.forEach(function(it){ if(it.resize) it.resize(); }); }, 150);
  });
})();

// Док быстрой связи («Записаться / Позвонить / Написать»): виден, когда первый экран ушёл из вида.
// Класс is-off у .hero, правила показа — overlays.css
(function(){
  var hero = document.querySelector('.hero');
  if(!hero) return;
  if(!('IntersectionObserver' in window)){ hero.classList.add('is-off'); return; }
  new IntersectionObserver(function(es){ hero.classList.toggle('is-off', !es[0].isIntersecting); }).observe(hero);
})();

// Врачи на главной: стрелки листают ряд карточек на одну карточку; у края ряда стрелка гаснет.
// Палец и колёсико листают ряд сами (CSS scroll-snap), скрипт только добавляет кнопки
(function(){
  var track = document.getElementById('doctorsTrack');
  if(!track) return;
  var prev = document.querySelector('.doc-arrow[data-dir="-1"]');
  var next = document.querySelector('.doc-arrow[data-dir="1"]');
  if(!prev || !next) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var ticking = false;
  function step(){
    var cell = track.firstElementChild;
    return cell ? cell.getBoundingClientRect().width + 1 : track.clientWidth;   // + линия 1px между карточками
  }
  function update(){
    var max = track.scrollWidth - track.clientWidth - 2;
    prev.setAttribute('aria-disabled', String(track.scrollLeft <= 2));
    next.setAttribute('aria-disabled', String(track.scrollLeft >= max));
    ticking = false;
  }
  // aria-disabled, а не disabled: кнопка в фокусе не теряет его, когда ряд дошёл до края
  [prev, next].forEach(function(btn){
    btn.addEventListener('click', function(){
      if(btn.getAttribute('aria-disabled') === 'true') return;
      var calm = reduce.matches || document.documentElement.classList.contains('no-motion');
      track.scrollBy({ left:+btn.dataset.dir * step(), behavior:calm ? 'auto' : 'smooth' });
    });
  });
  function onChange(){
    if(ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }
  track.addEventListener('scroll', onChange, { passive:true });
  window.addEventListener('resize', onChange);
  update();
})();

// «Пример диалога» в разделе записи: реплики появляются по очереди один раз, когда диалог показался на экране;
// перед ответом администратора 0,8 с видно «печатает…». Место под реплики занято заранее — страница не прыгает.
// Без скриптов, без IntersectionObserver и при выключенной анимации все реплики видны сразу
(function(){
  var chat = document.querySelector('.chat');
  if(!chat || !('IntersectionObserver' in window)) return;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('no-motion')) return;
  var msgs = chat.querySelectorAll('.chat-msg');
  chat.classList.add('is-playing');
  function show(i){
    if(i >= msgs.length){ chat.classList.remove('is-playing'); return; }   // всё показано — убираем служебный класс
    var m = msgs[i];
    if(m.classList.contains('is-admin')){
      m.classList.add('is-typing');
      setTimeout(function(){
        m.classList.remove('is-typing');
        m.classList.add('is-shown');
        setTimeout(function(){ show(i + 1); }, 600);
      }, 800);
    } else {
      m.classList.add('is-shown');
      setTimeout(function(){ show(i + 1); }, 700);
    }
  }
  var io = new IntersectionObserver(function(entries){
    if(!entries[0].isIntersecting) return;
    io.disconnect();
    setTimeout(function(){ show(0); }, 300);
  }, { threshold:.35 });
  io.observe(chat);
})();

// «Отключить анимацию» в подвале: класс no-motion на <html> выключает движение так же, как системная настройка
// «уменьшить движение» (правило в core.css), и останавливает свет. Выбор помним в браузере; при загрузке класс
// ставит строка в <head> (layout.html), чтобы анимация не мелькнула
(function(){
  var buttons = document.querySelectorAll('[data-motion-toggle]');
  if(!buttons.length) return;
  var KEY = 'menteya-motion', root = document.documentElement;
  function save(off){ try { if(off) localStorage.setItem(KEY, 'off'); else localStorage.removeItem(KEY); } catch(e){} }
  function apply(off){
    root.classList.toggle('no-motion', off);
    buttons.forEach(function(b){ b.setAttribute('aria-pressed', String(off)); });
  }
  apply(root.classList.contains('no-motion'));
  buttons.forEach(function(b){
    b.addEventListener('click', function(){
      var off = !root.classList.contains('no-motion');
      save(off);
      apply(off);
    });
  });
})();

// Появление блоков при прокрутке (один раз)
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
