from __future__ import annotations

from dataclasses import dataclass
from math import atan2, cos, pi, sin
from pathlib import Path
from textwrap import wrap

from PIL import Image, ImageDraw, ImageFont


OUT_DIR = Path(__file__).resolve().parent
PNG_PATH = OUT_DIR / "storydb_auth_flow.png"
MMD_PATH = OUT_DIR / "storydb_auth_flow.mmd"

WIDTH = 1200
HEIGHT = 900


@dataclass(frozen=True)
class Node:
    key: str
    title: str
    x: int
    y: int
    w: int
    h: int
    kind: str = "rect"
    fill: str = "#FFFFFF"


@dataclass(frozen=True)
class Edge:
    source: str
    target: str
    start: str = "bottom"
    end: str = "top"
    label: str = ""


NODES = [
    Node("Start", "Открытие приложения", 450, 125, 300, 70, "round", "#F6F8FA"),
    Node("Input", "Ввод email и пароля", 450, 245, 300, 80, "rect", "#EAF4FF"),
    Node("Request", "Отправка данных на сервер", 450, 375, 300, 80, "rect", "#EAF4FF"),
    Node("Check", "Проверка пользователя", 450, 505, 300, 80, "rect", "#FFF8D6"),
    Node("Decision", "Данные верны?", 475, 635, 250, 120, "diamond", "#FFFFFF"),
    Node("Success", "Вход в систему", 140, 660, 270, 80, "round", "#EBFFE8"),
    Node("Error", "Сообщение об ошибке", 790, 660, 270, 80, "round", "#FFEAF0"),
    Node("Workspace", "Переход к проектам", 140, 790, 270, 70, "round", "#F6F8FA"),
    Node("Retry", "Повторный ввод данных", 790, 790, 270, 70, "round", "#F6F8FA"),
]

EDGES = [
    Edge("Start", "Input"),
    Edge("Input", "Request"),
    Edge("Request", "Check"),
    Edge("Check", "Decision"),
    Edge("Decision", "Success", "left", "right"),
    Edge("Decision", "Error", "right", "left"),
    Edge("Success", "Workspace"),
    Edge("Error", "Retry"),
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
FONT_NODE = load_font(18, True)
FONT_EDGE = load_font(14, True)


def point(node: Node, side: str) -> tuple[int, int]:
    if side == "top":
        return node.x + node.w // 2, node.y
    if side == "bottom":
        return node.x + node.w // 2, node.y + node.h
    if side == "left":
        return node.x, node.y + node.h // 2
    if side == "right":
        return node.x + node.w, node.y + node.h // 2
    return node.x + node.w // 2, node.y + node.h // 2


def draw_arrowhead(draw: ImageDraw.ImageDraw, start: tuple[int, int], end: tuple[int, int], color: str) -> None:
    angle = atan2(end[1] - start[1], end[0] - start[0])
    size = 11
    p1 = (end[0] - size * cos(angle - pi / 6), end[1] - size * sin(angle - pi / 6))
    p2 = (end[0] - size * cos(angle + pi / 6), end[1] - size * sin(angle + pi / 6))
    draw.polygon([end, p1, p2], fill=color)


def draw_edge(draw: ImageDraw.ImageDraw, edge: Edge, nodes: dict[str, Node]) -> None:
    start = point(nodes[edge.source], edge.start)
    end = point(nodes[edge.target], edge.end)
    color = "#4B5563"
    draw.line((*start, *end), fill=color, width=3)
    draw_arrowhead(draw, start, end, color)

    if edge.label:
        x = (start[0] + end[0]) // 2
        y = (start[1] + end[1]) // 2 - 24
        bbox = draw.textbbox((0, 0), edge.label, font=FONT_EDGE)
        draw.text((x - (bbox[2] - bbox[0]) / 2, y), edge.label, font=FONT_EDGE, fill="#374151")


def draw_centered_text(draw: ImageDraw.ImageDraw, text: str, box: tuple[int, int, int, int]) -> None:
    x1, y1, x2, y2 = box
    width = x2 - x1
    lines = wrap(text, width=max(12, width // 11))
    total_h = len(lines) * 22
    y = y1 + (y2 - y1) / 2 - total_h / 2
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=FONT_NODE)
        draw.text((x1 + width / 2 - (bbox[2] - bbox[0]) / 2, y), line, font=FONT_NODE, fill="#111827")
        y += 22


def draw_node(draw: ImageDraw.ImageDraw, node: Node) -> None:
    box = (node.x, node.y, node.x + node.w, node.y + node.h)
    if node.kind == "diamond":
        cx = node.x + node.w // 2
        cy = node.y + node.h // 2
        points = [(cx, node.y), (node.x + node.w, cy), (cx, node.y + node.h), (node.x, cy)]
        draw.polygon(points, fill=node.fill, outline="#111827")
        draw.line(points + [points[0]], fill="#111827", width=2)
    elif node.kind == "round":
        draw.rounded_rectangle(box, radius=28, fill=node.fill, outline="#111827", width=2)
    else:
        draw.rounded_rectangle(box, radius=10, fill=node.fill, outline="#111827", width=2)
    draw_centered_text(draw, node.title, box)


def draw_png() -> None:
    img = Image.new("RGB", (WIDTH, HEIGHT), "#FFFFFF")
    draw = ImageDraw.Draw(img)

    node_map = {node.key: node for node in NODES}
    for edge in EDGES:
        draw_edge(draw, edge, node_map)
    for node in NODES:
        draw_node(draw, node)

    img.save(PNG_PATH)


def write_mermaid() -> None:
    MMD_PATH.write_text(
        """flowchart TD
    Start([Открытие приложения])
    Input[Ввод email и пароля]
    Request[Отправка данных на сервер]
    Check[Проверка пользователя]
    Decision{Данные верны?}
    Success([Вход в систему])
    Error([Сообщение об ошибке])
    Workspace([Переход к проектам])
    Retry([Повторный ввод данных])

    Start --> Input --> Request --> Check --> Decision
    Decision --> Success --> Workspace
    Decision --> Error --> Retry
""",
        encoding="utf-8",
    )


if __name__ == "__main__":
    draw_png()
    write_mermaid()
    print(PNG_PATH)
    print(MMD_PATH)
