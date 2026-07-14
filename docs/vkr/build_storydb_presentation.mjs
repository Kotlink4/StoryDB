import fs from "node:fs/promises";
import path from "node:path";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const repoRoot = "C:/Users/vovaz/source/repos/StoryDB";
const figuresDir = path.join(repoRoot, "docs/vkr");
const screenshotsDir = path.join(figuresDir, "screenshots");
const outputPptx = path.join(figuresDir, "Презентация_Звхврин_ВС_StoryDB.pptx");
const previewDir = process.env.PREVIEW_DIR || path.join(figuresDir, "presentation_preview");

const slideW = 1280;
const slideH = 720;
const marginX = 72;
const marginTop = 42;
const titleH = 60;

const theme = {
  background: "#FFFFFF",
  ink: "#111827",
  muted: "#4B5563",
  light: "#F8FAFC",
  border: "#CBD5E1",
  rule: "#E5E7EB",
  accent: "#1F4E79",
  accentSoft: "#EAF2F8",
  typeface: "Arial",
};

async function writeBlob(filePath, blob) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, new Uint8Array(await blob.arrayBuffer()));
}

async function imageBlob(filePath) {
  const bytes = await fs.readFile(filePath);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function addText(slide, text, position, options = {}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    position,
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  shape.text = text;
  shape.text.style = {
    fontSize: options.fontSize ?? 22,
    bold: options.bold ?? false,
    color: options.color ?? theme.ink,
    alignment: options.alignment ?? "left",
    typeface: options.typeface ?? theme.typeface,
  };
  return shape;
}

function addLine(slide, left, top, width, color = theme.rule, height = 1.5) {
  return slide.shapes.add({
    geometry: "rect",
    position: { left, top, width, height },
    fill: color,
    line: { style: "solid", fill: color, width: 0 },
  });
}

function addTitle(slide, text) {
  const title = addText(
    slide,
    text,
    { left: marginX, top: marginTop, width: slideW - marginX * 2, height: titleH },
    { fontSize: 35, bold: true, color: theme.ink },
  );
  addLine(slide, marginX, marginTop + titleH + 8, slideW - marginX * 2, theme.rule, 1.2);
  addLine(slide, marginX, marginTop + titleH + 8, 118, theme.accent, 2.4);
  return title;
}

function addBullets(slide, items, position, fontSize = 23) {
  return addText(slide, items.map((item) => `• ${item}`).join("\n"), position, {
    fontSize,
    color: theme.ink,
  });
}

async function addImage(slide, filePath, position, alt, options = {}) {
  if (options.frame !== false) {
    const pad = options.pad ?? 10;
    slide.shapes.add({
      geometry: "rect",
      position: {
        left: position.left - pad,
        top: position.top - pad,
        width: position.width + pad * 2,
        height: position.height + pad * 2,
      },
      fill: theme.background,
      line: { style: "solid", fill: theme.border, width: 1 },
    });
  }
  slide.images.add({
    blob: await imageBlob(filePath),
    contentType: "image/png",
    alt,
    fit: "contain",
    position,
  });
}

function addFooter(slide, number) {
  addLine(slide, marginX, slideH - 54, slideW - marginX * 2, theme.rule, 1);
  addText(
    slide,
    "StoryDB · ВКР",
    { left: marginX, top: slideH - 42, width: 220, height: 22 },
    { fontSize: 13, color: theme.muted },
  );
  addText(
    slide,
    String(number),
    { left: slideW - 110, top: slideH - 48, width: 38, height: 24 },
    { fontSize: 14, color: theme.muted, alignment: "right" },
  );
}

async function addDbPartSlide(slide, title, description, fileName, alt, imagePosition = {}) {
  addTitle(slide, title);
  await addImage(
    slide,
    path.join(figuresDir, fileName),
    {
      left: imagePosition.left ?? 90,
      top: imagePosition.top ?? 124,
      width: imagePosition.width ?? 1100,
      height: imagePosition.height ?? 465,
    },
    alt,
  );
  addText(
    slide,
    description,
    { left: 105, top: 610, width: 1070, height: 42 },
    { fontSize: 20, alignment: "center" },
  );
}

function addComparisonSlide(slide) {
  addTitle(slide, "Сравнение с аналогами");

  const values = [
    ["Система", "Назначение", "База мира", "Связи", "Таймлайн", "Комментарий"],
    ["World Anvil", "worldbuilding", "да", "да", "да", "публикация и ведение мира"],
    ["Campfire", "среда автора", "да", "част.", "да", "готовые модули"],
    ["Notebook.ai", "база мира", "да", "част.", "да", "шаблоны сущностей"],
    ["Kanka", "мир и кампании", "да", "да", "да", "акцент на RPG"],
    ["Plottr", "план сюжета", "част.", "част.", "да", "сцены и линии сюжета"],
    ["StoryDB", "проект ВКР", "да", "да", "да", "каталоги, структуры, граф, таймлайн"],
  ];

  const table = slide.tables.add({
    rows: values.length,
    columns: values[0].length,
    left: 62,
    top: 128,
    width: 1156,
    height: 455,
    columnWidths: [150, 190, 105, 100, 115, 496],
    values,
  });

  table.rows[0].height = 42;
  for (let row = 1; row < values.length; row += 1) {
    table.rows[row].height = 68;
  }

  table.borders.assign({ style: "solid", fill: "slate-300", width: 1 });
  table.cells.block({ row: 0, column: 0, rowCount: 1, columnCount: values[0].length }).assign({
    fill: theme.light,
    textStyle: { fontSize: 16, bold: true, color: theme.ink, typeface: theme.typeface },
    margins: { left: 6, right: 6, top: 4, bottom: 4 },
  });
  table.cells.block({ row: 1, column: 0, rowCount: values.length - 1, columnCount: values[0].length }).assign({
    textStyle: { fontSize: 16, color: theme.ink, typeface: theme.typeface },
    margins: { left: 6, right: 6, top: 4, bottom: 4 },
  });
  table.cells.block({ row: values.length - 1, column: 0, rowCount: 1, columnCount: values[0].length }).assign({
    fill: theme.accentSoft,
    textStyle: { fontSize: 16, bold: true, color: theme.ink, typeface: theme.typeface },
    margins: { left: 6, right: 6, top: 4, bottom: 4 },
  });

  addText(
    slide,
    "Вывод: StoryDB закрывает основные функции аналогов и делает акцент на единой предметной базе проекта.",
    { left: 82, top: 610, width: 1080, height: 44 },
    { fontSize: 19 },
  );
}

async function main() {
  await fs.mkdir(previewDir, { recursive: true });

  const presentation = Presentation.create({
    slideSize: { width: slideW, height: slideH },
  });

  function newSlide() {
    const slide = presentation.slides.add();
    slide.background.fill = theme.background;
    return slide;
  }

  let slideNumber = 1;

  {
    const slide = newSlide();
    addText(
      slide,
      "Разработка веб-приложения для авторов художественных произведений",
      { left: 92, top: 112, width: 1096, height: 180 },
      { fontSize: 50, bold: true, color: theme.ink },
    );
    addLine(slide, 92, 318, 180, theme.accent, 3);
    addText(slide, "StoryDB", { left: 92, top: 345, width: 500, height: 46 }, { fontSize: 28, color: theme.muted });
    addText(
      slide,
      "Выполнил: Звхврин В.С.\nРуководитель: Лемешкин А.В.",
      { left: 92, top: 475, width: 720, height: 90 },
      { fontSize: 24, color: theme.ink },
    );
    addFooter(slide, slideNumber++);
  }

  {
    const slide = newSlide();
    addTitle(slide, "Актуальность");
    addBullets(
      slide,
      [
        "Материалы художественного проекта быстро становятся разрозненными",
        "Персонажи, места, организации, предметы и события связаны между собой",
        "Обычные документы и таблицы плохо показывают связи и изменения во времени",
        "Автору нужен единый инструмент для хранения, поиска и анализа сведений",
      ],
      { left: 96, top: 150, width: 1040, height: 360 },
    );
    addFooter(slide, slideNumber++);
  }

  {
    const slide = newSlide();
    addTitle(slide, "Цель и задачи работы");
    addText(
      slide,
      "Цель: разработать веб-приложение для авторов художественных произведений, позволяющее вести базу знаний проекта, анализировать связи и фиксировать хронологию событий.",
      { left: 96, top: 135, width: 1060, height: 105 },
      { fontSize: 24 },
    );
    addBullets(
      slide,
      [
        "проанализировать предметную область",
        "сформировать требования",
        "спроектировать архитектуру и модель данных",
        "реализовать серверную и клиентскую части",
        "проверить основные функциональные сценарии",
      ],
      { left: 96, top: 285, width: 980, height: 310 },
      22,
    );
    addFooter(slide, slideNumber++);
  }

  {
    const slide = newSlide();
    addTitle(slide, "Основные требования");
    addBullets(
      slide,
      [
        "создание и редактирование проектов",
        "карточки персонажей, предметов, мест и организаций",
        "пользовательские атрибуты и каталоги",
        "граф отношений и структуры проекта",
        "таймлайн событий и изменений состояния",
        "загрузка изображений и экспорт DOCX-досье",
      ],
      { left: 96, top: 145, width: 1060, height: 390 },
      22,
    );
    addFooter(slide, slideNumber++);
  }

  {
    const slide = newSlide();
    addComparisonSlide(slide);
    addFooter(slide, slideNumber++);
  }

  {
    const slide = newSlide();
    addTitle(slide, "Контекстная диаграмма");
    await addImage(
      slide,
      path.join(figuresDir, "storydb_idef0_context.png"),
      { left: 70, top: 125, width: 1140, height: 500 },
      "Контекстная диаграмма StoryDB",
    );
    addFooter(slide, slideNumber++);
  }

  {
    const slide = newSlide();
    addTitle(slide, "Архитектура приложения");
    addBullets(
      slide,
      [
        "клиент: React + TypeScript",
        "сервер: ASP.NET Core Web API",
        "хранение: PostgreSQL и файловое хранилище",
        "развертывание: Docker Compose",
      ],
      { left: 76, top: 155, width: 410, height: 300 },
      21,
    );
    await addImage(
      slide,
      path.join(figuresDir, "storydb_architecture.png"),
      { left: 520, top: 130, width: 650, height: 450 },
      "Архитектура StoryDB",
    );
    addFooter(slide, slideNumber++);
  }

  {
    const slide = newSlide();
    addTitle(slide, "Модель данных");
    addBullets(
      slide,
      [
        "центральная сущность: проект",
        "объекты мира связаны с каталогами, структурами и событиями",
        "медиафайлы и раскладки хранятся отдельно",
      ],
      { left: 76, top: 155, width: 410, height: 230 },
      21,
    );
    await addImage(
      slide,
      path.join(figuresDir, "storydb_db_schema_overview.png"),
      { left: 500, top: 135, width: 700, height: 475 },
      "Укрупненная схема базы данных StoryDB",
    );
    addFooter(slide, slideNumber++);
  }

  {
    const slide = newSlide();
    await addDbPartSlide(
      slide,
      "БД: пользователи и проекты",
      "Пользователи, проекты, шаблоны, снимки и публикация проекта.",
      "storydb_db_schema_01_projects.png",
      "Фрагмент базы данных: пользователи и проекты",
    );
    addFooter(slide, slideNumber++);
  }

  {
    const slide = newSlide();
    await addDbPartSlide(
      slide,
      "БД: объекты художественного мира",
      "Карточки объектов, атрибуты, отношения, галереи и привязки к структурам.",
      "storydb_db_schema_02_story_objects.png",
      "Фрагмент базы данных: объекты художественного мира",
      { left: 70, top: 124, width: 1140, height: 465 },
    );
    addFooter(slide, slideNumber++);
  }

  {
    const slide = newSlide();
    await addDbPartSlide(
      slide,
      "БД: каталоги и справочники",
      "Настраиваемые каталоги, поля, группы, записи и связи между записями.",
      "storydb_db_schema_03_catalogs.png",
      "Фрагмент базы данных: каталоги и справочники",
    );
    addFooter(slide, slideNumber++);
  }

  {
    const slide = newSlide();
    await addDbPartSlide(
      slide,
      "БД: структуры",
      "Структуры проекта, узлы, ребра и назначения объектов.",
      "storydb_db_schema_04_structures.png",
      "Фрагмент базы данных: структуры",
    );
    addFooter(slide, slideNumber++);
  }

  {
    const slide = newSlide();
    await addDbPartSlide(
      slide,
      "БД: таймлайн",
      "События, связи событий, изменения состояния и раскладка временной линии.",
      "storydb_db_schema_05_timeline.png",
      "Фрагмент базы данных: таймлайн",
    );
    addFooter(slide, slideNumber++);
  }

  {
    const slide = newSlide();
    await addDbPartSlide(
      slide,
      "БД: медиа и раскладки",
      "Медиафайлы, варианты изображений и пользовательские раскладки графа и таймлайна.",
      "storydb_db_schema_06_media_layouts.png",
      "Фрагмент базы данных: медиа и раскладки",
    );
    addFooter(slide, slideNumber++);
  }

  {
    const slide = newSlide();
    addTitle(slide, "Рабочая область");
    addBullets(
      slide,
      [
        "слева расположена навигация по типам данных",
        "в центре показан список объектов",
        "справа открывается карточка выбранного элемента",
      ],
      { left: 78, top: 150, width: 380, height: 260 },
      21,
    );
    await addImage(
      slide,
      path.join(screenshotsDir, "storydb_ui_characters.png"),
      { left: 485, top: 125, width: 700, height: 420 },
      "Рабочая область с персонажами",
    );
    addFooter(slide, slideNumber++);
  }

  {
    const slide = newSlide();
    addTitle(slide, "Редактирование объектов и каталогов");
    await addImage(
      slide,
      path.join(screenshotsDir, "storydb_ui_object_editor.png"),
      { left: 80, top: 135, width: 540, height: 340 },
      "Окно редактирования объекта",
    );
    await addImage(
      slide,
      path.join(screenshotsDir, "storydb_ui_organizations.png"),
      { left: 660, top: 135, width: 540, height: 340 },
      "Список организаций",
    );
    addText(
      slide,
      "Карточка объекта содержит основные сведения, характеристики, связи, каталоги и структуры.",
      { left: 100, top: 510, width: 1040, height: 55 },
      { fontSize: 21 },
    );
    addFooter(slide, slideNumber++);
  }

  {
    const slide = newSlide();
    addTitle(slide, "Связи и временная линия");
    await addImage(
      slide,
      path.join(screenshotsDir, "storydb_ui_relations.png"),
      { left: 80, top: 135, width: 540, height: 340 },
      "Граф связей",
    );
    await addImage(
      slide,
      path.join(screenshotsDir, "storydb_ui_timeline.png"),
      { left: 660, top: 135, width: 540, height: 340 },
      "Таймлайн проекта",
    );
    addText(
      slide,
      "Граф показывает отношения между объектами, а таймлайн фиксирует события и изменения состояния.",
      { left: 100, top: 510, width: 1040, height: 55 },
      { fontSize: 21 },
    );
    addFooter(slide, slideNumber++);
  }

  {
    const slide = newSlide();
    addTitle(slide, "Технологии реализации");
    addBullets(
      slide,
      [
        "ASP.NET Core, C#, Entity Framework Core",
        "PostgreSQL, миграции, JSONB для снимков проекта",
        "React, TypeScript, Vite",
        "React Flow, D3, ELK для визуализаций",
        "OpenXML SDK для экспорта DOCX",
        "Docker Compose для развертывания",
      ],
      { left: 96, top: 145, width: 1030, height: 390 },
      22,
    );
    addFooter(slide, slideNumber++);
  }

  {
    const slide = newSlide();
    addTitle(slide, "Тестирование");
    addBullets(
      slide,
      [
        "unit-тесты сервисов, валидаторов и вспомогательных функций",
        "интеграционные тесты API и работы с базой данных",
        "тесты клиентских функций и маршрутизации",
        "E2E smoke-проверки основных экранов",
        "проверка сценариев: проект, объект, каталог, структура, таймлайн, экспорт",
      ],
      { left: 96, top: 145, width: 1030, height: 390 },
      22,
    );
    addFooter(slide, slideNumber++);
  }

  {
    const slide = newSlide();
    addTitle(slide, "Результат работы");
    addBullets(
      slide,
      [
        "разработано веб-приложение StoryDB",
        "реализованы база объектов, каталоги, структуры, граф связей и таймлайн",
        "поддержаны загрузка изображений, снимки проекта и экспорт DOCX",
        "подготовлено контейнерное развертывание и эксплуатационные эндпоинты",
        "цель выпускной квалификационной работы достигнута",
      ],
      { left: 96, top: 145, width: 1030, height: 390 },
      22,
    );
    addFooter(slide, slideNumber++);
  }

  for (const [index, slide] of presentation.slides.items.entries()) {
    const stem = `slide-${String(index + 1).padStart(2, "0")}`;
    await writeBlob(path.join(previewDir, `${stem}.png`), await presentation.export({ slide, format: "png", scale: 1 }));
    const layout = await slide.export({ format: "layout" });
    await fs.writeFile(path.join(previewDir, `${stem}.layout.json`), await layout.text(), "utf8");
  }

  await writeBlob(
    path.join(previewDir, "deck-montage.webp"),
    await presentation.export({ format: "webp", montage: true, scale: 1 }),
  );

  const inspect = await presentation.inspect({
    kind: "slide,textbox,image,layout",
    maxChars: 16000,
  });
  await fs.writeFile(path.join(previewDir, "inspect.ndjson"), inspect.ndjson, "utf8");

  const pptx = await PresentationFile.exportPptx(presentation);
  await pptx.save(outputPptx);
  console.log(outputPptx);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
