import type { PreviewLanguage } from '../stylePreviewI18n'

export const catalogTemplateLabels = {
  ru: {
    addField: '+ Поле шаблона',
    dataType: 'Тип данных',
    fields: 'Поля шаблона',
    max: 'Максимум',
    min: 'Минимум',
    noFields: 'Поля шаблона пока не настроены.',
    options: 'Варианты',
    optionsPlaceholder: 'Например: огонь, вода, воздух',
    referenceCatalog: 'Каталог для ссылки',
    required: 'Обязательное',
    template: 'Шаблон записи',
  },
  en: {
    addField: '+ Template field',
    dataType: 'Data type',
    fields: 'Template fields',
    max: 'Maximum',
    min: 'Minimum',
    noFields: 'No template fields yet.',
    options: 'Options',
    optionsPlaceholder: 'Example: fire, water, air',
    referenceCatalog: 'Reference catalog',
    required: 'Required',
    template: 'Entry template',
  },
} satisfies Record<PreviewLanguage, Record<string, string>>

