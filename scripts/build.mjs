import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import MarkdownIt from 'markdown-it';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentRoot = path.join(root, 'content');
const out = path.join(root, 'docs');
const dataOut = path.join(out, 'data');
if (path.dirname(dataOut) !== out) throw new Error('Unsafe output directory');
fs.rmSync(dataOut, { recursive: true, force: true });
const markdown = new MarkdownIt({ html: false, linkify: true, typographer: true });

function directories(folder) {
  return fs.existsSync(folder)
    ? fs.readdirSync(folder, { withFileTypes: true }).filter(item => item.isDirectory()).map(item => item.name).sort()
    : [];
}

function write(relative, data) {
  const destination = path.join(out, relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, data);
}

function render(source, course, locale) {
  const tokens = markdown.parse(source, {});
  for (const token of tokens) {
    if (!token.children) continue;
    for (const child of token.children) {
      if (child.type !== 'link_open') continue;
      const href = child.attrGet('href') || '';
      const localLesson = decodeURIComponent(href).match(/(?:^|\/)(\d+\.\d+) [^/]+\.md$/);
      if (localLesson) {
        child.attrSet('href', `#/${locale}/${course}/${localLesson[1]}`);
      } else if (/^https?:\/\//.test(href)) {
        child.attrSet('target', '_blank');
        child.attrSet('rel', 'noopener noreferrer');
      }
    }
  }
  return markdown.renderer.render(tokens, markdown.options, {});
}

const catalog = { locales: [], courses: [] };
for (const locale of directories(contentRoot)) {
  catalog.locales.push(locale);
  for (const category of directories(path.join(contentRoot, locale))) {
    for (const slug of directories(path.join(contentRoot, locale, category))) {
      const folder = path.join(contentRoot, locale, category, slug);
      const metadataPath = path.join(folder, 'course.json');
      if (!fs.existsSync(metadataPath)) continue;
      const course = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      const slugs = JSON.parse(fs.readFileSync(path.join(folder, 'lesson-slugs.json'), 'utf8'));
      if (course.id !== `${category}/${slug}` || course.locale !== locale) {
        throw new Error(`Invalid course identity: ${metadataPath}`);
      }
      const chapters = course.chapters.map(chapter => ({ ...chapter, lessons: [] }));
      let total = 0;
      for (const chapter of chapters) {
        const chapterFolder = path.join(folder, 'chapters', chapter.id);
        for (const lessonId of directories(chapterFolder)) {
          const lessonFolder = path.join(chapterFolder, lessonId);
          const fileSlug = slugs[lessonId];
          if (!fileSlug) throw new Error(`Missing English filename for ${lessonId}`);
          const markdownPath = path.join(lessonFolder, `${fileSlug}.md`);
          if (!fs.existsSync(markdownPath)) throw new Error(`Missing lesson: ${markdownPath}`);
          const source = fs.readFileSync(markdownPath, 'utf8');
          const title = source.match(/^#\s+(.+)$/m)?.[1] || lessonId;
          const figures = fs.readdirSync(lessonFolder).filter(name => name.endsWith('.svg')).sort((a, b) => a === `${fileSlug}.svg` ? -1 : b === `${fileSlug}.svg` ? 1 : a.localeCompare(b));
          if (!figures.includes(`${fileSlug}.svg`)) throw new Error(`Missing primary diagram for ${lessonId}`);
          const dataFolder = `data/${locale}/${category}/${slug}/${lessonId}`;
          write(`${dataFolder}/${fileSlug}.html`, render(source.replace(/^#\s+.+\r?\n/, ''), course.id, locale));
          for (const figure of figures) {
            fs.copyFileSync(path.join(lessonFolder, figure), path.join(out, dataFolder, figure));
          }
          chapter.lessons.push({ id: lessonId, title: title.replace(/^\d+\.\d+\s*/, ''), figures: figures.map(name => `${dataFolder}/${name}`), page: `${dataFolder}/${fileSlug}.html` });
          total += 1;
        }
      }
      catalog.courses.push({ ...course, chapters, lessonCount: total });
    }
  }
}
if (!catalog.courses.length) throw new Error('No courses found in content/');
write('data/catalog.json', JSON.stringify(catalog, null, 2));
console.log(`Built ${catalog.courses.length} course(s), ${catalog.courses.reduce((n, c) => n + c.lessonCount, 0)} lessons in docs/`);
