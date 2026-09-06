import { describe, expect, it } from 'vitest';
import { refreshDefaultCopy } from '../../../modules/sites/refresh-default-copy';
import legacy from '../../../modules/sites/template-legacy-defaults.json';
import { getSystemTemplate } from '../../../modules/sites/templates';

describe('Egyptian template default refresh', () => {
  it('updates untouched stock content for every template without mutating the saved data', () => {
    for (const [code, sections] of Object.entries(legacy)) {
      const input = structuredClone(sections);
      const result = refreshDefaultCopy(code, input);
      expect(result.map(s => s.config)).toEqual(getSystemTemplate(code)!.sections.map(s => s.config));
      expect(input).toEqual(sections);
    }
  });

  it('preserves teacher copy, intentional empty lists, ordering and button destinations', () => {
    const sections = [
      { type: 'FAQ', config: { title: 'اسأل مستر محمد', items: [] } },
      { type: 'HERO', config: { ...legacy['personal-teacher'][0].config, title: 'الرياضيات مع محمد', buttonHref: '/my-course' } },
    ];
    const result = refreshDefaultCopy('personal-teacher', sections);
    expect(result[0]).toEqual(sections[0]);
    expect(result[1].config).toMatchObject({ title: 'الرياضيات مع محمد', buttonHref: '/my-course', body: getSystemTemplate('personal-teacher')!.sections[0].config.body });
  });

  it('leaves custom templates alone', () => {
    const sections = [{ type: 'HERO', config: { title: 'منصتي' } }];
    expect(refreshDefaultCopy('custom', sections)).toBe(sections);
  });

  it('recognizes database key ordering and blank optional translations', () => {
    const faq = legacy['math-classroom'].find(section => section.type === 'FAQ')!;
    const rows = (faq.config as { items: {title:string;body:string}[] }).items;
    const result = refreshDefaultCopy('math-classroom', [{ type: 'FAQ', config: {
      ...faq.config, items: rows.map(row => ({ body: row.body, titleEn: '', bodyEn: null, title: row.title })),
    } }]);
    expect(result[0].config.items).toEqual(getSystemTemplate('math-classroom')!.sections.find(s => s.type === 'FAQ')!.config.items);
  });
});
