from __future__ import annotations

from dataclasses import dataclass
from math import atan2, cos, pi, sin
from pathlib import Path
from textwrap import wrap

from PIL import Image, ImageDraw, ImageFont


OUT_DIR = Path(__file__).resolve().parent
PNG_PATH = OUT_DIR / "storydb_idef0_decomposition.png"
MMD_PATH = OUT_DIR / "storydb_idef0_decomposition.mmd"

WIDTH = 1500
HEIGHT = 920


@dataclass(frozen=True)
class Block:
    code: str
    title: str
    x: int
    y: int
    w: int = 260
    h: int = 120
    fill: str = "#F8FAFC"


@dataclass(frozen=True)
class Arrow:
    start: tuple[int, int]
    end: tuple[int, int]
    label: str = ""
    label_pos: tuple[int, int] | None = None


BLOCKS = [
    Block("A1", "Создание и настройка проекта", 400, 185, 330, 100, "#FFF8D6"),
    Block("A2", "Наполнение базы произведения", 570, 325, 330, 100, "#EAF4FF"),
    Block("A3", "Организация связей и событий", 740, 465, 330, 100, "#F0E8FF"),
    Block("A4", "Публикация и экспорт материалов", 910, 605, 330, 100, "#F6F8FA"),
]

ARROWS = [
    Arrow((45, 235), (400, 235), "Идея произведения", (70, 195)),
    Arrow((45, 375), (570, 375), "Сведения о персонажах, местах и событиях", (70, 335)),
    Arrow((565, 285), (735, 325)),
    Arrow((735, 425), (905, 465)),
    Arrow((905, 565), (1075, 605)),
    Arrow((1070, 515), (1445, 515), "База художественного проекта", (1130, 475)),
    Arrow((1240, 655), (1445, 655), "Публикация или экспорт материалов", (1255, 615)),
]

CONTROL_ARROWS = [
    Arrow((565, 155), (565, 185), "Требования автора", (505, 140)),
    Arrow((735, 155), (735, 325), "Структура произведения", (745, 170)),
]

MECHANISM_ARROWS = [
    Arrow((735, 790), (735, 425), "Веб-интерфейс", (615, 805)),
    Arrow((1075, 790), (1075, 705), "API и БД", (995, 805)),
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
FONT_CODE = load_font(18, True)
FONT_BLOCK = load_font(18, True)
FONT_LABEL = load_font(15)
FONT_SECTION = load_font(16, True)


def draw_arrowhead(draw: ImageDraw.ImageDraw, start: tuple[int, int], end: tuple[int, int], color: str) -> None:
    angle = atan2(end[1] - start[1], end[0] - start[0])
    size = 11
    p1 = (end[0] - size * cos(angle - pi / 6), end[1] - size * sin(angle - pi / 6))
    p2 = (end[0] - size * cos(angle + pi / 6), end[1] - size * sin(angle + pi / 6))
    draw.polygon([end, p1, p2], fill=color)


def draw_label(draw: ImageDraw.ImageDraw, text: str, pos: tuple[int, int], width: int = 190) -> None:
    if not text:
        return
    x, y = pos
    lines = wrap(text, width=max(14, width // 10))
    h = len(lines) * 19 + 12
    draw.rounded_rectangle((x - 8, y - 6, x + width, y + h), radius=7, fill="#FFFFFF", outline="#E5E7EB")
    for line in lines:
        draw.text((x, y), line, font=FONT_LABEL, fill="#374151")
        y += 19


def draw_arrow(draw: ImageDraw.ImageDraw, arrow: Arrow) -> None:
    color = "#4B5563"
    draw.line((*arrow.start, *arrow.end), fill=color, width=3)
    draw_arrowhead(draw, arrow.start, arrow.end, color)
    if arrow.label and arrow.label_pos:
        draw_label(draw, arrow.label, arrow.label_pos)


def draw_block(draw: ImageDraw.ImageDraw, block: Block) -> None:
    draw.rounded_rectangle(
        (block.x, block.y, block.x + block.w, block.y + block.h),
        radius=14,
        fill=block.fill,
        outline="#111827",
        width=2,
    )
    draw.text((block.x + 16, block.y + 14), block.code, font=FONT_CODE, fill="#4B5563")
    lines = wrap(block.title, width=24)
    total_h = len(lines) * 24
    y = block.y + block.h / 2 - total_h / 2 + 8
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=FONT_BLOCK)
        draw.text((block.x + block.w / 2 - (bbox[2] - bbox[0]) / 2, y), line, font=FONT_BLOCK, fill="#111827")
        y += 24


def draw_png() -> None:
    img = Image.new("RGB", (WIDTH, HEIGHT), "#FFFFFF")
    draw = ImageDraw.Draw(img)

    draw.rounded_rectangle((35, 125, 1465, 855), radius=22, fill="#FFFFFF", outline="#CBD5E1", width=2)
    draw.text((70, 145), "A0. Ведение художественного проекта", fill="#111827", font=FONT_SECTION)
    draw.text((615, 760), "Механизмы", fill="#111827", font=FONT_SECTION)
    draw.text((55, 300), "Входы", fill="#111827", font=FONT_SECTION)
    draw.text((1305, 440), "Выходы", fill="#111827", font=FONT_SECTION)

    for arrow in CONTROL_ARROWS + MECHANISM_ARROWS + ARROWS:
        draw_arrow(draw, arrow)

    for block in BLOCKS:
        draw_block(draw, block)

    img.save(PNG_PATH)


def write_mermaid() -> None:
    MMD_PATH.write_text(
        """flowchart LR
    Input["Данные автора"]
    A1["A1<br/>Создание и настройка проекта"]
    A2["A2<br/>Наполнение базы произведения"]
    A3["A3<br/>Организация связей и событий"]
    A4["A4<br/>Публикация и экспорт материалов"]
    Output1["База художественного проекта"]
    Output2["Публикация или экспорт материалов"]

    Input --> A1 --> A2 --> A3 --> A4 --> Output2
    A3 --> Output1
""",
        encoding="utf-8",
    )


if __name__ == "__main__":
    draw_png()
    write_mermaid()
    print(PNG_PATH)
    print(MMD_PATH)
