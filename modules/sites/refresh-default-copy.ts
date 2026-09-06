import legacy from './template-legacy-defaults.json';
import { getSystemTemplate } from './templates';

function stockValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stockValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
    .filter(([key, item]) => !(['titleEn', 'bodyEn'].includes(key) && (item === '' || item === null)))
    .map(([key, item]) => [key, stockValue(item)]));
}

/** Refresh only untouched stock fields; authored text, empty lists and links stay intact. */
export function refreshDefaultCopy<T extends { type: string; config: unknown }>(code: string, sections: T[]): T[] {
  const previous = legacy[code as keyof typeof legacy];
  const current = getSystemTemplate(code);
  if (!previous || !current) return sections;
  return sections.map(section => {
    if (!section.config || typeof section.config !== 'object' || Array.isArray(section.config)) return section;
    const before = previous.find(item => item.type === section.type)?.config;
    const after = current.sections.find(item => item.type === section.type)?.config;
    if (!before || !after) return section;
    const config = { ...section.config } as Record<string, unknown>;
    for (const [key, value] of Object.entries(before)) {
      if (JSON.stringify(stockValue(config[key])) === JSON.stringify(stockValue(value))) {
        if (key in after) config[key] = after[key];
        else delete config[key];
      }
    }
    return { ...section, config };
  });
}
