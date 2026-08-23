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

  const isManga = id.startsWith('madara-') || id.startsWith('divascans-') || id.startsWith('telegram-') || id.startsWith('private-tg-');
  const isWebnovel = id.startsWith('royalroad-');

  let rawClean = id.replace(/^(itunes|madara|royalroad|divascans|telegram|private-tg)-/, '')
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
const saved=id=>state.saved.includes(id), liked=id=>state.liked.includes(id);
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

function highlightMatchText(text, query) {
  if (!text || !query) return text || '';
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  return text.replace(regex, '<mark style="background:#f59e0b;color:#000;padding:0 2px;border-radius:2px;font-weight:700;">$1</mark>');
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

      results.innerHTML = uniqueList.map(b => {
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
          .replace(/\b(telegram|divascans|madarascans|madara|channel|global vault|complete series|high.?res)\b/gi, '')
          .replace(/^by\s+/i, '')
          .trim();
        if (!cleanAuthor || cleanAuthor.toLowerCase() === 'author' || cleanAuthor.toLowerCase() === 'royal road author') {
          cleanAuthor = b.id.startsWith('royalroad-') ? 'Royal Road Author' : (b.id.startsWith('private-tg-') || b.id.startsWith('telegram-') || b.id.startsWith('madara-') || b.id.startsWith('divascans-') ? 'Manga Artist' : 'Classic Author');
        }

        const rawYear = b.year || b.releaseDate || b.publishedDate || '';
        const yearMatch = String(rawYear).match(/\d{4}/);
        const yearStr = yearMatch ? yearMatch[0] : '';
        let subtitleLine = b.altTitle ? `${b.altTitle} · ${cleanAuthor}` : (yearStr && !cleanAuthor.includes(yearStr) ? `${cleanAuthor} · ${yearStr}` : cleanAuthor);

        const tLower = (b.title || '').toLowerCase();
        const gLower = (b.genre || '').toLowerCase();
        const mLower = (b.mood || '').toLowerCase();

        const isAdult    = tLower.includes('pornhwa') || tLower.includes('doujinshi') || gLower.includes('adult') || mLower.includes('adult') || mLower.includes('smut') || b.id.startsWith('divascans-');
        const isOneShot  = gLower === 'one-shot' || tLower.includes('one-shot') || tLower.includes('oneshot');
        const isManhua   = gLower === 'manhua' || tLower.includes('manhua') || mLower.includes('manhua');
        const isManhwa   = gLower === 'manhwa' || tLower.includes('manhwa') || mLower.includes('manhwa');
        const isLightNovel = gLower === 'light novel' || tLower.includes('light novel') || (b.altTitle && b.altTitle.toLowerCase().includes('light novel')) || tLower.includes('shousetsu');
        const isWebNovel = b.id.startsWith('royalroad-') || gLower === 'web novel' || tLower.includes('web novel') || (gLower.includes('novel') && !isLightNovel);
        const isMangaType = b.id.startsWith('mangapill-') || b.id.startsWith('madara-') || b.id.startsWith('temple-') || b.id.startsWith('telegram-') || b.id.startsWith('private-tg-') || gLower.includes('manga') || mLower.includes('manga');

        let typeLabel = 'BOOK';
        let typeBg    = '#d97706';

        if (isAdult)          { typeLabel = isManhwa ? 'MANHWA (+18)' : isMangaType ? 'MANGA (+18)' : 'ADULT (+18)'; typeBg = '#dc2626'; }
        else if (isOneShot)   { typeLabel = 'ONE-SHOT';    typeBg = '#6366f1'; }
        else if (isLightNovel){ typeLabel = 'LIGHT NOVEL'; typeBg = '#9333ea'; }
        else if (isManhua)    { typeLabel = 'MANHUA';     typeBg = '#0891b2'; }
        else if (isManhwa)    { typeLabel = 'MANHWA';     typeBg = '#16a34a'; }
        else if (isWebNovel)  { typeLabel = 'WEB NOVEL';  typeBg = '#7c3aed'; }
        else if (isMangaType) { typeLabel = 'MANGA';      typeBg = '#2563eb'; }

        const catBadge = `<span style="background:${typeBg};color:#fff;padding:3px 8px;border-radius:4px;font-size:0.72rem;font-weight:800;flex-shrink:0;letter-spacing:0.03em;">${typeLabel}</span>`;
        const imgStyle = b.image ? `background-image:url('${b.image}');background-size:cover;background-position:center;` : '';

        return `<div class="search-result-item" data-book="${b.id}" onclick="openBook('${b.id}')" style="cursor:pointer;display:flex;align-items:center;gap:16px;padding:14px 16px;border-bottom:1px solid #2a2a2a;border-radius:8px;margin-bottom:8px;background:#141414;transition:background 0.2s ease;" onmouseover="this.style.background='#1f1f1f'" onmouseout="this.style.background='#141414'">
          <span class="result-cover ${(b.cover||'').split(' ')[0]}" style="${imgStyle};width:44px;height:60px;border-radius:6px;flex-shrink:0;"></span>
          <div style="flex:1;min-width:0;">
            <strong style="display:block;font-size:1.05rem;color:#fff;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${highlightMatchText(b.title, q)}</strong>
            <em style="color:#aaa;font-size:0.85rem;font-style:normal;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block;">${subtitleLine}</em>
          </div>
          ${catBadge}
          <div onclick="event.stopPropagation()">
            ${actions(b.id)}
          </div>
        </div>`;
      }).join('');
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
  let altTitle = b.altTitle || (parts.length > 1 ? parts.slice(1).join(' · ') : '');

  // Extract / Map Author
  let authorLine = (b.author || 'Manga Artist').trim()
    .replace(/@\w+/g, '')
    .replace(/\b(telegram|divascans|madarascans|madara|channel|global vault|complete series|high.?res)\b/gi, '')
    .replace(/^by\s+/i, '')
    .trim();
  if (!authorLine || authorLine.toLowerCase() === 'author') authorLine = 'Manga Artist';

  // Extract Tags & Category Pills (MangaDex style)
  const tagSet = new Set();
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
  if (chapters.length > 0) {
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

  const bookBg = b.banner || b.image || b.cover || '';
  const coverSrc = b.image || b.cover || '';
  const firstChIdx = 0;

  // Format synopsis into clean readable paragraphs
  const rawSynopsis = (b.synopsis || 'No synopsis provided for this volume.').trim();
  const synopsisParagraphs = rawSynopsis.split(/\n+/).map(para => `<p>${para.trim()}</p>`).join('');

  g.innerHTML = `
    <div class="md-detail-wrapper">
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
              ${coverSrc ? `<img src="${coverSrc}" alt="${mainTitle} cover" loading="eager">` : `<div class="md-no-cover">NO COVER</div>`}
              <div class="md-flag-badge">🇯🇵</div>
            </div>
          </div>

          <!-- RIGHT: Titles & Palette Controls -->
          <div class="md-meta-container">
            
            <!-- SECTION 1: IN BANNER (Titles) -->
            <div class="md-banner-titles">
              <p class="md-title-text">${mainTitle}</p>
              ${altTitle ? `<div class="md-subtitle-text">${altTitle}</div>` : ''}
              <div class="md-grow-spacer"></div>
              <div class="md-author-row">
                <div class="md-author-text">${authorLine}</div>
              </div>
            </div>

            <!-- SECTION 2: IN SOLID DARK PALETTE (Actions, Tags, Stats) -->
            <div class="md-palette-controls">
              <!-- Action Buttons -->
              <div class="md-actions-bar">
                <button class="md-btn-primary" data-action="open-chapter" data-book="${b.id}" data-chapter-index="${firstChIdx}">
                  <span>Add To Library</span>
                </button>
                <button class="md-btn-icon ${saved(b.id)?'active':''}" data-action="save" data-book="${b.id}" title="${saved(b.id)?'Saved':'Add to Library'}">
                  <svg width="18" height="18" fill="${saved(b.id)?'#38bdf8':'none'}" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
                </button>
                <button class="md-btn-icon" title="Report">
                  <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zm0 7v-7"/></svg>
                </button>
                <button class="md-btn-icon" title="Share">
                  <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                </button>
              </div>

              <!-- Tags & Status Row -->
              <div class="md-tags-bar tags-row">
                ${pillsHTML}
                <span class="md-status-bullet">🟢 PUBLICATION: ${yearStr}, ${statusStr}</span>
              </div>

              <!-- Stats Row (MangaDex Feather SVG Spec) -->
              <div class="md-stats-bar">
                <span class="md-stat-item md-stat-rating" title="${b.rating || '9.66'}">
                  <svg class="feather feather-star" width="19" height="19" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>
                  <span class="text-primary">${b.rating || '9.66'}</span>
                </span>
                <span class="md-stat-item" title="83,260">
                  <svg width="19" height="19" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24"><path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                  <span>83k</span>
                </span>
                <span class="md-stat-item" title="104">
                  <svg width="19" height="19" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  <span>104</span>
                </span>
                <span class="md-stat-item md-stat-views">
                  <svg class="feather feather-eye" width="19" height="19" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8"/><circle cx="12" cy="12" r="3"/></svg>
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
  const hasTextContent = chapters.some(c => c?.html) || (selected && selected.html);
  const isManga = !hasTextContent && ((b.format||inferFormat(b))==='Manga & Manhwa');
  const chapterNav=chapters.map((c,i)=>`<a class="${i===idx?'active':''}" data-action="open-chapter" data-book="${b.id}" data-chapter-index="${i}" href="#/read/${b.id}/${i+1}" data-chapter-title="${(c.title||'').toLowerCase()}">${i+1}. ${c.title}<small>${c.minutes||12} min</small></a>`).join('');
  const renderTextChapter=(ch,i)=>{
    const proseHTML = ch.html || (ch.content||[]).map((x,j)=>`<p class="${j===0&&state.highlighted[b.id]?'highlighted':''}">${j===0?'<span class="dropcap">'+x.charAt(0)+'</span>'+x.slice(1):x}</p>`).join('');
    const fig=ch.image?`<figure class="reader-figure"><img src="${ch.image}" alt="${ch.imageCaption||ch.title}"><figcaption>${ch.imageCaption||''}</figcaption></figure>`:'';
    return `<section class="chapter-block" id="chapter-${i+1}" data-chapter-index="${i}"><p class="chapter-count">Chapter ${i+1} of ${total}</p><h2>${ch.title}</h2><span class="reader-progress-note">${ch.minutes||12} min · ${ch.publicDomain?'Public domain · ':''}${b.author}</span><div class="reading-prose stolen-prose" style="font-size:var(--reader-font);line-height:var(--reader-line)">${proseHTML}${fig}${ch.quote?`<blockquote>${ch.quote}</blockquote>`:''}</div></section>`;
  };
  const renderMangaChapter=(ch,i)=>{
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

  // Fire for external books (mangapill, divascans, madara, telegram, royalroad, searched) ONLY if chapters aren't loaded yet
  const isExternal = b.genre === 'searched' || b.genre === 'Manga' || b.genre === 'Web Novel' || b.id.startsWith('mangapill-') || b.id.startsWith('divascans-') || b.id.startsWith('madara-') || b.id.startsWith('temple-') || b.id.startsWith('telegram-') || b.id.startsWith('itunes-') || b.id.startsWith('royalroad-');
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
  
  const isMangaLoad = id.startsWith('telegram-') || id.startsWith('tg-') || id.startsWith('divascans-') || id.startsWith('madara-') || id.startsWith('temple-') || id.startsWith('private-tg-') || (genre || '').toLowerCase().includes('manga');
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
      const isManga = id.startsWith('telegram-') || id.startsWith('tg-') || id.startsWith('private-tg-') || (genre || '').toLowerCase().includes('manga') || id.startsWith('madara-') || id.startsWith('divascans-') || id.startsWith('temple-');
      
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
      if (data.type === 'webnovel' || data.type === 'book') {
        targetBook.format = 'Novel & Fiction';
        targetBook.genre = 'Web Novel';
      }
      saveState();
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
          const url = `/api/manga/chapter/${encodeURIComponent(ch.chapterId)}?title=${encodeURIComponent(realTitle)}`;
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

      if ('IntersectionObserver' in window) {
        const sectionObserver = new IntersectionObserver((entries) => {
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

function renderLibrary(){const root=document.querySelector('.library-results');if(!root)return;document.querySelectorAll('.shelf-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.shelf===state.activeShelf));let ids=[],label=state.activeShelf;if(label==='saved')ids=state.saved;if(label==='liked')ids=state.liked;if(label==='progress')ids=BOOKS.filter(b=>pct(b.id)>0&&pct(b.id)<100).map(b=>b.id);root.innerHTML=ids.length?ids.map(id=>{const b=book(id),p=pct(id);return `<article class="library-book" data-book="${id}">${coverHTML(b,'recent-cover')}<div><h3>${b.title}</h3><p>${b.author}</p><span class="progress-label"><i class="progress"><b style="width:${p}%"></b></i>${p}% read</span></div>${actions(id)}</article>`}).join(''):`<div class="empty-library"><h3>No ${label} books yet.</h3><p>Use Save and Like anywhere in the app. The homepage remains clean while this shelf stores the full collection.</p></div>`}
function renderProfile(){const p=document.querySelector('.dashboard-panel');if(!p)return;const finished=Object.values(state.progress).filter(v=>+v>=100).length,avg=state.saved.length?Math.round(state.saved.reduce((s,id)=>s+pct(id),0)/state.saved.length):0;p.innerHTML=`<p class="kicker">Personal library</p><h2>Dashboard</h2><div class="dash-stats"><article><span>Saved books</span><strong>${state.saved.length}</strong><small>personal shelf</small></article><article><span>Liked books</span><strong>${state.liked.length}</strong><small>taste profile</small></article><article><span>Average progress</span><strong>${avg}%</strong><small>${finished} finished</small></article></div><div class="annotation-panel"><h3>Recent activity</h3>${state.recent.length?state.recent.slice(0,3).map(id=>`<p>Opened <strong>${book(id).title}</strong> · ${pct(id)}% complete.</p>`).join(''):'<p>No reading activity yet. Open a book and the dashboard will begin tracking automatically.</p>'}</div>`}
function renderExplore(){const c=document.querySelector('.explore-content'),sum=document.querySelector('.explore-summary');if(!c)return;document.querySelectorAll('.explore-controls button').forEach(b=>b.classList.toggle('active',b.dataset.exploreFilter===state.exploreFilter));const t=tasteProfile(),topGenre=Object.entries(t.genres).sort((a,b)=>b[1]-a[1])[0]?.[0]||'classic fiction';if(sum)sum.innerHTML=`<strong>${recommendations(1)[0].title}</strong><span>Best next read · based on ${topGenre}</span>`;const bookGrid=(items,title,sub)=>`<section class="explore-block"><header><h3>${title}</h3><p>${sub}</p></header><div class="explore-books">${items.map(b=>`<article class="explore-book">${coverHTML(b,'feature')}<h4>${b.title}</h4><p>${b.author} · ${b.mood}</p><span class="book-type-badge">${b.format||inferFormat(b)}</span>${actions(b.id)}</article>`).join('')}</div></section>`;const authors=unique(BOOKS.map(b=>b.author)).map(a=>({name:a,count:BOOKS.filter(b=>b.author===a).length,match:t.authors[a]||0})).sort((a,b)=>b.match-a.match||b.count-a.count);const moods=unique(BOOKS.map(b=>b.mood));const cats=[['Books','Essays, nonfiction, study volumes, and general reading.'],['Novels','Long-form fiction, classics, mysteries, romance, fantasy, and literary stories.'],['Manga & Manhwa','Panel-based illustrated reading, manga-inspired volumes, and manhwa-style series.'],['More','Poetry, short forms, drama, anthologies, and formats outside the first three shelves.']];if(state.exploreFilter==='categories')c.innerHTML=`<section class="explore-block"><header><h3>Reading categories</h3><p>Separate discovery rooms. Items never duplicate into the wrong shelf.</p></header><div class="category-grid">${cats.map(([name,desc])=>`<div class="category-card" data-category="${name}"><div><strong>${name}</strong><p>${desc}</p></div><span>${BOOKS.filter(b=>(b.format||inferFormat(b))===name).length} titles</span></div>`).join('')}</div></section>`;else if(state.exploreFilter==='authors')c.innerHTML=`<section class="explore-block"><header><h3>Authors</h3><p>Click an author to see their books.</p></header><div class="author-grid">${authors.map(a=>`<div class="author-card" data-author="${a.name}"><strong>${a.name}</strong><span>${a.count} book${a.count>1?'s':''}${a.match?' · matches your taste':''}</span></div>`).join('')}</div></section>`;else if(state.exploreFilter==='moods')c.innerHTML=`<section class="explore-block"><header><h3>Moods</h3><p>Editorial discovery by feeling.</p></header><div class="mood-grid">${moods.map(m=>`<div class="mood-card" data-mood="${m}"><strong>${m}</strong><span>${BOOKS.filter(b=>b.mood===m).length} volume(s)</span></div>`).join('')}</div></section>`;else if(state.exploreFilter==='new')c.innerHTML=bookGrid([...BOOKS].reverse().slice(0,9),'New finds','Fresh volumes from the quiet shelves.');else c.innerHTML=bookGrid(recommendations(8),'Recommended for you','Scored by liked books, saved authors, recent reading, genre, mood, and unfinished progress.')+bookGrid(BOOKS.filter(b=>pct(b.id)>0&&pct(b.id)<100).slice(0,6),'Continue discovering','Books you already started receive priority.')}
function renderAll(){renderReadingList();renderFeatured();renderRecent();renderSidebarStats();renderDetail();renderReader();renderLibrary();renderProfile();renderExplore();renderSettings();applyAppTheme();}
function setNav(v){navLinks.forEach(a=>a.removeAttribute('aria-current'));searchButton?.removeAttribute('aria-current');document.querySelector('[data-open-settings]')?.removeAttribute('aria-current');if(v==='home')document.querySelector('.nav a[href="#explore"]')?.setAttribute('aria-current','page');if(v==='library-view')document.querySelector('.nav a[href="#library"]')?.setAttribute('aria-current','page');if(v==='explore-view')document.querySelector('.nav a[href="#explore"]')?.setAttribute('aria-current','page');if(v==='reader')document.querySelector('.nav a[href="#reading-now"]')?.setAttribute('aria-current','page');if(v==='profile')document.querySelector('.nav a[href="#profile"]')?.setAttribute('aria-current','page');if(v==='settings')document.querySelector('[data-open-settings]')?.setAttribute('aria-current','page');if(v==='search')searchButton?.setAttribute('aria-current','page')}
function showView(v='home',push=true){
  sections.forEach(s=>s.classList.remove('active-view'));
  if (v !== 'reader') {
    document.body.classList.remove('is-manga-mode');
  }
  // Compact navbar only on detail page
  document.body.classList.toggle('detail-active', v==='book-detail');
  document.body.classList.toggle('reader-focus', v==='reader' && !!state.reader.focus);
  if(v==='home'){app.classList.remove('view-mode');setNav('home');if(push)history.pushState({v},'','#explore');scrollTo({top:0,behavior:prefersReducedMotion?'auto':'smooth'});return}
  const target=document.getElementById(v);
  if(!target)return showView('home',push);
  app.classList.add('view-mode');
  target.classList.add('active-view');
  setNav(v);
  if(push){
    if(v==='book-detail' && state.currentBook){
      history.pushState({v},'',`#/book/${state.currentBook}`);
    } else if(v==='reader' && state.currentBook){
      history.pushState({v},'',`#/read/${state.currentBook}/${(state.activeChapter||0)+1}`);
    } else if(v==='explore-view'){
      history.pushState({v},'','#explore');
    } else {
      history.pushState({v},'',`#${v}`);
    }
  }
  scrollTo({top:0,behavior:prefersReducedMotion?'auto':'smooth'});
  if(v==='search')setTimeout(()=>document.querySelector('#book-search')?.focus(),300)
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
  state.currentBook=id;
  state.recent=[id,...state.recent.filter(x=>x!==id)].slice(0,6);
  saveState();
  renderDetail(); // Direct render to guarantee current title and cover are displayed
  showView('book-detail');

  // Auto-prefetch chapters for external items if not loaded yet
  const b = book(id);
  const isExternal = b && (b.id.startsWith('mangapill-') || b.id.startsWith('divascans-') || b.id.startsWith('madara-') || b.id.startsWith('temple-') || b.id.startsWith('mangadex-') || b.id.startsWith('private-tg-') || b.id.startsWith('telegram-') || b.id.startsWith('royalroad-') || b.id.startsWith('itunes-') || (b.genre || '').toLowerCase().includes('manga') || (b.genre || '').toLowerCase().includes('novel'));
  if (isExternal && (!b.chapters || !b.chapters.length)) {
    fetch(`/api/books/${id}/chapters?q=${encodeURIComponent(b.title)}&_cb=${Date.now()}`)
      .then(r => r.json())
      .then(data => {
        if (data.chapters && data.chapters.length > 0) {
          b.chapters = data.chapters;
          b.isFallback = !!data.isFallback;
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
  const isManga = b && (b.id.startsWith('mangapill-') || b.id.startsWith('telegram-') || b.id.startsWith('private-tg-') || b.id.startsWith('mangadex-') || b.id.startsWith('divascans-') || b.id.startsWith('madara-') || b.id.startsWith('temple-') || (b.genre || '').toLowerCase().includes('manga') || (b.format || '').toLowerCase().includes('manga'));
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
  const isExternal = b && (b.genre === 'searched' || b.genre === 'Manga' || b.genre === 'Web Novel' || b.id.startsWith('divascans-') || b.id.startsWith('mangadex-') || b.id.startsWith('private-tg-') || b.id.startsWith('telegram-') || b.id.startsWith('royalroad-') || b.id.includes('-'));
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
    // Auto-dim floating controls when actively scrolling down in manga mode
    if (document.body.classList.contains('is-manga-mode')) {
      const topPill = document.querySelector('.manga-top-pill');
      const sideDock = document.querySelector('.manga-side-dock');
      const currentY = window.scrollY;
      if (currentY > lastY + 15 && currentY > 100) {
        if (topPill) topPill.style.opacity = '0.2';
        if (sideDock) sideDock.style.opacity = '0.2';
      } else if (currentY < lastY - 10) {
        if (topPill) topPill.style.opacity = '1';
        if (sideDock) sideDock.style.opacity = '1';
      }
      lastY = currentY;
      clearTimeout(scrollDimTimer);
      scrollDimTimer = setTimeout(() => {
        if (topPill) topPill.style.opacity = '1';
        if (sideDock) sideDock.style.opacity = '1';
      }, 1200);
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

document.addEventListener('click',e=>{const action=e.target.closest('[data-action]');if(action){e.preventDefault();e.stopPropagation();const id=action.dataset.book||state.currentBook,a=action.dataset.action;if(a==='back-step'||a==='back-to-detail'){if(window.history.length>1){window.history.back();}else{showView('book-detail');}}if(a==='save')toggleSave(id);if(a==='like')toggleLike(id);if(a==='read')openReader(id, 0);if(a==='open-book'){const cachedB=state.cachedBooks[id];if(cachedB&&!BOOKS.some(b=>b.id===id)){BOOKS.push(cachedB);}openBook(id);return;}if(a==='prev-chapter-btn'){window.jumpToChapter((state.activeChapter||0)-1);return;}if(a==='next-chapter-btn'){window.jumpToChapter((state.activeChapter||0)+1);return;}if(a==='toggle-contents-drawer'){state.reader.navOpen=!state.reader.navOpen;saveState();renderReader();return;}if(a==='line-toggle'){state.reader.line = state.reader.line===1.7 ? 2.0 : (state.reader.line===2.0 ? 2.25 : 1.7);saveState();renderReader();toast(`Line spacing: ${state.reader.line===1.7?'Tight':(state.reader.line===2.0?'Classic':'Open')}`);return;}if(a==='toggle-manga-width'){document.body.classList.toggle('manga-full-width');toast(document.body.classList.contains('manga-full-width')?'Full Width View':'Standard Width View');return;}if(a==='scroll-top'){window.scrollTo({top:0,behavior:'smooth'});return;}if(a==='next-page'){state.progress[id]=Math.min(100,pct(id)+Math.ceil(100/Math.max(1,(book(id).chapters||[]).length)));state.activeChapter=Math.min(((book(id).chapters||[]).length-1), (state.activeChapter||0)+1);state.recent=[id,...state.recent.filter(x=>x!==id)].slice(0,6);saveState();renderAll();setTimeout(()=>scrollReaderChapter(state.activeChapter),100);toast(`${book(id).title} is now ${pct(id)}% complete.`)}if(a==='prev-page'){state.activeChapter=Math.max(0,(state.activeChapter||0)-1);state.progress[id]=Math.max(0,pct(id)-8);saveState();renderAll();setTimeout(()=>scrollReaderChapter(state.activeChapter),100)}if(a==='font-up'){state.reader.font=Math.min(24,state.reader.font+1);saveState();renderReader();const fd=document.querySelector('#quick-font-display');if(fd)fd.textContent=`${state.reader.font}px`}if(a==='font-down'){state.reader.font=Math.max(15,state.reader.font-1);saveState();renderReader();const fd=document.querySelector('#quick-font-display');if(fd)fd.textContent=`${state.reader.font}px`}if(a==='theme'){state.reader.theme=action.dataset.theme;saveState();renderReader();toast(`Theme set to ${action.dataset.theme}`)}if(a==='reader-mode'){state.reader.mode=action.dataset.mode;saveState();renderReader();setTimeout(()=>scrollReaderChapter(state.activeChapter||0),80)}if(a==='focus-reader'){state.reader.focus=!state.reader.focus;saveState();renderReader();document.body.classList.toggle('reader-focus',!!state.reader.focus);toast(state.reader.focus?'Focus reading on.':'Focus reading off.')}if(a==='fullscreen-reader'){const el=document.querySelector('#reader');if(!document.fullscreenElement&&el?.requestFullscreen){el.requestFullscreen();state.reader.focus=true;}else if(document.exitFullscreen){document.exitFullscreen();state.reader.focus=false;}saveState();renderReader()}if(a==='highlight'){state.highlighted[id]=!state.highlighted[id];saveState();renderReader()}if(a==='open-chapter'){state.currentBook=id;const chIdx=Number(action.dataset.chapterIndex||0);openReader(id, chIdx);return;}
if(a==='signin-local'){const name=document.querySelector('#account-name')?.value.trim();state.account=name||'Local reader';saveState();renderAll();toast('Signed in locally.')}if(a==='signout-local'){state.account=null;saveState();renderAll();toast('Signed out locally.')}if(a==='export-state'){exportState()}if(a==='app-theme'){state.appTheme=action.dataset.themeChoice||'system';saveState();applyAppTheme();renderSettings();toast(`Theme set to ${state.appTheme}.`)}if(a==='save-note'){const text=document.querySelector('#reader-note')?.value.trim();if(text){state.notes[id]=[...(state.notes[id]||[]),{text,at:new Date().toISOString()}];saveState();renderAll();toast('Margin note saved.')}}return}const view=e.target.closest('[data-view]');if(view){e.preventDefault();showView(view.dataset.view);return}const shelf=e.target.closest('.shelf-tabs button');if(shelf){state.activeShelf=shelf.dataset.shelf;saveState();renderLibrary();return}const exp=e.target.closest('.explore-controls button');if(exp){state.exploreFilter=exp.dataset.exploreFilter;saveState();renderExplore();return}const themeChoice=e.target.closest('[data-theme-choice]');if(themeChoice){state.appTheme=themeChoice.dataset.themeChoice;saveState();renderSettings();applyAppTheme();return}const filter=e.target.closest('.filter-row button');if(filter){state.searchFilter=filter.dataset.filter;saveState();renderSearch();return}const author=e.target.closest('[data-author]');if(author){document.querySelector('.explore-content').innerHTML=`<section class="explore-block"><header><h3>${author.dataset.author}</h3><p>Author shelf</p></header><div class="explore-books">${BOOKS.filter(b=>b.author===author.dataset.author).map(b=>`<article class="explore-book">${coverHTML(b,'feature')}<h4>${b.title}</h4><p>${b.genre}</p>${actions(b.id)}</article>`).join('')}</div></section>`;return}const mood=e.target.closest('[data-mood]');if(mood){document.querySelector('.explore-content').innerHTML=`<section class="explore-block"><header><h3>${mood.dataset.mood}</h3><p>Mood shelf</p></header><div class="explore-books">${BOOKS.filter(b=>b.mood===mood.dataset.mood).map(b=>`<article class="explore-book">${coverHTML(b,'feature')}<h4>${b.title}</h4><p>${b.author}</p>${actions(b.id)}</article>`).join('')}</div></section>`;return}const cat=e.target.closest('[data-category]');if(cat){const name=cat.dataset.category;document.querySelector('.explore-content').innerHTML=`<section class="explore-block"><header><h3>${name}</h3><p>Dedicated shelf for ${name.toLowerCase()} only.</p></header><div class="explore-books">${BOOKS.filter(b=>(b.format||inferFormat(b))===name).map(b=>`<article class="explore-book">${coverHTML(b,'feature')}<h4>${b.title}</h4><p>${b.author} · ${b.mood}</p><span class="book-type-badge">${b.format||inferFormat(b)}</span>${actions(b.id)}</article>`).join('')||'<div class="empty-state"><h3>No titles yet.</h3><p>This shelf is ready for future catalogue items.</p></div>'}</div></section>`;return}const cover=e.target.closest('[data-book]');if(cover&&!e.target.closest('button'))openBook(cover.dataset.book)});
document.addEventListener('change',e=>{if(e.target?.dataset.action==='line'){state.reader.line=Number(e.target.value);saveState();renderReader()}if(e.target?.id==='setting-line'){state.reader.line=Number(e.target.value);saveState();renderAll()}if(e.target?.id==='import-state'){const file=e.target.files[0];if(file){file.text().then(txt=>{state={...DEFAULT_STATE,...JSON.parse(txt)};saveState();renderAll();toast('Sync file imported.')}).catch(()=>toast('Import failed.'))}}});let searchInputTimer;
function inferFormat(b) {
  if (!b) return 'Books';
  if (b.format) return b.format;
  const g = (b.genre || '').toLowerCase();
  const id = (b.id || '').toLowerCase();
  if (id.startsWith('mangadex-') || id.startsWith('divascans-') || id.startsWith('telegram-') || id.startsWith('private-tg-') || g.includes('manga') || g.includes('manhwa')) return 'Manga & Manhwa';
  if (id.startsWith('royalroad-') || g.includes('novel')) return 'Web Novels';
  return 'Books';
}

function renderSettings() {
  const fontInput = document.querySelector('#setting-font');
  const fontOut = document.querySelector('#setting-font-out');
  const lineInput = document.querySelector('#setting-line');
  if (fontInput) fontInput.value = state.reader.font || 19;
  if (fontOut) fontOut.textContent = `${state.reader.font || 19}px`;
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
  const theme = state.appTheme || 'system';
  const isNight = theme === 'night' || (theme === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (isNight) {
    document.documentElement.setAttribute('data-theme', 'night');
    document.body.classList.add('theme-night');
    document.body.classList.remove('theme-day');
  } else {
    document.documentElement.setAttribute('data-theme', 'day');
    document.body.classList.add('theme-day');
    document.body.classList.remove('theme-night');
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
    showView('search');
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
    searchInputTimer = setTimeout(() => renderSearch(), 260);
  }
  if (e.target?.id === 'setting-font') {
    state.reader.font = Number(e.target.value);
    const out = document.querySelector('#setting-font-out');
    if (out) out.textContent = `${state.reader.font}px`;
    saveState();
    renderSettings();
  }
});

document.addEventListener('submit', e => {
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
    showView('search', false);
  } else if (raw === 'explore-view' || raw === 'explore') {
    showView('explore-view', false);
  } else {
    showView('home', false);
  }
}

window.addEventListener('popstate', handleRouting);
window.addEventListener('hashchange', handleRouting);

// Initialize application
renderAll();
handleRouting();
