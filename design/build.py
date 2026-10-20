"""Сборка страниц прототипа «Ментеи» из общих частей.

  python build.py            — собрать все страницы из src/pages в папку design/

Страница в src/pages — это содержимое <main> с мета-строками в начале:
  <!-- title: Заголовок вкладки -->
  <!-- description: Описание для поисковиков -->
Вставка общей части: <!-- @include booking.html --> (файл из src/partials).
В WordPress этим частям соответствуют части шаблона (header, footer) и паттерны блоков.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
INCLUDE = re.compile(r"<!-- @include ([\w.-]+) -->")
META = re.compile(r"<!-- (title|description): (.*?) -->\n")
DASH = re.compile(r"(?<=\S) — ")
SCRIPT = re.compile(r"(<script\b.*?</script>)", re.S)


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
                  .replace("{{content}}", content))
    page = expand(page)
    (ROOT / path.name).write_text(page, encoding="utf-8")
    return path.name


if __name__ == "__main__":
    built = [build_page(p) for p in sorted((SRC / "pages").glob("*.html"))]
    print("собрано:", ", ".join(built))
