// Local, database-free review of the actual template components and demo presets.
// Run: node scripts/preview-templates.mjs, then visit http://127.0.0.1:4173
import { build } from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';

const root = process.cwd();
const out = path.join(root, '.template-preview');
await fs.mkdir(out, { recursive: true });
await build({
  stdin: { contents: `
    import React from 'react';
    import { createRoot } from 'react-dom/client';
    import { TemplateSiteRenderer } from './components/tenant/TemplateSiteRenderer';
    import { SYSTEM_WEBSITE_TEMPLATES, TEMPLATE_DEMO_PRESETS } from './modules/sites/templates';
    const params = new URLSearchParams(location.search);
    const code = params.get('template') || 'personal-teacher';
    const locale = params.get('locale') || (document.cookie.match(/site_locale=(en|ar)/)?.[1]) || (code === 'global-arabic-quran' ? 'en' : 'ar');
    const template = SYSTEM_WEBSITE_TEMPLATES.find(t => t.code === code) || SYSTEM_WEBSITE_TEMPLATES[0];
    const demo = TEMPLATE_DEMO_PRESETS[template.code];
    const settings = { tenantId: 'demo-tenant', tenantSlug: 'demo-academy', platformName: demo.siteName, platformNameEn: demo.platformNameEn, primaryColor: demo.primaryColor, secondaryColor: demo.secondaryColor, accentColor: demo.accentColor, heroImageUrl: demo.heroImageUrl, logoUrl: null, shortAbout: demo.about, contactDetails: {}, socialLinks: {} };
    const page = { title: demo.siteName, site: { template, templateVersion: template.version, themeOverrides: {} }, sections: template.sections.map((s,i) => ({ ...s, id: 'section-'+i })) };
    document.documentElement.lang = locale;
    createRoot(document.getElementById('root')).render(<TemplateSiteRenderer locale={locale} settings={settings} page={page} courses={demo.courses.map(c => ({ ...c, imageUrl: null }))} content={demo} />);
  `, resolveDir: root, loader: 'tsx' },
  bundle: true, outfile: path.join(out, 'app.js'), jsx: 'automatic',
  plugins: [{ name: 'preview-link', setup(b) {
    b.onResolve({ filter: /^next\/link$/ }, () => ({ path: 'link', namespace: 'preview' }));
    b.onLoad({ filter: /.*/, namespace: 'preview' }, () => ({ contents: `import React from 'react'; export default function Link({children, ...props}) { return <a {...props}>{children}</a> }`, loader: 'jsx', resolveDir: root }));
  }}],
});
const chunks = await fs.readdir(path.join(root,'.next/static/chunks')).catch(() => []);
let fontCss = '';
for (const chunk of chunks.filter(name => name.endsWith('.css'))) {
  const css = await fs.readFile(path.join(root,'.next/static/chunks',chunk),'utf8');
  fontCss += (css.match(/@font-face\{[^}]*font-family:(?:IBM Plex Sans Arabic|Outfit);[^}]*\}/g) || []).join('\n').replaceAll('../media/','/fonts/');
}
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Teacher template review</title><link rel="stylesheet" href="/app.css"><style>*{box-sizing:border-box}body{margin:0}${fontCss}body{font-family:"IBM Plex Sans Arabic",Arial,sans-serif}.template-site,.aq-site{--font-ibm-arabic:"IBM Plex Sans Arabic";--font-outfit:Outfit}button,input{font:inherit}</style></head><body><div id="root"></div><script src="/app.js"></script></body></html>`;
const server = http.createServer(async (req,res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/') { res.setHeader('Content-Type','text/html; charset=utf-8'); res.end(html); return; }
  const base = url.pathname.startsWith('/fonts/') ? path.join(root,'.next/static/media') : ['/app.js','/app.css'].includes(url.pathname) ? out : path.join(root,'public');
  const target = path.resolve(base, '.' + (url.pathname.startsWith('/fonts/') ? url.pathname.replace('/fonts','') : url.pathname));
  if (!target.startsWith(base + path.sep)) { res.writeHead(403); res.end(); return; }
  try { const data = await fs.readFile(target); const ext = path.extname(target); res.setHeader('Content-Type',({'.js':'application/javascript','.css':'text/css','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'})[ext] || 'application/octet-stream'); res.end(data); }
  catch { res.writeHead(404); res.end(); }
});
if (!process.argv.includes('--build-only')) server.listen(4173,'127.0.0.1',() => console.log('Template review: http://127.0.0.1:4173'));
