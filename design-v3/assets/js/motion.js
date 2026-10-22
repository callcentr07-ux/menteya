// Движение третьего дизайна «Ментеи» — поверх menteya.js, тот модуль не меняем.
// Что здесь: заставка и занавес между страницами, плавная прокрутка колесом, заголовки по словам, параллакс первого экрана
// (сцена и мозг идут за курсором и прокруткой, вода светится у курсора), линии шагов и слова манифеста по прокрутке,
// магнитные кнопки, наклон карточек и пятно света под курсором, лента состояний, ряд врачей мышью, бегунок вкладок
// прайса, досчёт оценок, шапка, которая прячется при прокрутке вниз, линия прогресса чтения.
// Работает только при классе has-motion на <html> — его ставит строка в <head> (нет «уменьшить движение», анимация не
// выключена в подвале). Кнопка «Отключить анимацию» снимает класс на лету, и всё возвращается в спокойный режим.
// Всё, что двигается, — transform, translate, scale, opacity и переменные CSS: раскладку страницы не трогаем.
(function(){
  var root = document.documentElement;
  var FINE = window.matchMedia('(hover: hover) and (pointer: fine)');
  var REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)');
  var loader = document.getElementById('loader');

  function on(){ return root.classList.contains('has-motion'); }
  function clamp01(v){ return v < 0 ? 0 : v > 1 ? 1 : v; }
  // Доля пути за кадр при коэффициенте k на 60 кадрах в секунду — не зависит от частоты экрана
  function lerpK(k, dt){ return 1 - Math.pow(1 - k, dt / 16.7); }

  // ---------- Общий цикл: одна функция на кадр для всех модулей ----------
  var jobs = [], lastT = 0;
  function loop(t){
    requestAnimationFrame(loop);
    var dt = lastT ? Math.min(t - lastT, 64) : 16.7;
    lastT = t;
    if(document.hidden) return;
    for(var i = 0; i < jobs.length; i++) jobs[i](t, dt);
  }
  requestAnimationFrame(loop);

  // ---------- Текст по словам (или по буквам): <span class="w"><span class="wi">слово</span></span> ----------
  // Неразрывный пробел (&nbsp;) не разделитель — «в Москве» остаётся одним куском. У заголовков имя для диктора —
  // в aria-label, а обёртки скрыты от него: иначе некоторые дикторы читают слова с паузами
  function split(el, letters){
    var text = el.textContent.replace(/\s+/g, ' ').trim();
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), nodes = [], n, idx = 0;
    while((n = walker.nextNode())) if(n.nodeValue.trim()) nodes.push(n);
    nodes.forEach(function(node){
      var frag = document.createDocumentFragment();
      var parts = letters ? node.nodeValue.replace(/\s+/g, '').split('') : node.nodeValue.split(/([ \t\n\r]+)/);
      parts.forEach(function(part){
        if(!part) return;
        if(/^[ \t\n\r]+$/.test(part)){ frag.appendChild(document.createTextNode(' ')); return; }
        var w = document.createElement('span'), wi = document.createElement('span');
        w.className = 'w'; wi.className = 'wi';
        wi.textContent = part;
        wi.style.setProperty('--wi', idx++);
        w.appendChild(wi);
        frag.appendChild(w);
      });
      node.parentNode.replaceChild(frag, node);
    });
    if(/^H[1-6]$/.test(el.tagName)){
      el.setAttribute('aria-label', text);
      el.querySelectorAll('.w').forEach(function(w){ w.setAttribute('aria-hidden', 'true'); });
    }
    return idx;
  }
  if(on()){
    document.querySelectorAll('.hero-h1, [data-reveal] .h2').forEach(function(el){ split(el); });
    document.querySelectorAll('.ft-word').forEach(function(el){ split(el, true); });
    // Манифест: каждому слову — его доля в тексте (--k), по ней слово проявляется при прокрутке
    document.querySelectorAll('.manifest[data-scrub]').forEach(function(el){
      var total = split(el);
      el.querySelectorAll('.w').forEach(function(w, i){ w.style.setProperty('--k', (total > 1 ? i / (total - 1) : 0).toFixed(3)); });
    });
  }

  // ---------- Заставка ----------
  // Первый раз во вкладке — знак, буквы и занавес (около 2,3 с); дальше в той же вкладке — короткий занавес.
  // html.is-ready запускает вступление первого экрана, когда занавес пошёл вверх; html.is-loading держит прокрутку
  (function(){
    function ready(){ root.classList.add('is-ready'); root.classList.remove('is-loading'); }
    if(!on() || !loader){ ready(); return; }
    var seen = false;
    try { seen = sessionStorage.getItem('menteya-seen') === '1'; } catch(e){}
    function finish(e){
      if(e && e.target !== loader) return;   // animationend от кольца и букв сюда тоже долетает
      if(loader.classList.contains('is-enter')) return;   // занавес при уходе со страницы — не прячем
      loader.hidden = true;
      loader.classList.remove('is-done', 'is-short', 'is-go');
    }
    loader.addEventListener('animationend', finish);
    // Страховка: анимация занавеса не дошла до конца (вкладка в фоне, движение выключили на ходу) — прячем сами
    function safety(ms){ setTimeout(function(){ if(!loader.hidden && !loader.classList.contains('is-enter')) finish(); }, ms); }
    if(seen){
      loader.classList.add('is-short');
      setTimeout(ready, 60);
      safety(1600);
      return;
    }
    try { sessionStorage.setItem('menteya-seen', '1'); } catch(e){}
    // Буквы — антиквой логотипа: ждём шрифт, но не дольше 450 мс, иначе буквы сменят начертание на ходу
    var go = false;
    function start(){ if(go) return; go = true; loader.classList.add('is-go'); }
    if(document.fonts && document.fonts.load){ document.fonts.load('600 30px "Cormorant Garamond"').then(start, start); }
    setTimeout(start, 450);
    setTimeout(function(){ loader.classList.add('is-done'); ready(); }, 1550);
    safety(3400);
  })();

  // ---------- Плавная прокрутка колесом (мышь и тачпад): цель и догоняющее положение ----------
  // Палец, клавиатура и ползунок прокручивают страницу сами — их не перехватываем. Прокрутка внутри меню, окна записи
  // и лент тоже остаётся родной. Колёсико с Ctrl — масштаб страницы, не трогаем
  var smooth = (function(){
    var target = 0, cur = 0, active = false, ownUntil = 0;
    function max(){ return Math.max(0, root.scrollHeight - window.innerHeight); }
    function nativeScrolls(el, dy){
      for(; el && el !== document.body && el !== root; el = el.parentNode){
        if(el.nodeType !== 1) continue;
        var oy = getComputedStyle(el).overflowY;
        if((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 1){
          if(dy < 0 ? el.scrollTop > 0 : el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true;
        }
      }
      return false;
    }
    window.addEventListener('wheel', function(e){
      if(!on() || !FINE.matches || e.ctrlKey || e.defaultPrevented) return;
      if(Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if(root.classList.contains('modal-open') || root.classList.contains('is-loading') || document.body.classList.contains('no-scroll')) return;
      if(nativeScrolls(e.target, e.deltaY)) return;
      e.preventDefault();
      var d = e.deltaY;
      if(e.deltaMode === 1) d *= 40; else if(e.deltaMode === 2) d *= window.innerHeight;
      if(!active){ cur = window.scrollY; target = cur; }
      target = Math.min(Math.max(target + d, 0), max());
      active = true;
    }, { passive:false });
    // Страницу прокрутили не мы (ползунок, клавиши, якорь браузера) — догонялку сбрасываем, следующее колесо начнёт с места
    window.addEventListener('scroll', function(){ if(active && performance.now() > ownUntil) active = false; }, { passive:true });
    jobs.push(function(t, dt){
      if(!active) return;
      var diff = target - cur;
      if(Math.abs(diff) < .4){ cur = target; active = false; }
      else cur += diff * lerpK(.12, dt);
      ownUntil = performance.now() + 120;
      window.scrollTo(0, cur);
    });
    return {
      to:function(y){
        if(!on()){ window.scrollTo(0, y); return; }
        cur = window.scrollY;
        target = Math.min(Math.max(y, 0), max());
        active = true;
      },
      stop:function(){ active = false; }
    };
  })();

  // Якорные ссылки — той же плавной прокруткой, с учётом высоты шапки. Ссылки #booking уже перехватило окно записи
  document.addEventListener('click', function(e){
    if(!on() || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    var a = e.target.closest('a[href^="#"]');
    if(!a || a.getAttribute('href').length < 2) return;
    var id = decodeURIComponent(a.getAttribute('href').slice(1));
    var el = document.getElementById(id);
    if(!el) return;
    e.preventDefault();
    var head = parseFloat(getComputedStyle(root).getPropertyValue('--header-h')) || 84;
    smooth.to(el.getBoundingClientRect().top + window.scrollY - head - 12);
    if(history.pushState) history.pushState(null, '', '#' + id);
    if(!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll:true });
  });

  // ---------- Привязка к положению прокрутки: элемент получает долю пути 0…1 ----------
  var scrubs = [];
  function scrub(el, calc, fn){
    var it = { el:el, calc:calc, fn:fn, near:true, last:-1 };
    scrubs.push(it);
    if('IntersectionObserver' in window){
      new IntersectionObserver(function(es){ it.near = es[0].isIntersecting; }, { rootMargin:'40% 0px 40% 0px' }).observe(el);
    }
  }
  // Доля пути: 0, когда верх элемента на s·высоты экрана; 1, когда низ элемента на e·высоты экрана
  function view(s, e){
    return function(r, vh){ return clamp01((s * vh - r.top) / (r.height + (s - e) * vh)); };
  }
  jobs.push(function(){
    if(!on() || !scrubs.length) return;
    var vh = window.innerHeight;
    for(var i = 0; i < scrubs.length; i++){
      var it = scrubs[i];
      if(!it.near) continue;
      var p = it.calc(it.el.getBoundingClientRect(), vh);
      if(Math.abs(p - it.last) < .0008) continue;
      it.last = p;
      it.fn(p);
    }
  });
  function setVar(el, name){ return function(p){ el.style.setProperty(name, p.toFixed(4)); }; }
  document.querySelectorAll('.visit-steps[data-scrub]').forEach(function(el){ scrub(el, view(.92, .42), setVar(el, '--sp')); });
  document.querySelectorAll('.manifest[data-scrub]').forEach(function(el){ scrub(el, view(.95, .35), setVar(el, '--sp')); });
  document.querySelectorAll('.site-footer[data-scrub]').forEach(function(el){
    scrub(el, function(r, vh){ return clamp01((vh - r.top) / (vh * .75)); }, setVar(el, '--sp'));
  });

  // ---------- Первый экран: сцена идёт за курсором и за прокруткой, мозг поворачивается «вслед за взглядом» ----------
  (function(){
    var hero = document.querySelector('.hero');
    if(!hero) return;
    var scene = hero.querySelector('.scene'), canvas = hero.querySelector('.scene-gl'), copy = hero.querySelector('.hero-copy'), side = hero.querySelector('.hero-side');
    var tx = 0, ty = 0, cx = 0, cy = 0, inView = true, lastP = -1;
    var px = 0, py = 0, lx = 0, ly = 0, tk = 0, lk = 0;   // курсор в координатах холста (цель и сглаженное) и сила свечения
    if('IntersectionObserver' in window) new IntersectionObserver(function(es){ inView = es[0].isIntersecting; }).observe(hero);
    if(FINE.matches){
      hero.addEventListener('pointermove', function(e){
        if(e.pointerType !== 'mouse') return;
        tx = e.clientX / window.innerWidth * 2 - 1;
        ty = e.clientY / window.innerHeight * 2 - 1;
        if(canvas){
          // Те же координаты, что у точки в шейдере: от центра холста, в долях его высоты, ось y — вверх
          var r = canvas.getBoundingClientRect();
          px = (e.clientX - r.left - r.width / 2) / r.height;
          py = -(e.clientY - r.top - r.height / 2) / r.height;
        }
        tk = 1;
      });
      hero.addEventListener('pointerleave', function(){ tx = 0; ty = 0; tk = 0; });
    }
    jobs.push(function(t, dt){
      if(!on() || !inView) return;
      // Мозг и сцена догоняют курсор тяжело, как стекло в воде; пятно света — живее
      var k = lerpK(.035, dt), kl = lerpK(.14, dt);
      cx += (tx - cx) * k;
      cy += (ty - cy) * k;
      lx += (px - lx) * kl;
      ly += (py - ly) * kl;
      lk += (tk - lk) * lerpK(.06, dt);
      var vh = window.innerHeight;
      var p = clamp01(-hero.getBoundingClientRect().top / (hero.offsetHeight || vh));
      if(Math.abs(p - lastP) > .0005){ lastP = p; hero.style.setProperty('--hs', p.toFixed(4)); }
      // Сцена: вслед за прокруткой едет медленнее текста и растёт — края не оголяются; за курсором — лёгкий сдвиг
      if(scene) scene.style.transform = 'translate3d(' + (cx * -8).toFixed(2) + 'px,' + (p * vh * .08 + cy * -6).toFixed(2) + 'px,0) scale(' + (1 + p * .18).toFixed(4) + ')';
      if(copy) copy.style.translate = (cx * 7).toFixed(2) + 'px ' + (cy * 5).toFixed(2) + 'px';
      if(side) side.style.translate = (cx * 14).toFixed(2) + 'px ' + (cy * 9 + p * vh * .1).toFixed(2) + 'px';
      if(window.MenteyaLight){
        window.MenteyaLight.tilt(cx, cy, p);
        window.MenteyaLight.pointer(lx, ly, lk * (1 - p));
      }
    });
  })();

  // ---------- Линия прогресса чтения и шапка: вниз — прячется, вверх — возвращается ----------
  (function(){
    var bar = document.getElementById('progress'), header = document.getElementById('siteHeader');
    var lastY = window.scrollY, hidden = false, lastProg = -1;
    jobs.push(function(){
      if(!on()) return;
      var y = window.scrollY, maxY = root.scrollHeight - window.innerHeight;
      if(bar){
        var prog = maxY > 0 ? clamp01(y / maxY) : 0;
        if(Math.abs(prog - lastProg) > .001){ lastProg = prog; bar.style.setProperty('--prog', prog.toFixed(4)); }
      }
      if(!header) return;
      var d = y - lastY;
      lastY = y;
      var menuOpen = header.querySelector('[aria-expanded="true"]') || document.body.classList.contains('no-scroll');
      var want = hidden;
      if(y < 320 || d < -2 || menuOpen) want = false;
      else if(d > 2) want = true;
      if(want !== hidden){ hidden = want; header.classList.toggle('is-hidden', hidden); }
    });
  })();

  // ---------- Мышь: магнитные кнопки, наклон карточек, пятно света, кольцо у курсора ----------
  if(FINE.matches){
    // Магнит: кнопка тянется к курсору на треть расстояния до него и пружинит обратно
    document.querySelectorAll('.hero .btn-cta, .hero .btn-line, .hd-cta, .doc-arrow, .svc-help .btn-cta, .visit-cta .btn-cta, .visit-cta .btn-line, .book-submit, .promo-stub .btn, .faq-aside .btn').forEach(function(el){
      el.classList.add('is-magnetic');
      el.addEventListener('pointermove', function(e){
        if(!on() || e.pointerType !== 'mouse') return;
        var r = el.getBoundingClientRect();
        el.classList.add('is-pulled');
        el.style.translate = ((e.clientX - r.left - r.width / 2) * .3).toFixed(1) + 'px ' + ((e.clientY - r.top - r.height / 2) * .3).toFixed(1) + 'px';
      });
      el.addEventListener('pointerleave', function(){ el.classList.remove('is-pulled'); el.style.translate = ''; });
    });

    // Наклон: карточка поворачивается к курсору; большим панелям — меньший угол
    document.querySelectorAll('.promo-ticket, .rv-card, .visit-fact, .about-word, .faq-aside, .rv-total, .cinfo, .lic-item').forEach(function(el){
      el.setAttribute('data-tilt', '');
      el.addEventListener('pointermove', function(e){
        if(!on() || e.pointerType !== 'mouse') return;
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        var a = 7 * Math.min(1, 420 / Math.max(r.width, r.height));
        el.classList.add('is-tilting');
        el.style.transform = 'perspective(900px) rotateX(' + ((.5 - py) * a).toFixed(2) + 'deg) rotateY(' + ((px - .5) * a).toFixed(2) + 'deg)';
      });
      el.addEventListener('pointerleave', function(){ el.classList.remove('is-tilting'); el.style.transform = ''; });
    });

    // Пятно света под курсором в ячейках сеток
    document.querySelectorAll('.svc-cell, .rv-col, .lic-item, .doc-cta, .cmp-col, .about-stat').forEach(function(el){ el.setAttribute('data-spot', ''); });
    document.addEventListener('pointermove', function(e){
      var cell = e.target.closest && e.target.closest('[data-spot]');
      if(!cell) return;
      var r = cell.getBoundingClientRect();
      cell.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      cell.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    }, { passive:true });

    // Врачи: ряд можно тащить мышью. Пока тащим — защёлка выключена; после отпускания — лёгкий разгон, и ряд сам защёлкивается.
    // Нажатие после перетаскивания не считается кликом по карточке
    (function(){
      var track = document.getElementById('doctorsTrack');
      if(!track) return;
      var down = false, moved = false, x0 = 0, s0 = 0, vx = 0, lastX = 0, lastT = 0;
      track.classList.add('is-draggable');
      track.addEventListener('dragstart', function(e){ e.preventDefault(); });   // фото не «вытаскивается» из карточки
      track.addEventListener('pointerdown', function(e){
        if(!on() || e.pointerType !== 'mouse' || e.button !== 0) return;
        down = true; moved = false; vx = 0;
        x0 = lastX = e.clientX; s0 = track.scrollLeft; lastT = e.timeStamp;
        track.classList.add('is-dragging');
        track.setPointerCapture(e.pointerId);
      });
      track.addEventListener('pointermove', function(e){
        if(!down) return;
        var dx = e.clientX - x0;
        if(Math.abs(dx) > 4) moved = true;
        track.scrollLeft = s0 - dx;
        var dt = e.timeStamp - lastT;
        if(dt > 0){ vx = (e.clientX - lastX) / dt; lastX = e.clientX; lastT = e.timeStamp; }
      });
      function up(){
        if(!down) return;
        down = false;
        track.classList.remove('is-dragging');
        if(moved) track.scrollBy({ left:-vx * 160, behavior:'smooth' });
      }
      track.addEventListener('pointerup', up);
      track.addEventListener('pointercancel', up);
      track.addEventListener('click', function(e){ if(moved){ e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    })();
  }

  // ---------- Лента состояний: содержимое строк дублируется, чтобы круг был бесшовным (копии скрыты от диктора и Tab) ----------
  if(on()) document.querySelectorAll('.ticker-row').forEach(function(row){
    Array.prototype.slice.call(row.children).forEach(function(li){
      var copy = li.cloneNode(true);
      copy.setAttribute('aria-hidden', 'true');
      copy.setAttribute('data-clone', '');
      copy.querySelectorAll('a').forEach(function(a){ a.tabIndex = -1; });
      row.appendChild(copy);
    });
  });

  // ---------- Вкладки прайса: бегунок переезжает к выбранной вкладке (переменные --tx/--ty/--tw/--th на списке) ----------
  (function(){
    var list = document.querySelector('#pricing [role="tablist"]');
    if(!list) return;
    function place(){
      var t = list.querySelector('[aria-selected="true"]');
      if(!t) return;
      list.style.setProperty('--tx', t.offsetLeft + 'px');
      list.style.setProperty('--ty', t.offsetTop + 'px');
      list.style.setProperty('--tw', t.offsetWidth + 'px');
      list.style.setProperty('--th', t.offsetHeight + 'px');
    }
    place();
    requestAnimationFrame(function(){ list.classList.add('has-ind'); });   // первое положение — без переезда с нуля
    if(document.fonts && document.fonts.ready) document.fonts.ready.then(place);
    if('MutationObserver' in window) new MutationObserver(place).observe(list, { attributes:true, subtree:true, attributeFilter:['aria-selected'] });
    window.addEventListener('resize', place);
  })();

  // ---------- Оценки «4,5», «4,9» досчитываются один раз, когда показались ----------
  (function(){
    var els = document.querySelectorAll('.proof-score b, .rv-score .num, .rv-total .num');
    if(!els.length || !('IntersectionObserver' in window)) return;
    function run(el){
      var to = +el.dataset.to, t0 = null;
      function frame(t){
        if(t0 === null) t0 = t;
        var p = Math.min((t - t0) / 1300, 1), e = 1 - Math.pow(1 - p, 3);
        el.textContent = (to * e).toFixed(1).replace('.', ',');
        if(p < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }
    var io = new IntersectionObserver(function(es){
      es.forEach(function(e){
        if(!e.isIntersecting) return;
        io.unobserve(e.target);
        if(on()) run(e.target);
      });
    }, { threshold:.5 });
    els.forEach(function(el){
      var v = parseFloat(el.textContent.replace(',', '.'));
      if(isNaN(v)) return;
      el.dataset.to = v;
      io.observe(el);
    });
  })();

  // ---------- Переход на другую страницу сайта: занавес поднимается, потом открывается новая страница ----------
  (function(){
    if(!loader) return;
    document.addEventListener('click', function(e){
      if(!on() || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest('a[href]');
      if(!a || a.target === '_blank' || a.hasAttribute('download')) return;
      var url;
      try { url = new URL(a.href, location.href); } catch(err){ return; }
      if((url.protocol !== 'http:' && url.protocol !== 'https:') || url.origin !== location.origin) return;
      if(!/\.html?$/i.test(url.pathname) || (url.pathname === location.pathname && url.hash)) return;
      e.preventDefault();
      loader.hidden = false;
      loader.classList.add('is-short', 'is-enter');
      setTimeout(function(){ location.href = url.href; }, 560);
    });
    // Вернулись кнопкой «назад» из кеша браузера — занавес не нужен
    window.addEventListener('pageshow', function(e){
      if(e.persisted){ loader.hidden = true; loader.classList.remove('is-enter', 'is-short'); }
    });
  })();

  // ---------- Выключатель в подвале и системная настройка: движение снимается на лету ----------
  function teardown(){
    smooth.stop();
    document.querySelectorAll('.scene, .hero-copy, .hero-side, .is-magnetic, [data-tilt]').forEach(function(el){ el.style.transform = ''; el.style.translate = ''; });
    document.querySelectorAll('[data-reveal]').forEach(function(el){ el.classList.add('is-in'); });
    var header = document.getElementById('siteHeader');
    if(header) header.classList.remove('is-hidden');
    document.querySelectorAll('[data-clone]').forEach(function(el){ el.remove(); });   // лента — обычным переносом, без дублей
    var track = document.getElementById('doctorsTrack');
    if(track) track.classList.remove('is-draggable', 'is-dragging');
    if(window.MenteyaLight){ window.MenteyaLight.tilt(0, 0, 0); window.MenteyaLight.pointer(0, 0, 0); }
    if(loader) loader.hidden = true;
    root.classList.add('is-ready');
    root.classList.remove('is-loading');
  }
  document.querySelectorAll('[data-motion-toggle]').forEach(function(b){
    b.addEventListener('click', function(){
      // menteya.js уже переключил no-motion — читаем итог
      setTimeout(function(){
        var off = root.classList.contains('no-motion');
        root.classList.toggle('has-motion', !off && !REDUCE.matches);
        if(off) teardown(); else root.classList.add('is-ready');
      }, 0);
    });
  });
  REDUCE.addEventListener('change', function(m){ if(m.matches){ root.classList.remove('has-motion'); teardown(); } });
})();
