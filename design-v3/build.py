"""Сборка третьего дизайна «Ментеи» («Стеклянное утро») из общих частей.

  python build.py            — собрать все страницы из src/pages в папку design-v3/
                               и стили assets/css в один сжатый файл menteya.min.css

Страница в src/pages — это содержимое <main> с мета-строками в начале:
  <!-- title: Заголовок вкладки -->
  <!-- description: Описание для поисковиков -->
  <!-- url: Главный адрес страницы (canonical) -->
Вставка общей части: <!-- @include booking.html --> (файл из src/partials).
В WordPress этим частям соответствуют части шаблона (header, footer) и паттерны блоков.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
CSS_DIR = ROOT / "assets" / "css"
INCLUDE = re.compile(r"<!-- @include ([\w.-]+) -->")
META = re.compile(r"<!-- (title|description|url): (.*?) -->\n")
DASH = re.compile(r"(?<=\S) — ")
SCRIPT = re.compile(r"(<script\b.*?</script>)", re.S)
# Стили по частям — в порядке подключения; в WordPress каждый файл — стили своего блока
CSS_FILES = ["core.css", "blocks/sections.css", "blocks/header.css", "blocks/hero.css",
             "blocks/proof.css", "blocks/services.css", "blocks/visit.css", "blocks/people.css",
             "blocks/pricing.css", "blocks/contact.css", "blocks/footer.css", "blocks/overlays.css", "blocks/motion.css"]
COMMENT = re.compile(r"/\*.*?\*/", re.S)
STRING = re.compile(r"""("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')""")


def minify_css(css):
    # Осторожное сжатие: убираем комментарии и лишние пробелы, строки (адреса, data:) не трогаем
    parts = STRING.split(COMMENT.sub("", css))
    for i in range(0, len(parts), 2):   # чётные части — вне кавычек
        p = re.sub(r"\s+", " ", parts[i])
        parts[i] = re.sub(r"\s*([{};])\s*", r"\1", p).replace(";}", "}")
    return "".join(parts).strip()


def bundle_css():
    # Один файл стилей вместо двенадцати — меньше запросов при загрузке страницы
    chunks = []
    for name in CSS_FILES:
        css = (CSS_DIR / name).read_text(encoding="utf-8")
        if name.startswith("blocks/"):
            css = css.replace("../../", "../")   # адреса картинок — относительно assets/css/
        chunks.append(css)
    out = minify_css("\n".join(chunks))
    (CSS_DIR / "menteya.min.css").write_text(out, encoding="utf-8")
    return round(len(out.encode("utf-8")) / 1024)


def typo(text):
    # Неразрывный пробел перед тире: тире не окажется в начале строки.
    # Скрипты (микроразметку JSON-LD) не трогаем — там &nbsp; попал бы в данные как есть
    return "".join(part if part.startswith("<script") else DASH.sub("&nbsp;— ", part)
                   for part in SCRIPT.split(text))


def expand(text, depth=0):
    if depth > 3:
        raise RuntimeError("слишком глубокие вставки")
    return INCLUDE.sub(lambda m: expand(typo((SRC / "partials" / m.group(1)).read_text(encoding="utf-8").rstrip("\n")), depth + 1), text)


def build_page(path):
    raw = path.read_text(encoding="utf-8")
    meta = dict(META.findall(raw))
    content = typo(META.sub("", raw).strip("\n"))
    layout = (SRC / "layout.html").read_text(encoding="utf-8")
    page = (layout.replace("{{title}}", meta["title"])
                  .replace("{{description}}", meta["description"])
                  .replace("{{url}}", meta["url"])
                  .replace("{{content}}", content))
    page = expand(page)
    # Метка версии у стилей и скриптов: после пересборки браузер не возьмёт старые файлы из кеша.
    # В WordPress то же делает wp_enqueue_style/script параметром версии
    for asset in ("assets/css/menteya.min.css", "assets/js/menteya.js", "assets/js/motion.js"):
        page = page.replace(asset + '"', asset + '?v=' + STAMP + '"')
    (ROOT / path.name).write_text(page, encoding="utf-8")
    return path.name


if __name__ == "__main__":
    css_kb = bundle_css()
    STAMP = str(max(int(f.stat().st_mtime) for f in [CSS_DIR / "menteya.min.css", *(ROOT / "assets" / "js").glob("*.js")]))
    built = [build_page(p) for p in sorted((SRC / "pages").glob("*.html"))]
    print("built:", ", ".join(built), "| css:", css_kb, "KB | v=" + STAMP)
