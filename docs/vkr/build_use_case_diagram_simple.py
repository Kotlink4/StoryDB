from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from textwrap import wrap

from PIL import Image, ImageDraw, ImageFont


OUT_DIR = Path(__file__).resolve().parent
PNG_PATH = OUT_DIR / "storydb_use_case_diagram_simple.png"
MMD_PATH = OUT_DIR / "storydb_use_case_diagram_simple.mmd"

WIDTH = 1450
HEIGHT = 840


@dataclass(frozen=True)
class Actor:
    key: str
    title: str
    x: int
    y: int


@dataclass(frozen=True)
class UseCase:
    key: str
    title: str
    x: int
    y: int
    w: int = 330
    h: int = 82
    fill: str = "#FFFFFF"


@dataclass(frozen=True)
class Link:
    source: str
    target: str


ACTORS = [
    Actor("Reader", "Читатель", 165, 340),
    Actor("Author", "Автор", 165, 560),
    Actor("Admin", "Администратор", 1290, 560),
]

USE_CASES = [
    UseCase("Auth", "Регистрация и вход", 470, 175, fill="#F6F8FA"),
    UseCase("Projects", "Управление проектами", 820, 175, fill="#FFF8D6"),
    UseCase("WorldBase", "Наполнение базы произведения", 470, 330, fill="#EAF4FF"),
    UseCase("Publish", "Публикация проекта", 820, 330, fill="#F6F8FA"),
    UseCase("PublicView", "Просмотр опубликованного проекта", 470, 485, fill="#F6F8FA"),
    UseCase("Export", "Экспорт материалов", 820, 485, fill="#F6F8FA"),
    UseCase("AdminPanel", "Администрирование системы", 645, 640, fill="#F6F8FA"),
]

LINKS = [
    Link("Reader", "PublicView"),
    Link("Author", "Auth"),
    Link("Author", "Projects"),
    Link("Author", "WorldBase"),
    Link("Author", "Publish"),
    Link("Author", "Export"),
    Link("Admin", "AdminPanel"),
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


FONT_TITLE = load_font(30, True)
FONT_SUBTITLE = load_font(18)
FONT_SYSTEM = load_font(22, True)
FONT_ACTOR = load_font(18, True)
FONT_CASE = load_font(18, True)


def actor_anchor(actor: Actor) -> tuple[int, int]:
    return actor.x, actor.y + 78


def case_center(case: UseCase) -> tuple[int, int]:
    return case.x + case.w // 2, case.y + case.h // 2


def ellipse_border(case: UseCase, target: tuple[int, int]) -> tuple[int, int]:
    cx, cy = case_center(case)
    dx = target[0] - cx
    dy = target[1] - cy
    if dx == 0 and dy == 0:
        return cx, cy
    rx = case.w / 2
    ry = case.h / 2
    scale = 1 / ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry)) ** 0.5
    return int(cx + dx * scale), int(cy + dy * scale)


def draw_actor(draw: ImageDraw.ImageDraw, actor: Actor) -> None:
    x, y = actor.x, actor.y
    color = "#111827"
    draw.ellipse((x - 22, y, x + 22, y + 44), outline=color, width=3, fill="#FFFFFF")
    draw.line((x, y + 44, x, y + 116), fill=color, width=3)
    draw.line((x - 48, y + 67, x + 48, y + 67), fill=color, width=3)
    draw.line((x, y + 116, x - 42, y + 164), fill=color, width=3)
    draw.line((x, y + 116, x + 42, y + 164), fill=color, width=3)

    lines = wrap(actor.title, width=14)
    text_y = y + 178
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=FONT_ACTOR)
        draw.text((x - (bbox[2] - bbox[0]) / 2, text_y), line, fill=color, font=FONT_ACTOR)
        text_y += 22


def draw_use_case(draw: ImageDraw.ImageDraw, use_case: UseCase) -> None:
    box = (use_case.x, use_case.y, use_case.x + use_case.w, use_case.y + use_case.h)
    draw.ellipse(box, fill=use_case.fill, outline="#111827", width=2)

    lines = wrap(use_case.title, width=28)
    total_h = len(lines) * 21
    y = use_case.y + use_case.h / 2 - total_h / 2
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=FONT_CASE)
        draw.text((use_case.x + use_case.w / 2 - (bbox[2] - bbox[0]) / 2, y), line, fill="#111827", font=FONT_CASE)
        y += 21


def draw_link(draw: ImageDraw.ImageDraw, link: Link, actors: dict[str, Actor], cases: dict[str, UseCase]) -> None:
    start = actor_anchor(actors[link.source])
    end = ellipse_border(cases[link.target], start)
    draw.line((*start, *end), fill="#4B5563", width=2)


def draw_png() -> None:
    img = Image.new("RGB", (WIDTH, HEIGHT), "#FFFFFF")
    draw = ImageDraw.Draw(img)

    boundary = (370, 120, 1215, 780)
    draw.rounded_rectangle(boundary, radius=24, fill="#F8FAFC", outline="#CBD5E1", width=2)
    draw.text((400, 148), "Веб-приложение StoryDB", fill="#111827", font=FONT_SYSTEM)

    actor_map = {actor.key: actor for actor in ACTORS}
    case_map = {use_case.key: use_case for use_case in USE_CASES}

    for link in LINKS:
        draw_link(draw, link, actor_map, case_map)
    for use_case in USE_CASES:
        draw_use_case(draw, use_case)
    for actor in ACTORS:
        draw_actor(draw, actor)

    img.save(PNG_PATH)


def write_mermaid() -> None:
    MMD_PATH.write_text(
        """flowchart LR
    Reader["Читатель"]
    Author["Автор"]
    Admin["Администратор"]

    subgraph System["Веб-приложение StoryDB"]
        Auth(("Регистрация и вход"))
        Projects(("Управление проектами"))
        WorldBase(("Наполнение базы произведения"))
        Publish(("Публикация проекта"))
        PublicView(("Просмотр опубликованного проекта"))
        Export(("Экспорт материалов"))
        AdminPanel(("Администрирование системы"))
    end

    Reader --- PublicView
    Author --- Auth
    Author --- Projects
    Author --- WorldBase
    Author --- Publish
    Author --- Export
    Admin --- AdminPanel
""",
        encoding="utf-8",
    )


if __name__ == "__main__":
    draw_png()
    write_mermaid()
    print(PNG_PATH)
    print(MMD_PATH)
