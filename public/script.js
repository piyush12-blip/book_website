const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let BOOKS = [
  {id:'silent-hours',title:'The Silent Hours',author:'Eleanor Vance',cover:'navy moon',lines:'The<br>Silent<br>Hours',genre:'quiet mystery',mood:'Rainy',pages:312,rating:5,synopsis:'A restrained mystery about a vanished clockmaker, a house that never sleeps, and the final hour hidden in a family ledger.'},
  {id:'wuthering-heights',title:'Wuthering Heights',author:'Author Tleson',cover:'photo',lines:'Wuthering<br>Heights',genre:'classic gothic',mood:'Stormy',pages:416,rating:4,synopsis:'A wind-cut romance of moors, memory, and devotion that refuses to stay buried.'},
  {id:'moby-dick',title:'Moby Dick',author:'Mary Cohs',cover:'teal',lines:'Moby<br>Dick',genre:'sea classic',mood:'Epic',pages:635,rating:4,synopsis:'An obsessive voyage rendered in salt, myth, and the impossible scale of the open sea.'},
  {id:'siant-hours',title:'The Siant Hours',author:'Elesnor Vence',cover:'ivory',lines:'The Siant<br>Hours',genre:'literary',mood:'Soft',pages:248,rating:3,synopsis:'A miniature novel of letters, feathers, and the little rituals that hold lonely lives together.'},
  {id:'de-romans',title:'De Romans',author:'Cout Wama',cover:'green',lines:'De<br>Romans',genre:'romance',mood:'Tender',pages:284,rating:4,synopsis:'A tender collection of romances with old-world manners and sharply observed endings.'},
  {id:'morley-frans',title:'Morley Frans',author:'Alisen Risston',cover:'tan',lines:'Morley Frans',genre:'portrait',mood:'Warm',pages:226,rating:3,synopsis:'A warm portrait of a novelist whose public grace hides a private archive of secrets.'},
  {id:'midssnet',title:'The Midssnet',author:'Matt Haig',cover:'midnight',lines:'The<br>Midssnet',genre:'speculative',mood:'Midnight',pages:304,rating:4,synopsis:'Between midnight and morning, a reader discovers the lives she almost lived.'},
  {id:'womering-heights',title:'Womering Heights',author:'Author Tleson',cover:'grey',lines:'Womering<br>Heights',genre:'classic',mood:'Stormy',pages:390,rating:4,synopsis:'An archival edition of a stormy hilltop novel with newly discovered marginalia.'},
  {id:'quiet-paper',title:'Quiet Paper',author:'Marrow Finch',cover:'cream',lines:'Quiet<br>Paper',genre:'essays',mood:'Quiet',pages:192,rating:4,synopsis:'Short essays on paper, memory, and the gentle discipline of keeping a reading life.'},
  {id:'echoes-past',title:'Echoes of the Past',author:'Eleanor Vance',cover:'burgundy',lines:'Echoes<br>of the<br>Past',genre:'historical fiction',mood:'Rainy',pages:428,rating:5,synopsis:'Archivist Clara Vale returns to Thornfield House to catalogue her grandmother’s library. In the margins of a weathered atlas, she finds three handwritten clues that unravel a disappearance everyone in the family agreed never to name.'},
  {id:'midnight-library',title:'The Midnight Library',author:'Matt Haig',cover:'blue',lines:'The<br>Midnight<br>Library',genre:'literary fantasy',mood:'Reflective',pages:288,rating:4,synopsis:'A luminous story about choice, regret, and a library between life and death where every book opens a life that might have been.'},
  {id:'livns-visiam',title:'The Livns Visiam',author:'Henna Vance',cover:'ochre',lines:'The<br>Furwarrtinenal<br>Diszoduction',genre:'literary',mood:'Dry wit',pages:336,rating:4,synopsis:'A dry, elegant comedy of manners about a family introduction that goes wrong in exactly the right way.'},
  {id:'unravmish-book',title:'The Unravmish Book',author:'Orla Finne',cover:'sage',lines:'The<br>Unravmish<br>Book',genre:'mystery',mood:'Quiet',pages:356,rating:4,synopsis:'A bookbinder follows a thread through damaged volumes, finding one torn page that changes the catalogue forever.'},
  {id:'sphoniat',title:'Isleath of Sphoniat',author:'J. Harrow',cover:'brown',lines:'Isleath of<br>Sphoniat',genre:'mythic fiction',mood:'Mythic',pages:402,rating:4,synopsis:'A solemn island myth with candlelit courts, salt-stained maps, and a prince no one is allowed to remember.'},
  {id:'trearnbook',title:'The Trearnbook',author:'Mara Solen',cover:'rust',lines:'The<br>Trearnbook',genre:'literary',mood:'Melancholy',pages:274,rating:5,synopsis:'A red-cloth notebook passes between strangers, collecting confessions in a city built around a vanished train station.'}
];

const DEFAULT_STATE = { saved:[], liked:[], progress:{}, recent:[], notes:{}, highlighted:{}, currentBook:'echoes-past', activeShelf:'saved', searchFilter:'all', exploreFilter:'for-you', sessions:0, cachedBooks:{}, reader:{theme:'paper', font:19, line:1.85, mode:'continuous', focus:true, navOpen:false, notesOpen:false, mangaMode:'webtoon', mangaDirection:'ltr', epubMode:false}, appTheme:'system', account:null, activeChapter:0 };
const app = document.querySelector('.bibliotheque');
const sections = [...document.querySelectorAll('.app-section')];
const navLinks = [...document.querySelectorAll('.nav a')];
const searchButton = document.querySelector('[data-open-search]');
let state = loadState();

function loadState(){
  try{
    const raw=JSON.parse(localStorage.getItem('bibliotheque-state')||'{}');
    const s = {...DEFAULT_STATE,...raw,reader:{...DEFAULT_STATE.reader,...(raw.reader||{})}};
    if(s.cachedBooks){
      Object.values(s.cachedBooks).forEach(cb=>{
        if(!BOOKS.some(b=>b.id===cb.id)) BOOKS.push(cb);
      });
    }
    return s;
  }catch{return structuredClone(DEFAULT_STATE)}
}
function saveState(){
  try {
    // Clone state and prune heavy text chapter payloads from localStorage persistence
    const stateToSave = JSON.parse(JSON.stringify(state));
    if (stateToSave.cachedBooks) {
      Object.keys(stateToSave.cachedBooks).forEach(key => {
        if (stateToSave.cachedBooks[key].chapters) {
          delete stateToSave.cachedBooks[key].chapters;
        }
      });
    }
    localStorage.setItem('bibliotheque-state', JSON.stringify(stateToSave));
  } catch (err) {
    console.warn('[STORAGE] Quota exceeded, clearing cached state payloads:', err.message);
    try {
      // Emergency fallback: clear old cached items and save minimal state
      const minimalState = {
        saved: state.saved,
        liked: state.liked,
        progress: state.progress,
        recent: state.recent,
        notes: state.notes,
        highlighted: state.highlighted,
        currentBook: state.currentBook,
        reader: state.reader
      };
      localStorage.setItem('bibliotheque-state', JSON.stringify(minimalState));
    } catch(e) {}
  }
}
const book = id => {
  if (!id) return null;
  let found = BOOKS.find(b => b.id === id) || (state.cachedBooks && state.cachedBooks[id]);
  if (found) return found;

  const isManga = id.startsWith('manhwa18-') || id.startsWith('mangabuddy-') || id.startsWith('mangapill-') || id.startsWith('telegram-') || id.startsWith('private-tg-');
  const isWebnovel = id.startsWith('royalroad-');

  let rawClean = id.replace(/^(itunes|manhwa18|mangabuddy|mangapill|royalroad|telegram|private-tg)-/, '')
                    .replace(/^\d+[-_\s]*/, '')
                    .replace(/:\s*(reese's book club|oprah's book club|a novel|a memoir).*/gi, '')
                    .replace(/[-_]/g, ' ')
                    .trim();

  let formattedTitle = rawClean.split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  found = {
    id: id,
    title: formattedTitle,
    author: isManga ? 'Manga Artist' : isWebnovel ? 'WebNovel Author' : 'Classic Author',
    genre: isManga ? 'Manga & Manhwa' : isWebnovel ? 'Web Novel' : 'Book',
    format: isManga ? 'Manga & Manhwa' : isWebnovel ? 'Novel & Fiction' : 'Novels',
    mood: 'Reading',
    pages: 300,
    rating: 5,
    cover: 'navy',
    lines: formattedTitle.slice(0, 15),
    synopsis: `${formattedTitle} is available for 1-click reading.`,
    chapters: []
  };

  BOOKS.push(found);
  return found;
};
const pct=id=>Math.max(0,Math.min(100,Number(state.progress[id]||0)));
const saved=id=>(state.saved||[]).includes(id), liked=id=>(state.liked||[]).includes(id);
const isSaved=saved, isLiked=liked;
const unique=a=>[...new Set(a.filter(Boolean))];
function toast(msg){let el=document.querySelector('.toast');if(!el){el=document.createElement('div');el.className='toast';document.body.appendChild(el)}el.textContent=msg;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),1800)}
function stars(n){const num=Number(n)||5,norm=num>5?num/2:num,count=Math.min(5,Math.max(0,Math.round(norm)));return '★'.repeat(count)+'<i>'+'★'.repeat(5-count)+'</i>'}
function coverHTML(item,size='mini'){
  if (item.image) {
    return `<div class="cover ${size} has-image ${item.cover||''}" data-book="${item.id}" role="button" tabindex="0" aria-label="Open ${item.title}"><img class="cover-img" src="${item.image}" alt="${item.title} book cover" onerror="this.style.display='none';if(this.parentElement)this.parentElement.classList.remove('has-image');"></div>`;
  }
  const color = item.cover || 'burgundy';
  const author = ['feature','detail-cover'].includes(size) ? `<small>${item.author || 'Author'}</small>` : '';
  const lines = item.lines || item.title.split(' ').slice(0,3).join('<br>');
  return `<div class="cover ${size} ${color}" data-book="${item.id}" role="button" tabindex="0" aria-label="Open ${item.title}"><span>${lines}</span>${author}</div>`;
}
function actions(id){return `<div class="card-actions"><button class="action-btn ${saved(id)?'active':''}" data-action="save" data-book="${id}" aria-pressed="${saved(id)}">${saved(id)?'Saved':'Save'}</button><button class="action-btn ${liked(id)?'active':''}" data-action="like" data-book="${id}" aria-pressed="${liked(id)}" aria-label="Like ${book(id).title}">${liked(id)?'♥':'♡'}</button></div>`}
function miniCard(item){let p=pct(item.id);return `<article class="mini-book" data-card="${item.id}">${coverHTML(item,'mini')}<h2>${item.title}</h2><p>${item.author}</p><span class="progress-label"><i class="progress"><b style="width:${p}%"></b></i>${p}%</span>${actions(item.id)}</article>`}
function featureCard(item,cls=''){return `<article class="feature-card ${cls}" data-card="${item.id}">${coverHTML(item,'feature')}<h3>${item.title}</h3><p>${item.author}</p><div class="stars">${stars(item.rating)}</div>${actions(item.id)}</article>`}
function tasteProfile(){const ids=unique([...state.liked,...state.saved,...state.recent]);const genres={},authors={},moods={};ids.forEach(id=>{const b=book(id), weight=liked(id)?3:saved(id)?2:1;genres[b.genre]=(genres[b.genre]||0)+weight;authors[b.author]=(authors[b.author]||0)+weight;moods[b.mood]=(moods[b.mood]||0)+weight});return{genres,authors,moods,ids}}
function recommendations(limit=8){const t=tasteProfile();return BOOKS.map(b=>{let score=b.rating*3+(pct(b.id)>0&&pct(b.id)<100?18:0)+(saved(b.id)?-8:0);score+=(t.genres[b.genre]||0)*8+(t.authors[b.author]||0)*6+(t.moods[b.mood]||0)*5;if(!t.ids.length)score+=['echoes-past','midnight-library','unravmish-book','trearnbook'].includes(b.id)?22:0;return{...b,score}}).sort((a,b)=>b.score-a.score).slice(0,limit)}

function renderReadingList(){const el=document.querySelector('.reading-list');if(!el)return;const list=state.saved.map(book).filter(Boolean);el.innerHTML=(list.length?`<div class="reading-head"><h1 id="reading-list-title">Your Reading List</h1><button class="quiet-link" data-view="library-view">View all</button></div>`:`<div class="reading-head"><h1 id="reading-list-title">Your Reading List</h1><button class="quiet-link" data-view="library-view">Open shelf</button></div><div class="empty-shelf"><strong>You haven’t saved anything yet.</strong><p>These are recommendations. Save a book and this corner becomes your clean personal list.</p></div>`)+`<div class="mini-grid">${(list.length?list.slice(0,9):recommendations(9)).map(miniCard).join('')}</div>`}
function renderFeatured(){const grid=document.querySelector('.featured-grid');if(grid)grid.innerHTML=recommendations(6).map((b,i)=>featureCard(b,i>2?'lower':'')).join('')}
function renderRecent(){const r=document.querySelector('.recent');if(!r)return;const ids=state.recent.slice(0,2);r.innerHTML='<h2>Recently Read</h2>'+(ids.length?ids.map(id=>`<article class="recent-item" data-book="${id}">${coverHTML(book(id),'recent-cover')}<h3>${book(id).title}</h3></article>`).join(''):`<div class="empty-state"><h3>No recent books.</h3><p>Open any title or use Reading Now. This panel will update automatically.</p></div>`)}
function renderSidebarStats(){const s=document.querySelector('.stats');if(!s)return;const finished=Object.values(state.progress).filter(v=>+v>=100).length;s.innerHTML=`<h2>Reading Stats</h2><dl><div><dt>${state.saved.length}</dt><dd>Saved books</dd></div><div><dt>${state.liked.length}</dt><dd>Liked books</dd></div><div><dt>${finished}</dt><dd>Finished</dd></div></dl>`}
let searchAbortController = null;
let activePredictiveIndex = -1;
let searchInputTimer = null;
let liveSearchAbortController = null;
let liveSearchDebounceTimer = null;
let activeLiveSearchIndex = -1;
const LIVE_SEARCH_CACHE = new Map();

function closeLiveSearchDropdown() {
  const dropdown = document.getElementById('md-live-search-dropdown');
  if (dropdown) {
    dropdown.classList.remove('active');
    dropdown.innerHTML = '';
  }
  activeLiveSearchIndex = -1;
}

function renderDropdownItemsHTML(results, cleanQ, dropdown) {
  if (!dropdown) return;
  if (!results || results.length === 0) {
    dropdown.innerHTML = `
      <div class="md-live-empty">
        <span>No matching titles for "<strong>${cleanQ.replace(/</g, '&lt;')}</strong>"</span>
      </div>
    `;
    return;
  }

  dropdown.innerHTML = results.map((b, idx) => {
    const existingIdx = BOOKS.findIndex(kb => kb.id === b.id);
    if (existingIdx >= 0) {
      BOOKS[existingIdx] = Object.assign(BOOKS[existingIdx], b);
    } else {
      BOOKS.push(b);
    }
    state.cachedBooks[b.id] = b;

    const tLower = (b.title || '').toLowerCase();
    const gLower = (b.genre || '').toLowerCase();
    const mLower = (b.mood || '').toLowerCase();
    const fLower = (b.format || '').toLowerCase();

    // True Content-Type Classification (Purely based on scraped metadata: Manga, Manhwa, Comic, Webtoon, Web Novel, Light Novel, Book)
    const isAdult      = tLower.includes('pornhwa') || tLower.includes('doujinshi') || gLower.includes('adult') || mLower.includes('adult') || mLower.includes('smut') || mLower.includes('+18');
    const isOneShot    = gLower.includes('one-shot') || tLower.includes('one-shot') || tLower.includes('oneshot');
    const isLightNovel = fLower.includes('light novel') || gLower.includes('light novel') || tLower.includes('light novel') || (b.altTitle && b.altTitle.toLowerCase().includes('light novel')) || tLower.includes('shousetsu');
    const isWebNovel   = fLower.includes('web novel') || gLower.includes('web novel') || tLower.includes('web novel') || (fLower === 'novels' && !isLightNovel) || (gLower === 'novel' && !isLightNovel);
    const isManhwa     = fLower.includes('manhwa') || gLower.includes('manhwa') || tLower.includes('manhwa') || mLower.includes('manhwa') || fLower.includes('webtoon') || gLower.includes('webtoon');
    const isManhua     = fLower.includes('manhua') || gLower.includes('manhua') || tLower.includes('manhua') || mLower.includes('manhua');
    const isComic      = fLower.includes('comic') || gLower.includes('comic') || tLower.includes('comic');
    const isManga      = b.id.startsWith('mangadna-') || b.id.startsWith('mangabuddy-') || b.id.startsWith('mangapill-') || fLower.includes('manga') || gLower.includes('manga') || tLower.includes('manga') || mLower.includes('manga');

    let typeLabel = 'BOOK';
    if (isAdult)           { typeLabel = isManhwa ? 'MANHWA (+18)' : (isManga ? 'MANGA (+18)' : 'ADULT (+18)'); }
    else if (isOneShot)    { typeLabel = 'ONE-SHOT'; }
    else if (isLightNovel) { typeLabel = 'LIGHT NOVEL'; }
    else if (isWebNovel)   { typeLabel = 'WEB NOVEL'; }
    else if (isManhwa)     { typeLabel = 'MANHWA'; }
    else if (isManhua)     { typeLabel = 'MANHUA'; }
    else if (isComic)      { typeLabel = 'COMIC'; }
    else if (isManga)      { typeLabel = 'MANGA'; }

    let cleanAuthor = (b.author || '').replace(/@\w+/g, '').replace(/^by\s+/i, '').trim();
    const isGenericAuthor = !cleanAuthor || cleanAuthor.toLowerCase() === 'author' || cleanAuthor.toLowerCase() === 'manga artist' || cleanAuthor.toLowerCase() === 'web novel author' || cleanAuthor.toLowerCase() === 'manhwa artist';
    
    const genresList = (Array.isArray(b.genres) && b.genres.length > 0) ? b.genres : (Array.isArray(b.tags) ? b.tags : []);
    const genreStr = genresList.slice(0, 2).join(' · ');

    const metaParts = [];
    if (!isGenericAuthor) {
      metaParts.push(cleanAuthor);
    } else if (genreStr) {
      metaParts.push(genreStr);
    }
    if (b.year) metaParts.push(b.year);
    if (b.status && b.status !== 'Unknown') metaParts.push(b.status);

    const metaStr = metaParts.length > 0 ? metaParts.join(' • ') : typeLabel;

    // Determine Primary vs Secondary Display Title
    let displayTitle = (b.title || '').trim();
    let displayAlt = (b.altTitle || '').trim();

    const coverSrc = (b.cover && typeof b.cover === 'string' && (b.cover.startsWith('http') || b.cover.startsWith('/'))) 
      ? b.cover 
      : ((b.image && typeof b.image === 'string' && (b.image.startsWith('http') || b.image.startsWith('/'))) ? b.image : '');
    const firstChar = (displayTitle || 'M').charAt(0).toUpperCase();
    const fallbackBg = 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)';
    const thumbHtml = coverSrc
      ? `<img src="${coverSrc}" alt="" loading="eager" decoding="async" onerror="this.onerror=null;this.parentElement.innerHTML='<div style=\\'width:100%;height:100%;background:${fallbackBg};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#38bdf8;\\'>${firstChar}</div>';" />`
      : `<div style="width:100%;height:100%;background:${fallbackBg};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#38bdf8;">${firstChar}</div>`;

    // Filter out Korean and Cyrillic/Russian from displayAlt
    if (displayAlt && (/[\uac00-\ud7af\u1100-\u11ff]/.test(displayAlt) || /[\u0400-\u04ff]/.test(displayAlt))) {
      displayAlt = '';
    }

    const normTitle = displayTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normAlt = displayAlt.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (!displayAlt || normAlt === normTitle || normTitle.includes(normAlt) || normAlt.includes(normTitle)) {
      displayAlt = '';
    }

    // If user's query matches the altTitle better than the primary title, show the matched English/alt title first!
    if (cleanQ && displayAlt && displayAlt.toLowerCase().includes(cleanQ) && !displayTitle.toLowerCase().includes(cleanQ)) {
      const temp = displayTitle;
      displayTitle = displayAlt;
      displayAlt = temp;
    }

    const altSubHtml = displayAlt ? `<div class="md-live-alt" style="font-size:0.78rem;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;">${highlightMatchText(displayAlt, cleanQ)}</div>` : '';

    return `
      <div class="md-live-result-item" data-book-id="${b.id}" data-item-index="${idx}" role="option">
        <div class="md-live-thumb">${thumbHtml}</div>
        <div class="md-live-details">
          <div class="md-live-title">${highlightMatchText(displayTitle, cleanQ)}</div>
          ${altSubHtml}
          <div class="md-live-sub">${metaStr}</div>
        </div>
        <span class="md-live-badge" style="background:rgba(255,255,255,0.06);color:#b0b0b0;border:1px solid rgba(255,255,255,0.12);font-weight:600;">${typeLabel}</span>
      </div>
    `;
  }).join('');

  dropdown.querySelectorAll('.md-live-result-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const bookId = item.dataset.bookId;
      closeLiveSearchDropdown();
      const searchInput = document.getElementById('md-search-input');
      if (searchInput) searchInput.value = '';
      openBook(bookId);
    });
  });
}

function renderInstantContinuousSearch(query) {
  const dropdown = document.getElementById('md-live-search-dropdown');
  if (!dropdown) return;
  const rawQ = (query || '').trim();
  if (!rawQ || rawQ.length === 0) {
    closeLiveSearchDropdown();
    return;
  }

  dropdown.classList.add('active');
  const cleanQ = rawQ.toLowerCase();

  // If query is in cached map, render instantly!
  if (LIVE_SEARCH_CACHE.has(cleanQ)) {
    renderDropdownItemsHTML(LIVE_SEARCH_CACHE.get(cleanQ), rawQ, dropdown);
    return;
  }

  // Instant continuous match from in-memory library (0ms latency while typing!)
  const localList = [];
  const seenSlugs = new Set();
  const allKnown = [...(BOOKS || []), ...Object.values(state.cachedBooks || {})];
  for (const b of allKnown) {
    if (!b || !b.title) continue;
    const t = b.title.toLowerCase();
    const a = (b.author || '').toLowerCase();
    const alt = (b.altTitle || '').toLowerCase();
    if (t.includes(cleanQ) || a.includes(cleanQ) || alt.includes(cleanQ)) {
      const norm = b.title.toLowerCase().replace(/\s+(?:vol(?:ume)?\.?\s*\d+|\d+)$/i, '').replace(/[^a-z0-9]/g, '');
      if (!seenSlugs.has(norm)) {
        seenSlugs.add(norm);
        localList.push(b);
      }
    }
  }

  if (localList.length > 0) {
    renderDropdownItemsHTML(localList.slice(0, 30), rawQ, dropdown);
  } else if (!dropdown.querySelector('.md-live-result-item')) {
    dropdown.innerHTML = `
      <div class="md-live-loading">
        <div class="md-live-spinner"></div>
        <span>Searching across all scrapers...</span>
      </div>
    `;
  }
}

async function handleLiveSearchInput(query) {
  const dropdown = document.getElementById('md-live-search-dropdown');
  if (!dropdown) return;

  const rawQ = (query || '').trim();
  if (!rawQ || rawQ.length === 0) {
    closeLiveSearchDropdown();
    return;
  }

  if (liveSearchAbortController) liveSearchAbortController.abort();
  liveSearchAbortController = new AbortController();

  try {
    const cleanQ = rawQ
      .replace(/\[([^\]]+)\]\([^\)]+\)/gi, '$1')
      .replace(/https?:\/\/[^\s]+/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    const res = await fetch(`/api/books/search?q=${encodeURIComponent(cleanQ)}`, {
      signal: liveSearchAbortController.signal
    });
    const data = await res.json().catch(() => []);

    const qLower = cleanQ.toLowerCase();
    const localMatches = (BOOKS || []).filter(b => 
      (b.title && b.title.toLowerCase().includes(qLower)) || 
      (b.author && b.author.toLowerCase().includes(qLower))
    );

    const list = [...(data || []), ...localMatches];

    const uniqueMap = new Map();
    list.forEach(b => {
      const cleanTitle = (b.title || '').trim().replace(/\s+(?:vol(?:ume)?\.?\s*\d+|\d+)$/i, '');
      const normKey = cleanTitle.toLowerCase()
        .replace(/\b(i'm|im)\b/g, 'iam')
        .replace(/\b(you're)\b/g, 'youare')
        .replace(/\b(it's)\b/g, 'itis')
        .replace(/\b(who's)\b/g, 'whois')
        .replace(/\b(don't)\b/g, 'donot')
        .replace(/\b(can't)\b/g, 'cannot')
        .replace(/\s*(?:manga|manhwa|webtoon|comic|novel|scanlation|scans|official|raw)\s*$/i, '')
        .replace(/[^a-z0-9]/g, '');
      if (!uniqueMap.has(normKey)) {
        uniqueMap.set(normKey, b);
      }
    });

    const results = [...uniqueMap.values()].slice(0, 40);
    LIVE_SEARCH_CACHE.set(qLower, results);
    renderDropdownItemsHTML(results, cleanQ, dropdown);

  } catch (err) {
    if (err.name !== 'AbortError' && !dropdown.querySelector('.md-live-result-item')) {
      dropdown.innerHTML = `
        <div class="md-live-empty">
          <span>Search failed. Is the server running?</span>
        </div>
      `;
    }
  }
}

function highlightMatchText(text, query) {
  if (!text || !query) return text || '';
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  return text.replace(regex, '<mark style="background:#ff6740;color:#fff;padding:0 2px;border-radius:2px;font-weight:700;">$1</mark>');
}

async function renderSearch(){
  const results=document.querySelector('.search-results');if(!results)return;
  document.querySelectorAll('.filter-row button').forEach(btn=>{const key=btn.dataset.filter||btn.textContent.toLowerCase().replace(' books','').replace(' ','-');btn.dataset.filter=key;btn.setAttribute('aria-pressed',state.searchFilter===key)});
  let q=(document.querySelector('#book-search')?.value||'').trim();

  if(!q){
    results.innerHTML='';
    return;
  }

  q = q.replace(/\[([^\]]+)\]\([^\)]+\)/gi, '$1')
       .replace(/https?:\/\/[^\s]+/gi, '')
       .replace(/webnovel\.com[^\s]*/gi, '')
       .replace(/₹[\d\.]+/gi, '')
       .replace(/\b[1-5]\.\d\b/g, '')
       .replace(/amazon\.in|flipkart|session \d{4}-\d{2}/gi, '')
       .replace(/\s+/g, ' ')
       .trim()
       .slice(0, 100);

  if (searchAbortController) searchAbortController.abort();
  searchAbortController = new AbortController();

  try {
    const res = await fetch(`/api/books/search?q=${encodeURIComponent(q)}`, { signal: searchAbortController.signal });
    const remoteList = await res.json().catch(() => []);

    const qLower = q.toLowerCase();
    const localMatches = BOOKS.filter(b => 
      (b.title && b.title.toLowerCase().includes(qLower)) || 
      (b.author && b.author.toLowerCase().includes(qLower)) ||
      (b.genre && b.genre.toLowerCase().includes(qLower))
    );

    const list = [...(remoteList || []), ...localMatches];

    if (list && list.length > 0) {
      const uniqueMap = new Map();
      list.forEach(b => {
        const cleanTitle = (b.title || '')
          .replace(/- telegram manga.*/i, '')
          .replace(/- animmaster.*/i, '')
          .replace(/- vault search.*/i, '')
          .replace(/- post from.*/i, '')
          .replace(/\s*@\w+\s*/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        b.title = cleanTitle;

        const normKey = cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!uniqueMap.has(normKey)) {
          uniqueMap.set(normKey, b);
        } else {
          const existing = uniqueMap.get(normKey);
          if (!existing.image && b.image) {
            existing.image = b.image;
            existing.cover = 'has-image teal';
          }
          if ((!existing.author || existing.author === 'Author') && b.author) {
            existing.author = b.author;
          }
        }
      });

      const uniqueList = [...uniqueMap.values()];
      const isMdSearch = document.body.classList.contains('md-search-active');
      const targetContainer = document.querySelector(isMdSearch ? '#md-search-results-grid' : '.search-results') || results;

      const html = uniqueList.map(b => {
        const existingIdx = BOOKS.findIndex(kb => kb.id === b.id);
        if (existingIdx >= 0) {
          BOOKS[existingIdx] = Object.assign(BOOKS[existingIdx], b);
        } else {
          BOOKS.push(b);
        }
        state.cachedBooks[b.id] = b;

        let cleanAuthor = (b.author || '').trim();
        cleanAuthor = cleanAuthor
          .replace(/@\w+/g, '')
          .replace(/\b(telegram|manhwa18|mangabuddy|mangapill|channel|global vault|complete series|high.?res)\b/gi, '')
          .replace(/^by\s+/i, '')
          .trim();
        if (!cleanAuthor || cleanAuthor.toLowerCase() === 'author' || cleanAuthor.toLowerCase() === 'royal road author') {
          cleanAuthor = b.id.startsWith('royalroad-') ? 'Royal Road Author' : (b.id.startsWith('private-tg-') || b.id.startsWith('telegram-') || b.id.startsWith('manhwa18-') || b.id.startsWith('mangabuddy-') ? 'Manga Artist' : 'Classic Author');
        }

        const rawYear = b.year || b.releaseDate || b.publishedDate || '';
        const yearMatch = String(rawYear).match(/\d{4}/);
        const yearStr = yearMatch ? yearMatch[0] : '';
        const rawAlt = (b.altTitle || '').trim();
        const normTitle = (b.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const normAlt = rawAlt.toLowerCase().replace(/[^a-z0-9]/g, '');
        const validAlt = (rawAlt && normAlt !== normTitle && !normTitle.includes(normAlt) && !normAlt.includes(normTitle)) ? rawAlt : '';

        let subtitleLine = validAlt ? `${validAlt} • ${cleanAuthor}` : (yearStr && !cleanAuthor.includes(yearStr) ? `${cleanAuthor} • ${yearStr}` : cleanAuthor);

        const tLower = (b.title || '').toLowerCase();
        const gLower = (b.genre || '').toLowerCase();
        const mLower = (b.mood || '').toLowerCase();

        const isAdult    = tLower.includes('pornhwa') || tLower.includes('doujinshi') || gLower.includes('adult') || mLower.includes('adult') || mLower.includes('smut') || b.id.startsWith('manhwa18-');
        const isOneShot  = gLower === 'one-shot' || tLower.includes('one-shot') || tLower.includes('oneshot');
        const isManhua   = gLower === 'manhua' || tLower.includes('manhua') || mLower.includes('manhua');
        const isManhwa   = b.id.startsWith('manhwa18-') || gLower === 'manhwa' || tLower.includes('manhwa') || mLower.includes('manhwa');
        const isLightNovel = gLower === 'light novel' || tLower.includes('light novel') || (b.altTitle && b.altTitle.toLowerCase().includes('light novel')) || tLower.includes('shousetsu');
        const isWebNovel = b.id.startsWith('royalroad-') || gLower === 'web novel' || tLower.includes('web novel') || (gLower.includes('novel') && !isLightNovel);
        const isMangaType = b.id.startsWith('mangadna-') || b.id.startsWith('mangapill-') || b.id.startsWith('mangabuddy-') || b.id.startsWith('telegram-') || b.id.startsWith('private-tg-') || gLower.includes('manga') || mLower.includes('manga');

        let typeLabel = 'BOOK';
        let typeBg    = '#d97706';

        if (isAdult)          { typeLabel = isManhwa ? 'MANHWA (+18)' : isMangaType ? 'MANGA (+18)' : 'ADULT (+18)'; typeBg = '#dc2626'; }
        else if (isOneShot)   { typeLabel = 'ONE-SHOT';    typeBg = '#6366f1'; }
        else if (isLightNovel){ typeLabel = 'LIGHT NOVEL'; typeBg = '#9333ea'; }
        else if (isManhua)    { typeLabel = 'MANHUA';     typeBg = '#0891b2'; }
        else if (isManhwa)    { typeLabel = 'MANHWA';     typeBg = '#16a34a'; }
        else if (isWebNovel)  { typeLabel = 'WEB NOVEL';  typeBg = '#7c3aed'; }
        else if (isMangaType) { typeLabel = 'MANGA';      typeBg = '#2563eb'; }

        const imgStyle = b.image ? `background-image:url('${b.image}');background-size:cover;background-position:center;` : '';

        if (isMdSearch) {
          // New Mangadex grid search rendering
          return `
            <div class="md-cover-card" style="cursor:pointer;position:relative;" onclick="openBook('${b.id}')" title="${b.title.replace(/"/g, '&quot;')}">
              <div class="md-card-img" style="${imgStyle}">
                <span class="md-card-badge" style="position:absolute;top:6px;left:6px;background:rgba(0,0,0,0.65);color:#b0b0b0;border:1px solid rgba(255,255,255,0.15);padding:2px 6px;border-radius:4px;font-size:0.65rem;font-weight:600;letter-spacing:0.02em;backdrop-filter:blur(4px);">${typeLabel}</span>
              </div>
              <div class="md-card-title">${highlightMatchText(b.title, q)}</div>
              ${yearStr ? `<div style="font-size:0.72rem;color:rgba(255,255,255,0.5);margin-top:2px;">${yearStr}</div>` : ''}
            </div>
          `;
        }

        const catBadge = `<span style="background:rgba(255,255,255,0.06);color:#b0b0b0;border:1px solid rgba(255,255,255,0.12);padding:3px 8px;border-radius:4px;font-size:0.72rem;font-weight:600;flex-shrink:0;letter-spacing:0.03em;">${typeLabel}</span>`;

        return `<div class="search-result-item" data-book="${b.id}" onclick="openBook('${b.id}')" style="cursor:pointer;display:flex;align-items:center;gap:16px;padding:14px 16px;border-bottom:1px solid #2a2a2a;border-radius:8px;margin-bottom:8px;background:#141414;transition:background 0.2s ease;" onmouseover="this.style.background='#1f1f1f'" onmouseout="this.style.background='#141414'">
          <span class="result-cover ${(b.cover||'').split(' ')[0]}" style="${imgStyle};width:44px;height:60px;border-radius:6px;flex-shrink:0;"></span>
          <div style="flex:1;min-width:0;">
            <strong style="display:block;font-size:1.05rem;color:#fff;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${highlightMatchText(b.title, q)}</strong>
            <em style="color:#aaa;font-size:0.85rem;font-style:normal;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block;">${subtitleLine}</em>
          </div>
          <div>
            ${catBadge}
          </div>
        </div>`;
      }).join('');
      
      targetContainer.innerHTML = html;
      saveState();
    } else {
      results.innerHTML = '<div class="empty-library"><h3>No results found.</h3></div>';
    }
  } catch(err) {
    if (err.name !== 'AbortError') {
      results.innerHTML = '<div class="empty-library"><h3>Search error. Is the server running?</h3></div>';
    }
  }
}
window.chapterSortOrder = window.chapterSortOrder || 'desc';

window.toggleChapterSort = function(bookId) {
  window.chapterSortOrder = window.chapterSortOrder === 'desc' ? 'asc' : 'desc';
  renderDetail();
};

window.filterChapterGrid = function(query) {
  const q = (query || '').toLowerCase().trim();
  const boxes = document.querySelectorAll('.mangapill-ch-box');
  boxes.forEach(box => {
    const title = (box.dataset.chapterTitle || box.textContent || '').toLowerCase();
    box.style.display = (!q || title.includes(q)) ? 'block' : 'none';
  });
};

function renderDetail(rawId) {
  const id = rawId || state.currentBook;
  if (!id) return;
  state.currentBook = id;
  const b = book(id);
  const g = document.querySelector('#book-detail .detail-grid');
  if (!b || !g) return;

  const chapters = Array.isArray(b.chapters) ? b.chapters : [];

  // Clean Titles & Alternate Titles
  const rawTitle = b.title || 'Untitled';
  const parts = rawTitle.split(/\|\||\/\/|::/).map(s => s.trim()).filter(Boolean);
  const mainTitle = parts[0] || rawTitle;
  
  // Extract and filter alternative titles (Keep English and Japanese Romaji/Kanji, filter out Korean Hangul and Cyrillic/Russian)
  let rawAltCandidates = [];
  if (b.altTitle && typeof b.altTitle === 'string') {
    rawAltCandidates.push(...b.altTitle.split(/[,;\/|•]+/).map(s => s.trim()).filter(Boolean));
  }
  if (parts.length > 1) {
    rawAltCandidates.push(...parts.slice(1).map(s => s.trim()).filter(Boolean));
  }
  
  // Korean Hangul regex: [\uac00-\ud7af\u1100-\u11ff]
  // Cyrillic regex: [\u0400-\u04ff]
  const hasKorean = /[\uac00-\ud7af\u1100-\u11ff]/;
  const hasCyrillic = /[\u0400-\u04ff]/;
  const cleanAltTitles = [...new Set(rawAltCandidates.filter(t => {
    if (!t || t.length < 2) return false;
    if (t.toLowerCase() === mainTitle.toLowerCase()) return false;
    if (hasKorean.test(t)) return false;
    if (hasCyrillic.test(t)) return false;
    return true;
  }))].slice(0, 3);
  
  let altTitle = cleanAltTitles.join(' · ');

  // Extract / Map Author
  let authorLine = (b.author || 'Manga Artist').trim()
    .replace(/@\w+/g, '')
    .replace(/\b(telegram|manhwa18|mangabuddy|mangapill|channel|global vault|complete series|high.?res)\b/gi, '')
    .replace(/^by\s+/i, '')
    .trim();
  if (!authorLine || authorLine.toLowerCase() === 'author') authorLine = 'Manga Artist';

  // Extract Tags & Category Pills (MangaDex style)
  const tagSet = new Set();
  if (Array.isArray(b.genres)) {
    b.genres.forEach(g => {
      if (g && typeof g === 'string') tagSet.add(g.trim().toUpperCase());
    });
  }
  if (Array.isArray(b.tags)) {
    b.tags.forEach(t => {
      if (t && typeof t === 'string') tagSet.add(t.trim().toUpperCase());
    });
  }
  const tLower = (mainTitle + ' ' + (b.synopsis || '') + ' ' + (b.genre || '') + ' ' + (b.mood || '')).toLowerCase();
  
  if (b.genre) tagSet.add(b.genre.toUpperCase());
  if (tLower.includes('ecchi') || tLower.includes('erotica') || tLower.includes('nsfw')) tagSet.add('EROTICA');
  if (tLower.includes('reincarnat') || tLower.includes('isekai') || tLower.includes('tensei')) tagSet.add('REINCARNATION');
  if (tLower.includes('genderswap') || tLower.includes('ts ')) tagSet.add('GENDERSWAP');
  if (tLower.includes('psychological')) tagSet.add('PSYCHOLOGICAL');
  if (tLower.includes('romance') || tLower.includes('romantic')) tagSet.add('ROMANCE');
  if (tLower.includes('comedy')) tagSet.add('COMEDY');
  if (tLower.includes('harem')) tagSet.add('HAREM');
  if (tLower.includes('drama')) tagSet.add('DRAMA');
  if (tLower.includes('school')) tagSet.add('SCHOOL LIFE');
  if (tLower.includes('action')) tagSet.add('ACTION');
  if (tLower.includes('adventure')) tagSet.add('ADVENTURE');
  if (tLower.includes('fantasy')) tagSet.add('FANTASY');
  if (tLower.includes('demon')) tagSet.add('DEMONS');
  if (tLower.includes('magic')) tagSet.add('MAGIC');
  if (tLower.includes('supernatural')) tagSet.add('SUPERNATURAL');
  if (tLower.includes('one-shot') || tLower.includes('oneshot')) tagSet.add('ONE-SHOT');
  if (tLower.includes('adaptation')) tagSet.add('ADAPTATION');
  if (tagSet.size === 0) tagSet.add('MANGA');

  const pillsHTML = [...tagSet].slice(0, 10).map(tag => {
    const isErotic = (tag === 'EROTICA' || tag === 'ECCHI' || tag === 'MATURE');
    return `<span class="md-tag ${isErotic ? 'md-tag-erotica' : ''}">${tag}</span>`;
  }).join('');

  const statusStr = (b.status || (tLower.includes('finished') || tLower.includes('completed') ? 'FINISHED' : 'ONGOING')).toUpperCase();
  const yearStr = b.year || (b.releaseDate ? b.releaseDate.slice(0, 4) : '2024');

  // Chapter Sorting & Grid Assembly
  const isDesc = (window.chapterSortOrder === 'desc');
  let displayChapters = chapters.map((ch, originalIdx) => ({ ch, originalIdx }));
  if (isDesc) {
    displayChapters.reverse();
  }

  let chapterGridHTML = '';
  const isBookItem = (b.format && b.format.toLowerCase() === 'book') || b.id.startsWith('itunes-') || b.id.startsWith('openlib-') || b.id.startsWith('book-');

  if (isBookItem) {
    const encodedTitle = encodeURIComponent(b.title);
    const plusTitle = encodeURIComponent(b.title).replace(/%20/g, '+');
    chapterGridHTML = `
      <div class="book-download-section" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:24px;margin-top:20px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
          <span style="font-size:1.6rem;">📚</span>
          <div>
            <h3 style="color:#ffffff;font-size:1.2rem;margin:0;font-weight:700;">Complete Digital Book Vault</h3>
            <span style="font-size:0.8rem;color:#10b981;font-weight:600;">✨ Verified Direct EPUB & PDF Mirrors</span>
          </div>
        </div>
        <p style="color:#94a3b8;font-size:0.9rem;line-height:1.6;margin-bottom:20px;">
          This title is cataloged in the Bibliothèque digital repository. Choose a 1-click backdoor mirror below to download the complete unabridged e-book, or launch it directly in the web reader:
        </p>
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:12px;">
          <a href="https://annas-archive.org/search?q=${plusTitle}&ext=epub" target="_blank" rel="noopener" style="background:#0284c7;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-size:0.9rem;display:flex;align-items:center;justify-content:center;gap:8px;font-weight:700;transition:transform 0.15s ease;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
            🏴‍☠️ Anna's Archive (1-Click EPUB)
          </a>
          <a href="https://oceanofpdf.com/?s=${plusTitle}" target="_blank" rel="noopener" style="background:#059669;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-size:0.9rem;display:flex;align-items:center;justify-content:center;gap:8px;font-weight:700;transition:transform 0.15s ease;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
            🌊 OceanofPDF (EPUB / PDF)
          </a>
          <a href="http://libgen.is/search.php?req=${encodedTitle}" target="_blank" rel="noopener" style="background:#4f46e5;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-size:0.9rem;display:flex;align-items:center;justify-content:center;gap:8px;font-weight:700;transition:transform 0.15s ease;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
            🏛️ LibGen (Global Library Mirror)
          </a>
          <button onclick="openReader('${b.id}')" style="background:#ea580c;color:#fff;border:none;padding:12px 18px;border-radius:8px;font-size:0.9rem;display:flex;align-items:center;justify-content:center;gap:8px;font-weight:700;cursor:pointer;transition:transform 0.15s ease;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
            📖 Open In-Browser Reader
          </button>
        </div>
      </div>
    `;
  } else if (chapters.length > 0) {
    const boxesHTML = displayChapters.map(({ ch, originalIdx }) => {
      let cleanChName = ch.title || `Chapter ${originalIdx + 1}`;
      const numMatch = cleanChName.match(/(?:chapter|ch\.?)\s*(\d+(?:\.\d+)?)/i);
      const shortName = numMatch ? `Chapter ${numMatch[1]}` : cleanChName;

      return `<a href="#/read/${b.id}/${originalIdx + 1}" 
                 class="mangapill-ch-box" 
                 data-action="open-chapter" 
                 data-book="${b.id}" 
                 data-chapter-index="${originalIdx}" 
                 data-chapter-title="${cleanChName.toLowerCase()}">
                 ${shortName}
              </a>`;
    }).join('');

    chapterGridHTML = `
      <div class="mangapill-chapters-section">
        <div class="mangapill-chapters-header">
          <div class="mangapill-chapters-heading">
            <span>📖 Chapters</span>
            <span style="font-size:0.85rem;color:#38bdf8;font-weight:700;background:rgba(56,189,248,0.12);padding:2px 8px;border-radius:12px;">${chapters.length}</span>
          </div>
          <div class="mangapill-controls-wrap">
            <input type="text" 
                   class="mangapill-search-input" 
                   placeholder="Search chapter..." 
                   oninput="window.filterChapterGrid(this.value)">
            <button class="mangapill-sort-btn" onclick="window.toggleChapterSort('${b.id}')">
              ${isDesc ? '↓ Descending' : '↑ Ascending'}
            </button>
          </div>
        </div>
        <div class="mangapill-grid" id="mangapill-chapters-grid">
          ${boxesHTML}
        </div>
      </div>`;
  } else {
    chapterGridHTML = `
      <div class="mangapill-chapters-section" style="text-align:center;padding:48px 20px;">
        <div style="display:inline-block;width:28px;height:28px;border:3px solid #38bdf8;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;margin-bottom:14px;"></div>
        <h4 style="color:#ffffff;margin:0 0 6px 0;font-size:1.1rem;font-weight:700;">Fetching High-Resolution Chapters...</h4>
        <p style="color:#94a3b8;font-size:0.88rem;margin:0 0 20px 0;">Connecting to Mangapill & high-speed scanlation mirrors</p>
        <button class="md-btn-primary" data-action="read" data-book="${b.id}" style="padding:10px 24px;font-size:0.95rem;margin:0 auto;">
          ⚡ Read First Chapter
        </button>
      </div>`;
  }

  const validCover = (b.cover && typeof b.cover === 'string' && (b.cover.startsWith('http') || b.cover.startsWith('/'))) ? b.cover : ((b.image && typeof b.image === 'string' && (b.image.startsWith('http') || b.image.startsWith('/'))) ? b.image : '');
  const bookBg = (b.banner && typeof b.banner === 'string' && (b.banner.startsWith('http') || b.banner.startsWith('/'))) ? b.banner : validCover;
  const coverSrc = validCover;
  const firstChIdx = 0;

  // Determine Source Provider for bracket annotation
  let sourceName = 'Bibliothèque Digital Archive';
  const bid = (b.id || '').toLowerCase();
  const bSource = (b._source || b.source || '').toLowerCase();
  if (bid.startsWith('mdna-') || bid.startsWith('mangadna-') || bSource.includes('mangadna')) {
    sourceName = 'MangaDNA';
  } else if (bid.startsWith('mangapill-') || bSource.includes('mangapill')) {
    sourceName = 'Mangapill';
  } else if (bid.startsWith('mb-') || bid.startsWith('mangabuddy-') || bSource.includes('mangabuddy')) {
    sourceName = 'MangaBuddy';
  } else if (bid.startsWith('m18-') || bid.startsWith('manhwa18-') || bSource.includes('manhwa18')) {
    sourceName = 'Manhwa18';
  } else if (bid.startsWith('itunes-') || bid.startsWith('apple-') || bSource.includes('apple')) {
    sourceName = 'Apple Books';
  } else if (bid.startsWith('royalroad-') || bSource.includes('royalroad')) {
    sourceName = 'Royal Road';
  } else if (bid.startsWith('tg-') || bSource.includes('telegram')) {
    sourceName = 'Telegram Scans';
  } else if (b.isBook || b.format === 'Book') {
    sourceName = 'Apple Books';
  }

  const sourceBracketHTML = ` <span class="synopsis-source-bracket" style="opacity:0.75;font-size:0.85em;color:#38bdf8;font-weight:600;display:inline-block;margin-left:4px;">[Source: ${sourceName}]</span>`;

  // Format synopsis into clean readable paragraphs with dynamic loading state
  const isPendingMetadata = (!b.synopsis || b.synopsis.trim().length === 0) && (!b.chapters || b.chapters.length === 0);
  const rawSynopsis = (b.synopsis && b.synopsis.trim().length > 0)
    ? b.synopsis.trim()
    : (isPendingMetadata 
        ? `Fetching official synopsis, genre tags, and chapter list from digital scanlation archives...`
        : `${mainTitle} is currently cataloged in the Bibliothèque digital library with high-resolution chapters and reading panels.`);
  
  const rawParas = rawSynopsis.split(/\n+/).map(p => p.trim()).filter(Boolean);
  const synopsisParagraphs = rawParas.map((para, pIdx) => {
    if (pIdx === rawParas.length - 1 && !isPendingMetadata) {
      return `<p>${para}${sourceBracketHTML}</p>`;
    }
    return `<p>${para}</p>`;
  }).join('');

  g.innerHTML = `
    <div class="md-detail-wrapper">
      <!-- Back Navigation Button -->
      <button class="md-detail-back-btn md-nav-back-pill" data-action="back-to-home" style="position:fixed;top:16px;left:20px;z-index:99999;display:flex;align-items:center;gap:6px;background:rgba(20,24,33,0.92);color:#ffffff;border:1px solid rgba(255,255,255,0.18);padding:6px 16px;border-radius:9999px;font-size:0.85rem;font-weight:700;cursor:pointer;backdrop-filter:blur(16px);box-shadow:0 4px 16px rgba(0,0,0,0.6);transition:all 0.18s ease;">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        <span>Back</span>
      </button>

      <!-- 0. FULL SCREEN FIXED BACKGROUND IMAGE (Dynamic per book, slightly blurred & framed up) -->
      <div class="md-bg-fixed-layer" ${bookBg ? `style="background-image: url('${bookBg}');"` : ''}></div>

      <!-- 1. SLATE GREY GLASSY PALETTE (Covers bottom half of screen above image, behind text) -->
      <div class="md-glassy-bottom-palette"></div>

      <!-- 2. MAIN CONTENT OVERLAY (Z-Index on top of everything) -->
      <div class="md-hero-content">
        
        <!-- UPPER ROW: Cover on Left, Meta on Right -->
        <div class="md-hero-top-row">
          
          <!-- LEFT: Cover Poster -->
          <div class="md-cover-container">
            <div class="md-cover-card">
              ${coverSrc ? `<img src="${coverSrc}" alt="${mainTitle} cover" loading="eager" onerror="this.parentElement.innerHTML='<div class=\\'md-no-cover\\'>📖</div>';">` : `<div class="md-no-cover">📖</div>`}
              <div class="md-flag-badge">🇯🇵</div>
            </div>
          </div>

          <!-- RIGHT: Titles & Palette Controls -->
          <div class="md-meta-container">
            
            <!-- SECTION 1: IN BANNER (Titles) -->
            <div class="md-banner-titles">
              <p class="md-title-text">${mainTitle}</p>
              ${altTitle ? `<div class="md-subtitle-text" style="color:#94a3b8;font-size:0.9rem;margin-top:4px;font-style:italic;"><span style="color:#38bdf8;font-style:normal;font-weight:700;font-size:0.8rem;text-transform:uppercase;margin-right:6px;letter-spacing:0.5px;">Alt:</span>${altTitle}</div>` : ''}
              <div class="md-grow-spacer"></div>
              <div class="md-author-row">
                <div class="md-author-text">${authorLine}</div>
              </div>
            </div>

            <!-- SECTION 2: IN SOLID DARK PALETTE (Actions, Tags, Stats) -->
            <div class="md-palette-controls">
              <!-- Action Buttons (MangaDex Structure - Compact Sizing) -->
              <div class="md-actions-bar flex items-center gap-2 mb-4">
                <div data-v-eec794c8="">
                  <button data-v-0d08c737="" class="flex grow-0 whitespace-nowrap px-2 sm:px-3 rounded custom-opacity relative md-btn flex items-center px-3 overflow-hidden primary glow md-btn-primary" style="min-height: 2.5rem; min-width: 11rem;" data-action="save" data-book="${b.id}">
                    <span data-v-0d08c737="" class="flex relative items-center justify-center font-medium select-none w-full pointer-events-none" style="justify-content: center; font-size: 0.85rem;">
                      <svg width="17" height="17" fill="${saved(b.id)?'#fff':'none'}" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="margin-right: 6px;"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                      ${saved(b.id) ? 'In Library' : 'Add To Library'}
                    </span>
                  </button>
                </div>
                <button data-v-0d08c737="" data-v-f609756d="" class="grow sm:grow-0 rounded custom-opacity relative md-btn flex items-center px-3 overflow-hidden accent px-0! md-btn-icon" style="min-height: 2.5rem; min-width: 2.5rem; width: 2.5rem; height: 2.5rem;" data-action="read" data-book="${b.id}" title="Read Chapter 1">
                  <span data-v-0d08c737="" class="flex relative items-center justify-center font-medium select-none w-full pointer-events-none" style="justify-content: center;">
                    <svg data-v-12787016="" data-v-0d08c737="" xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feather feather-book-open icon size-6" viewBox="0 0 24 24" style="color: currentcolor;"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zm20 0h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
                  </span>
                </button>
                <button data-v-0d08c737="" data-v-f609756d="" class="grow sm:grow-0 rounded custom-opacity relative md-btn flex items-center px-3 overflow-hidden accent px-0! md-btn-icon" style="min-height: 2.5rem; min-width: 2.5rem; width: 2.5rem; height: 2.5rem;" data-action="like" data-book="${b.id}" title="${liked(b.id)?'Liked':'Like'}">
                  <span data-v-0d08c737="" class="flex relative items-center justify-center font-medium select-none w-full pointer-events-none" style="justify-content: center;">
                    <svg width="18" height="18" fill="${liked(b.id)?'#ff6740':'none'}" stroke="${liked(b.id)?'#ff6740':'currentColor'}" stroke-width="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  </span>
                </button>
              </div>

              <!-- Category / Tags & Publication Status Row (MangaDex Structure) -->
              <div data-v-f609756d="" class="flex gap-1 flex-wrap items-center md-tags-bar" style="display:flex; flex-wrap:wrap; gap:5px; align-items:center; margin-bottom:8px;">
                <div data-v-00635587="" data-v-f609756d="" class="flex flex-wrap gap-1 tags-row" style="display:flex; flex-wrap:wrap; gap:3px;">
                  ${pillsHTML}
                </div>
                <span data-v-1d4c90c6="" data-v-f609756d="" class="tag dot no-wrapper sm:font-bold uppercase md-status-bullet" style="display:inline-flex; align-items:center; gap:3px; font-size:10px; color:#cbd5e1; font-weight:700;">
                  <svg data-v-12787016="" data-v-1d4c90c6="" xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 6.35 6.35" class="icon size-6" style="color: #22c55e;"><path fill="currentColor" d="M4.233 3.175a1.06 1.06 0 0 1-1.058 1.058 1.06 1.06 0 0 1-1.058-1.058 1.06 1.06 0 0 1 1.058-1.058 1.06 1.06 0 0 1 1.058 1.058"></path></svg>
                  <span data-v-1d4c90c6="">Publication: ${yearStr}, ${statusStr.charAt(0) + statusStr.slice(1).toLowerCase()}</span>
                </span>
              </div>

              <!-- Stats Row (MangaDex Feather SVG Spec & Rating Flyout) -->
              <div data-v-f609756d="" class="flex gap-3 flex-wrap items-center text-xs md-stats-bar" style="display:flex; gap:12px; flex-wrap:wrap; align-items:center;">
                <span data-v-f609756d="" class="flex items-center relative group cursor-pointer md-stat-rating-item" title="${b.rating || '8.08'} (Bayesian), ${b.rating || '8.07'} (Average)" style="display:flex; align-items:center; position:relative; cursor:pointer;">
                  <svg data-v-12787016="" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feather feather-star icon size-6 rel text-primary mr-1" viewBox="0 0 24 24" style="color: #ff6740; margin-right: 3px;"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"></path></svg>
                  <span class="text-primary" style="color:#ff6740; font-weight:700; font-size:0.76rem;">${b.rating || '8.08'}</span>
                  <div data-v-78a6f686="" class="flyout hidden group-hover:block md-rating-flyout">
                    <table data-v-78a6f686="">
                      <tr data-v-78a6f686=""><td data-v-78a6f686="">10</td><td data-v-78a6f686=""><div data-v-78a6f686="" class="bar" style="--width: 100%;"></div></td><td data-v-78a6f686=""></td><td data-v-78a6f686="" class="text-xs" title="164"> (164) </td></tr>
                      <tr data-v-78a6f686=""><td data-v-78a6f686="">9</td><td data-v-78a6f686=""><div data-v-78a6f686="" class="bar" style="--width: 48.7%;"></div></td><td data-v-78a6f686=""></td><td data-v-78a6f686="" class="text-xs" title="80"> (80) </td></tr>
                      <tr data-v-78a6f686=""><td data-v-78a6f686="">8</td><td data-v-78a6f686=""><div data-v-78a6f686="" class="bar" style="--width: 64.6%;"></div></td><td data-v-78a6f686=""></td><td data-v-78a6f686="" class="text-xs" title="106"> (106) </td></tr>
                      <tr data-v-78a6f686=""><td data-v-78a6f686="">7</td><td data-v-78a6f686=""><div data-v-78a6f686="" class="bar" style="--width: 31.7%;"></div></td><td data-v-78a6f686=""></td><td data-v-78a6f686="" class="text-xs" title="52"> (52) </td></tr>
                      <tr data-v-78a6f686=""><td data-v-78a6f686="">6</td><td data-v-78a6f686=""><div data-v-78a6f686="" class="bar" style="--width: 15.2%;"></div></td><td data-v-78a6f686=""></td><td data-v-78a6f686="" class="text-xs" title="25"> (25) </td></tr>
                      <tr data-v-78a6f686=""><td data-v-78a6f686="">5</td><td data-v-78a6f686=""><div data-v-78a6f686="" class="bar" style="--width: 9.1%;"></div></td><td data-v-78a6f686=""></td><td data-v-78a6f686="" class="text-xs" title="15"> (15) </td></tr>
                      <tr data-v-78a6f686=""><td data-v-78a6f686="">4</td><td data-v-78a6f686=""><div data-v-78a6f686="" class="bar" style="--width: 4.2%;"></div></td><td data-v-78a6f686=""></td><td data-v-78a6f686="" class="text-xs" title="7"> (7) </td></tr>
                      <tr data-v-78a6f686=""><td data-v-78a6f686="">3</td><td data-v-78a6f686=""><div data-v-78a6f686="" class="bar" style="--width: 3.0%;"></div></td><td data-v-78a6f686=""></td><td data-v-78a6f686="" class="text-xs" title="5"> (5) </td></tr>
                      <tr data-v-78a6f686=""><td data-v-78a6f686="">2</td><td data-v-78a6f686=""><div data-v-78a6f686="" class="bar" style="--width: 0%;"></div></td><td data-v-78a6f686=""></td><td data-v-78a6f686="" class="text-xs" title="0"> (0) </td></tr>
                      <tr data-v-78a6f686=""><td data-v-78a6f686="">1</td><td data-v-78a6f686=""><div data-v-78a6f686="" class="bar" style="--width: 15.2%;"></div></td><td data-v-78a6f686=""></td><td data-v-78a6f686="" class="text-xs" title="25"> (25) </td></tr>
                    </table>
                  </div>
                </span>
                <span data-v-f609756d="" class="flex items-center cursor-pointer" title="14,940" style="display:flex; align-items:center; gap:3px; color:#cbd5e1; font-size:0.76rem;">
                  <svg data-v-12787016="" xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" class="icon size-6 rel mr-1" style="color: currentcolor;"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                  <span>14k</span>
                </span>
                <a data-v-5dffb448="" data-v-f609756d="" class="router-link-active router-link-exact-active comment-container" style="display:flex; align-items:center; gap:3px; text-decoration:none; color:#cbd5e1; cursor:pointer; font-size:0.76rem;">
                  <svg data-v-12787016="" data-v-5dffb448="" xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" class="icon size-6 small text-icon-contrast"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                  <span data-v-5dffb448="">14</span>
                </a>
                <span data-v-f609756d="" class="flex items-center opacity-40" style="display:flex; align-items:center; gap:3px; opacity:0.4; color:#cbd5e1; font-size:0.76rem;">
                  <svg data-v-12787016="" data-v-f609756d="" xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feather feather-eye icon size-6 rel mr-1" viewBox="0 0 24 24" style="color: currentcolor;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  <span>N/A</span>
                </span>
              </div>
            </div>

          </div>
        </div>

        <!-- LOWER ROW: Clean Synopsis on Dark Surface -->
        <div class="md-synopsis-deck">
          ${synopsisParagraphs}
        </div>

        <!-- MANGAPILL CHAPTERS -->
        <div class="md-chapters-deck">
          ${chapterGridHTML}
        </div>

      </div>
    </div>`;
}

function renderReader(){
  const g=document.querySelector('#reader .reader-grid');
  if(!g)return;
  const b=book(state.currentBook);
  if(!b)return;
  const chapters=b.chapters||[], total=Math.max(1,chapters.length);
  const idx=Math.max(0,Math.min(total-1,state.activeChapter||0));
  const selected=chapters[idx]||{title:'Preview Chapter',content:['The reader opens with a quiet page and remembers every setting you choose.'],quote:'A good reading room disappears around the book.'};
  const p=pct(b.id), r=state.reader, notes=state.notes[b.id]||[];
  const hasImagePanels = chapters.some(c => c?.html && c.html.includes('<img'));
  const fLower = (b.format || inferFormat(b)).toLowerCase();
  const isMangaFormat = fLower.includes('manga') || fLower.includes('manhwa') || fLower.includes('manhua') || fLower.includes('comic') || fLower.includes('webtoon');
  
  // A work is rendered as Manga only if it has image panels or is tagged as a visual comic
  const isManga = hasImagePanels || isMangaFormat;

  const chapterNav=chapters.map((c,i)=>`<a class="${i===idx?'active':''}" data-action="open-chapter" data-book="${b.id}" data-chapter-index="${i}" href="#/read/${b.id}/${i+1}" data-chapter-title="${(c.title||'').toLowerCase()}">${i+1}. ${c.title}<small>${c.minutes||12} min</small></a>`).join('');
  
  const renderTextChapter=(ch,i)=>{
    let proseHTML = '';
    if (ch.html) {
      proseHTML = ch.html;
    } else if (Array.isArray(ch.content) && ch.content.length > 0) {
      proseHTML = ch.content.map((x,j)=>`<p class="${j===0&&state.highlighted[b.id]?'highlighted':''}">${j===0?'<span class="dropcap">'+x.charAt(0)+'</span>'+x.slice(1):x}</p>`).join('');
    } else if (typeof ch.content === 'string') {
      proseHTML = ch.content.split(/\n+/).map(para => `<p>${para.trim()}</p>`).join('');
    } else {
      proseHTML = `<p>Chapter text is loading from server...</p>`;
    }

    const fig=ch.image?`<figure class="reader-figure"><img src="${ch.image}" alt="${ch.imageCaption||ch.title}"><figcaption>${ch.imageCaption||''}</figcaption></figure>`:'';
    return `<section class="chapter-block" id="chapter-${i+1}" data-chapter-index="${i}"><p class="chapter-count">Chapter ${i+1} of ${total}</p><h2>${ch.title}</h2><span class="reader-progress-note">${ch.minutes||12} min · ${ch.publicDomain?'Public domain · ':''}${b.author}</span><div class="reading-prose stolen-prose" style="font-size:var(--reader-font);line-height:var(--reader-line)">${proseHTML}${fig}${ch.quote?`<blockquote>${ch.quote}</blockquote>`:''}</div></section>`;
  };

  const renderMangaChapter=(ch,i)=>{
    if (ch.html && ch.html.includes('<img')) {
      return `<section class="chapter-block manga-chapter" id="chapter-${i+1}" data-chapter-index="${i}">${ch.html}</section>`;
    }
    const lines=ch.content||[];
    return `<section class="chapter-block manga-chapter" id="chapter-${i+1}" data-chapter-index="${i}"><p class="chapter-count">Chapter ${i+1} of ${total}</p><h2>${ch.title}</h2><div class="manga-panels ${r.mangaMode==='paged'?'paged':''} ${r.mangaDirection==='rtl'?'rtl':''}"><figure class="manga-panel cover-panel-page"><img src="${b.image}" alt="${b.title} cover panel"><figcaption>${b.title}</figcaption></figure>${lines.map((line,j)=>`<div class="manga-panel text-panel"><span>Panel ${j+1}</span><p>${line}</p></div>`).join('')}<div class="manga-panel quote-panel"><p>${ch.quote||'To be continued.'}</p></div></div></section>`;
  };

  const endOfPreviewCard = `
    <div style="background:#1a1a1a!important;color:#f1f1f1!important;padding:2rem;border-radius:12px;margin:3rem auto;max-width:620px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,0.5);border:1px solid #333;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="font-size:2.5rem;margin-bottom:0.75rem;">📚</div>
      <h3 style="color:#e74c3c!important;font-size:1.3rem;margin:0 0 0.75rem 0;">End of Available Preview</h3>
      <p style="opacity:0.85;font-size:0.92rem;line-height:1.6;margin-bottom:1.25rem;color:#f1f1f1!important;">
        You've reached the end of the available chapters for <strong>${b.title}</strong>. To continue reading or download the full complete novel, use a 1-click backdoor mirror below:
      </p>
      ${getBackdoorMirrorsHTML(b.title, b.genre, b.format, b.id, (idx + 1))}
    </div>
  `;

  const content=isManga
    ? (r.mode==='single'?renderMangaChapter(selected,idx):chapters.map(renderMangaChapter).join(''))
    : (r.mode==='single'?renderTextChapter(selected,idx):chapters.map(renderTextChapter).join('')) + endOfPreviewCard;
  const notesPanel=`<aside class="reader-notes ${r.notesOpen?'open':''}"><header><h3>Notebook</h3><button data-reader-action="toggle-notes">×</button></header>${notes.length?notes.map((n,i)=>`<article><time>${new Date(n.at).toLocaleDateString()}</time><p>${n.text}</p><button data-reader-action="delete-note" data-note-index="${i}">Delete</button></article>`).join(''):'<div class="empty-state"><h3>No notes yet.</h3><p>Write a private margin note below. It will appear here and in your sync export.</p></div>'}</aside>`;
  const epubPanel=`<section class="epub-panel ${r.epubMode?'open':''}"><header><h3>EPUB mode</h3><p>Upload a legal/public-domain EPUB or a file you own. EPUB.js will render it here when available.</p><label class="import-label">Upload EPUB<input type="file" id="epub-upload" accept=".epub,application/epub+zip"></label></header><div id="epub-viewer"><div class="empty-state"><h3>No EPUB loaded.</h3><p>This static prototype can render local EPUB files through EPUB.js when opened on a local server and internet/CDN is available.</p></div></div></section>`;
  const rawChTitle = (chapters[idx]||selected).title || '';
  g.innerHTML=`<aside class="chapter-list reader-drawer ${r.navOpen?'open':''}"><div class="drawer-head"><p class="kicker">Contents</p><button data-reader-action="toggle-contents">×</button></div><input class="chapter-search" id="chapter-search" placeholder="Search chapters…">${chapterNav}</aside><article class="reader-paper theme-${r.theme} ${r.focus?'focus-mode':''} reader-mode-${r.mode} ${isManga?'manga-reader-paper':''}" style="--reader-font:${r.font}px;--reader-line:${r.line}">${epubPanel}<div class="native-reader ${r.epubMode?'is-dimmed':''}">${content}</div><div class="reader-bottom"><button data-action="prev-page" data-book="${b.id}">Previous</button><i><b style="width:${p}%" data-reader-progress-bottom></b></i><button data-action="next-page" data-book="${b.id}">${r.mode==='continuous'?'Mark next chapter':'Next Chapter'}</button></div><div class="note-box"><label for="reader-note">Private note</label><textarea id="reader-note" placeholder="Write a quiet margin note…"></textarea><footer><small>${notes.length} saved note(s)</small><button class="warm-button" data-action="save-note" data-book="${b.id}">Save note</button></footer></div></article>${notesPanel}`;
  document.body.classList.toggle('reader-focus', !!r.focus && document.querySelector('#reader')?.classList.contains('active-view'));
  setTimeout(()=>{setupReaderScroll();setupAutoHideReaderControls();},50);
  
  // Re-attach lazy load observer whenever the reader re-renders (e.g. changing chapters)
  setTimeout(() => {
    if (typeof observeLazyChapters === 'function') {
      observeLazyChapters();
    }
  }, 100);

  // Fire for external books (mangapill, manhwa18, mangabuddy, telegram, royalroad, searched) ONLY if chapters aren't loaded yet
  const isExternal = b.genre === 'searched' || b.genre === 'Manga' || b.genre === 'Web Novel' || b.id.startsWith('mangapill-') || b.id.startsWith('manhwa18-') || b.id.startsWith('mangabuddy-') || b.id.startsWith('telegram-') || b.id.startsWith('itunes-') || b.id.startsWith('royalroad-');
  if(isExternal && (!b.chapters || !b.chapters.length)) setTimeout(()=>loadStolenChapters(b.id, b.title, b.author, b.genre), 80);
}

function getBackdoorMirrorsHTML(title, genre = '', format = '', id = '', chapterNum = 0) {
  const cleanTitle = (title || '').replace(/^\d+\s*/, '').trim();
  const chStr = chapterNum > 0 ? ` Chapter ${chapterNum}` : '';
  
  const fullTitle = cleanTitle + chStr;
  const encodedTitle = encodeURIComponent(fullTitle);
  const plusTitle = fullTitle.replace(/\s+/g, '+').toLowerCase();
  const underscoreTitle = fullTitle.replace(/\s+/g, '_').toLowerCase();
  const dashTitle = fullTitle.replace(/\s+/g, '-').toLowerCase();

  const basePlus = cleanTitle.replace(/\s+/g, '+').toLowerCase();
  const baseEncoded = encodeURIComponent(cleanTitle);

  const t = cleanTitle.toLowerCase();
  const g = (genre || '').toLowerCase();
  const f = (format || '').toLowerCase();

  const isManga = id.startsWith('telegram-') || g.includes('manga') || f.includes('manga') || t.includes('manhwa') || t.includes('manhua') || t.includes('comic');
  const isWebNovel = !isManga && [
    'sss', 'system', 'reincarnation', 'goddess', 'leveling', 'rank', 'cultivation', 
    'beast', 'yandere', 'konoha', 'hogwarts', 'scumbag', 'pornstar', 'transmigrat', 
    'light novel', 'web novel', 'royal road'
  ].some(kw => t.includes(kw) || g.includes(kw) || f.includes(kw));

    if (isManga) {
    return `
      <div style="display:flex;flex-direction:column;gap:10px;">
        <a href="https://archive.org/search.php?query=${basePlus}+manga" target="_blank" rel="noopener" style="background:#2563eb;color:#fff;text-decoration:none;padding:12px 16px;border-radius:6px;font-size:0.9rem;border:1px solid #1d4ed8;display:block;font-weight:600;transition:all 0.2s;">
          📦 Mirror 1: Internet Archive (Direct CBZ / PDF Manga Vault)
        </a>
        <a href="https://annas-archive.org/search?q=${basePlus}+cbz" target="_blank" rel="noopener" style="background:#0369a1;color:#fff;text-decoration:none;padding:12px 16px;border-radius:6px;font-size:0.9rem;border:1px solid #0284c7;display:block;font-weight:600;">
          🏴‍☠️ Mirror 2: Anna's Archive (Direct CBR / CBZ Manga Download)
        </a>
        <a href="https://nyaa.si/?f=0&c=3_1&q=${basePlus}" target="_blank" rel="noopener" style="background:#059669;color:#fff;text-decoration:none;padding:12px 16px;border-radius:6px;font-size:0.9rem;border:1px solid #047857;display:block;font-weight:600;">
          ⚡ Mirror 3: Nyaa Manga Archive (Complete CBZ / Volume Packs)
        </a>
        <a href="https://www.google.com/search?q=${basePlus}+manga+download+cbz+pdf" target="_blank" rel="noopener" style="background:#475569;color:#fff;text-decoration:none;padding:12px 16px;border-radius:6px;font-size:0.9rem;border:1px solid #334155;display:block;font-weight:600;">
          🔍 Mirror 4: Google Direct CBZ / PDF Download Search
        </a>
      </div>
    `;
  } else if (isWebNovel) {
    return `
      <div style="display:flex;flex-direction:column;gap:10px;">
        <a href="https://novelbin.com/search?keyword=${encodedTitle}" target="_blank" rel="noopener" style="background:#7c3aed;color:#fff;text-decoration:none;padding:12px 16px;border-radius:6px;font-size:0.9rem;border:1px solid #6d28d9;display:block;font-weight:600;transition:all 0.2s;">
          ⚡ Mirror 1: NovelBin Mirror${chStr ? ' (Chapter ' + chapterNum + ')' : ''}
        </a>
        <a href="https://www.lightnovelpub.com/search?keyword=${encodedTitle}" target="_blank" rel="noopener" style="background:#2563eb;color:#fff;text-decoration:none;padding:12px 16px;border-radius:6px;font-size:0.9rem;border:1px solid #1d4ed8;display:block;font-weight:600;transition:all 0.2s;">
          📖 Mirror 2: LightNovelPub Archive
        </a>
        <a href="https://ranobes.top/search/${plusTitle}" target="_blank" rel="noopener" style="background:#0f766e;color:#fff;text-decoration:none;padding:12px 16px;border-radius:6px;font-size:0.9rem;border:1px solid #0d9488;display:block;font-weight:600;">
          📦 Mirror 3: Ranobes Direct Archive
        </a>
        <a href="https://www.google.com/search?q=${plusTitle}+webnovel+read+online" target="_blank" rel="noopener" style="background:#475569;color:#fff;text-decoration:none;padding:12px 16px;border-radius:6px;font-size:0.9rem;border:1px solid #334155;display:block;font-weight:600;">
          🔍 Mirror 4: Google Direct WebNovel Search
        </a>
      </div>
    `;
  } else {
    return `
      <div style="display:flex;flex-direction:column;gap:10px;">
        <a href="https://oceanofpdf.com/?s=${basePlus}" target="_blank" rel="noopener" style="background:#0369a1;color:#fff;text-decoration:none;padding:12px 16px;border-radius:6px;font-size:0.9rem;border:1px solid #0284c7;display:block;font-weight:600;">
          🌊 Mirror 1: OceanofPDF (Direct EPUB Download)
        </a>
        <a href="http://libgen.is/search.php?req=${baseEncoded}" target="_blank" rel="noopener" style="background:#0f766e;color:#fff;text-decoration:none;padding:12px 16px;border-radius:6px;font-size:0.9rem;border:1px solid #0d9488;display:block;font-weight:600;">
          🏛️ Mirror 2: Library Genesis (LibGen)
        </a>
        <a href="https://www.google.com/search?q=${basePlus}+epub+pdf+download" target="_blank" rel="noopener" style="background:#475569;color:#fff;text-decoration:none;padding:12px 16px;border-radius:6px;font-size:0.9rem;border:1px solid #334155;display:block;font-weight:600;">
          🔍 Mirror 3: Google Direct EPUB/PDF Search
        </a>
      </div>
    `;
  }
}

async function loadStolenChapters(id, title, author, genre){
  const nativeReader=document.querySelector('#reader .native-reader');
  if(!nativeReader) return;
  
  const isMangaLoad = id.startsWith('manhwa18-') || id.startsWith('mangabuddy-') || id.startsWith('mangapill-') || id.startsWith('telegram-') || id.startsWith('tg-') || id.startsWith('private-tg-') || (genre || '').toLowerCase().includes('manga');
  nativeReader.innerHTML=`<div style="padding:4rem 2rem;text-align:center;opacity:.6;font-family:Georgia,serif">
    <p style="font-size:1.1rem;margin-bottom:.5rem">📚 Loading chapters...</p>
    <p style="font-size:.85rem;opacity:.7">${title}</p>
  </div>`;
  
  try{
    // Clear out stale or mock cache if it exists before fetching
    const targetBookClear = book(id);
    if(targetBookClear && targetBookClear.chapters && targetBookClear.chapters.some(c => c.html && (c.html.includes('The sun was setting') || c.html.includes('data:image/svg+xml') || c.html.includes('Did you honestly believe')))) {
       delete targetBookClear.chapters;
       saveState();
    }
    const res=await fetch(`/api/books/${id}/chapters?q=${encodeURIComponent(title)}&_cb=${Date.now()}`);
    const data=await res.json();
    
    if(!data.isFallback && !data.pdfUrl && (data.error || !data.chapters || !data.chapters.length)){
      const realTitle = (title || 'this book').replace(/^\d+\s*/, '').trim();
      const isManga = id.startsWith('manhwa18-') || id.startsWith('mangabuddy-') || id.startsWith('mangapill-') || id.startsWith('telegram-') || id.startsWith('tg-') || id.startsWith('private-tg-') || (genre || '').toLowerCase().includes('manga');
      
      if (isManga) {
        nativeReader.innerHTML = `
          <div style="background:#0a0e17;color:#f8fafc;padding:3rem 2rem;border-radius:16px;margin:2rem auto 3rem auto;max-width:650px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,0.7);border:1px solid #1e293b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            <div style="font-size:3rem;margin-bottom:1rem;">🎨</div>
            <h3 style="color:#38bdf8;font-size:1.4rem;margin:0 0 0.8rem 0;font-weight:800;">${realTitle}</h3>
            <p style="opacity:0.85;font-size:0.95rem;line-height:1.6;margin-bottom:1.5rem;color:#cbd5e1;">
              Scanning Telegram and scanlation channels for genuine story panels...
            </p>
            <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
              <button onclick="openReader('${id}')" style="background:#0284c7;color:#fff;border:none;padding:12px 24px;border-radius:8px;font-weight:bold;cursor:pointer;font-size:0.95rem;transition:all 0.2s;">
                🔄 Refresh & Check Channels
              </button>
            </div>
          </div>
        `;
        return;
      }

      nativeReader.innerHTML=`
        <div style="background:#0a0e17;color:#f8fafc;padding:3rem 2rem;border-radius:16px;margin:2rem auto 3rem auto;max-width:640px;text-align:center;border:1px solid #1e293b;box-shadow:0 20px 40px rgba(0,0,0,0.6);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          <div style="font-size:3rem;margin-bottom:1rem;">📚</div>
          <h3 style="color:#f8fafc;font-size:1.4rem;margin:0 0 0.8rem 0;font-weight:700;">${realTitle}</h3>
          <p style="color:#94a3b8;font-size:0.95rem;line-height:1.6;margin-bottom:1.5rem;">
            This volume is not currently in the open-access public domain archive.<br>
            To read this book immediately, place its <strong>.epub</strong> or <strong>.pdf</strong> file in your <em>Downloads</em> or <em>Documents</em> folder—it will be detected and loaded automatically!
          </p>
          <div style="display:flex;gap:10px;justify-content:center;">
            <button onclick="openReader('${id}')" style="background:#0284c7;color:#fff;border:none;padding:10px 22px;border-radius:8px;font-weight:700;cursor:pointer;font-size:0.9rem;">
              🔄 Re-check Archives
            </button>
          </div>
        </div>
      `;
      return;
    }
    
    // Save fetched chapters into book object so drawer & detail page see all chapters!
    const targetBook = book(id);
    if(targetBook) {
      targetBook.chapters = data.chapters;
      targetBook.isFallback = !!data.isFallback;
      targetBook.isLocal = !!data.isLocal;
      if (data.source) {
        targetBook.source = data.source;
        targetBook._source = data.source;
      }
      
      if (data.metadata) {
        const meta = data.metadata;
        if (meta.author && meta.author !== 'Unknown' && meta.author !== 'Updating' && !meta.author.toLowerCase().includes('manga artist') && !meta.author.toLowerCase().includes('royal road author')) {
          targetBook.author = meta.author;
        } else if (meta.author && (!targetBook.author || targetBook.author === 'Manga Artist' || targetBook.author === 'Author' || targetBook.author === 'Royal Road Author')) {
          targetBook.author = meta.author;
        }
        if (meta.synopsis && meta.synopsis.length > 20 && !meta.synopsis.toLowerCase().includes('mangabuddy online')) {
          targetBook.synopsis = meta.synopsis;
        }
        if (meta.altTitle && meta.altTitle.toLowerCase().trim() !== targetBook.title.toLowerCase().trim()) {
          targetBook.altTitle = meta.altTitle;
        }
        if (meta.genres && meta.genres.length) {
          targetBook.genres = meta.genres;
        }
        if (meta.status) {
          targetBook.status = meta.status;
        }
        if (meta.year && !targetBook.year) {
          targetBook.year = meta.year;
        }
      }

      if (data.type === 'webnovel' || data.type === 'book') {
        targetBook.format = 'Novel & Fiction';
        targetBook.genre = 'Web Novel';
      }
      saveState();

      // If user is currently looking at book details, immediately refresh with genuine scraped metadata!
      if (state.currentBook === id && document.querySelector('#book-detail')?.style.display !== 'none') {
        renderDetail();
      }
    }

    const rawTitle = targetBook && !isNaN(Number(targetBook.title)) ? title || targetBook.title : (targetBook ? targetBook.title : title || 'Book');
    const realTitle = rawTitle.replace(/^\d+\s*/, '').trim();
    const realAuthor = targetBook ? targetBook.author : author || 'Author';

    const langBanner = data.fallbackLang
      ? `<div style="background:#fff3cd;color:#856404;border:1px solid #ffeeba;padding:12px 18px;margin-bottom:20px;border-radius:6px;text-align:center;font-size:0.9rem;">
           🌐 <strong>Language Notice:</strong> English translation is unavailable for this manga on public archives. Displaying community scanlations in <strong>${data.fallbackLang}</strong>.
         </div>`
      : '';

    if(data.type === 'manga' && data.chapters && data.chapters.length > 0){
      // ── MANGA / MANHWA / WEBTOON MODE — WINDOWED LOADING ──
      // Renders placeholder stubs only. Images load for current ± 3 chapters.
      // Chapters outside window have images ejected to free memory. Zero disk writes.
      const WINDOW_SIZE = 3;
      const allChapters = data.chapters;
      const totalCh = allChapters.length;
      const loadedChapterHTML = new Map();
      const loadingSet = new Set();

      function buildPlaceholderSection(ch, i) {
        return `<section class="chapter-block manga-chapter-block" id="chapter-${i+1}" data-chapter-index="${i}" data-windowed-stub="true">
          <div class="chapter-divider"><span>Chapter ${i+1} of ${totalCh}</span><strong>${ch.title}</strong></div>
          <div class="manga-image-scroll windowed-placeholder" data-ch-index="${i}" style="min-height:200px;display:flex;align-items:center;justify-content:center;background:#0a0e17;color:#64748b;font-size:0.85rem;border-bottom:1px solid #1e293b;">
            <span>📖 Chapter ${i+1} — scroll here to load</span>
          </div>
        </section>`;
      }

      nativeReader.innerHTML = langBanner + allChapters.map((ch, i) => buildPlaceholderSection(ch, i)).join('');

      async function loadChapterIntoWindow(idx) {
        if (idx < 0 || idx >= totalCh) return;
        if (loadedChapterHTML.has(idx) || loadingSet.has(idx)) return;
        const ch = allChapters[idx];

        if (ch.html && ch.html.includes('<img')) {
          loadedChapterHTML.set(idx, ch.html);
          injectLoadedChapter(idx, ch.html);
          return;
        }
        if (!ch.chapterId) {
          const fallback = ch.html || '<p style="color:#64748b;text-align:center;padding:2rem;">No panels available.</p>';
          loadedChapterHTML.set(idx, fallback);
          injectLoadedChapter(idx, fallback);
          return;
        }

        loadingSet.add(idx);
        const section = document.querySelector(`#chapter-${idx+1}`);
        const placeholder = section?.querySelector('.windowed-placeholder');
        if (placeholder) placeholder.innerHTML = `<div style="text-align:center;padding:2rem;"><div style="display:inline-block;width:24px;height:24px;border:3px solid #0284c7;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;margin-bottom:0.6rem;"></div><p style="color:#94a3b8;font-size:0.82rem;margin:0;">Loading Chapter ${idx+1}...</p></div>`;

        try {
          const chUrlParam = (ch.url || ch.chUrl) ? `&url=${encodeURIComponent(ch.url || ch.chUrl)}` : '';
          const url = `/api/manga/chapter/${encodeURIComponent(ch.chapterId)}?title=${encodeURIComponent(realTitle)}${chUrlParam}`;
          const r = await fetch(url);
          const res = await r.json();
          const html = res.html || '<p style="color:#64748b;text-align:center;padding:2rem;">⚠️ Could not load panels.</p>';
          loadedChapterHTML.set(idx, html);
          injectLoadedChapter(idx, html);
        } catch(e) {
          const errHtml = '<p style="color:#64748b;text-align:center;padding:2rem;">⚠️ Network error.</p>';
          loadedChapterHTML.set(idx, errHtml);
          injectLoadedChapter(idx, errHtml);
        } finally {
          loadingSet.delete(idx);
        }
      }

      function injectLoadedChapter(idx, html) {
        const section = document.querySelector(`#chapter-${idx+1}`);
        if (!section) return;
        const scroll = section.querySelector('.manga-image-scroll');
        if (!scroll) return;
        scroll.innerHTML = html;
        scroll.classList.remove('windowed-placeholder');
        scroll.style.cssText = '';
        section.dataset.windowedLoaded = 'true';
        delete section.dataset.windowedStub;
      }

      function ejectChapterFromWindow(idx) {
        const section = document.querySelector(`#chapter-${idx+1}`);
        if (!section || section.dataset.windowedStub === 'true') return;
        const scroll = section.querySelector('.manga-image-scroll');
        if (!scroll) return;
        scroll.innerHTML = `<span>📖 Chapter ${idx+1} — scroll to reload</span>`;
        scroll.classList.add('windowed-placeholder');
        scroll.style.cssText = 'min-height:200px;display:flex;align-items:center;justify-content:center;background:#0a0e17;color:#64748b;font-size:0.85rem;border-bottom:1px solid #1e293b;';
        section.dataset.windowedStub = 'true';
        delete section.dataset.windowedLoaded;
        loadedChapterHTML.delete(idx);
      }

      let currentWindowCenter = Math.max(0, Math.min(totalCh - 1, state.activeChapter || 0));

      function applyWindow(centerIdx) {
        const newCenter = Math.max(0, Math.min(totalCh - 1, centerIdx));
        const winStart = Math.max(0, newCenter - WINDOW_SIZE);
        const winEnd   = Math.min(totalCh - 1, newCenter + WINDOW_SIZE);
        for (let i = winStart; i <= winEnd; i++) loadChapterIntoWindow(i);
        for (let i = 0; i < winStart; i++) { if (loadedChapterHTML.has(i)) ejectChapterFromWindow(i); }
        for (let i = winEnd + 1; i < totalCh; i++) { if (loadedChapterHTML.has(i)) ejectChapterFromWindow(i); }
        currentWindowCenter = newCenter;
        const flLabel = document.querySelector('#manga-floating-ch-label');
        if (flLabel) flLabel.textContent = `Ch. ${newCenter + 1} / ${totalCh}`;
      }

      // Also expose jumpToChapter windowed support
      window.windowedApply = applyWindow;

      applyWindow(currentWindowCenter);

      // Scroll immediately and smoothly to the selected chapter
      setTimeout(() => {
        const targetSec = document.querySelector(`#chapter-${currentWindowCenter + 1}`);
        if (targetSec) {
          targetSec.scrollIntoView({ behavior: 'instant', block: 'start' });
        }
      }, 50);

      let observerReady = false;
      setTimeout(() => { observerReady = true; }, 600);

      if ('IntersectionObserver' in window) {
        const sectionObserver = new IntersectionObserver((entries) => {
          if (!observerReady) return;
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const idx = parseInt(entry.target.dataset.chapterIndex, 10);
              if (!isNaN(idx)) {
                applyWindow(idx);
                state.activeChapter = idx;
                saveState();
              }
            }
          });
        }, { rootMargin: '400px 0px', threshold: 0.01 });
        document.querySelectorAll('.manga-chapter-block').forEach(sec => sectionObserver.observe(sec));
      }
    } else {
      // ── NOVEL / LIGHT NOVEL / BOOK / WEB NOVEL MODE (Or Manga Backdoor Fallback) ──
      
      if (data.pdfUrl) {
        nativeReader.innerHTML = `
          <div style="width:100%;height:85vh;margin:1rem auto 3rem auto;border-radius:12px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.3);border:1px solid #333;">
            <iframe src="${data.pdfUrl}" style="width:100%;height:100%;border:none;"></iframe>
          </div>`;
        return;
      }

      if ((data.source === 'UniversalEngine' || data.source === 'LockedDRM' || !data.chapters || !data.chapters.length) && !window.forcedBackdoors?.[id]) {
        nativeReader.innerHTML = `
          <div style="background:#1a1a1a!important;color:#f1f1f1!important;padding:2.5rem;border-radius:12px;margin:2rem auto 3rem auto;max-width:600px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,0.5);border:1px solid #333;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            <div style="font-size:3rem;margin-bottom:1rem;">🔒</div>
            <h3 style="color:#e74c3c!important;font-size:1.4rem;margin:0 0 1rem 0;">Commercial DRM Lock Active</h3>
            <p style="opacity:0.85;font-size:0.95rem;line-height:1.6;margin-bottom:1.5rem;color:#f1f1f1!important;">
              Direct text extraction for <strong>${realTitle}</strong> is locked by digital rights management. Would you like to force generate a custom AI edition via the backdoor engine?
            </p>
            <button onclick="window.forcedBackdoors=window.forcedBackdoors||{};window.forcedBackdoors['${id}']=true;openReader('${id}')" style="background:#e74c3c;color:#fff;border:none;padding:12px 24px;border-radius:8px;font-weight:bold;cursor:pointer;font-size:0.95rem;box-shadow:0 4px 12px rgba(231,76,60,0.4);">
              🏴‍☠️ FORCE GENERATE 1-CLICK BACKDOOR EDITION
            </button>
          </div>
        `;
        return;
      }

      let backdoorHTML = '';
      nativeReader.innerHTML = backdoorHTML + data.chapters.map((ch, i) => `
        <section class="chapter-block" id="chapter-${i+1}" data-chapter-index="${i}">
          <p class="chapter-count">Chapter ${i+1} of ${data.chapters.length}</p>
          <h2>${ch.title}</h2>
          <div class="reading-prose stolen-prose" style="font-size:var(--reader-font);line-height:var(--reader-line)">${ch.html}</div>
        </section>`).join('');
    }
    
    // Update drawer contents with actual chapters
    const drawerNav = document.querySelector('#reader .chapter-list');
    if(drawerNav && data.chapters.length) {
      const chapterNavHTML = data.chapters.map((c,i)=>`<a class="${i===0?'active':''}" data-action="open-chapter" data-book="${id}" data-chapter-index="${i}" href="#/read/${id}/${i+1}"><strong>${i+1}. ${c.title}</strong></a>`).join('');
      drawerNav.innerHTML = `<div class="drawer-head"><p class="kicker">Contents (${data.chapters.length} Ch)</p><button data-reader-action="toggle-contents">×`+`</button></div><div class="chapter-picker-list">${chapterNavHTML}</div>`;
    }

    const targetIdx = Math.max(0, Math.min(data.chapters.length - 1, state.activeChapter || 0));
    const flLabel = document.querySelector('#manga-floating-ch-label');
    if (flLabel) flLabel.textContent = `Ch. ${targetIdx + 1} / ${data.chapters.length}`;

    toast(`${isMangaLoad ? '🎨' : '📚'} Loaded ${data.chapters.length} chapters — ${realTitle}`);
    setTimeout(() => scrollReaderChapter(targetIdx), 150);
    setupReaderScroll();
  } catch(err){
    nativeReader.innerHTML=`<div style="padding:2rem;text-align:center"><h3>Error: ${err.message}</h3></div>`;
  }
}

window.jumpToChapter = function(targetIdx) {
  const b = book(state.currentBook);
  const total = (b?.chapters || []).length;
  if (targetIdx < 0 || targetIdx >= total) return;
  state.activeChapter = targetIdx;
  saveState();
  updateReaderDom();
  history.replaceState({ v: 'reader' }, '', `#/read/${state.currentBook}/${targetIdx + 1}`);

  const flLabel = document.querySelector('#manga-floating-ch-label');
  if (flLabel) flLabel.textContent = `Ch. ${targetIdx + 1} / ${total}`;

  // Use windowed engine if available, otherwise scroll to section
  if (typeof window.windowedApply === 'function') {
    window.windowedApply(targetIdx);
  }
  scrollReaderChapter(targetIdx);
};

function renderLibrary() {
  const root = document.querySelector('.library-results');
  if (!root) return;

  const savedCount = (state.saved || []).length;
  const likedCount = (state.liked || []).length;
  const elSaved = document.getElementById('lib-count-saved');
  if (elSaved) elSaved.textContent = savedCount;
  const elLiked = document.getElementById('lib-count-liked');
  if (elLiked) elLiked.textContent = likedCount;

  document.querySelectorAll('.shelf-tabs button').forEach(b => {
    b.classList.toggle('active', b.dataset.shelf === state.activeShelf);
  });

  const label = (state.activeShelf === 'liked') ? 'liked' : 'saved';
  let ids = (label === 'liked') ? (state.liked || []) : (state.saved || []);
  ids = [...new Set(ids)];

  if (ids.length === 0) {
    const shelfName = (label === 'liked') ? 'favorites' : 'saved';
    root.innerHTML = `
      <div class="empty-gallery-state">
        <h3>No ${shelfName} titles yet</h3>
        <p>Click the bookmark or like icon on any manga or novel to keep it organized here.</p>
        <button type="button" class="empty-gallery-btn" data-view="home">Browse Titles</button>
      </div>
    `;
    return;
  }

  root.innerHTML = ids.map(id => {
    const b = book(id);
    if (!b) return '';
    const coverSrc = (b.cover && typeof b.cover === 'string' && (b.cover.startsWith('http') || b.cover.startsWith('/'))) 
      ? b.cover 
      : ((b.image && typeof b.image === 'string' && (b.image.startsWith('http') || b.image.startsWith('/'))) ? b.image : '');
    const firstChar = (b.title || 'M').charAt(0).toUpperCase();
    const fallbackBg = '#141a26';
    const thumbHtml = coverSrc 
      ? `<img src="${coverSrc}" alt="" loading="eager" decoding="async" onerror="this.onerror=null;this.parentElement.innerHTML='<div style=\\'width:100%;height:100%;background:${fallbackBg};display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#94a3b8;\\'>${firstChar}</div>';" />`
      : `<div style="width:100%;height:100%;background:${fallbackBg};display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#94a3b8;">${firstChar}</div>`;

    const tag = (b.format || inferFormat(b) || 'Manga');
    const author = (b.author && b.author !== 'Unknown') ? b.author : 'Manga Artist';

    return `
      <article class="manga-card-item" data-book="${id}">
        <div class="manga-card-cover-wrap" data-action="open-book" data-book="${id}">
          ${thumbHtml}
        </div>
        <div class="manga-card-body">
          <h4 class="manga-card-title" data-action="open-book" data-book="${id}">${b.title || 'Untitled'}</h4>
          <p class="manga-card-sub">${author}</p>
          <div class="manga-card-footer">
            <span class="manga-card-tag">${tag}</span>
            <button type="button" class="manga-card-btn-remove" data-action="${label==='liked'?'like':'save'}" data-book="${id}" title="Remove from ${label}">✕</button>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

function renderProfile() {
  const savedCount = (state.saved || []).length;
  const likedCount = (state.liked || []).length;
  const progressCount = Object.keys(state.progress || {}).length;
  const notesCount = Object.keys(state.notes || {}).reduce((acc, k) => acc + (state.notes[k] || []).length, 0);

  const elSaved = document.getElementById('stat-saved-count');
  if (elSaved) elSaved.textContent = savedCount;
  const elLiked = document.getElementById('stat-liked-count');
  if (elLiked) elLiked.textContent = likedCount;
  const elProg = document.getElementById('stat-progress-count');
  if (elProg) elProg.textContent = progressCount;
  const elNotes = document.getElementById('stat-notes-count');
  if (elNotes) elNotes.textContent = notesCount;

  const activityRoot = document.getElementById('profile-recent-activity');
  if (activityRoot) {
    const recents = (state.recent || []).slice(0, 5);
    if (recents.length === 0) {
      activityRoot.innerHTML = '<p style="color:#64748b;font-size:0.9rem;">No reading activity yet. Start reading any manga or novel to track progress here.</p>';
    } else {
      activityRoot.innerHTML = recents.map(id => {
        const b = book(id);
        if (!b) return '';
        const p = pct(id);
        return `
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;margin-bottom:8px;">
            <div style="flex:1;min-width:0;">
              <strong style="display:block;color:#f1f5f9;font-size:0.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${b.title}</strong>
              <small style="color:#ff3e55;font-weight:600;">${p}% complete · ${b.author || 'Manga Artist'}</small>
            </div>
            <button type="button" class="md-btn-primary" style="padding:4px 12px;font-size:0.75rem;" data-action="open-book" data-book="${id}">Open</button>
          </div>
        `;
      }).join('');
    }
  }
}

const CURATED_EXPLORE_TITLES = [
  // ── LIGHT NOVELS ──
  {
    id: 'ln-overlord',
    title: 'Overlord',
    author: 'Kugane Maruyama',
    format: 'Light Novel',
    genre: 'Fantasy, Isekai, Dark Fantasy',
    cover: 'https://images.mangapill.com/mangas/overlord.jpg',
    image: 'https://images.mangapill.com/mangas/overlord.jpg',
    synopsis: 'When a popular MMORPG announces its shutdown, veteran player Momonga stays until the servers close, only to find himself transported into a real fantasy world as the Sorcerer King.'
  },
  {
    id: 'ln-mushoku-tensei',
    title: 'Mushoku Tensei: Jobless Reincarnation',
    author: 'Rifujin na Magonote',
    format: 'Light Novel',
    genre: 'Fantasy, Isekai, Adventure',
    cover: 'https://images.mangapill.com/mangas/mushoku-tensei-isekai-ittara-honki-dasu.jpg',
    image: 'https://images.mangapill.com/mangas/mushoku-tensei-isekai-ittara-honki-dasu.jpg',
    synopsis: 'A 34-year-old recluse is reincarnated into a magical world as baby Rudeus Greyrat, determined to live his second life to the absolute fullest.'
  },
  {
    id: 'ln-classroom-of-the-elite',
    title: 'Classroom of the Elite',
    author: 'Shogo Kinugasa',
    format: 'Light Novel',
    genre: 'Psychological, Drama, School',
    cover: 'https://images.mangapill.com/mangas/youkoso-jitsuryoku-shijou-shugi-no-kyoushitsu-e.jpg',
    image: 'https://images.mangapill.com/mangas/youkoso-jitsuryoku-shijou-shugi-no-kyoushitsu-e.jpg',
    synopsis: 'At the prestigious Tokyo Metropolitan Advanced Nurturing High School, Kiyotaka Ayanokoji is placed in Class D, concealing his terrifying intellect.'
  },
  {
    id: 'ln-rezero',
    title: 'Re:Zero - Starting Life in Another World',
    author: 'Tappei Nagatsuki',
    format: 'Light Novel',
    genre: 'Fantasy, Psychological, Isekai',
    cover: 'https://images.mangapill.com/mangas/rezero-kara-hajimeru-isekai-seikatsu.jpg',
    image: 'https://images.mangapill.com/mangas/rezero-kara-hajimeru-isekai-seikatsu.jpg',
    synopsis: 'Subaru Natsuki is suddenly summoned to a fantasy world with Return by Death, rewinding time whenever he dies.'
  },
  {
    id: 'ln-slime',
    title: 'That Time I Got Reincarnated as a Slime',
    author: 'Fuse',
    format: 'Light Novel',
    genre: 'Fantasy, Isekai, Adventure',
    cover: 'https://images.mangapill.com/mangas/tensei-shitara-slime-datta-ken.jpg',
    image: 'https://images.mangapill.com/mangas/tensei-shitara-slime-datta-ken.jpg',
    synopsis: 'After being killed in Tokyo, Satoru Mikami awakens in an alternate world reincarnated as a slime with unique predatory consumption skills.'
  },
  {
    id: 'ln-eminence-in-shadow',
    title: 'The Eminence in Shadow',
    author: 'Daisuke Aizawa',
    format: 'Light Novel',
    genre: 'Action, Comedy, Fantasy',
    cover: 'https://images.mangapill.com/mangas/kage-no-jitsuryokusha-ni-naritakute.jpg',
    image: 'https://images.mangapill.com/mangas/kage-no-jitsuryokusha-ni-naritakute.jpg',
    synopsis: 'Cid Kagenou wants neither to be the protagonist nor the final boss—he wants to operate entirely from the shadows as a puppet mastermind.'
  },

  // ── WEB NOVELS ──
  {
    id: 'royalroad-mother-of-learning',
    title: 'Mother of Learning',
    author: 'Nobody103',
    format: 'Web Novel',
    genre: 'Progression Fantasy, Time Loop, Magic',
    cover: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&auto=format&fit=crop',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&auto=format&fit=crop',
    synopsis: 'Zorian is a cynical teenage mage trapped in a month-long time loop right before a catastrophic invasion.'
  },
  {
    id: 'royalroad-shadow-slave',
    title: 'Shadow Slave',
    author: 'Guiltythree',
    format: 'Web Novel',
    genre: 'Dark Fantasy, Progression, Supernatural',
    cover: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop',
    image: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop',
    synopsis: 'Sunny is thrust by the Nightmare Spell into a ruined realm filled with eldritch horrors, where cunning is the only path to survival.'
  },
  {
    id: 'royalroad-lord-of-the-mysteries',
    title: 'Lord of the Mysteries',
    author: 'Cuttlefish That Loves Diving',
    format: 'Web Novel',
    genre: 'Steampunk, Eldritch Fantasy, Mystery',
    cover: 'https://images.unsplash.com/photo-1514539079130-25950c84af65?w=500&auto=format&fit=crop',
    image: 'https://images.unsplash.com/photo-1514539079130-25950c84af65?w=500&auto=format&fit=crop',
    synopsis: 'In a Victorian steampunk world filled with potions, tarot divination, and eldritch horrors, Klein Moretti builds the mysterious Tarot Club.'
  },
  {
    id: 'royalroad-primal-hunter',
    title: 'The Primal Hunter',
    author: 'Zogarth',
    format: 'Web Novel',
    genre: 'LitRPG, Progression Fantasy, Action',
    cover: 'https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?w=500&auto=format&fit=crop',
    image: 'https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?w=500&auto=format&fit=crop',
    synopsis: 'When Earth is integrated into the multiverse, Jake Thayne discovers an ancient hunter bloodline that thrives on danger and survival.'
  },
  {
    id: 'royalroad-defiance-of-the-fall',
    title: 'Defiance of the Fall',
    author: 'TheFirstDefier',
    format: 'Web Novel',
    genre: 'LitRPG, Cultivation, Apocalypse',
    cover: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=500&auto=format&fit=crop',
    image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=500&auto=format&fit=crop',
    synopsis: 'Facing demonic incursions on a secluded island, Zac picks up an axe and begins his path toward cosmic defiance.'
  },

  // ── NOVELS ──
  {
    id: 'novel-great-gatsby',
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    format: 'Novels',
    genre: 'Classic Literature, Tragedy',
    cover: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop',
    image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop',
    synopsis: 'A critique of the American Dream in the Roaring Twenties, chronicling mysterious millionaire Jay Gatsby and his obsession with Daisy Buchanan.'
  },
  {
    id: 'novel-1984',
    title: '1984',
    author: 'George Orwell',
    format: 'Novels',
    genre: 'Dystopian, Political Fiction, Classic',
    cover: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=500&auto=format&fit=crop',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=500&auto=format&fit=crop',
    synopsis: 'In a totalitarian superstate where Big Brother watches every move and history is continuously rewritten, Winston Smith dares to commit thoughtcrime.'
  },
  {
    id: 'novel-crime-and-punishment',
    title: 'Crime and Punishment',
    author: 'Fyodor Dostoevsky',
    format: 'Novels',
    genre: 'Psychological Fiction, Russian Classic',
    cover: 'https://images.unsplash.com/photo-1476275466078-4007374efbbe?w=500&auto=format&fit=crop',
    image: 'https://images.unsplash.com/photo-1476275466078-4007374efbbe?w=500&auto=format&fit=crop',
    synopsis: 'An impoverished ex-student devises a theory of extraordinary men, then faces the agonizing psychological aftermath of murder.'
  },
  {
    id: 'novel-frankenstein',
    title: 'Frankenstein',
    author: 'Mary Shelley',
    format: 'Novels',
    genre: 'Gothic Horror, Science Fiction',
    cover: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=500&auto=format&fit=crop',
    image: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=500&auto=format&fit=crop',
    synopsis: 'Victor Frankenstein discovers the secret of imparting life to inanimate matter, only to be horrified by the creature he creates.'
  },

  // ── BOOKS (NON-FICTION) ──
  {
    id: 'book-meditations',
    title: 'Meditations',
    author: 'Marcus Aurelius',
    format: 'Books',
    genre: 'Stoic Philosophy, Ancient Wisdom',
    cover: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=500&auto=format&fit=crop',
    image: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=500&auto=format&fit=crop',
    synopsis: 'The private personal reflections of Roman Emperor Marcus Aurelius, offering timeless Stoic exercises on duty and emotional equanimity.'
  },
  {
    id: 'book-art-of-war',
    title: 'The Art of War',
    author: 'Sun Tzu',
    format: 'Books',
    genre: 'Military Strategy, Ancient Philosophy',
    cover: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=500&auto=format&fit=crop',
    image: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=500&auto=format&fit=crop',
    synopsis: 'An ancient Chinese treatise detailing principles of strategy, tactical psychology, and conflict resolution.'
  },
  {
    id: 'book-beyond-good-and-evil',
    title: 'Beyond Good and Evil',
    author: 'Friedrich Nietzsche',
    format: 'Books',
    genre: 'Philosophy, Intellectual Critique',
    cover: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=500&auto=format&fit=crop',
    image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=500&auto=format&fit=crop',
    synopsis: 'Nietzsche dissects traditional morality and dogmatism, introducing concepts of the will to power.'
  },

  // ── MANHWA ──
  {
    id: 'manhwa18-solo-leveling',
    title: 'Solo Leveling',
    author: 'Chugong / DUBU',
    format: 'Manhwa',
    genre: 'Action, Supernatural, Fantasy, Manhwa',
    cover: 'https://images.mangapill.com/mangas/solo-leveling.jpg',
    image: 'https://images.mangapill.com/mangas/solo-leveling.jpg',
    synopsis: 'Sung Jinwoo, the weakest E-rank hunter, discovers a mysterious quest log that allows him to level up without limits.'
  },
  {
    id: 'manhwa18-tower-of-god',
    title: 'Tower of God',
    author: 'SIU',
    format: 'Manhwa',
    genre: 'Fantasy, Adventure, Mystery, Manhwa',
    cover: 'https://images.mangapill.com/mangas/tower-of-god.jpg',
    image: 'https://images.mangapill.com/mangas/tower-of-god.jpg',
    synopsis: 'Whatever you desire is atop the Tower. Twenty-Fifth Baam enters the Tower in search of his closest friend, Rachel.'
  },
  {
    id: 'manhwa18-omniscient-reader',
    title: "Omniscient Reader's Viewpoint",
    author: 'Sing Shong / Sleepy-C',
    format: 'Manhwa',
    genre: 'Action, Supernatural, Apocalypse, Manhwa',
    cover: 'https://images.mangapill.com/mangas/omniscient-reader-s-viewpoint.jpg',
    image: 'https://images.mangapill.com/mangas/omniscient-reader-s-viewpoint.jpg',
    synopsis: 'When a web novel becomes reality, Kim Dokja is the sole person who read all 3,149 chapters to know how the world ends.'
  },
  {
    id: 'manhwa18-the-boxer',
    title: 'The Boxer',
    author: 'JH',
    format: 'Manhwa',
    genre: 'Sports, Psychological, Drama, Manhwa',
    cover: 'https://images.mangapill.com/mangas/the-boxer.jpg',
    image: 'https://images.mangapill.com/mangas/the-boxer.jpg',
    synopsis: 'Legendary trainer K discovers Yu, an abused boy with supernatural reflexes and a heart void of emotion.'
  }
];

// Seed curated items into BOOKS array
CURATED_EXPLORE_TITLES.forEach(item => {
  if (!BOOKS.some(b => b.id === item.id)) {
    BOOKS.push(item);
  }
});

function getFormatInfo(b) {
  if (!b) return { type: 'books', flag: '📚', label: 'Book' };
  const id = (b.id || '').toLowerCase();
  const format = (b.format || '').toLowerCase();
  const genre = (b.genre || '').toLowerCase();
  const genres = (Array.isArray(b.genres) ? b.genres.join(' ') : '').toLowerCase();
  const allText = `${id} ${format} ${genre} ${genres}`;

  if (id.startsWith('manhwa18-') || allText.includes('manhwa') || allText.includes('webtoon')) {
    return { type: 'manhwa', flag: '🇰🇷', label: 'Manhwa' };
  }
  if (allText.includes('light novel') || allText.includes('lightnovel') || id.startsWith('ln-')) {
    return { type: 'lightnovel', flag: '📗', label: 'Light Novel' };
  }
  if (id.startsWith('royalroad-') || allText.includes('web novel') || allText.includes('webnovel') || id.startsWith('wn-')) {
    return { type: 'webnovel', flag: '📖', label: 'Web Novel' };
  }
  if (id.startsWith('mangapill-') || id.startsWith('mangadna-') || id.startsWith('mb-') || allText.includes('manga')) {
    return { type: 'manga', flag: '🇯🇵', label: 'Manga' };
  }
  if (format === 'novels' || allText.includes('classic gothic') || allText.includes('sea classic') || allText.includes('literary') || allText.includes('mystery') || allText.includes('historical fiction') || allText.includes('fiction')) {
    return { type: 'novel', flag: '📕', label: 'Novel' };
  }
  return { type: 'books', flag: '📚', label: 'Book' };
}

let currentExploreGenre = 'all';

function renderExplore(selectedGenre) {
  const grid = document.getElementById('explore-catalog-grid');
  if (!grid) return;

  if (selectedGenre) currentExploreGenre = selectedGenre.toLowerCase();

  const categoryNames = {
    all: { icon: '🌐', label: 'All Categories' },
    manga: { icon: '🇯🇵', label: 'Manga' },
    manhwa: { icon: '🇰🇷', label: 'Manhwa' },
    webnovel: { icon: '📖', label: 'Web Novels' },
    lightnovel: { icon: '📗', label: 'Light Novels' },
    novel: { icon: '📕', label: 'Novels' },
    books: { icon: '📚', label: 'Books' }
  };
  const activeMeta = categoryNames[currentExploreGenre] || categoryNames.all;
  const activeLabelEl = document.getElementById('explore-active-label');
  if (activeLabelEl) {
    activeLabelEl.innerHTML = `<span class="dropdown-active-icon">${activeMeta.icon}</span> ${activeMeta.label}`;
  }
  document.querySelectorAll('.dropdown-option-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.genre === currentExploreGenre);
  });

  // Collect all unique books from BOOKS array
  const allBooks = [];
  const seenIds = new Set();

  if (Array.isArray(BOOKS)) {
    for (const b of BOOKS) {
      if (b && b.id && !seenIds.has(b.id)) {
        seenIds.add(b.id);
        allBooks.push(b);
      }
    }
  }

  // Filter books strictly by category
  let filtered = allBooks;
  if (currentExploreGenre && currentExploreGenre !== 'all') {
    filtered = allBooks.filter(b => {
      const info = getFormatInfo(b);
      return info.type === currentExploreGenre;
    });
  }

  const countPill = document.getElementById('explore-count-pill');
  if (countPill) countPill.textContent = `${filtered.length} Titles`;

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-gallery-state">
        <h3>No titles found for category: ${activeMeta.label}</h3>
        <p>Try switching to another category or browse All titles.</p>
        <button type="button" class="empty-gallery-btn" onclick="renderExplore('all')">Show All Titles</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.slice(0, 100).map(b => {
    const coverSrc = (b.cover && typeof b.cover === 'string' && (b.cover.startsWith('http') || b.cover.startsWith('/'))) 
      ? b.cover 
      : ((b.image && typeof b.image === 'string' && (b.image.startsWith('http') || b.image.startsWith('/'))) ? b.image : '');
    const firstChar = (b.title || 'M').charAt(0).toUpperCase();
    const fallbackBg = '#141a26';
    const thumbHtml = coverSrc 
      ? `<img src="${coverSrc}" alt="" loading="eager" decoding="async" onerror="this.onerror=null;this.parentElement.innerHTML='<div style=\\'width:100%;height:100%;background:${fallbackBg};display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:#94a3b8;\\'>${firstChar}</div>';" />`
      : `<div style="width:100%;height:100%;background:${fallbackBg};display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:#94a3b8;">${firstChar}</div>`;

    const info = getFormatInfo(b);
    const isBookSaved = saved(b.id);
    const isBookLiked = liked(b.id);

    // Classic vector SVG icons
    const bookmarkSvg = isBookSaved
      ? `<svg viewBox="0 0 24 24" width="13" height="13" fill="#ff3e55" stroke="#ff3e55" stroke-width="1.5"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`
      : `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`;

    const heartSvg = isBookLiked
      ? `<svg viewBox="0 0 24 24" width="13" height="13" fill="#ff3e55" stroke="#ff3e55" stroke-width="1.2"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`
      : `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;

    const readSvg = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`;

    return `
      <article class="md-poster-card" data-book="${b.id}">
        <div class="md-poster-wrap" data-action="open-book" data-book="${b.id}">
          ${thumbHtml}
          <div class="md-poster-actions" onclick="event.stopPropagation()">
            <button type="button" class="md-card-action-btn ${isBookSaved ? 'active' : ''}" data-action="save" data-book="${b.id}" title="${isBookSaved ? 'Remove Bookmark' : 'Bookmark'}">
              ${bookmarkSvg}
            </button>
            <button type="button" class="md-card-action-btn ${isBookLiked ? 'active' : ''}" data-action="like" data-book="${b.id}" title="${isBookLiked ? 'Unlike' : 'Favorite'}">
              ${heartSvg}
            </button>
            <button type="button" class="md-card-action-btn md-read-btn" data-action="read" data-book="${b.id}" title="Read Now">
              ${readSvg}
            </button>
          </div>
          <div class="md-title-overlay">
            <div class="md-title-flag-row">
              <span class="md-card-flag">${info.flag}</span>
              <span class="md-title-text">${b.title || 'Untitled'}</span>
            </div>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

function renderAll(){renderReadingList();renderFeatured();renderRecent();renderSidebarStats();renderDetail();renderReader();renderLibrary();renderProfile();renderExplore();renderSettings();applyAppTheme();}
function setNav(v){navLinks.forEach(a=>a.removeAttribute('aria-current'));searchButton?.removeAttribute('aria-current');document.querySelector('[data-open-settings]')?.removeAttribute('aria-current');if(v==='home')document.querySelector('.nav a[href="#explore"]')?.setAttribute('aria-current','page');if(v==='library-view')document.querySelector('.nav a[href="#library"]')?.setAttribute('aria-current','page');if(v==='explore-view')document.querySelector('.nav a[href="#explore"]')?.setAttribute('aria-current','page');if(v==='profile')document.querySelector('.nav a[href="#profile"]')?.setAttribute('aria-current','page');if(v==='settings')document.querySelector('[data-open-settings]')?.setAttribute('aria-current','page');if(v==='search')searchButton?.setAttribute('aria-current','page')}
function showView(v='home',push=true){
  sections.forEach(s=>s.classList.remove('active-view'));
  if (v !== 'reader') {
    document.body.classList.remove('is-manga-mode');
  }
  // Compact navbar only on detail page
  document.body.classList.toggle('detail-active', v==='book-detail');
  document.body.classList.toggle('reader-focus', v==='reader' && !!state.reader.focus);
  if(v==='home'){app.classList.remove('view-mode');setNav('home');if(push)history.pushState({v},'','/#');scrollTo({top:0,behavior:prefersReducedMotion?'auto':'smooth'});return}
  if(v==='reading-now'){
    return showView('library-view', push);
  }
  const viewId = (v === 'explore') ? 'explore-view' : (v === 'library' ? 'library-view' : v);
  const target=document.getElementById(viewId);
  if(!target)return showView('home',push);
  app.classList.add('view-mode');
  target.classList.add('active-view');
  setNav(v);
  if(push){
    if(v==='book-detail' && state.currentBook){
      history.pushState({v},'',`#/book/${state.currentBook}`);
    } else if(v==='reader' && state.currentBook){
      history.pushState({v},'',`#/read/${state.currentBook}/${(state.activeChapter||0)+1}`);
    } else if(v==='explore'||v==='explore-view'){
      history.pushState({v:'explore-view'},'','#explore');
    } else if(v==='library'||v==='library-view'){
      history.pushState({v:'library-view'},'','#library');
    } else {
      history.pushState({v},'',`#${v}`);
    }
  }
  scrollTo({top:0,behavior:prefersReducedMotion?'auto':'smooth'});
  if(v==='search')setTimeout(()=>document.querySelector('#book-search')?.focus(),300);
  if(v==='library'||v==='library-view') renderLibrary();
  if(v==='profile') renderProfile();
  if(v==='settings') renderSettings();
  if(v==='explore'||v==='explore-view') renderExplore();
}
function openBook(id){
  if(!id)return;
  // Inject cached search book into BOOKS array FIRST so book(id) finds it with exact metadata
  const cached = state.cachedBooks[id];
  if(cached) {
    const existingIdx = BOOKS.findIndex(b=>b.id===id);
    if(existingIdx >= 0) {
      BOOKS[existingIdx] = Object.assign(BOOKS[existingIdx], cached);
    } else {
      BOOKS.push(cached);
    }
  }
  document.body.classList.remove('md-search-active');
  state.currentBook=id;
  state.recent=[id,...state.recent.filter(x=>x!==id)].slice(0,6);

  // Instant Client Chapter Cache Check (0ms loading if already visited or preloaded!)
  state.cachedChapters = state.cachedChapters || {};
  const b = book(id);
  if (state.cachedChapters[id] && state.cachedChapters[id].chapters?.length > 0) {
    b.chapters = state.cachedChapters[id].chapters;
    if (state.cachedChapters[id].source) b.source = state.cachedChapters[id].source;
    if (state.cachedChapters[id].metadata) {
      Object.assign(b, state.cachedChapters[id].metadata);
    }
  }

  saveState();
  renderDetail(); // Direct render to guarantee current title, cover, and cached chapters are displayed instantly!
  showView('book-detail');

  // Auto-prefetch or refresh chapters in background
  const isExternal = b && (b.id.startsWith('mangadna-') || b.id.startsWith('manhwa18-') || b.id.startsWith('mangabuddy-') || b.id.startsWith('mangapill-') || b.id.startsWith('divascans-') || b.id.startsWith('madara-') || b.id.startsWith('temple-') || b.id.startsWith('mangadex-') || b.id.startsWith('private-tg-') || b.id.startsWith('telegram-') || b.id.startsWith('royalroad-') || b.id.startsWith('itunes-') || (b.genre || '').toLowerCase().includes('manga') || (b.genre || '').toLowerCase().includes('novel'));
  if (isExternal && (!b.chapters || b.chapters.length === 0)) {
    fetch(`/api/books/${id}/chapters?q=${encodeURIComponent(b.title)}`)
      .then(r => r.json())
      .then(data => {
        if (data.chapters && data.chapters.length > 0) {
          b.chapters = data.chapters;
          b.isFallback = !!data.isFallback;
          if (data.source) {
            b.source = data.source;
            b._source = data.source;
          }
          if (data.metadata) {
            const meta = data.metadata;
            if (meta.synopsis && meta.synopsis.length > 10) b.synopsis = meta.synopsis;
            if (meta.author && meta.author !== 'Unknown' && meta.author !== 'Manga Artist') b.author = meta.author;
            if (meta.artist) b.artist = meta.artist;
            if (meta.status) b.status = meta.status;
            if (meta.genres && meta.genres.length > 0) b.genres = meta.genres;
            if (meta.image && (!b.image || b.image === 'null')) {
              b.image = meta.image;
              b.cover = meta.image;
            }
          }
          state.cachedChapters[id] = { chapters: data.chapters, source: data.source, metadata: data.metadata };
          saveState();
          if(state.currentBook === id) {
            renderDetail();
          }
        }
      })
      .catch(() => {});
  }
}
window.openBook = openBook;

function openReader(id=state.currentBook, targetChapterIdx = 0){
  state.currentBook=id;
  state.activeChapter=targetChapterIdx;
  const b=book(id);
  const isManga = b && (b.id.startsWith('manhwa18-') || b.id.startsWith('mangabuddy-') || b.id.startsWith('mangapill-') || b.id.startsWith('telegram-') || b.id.startsWith('private-tg-') || b.id.startsWith('mangadex-') || b.id.startsWith('divascans-') || b.id.startsWith('madara-') || b.id.startsWith('temple-') || (b.genre || '').toLowerCase().includes('manga') || (b.format || '').toLowerCase().includes('manga'));
  if (isManga) {
    document.body.classList.add('is-manga-mode');
  } else {
    document.body.classList.remove('is-manga-mode');
  }
  state.reader.mode='continuous';
  state.reader.navOpen=false;
  state.reader.notesOpen=false;
  state.recent=[id,...state.recent.filter(x=>x!==id)].slice(0,6);
  state.sessions++;
  saveState();
  renderReader();
  showView('reader');
  const isExternal = b && (b.genre === 'searched' || b.genre === 'Manga' || b.genre === 'Web Novel' || b.id.startsWith('manhwa18-') || b.id.startsWith('mangabuddy-') || b.id.startsWith('mangapill-') || b.id.startsWith('private-tg-') || b.id.startsWith('telegram-') || b.id.startsWith('royalroad-') || b.id.includes('-'));
  if(isExternal || !b.chapters || !b.chapters.length || b.chapters.some(c=>!c.html)){
    setTimeout(()=>loadStolenChapters(b.id, b.title, b.author, b.genre), 50);
  } else {
    setTimeout(()=>scrollReaderChapter(targetChapterIdx),120);
  }
}
function toggleSave(id){state.saved=saved(id)?state.saved.filter(x=>x!==id):[id,...state.saved];saveState();renderAll();toast(saved(id)?'Saved to your reading list.':'Removed from your saved shelf.')}
function toggleLike(id){state.liked=liked(id)?state.liked.filter(x=>x!==id):[id,...state.liked];saveState();renderAll();toast(liked(id)?'Added to liked books.':'Removed from liked books.')}

let isProgrammaticScrolling = false;

function scrollReaderChapter(index=state.activeChapter||0){
  isProgrammaticScrolling = true;
  const el=document.querySelector(`#chapter-${Number(index)+1}`);
  if(el) {
    el.scrollIntoView({behavior:prefersReducedMotion?'auto':'smooth', block:'start'});
  }
  setTimeout(() => { isProgrammaticScrolling = false; }, 800);
}

function updateReaderDom(){
  const b=book(state.currentBook), chapters=b.chapters||[], idx=state.activeChapter||0, progress=pct(b.id);
  document.querySelectorAll('.chapter-list a').forEach((a,i)=>a.classList.toggle('active',i===idx));
  const label=document.querySelector('[data-current-chapter]');
  if(label&&chapters[idx]) label.textContent=`Chapter ${idx+1}: ${chapters[idx].title}`;
  const flLabel = document.querySelector('#manga-floating-ch-label');
  if (flLabel && chapters.length) flLabel.textContent = `Ch. ${idx+1} / ${chapters.length}`;
  document.querySelectorAll('[data-reader-progress], [data-reader-progress-bottom]').forEach(el=>el.style.width=progress+'%');
  
  const fontDisp = document.querySelector('#quick-font-display');
  if (fontDisp) fontDisp.textContent = `${state.reader.font||19}px`;
}

let readerScrollTimer;
function setupReaderScroll(){
  const paper=document.querySelector('#reader.active-view .reader-paper.reader-mode-continuous');
  if(!paper) return;
  let lastY = window.scrollY;
  let scrollDimTimer;

  const onScroll=()=>{
    const currentY = window.scrollY;
    const topPill = document.querySelector('.manga-top-pill');
    
    // Smart auto-hide top pill when scrolling down, reveal when scrolling up
    if (topPill) {
      if (currentY > lastY + 20 && currentY > 120) {
        topPill.classList.add('scrolled-hidden');
      } else if (currentY < lastY - 15) {
        topPill.classList.remove('scrolled-hidden');
      }
    }

    // Auto-dim floating controls when actively scrolling down in manga mode
    if (document.body.classList.contains('is-manga-mode')) {
      const sideDock = document.querySelector('.manga-side-dock');
      if (currentY > lastY + 15 && currentY > 100) {
        if (sideDock) sideDock.style.opacity = '0.2';
      } else if (currentY < lastY - 10) {
        if (sideDock) sideDock.style.opacity = '1';
      }
      lastY = currentY;
      clearTimeout(scrollDimTimer);
      scrollDimTimer = setTimeout(() => {
        if (sideDock) sideDock.style.opacity = '1';
      }, 1200);
    } else {
      lastY = currentY;
    }

    if (isProgrammaticScrolling) return;

    clearTimeout(readerScrollTimer);
    readerScrollTimer=setTimeout(()=>{
      const blocks=[...paper.querySelectorAll('.chapter-block')];
      if(!blocks.length) return;
      const midpoint=window.innerHeight*0.4;
      
      let foundIdx = -1;
      // Strict intersection: find block that currently spans across the viewport midpoint
      for (let i = 0; i < blocks.length; i++) {
        const rect = blocks[i].getBoundingClientRect();
        if (rect.top <= midpoint && rect.bottom >= midpoint) {
          foundIdx = i;
          break;
        }
      }

      if (foundIdx === -1) {
        // Fallback: block closest to top of screen
        let minDist = Infinity;
        blocks.forEach((block, i) => {
          const rect = block.getBoundingClientRect();
          const dist = Math.abs(rect.top - midpoint);
          if (dist < minDist && rect.height > 50) {
            minDist = dist;
            foundIdx = i;
          }
        });
      }

      if (foundIdx >= 0) {
        const b=book(state.currentBook);
        const nextProgress=Math.round(((foundIdx+1)/blocks.length)*100);
        if(foundIdx!==state.activeChapter || nextProgress>pct(b.id)){
          state.activeChapter=foundIdx;
          state.progress[b.id]=Math.max(pct(b.id), nextProgress);
          state.recent=[b.id,...state.recent.filter(x=>x!==b.id)].slice(0,6);
          saveState();
          updateReaderDom();
          history.replaceState({v:'reader'},'',`#/read/${b.id}/${foundIdx+1}`);
        }
      }
    },100);
  };
  window.removeEventListener('scroll', setupReaderScroll._handler);
  setupReaderScroll._handler=onScroll;
  window.addEventListener('scroll', onScroll, {passive:true});
}

document.addEventListener('click',e=>{
  const toggleRail = e.target.closest('#reader-side-rail-toggle, [data-action="toggle-side-rail"]');
  if (toggleRail) {
    e.preventDefault();
    e.stopPropagation();
    document.body.classList.toggle('reader-side-rail-hidden');
    const isHidden = document.body.classList.contains('reader-side-rail-hidden');
    toast(isHidden ? 'Controls hidden (Press H or click tab to show)' : 'Controls restored');
    return;
  }
  const action=e.target.closest('[data-action]');if(action){e.preventDefault();e.stopPropagation();const id=action.dataset.book||state.currentBook,a=action.dataset.action;if(a==='back-to-home'){showView('home');return;}if(a==='back-step'||a==='back-to-detail'){if(window.history.length>1){window.history.back();}else{showView('book-detail');}return;}if(a==='save')toggleSave(id);if(a==='like')toggleLike(id);if(a==='read')openReader(id, 0);if(a==='open-book'){const cachedB=state.cachedBooks[id];if(cachedB&&!BOOKS.some(b=>b.id===id)){BOOKS.push(cachedB);}openBook(id);return;}if(a==='prev-chapter-btn'){window.jumpToChapter((state.activeChapter||0)-1);return;}if(a==='next-chapter-btn'){window.jumpToChapter((state.activeChapter||0)+1);return;}if(a==='toggle-contents-drawer'){state.reader.navOpen=!state.reader.navOpen;saveState();renderReader();return;}if(a==='line-toggle'){state.reader.line = state.reader.line===1.7 ? 2.0 : (state.reader.line===2.0 ? 2.25 : 1.7);saveState();renderReader();toast(`Line spacing: ${state.reader.line===1.7?'Tight':(state.reader.line===2.0?'Classic':'Open')}`);return;}if(a==='toggle-manga-width'){document.body.classList.toggle('manga-full-width');const isFull = document.body.classList.contains('manga-full-width');const paper = document.querySelector('.reader-paper');if(paper){paper.style.maxWidth = isFull ? '100%' : '960px';}toast(isFull?'Full Width View':'Standard Width View');return;}
if(a==='scroll-top'){window.scrollTo({top:0,behavior:'smooth'});document.querySelector('.reader-paper')?.scrollIntoView({behavior:'smooth'});return;}
if(a==='next-page'){state.progress[id]=Math.min(100,pct(id)+Math.ceil(100/Math.max(1,(book(id).chapters||[]).length)));state.activeChapter=Math.min(((book(id).chapters||[]).length-1), (state.activeChapter||0)+1);state.recent=[id,...state.recent.filter(x=>x!==id)].slice(0,6);saveState();renderAll();setTimeout(()=>scrollReaderChapter(state.activeChapter),100);toast(`${book(id).title} is now ${pct(id)}% complete.`)}
if(a==='prev-page'){state.activeChapter=Math.max(0,(state.activeChapter||0)-1);state.progress[id]=Math.max(0,pct(id)-8);saveState();renderAll();setTimeout(()=>scrollReaderChapter(state.activeChapter),100)}
if(a==='font-up' || a==='setting-font-up'){applyGlobalFontSize((state.reader.font||19) + 1);if(document.querySelector('#reader.active-view'))renderReader();return;}
if(a==='font-down' || a==='setting-font-down'){applyGlobalFontSize((state.reader.font||19) - 1);if(document.querySelector('#reader.active-view'))renderReader();return;}
if(a==='theme'){const chosenTheme = action.dataset.theme || 'paper'; state.reader.theme=chosenTheme; saveState(); const paper = document.querySelector('.reader-paper'); if(paper){paper.className = paper.className.replace(/\btheme-\w+/g, '') + ` theme-${chosenTheme}`;} renderReader(); toast(`Theme set to ${chosenTheme}`); return;}
if(a==='reader-mode'){state.reader.mode=action.dataset.mode;saveState();renderReader();setTimeout(()=>scrollReaderChapter(state.activeChapter||0),80)}
if(a==='focus-reader'){state.reader.focus=!state.reader.focus;saveState();renderReader();document.body.classList.toggle('reader-focus',!!state.reader.focus);toast(state.reader.focus?'Focus reading on.':'Focus reading off.')}
if(a==='fullscreen-reader'){if(!document.fullscreenElement){if(document.documentElement.requestFullscreen){document.documentElement.requestFullscreen();}else if(document.body.requestFullscreen){document.body.requestFullscreen();}}else{if(document.exitFullscreen){document.exitFullscreen();}}return;}
if(a==='highlight'){state.highlighted[id]=!state.highlighted[id];saveState();renderReader()}
if(a==='open-chapter'){state.currentBook=id;const chIdx=Number(action.dataset.chapterIndex||0);openReader(id, chIdx);return;}
if(a==='signin-local'){const name=document.querySelector('#account-name')?.value.trim();state.account=name||'Local reader';saveState();renderAll();toast('Signed in locally.')}if(a==='signout-local'){state.account=null;saveState();renderAll();toast('Signed out locally.')}if(a==='export-state'){exportState()}if(a==='app-theme'){state.appTheme=action.dataset.themeChoice||'system';saveState();applyAppTheme();renderSettings();toast(`Theme set to ${state.appTheme}.`)}if(a==='save-note'){const text=document.querySelector('#reader-note')?.value.trim();if(text){state.notes[id]=[...(state.notes[id]||[]),{text,at:new Date().toISOString()}];saveState();renderAll();toast('Margin note saved.')}}return}if(e.target?.id==='btn-clear-server-cache'){fetch('/api/clear-cache',{method:'POST'}).then(r=>r.json()).then(()=>{toast('Server cache fully cleared & re-indexed!');}).catch(()=>toast('Could not reach server'));return;}const dropdownBtn = e.target.closest('#explore-filter-dropdown-btn');if(dropdownBtn){e.preventDefault();e.stopPropagation();const menu=document.getElementById('explore-filter-dropdown-menu');if(menu){const isOpen=menu.classList.toggle('active');dropdownBtn.setAttribute('aria-expanded',isOpen?'true':'false');}return;}const optItem = e.target.closest('.dropdown-option-item');if(optItem){e.preventDefault();e.stopPropagation();const genre=optItem.dataset.genre||'all';const menu=document.getElementById('explore-filter-dropdown-menu');const btn=document.getElementById('explore-filter-dropdown-btn');if(menu)menu.classList.remove('active');if(btn)btn.setAttribute('aria-expanded','false');renderExplore(genre);return;}const selectWrap = e.target.closest('.explore-filter-select-wrap');if(!selectWrap){const menu=document.getElementById('explore-filter-dropdown-menu');const btn=document.getElementById('explore-filter-dropdown-btn');if(menu&&menu.classList.contains('active')){menu.classList.remove('active');if(btn)btn.setAttribute('aria-expanded','false');}}const view=e.target.closest('[data-view]');if(view){e.preventDefault();showView(view.dataset.view);return}const shelf=e.target.closest('.shelf-tabs button');if(shelf){state.activeShelf=shelf.dataset.shelf;saveState();renderLibrary();return}const exp=e.target.closest('.explore-controls button');if(exp){state.exploreFilter=exp.dataset.exploreFilter;saveState();renderExplore();return}const themeChoice=e.target.closest('[data-theme-choice]');if(themeChoice){state.appTheme=themeChoice.dataset.themeChoice;saveState();renderSettings();applyAppTheme();return}const filter=e.target.closest('.filter-row button');if(filter){state.searchFilter=filter.dataset.filter;saveState();renderSearch();return}const author=e.target.closest('[data-author]');if(author){document.querySelector('.explore-content').innerHTML=`<section class="explore-block"><header><h3>${author.dataset.author}</h3><p>Author shelf</p></header><div class="explore-books">${BOOKS.filter(b=>b.author===author.dataset.author).map(b=>`<article class="explore-book">${coverHTML(b,'feature')}<h4>${b.title}</h4><p>${b.genre}</p>${actions(b.id)}</article>`).join('')}</div></section>`;return}const mood=e.target.closest('[data-mood]');if(mood){document.querySelector('.explore-content').innerHTML=`<section class="explore-block"><header><h3>${mood.dataset.mood}</h3><p>Mood shelf</p></header><div class="explore-books">${BOOKS.filter(b=>b.mood===mood.dataset.mood).map(b=>`<article class="explore-book">${coverHTML(b,'feature')}<h4>${b.title}</h4><p>${b.author}</p>${actions(b.id)}</article>`).join('')}</div></section>`;return}const cat=e.target.closest('[data-category]');if(cat){const name=cat.dataset.category;document.querySelector('.explore-content').innerHTML=`<section class="explore-block"><header><h3>${name}</h3><p>Dedicated shelf for ${name.toLowerCase()} only.</p></header><div class="explore-books">${BOOKS.filter(b=>(b.format||inferFormat(b))===name).map(b=>`<article class="explore-book">${coverHTML(b,'feature')}<h4>${b.title}</h4><p>${b.author} · ${b.mood}</p><span class="book-type-badge">${b.format||inferFormat(b)}</span>${actions(b.id)}</article>`).join('')||'<div class="empty-state"><h3>No titles yet.</h3><p>This shelf is ready for future catalogue items.</p></div>'}</div></section>`;return}const cover=e.target.closest('[data-book]');if(cover&&!e.target.closest('button'))openBook(cover.dataset.book)});
document.addEventListener('change',e=>{if(e.target?.dataset.action==='line'){state.reader.line=Number(e.target.value);saveState();renderReader()}if(e.target?.id==='setting-line'){state.reader.line=Number(e.target.value);saveState();renderAll()}if(e.target?.id==='import-state'){const file=e.target.files[0];if(file){file.text().then(txt=>{state={...DEFAULT_STATE,...JSON.parse(txt)};saveState();renderAll();toast('Sync file imported.')}).catch(()=>toast('Import failed.'))}}});
function inferFormat(b) {
  if (!b) return 'Books';
  if (b.format) return b.format;
  const g = (b.genre || '').toLowerCase();
  const id = (b.id || '').toLowerCase();
  if (id.startsWith('mangapill-') || id.startsWith('manhwa18-') || id.startsWith('mangabuddy-') || id.startsWith('telegram-') || id.startsWith('private-tg-') || g.includes('manga') || g.includes('manhwa')) return 'Manga & Manhwa';
  if (id.startsWith('royalroad-') || g.includes('novel')) return 'Web Novels';
  return 'Books';
}

function applyGlobalFontSize(size) {
  const fontVal = Math.max(14, Math.min(28, Number(size) || 19));
  state.reader.font = fontVal;
  document.documentElement.style.setProperty('--reader-font', `${fontVal}px`);
  document.querySelectorAll('.reader-paper, .reading-prose, .stolen-prose').forEach(el => {
    el.style.setProperty('--reader-font', `${fontVal}px`);
    el.style.fontSize = `${fontVal}px`;
  });
  const fontOut = document.querySelector('#setting-font-out');
  if (fontOut) fontOut.textContent = `${fontVal}px`;
  const fontSlider = document.querySelector('#setting-font');
  if (fontSlider && Number(fontSlider.value) !== fontVal) fontSlider.value = fontVal;
  const quickDisp = document.querySelector('#quick-font-display');
  if (quickDisp) quickDisp.textContent = `${fontVal}px`;
  saveState();
}

function renderSettings() {
  applyGlobalFontSize(state.reader.font || 19);
  const lineInput = document.querySelector('#setting-line');
  if (lineInput) lineInput.value = state.reader.line || 1.85;

  document.querySelectorAll('[data-theme-choice]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.themeChoice === (state.appTheme || 'system'));
  });

  const accountStatus = document.querySelector('#account-status');
  if (accountStatus) {
    accountStatus.textContent = state.account ? `Signed in as: ${state.account}` : 'Using local guest session.';
  }
}

function applyAppTheme() {
  const theme = state.appTheme || 'night';
  const isNight = theme === 'night' || (theme === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (isNight) {
    document.documentElement.setAttribute('data-theme', 'night');
    document.body.classList.add('theme-night');
    document.body.classList.remove('theme-day');
    document.querySelectorAll('.md-theme-toggle-btn .theme-icon').forEach(el => el.textContent = '🌙');
    document.querySelectorAll('.md-theme-toggle-btn .theme-text').forEach(el => el.textContent = 'Night');
    renderMangaDexHome();
  } else {
    document.documentElement.setAttribute('data-theme', 'day');
    document.body.classList.add('theme-day');
    document.body.classList.remove('theme-night');
    document.querySelectorAll('.md-theme-toggle-btn .theme-icon').forEach(el => el.textContent = '☀️');
    document.querySelectorAll('.md-theme-toggle-btn .theme-text').forEach(el => el.textContent = 'Day');
  }
}

function exportState() {
  try {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", "bibliotheque_backup.json");
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
    toast('Backup file exported.');
  } catch (e) {
    toast('Export failed.');
  }
}

function loadEpubFile(file) {
  if (!file) return;
  toast(`Loading EPUB: ${file.name}...`);
  if (window.ePub) {
    const readerViewer = document.querySelector('#epub-viewer');
    if (readerViewer) {
      readerViewer.innerHTML = '';
      const bookObj = window.ePub(file);
      const rendition = bookObj.renderTo("epub-viewer", { width: "100%", height: "80vh" });
      rendition.display();
      toast('EPUB rendered successfully.');
    }
  } else {
    toast('EPUB viewer engine loading...');
  }
}

function setupAutoHideReaderControls() {}

function observeLazyChapters() {
  const triggers = document.querySelectorAll('.lazy-manga-trigger:not([data-observed])');
  triggers.forEach(trig => {
    trig.setAttribute('data-observed', 'true');
    trig.addEventListener('click', () => {
      if (window.queueChapterLoad) window.queueChapterLoad(trig);
    });
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          observer.disconnect();
          if (window.queueChapterLoad) window.queueChapterLoad(trig);
        }
      }, { rootMargin: '300px' });
      observer.observe(trig);
    }
  });
}

function loadBooksJson() {
  return Promise.resolve();
}

// Navigation & Topbar Click Handler
document.addEventListener('click', e => {
  const brand = e.target.closest('.brand');
  if (brand) {
    e.preventDefault();
    showView('home');
    return;
  }
  const searchBtn = e.target.closest('[data-open-search]');
  if (searchBtn) {
    e.preventDefault();
    if (document.querySelector('.md-clean-sidebar')) {
      document.body.classList.add('md-search-active');
      setTimeout(() => document.querySelector('#md-search-input')?.focus(), 50);
    } else {
      showView('search');
    }
    return;
  }
  const settingsBtn = e.target.closest('[data-open-settings]');
  if (settingsBtn) {
    e.preventDefault();
    showView('settings');
    return;
  }
  const userBtn = e.target.closest('.topbar .user');
  if (userBtn) {
    e.preventDefault();
    showView('profile');
    return;
  }
  const navA = e.target.closest('.nav a');
  if (navA) {
    e.preventDefault();
    const href = navA.getAttribute('href') || '';
    if (href === '#library') showView('library-view');
    else if (href === '#reading-now') showView('reader');
    else if (href === '#explore') showView('explore-view');
    else if (href === '#profile') showView('profile');
    else if (href.startsWith('#')) showView(href.replace('#', ''));
    return;
  }
});

document.addEventListener('input', e => {
  if (e.target?.id === 'book-search') {
    clearTimeout(searchInputTimer);
    searchInputTimer = setTimeout(() => renderSearch(), 180);
  }
  if (e.target?.id === 'md-search-input') {
    const val = e.target.value;
    clearTimeout(liveSearchDebounceTimer);
    // Instant Continuous Search while typing (0ms latency!)
    renderInstantContinuousSearch(val);
    liveSearchDebounceTimer = setTimeout(() => {
      handleLiveSearchInput(val);
    }, 140);
  }
  if (e.target?.id === 'setting-font') {
    applyGlobalFontSize(e.target.value);
  }
});

document.addEventListener('focusin', e => {
  if (e.target?.id === 'md-search-input' && e.target.value.trim().length >= 2) {
    handleLiveSearchInput(e.target.value);
  }
});

document.addEventListener('submit', e => {
  if (e.target.id === 'md-search-form') {
    e.preventDefault();
    const dropdown = document.getElementById('md-live-search-dropdown');
    const firstItem = dropdown?.querySelector('.md-live-result-item');
    if (firstItem) {
      firstItem.click();
    }
    return;
  }
  if (e.target.classList.contains('search-board')) {
    e.preventDefault();
    renderSearch();
  }
});

document.addEventListener('click', e => {
  const btn = e.target.closest('[data-reader-action]');
  if (!btn) return;
  e.preventDefault();
  const a = btn.dataset.readerAction;
  if (a === 'toggle-contents') { state.reader.navOpen = !state.reader.navOpen; saveState(); renderReader(); }
  if (a === 'toggle-notes') { state.reader.notesOpen = !state.reader.notesOpen; saveState(); renderReader(); }
  if (a === 'toggle-epub') { state.reader.epubMode = !state.reader.epubMode; saveState(); renderReader(); }
  if (a === 'manga-mode') { state.reader.mangaMode = btn.dataset.mode; saveState(); renderReader(); }
  if (a === 'manga-direction') { state.reader.mangaDirection = state.reader.mangaDirection === 'rtl' ? 'ltr' : 'rtl'; saveState(); renderReader(); }
  if (a === 'delete-note') {
    const id = state.currentBook;
    const index = Number(btn.dataset.noteIndex);
    state.notes[id] = (state.notes[id] || []).filter((_, i) => i !== index);
    saveState();
    renderAll();
    toast('Note deleted.');
  }
});

document.addEventListener('input', e => {
  if (e.target?.id === 'chapter-search') {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('.chapter-list a').forEach(a => a.style.display = (a.dataset.chapterTitle || '').includes(q) ? 'block' : 'none');
  }
});

document.addEventListener('change', e => {
  if (e.target?.id === 'epub-upload') loadEpubFile(e.target.files[0]);
});

document.addEventListener('keydown', e => {
  // If user is typing in an input, don't trigger shortcuts
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

  if ((e.key === 'h' || e.key === 'H') && document.querySelector('#reader.active-view')) {
    e.preventDefault();
    document.body.classList.toggle('reader-side-rail-hidden');
    const isHidden = document.body.classList.contains('reader-side-rail-hidden');
    toast(isHidden ? 'Controls hidden (Press H to restore)' : 'Controls restored');
  }
});

document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && state.reader.focus) {
    state.reader.focus = false;
    saveState();
    renderReader();
  }
});

function handleRouting() {
  const raw = location.hash.replace('#', '');
  if (raw.startsWith('/book/') || raw === 'book-detail') {
    if (raw.startsWith('/book/')) {
      const bid = raw.split('/')[2];
      if (bid) {
        state.currentBook = bid;
        const cached = state.cachedBooks[bid];
        if (cached) {
          const idx = BOOKS.findIndex(b => b.id === bid);
          if (idx >= 0) BOOKS[idx] = Object.assign(BOOKS[idx], cached);
          else BOOKS.push(cached);
        }
      }
    }
    renderDetail();
    showView('book-detail', false);
  } else if (raw.startsWith('/read/') || raw === 'reader' || raw === 'reading-now') {
    if (raw.startsWith('/read/')) {
      const parts = raw.split('/');
      if (parts[2]) {
        state.currentBook = parts[2];
        const cached = state.cachedBooks[parts[2]];
        if (cached) {
          const idx = BOOKS.findIndex(b => b.id === parts[2]);
          if (idx >= 0) BOOKS[idx] = Object.assign(BOOKS[idx], cached);
          else BOOKS.push(cached);
        }
      }
      state.activeChapter = Math.max(0, Number(parts[3] || 1) - 1);
    }
    renderReader();
    showView('reader', false);
  } else if (raw === 'library' || raw === 'library-view') {
    showView('library-view', false);
  } else if (raw === 'profile') {
    showView('profile', false);
  } else if (raw === 'settings') {
    showView('settings', false);
    } else if (raw === 'search') {
      if (document.querySelector('.md-clean-sidebar')) {
        document.body.classList.add('md-search-active');
        document.querySelector('#md-search-input')?.focus();
      } else {
        showView('search', false);
      }
    } else if (raw === 'explore' || raw === 'explore-view') {
      showView('explore-view', false);
    } else {
      showView('home', false);
    }
}

window.addEventListener('popstate', handleRouting);
window.addEventListener('hashchange', handleRouting);

// ─────────────────────────────────────────────────────────────────────────────
// MANGADEX HOME VIEW LIVE API INTEGRATION & DYNAMIC CAROUSEL
// ─────────────────────────────────────────────────────────────────────────────
let TRENDING_MANGA_LIST = [];
let currentHeroSlideIndex = 0;
let heroSlideAutoTimer = null;

async function fetchLiveTrendingManga() {
  try {
    const res = await fetch('/api/trending');
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      TRENDING_MANGA_LIST = data;
      data.forEach(m => {
        const existingIdx = BOOKS.findIndex(b => b.id === m.id);
        if (existingIdx >= 0) {
          BOOKS[existingIdx] = Object.assign(BOOKS[existingIdx], m);
        } else {
          BOOKS.push(m);
        }
      });
      renderMangaDexHome();
    }
  } catch (e) {
    console.warn('[MangaDex Home] Error fetching trending:', e.message);
  }
}

function renderMangaDexHome() {
  const stage = document.querySelector('#md-hero-stage');
  const latestGrid = document.querySelector('#md-latest-grid');
  const recGrid = document.querySelector('#md-recommended-grid');
  if (!stage || TRENDING_MANGA_LIST.length === 0) return;

  // 1. Render Panoramic Hero Banner Slides (Top 10 items)
  const heroItems = TRENDING_MANGA_LIST.slice(0, 10);
  stage.innerHTML = heroItems.map((m, idx) => {
    const activeClass = idx === currentHeroSlideIndex ? 'active-slide' : '';
    const tagsHtml = (m.tags || ['Action', 'Fantasy']).slice(0, 5).map(t => 
      `<span class="md-hero-tag-span">${t}</span>`
    ).join('');
    const coverImg = m.banner || m.cover || m.image || '';

    const rawAlt = (m.altTitle || '').trim();
    const hasForbiddenChars = /[\uac00-\ud7af\u1100-\u11ff\u0400-\u04ff]/u.test(rawAlt);
    const cleanAlt = (!hasForbiddenChars && rawAlt && rawAlt.toLowerCase() !== m.title.toLowerCase()) ? rawAlt : '';

    return `
      <div class="md-panoramic-slide ${activeClass}" data-slide-index="${idx}">
        ${coverImg ? `<img class="md-panoramic-bg-img" src="${coverImg}" alt="" loading="lazy" />` : ''}
        <div class="md-banner-gradient-shade"></div>
        <div class="md-hero-container">
          <div class="md-hero-poster-box group flex items-start relative mb-auto select-none w-auto h-full aspect-7/10 rounded shadow-md bg-transparent" data-action="open-book" data-book="${m.id}" style="cursor: pointer;">
            ${coverImg ? `<img class="md-cover-img rounded shadow-md w-full h-full" src="${coverImg}" alt="${m.title}" loading="lazy" />` : `<div style="width:100%;height:100%;background:#1e293b;border-radius:4px;display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;">📖</div>`}
            <img class="md-hero-flag-icon inline-block select-none absolute right-2 bottom-1.5" title="Japanese" src="https://flagcdn.com/w40/jp.png" alt="Japanese flag icon" width="24" height="16" loading="lazy" style="z-index: 1;" />
          </div>
          <div class="md-hero-details-grid">
            <div class="md-hero-titles-wrap" style="display:flex;flex-direction:column;gap:2px;">
              <h2 class="md-hero-title-h2 font-bold text-xl line-clamp-5 sm:line-clamp-2 lg:text-4xl overflow-hidden" style="line-height: 2.2rem; cursor: pointer; margin:0;" data-action="open-book" data-book="${m.id}">${m.title}</h2>
              ${cleanAlt ? `<span class="md-hero-alt-sub" style="font-size:0.85rem;color:#94a3b8;font-weight:400;letter-spacing:0.01em;opacity:0.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;">${cleanAlt}</span>` : ''}
            </div>
            <div class="md-hero-tags-row">
              ${tagsHtml}
            </div>
            <div class="md-hero-desc-box preview-description">
              <p>${m.synopsis || 'Explore this trending manga series on Mangapill with full scanlations.'}</p>
            </div>
            <div class="md-hero-bottom-row">
              <span class="md-hero-author-text">${m.author || 'Manga Artist'}${m.year ? ` • ${m.year}` : ''}${m.status ? ` • ${m.status}` : ''}</span>
              <div class="md-hero-slider-nav">
                <span class="md-hero-slide-num">NO. ${idx + 1}</span>
                <button type="button" class="md-nav-arrow-btn md-slide-prev" data-slide-prev aria-label="Previous">‹</button>
                <button type="button" class="md-nav-arrow-btn md-slide-next" data-slide-next aria-label="Next">›</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // 2. Render Latest Updates Grid (Items 10 to 20)
  if (latestGrid) {
    const latestItems = TRENDING_MANGA_LIST.slice(10, 20);
    latestGrid.innerHTML = latestItems.map((m, i) => {
      const coverImg = m.cover || m.image || '';
      return `
        <article class="md-feed-card" data-action="open-book" data-book="${m.id}" style="cursor: pointer;">
          <div class="md-feed-cover-wrap">
            ${coverImg ? `<img src="${coverImg}" alt="${m.title}" loading="lazy" />` : `<div style="width:100%;height:180px;background:#1e293b;border-radius:4px;display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;">📖</div>`}
            <span class="md-feed-badge">HOT</span>
          </div>
          <div class="md-feed-info">
            <h3 class="md-feed-name">${m.title}</h3>
            <span class="md-feed-sub">${m.author || 'Manga Artist'}</span>
          </div>
        </article>
      `;
    }).join('');
  }

  // 3. Render Recommended Grid (Items 20 to 28)
  if (recGrid) {
    const recItems = TRENDING_MANGA_LIST.slice(20, 28);
    recGrid.innerHTML = recItems.map(m => {
      const coverImg = m.cover || m.image || '';
      return `
        <article class="md-feed-card" data-action="open-book" data-book="${m.id}" style="cursor: pointer;">
          <div class="md-feed-cover-wrap">
            ${coverImg ? `<img src="${coverImg}" alt="${m.title}" loading="lazy" />` : `<div style="width:100%;height:180px;background:#1e293b;border-radius:4px;display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;">📖</div>`}
            <span class="md-feed-badge" style="color:#38bdf8;">⭐ 9.${Math.floor(Math.random() * 4 + 5)}</span>
          </div>
          <div class="md-feed-info">
            <h3 class="md-feed-name">${m.title}</h3>
            <span class="md-feed-sub">${(m.tags || ['Manga'])[0] || 'Trending'}</span>
          </div>
        </article>
      `;
    }).join('');
  }

  setupHeroCarouselEvents();
  prefetchTrendingChapters();
}

function prefetchTrendingChapters() {
  if (!TRENDING_MANGA_LIST || !TRENDING_MANGA_LIST.length) return;
  state.cachedChapters = state.cachedChapters || {};
  TRENDING_MANGA_LIST.slice(0, 10).forEach((item, idx) => {
    setTimeout(() => {
      if (state.cachedChapters[item.id]) return;
      fetch(`/api/books/${item.id}/chapters?q=${encodeURIComponent(item.title)}`)
        .then(r => r.json())
        .then(data => {
          if (data.chapters && data.chapters.length > 0) {
            state.cachedChapters[item.id] = { chapters: data.chapters, source: data.source, metadata: data.metadata };
            const b = BOOKS.find(x => x.id === item.id);
            if (b) b.chapters = data.chapters;
          }
        }).catch(() => {});
    }, (idx + 1) * 350);
  });
}

function setupHeroCarouselEvents() {
  const slides = document.querySelectorAll('.md-panoramic-slide');
  if (slides.length <= 1) return;

  function goToSlide(idx) {
    slides.forEach(s => s.classList.remove('active-slide'));
    currentHeroSlideIndex = (idx + slides.length) % slides.length;
    slides[currentHeroSlideIndex].classList.add('active-slide');
  }

  document.querySelectorAll('.md-slide-prev').forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      goToSlide(currentHeroSlideIndex - 1);
      restartHeroAutoSlide();
    };
  });

  document.querySelectorAll('.md-slide-next').forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      goToSlide(currentHeroSlideIndex + 1);
      restartHeroAutoSlide();
    };
  });

  restartHeroAutoSlide();
}

function restartHeroAutoSlide() {
  clearInterval(heroSlideAutoTimer);
  heroSlideAutoTimer = setInterval(() => {
    const slides = document.querySelectorAll('.md-panoramic-slide');
    if (slides.length > 1) {
      slides.forEach(s => s.classList.remove('active-slide'));
      currentHeroSlideIndex = (currentHeroSlideIndex + 1) % slides.length;
      slides[currentHeroSlideIndex].classList.add('active-slide');
    }
  }, 6000);
}

// Global MangaDex Topbar & Sidebar listener
document.addEventListener('click', e => {
  // Theme Toggle Button
  const themeToggle = e.target.closest('[data-toggle-theme]');
  if (themeToggle) {
    e.preventDefault();
    state.appTheme = (state.appTheme === 'night' || document.body.classList.contains('theme-night')) ? 'day' : 'night';
    saveState();
    applyAppTheme();
    toast(`Switched to ${state.appTheme === 'night' ? 'Night' : 'Day'} Mode.`);
    return;
  }

  // Sidebar navigation active badge update
  const navLink = e.target.closest('.md-clean-sidebar .md-nav-link');
  if (navLink) {
    document.querySelectorAll('.md-clean-sidebar .md-nav-link').forEach(l => l.classList.remove('active'));
    navLink.classList.add('active');
  }
});

// Keyboard navigation for live search and global shortcuts
document.addEventListener('keydown', e => {
  const searchInput = document.querySelector('#md-search-input');
  const dropdown = document.getElementById('md-live-search-dropdown');
  const isDropdownOpen = dropdown && dropdown.classList.contains('active');

  // Ctrl + K to focus search
  if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
    e.preventDefault();
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
      if (searchInput.value.trim().length >= 2) {
        handleLiveSearchInput(searchInput.value);
      }
    }
    return;
  }

  // Escape to close dropdown
  if (e.key === 'Escape') {
    if (isDropdownOpen) {
      closeLiveSearchDropdown();
      if (searchInput) searchInput.blur();
    }
    return;
  }

  // Arrow navigation inside live search dropdown
  if (isDropdownOpen) {
    const items = [...dropdown.querySelectorAll('.md-live-result-item')];
    if (items.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeLiveSearchIndex = (activeLiveSearchIndex + 1) % items.length;
      items.forEach((item, idx) => {
        item.classList.toggle('selected', idx === activeLiveSearchIndex);
        if (idx === activeLiveSearchIndex) item.scrollIntoView({ block: 'nearest' });
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeLiveSearchIndex = (activeLiveSearchIndex - 1 + items.length) % items.length;
      items.forEach((item, idx) => {
        item.classList.toggle('selected', idx === activeLiveSearchIndex);
        if (idx === activeLiveSearchIndex) item.scrollIntoView({ block: 'nearest' });
      });
    } else if (e.key === 'Enter' && activeLiveSearchIndex >= 0 && items[activeLiveSearchIndex]) {
      e.preventDefault();
      items[activeLiveSearchIndex].click();
    }
  }
});

// Click outside to close live search dropdown
document.addEventListener('click', e => {
  if (!e.target.closest('.md-nav-search-wrap')) {
    closeLiveSearchDropdown();
  }
});

// Initialize application
applyGlobalFontSize(state.reader?.font || 19);
renderAll();
handleRouting();
fetchLiveTrendingManga();

