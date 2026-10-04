const app = document.querySelector('#app');
const search = document.querySelector('#search');
const menuToggle = document.querySelector('#menu-toggle');
const figureDialog = document.querySelector('#figure-dialog');
const figureStage = document.querySelector('#figure-stage');
let catalog;
let currentCourse;
let query = '';
let lastFigureTrigger = null;
let figureZoom = 1;

function setFigureZoom(value) {
  figureZoom = Math.max(1, Math.min(3, value));
  const image = figureStage.querySelector('img');
  image.style.width = `${figureZoom * 100}%`;
  image.style.height = 'auto';
  document.querySelector('#figure-zoom-level').textContent = figureZoom === 1 ? '符合寬度' : `${Math.round(figureZoom * 100)}%`;
  document.querySelector('#figure-zoom-out').disabled = figureZoom === 1;
  document.querySelector('#figure-zoom-in').disabled = figureZoom === 3;
}

function closeFigure() {
  if (figureDialog.hidden) return;
  figureDialog.hidden = true;
  document.body.classList.remove('figure-open');
  figureDialog.querySelector('img').removeAttribute('src');
  lastFigureTrigger?.focus();
}

function openFigure(button) {
  const source = new URL(button.dataset.figure, document.baseURI).href;
  lastFigureTrigger = button;
  setFigureZoom(1);
  figureStage.scrollTop = 0;
  figureStage.scrollLeft = 0;
  figureDialog.querySelector('img').src = source;
  figureDialog.querySelector('img').alt = button.querySelector('img')?.alt || '放大的圖解';
  document.querySelector('#open-figure-original').href = source;
  figureDialog.hidden = false;
  document.body.classList.add('figure-open');
  document.querySelector('#close-figure').focus();
}

const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const lessonUrl = (course, lesson) => `#/${course.locale}/${course.id}/${lesson}`;
const courseUrl = course => `#/${course.locale}/${course.id}`;
const allLessons = course => course.chapters.flatMap(chapter => chapter.lessons.map(lesson => ({ ...lesson, chapter })));
const progressKey = course => `learn-with-graph:${course.locale}:${course.id}:complete`;
const getProgress = course => { try { return new Set(JSON.parse(localStorage.getItem(progressKey(course)) || '[]')); } catch { return new Set(); } };

function parseRoute() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts.length < 3) return { type: 'home' };
  const course = catalog.courses.find(item => item.locale === parts[0] && item.id === `${parts[1]}/${parts[2]}`);
  if (!course) return { type: 'home' };
  return { type: parts[3] ? 'lesson' : 'course', course, lessonId: parts[3] };
}

function renderHome() {
  document.title = '知識圖譜｜Learn with Graph';
  const cards = catalog.courses.map(course => `<a class="course-card" href="${courseUrl(course)}"><div class="card-top"><span class="eyebrow">${escapeHtml(course.category)} · ${escapeHtml(course.locale)}</span><span class="arrow-icon">↗</span></div><div class="card-symbol">✳</div><h3>${escapeHtml(course.title)}</h3><p>${escapeHtml(course.description)}</p><div class="card-bottom"><span>${course.chapters.length} 個章節 · ${course.lessonCount} 個單元</span><strong>開始探索 <span>→</span></strong></div></a>`).join('');
  app.innerHTML = `<main class="home"><section class="hero"><div class="hero-copy"><div class="hero-kicker"><span class="pulse"></span> 一張圖，打開一個新觀點</div><h1>讓知識，<br><em>連成一片風景。</em></h1><p>從視覺圖解切入，再用完整筆記建立理解。循著清晰的路徑，探索不同領域裡相互連結的概念。</p><a class="primary-button" href="${courseUrl(catalog.courses[0])}">開始學習 <span>↗</span></a></div><div class="hero-art" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="orbit orbit-three"></div><span class="art-node node-a">理解</span><span class="art-node node-b">探索</span><span class="art-node node-c">連結</span><span class="art-center">✳</span></div></section><section class="collection" id="courses"><div class="section-heading"><div><span class="eyebrow">LEARNING CLUSTERS</span><h2>從這裡開始探索</h2></div><p>每個主題都是一條精心編排的學習路徑。</p></div><div class="course-grid">${cards}</div></section></main>`;
}

function sidebar(course, activeId) {
  const progress = getProgress(course);
  return `<aside class="sidebar" id="sidebar"><div class="sidebar-head"><span class="eyebrow">學習路徑</span><h2>${escapeHtml(course.shortTitle)}</h2><p>${progress.size} / ${course.lessonCount} 單元已完成</p><div class="progress-track"><span style="width:${Math.min(100, progress.size / course.lessonCount * 100)}%"></span></div></div><nav aria-label="課程章節">${course.chapters.map((chapter, index) => `<div class="side-chapter"><div class="side-chapter-title"><span>${String(index + 1).padStart(2, '0')}</span>${escapeHtml(chapter.title)}</div>${chapter.lessons.map(lesson => `<a class="side-lesson ${lesson.id === activeId ? 'active' : ''}" href="${lessonUrl(course, lesson.id)}"><span class="lesson-check ${progress.has(lesson.id) ? 'done' : ''}">${progress.has(lesson.id) ? '✓' : ''}</span><span class="side-lesson-text"><b>${escapeHtml(lesson.id)}</b> ${escapeHtml(lesson.title)}</span></a>`).join('')}</div>`).join('')}</nav></aside>`;
}

function renderCourse(course) {
  document.title = `${course.shortTitle}｜知識圖譜`;
  const progress = getProgress(course);
  app.innerHTML = `<div class="learning-layout">${sidebar(course, '')}<main class="course-main"><div class="breadcrumbs"><a href="#/">探索課程</a><span>／</span>${escapeHtml(course.category)}</div><section class="course-hero"><span class="eyebrow">${escapeHtml(course.category)} · ${escapeHtml(course.locale)}</span><h1>${escapeHtml(course.title)}</h1><p>${escapeHtml(course.description)}</p><div class="course-stats"><span><strong>${course.chapters.length}</strong> 章節</span><span><strong>${course.lessonCount}</strong> 單元</span><span><strong>${progress.size}</strong> 已完成</span></div><a class="primary-button" href="${lessonUrl(course, allLessons(course).find(item => !progress.has(item.id))?.id || allLessons(course)[0].id)}">${progress.size ? '繼續學習' : '開始學習'} <span>→</span></a></section><section class="chapter-list"><div class="section-heading"><div><span class="eyebrow">CURRICULUM</span><h2>課程目錄</h2></div><p>按章節循序閱讀，也可以直接前往感興趣的單元。</p></div>${course.chapters.map((chapter, index) => `<article class="chapter-card"><div class="chapter-number">${String(index + 1).padStart(2, '0')}</div><div class="chapter-content"><div class="chapter-meta">第 ${index + 1} 章 · ${chapter.lessons.length} 個單元</div><h3>${escapeHtml(chapter.title)}</h3><p>${escapeHtml(chapter.description)}</p><div class="chapter-lessons">${chapter.lessons.map(lesson => `<a href="${lessonUrl(course, lesson.id)}"><span>${escapeHtml(lesson.id)}</span>${escapeHtml(lesson.title)}<b>↗</b></a>`).join('')}</div></div></article>`).join('')}</section></main></div>`;
}

async function renderLesson(course, lessonId) {
  const lessons = allLessons(course);
  const index = lessons.findIndex(item => item.id === lessonId);
  if (index < 0) { renderCourse(course); return; }
  const lesson = lessons[index];
  document.title = `${lesson.id} ${lesson.title}｜知識圖譜`;
  app.innerHTML = `<div class="learning-layout">${sidebar(course, lesson.id)}<main class="lesson-main"><div class="loading">正在載入單元…</div></main></div>`;
  const response = await fetch(`./${lesson.page}`);
  if (!response.ok) throw new Error('無法載入教材');
  const html = await response.text();
  if (parseRoute().lessonId !== lessonId) return;
  const progress = getProgress(course);
  document.querySelector('.lesson-main').innerHTML = `<div class="breadcrumbs"><a href="#/">探索課程</a><span>／</span><a href="${courseUrl(course)}">${escapeHtml(course.shortTitle)}</a><span>／</span>${escapeHtml(lesson.chapter.title)}</div><article class="lesson-article"><header class="lesson-header"><div class="eyebrow">第 ${parseInt(lesson.chapter.id, 10)} 章 · 單元 ${escapeHtml(lesson.id)}</div><h1>${escapeHtml(lesson.title)}</h1><p>${escapeHtml(lesson.chapter.description)}</p></header>${lesson.figures.length ? `<section class="figure-section"><div class="figure-heading"><span class="eyebrow">VISUAL GUIDE</span><h2>圖解這個概念</h2><p>先看整體脈絡，再深入閱讀筆記。</p></div>${lesson.figures.map((src, i) => `<button class="figure-button" data-figure="${escapeHtml(src)}" aria-label="放大圖解 ${i + 1}"><img src="./${escapeHtml(src)}" alt="${escapeHtml(lesson.title)}${lesson.figures.length > 1 ? `，圖解 ${i + 1}` : '圖解'}" loading="lazy"><span>點擊放大 ↗</span></button>`).join('')}</section>` : ''}<div class="reading-heading"><span class="eyebrow">DEEP DIVE</span><h2>完整筆記</h2></div><div class="prose">${html}</div><div class="lesson-finish"><div><strong>完成這個單元了嗎？</strong><p>標記進度，讓你的學習路徑更清晰。</p></div><button id="complete-button" class="${progress.has(lesson.id) ? 'completed' : ''}" type="button">${progress.has(lesson.id) ? '✓ 已完成' : '標記為完成'}</button></div><nav class="lesson-pagination" aria-label="單元導覽">${index > 0 ? `<a href="${lessonUrl(course, lessons[index - 1].id)}"><small>← 上一單元</small><strong>${escapeHtml(lessons[index - 1].title)}</strong></a>` : '<span></span>'}${index < lessons.length - 1 ? `<a href="${lessonUrl(course, lessons[index + 1].id)}"><small>下一單元 →</small><strong>${escapeHtml(lessons[index + 1].title)}</strong></a>` : '<span></span>'}</nav></article></main></div>`;
  document.querySelector('#complete-button').addEventListener('click', () => { const next = getProgress(course); next.has(lesson.id) ? next.delete(lesson.id) : next.add(lesson.id); localStorage.setItem(progressKey(course), JSON.stringify([...next])); renderLesson(course, lesson.id); });
  document.querySelectorAll('[data-figure]').forEach(button => button.addEventListener('click', () => openFigure(button)));
}

function renderSearch() {
  if (!query) return false;
  const results = catalog.courses.flatMap(course => allLessons(course).filter(item => `${item.id} ${item.title} ${item.chapter.title} ${course.title}`.toLowerCase().includes(query)).map(item => ({ course, ...item })));
  app.innerHTML = `<main class="search-page"><div class="breadcrumbs"><a href="#/">探索課程</a><span>／</span>搜尋</div><span class="eyebrow">SEARCH RESULTS</span><h1>搜尋「${escapeHtml(search.value.trim())}」</h1><p>找到 ${results.length} 個相關單元</p><div class="search-results">${results.length ? results.map(item => `<a href="${lessonUrl(item.course, item.id)}"><span class="eyebrow">${escapeHtml(item.course.shortTitle)} · ${escapeHtml(item.chapter.title)}</span><h2>${escapeHtml(item.id)} ${escapeHtml(item.title)}</h2><span>閱讀單元 ↗</span></a>`).join('') : '<div class="empty-results">沒有符合的單元。試試章節名稱或單元編號。</div>'}</div></main>`;
  return true;
}

async function render() {
  menuToggle.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('sidebar-open');
  const route = parseRoute();
  currentCourse = route.course;
  document.querySelector('#nav-home').classList.toggle('selected', route.type === 'home');
  document.querySelector('#nav-course').classList.toggle('selected', route.type !== 'home');
  if (renderSearch()) return;
  if (route.type === 'home') renderHome();
  else if (route.type === 'course') renderCourse(route.course);
  else await renderLesson(route.course, route.lessonId);
  window.scrollTo(0, 0);
}

search.addEventListener('input', () => { query = search.value.trim().toLowerCase(); render(); });
document.addEventListener('keydown', event => { if (event.key === '/' && document.activeElement !== search) { event.preventDefault(); search.focus(); } if (event.key === 'Escape' && document.activeElement === search) { search.value = ''; query = ''; search.blur(); render(); } });
menuToggle.addEventListener('click', () => { const open = document.body.classList.toggle('sidebar-open'); menuToggle.setAttribute('aria-expanded', String(open)); });
document.querySelector('#close-figure').addEventListener('click', closeFigure);
document.querySelector('#figure-zoom-in').addEventListener('click', () => setFigureZoom(figureZoom + 0.5));
document.querySelector('#figure-zoom-out').addEventListener('click', () => setFigureZoom(figureZoom - 0.5));
figureDialog.addEventListener('click', event => { if (event.target === figureDialog) closeFigure(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !figureDialog.hidden) closeFigure(); });
window.addEventListener('hashchange', () => { closeFigure(); if (query) { query = ''; search.value = ''; } render(); });
fetch('./data/catalog.json').then(response => { if (!response.ok) throw new Error('找不到課程目錄'); return response.json(); }).then(data => { catalog = data; render(); }).catch(error => { app.innerHTML = `<main class="error-state"><h1>無法載入網站</h1><p>${escapeHtml(error.message)}</p><p>請透過本機 HTTP 伺服器開啟 docs 目錄。</p></main>`; });
