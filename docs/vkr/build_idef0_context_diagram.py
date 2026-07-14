from __future__ import annotations

from dataclasses import dataclass
from math import atan2, cos, pi, sin
from pathlib import Path
from textwrap import wrap

from PIL import Image, ImageDraw, ImageFont


OUT_DIR = Path(__file__).resolve().parent
PNG_PATH = OUT_DIR / "storydb_idef0_context.png"
MMD_PATH = OUT_DIR / "storydb_idef0_context.mmd"

WIDTH = 1500
HEIGHT = 900


@dataclass(frozen=True)
class Arrow:
    text: str
    start: tuple[int, int]
    end: tuple[int, int]
    label_pos: tuple[int, int]
    width: int = 260


INPUTS = [
    Arrow("Идея произведения", (90, 355), (545, 355), (140, 320)),
    Arrow("Сведения о персонажах, местах и событиях", (90, 455), (545, 455), (140, 420), 330),
]

CONTROLS = [
    Arrow("Требования автора", (700, 120), (700, 285), (555, 145), 240),
    Arrow("Структура художественного мира", (870, 120), (870, 285), (775, 145), 280),
]

MECHANISMS = [
    Arrow("Веб-интерфейс", (690, 770), (690, 595), (555, 790), 220),
    Arrow("API и база данных", (875, 770), (875, 595), (775, 790), 240),
]

OUTPUTS = [
    Arrow("База художественного проекта", (955, 365), (1390, 365), (1095, 330), 290),
    Arrow("Публикация или экспорт материалов", (955, 465), (1390, 465), (1095, 430), 320),
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
FONT_BLOCK = load_font(24, True)
FONT_BLOCK_SMALL = load_font(18, True)
FONT_LABEL = load_font(16, True)
FONT_TEXT = load_font(16)


def draw_arrowhead(draw: ImageDraw.ImageDraw, start: tuple[int, int], end: tuple[int, int], color: str) -> None:
    angle = atan2(end[1] - start[1], end[0] - start[0])
    size = 12
    p1 = (end[0] - size * cos(angle - pi / 6), end[1] - size * sin(angle - pi / 6))
    p2 = (end[0] - size * cos(angle + pi / 6), end[1] - size * sin(angle + pi / 6))
    draw.polygon([end, p1, p2], fill=color)


def draw_wrapped_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    xy: tuple[int, int],
    width_chars: int,
    font: ImageFont.ImageFont,
    fill: str = "#111827",
) -> None:
    x, y = xy
    for line in wrap(text, width=width_chars):
        draw.text((x, y), line, font=font, fill=fill)
        y += 20


def draw_labeled_arrow(draw: ImageDraw.ImageDraw, arrow: Arrow) -> None:
    color = "#4B5563"
    draw.line((*arrow.start, *arrow.end), fill=color, width=3)
    draw_arrowhead(draw, arrow.start, arrow.end, color)
    label_x, label_y = arrow.label_pos
    box_height = 54
    draw.rounded_rectangle(
        (label_x - 10, label_y - 8, label_x + arrow.width, label_y + box_height),
        radius=8,
        fill="#FFFFFF",
        outline="#E5E7EB",
    )
    draw_wrapped_text(draw, arrow.text, (label_x, label_y), max(18, arrow.width // 10), FONT_TEXT, "#374151")


def draw_section_label(draw: ImageDraw.ImageDraw, title: str, xy: tuple[int, int]) -> None:
    draw.text(xy, title, font=FONT_LABEL, fill="#111827")


def draw_png() -> None:
    img = Image.new("RGB", (WIDTH, HEIGHT), "#FFFFFF")
    draw = ImageDraw.Draw(img)

    block = (545, 285, 955, 595)
    draw.rounded_rectangle(block, radius=16, fill="#F8FAFC", outline="#111827", width=3)
    draw.text((575, 315), "A0", font=FONT_BLOCK_SMALL, fill="#4B5563")
    title_lines = ["Ведение", "художественного", "проекта"]
    y = 377
    for line in title_lines:
        bbox = draw.textbbox((0, 0), line, font=FONT_BLOCK)
        draw.text((750 - (bbox[2] - bbox[0]) / 2, y), line, font=FONT_BLOCK, fill="#111827")
        y += 34
    draw.text((695, 535), "StoryDB", font=FONT_BLOCK_SMALL, fill="#4B5563")

    draw_section_label(draw, "Входы", (115, 270))
    draw_section_label(draw, "Управление", (600, 105))
    draw_section_label(draw, "Механизмы", (590, 745))
    draw_section_label(draw, "Выходы", (1250, 270))

    for arrow in INPUTS + CONTROLS + MECHANISMS + OUTPUTS:
        draw_labeled_arrow(draw, arrow)

    img.save(PNG_PATH)


def write_mermaid() -> None:
    MMD_PATH.write_text(
        """flowchart LR
    Inputs["Идея произведения<br/>Сведения о персонажах, местах и событиях"]
    Controls["Требования автора<br/>Структура художественного мира"]
    Mechanisms["Веб-интерфейс<br/>API и база данных"]
    A0["A0<br/>Ведение художественного проекта"]
    Outputs["База художественного проекта<br/>Публикация или экспорт материалов"]

    Inputs --> A0
    Controls --> A0
    Mechanisms --> A0
    A0 --> Outputs
""",
        encoding="utf-8",
    )


if __name__ == "__main__":
    draw_png()
    write_mermaid()
    print(PNG_PATH)
    print(MMD_PATH)
