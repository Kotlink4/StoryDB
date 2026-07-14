from __future__ import annotations

from dataclasses import dataclass
from math import atan2, cos, pi, sin
from pathlib import Path
from textwrap import wrap

from PIL import Image, ImageDraw, ImageFont


OUT_DIR = Path(__file__).resolve().parent
PNG_PATH = OUT_DIR / "storydb_architecture.png"
MMD_PATH = OUT_DIR / "storydb_architecture.mmd"

WIDTH = 1500
HEIGHT = 900


@dataclass(frozen=True)
class Box:
    key: str
    title: str
    subtitle: str
    x: int
    y: int
    w: int
    h: int
    fill: str


@dataclass(frozen=True)
class Arrow:
    source: str
    target: str
    label: str = ""


BOXES = [
    Box("User", "Пользователь", "Автор или читатель", 70, 360, 250, 120, "#F6F8FA"),
    Box("Client", "React-клиент", "Интерфейс в браузере", 425, 320, 300, 200, "#EAF4FF"),
    Box("Api", "ASP.NET Core API", "Бизнес-логика и REST-запросы", 825, 285, 330, 270, "#FFF8D6"),
    Box("Db", "PostgreSQL", "Основные данные проекта", 1225, 245, 240, 130, "#EBFFE8"),
    Box("Storage", "Хранилище файлов", "Изображения и варианты", 1225, 495, 240, 130, "#FFEAF0"),
]

ARROWS = [
    Arrow("User", "Client", "работа в браузере"),
    Arrow("Client", "Api", "HTTP/JSON"),
    Arrow("Api", "Db", "EF Core"),
    Arrow("Api", "Storage", "загрузка файлов"),
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
FONT_BOX_TITLE = load_font(21, True)
FONT_BOX_TEXT = load_font(16)
FONT_LABEL = load_font(13)
FONT_SECTION = load_font(17, True)


def center(box: Box) -> tuple[int, int]:
    return box.x + box.w // 2, box.y + box.h // 2


def border_point(source: Box, target: Box) -> tuple[int, int]:
    sx, sy = center(source)
    tx, ty = center(target)
    dx = tx - sx
    dy = ty - sy
    if dx == 0 and dy == 0:
        return sx, sy
    scale_x = source.w / 2 / abs(dx) if dx else float("inf")
    scale_y = source.h / 2 / abs(dy) if dy else float("inf")
    scale = min(scale_x, scale_y) * 0.96
    return int(sx + dx * scale), int(sy + dy * scale)


def draw_arrowhead(draw: ImageDraw.ImageDraw, start: tuple[int, int], end: tuple[int, int], color: str) -> None:
    angle = atan2(end[1] - start[1], end[0] - start[0])
    size = 12
    p1 = (end[0] - size * cos(angle - pi / 6), end[1] - size * sin(angle - pi / 6))
    p2 = (end[0] - size * cos(angle + pi / 6), end[1] - size * sin(angle + pi / 6))
    draw.polygon([end, p1, p2], fill=color)


def draw_box(draw: ImageDraw.ImageDraw, box: Box) -> None:
    draw.rounded_rectangle(
        (box.x, box.y, box.x + box.w, box.y + box.h),
        radius=14,
        fill=box.fill,
        outline="#111827",
        width=2,
    )
    title_bbox = draw.textbbox((0, 0), box.title, font=FONT_BOX_TITLE)
    draw.text((box.x + box.w / 2 - (title_bbox[2] - title_bbox[0]) / 2, box.y + 26), box.title, font=FONT_BOX_TITLE, fill="#111827")
    lines = wrap(box.subtitle, width=max(18, box.w // 11))
    y = box.y + 68
    for line in lines:
        line_bbox = draw.textbbox((0, 0), line, font=FONT_BOX_TEXT)
        draw.text((box.x + box.w / 2 - (line_bbox[2] - line_bbox[0]) / 2, y), line, font=FONT_BOX_TEXT, fill="#374151")
        y += 21


def draw_arrow(draw: ImageDraw.ImageDraw, arrow: Arrow, boxes: dict[str, Box]) -> None:
    source = boxes[arrow.source]
    target = boxes[arrow.target]
    start = border_point(source, target)
    end = border_point(target, source)
    color = "#4B5563"
    draw.line((*start, *end), fill=color, width=3)
    draw_arrowhead(draw, start, end, color)

    if arrow.label:
        mx = (start[0] + end[0]) // 2 - 20
        my = (start[1] + end[1]) // 2 - 20
        bbox = draw.textbbox((mx, my), arrow.label, font=FONT_LABEL)
        pad = 6
        draw.rounded_rectangle(
            (bbox[0] - pad, bbox[1] - pad, bbox[2] + pad, bbox[3] + pad),
            radius=7,
            fill="#FFFFFF",
            outline="#E5E7EB",
        )
        draw.text((mx, my), arrow.label, font=FONT_LABEL, fill="#374151")


def draw_api_modules(draw: ImageDraw.ImageDraw) -> None:
    modules = [
        ("Авторизация", 855, 380),
        ("Проекты и объекты", 855, 425),
        ("Таймлайн и связи", 1005, 425),
        ("Экспорт DOCX", 1005, 380),
    ]
    for title, x, y in modules:
        draw.rounded_rectangle((x, y, x + 130, y + 32), radius=8, fill="#FFFFFF", outline="#E5E7EB")
        bbox = draw.textbbox((0, 0), title, font=FONT_LABEL)
        draw.text((x + 65 - (bbox[2] - bbox[0]) / 2, y + 8), title, font=FONT_LABEL, fill="#374151")


def draw_png() -> None:
    img = Image.new("RGB", (WIDTH, HEIGHT), "#FFFFFF")
    draw = ImageDraw.Draw(img)

    draw.rounded_rectangle((390, 160, 760, 650), radius=22, fill="#F8FAFC", outline="#CBD5E1", width=2)
    draw.text((420, 185), "Клиентская часть", font=FONT_SECTION, fill="#111827")
    draw.rounded_rectangle((790, 160, 1185, 650), radius=22, fill="#FFFBEB", outline="#CBD5E1", width=2)
    draw.text((820, 185), "Серверная часть", font=FONT_SECTION, fill="#111827")
    draw.rounded_rectangle((1200, 160, 1480, 650), radius=22, fill="#F8FAFC", outline="#CBD5E1", width=2)
    draw.text((1230, 185), "Данные", font=FONT_SECTION, fill="#111827")

    box_map = {box.key: box for box in BOXES}
    for arrow in ARROWS:
        draw_arrow(draw, arrow, box_map)
    for box in BOXES:
        draw_box(draw, box)
    draw_api_modules(draw)

    img.save(PNG_PATH)


def write_mermaid() -> None:
    MMD_PATH.write_text(
        """flowchart LR
    User["Пользователь"]
    Client["React-клиент<br/>интерфейс в браузере"]
    Api["ASP.NET Core API<br/>бизнес-логика и REST-запросы"]
    Db["PostgreSQL<br/>основные данные проекта"]
    Storage["Хранилище файлов<br/>изображения и варианты"]

    User -->|работа в браузере| Client
    Client -->|HTTP/JSON| Api
    Api -->|EF Core| Db
    Api -->|загрузка файлов| Storage
""",
        encoding="utf-8",
    )


if __name__ == "__main__":
    draw_png()
    write_mermaid()
    print(PNG_PATH)
    print(MMD_PATH)
