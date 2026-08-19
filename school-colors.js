(()=>{
'use strict';
const path=(location.pathname.split('/').pop()||'index.html').toLowerCase();
if(!['index.html','programs.html','season.html','championships.html'].includes(path))return;
if(window.__RUS_SCHOOL_COLORS_LOADER__)return;window.__RUS_SCHOOL_COLORS_LOADER__=true;
if(document.querySelector('script[data-rus-school-colors-page]'))return;
const s=document.createElement('script');s.src='school-colors-page.js?v=20260818-perf4';s.async=true;s.dataset.rusSchoolColorsPage='1';document.body.appendChild(s);
})();
