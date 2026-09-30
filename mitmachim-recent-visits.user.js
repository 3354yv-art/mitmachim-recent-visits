// ==UserScript==
// @name         מתמחים טופ – נושאים שביקרתי בהם
// @namespace    mitmachim-recent-visits
// @version      1.0
// @description  מציג רשימה של הנושאים האחרונים שביקרת בהם בפורום, עם חזרה למקום שבו הפסקת לקרוא
// @match        https://mitmachim.top/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const KEY = 'mvisits:list';
  const MAX = 60;

  /* ---------- אחסון ---------- */
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } };
  const save = (list) => { try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX))); } catch (e) {} };

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const decode = (s) => { const t = document.createElement('textarea'); t.innerHTML = s || ''; return t.value; };

  function timeAgo(ts) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return 'הרגע';
    const m = Math.floor(s / 60); if (m < 60) return m === 1 ? 'לפני דקה' : `לפני ${m} דקות`;
    const h = Math.floor(m / 60); if (h < 24) return h === 1 ? 'לפני שעה' : h === 2 ? 'לפני שעתיים' : `לפני ${h} שעות`;
    const d = Math.floor(h / 24); if (d < 30) return d === 1 ? 'אתמול' : d === 2 ? 'שלשום' : `לפני ${d} ימים`;
    return new Date(ts).toLocaleDateString('he-IL');
  }

  /* ---------- מעקב אחרי ביקורים ---------- */
  function currentTopic() {
    const d = window.ajaxify && window.ajaxify.data;
    if (!d || !d.tid || !(d.template && d.template.topic)) return null;
    return d;
  }

  function postIndexFromUrl() {
    const m = location.pathname.match(/^\/topic\/\d+\/[^/]+\/(\d+)/);
    return m ? parseInt(m[1], 10) : 1;
  }

  function recordVisit() {
    const d = currentTopic();
    if (!d) return;
    const list = load();
    const old = list.find(x => x.tid === d.tid);
    if (old && list[0] === old && Date.now() - old.time < 5000) return; // אותו ביקור (טעינה כפולה)
    const entry = {
      tid: d.tid,
      title: decode(d.titleRaw || d.title),
      slug: d.slug,
      cat: d.category ? decode(d.category.name) : '',
      catColor: d.category ? (d.category.bgColor || '#6c757d') : '#6c757d',
      catTextColor: d.category ? (d.category.color || '#fff') : '#fff',
      posts: d.postcount || 0,
      index: Math.max(postIndexFromUrl(), old ? old.index : 1),
      visits: (old ? old.visits : 0) + 1,
      time: Date.now(),
    };
    save([entry, ...list.filter(x => x.tid !== d.tid)]);
    renderIfOpen();
  }

  // שמירת המיקום בזמן גלילה (NodeBB מעדכן את הכתובת לפוסט הנוכחי)
  let lastPath = '';
  setInterval(() => {
    if (location.pathname === lastPath) return;
    lastPath = location.pathname;
    const d = currentTopic();
    if (!d) return;
    const list = load();
    const e = list.find(x => x.tid === d.tid);
    if (e) { e.index = postIndexFromUrl(); e.time = Date.now(); save(list); }
  }, 1500);


  /* ---------- עיצוב ---------- */
  const css = document.createElement('style');
  css.textContent = `
  #mv-panel{position:fixed;top:70px;inset-inline-start:80px;width:380px;max-width:calc(100vw - 24px);max-height:75vh;display:none;flex-direction:column;
    background:var(--bs-body-bg,#fff);color:var(--bs-body-color,#212529);border:1px solid var(--bs-border-color,#dee2e6);border-radius:8px;
    box-shadow:0 8px 28px rgba(0,0,0,.15);z-index:1060;direction:rtl;font-size:14px}
  #mv-panel.open{display:flex}
  #mv-panel .mv-head{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--bs-border-color,#dee2e6);font-weight:600}
  #mv-panel .mv-head .mv-x{margin-inline-start:auto;border:0;background:none;font-size:18px;cursor:pointer;color:inherit;opacity:.6}
  #mv-panel .mv-search{margin:8px 12px;padding:6px 10px;border:1px solid var(--bs-border-color,#dee2e6);border-radius:6px;background:transparent;color:inherit;font:inherit}
  #mv-panel ul{list-style:none;margin:0;padding:0 6px;overflow-y:auto;flex:1}
  #mv-panel li{display:flex;gap:8px;align-items:flex-start;padding:8px 6px;border-radius:6px}
  #mv-panel li:hover{background:var(--bs-tertiary-bg,#f8f9fa)}
  #mv-panel li a.mv-t{font-weight:600;color:inherit;text-decoration:none;display:block;line-height:1.35}
  #mv-panel li a.mv-t:hover{text-decoration:underline}
  #mv-panel .mv-meta{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:3px;font-size:12px;opacity:.75}
  #mv-panel .mv-cat{border-radius:4px;padding:0 5px;font-size:11px;opacity:1}
  #mv-panel .mv-del{border:0;background:none;cursor:pointer;color:inherit;opacity:0;font-size:15px;padding:0 4px}
  #mv-panel li:hover .mv-del{opacity:.5}
  #mv-panel .mv-foot{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border-top:1px solid var(--bs-border-color,#dee2e6);font-size:12px;opacity:.85}
  #mv-panel .mv-foot button{border:0;background:none;color:var(--bs-danger,#dc3545);cursor:pointer;font:inherit}
  #mv-panel .mv-empty{padding:24px;text-align:center;opacity:.6}
  #mv-fab{position:fixed;bottom:80px;inset-inline-start:14px;width:44px;height:44px;border-radius:50%;border:0;z-index:1059;
    background:var(--bs-primary,#0d6efd);color:#fff;font-size:18px;box-shadow:0 4px 12px rgba(0,0,0,.25);cursor:pointer}
  @media(min-width:992px){#mv-fab{display:none}}
  `;
  document.head.appendChild(css);

  /* ---------- חלון הרשימה ---------- */
  const panel = document.createElement('div');
  panel.id = 'mv-panel';
  panel.innerHTML = `
    <div class="mv-head"><i class="fa fa-clock-rotate-left text-primary"></i> נושאים שביקרתי בהם<button class="mv-x" title="סגירה">×</button></div>
    <input class="mv-search" placeholder="חיפוש בנושאים…">
    <ul></ul>
    <div class="mv-foot"><span class="mv-count"></span><button class="mv-clear">ניקוי הרשימה</button></div>`;
  document.body.appendChild(panel);

  const listEl = panel.querySelector('ul');
  const searchEl = panel.querySelector('.mv-search');

  function render() {
    const q = searchEl.value.trim().toLowerCase();
    const all = load();
    const items = all.filter(x => !q || x.title.toLowerCase().includes(q) || (x.cat || '').toLowerCase().includes(q));
    panel.querySelector('.mv-count').textContent = `${all.length} נושאים`;
    if (!items.length) {
      listEl.innerHTML = `<div class="mv-empty">${all.length ? 'לא נמצאו נושאים' : 'עוד לא ביקרת בנושאים.<br>כל נושא שתפתח יופיע כאן.'}</div>`;
      return;
    }
    listEl.innerHTML = items.map(x => {
      const href = `/topic/${x.slug}${x.index > 1 ? '/' + x.index : ''}`;
      return `<li>
        <div style="flex:1;min-width:0">
          <a class="mv-t" href="${esc(href)}" data-href="${esc(href)}">${esc(x.title)}</a>
          <div class="mv-meta">
            ${x.cat ? `<span class="mv-cat" style="background:${esc(x.catColor)};color:${esc(x.catTextColor)}">${esc(x.cat)}</span>` : ''}
            <span>${timeAgo(x.time)}</span>
            ${x.index > 1 ? `<span>· המשך מפוסט ${x.index}</span>` : ''}
            ${x.visits > 1 ? `<span>· ${x.visits} ביקורים</span>` : ''}
          </div>
        </div>
        <button class="mv-del" data-tid="${x.tid}" title="הסרה מהרשימה">×</button>
      </li>`;
    }).join('');
  }
  function renderIfOpen() { if (panel.classList.contains('open')) render(); }
  function toggle(force) {
    const open = force ?? !panel.classList.contains('open');
    panel.classList.toggle('open', open);
    if (open) { render(); searchEl.value = ''; searchEl.focus(); }
  }

  listEl.addEventListener('click', (e) => {
    const del = e.target.closest('.mv-del');
    if (del) { save(load().filter(x => x.tid !== Number(del.dataset.tid))); render(); return; }
    const a = e.target.closest('a.mv-t');
    if (a && window.ajaxify && typeof window.ajaxify.go === 'function' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault(); toggle(false); window.ajaxify.go(a.dataset.href.replace(/^\//, ''));
    }
  });
  searchEl.addEventListener('input', render);
  panel.querySelector('.mv-x').onclick = () => toggle(false);
  panel.querySelector('.mv-clear').onclick = () => { if (confirm('לנקות את כל רשימת הנושאים?')) { save([]); render(); } };
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') toggle(false);
    if (e.altKey && (e.key === 'h' || e.key === 'י')) { e.preventDefault(); toggle(); }
  });
  document.addEventListener('click', (e) => {
    if (panel.classList.contains('open') && !panel.contains(e.target) && !e.target.closest('#mv-nav, #mv-fab')) toggle(false);
  });

  /* ---------- כפתור בסרגל הצד (כמו שאר הכפתורים) ---------- */
  function addNavButton() {
    const nav = document.getElementById('main-nav');
    if (!nav || document.getElementById('mv-nav')) return;
    const li = document.createElement('li');
    li.id = 'mv-nav';
    li.className = 'nav-item mx-2';
    li.title = 'נושאים שביקרתי בהם (Alt+H)';
    li.innerHTML = `
      <a class="nav-link navigation-link d-flex gap-2 justify-content-between align-items-center" href="#" role="button" aria-label="נושאים שביקרתי בהם">
        <span class="d-flex gap-2 align-items-center text-nowrap truncate-open">
          <span class="position-relative"><i class="fa fa-fw fa-clock-rotate-left"></i></span>
          <span class="nav-text small visible-open fw-semibold text-truncate">ביקרתי לאחרונה</span>
        </span>
      </a>`;
    li.querySelector('a').addEventListener('click', (e) => { e.preventDefault(); toggle(); });
    nav.appendChild(li);
  }
  addNavButton();
  new MutationObserver(addNavButton).observe(document.body, { childList: true, subtree: true });

  // כפתור צף למסכים קטנים (טלפון), שבהם אין סרגל צד
  const fab = document.createElement('button');
  fab.id = 'mv-fab';
  fab.title = 'נושאים שביקרתי בהם';
  fab.innerHTML = '<i class="fa fa-clock-rotate-left"></i>';
  fab.onclick = () => toggle();
  document.body.appendChild(fab);

  /* ---------- הפעלה ---------- */
  if (window.jQuery) window.jQuery(window).on('action:ajaxify.end', recordVisit);
  recordVisit();
})();
