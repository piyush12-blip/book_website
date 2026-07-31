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
function saveState(){localStorage.setItem('bibliotheque-state',JSON.stringify(state))}
const book = id => {
  let found = BOOKS.find(b => b.id === id);
  if (!found && id) {
    const isManga = id.startsWith('mangadex-');
    const isWebnovel = id.startsWith('royalroad-');
    const cleanName = id.replace(/^(itunes|mangadex|royalroad)-/, '').replace(/[-_]/g, ' ');
    const formattedTitle = cleanName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    found = {
      id: id,
      title: isNaN(Number(cleanName)) ? formattedTitle : 'Stoner',
      author: isManga ? 'MangaDex Artist' : isWebnovel ? 'RoyalRoad Author' : 'John Williams',
      genre: isManga ? 'Manga' : isWebnovel ? 'Web Novel' : 'Book',
      mood: 'Reading',
      pages: 300,
      rating: 5,
      cover: 'navy',
      lines: formattedTitle.slice(0, 15),
      synopsis: 'Digital reading edition.',
      chapters: []
    };
    BOOKS.push(found);
  }
  return found || BOOKS[0];
};
const pct=id=>Math.max(0,Math.min(100,Number(state.progress[id]||0)));
const saved=id=>state.saved.includes(id), liked=id=>state.liked.includes(id);
const unique=a=>[...new Set(a.filter(Boolean))];
function toast(msg){let el=document.querySelector('.toast');if(!el){el=document.createElement('div');el.className='toast';document.body.appendChild(el)}el.textContent=msg;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),1800)}
function stars(n){return '★'.repeat(n)+'<i>'+'★'.repeat(5-n)+'</i>'}
function coverHTML(item,size='mini'){if(item.image)return `<div class="cover ${size} has-image ${item.cover||''}" data-book="${item.id}" role="button" tabindex="0" aria-label="Open ${item.title}"><img class="cover-img" src="${item.image}" alt="${item.title} book cover" onerror="this.style.display='none';if(this.parentElement)this.parentElement.classList.remove('has-image');"></div>`;const extras=item.cover.includes('moon')?'<em></em>':item.cover==='blue'?'<em class="house"></em>':item.cover==='tan'?'<em></em>':'';const author=['feature','detail-cover'].includes(size)?`<small>${item.author}</small>`:'';return `<div class="cover ${size} ${item.cover}" data-book="${item.id}" role="button" tabindex="0" aria-label="Open ${item.title}"><span>${item.lines}</span>${author}${extras}</div>`}
function actions(id){return `<div class="card-actions"><button class="action-btn ${saved(id)?'active':''}" data-action="save" data-book="${id}" aria-pressed="${saved(id)}">${saved(id)?'Saved':'Save'}</button><button class="action-btn ${liked(id)?'active':''}" data-action="like" data-book="${id}" aria-pressed="${liked(id)}" aria-label="Like ${book(id).title}">${liked(id)?'♥':'♡'}</button></div>`}
function miniCard(item){let p=pct(item.id);return `<article class="mini-book" data-card="${item.id}">${coverHTML(item,'mini')}<h2>${item.title}</h2><p>${item.author}</p><span class="progress-label"><i class="progress"><b style="width:${p}%"></b></i>${p}%</span>${actions(item.id)}</article>`}
function featureCard(item,cls=''){return `<article class="feature-card ${cls}" data-card="${item.id}">${coverHTML(item,'feature')}<h3>${item.title}</h3><p>${item.author}</p><div class="stars">${stars(item.rating)}</div>${actions(item.id)}</article>`}
function tasteProfile(){const ids=unique([...state.liked,...state.saved,...state.recent]);const genres={},authors={},moods={};ids.forEach(id=>{const b=book(id), weight=liked(id)?3:saved(id)?2:1;genres[b.genre]=(genres[b.genre]||0)+weight;authors[b.author]=(authors[b.author]||0)+weight;moods[b.mood]=(moods[b.mood]||0)+weight});return{genres,authors,moods,ids}}
function recommendations(limit=8){const t=tasteProfile();return BOOKS.map(b=>{let score=b.rating*3+(pct(b.id)>0&&pct(b.id)<100?18:0)+(saved(b.id)?-8:0);score+=(t.genres[b.genre]||0)*8+(t.authors[b.author]||0)*6+(t.moods[b.mood]||0)*5;if(!t.ids.length)score+=['echoes-past','midnight-library','unravmish-book','trearnbook'].includes(b.id)?22:0;return{...b,score}}).sort((a,b)=>b.score-a.score).slice(0,limit)}

function renderReadingList(){const el=document.querySelector('.reading-list');if(!el)return;const list=state.saved.map(book).filter(Boolean);el.innerHTML=(list.length?`<div class="reading-head"><h1 id="reading-list-title">Your Reading List</h1><button class="quiet-link" data-view="library-view">View all</button></div>`:`<div class="reading-head"><h1 id="reading-list-title">Your Reading List</h1><button class="quiet-link" data-view="library-view">Open shelf</button></div><div class="empty-shelf"><strong>You haven’t saved anything yet.</strong><p>These are recommendations. Save a book and this corner becomes your clean personal list.</p></div>`)+`<div class="mini-grid">${(list.length?list.slice(0,9):recommendations(9)).map(miniCard).join('')}</div>`}
function renderFeatured(){const grid=document.querySelector('.featured-grid');if(grid)grid.innerHTML=recommendations(6).map((b,i)=>featureCard(b,i>2?'lower':'')).join('')}
function renderRecent(){const r=document.querySelector('.recent');if(!r)return;const ids=state.recent.slice(0,2);r.innerHTML='<h2>Recently Read</h2>'+(ids.length?ids.map(id=>`<article class="recent-item" data-book="${id}">${coverHTML(book(id),'recent-cover')}<h3>${book(id).title}</h3></article>`).join(''):`<div class="empty-state"><h3>No recent books.</h3><p>Open any title or use Reading Now. This panel will update automatically.</p></div>`)}
function renderSidebarStats(){const s=document.querySelector('.stats');if(!s)return;const finished=Object.values(state.progress).filter(v=>+v>=100).length;s.innerHTML=`<h2>Reading Stats</h2><dl><div><dt>${state.saved.length}</dt><dd>Saved books</dd></div><div><dt>${state.liked.length}</dt><dd>Liked books</dd></div><div><dt>${finished}</dt><dd>Finished</dd></div></dl>`}
async function renderSearch(){
  const results=document.querySelector('.search-results');if(!results)return;
  document.querySelectorAll('.filter-row button').forEach(btn=>{const key=btn.dataset.filter||btn.textContent.toLowerCase().replace(' books','').replace(' ','-');btn.dataset.filter=key;btn.setAttribute('aria-pressed',state.searchFilter===key)});
  const q=(document.querySelector('#book-search')?.value||'').trim();
  if(!q){results.innerHTML='';return;}
  results.innerHTML='<div class="empty-library"><h3>Searching library & archives...</h3></div>';
  try{
    const res=await fetch(`/api/books/search?q=${encodeURIComponent(q)}`);
    const list=await res.json();
    results.innerHTML=list.length
      ?list.map(b=>{
          if(!BOOKS.some(kb=>kb.id===b.id)) BOOKS.push(b);
          state.cachedBooks[b.id] = b;
          saveState();
          const isInstant = b.id.startsWith('mangadex-') || b.id.startsWith('royalroad-') || !b.id.startsWith('itunes-');
          const badge = isInstant
            ? `<span style="background:#16a34a;color:#fff;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:800;margin-left:6px;display:inline-block;">⚡ FREE INSTANT READ</span>`
            : `<span style="background:#d97706;color:#fff;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:800;margin-left:6px;display:inline-block;">🏴‍☠️ FREE (1-CLICK BACKDOOR)</span>`;
          const typeLabel = b.id.startsWith('royalroad-') ? 'Web Novel' : b.id.startsWith('mangadex-') ? 'Manga / Manhwa' : 'Book';
          return `<a data-book="${b.id}" href="#book-detail"><span class="result-cover ${(b.cover||'').split(' ')[0]}"></span><strong>${b.title}</strong><em>${b.author} · ${typeLabel}${badge}</em>${actions(b.id)}</a>`;
        }).join('')
      :'<div class="empty-library"><h3>No results found.</h3></div>';
  }catch(err){
    results.innerHTML='<div class="empty-library"><h3>Search error. Is the server running?</h3></div>';
  }
}
function renderDetail(){
  const g=document.querySelector('#book-detail .detail-grid');if(!g)return;
  const b=book(state.currentBook),p=pct(b.id),chapters=b.chapters||[];
  const formatBadge = b.id.startsWith('royalroad-') ? 'Web Novel' : b.id.startsWith('mangadex-') ? 'Manga / Manhwa' : (b.genre || 'Book');
  
  const firstTitle = chapters.length ? (chapters[0].title || 'Chapter 1') : 'Chapter 1';
  const isCh1Present = /ch(?:apter|\.)?\s*1\b/i.test(firstTitle) || /^1\./.test(firstTitle);

  const licenseNotice = (!isCh1Present && chapters.length > 0 && b.id.startsWith('mangadex-'))
    ? `<div style="background:#fff8e6;color:#8a6d3b;border:1px solid #faebcc;padding:12px 16px;border-radius:8px;margin-bottom:16px;font-size:0.88rem;line-height:1.5">
         ℹ️ <strong>Publisher License Notice:</strong> Chapters 1–149 of this manga were removed from public archives by official publishers. The first community-contributed chapter available is <strong>${firstTitle}</strong> below.
       </div>`
    : '';

  const chapterPickerHTML = chapters.length
    ? `${licenseNotice}
       <div style="background:#f4f4f4;padding:12px 16px;border-radius:8px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;gap:12px">
         <div><strong>⚡ Recommended Start:</strong> ${firstTitle}</div>
         <button class="action-btn active" data-action="open-chapter" data-book="${b.id}" data-chapter-index="0">Start Reading</button>
       </div>
       <div class="chapter-picker"><h3>All Available Chapters (${chapters.length})</h3>${chapters.map((ch,i)=>`<a href="#/read/${b.id}/${i+1}" data-action="open-chapter" data-book="${b.id}" data-chapter-index="${i}"><strong>${ch.title}</strong><span>Read</span></a>`).join('')}</div>`
    : `<div class="chapter-picker"><a data-action="read" data-book="${b.id}"><strong>⚡ Start reading from Chapter 1</strong><span>Click to load chapters</span></a></div>`;

  g.innerHTML=`<aside class="detail-cover-wrap">${coverHTML(b,'detail-cover')}<button class="warm-button block" data-action="read" data-book="${b.id}">Start Reading</button></aside><article class="detail-copy"><p class="kicker">${formatBadge}</p><h2>${b.title}</h2><p class="author-line">${b.author} · ${formatBadge} · ${b.pages} pages</p><div class="detail-stars">${stars(b.rating)} <small>${b.rating}.0 · Reader Recommended</small></div><div class="detail-actions">${actions(b.id)}<button class="action-btn" data-action="read" data-book="${b.id}">Read now</button></div><p class="lead">${b.synopsis}</p>${chapterPickerHTML}<div class="synopsis-box"><h3>Synopsis</h3><p>${b.synopsis}</p></div><dl class="meta-list"><div><dt>Progress</dt><dd>${p}%</dd></div><div><dt>Notes</dt><dd>${(state.notes[b.id]||[]).length}</dd></div><div><dt>Status</dt><dd>${p>=100?'Finished':p>0?'In progress':'Unread'}</dd></div></dl></article>`;
}
function renderReader(){
  const g=document.querySelector('#reader .reader-grid');
  if(!g)return;
  const b=book(state.currentBook), chapters=b.chapters||[], total=Math.max(1,chapters.length);
  const idx=Math.max(0,Math.min(total-1,state.activeChapter||0));
  const p=pct(b.id), r=state.reader, notes=state.notes[b.id]||[], isManga=(b.format||inferFormat(b))==='Manga & Manhwa';
  const chapterNav=chapters.map((c,i)=>`<a class="${i===idx?'active':''}" data-action="open-chapter" data-book="${b.id}" data-chapter-index="${i}" href="#/read/${b.id}/${i+1}" data-chapter-title="${c.title.toLowerCase()}">${i+1}. ${c.title}<small>${c.minutes||12} min</small></a>`).join('');
  const renderTextChapter=(ch,i)=>{
    const paras=(ch.content||[]).map((x,j)=>`<p class="${j===0&&state.highlighted[b.id]?'highlighted':''}">${j===0?'<span class="dropcap">'+x.charAt(0)+'</span>'+x.slice(1):x}</p>`).join('');
    const fig=ch.image?`<figure class="reader-figure"><img src="${ch.image}" alt="${ch.imageCaption||ch.title}"><figcaption>${ch.imageCaption||''}</figcaption></figure>`:'';
    return `<section class="chapter-block" id="chapter-${i+1}" data-chapter-index="${i}"><p class="chapter-count">Chapter ${i+1} of ${total}</p><h2>${ch.title}</h2><span class="reader-progress-note">${ch.minutes||12} min · ${ch.publicDomain?'Public domain · ':''}${b.author}</span><div class="reading-prose" style="font-size:var(--reader-font);line-height:var(--reader-line)">${paras}${fig}<blockquote>${ch.quote||''}</blockquote></div></section>`;
  };
  const renderMangaChapter=(ch,i)=>{
    const lines=ch.content||[];
    return `<section class="chapter-block manga-chapter" id="chapter-${i+1}" data-chapter-index="${i}"><p class="chapter-count">Chapter ${i+1} of ${total}</p><h2>${ch.title}</h2><div class="manga-panels ${r.mangaMode==='paged'?'paged':''} ${r.mangaDirection==='rtl'?'rtl':''}"><figure class="manga-panel cover-panel-page"><img src="${b.image}" alt="${b.title} cover panel"><figcaption>${b.title}</figcaption></figure>${lines.map((line,j)=>`<div class="manga-panel text-panel"><span>Panel ${j+1}</span><p>${line}</p></div>`).join('')}<div class="manga-panel quote-panel"><p>${ch.quote||'To be continued.'}</p></div></div></section>`;
  };
  const selected=chapters[idx]||{title:'Preview Chapter',content:['The reader opens with a quiet page and remembers every setting you choose.'],quote:'A good reading room disappears around the book.'};

  let backdoorCardHTML = '';
  if (b.isFallback || b.id.startsWith('itunes-')) {
      const realTitle = b.title || 'Book';
      const realAuthor = b.author || 'Author';
      backdoorCardHTML = `
        <div style="background:#1a1a1a!important;color:#f1f1f1!important;padding:2.5rem;border-radius:12px;margin:1rem auto 3rem auto;max-width:650px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,0.5);border:1px solid #333;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          <h2 style="margin:0 0 1rem 0;font-size:1.6rem;color:#f39c12!important;display:flex;align-items:center;justify-content:center;gap:10px;">
            <span>🏴‍☠️</span> Shadow Library Backdoor
          </h2>
          <p style="opacity:0.9;font-size:1rem;line-height:1.6;margin-bottom:1.5rem;color:#f1f1f1!important;">
            <strong>${realTitle}</strong> is a modern copyrighted book. Server firewalls block automated scraping.<br>
            <strong>Click one of these links to download the full EPUB file for free:</strong>
          </p>
          <div style="display:flex;gap:15px;justify-content:center;margin-bottom:1.5rem;flex-wrap:wrap;">
            <a href="https://annas-archive.li/search?q=${encodeURIComponent(realTitle + ' ' + realAuthor)}&ext=epub" target="_blank" style="background:#3b82f6!important;color:#ffffff!important;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700;transition:0.2s;box-shadow:0 4px 12px rgba(59,130,246,0.4);display:inline-block;">Anna's Archive</a>
            <a href="https://oceanofpdf.com/?s=${encodeURIComponent(realTitle)}" target="_blank" style="background:#f59e0b!important;color:#ffffff!important;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700;transition:0.2s;box-shadow:0 4px 12px rgba(245,158,11,0.4);display:inline-block;">OceanOfPDF</a>
            <a href="http://libgen.is/search.php?req=${encodeURIComponent(realTitle + ' ' + realAuthor)}" target="_blank" style="background:#10b981!important;color:#ffffff!important;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700;transition:0.2s;box-shadow:0 4px 12px rgba(16,185,129,0.4);display:inline-block;">LibGen</a>
          </div>
          <div style="background:#2d2d2d!important;border-radius:8px;padding:1.2rem;text-align:left;color:#f1f1f1!important;">
            <p style="margin:0 0 0.5rem 0;font-weight:600;color:#a3e635!important;">How to read it here:</p>
            <ol style="margin:0;padding-left:1.5rem;opacity:0.9;font-size:0.95rem;line-height:1.5;color:#f1f1f1!important;">
              <li>Click one of the bright buttons above, verify you are human, and download the <strong>.epub</strong> file.</li>
              <li><strong>Do not refresh!</strong> As soon as the download completes, the book will load right here automatically.</li>
            </ol>
            <div id="polling-status" style="margin-top:1rem;color:#f39c12!important;font-size:0.9rem;text-align:center;font-weight:600;">
              <span class="loading-spinner" style="display:inline-block;animation:spin 1s linear infinite;">⏳</span> Waiting for download...
            </div>
          </div>
        </div>
        <style>@keyframes spin { 100% { transform:rotate(360deg); } }</style>
      `;
      
      // Start/restart polling for downloaded file
      if(!window._activePollers) window._activePollers = {};
      if(!window._activePollers[b.id]){
        const doPoll = async () => {
            try {
                const checkRes = await fetch(`/api/check-local?q=${encodeURIComponent(realTitle + ' ' + realAuthor)}`);
                const checkData = await checkRes.json();
                if (checkData.found) {
                    clearInterval(window._activePollers[b.id]);
                    delete window._activePollers[b.id];
                    b.chapters = checkData.chapters;
                    b.isFallback = false;
                    const statusEl = document.getElementById('polling-status');
                    if (statusEl) statusEl.innerHTML = "✅ Download detected! Loading book...";
                    setTimeout(() => loadStolenChapters(b.id, realTitle, realAuthor, b.genre), 800);
                }
            } catch(e) { /* ignore */ }
        };
        doPoll();
        window._activePollers[b.id] = setInterval(doPoll, 3000);
      }
  }

  const content=isManga
    ? (r.mode==='single'?renderMangaChapter(selected,idx):chapters.map(renderMangaChapter).join(''))
    : backdoorCardHTML + (r.mode==='single'?renderTextChapter(selected,idx):chapters.map(renderTextChapter).join(''));
  const notesPanel=`<aside class="reader-notes ${r.notesOpen?'open':''}"><header><h3>Notebook</h3><button data-reader-action="toggle-notes">×</button></header>${notes.length?notes.map((n,i)=>`<article><time>${new Date(n.at).toLocaleDateString()}</time><p>${n.text}</p><button data-reader-action="delete-note" data-note-index="${i}">Delete</button></article>`).join(''):'<div class="empty-state"><h3>No notes yet.</h3><p>Write a private margin note below. It will appear here and in your sync export.</p></div>'}</aside>`;
  const epubPanel=`<section class="epub-panel ${r.epubMode?'open':''}"><header><h3>EPUB mode</h3><p>Upload a legal/public-domain EPUB or a file you own. EPUB.js will render it here when available.</p><label class="import-label">Upload EPUB<input type="file" id="epub-upload" accept=".epub,application/epub+zip"></label></header><div id="epub-viewer"><div class="empty-state"><h3>No EPUB loaded.</h3><p>This static prototype can render local EPUB files through EPUB.js when opened on a local server and internet/CDN is available.</p></div></div></section>`;
  g.innerHTML=`<aside class="chapter-list reader-drawer ${r.navOpen?'open':''}"><div class="drawer-head"><p class="kicker">Contents</p><button data-reader-action="toggle-contents">×</button></div><input class="chapter-search" id="chapter-search" placeholder="Search chapters…">${chapterNav}</aside><article class="reader-paper theme-${r.theme} ${r.focus?'focus-mode':''} reader-mode-${r.mode} ${isManga?'manga-reader-paper':''}" style="--reader-font:${r.font}px;--reader-line:${r.line}"><div class="reader-settings compact-reader-settings" aria-label="Reader controls"><button data-action="back-step" style="font-weight:700;color:var(--brand,#111);margin-right:6px">← Back</button><button data-reader-action="toggle-contents">Contents</button><button data-action="font-down">A−</button><button data-action="font-up">A+</button><button class="${r.theme==='paper'?'active':''}" data-action="theme" data-theme="paper">Paper</button><button class="${r.theme==='sepia'?'active':''}" data-action="theme" data-theme="sepia">Sepia</button><button class="${r.theme==='night'?'active':''}" data-action="theme" data-theme="night">Brown</button><button class="${r.theme==='black'?'active':''}" data-action="theme" data-theme="black">Black</button><select data-action="line"><option value="1.7" ${r.line==1.7?'selected':''}>Tight</option><option value="2" ${r.line==2?'selected':''}>Classic</option><option value="2.25" ${r.line==2.25?'selected':''}>Open</option></select><button class="${r.mode==='continuous'?'active':''}" data-action="reader-mode" data-mode="continuous">Scroll</button><button class="${r.mode==='single'?'active':''}" data-action="reader-mode" data-mode="single">One</button>${isManga?`<button class="${r.mangaMode==='webtoon'?'active':''}" data-reader-action="manga-mode" data-mode="webtoon">Webtoon</button><button class="${r.mangaMode==='paged'?'active':''}" data-reader-action="manga-mode" data-mode="paged">Paged</button><button class="${r.mangaDirection==='rtl'?'active':''}" data-reader-action="manga-direction">RTL</button>`:''}<button class="${state.highlighted[b.id]?'active':''}" data-action="highlight" data-book="${b.id}">Highlight</button><button class="${r.notesOpen?'active':''}" data-reader-action="toggle-notes">Notes</button><button class="${r.epubMode?'active':''}" data-reader-action="toggle-epub">EPUB</button><button class="${r.focus?'active':''}" data-action="focus-reader">Focus</button><button data-action="fullscreen-reader">Fullscreen</button></div><div class="reader-status"><strong>${b.title}</strong><span data-current-chapter>Chapter ${idx+1}: ${(chapters[idx]||selected).title}</span><i><b style="width:${p}%" data-reader-progress></b></i></div>${epubPanel}<div class="native-reader ${r.epubMode?'is-dimmed':''}">${content}</div><div class="reader-bottom"><button data-action="prev-page" data-book="${b.id}">Previous</button><i><b style="width:${p}%" data-reader-progress-bottom></b></i><button data-action="next-page" data-book="${b.id}">${r.mode==='continuous'?'Mark next chapter':'Next Chapter'}</button></div><div class="note-box"><label for="reader-note">Private note</label><textarea id="reader-note" placeholder="Write a quiet margin note…"></textarea><footer><small>${notes.length} saved note(s)</small><button class="warm-button" data-action="save-note" data-book="${b.id}">Save note</button></footer></div></article>${notesPanel}`;
  document.body.classList.toggle('reader-focus', !!r.focus && document.querySelector('#reader')?.classList.contains('active-view'));
  setTimeout(()=>{setupReaderScroll();setupAutoHideReaderControls();},50);
  // Fire for external books (itunes, mangadex, royalroad, searched) ONLY if chapters aren't loaded yet
  const isExternal = b.genre === 'searched' || b.genre === 'Manga' || b.genre === 'Web Novel' || b.id.includes('-');
  if(isExternal && (!b.chapters || !b.chapters.length)) setTimeout(()=>loadStolenChapters(b.id, b.title, b.author, b.genre), 80);
}

async function loadStolenChapters(id, title, author, genre){
  const nativeReader=document.querySelector('#reader .native-reader');
  if(!nativeReader) return;
  
  const isMangaLoad = id.startsWith('mangadex-');
  
  nativeReader.innerHTML=`<div style="padding:4rem 2rem;text-align:center;opacity:.6;font-family:Georgia,serif">
    <p style="font-size:1.1rem;margin-bottom:.5rem">${isMangaLoad ? '📖 Loading manga pages...' : '📚 Searching libraries...'}</p>
    <p style="font-size:.85rem;opacity:.7">${title}</p>
  </div>`;
  
  try{
    const res=await fetch(`/api/books/${id}/chapters?q=${encodeURIComponent(title+' '+author)}`);
    const data=await res.json();
    
    if(data.error || !data.chapters || !data.chapters.length){
      const msg = data.error || 'No chapters found.';
      const isNotFound = msg.includes('not available') || msg.includes('No EPUB found');
      nativeReader.innerHTML=`<div style="padding:3rem 2rem;text-align:center;font-family:Georgia,serif;max-width:520px;margin:0 auto">
        <p style="font-size:2.5rem;margin-bottom:1rem">${isMangaLoad ? '\u{1F4D6}' : '\u{1F4DA}'}</p>
        <h3 style="margin-bottom:.8rem;font-size:1.2rem">${isNotFound ? 'Not in free library' : 'Nothing loaded'}</h3>
        <p style="opacity:.6;font-size:.9rem;line-height:1.6">${isNotFound
          ? 'This title isn&apos;t freely available yet. Try classic novels like <em>Pride and Prejudice</em>, <em>Moby Dick</em>, or <em>Sherlock Holmes</em>.'
          : msg}</p>
      </div>`;
      return;
    }
    
    // Save fetched chapters into book object so drawer & detail page see all chapters!
    const targetBook = book(id);
    if(targetBook) targetBook.chapters = data.chapters;

    const realTitle = targetBook && !isNaN(Number(targetBook.title)) ? title || targetBook.title : (targetBook ? targetBook.title : title || 'Book');
    const realAuthor = targetBook ? targetBook.author : author || 'Author';

    const langBanner = data.fallbackLang
      ? `<div style="background:#fff3cd;color:#856404;border:1px solid #ffeeba;padding:12px 18px;margin-bottom:20px;border-radius:6px;text-align:center;font-size:0.9rem;">
           🌐 <strong>Language Notice:</strong> English translation is unavailable for this manga on public archives. Displaying community scanlations in <strong>${data.fallbackLang}</strong>.
         </div>`
      : '';

    if(data.type === 'manga'){
      // ── MANGA / MANHWA / WEBTOON MODE ──
      nativeReader.innerHTML = langBanner + data.chapters.map((ch, i) => `
        <section class="chapter-block manga-chapter-block" id="chapter-${i+1}" data-chapter-index="${i}">
          <div class="chapter-divider">
            <span>Chapter ${i+1} of ${data.chapters.length}</span>
            <strong>${ch.title}</strong>
          </div>
          <div class="manga-image-scroll">${ch.html}</div>
        </section>`).join('');
    } else {
      // ── NOVEL / LIGHT NOVEL / BOOK / WEB NOVEL MODE ──
      
      let backdoorHTML = '';
      if (data.isFallback || id.startsWith('itunes-')) {
          backdoorHTML = `
            <div style="background:#1a1a1a!important;color:#f1f1f1!important;padding:2.5rem;border-radius:12px;margin:1rem auto 3rem auto;max-width:650px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,0.5);border:1px solid #333;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
              <h2 style="margin:0 0 1rem 0;font-size:1.6rem;color:#f39c12!important;display:flex;align-items:center;justify-content:center;gap:10px;">
                <span>🏴‍☠️</span> Shadow Library Backdoor
              </h2>
              <p style="opacity:0.9;font-size:1rem;line-height:1.6;margin-bottom:1.5rem;color:#f1f1f1!important;">
                <strong>${realTitle}</strong> is a modern copyrighted book. Server firewalls block automated scraping.<br>
                <strong>Click one of these links to download the full EPUB file for free:</strong>
              </p>
              <div style="display:flex;gap:15px;justify-content:center;margin-bottom:1.5rem;flex-wrap:wrap;">
                <a href="https://annas-archive.li/search?q=${encodeURIComponent(realTitle + ' ' + realAuthor)}&ext=epub" target="_blank" style="background:#3b82f6!important;color:#ffffff!important;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700;transition:0.2s;box-shadow:0 4px 12px rgba(59,130,246,0.4);display:inline-block;">Anna's Archive</a>
                <a href="https://oceanofpdf.com/?s=${encodeURIComponent(realTitle)}" target="_blank" style="background:#f59e0b!important;color:#ffffff!important;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700;transition:0.2s;box-shadow:0 4px 12px rgba(245,158,11,0.4);display:inline-block;">OceanOfPDF</a>
                <a href="http://libgen.is/search.php?req=${encodeURIComponent(realTitle + ' ' + realAuthor)}" target="_blank" style="background:#10b981!important;color:#ffffff!important;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700;transition:0.2s;box-shadow:0 4px 12px rgba(16,185,129,0.4);display:inline-block;">LibGen</a>
              </div>
              <div style="background:#2d2d2d!important;border-radius:8px;padding:1.2rem;text-align:left;color:#f1f1f1!important;">
                <p style="margin:0 0 0.5rem 0;font-weight:600;color:#a3e635!important;">How to read it here:</p>
                <ol style="margin:0;padding-left:1.5rem;opacity:0.9;font-size:0.95rem;line-height:1.5;color:#f1f1f1!important;">
                  <li>Click one of the bright buttons above, verify you are human, and download the <strong>.epub</strong> file.</li>
                  <li><strong>Do not refresh!</strong> As soon as the download completes, the book will load right here automatically.</li>
                </ol>
                <div id="polling-status" style="margin-top:1rem;color:#f39c12!important;font-size:0.9rem;text-align:center;font-weight:600;">
                  <span class="loading-spinner" style="display:inline-block;animation:spin 1s linear infinite;">⏳</span> Waiting for download...
                </div>
              </div>
            </div>
            <style>@keyframes spin { 100% { transform:rotate(360deg); } }</style>
          `;
          
          // Start polling — check IMMEDIATELY on load, then every 3 seconds
          const doPoll = async () => {
              try {
                  const checkRes = await fetch(`/api/check-local?q=${encodeURIComponent(title + ' ' + author)}`);
                  const checkData = await checkRes.json();
                  if (checkData.found) {
                      clearInterval(pollInterval);
                      const targetBook = book(id);
                      if (targetBook) targetBook.chapters = checkData.chapters;
                      document.getElementById('polling-status').innerHTML = "✅ Download detected! Loading book...";
                      setTimeout(() => loadStolenChapters(id, title, author, genre), 800);
                      return true;
                  }
              } catch(e) { /* ignore */ }
              return false;
          };
          
          // Run immediately (catches already-downloaded files on refresh)
          doPoll();
          // Then keep checking every 3 seconds
          const pollInterval = setInterval(doPoll, 3000);
          
          // Stop polling if user navigates away
          window.addEventListener('hashchange', () => clearInterval(pollInterval), {once: true});
      }

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

    // Attach click listeners to lazy-manga-triggers
    document.querySelectorAll('.lazy-manga-trigger').forEach(trigger => {
      trigger.addEventListener('click', async () => {
        const chapterId = trigger.dataset.chapterId;
        trigger.innerHTML = '<p style="text-align:center;padding:2rem;opacity:.6;">Loading images...</p>';
        try {
          const r = await fetch(`/api/manga/chapter/${chapterId}`);
          const res = await r.json();
          if (res.html) {
            trigger.outerHTML = res.html;
          } else {
            trigger.innerHTML = '<p style="text-align:center;padding:2rem;">Failed to load images.</p>';
          }
        } catch {
          trigger.innerHTML = '<p style="text-align:center;padding:2rem;">Error loading images.</p>';
        }
      });
    });

    toast(`${isMangaLoad ? '🎨' : '📚'} Loaded ${data.chapters.length} chapters — ${title}`);
    setupReaderScroll();
  } catch(err){
    nativeReader.innerHTML=`<div style="padding:2rem;text-align:center"><h3>Error: ${err.message}</h3></div>`;
  }
}
function renderLibrary(){const root=document.querySelector('.library-results');if(!root)return;document.querySelectorAll('.shelf-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.shelf===state.activeShelf));let ids=[],label=state.activeShelf;if(label==='saved')ids=state.saved;if(label==='liked')ids=state.liked;if(label==='progress')ids=BOOKS.filter(b=>pct(b.id)>0&&pct(b.id)<100).map(b=>b.id);root.innerHTML=ids.length?ids.map(id=>{const b=book(id),p=pct(id);return `<article class="library-book" data-book="${id}">${coverHTML(b,'recent-cover')}<div><h3>${b.title}</h3><p>${b.author}</p><span class="progress-label"><i class="progress"><b style="width:${p}%"></b></i>${p}% read</span></div>${actions(id)}</article>`}).join(''):`<div class="empty-library"><h3>No ${label} books yet.</h3><p>Use Save and Like anywhere in the app. The homepage remains clean while this shelf stores the full collection.</p></div>`}
function renderProfile(){const p=document.querySelector('.dashboard-panel');if(!p)return;const finished=Object.values(state.progress).filter(v=>+v>=100).length,avg=state.saved.length?Math.round(state.saved.reduce((s,id)=>s+pct(id),0)/state.saved.length):0;p.innerHTML=`<p class="kicker">Personal library</p><h2>Dashboard</h2><div class="dash-stats"><article><span>Saved books</span><strong>${state.saved.length}</strong><small>personal shelf</small></article><article><span>Liked books</span><strong>${state.liked.length}</strong><small>taste profile</small></article><article><span>Average progress</span><strong>${avg}%</strong><small>${finished} finished</small></article></div><div class="annotation-panel"><h3>Recent activity</h3>${state.recent.length?state.recent.slice(0,3).map(id=>`<p>Opened <strong>${book(id).title}</strong> · ${pct(id)}% complete.</p>`).join(''):'<p>No reading activity yet. Open a book and the dashboard will begin tracking automatically.</p>'}</div>`}
function renderExplore(){const c=document.querySelector('.explore-content'),sum=document.querySelector('.explore-summary');if(!c)return;document.querySelectorAll('.explore-controls button').forEach(b=>b.classList.toggle('active',b.dataset.exploreFilter===state.exploreFilter));const t=tasteProfile(),topGenre=Object.entries(t.genres).sort((a,b)=>b[1]-a[1])[0]?.[0]||'classic fiction';if(sum)sum.innerHTML=`<strong>${recommendations(1)[0].title}</strong><span>Best next read · based on ${topGenre}</span>`;const bookGrid=(items,title,sub)=>`<section class="explore-block"><header><h3>${title}</h3><p>${sub}</p></header><div class="explore-books">${items.map(b=>`<article class="explore-book">${coverHTML(b,'feature')}<h4>${b.title}</h4><p>${b.author} · ${b.mood}</p><span class="book-type-badge">${b.format||inferFormat(b)}</span>${actions(b.id)}</article>`).join('')}</div></section>`;const authors=unique(BOOKS.map(b=>b.author)).map(a=>({name:a,count:BOOKS.filter(b=>b.author===a).length,match:t.authors[a]||0})).sort((a,b)=>b.match-a.match||b.count-a.count);const moods=unique(BOOKS.map(b=>b.mood));const cats=[['Books','Essays, nonfiction, study volumes, and general reading.'],['Novels','Long-form fiction, classics, mysteries, romance, fantasy, and literary stories.'],['Manga & Manhwa','Panel-based illustrated reading, manga-inspired volumes, and manhwa-style series.'],['More','Poetry, short forms, drama, anthologies, and formats outside the first three shelves.']];if(state.exploreFilter==='categories')c.innerHTML=`<section class="explore-block"><header><h3>Reading categories</h3><p>Separate discovery rooms. Items never duplicate into the wrong shelf.</p></header><div class="category-grid">${cats.map(([name,desc])=>`<div class="category-card" data-category="${name}"><div><strong>${name}</strong><p>${desc}</p></div><span>${BOOKS.filter(b=>(b.format||inferFormat(b))===name).length} titles</span></div>`).join('')}</div></section>`;else if(state.exploreFilter==='authors')c.innerHTML=`<section class="explore-block"><header><h3>Authors</h3><p>Click an author to see their books.</p></header><div class="author-grid">${authors.map(a=>`<div class="author-card" data-author="${a.name}"><strong>${a.name}</strong><span>${a.count} book${a.count>1?'s':''}${a.match?' · matches your taste':''}</span></div>`).join('')}</div></section>`;else if(state.exploreFilter==='moods')c.innerHTML=`<section class="explore-block"><header><h3>Moods</h3><p>Editorial discovery by feeling.</p></header><div class="mood-grid">${moods.map(m=>`<div class="mood-card" data-mood="${m}"><strong>${m}</strong><span>${BOOKS.filter(b=>b.mood===m).length} volume(s)</span></div>`).join('')}</div></section>`;else if(state.exploreFilter==='new')c.innerHTML=bookGrid([...BOOKS].reverse().slice(0,9),'New finds','Fresh volumes from the quiet shelves.');else c.innerHTML=bookGrid(recommendations(8),'Recommended for you','Scored by liked books, saved authors, recent reading, genre, mood, and unfinished progress.')+bookGrid(BOOKS.filter(b=>pct(b.id)>0&&pct(b.id)<100).slice(0,6),'Continue discovering','Books you already started receive priority.')}
function renderAll(){renderReadingList();renderFeatured();renderRecent();renderSidebarStats();renderSearch();renderDetail();renderReader();renderLibrary();renderProfile();renderExplore();renderSettings();applyAppTheme();}
function setNav(v){navLinks.forEach(a=>a.removeAttribute('aria-current'));searchButton?.removeAttribute('aria-current');document.querySelector('[data-open-settings]')?.removeAttribute('aria-current');if(v==='home')document.querySelector('.nav a[href="#explore"]')?.setAttribute('aria-current','page');if(v==='library-view')document.querySelector('.nav a[href="#library"]')?.setAttribute('aria-current','page');if(v==='explore-view')document.querySelector('.nav a[href="#explore"]')?.setAttribute('aria-current','page');if(v==='reader')document.querySelector('.nav a[href="#reading-now"]')?.setAttribute('aria-current','page');if(v==='profile')document.querySelector('.nav a[href="#profile"]')?.setAttribute('aria-current','page');if(v==='settings')document.querySelector('[data-open-settings]')?.setAttribute('aria-current','page');if(v==='search')searchButton?.setAttribute('aria-current','page')}
function showView(v='home',push=true){sections.forEach(s=>s.classList.remove('active-view'));document.body.classList.toggle('reader-focus', v==='reader' && !!state.reader.focus);if(v==='home'){app.classList.remove('view-mode');setNav('home');if(push)history.pushState({v},'','#explore');scrollTo({top:0,behavior:prefersReducedMotion?'auto':'smooth'});return}const target=document.getElementById(v);if(!target)return showView('home',push);app.classList.add('view-mode');target.classList.add('active-view');setNav(v);if(push)history.pushState({v},'',`#${v}`);scrollTo({top:0,behavior:prefersReducedMotion?'auto':'smooth'});if(v==='search')setTimeout(()=>document.querySelector('#book-search')?.focus(),300)}
function openBook(id){state.currentBook=id;state.recent=[id,...state.recent.filter(x=>x!==id)].slice(0,6);saveState();renderAll();showView('book-detail');history.replaceState({v:'book-detail'},'',`#/book/${id}`)}
function openReader(id=state.currentBook){state.currentBook=id;state.reader.mode='continuous';state.reader.focus=true;state.reader.navOpen=false;state.reader.notesOpen=false;state.recent=[id,...state.recent.filter(x=>x!==id)].slice(0,6);state.sessions++;saveState();renderAll();showView('reader');history.replaceState({v:'reader'},'',`#/read/${id}/${(state.activeChapter||0)+1}`);setTimeout(()=>scrollReaderChapter(state.activeChapter||0),120)}
function toggleSave(id){state.saved=saved(id)?state.saved.filter(x=>x!==id):[id,...state.saved];saveState();renderAll();toast(saved(id)?'Saved to your reading list.':'Removed from your saved shelf.')}
function toggleLike(id){state.liked=liked(id)?state.liked.filter(x=>x!==id):[id,...state.liked];saveState();renderAll();toast(liked(id)?'Added to liked books.':'Removed from liked books.')}



function scrollReaderChapter(index=state.activeChapter||0){
  const el=document.querySelector(`#chapter-${Number(index)+1}`);
  if(el) el.scrollIntoView({behavior:prefersReducedMotion?'auto':'smooth', block:'start'});
}
function updateReaderDom(){
  const b=book(state.currentBook), chapters=b.chapters||[], idx=state.activeChapter||0, progress=pct(b.id);
  document.querySelectorAll('.chapter-list a').forEach((a,i)=>a.classList.toggle('active',i===idx));
  const label=document.querySelector('[data-current-chapter]');
  if(label&&chapters[idx]) label.textContent=`Chapter ${idx+1}: ${chapters[idx].title}`;
  document.querySelectorAll('[data-reader-progress], [data-reader-progress-bottom]').forEach(el=>el.style.width=progress+'%');
}
let readerScrollTimer;
function setupReaderScroll(){
  const paper=document.querySelector('#reader.active-view .reader-paper.reader-mode-continuous');
  if(!paper) return;
  const blocks=[...paper.querySelectorAll('.chapter-block')];
  if(!blocks.length) return;
  const onScroll=()=>{
    clearTimeout(readerScrollTimer);
    readerScrollTimer=setTimeout(()=>{
      const midpoint=window.innerHeight*0.38;
      let idx=0;
      blocks.forEach((block,i)=>{ if(block.getBoundingClientRect().top < midpoint) idx=i; });
      const b=book(state.currentBook);
      const nextProgress=Math.round(((idx+1)/blocks.length)*100);
      if(idx!==state.activeChapter || nextProgress>pct(b.id)){
        state.activeChapter=idx;
        state.progress[b.id]=Math.max(pct(b.id), nextProgress);
        state.recent=[b.id,...state.recent.filter(x=>x!==b.id)].slice(0,6);
        saveState();
        updateReaderDom();
        history.replaceState({v:'reader'},'',`#/read/${b.id}/${idx+1}`);
      }
    },80);
  };
  window.removeEventListener('scroll', setupReaderScroll._handler);
  setupReaderScroll._handler=onScroll;
  window.addEventListener('scroll', onScroll, {passive:true});
}


let epubBookInstance, epubRendition, autoHideTimer;
function setupAutoHideReaderControls(){
  const paper=document.querySelector('#reader.active-view .reader-paper.focus-mode');
  document.body.classList.remove('reader-controls-hidden');
  clearTimeout(autoHideTimer);
  if(!paper) return;
  const show=()=>{document.body.classList.remove('reader-controls-hidden');clearTimeout(autoHideTimer);autoHideTimer=setTimeout(()=>document.body.classList.add('reader-controls-hidden'),2600)};
  if(setupAutoHideReaderControls._show){['mousemove','touchstart','keydown','scroll'].forEach(evt=>window.removeEventListener(evt, setupAutoHideReaderControls._show));}
  setupAutoHideReaderControls._show=show;
  ['mousemove','touchstart','keydown','scroll'].forEach(evt=>window.addEventListener(evt, show, {passive:true}));
  show();
}
function loadEpubFile(file){
  const viewer=document.querySelector('#epub-viewer');
  if(!viewer || !file) return;
  if(!window.ePub){viewer.innerHTML='<div class="empty-state"><h3>EPUB.js is not loaded.</h3><p>Open through the local server with internet enabled, or bundle EPUB.js in the React version.</p></div>';return;}
  viewer.innerHTML='';
  const url=URL.createObjectURL(file);
  try{
    epubBookInstance=window.ePub(url);
    epubRendition=epubBookInstance.renderTo('epub-viewer',{width:'100%',height:window.innerHeight*0.72,spread:'none'});
    epubRendition.display();
    epubRendition.on('relocated', loc=>{ if(loc?.start?.percentage){state.progress[state.currentBook]=Math.round(loc.start.percentage*100);saveState();updateReaderDom();} });
    toast('EPUB loaded locally.');
  }catch(err){viewer.innerHTML='<div class="empty-state"><h3>Could not open EPUB.</h3><p>Please try another legal EPUB file.</p></div>';}
}

function applyAppTheme(){const root=document.documentElement;root.classList.remove('app-night');const choice=state.appTheme||'system';root.dataset.theme=choice;const night=choice==='night'||(choice==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(night)root.classList.add('app-night')}
function renderSettings(){document.querySelectorAll('[data-theme-choice]').forEach(b=>b.classList.toggle('active',b.dataset.themeChoice===(state.appTheme||'system')));const f=document.querySelector('#setting-font'),fo=document.querySelector('#setting-font-out'),l=document.querySelector('#setting-line'),a=document.querySelector('#account-status'),name=document.querySelector('#account-name');if(f){f.value=state.reader.font;fo.textContent=state.reader.font+'px'}if(l)l.value=state.reader.line;if(a)a.textContent=state.account?'Signed in as '+state.account:'Not signed in — using this browser only.';if(name&&!name.value)name.value=state.account||''}
function exportState(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='bibliotheque-sync.json';a.click();URL.revokeObjectURL(url);toast('Sync file exported.')}
function inferFormat(b){const g=(b.genre||'').toLowerCase();if(b.format)return b.format;if(g.includes('manga')||g.includes('manhwa'))return 'Manga & Manhwa';if(g.includes('poetry')||g.includes('drama')||g.includes('short'))return 'More';if(g.includes('essays')||g.includes('nonfiction')||b.id==='quiet-paper')return 'Books';return 'Novels'}
function normalizeBooks(){BOOKS=BOOKS.map(b=>({...b,format:inferFormat(b),image:b.image||`assets/covers/${b.id}.svg`,chapters:b.chapters||[{id:'chapter-1',title:'The First Turning',minutes:18,content:['The rain began before the carriage crossed the outer gate, a fine grey needling that made the house appear farther away than it was.','Inside, the library held its breath. Dust lay softly on the long table, on the green-shaded lamps, on the brass ladder fixed to the eastern wall.'],quote:'Some rooms are not silent because they are empty, but because every object inside them remembers what was said.'},{id:'chapter-2',title:'A Note in Sepia',minutes:16,content:['The second chapter opens with a letter folded into the atlas.','Every shelf seemed to lean closer as the clue took shape.'],quote:'A margin note can be smaller than a whisper and still alter the room.'}]}));const fallbackCats=[{id:'moonlit-archive',title:'Moonlit Archive',author:'Sana Kuroi',genre:'manga',mood:'Moonlit',format:'Manga & Manhwa',pages:214,rating:4,cover:'midnight',lines:'Moonlit<br>Archive',image:'assets/covers/moonlit-archive.svg',synopsis:'A quiet manga-style mystery about a night librarian cataloguing memories that turn into ink.',chapters:[{id:'chapter-1',title:'Panel One: The Key Drawer',minutes:10,content:['The archive opened only after midnight, when the catalogue cards rearranged themselves into small panels of light.','Sana followed the silver gutter between frames and found the first key drawn in blue ink.'],quote:'Some stories read from left to right; some read from silence to memory.'}]},{id:'paper-crown',title:'The Paper Crown',author:'Min Seo Han',genre:'manhwa',mood:'Royal',format:'Manga & Manhwa',pages:238,rating:5,cover:'rust',lines:'The<br>Paper<br>Crown',image:'assets/covers/paper-crown.svg',synopsis:'A warm manhwa-inspired court story where a paper artisan is asked to forge a crown that can remember promises.',chapters:[{id:'chapter-1',title:'The Artisan’s Commission',minutes:11,content:['The palace messenger arrived with a box of ivory paper and a royal seal pressed too deeply into wax.','Every sheet inside was blank, yet each one felt heavier than law.'],quote:'A crown made of paper can still cut the hand that wears it.'}]},{id:'tea-house-panels',title:'Tea House Panels',author:'Aiko Ren',genre:'manga',mood:'Tender',format:'Manga & Manhwa',pages:180,rating:4,cover:'sage',lines:'Tea House<br>Panels',image:'assets/covers/tea-house-panels.svg',synopsis:'A gentle illustrated slice-of-life volume about a tea house where customers leave stories instead of coins.',chapters:[{id:'chapter-1',title:'The First Cup',minutes:9,content:['The bell above the tea house door rang softly, as if it were afraid to disturb the steam.','On the counter, a blank panel waited for the day’s first story.'],quote:'The smallest cup can hold an entire afternoon.'}]},{id:'lantern-poems',title:'Lantern Poems',author:'Ira Vale',genre:'poetry',mood:'Luminous',format:'More',pages:96,rating:4,cover:'ochre',lines:'Lantern<br>Poems',image:'assets/covers/lantern-poems.svg',synopsis:'A slim poetry collection for the More shelf: luminous fragments, short forms, and quiet evening pieces.',chapters:[{id:'chapter-1',title:'Small Lanterns',minutes:7,content:['A lantern does not argue with the dark. It simply keeps its little weather of gold.','Each poem in this section is meant to be read slowly, with room around it.'],quote:'Light is a sentence the night agrees to read.'}]}];fallbackCats.forEach(x=>{if(!BOOKS.some(b=>b.id===x.id))BOOKS.push(x)});if(!BOOKS.some(b=>b.id==='alice-wonderland'))BOOKS.push({id:'alice-wonderland',title:'Alice’s Adventures in Wonderland',author:'Lewis Carroll',cover:'ivory',lines:'Alice’s<br>Adventures',genre:'public domain classic',mood:'Whimsical',pages:192,rating:5,image:'assets/covers/alice-wonderland.svg',synopsis:'Public-domain demo edition with original Alice text excerpt and a John Tenniel illustration placed inside the chapter flow.',chapters:[{id:'chapter-1',title:'Down the Rabbit-Hole',minutes:14,publicDomain:true,source:'Project Gutenberg / Lewis Carroll',content:['Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do. Once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, “and what is the use of a book,” thought Alice “without pictures or conversations?”','So she was considering in her own mind, as well as she could, for the hot day made her feel very sleepy and stupid.'],image:'assets/illustrations/alice-rabbit.gif',imageCaption:'John Tenniel illustration, public-domain Project Gutenberg edition.',quote:'Oh dear! Oh dear! I shall be too late!'}]})}
async function loadBooksJson(){try{const res=await fetch('books.json',{cache:'no-store'});if(res.ok){BOOKS=await res.json()}}catch(e){console.warn('Using inline book fallback. Run a local server to load books.json.',e)}normalizeBooks()}

navLinks.forEach(a=>a.addEventListener('click',e=>{e.preventDefault();const h=a.getAttribute('href');if(h==='#library')showView('library-view');if(h==='#explore')showView('explore-view');if(h==='#reading-now')openReader();if(h==='#profile')showView('profile')}));
document.querySelector('.brand')?.addEventListener('click',e=>{e.preventDefault();showView('home')});document.querySelector('.user')?.addEventListener('click',()=>showView('profile'));searchButton?.addEventListener('click',()=>showView('search'));document.querySelector('[data-open-settings]')?.addEventListener('click',()=>showView('settings'));
document.addEventListener('click',e=>{const action=e.target.closest('[data-action]');if(action){e.preventDefault();e.stopPropagation();const id=action.dataset.book||state.currentBook,a=action.dataset.action;if(a==='back-step'){if(window.history.length>1){window.history.back();}else{showView('book-detail');}}if(a==='save')toggleSave(id);if(a==='like')toggleLike(id);if(a==='read')openReader(id);if(a==='next-page'){state.progress[id]=Math.min(100,pct(id)+Math.ceil(100/Math.max(1,(book(id).chapters||[]).length)));state.activeChapter=Math.min(((book(id).chapters||[]).length-1), (state.activeChapter||0)+1);state.recent=[id,...state.recent.filter(x=>x!==id)].slice(0,6);saveState();renderAll();setTimeout(()=>scrollReaderChapter(state.activeChapter),100);toast(`${book(id).title} is now ${pct(id)}% complete.`)}if(a==='prev-page'){state.activeChapter=Math.max(0,(state.activeChapter||0)-1);state.progress[id]=Math.max(0,pct(id)-8);saveState();renderAll();setTimeout(()=>scrollReaderChapter(state.activeChapter),100)}if(a==='font-up'){state.reader.font=Math.min(24,state.reader.font+1);saveState();renderReader()}if(a==='font-down'){state.reader.font=Math.max(15,state.reader.font-1);saveState();renderReader()}if(a==='theme'){state.reader.theme=action.dataset.theme;saveState();renderReader()}if(a==='reader-mode'){state.reader.mode=action.dataset.mode;saveState();renderReader();setTimeout(()=>scrollReaderChapter(state.activeChapter||0),80)}if(a==='focus-reader'){state.reader.focus=!state.reader.focus;saveState();renderReader();document.body.classList.toggle('reader-focus',!!state.reader.focus);toast(state.reader.focus?'Focus reading on.':'Focus reading off.')}if(a==='fullscreen-reader'){const el=document.querySelector('#reader');if(!document.fullscreenElement&&el?.requestFullscreen){el.requestFullscreen();state.reader.focus=true;}else if(document.exitFullscreen){document.exitFullscreen();state.reader.focus=false;}saveState();renderReader()}if(a==='highlight'){state.highlighted[id]=!state.highlighted[id];saveState();renderReader()}if(a==='open-chapter'){state.currentBook=id;state.activeChapter=Number(action.dataset.chapterIndex||0);state.recent=[id,...state.recent.filter(x=>x!==id)].slice(0,6);saveState();renderAll();showView('reader');history.replaceState({v:'reader'},'',`#/read/${id}/${state.activeChapter+1}`);setTimeout(()=>scrollReaderChapter(state.activeChapter),120)}if(a==='signin-local'){const name=document.querySelector('#account-name')?.value.trim();state.account=name||'Local reader';saveState();renderAll();toast('Signed in locally.')}if(a==='signout-local'){state.account=null;saveState();renderAll();toast('Signed out locally.')}if(a==='export-state'){exportState()}if(a==='app-theme'){state.appTheme=action.dataset.themeChoice||'system';saveState();applyAppTheme();renderSettings();toast(`Theme set to ${state.appTheme}.`)}if(a==='save-note'){const text=document.querySelector('#reader-note')?.value.trim();if(text){state.notes[id]=[...(state.notes[id]||[]),{text,at:new Date().toISOString()}];saveState();renderAll();toast('Margin note saved.')}}return}const view=e.target.closest('[data-view]');if(view){e.preventDefault();showView(view.dataset.view);return}const shelf=e.target.closest('.shelf-tabs button');if(shelf){state.activeShelf=shelf.dataset.shelf;saveState();renderLibrary();return}const exp=e.target.closest('.explore-controls button');if(exp){state.exploreFilter=exp.dataset.exploreFilter;saveState();renderExplore();return}const themeChoice=e.target.closest('[data-theme-choice]');if(themeChoice){state.appTheme=themeChoice.dataset.themeChoice;saveState();renderSettings();applyAppTheme();return}const filter=e.target.closest('.filter-row button');if(filter){state.searchFilter=filter.dataset.filter;saveState();renderSearch();return}const author=e.target.closest('[data-author]');if(author){document.querySelector('.explore-content').innerHTML=`<section class="explore-block"><header><h3>${author.dataset.author}</h3><p>Author shelf</p></header><div class="explore-books">${BOOKS.filter(b=>b.author===author.dataset.author).map(b=>`<article class="explore-book">${coverHTML(b,'feature')}<h4>${b.title}</h4><p>${b.genre}</p>${actions(b.id)}</article>`).join('')}</div></section>`;return}const mood=e.target.closest('[data-mood]');if(mood){document.querySelector('.explore-content').innerHTML=`<section class="explore-block"><header><h3>${mood.dataset.mood}</h3><p>Mood shelf</p></header><div class="explore-books">${BOOKS.filter(b=>b.mood===mood.dataset.mood).map(b=>`<article class="explore-book">${coverHTML(b,'feature')}<h4>${b.title}</h4><p>${b.author}</p>${actions(b.id)}</article>`).join('')}</div></section>`;return}const cat=e.target.closest('[data-category]');if(cat){const name=cat.dataset.category;document.querySelector('.explore-content').innerHTML=`<section class="explore-block"><header><h3>${name}</h3><p>Dedicated shelf for ${name.toLowerCase()} only.</p></header><div class="explore-books">${BOOKS.filter(b=>(b.format||inferFormat(b))===name).map(b=>`<article class="explore-book">${coverHTML(b,'feature')}<h4>${b.title}</h4><p>${b.author} · ${b.mood}</p><span class="book-type-badge">${b.format||inferFormat(b)}</span>${actions(b.id)}</article>`).join('')||'<div class="empty-state"><h3>No titles yet.</h3><p>This shelf is ready for future catalogue items.</p></div>'}</div></section>`;return}const cover=e.target.closest('[data-book]');if(cover&&!e.target.closest('button'))openBook(cover.dataset.book)});
document.addEventListener('change',e=>{if(e.target?.dataset.action==='line'){state.reader.line=Number(e.target.value);saveState();renderReader()}if(e.target?.id==='setting-line'){state.reader.line=Number(e.target.value);saveState();renderAll()}if(e.target?.id==='import-state'){const file=e.target.files[0];if(file){file.text().then(txt=>{state={...DEFAULT_STATE,...JSON.parse(txt)};saveState();renderAll();toast('Sync file imported.')}).catch(()=>toast('Import failed.'))}}});document.addEventListener('input',e=>{if(e.target?.id==='book-search')renderSearch();if(e.target?.id==='setting-font'){state.reader.font=Number(e.target.value);saveState();renderSettings()}});document.addEventListener('submit',e=>{if(e.target.classList.contains('search-board')){e.preventDefault();renderSearch()}});

document.addEventListener('click',e=>{
  const btn=e.target.closest('[data-reader-action]');
  if(!btn) return;
  e.preventDefault();
  const a=btn.dataset.readerAction;
  if(a==='toggle-contents'){state.reader.navOpen=!state.reader.navOpen;saveState();renderReader();}
  if(a==='toggle-notes'){state.reader.notesOpen=!state.reader.notesOpen;saveState();renderReader();}
  if(a==='toggle-epub'){state.reader.epubMode=!state.reader.epubMode;saveState();renderReader();}
  if(a==='manga-mode'){state.reader.mangaMode=btn.dataset.mode;saveState();renderReader();}
  if(a==='manga-direction'){state.reader.mangaDirection=state.reader.mangaDirection==='rtl'?'ltr':'rtl';saveState();renderReader();}
  if(a==='delete-note'){const id=state.currentBook;const index=Number(btn.dataset.noteIndex);state.notes[id]=(state.notes[id]||[]).filter((_,i)=>i!==index);saveState();renderAll();toast('Note deleted.');}
});
document.addEventListener('input',e=>{
  if(e.target?.id==='chapter-search'){
    const q=e.target.value.toLowerCase();
    document.querySelectorAll('.chapter-list a').forEach(a=>a.style.display=(a.dataset.chapterTitle||'').includes(q)?'block':'none');
  }
});
document.addEventListener('change',e=>{ if(e.target?.id==='epub-upload') loadEpubFile(e.target.files[0]); });
document.addEventListener('fullscreenchange',()=>{ if(!document.fullscreenElement && state.reader.focus){state.reader.focus=false;saveState();renderReader();} });

window.addEventListener('popstate',()=>{const h=location.hash.replace('#','');showView(h==='explore'?'home':h||'home',false)});
loadBooksJson().finally(()=>{renderAll();const raw=location.hash.replace('#','');if(raw.startsWith('/book/')){state.currentBook=raw.split('/')[2];renderAll();showView('book-detail',false)}else if(raw.startsWith('/read/')){const parts=raw.split('/');state.currentBook=parts[2]||state.currentBook;state.activeChapter=Math.max(0,Number(parts[3]||1)-1);renderAll();showView('reader',false)}else if(raw&&raw!=='/'&&raw!=='home'&&raw!=='explore')showView(raw.replace(/^\//,''),false);else showView('home',false);});
