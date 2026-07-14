from __future__ import annotations

from dataclasses import dataclass
from math import cos, pi, sin
from pathlib import Path
from textwrap import wrap

from PIL import Image, ImageDraw, ImageFont


OUT_DIR = Path(__file__).resolve().parent
PNG_PATH = OUT_DIR / "storydb_use_case_diagram.png"
MMD_PATH = OUT_DIR / "storydb_use_case_diagram.mmd"

WIDTH = 1600
HEIGHT = 1080


@dataclass(frozen=True)
class Actor:
    key: str
    title: str
    x: int
    y: int
    color: str = "#111827"


@dataclass(frozen=True)
class UseCase:
    key: str
    title: str
    x: int
    y: int
    w: int = 300
    h: int = 74
    fill: str = "#FFFFFF"


@dataclass(frozen=True)
class Link:
    source: str
    target: str
    dashed: bool = False
    label: str = ""


ACTORS = [
    Actor("Guest", "Гость / читатель", 175, 215),
    Actor("Author", "Автор", 175, 610),
    Actor("Admin", "Администратор", 1430, 560),
]

USE_CASES = [
    UseCase("Auth", "Регистрация и вход", 520, 185, fill="#F6F8FA"),
    UseCase("PublicView", "Просмотр публичного проекта", 900, 185, fill="#F6F8FA"),
    UseCase("Project", "Создание и настройка проекта", 520, 320, fill="#FFF8D6"),
    UseCase("Templates", "Использование шаблонов проекта", 900, 320, fill="#FFF8D6"),
    UseCase("Objects", "Управление объектами мира", 520, 455, fill="#EAF4FF"),
    UseCase("Attributes", "Настройка типов и атрибутов", 900, 455, fill="#EAF4FF"),
    UseCase("Catalogs", "Работа с каталогами и справочниками", 520, 590, fill="#EBFFE8"),
    UseCase("Relations", "Построение связей и структур", 900, 590, fill="#FFF4D8"),
    UseCase("Timeline", "Ведение таймлайна событий", 520, 725, fill="#F0E8FF"),
    UseCase("Media", "Загрузка изображений и галерей", 900, 725, fill="#FFEAF0"),
    UseCase("Publish", "Публикация снимка проекта", 520, 860, fill="#F6F8FA"),
    UseCase("Export", "Экспорт досье в DOCX", 900, 860, fill="#F6F8FA"),
    UseCase("Audit", "Просмотр аудита и состояния системы", 1175, 490, 285, 82, "#F6F8FA"),
    UseCase("Storage", "Контроль проектов и хранилища", 1175, 635, 285, 82, "#F6F8FA"),
]

LINKS = [
    Link("Guest", "Auth"),
    Link("Guest", "PublicView"),
    Link("Author", "Auth"),
    Link("Author", "Project"),
    Link("Author", "Templates"),
    Link("Author", "Objects"),
    Link("Author", "Attributes"),
    Link("Author", "Catalogs"),
    Link("Author", "Relations"),
    Link("Author", "Timeline"),
    Link("Author", "Media"),
    Link("Author", "Publish"),
    Link("Author", "Export"),
    Link("Admin", "Audit"),
    Link("Admin", "Storage"),
    Link("Project", "Templates", True, "<<include>>"),
    Link("Objects", "Attributes", True, "<<include>>"),
    Link("Objects", "Catalogs", True, "<<extend>>"),
    Link("Publish", "PublicView", True, "<<include>>"),
]


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        Path("C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"),
        Path("C:/Windows/Fonts/calibrib.ttf" if bold else "C:/Windows/Fonts/calibri.ttf"),
        Path("C:/Windows/Fonts/timesbd.ttf" if bold else "C:/Windows/Fonts/times.ttf"),
    ]
    for path in candidates:
        if path.exists():
            return ImageFont.truetype(str(path), size=size)
    return ImageFont.load_default()


FONT_TITLE = load_font(31, True)
FONT_SUBTITLE = load_font(18)
FONT_GROUP = load_font(22, True)
FONT_ACTOR = load_font(18, True)
FONT_UC = load_font(17, True)
FONT_LINK = load_font(12)


def actor_anchor(actor: Actor) -> tuple[int, int]:
    return actor.x, actor.y + 78


def ellipse_center(case: UseCase) -> tuple[int, int]:
    return case.x + case.w // 2, case.y + case.h // 2


def ellipse_border_point(case: UseCase, target: tuple[int, int]) -> tuple[int, int]:
    cx, cy = ellipse_center(case)
    tx, ty = target
    dx = tx - cx
    dy = ty - cy
    if dx == 0 and dy == 0:
        return cx, cy
    rx = case.w / 2
    ry = case.h / 2
    scale = 1 / ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry)) ** 0.5
    return int(cx + dx * scale), int(cy + dy * scale)


def draw_dashed_line(draw: ImageDraw.ImageDraw, start: tuple[int, int], end: tuple[int, int], fill: str) -> None:
    x1, y1 = start
    x2, y2 = end
    total = ((x2 - x1) ** 2 + (y2 - y1) ** 2) ** 0.5
    if total == 0:
        return
    dash = 12
    gap = 8
    step = dash + gap
    current = 0
    while current < total:
        end_dash = min(current + dash, total)
        sx = x1 + (x2 - x1) * current / total
        sy = y1 + (y2 - y1) * current / total
        ex = x1 + (x2 - x1) * end_dash / total
        ey = y1 + (y2 - y1) * end_dash / total
        draw.line((sx, sy, ex, ey), fill=fill, width=2)
        current += step


def draw_actor(draw: ImageDraw.ImageDraw, actor: Actor) -> None:
    x, y = actor.x, actor.y
    color = actor.color
    draw.ellipse((x - 22, y, x + 22, y + 44), outline=color, width=3, fill="#FFFFFF")
    draw.line((x, y + 44, x, y + 116), fill=color, width=3)
    draw.line((x - 48, y + 67, x + 48, y + 67), fill=color, width=3)
    draw.line((x, y + 116, x - 42, y + 164), fill=color, width=3)
    draw.line((x, y + 116, x + 42, y + 164), fill=color, width=3)
    lines = wrap(actor.title, width=16)
    text_y = y + 178
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=FONT_ACTOR)
        draw.text((x - (bbox[2] - bbox[0]) / 2, text_y), line, fill=color, font=FONT_ACTOR)
        text_y += 22


def draw_use_case(draw: ImageDraw.ImageDraw, case: UseCase) -> None:
    box = (case.x, case.y, case.x + case.w, case.y + case.h)
    draw.ellipse(box, fill=case.fill, outline="#111827", width=2)
    lines = wrap(case.title, width=max(16, case.w // 12))
    total_h = len(lines) * 20
    y = case.y + case.h / 2 - total_h / 2
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=FONT_UC)
        draw.text((case.x + case.w / 2 - (bbox[2] - bbox[0]) / 2, y), line, fill="#111827", font=FONT_UC)
        y += 20


def draw_arrowhead(draw: ImageDraw.ImageDraw, end: tuple[int, int], start: tuple[int, int], color: str) -> None:
    angle = __import__("math").atan2(end[1] - start[1], end[0] - start[0])
    size = 10
    p1 = (end[0] - size * cos(angle - pi / 6), end[1] - size * sin(angle - pi / 6))
    p2 = (end[0] - size * cos(angle + pi / 6), end[1] - size * sin(angle + pi / 6))
    draw.polygon([end, p1, p2], fill=color)


def draw_link(draw: ImageDraw.ImageDraw, link: Link, actors: dict[str, Actor], cases: dict[str, UseCase]) -> None:
    color = "#7C3AED" if link.dashed else "#4B5563"
    if link.source in actors:
        start = actor_anchor(actors[link.source])
    else:
        source_case = cases[link.source]
        target_center = ellipse_center(cases[link.target])
        start = ellipse_border_point(source_case, target_center)

    if link.target in cases:
        target_case = cases[link.target]
        end = ellipse_border_point(target_case, start)
    else:
        end = actor_anchor(actors[link.target])

    if link.dashed:
        draw_dashed_line(draw, start, end, color)
        draw_arrowhead(draw, end, start, color)
    else:
        draw.line((*start, *end), fill=color, width=2)

    if link.label:
        mx = (start[0] + end[0]) // 2
        my = (start[1] + end[1]) // 2
        bbox = draw.textbbox((mx, my), link.label, font=FONT_LINK)
        pad = 4
        draw.rounded_rectangle(
            (bbox[0] - pad, bbox[1] - pad, bbox[2] + pad, bbox[3] + pad),
            radius=5,
            fill="#FFFFFF",
            outline="#E5E7EB",
        )
        draw.text((mx, my), link.label, fill=color, font=FONT_LINK)


def draw_png() -> None:
    img = Image.new("RGB", (WIDTH, HEIGHT), "#FFFFFF")
    draw = ImageDraw.Draw(img)

    boundary = (390, 130, 1510, 980)
    draw.rounded_rectangle(boundary, radius=24, fill="#F8FAFC", outline="#CBD5E1", width=2)
    draw.text((420, 154), "Веб-приложение StoryDB", fill="#111827", font=FONT_GROUP)

    actor_map = {actor.key: actor for actor in ACTORS}
    case_map = {case.key: case for case in USE_CASES}
    for link in LINKS:
        draw_link(draw, link, actor_map, case_map)

    for case in USE_CASES:
        draw_use_case(draw, case)

    for actor in ACTORS:
        draw_actor(draw, actor)

    img.save(PNG_PATH)


def write_mermaid() -> None:
    MMD_PATH.write_text(
        """flowchart LR
    Guest["Гость / читатель"]
    Author["Автор"]
    Admin["Администратор"]

    subgraph System["Веб-приложение StoryDB"]
        Auth(("Регистрация и вход"))
        PublicView(("Просмотр публичного проекта"))
        Project(("Создание и настройка проекта"))
        Templates(("Использование шаблонов проекта"))
        Objects(("Управление объектами мира"))
        Attributes(("Настройка типов и атрибутов"))
        Catalogs(("Работа с каталогами и справочниками"))
        Relations(("Построение связей и структур"))
        Timeline(("Ведение таймлайна событий"))
        Media(("Загрузка изображений и галерей"))
        Publish(("Публикация снимка проекта"))
        Export(("Экспорт досье в DOCX"))
        Audit(("Просмотр аудита и состояния системы"))
        Storage(("Контроль проектов и хранилища"))
    end

    Guest --- Auth
    Guest --- PublicView
    Author --- Auth
    Author --- Project
    Author --- Templates
    Author --- Objects
    Author --- Attributes
    Author --- Catalogs
    Author --- Relations
    Author --- Timeline
    Author --- Media
    Author --- Publish
    Author --- Export
    Admin --- Audit
    Admin --- Storage
    Project -. "<<include>>" .-> Templates
    Objects -. "<<include>>" .-> Attributes
    Objects -. "<<extend>>" .-> Catalogs
    Publish -. "<<include>>" .-> PublicView
""",
        encoding="utf-8",
    )


if __name__ == "__main__":
    draw_png()
    write_mermaid()
    print(PNG_PATH)
    print(MMD_PATH)
