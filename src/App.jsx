import { useState, useEffect } from 'react';
import './index.css';

export default function App() {
  const [activeView, setActiveView] = useState('home');
  const [theme, setTheme] = useState('system');

  // Sync theme with document root
  useEffect(() => {
    if (theme === 'night') {
      document.documentElement.classList.add('app-night');
    } else {
      document.documentElement.classList.remove('app-night');
    }
  }, [theme]);

  const navigateTo = (view) => {
    setActiveView(view);
    window.scrollTo(0, 0);
  };

  return (
    <div className={`bibliotheque ${activeView !== 'home' ? 'route-active' : ''}`}>
      <header className="topbar">
        <a className="brand" href="#" onClick={(e) => { e.preventDefault(); navigateTo('home'); }}>Bibliothèque</a>
        
        <nav className="nav" aria-label="Primary navigation">
          <a href="#" onClick={(e) => { e.preventDefault(); navigateTo('home'); }} aria-current={activeView === 'home' ? "page" : undefined}>Library</a>
          <a href="#explore" onClick={(e) => { e.preventDefault(); navigateTo('explore'); }} aria-current={activeView === 'explore' ? "page" : undefined}>Explore</a>
          <a href="#profile" onClick={(e) => { e.preventDefault(); navigateTo('profile'); }} aria-current={activeView === 'profile' ? "page" : undefined}>Profile</a>
        </nav>

        <div className="tools">
          <button className="search" type="button" aria-label="Search" onClick={() => navigateTo('search')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.8 18.1a7.3 7.3 0 1 1 0-14.6 7.3 7.3 0 0 1 0 14.6Zm5.15-2.15L21 21"/></svg>
          </button>
          <button className="settings" type="button" aria-label="Open settings" onClick={() => navigateTo('settings')}>⚙</button>
          <button className="user" type="button" aria-label="Open profile" onClick={() => navigateTo('profile')}></button>
        </div>
      </header>

      {/* HOME GRID (3 COLUMNS) */}
      <div className="main-grid" style={{ display: activeView === 'home' ? 'grid' : 'none' }}>
        <section className="reading-list">
          <h1>Your Reading List</h1>
          <div className="mini-grid">
            <article className="mini-book">
              <div className="cover mini navy moon" onClick={() => navigateTo('book-detail')}><span>The<br/>Silent<br/>Hours</span><em></em></div>
              <h2>The Silent Hours</h2><p>Eleanor Vance</p><i className="progress"><b style={{width: '28%'}}></b></i>
            </article>
            <article className="mini-book">
              <div className="cover mini photo"><span>Wuthering<br/>Heights</span></div>
              <h2>Wuthering Heights</h2><p>Author Tleson</p><i className="progress"><b style={{width: '64%'}}></b></i>
            </article>
            <article className="mini-book">
              <div className="cover mini teal"><span>Moby<br/>Dick</span></div>
              <h2>Moby Dick</h2><p>Mary Cohs</p><i className="progress"><b style={{width: '48%'}}></b></i>
            </article>
          </div>
        </section>

        <section className="featured">
          <div className="section-head">
            <h2>Featured Authors</h2>
            <div className="arrows">
              <button type="button">‹</button>
              <button type="button">›</button>
            </div>
          </div>
          <div className="featured-grid">
            <article className="feature-card">
              <div className="cover feature burgundy" onClick={() => navigateTo('book-detail')}><span>Echoes<br/>of the<br/>Past</span><small>Eleanor Vance</small></div>
              <h3>Echoes of the Past</h3><p>Eleanor Vance</p><div className="stars">★★★★★</div>
            </article>
             <article className="feature-card">
              <div className="cover feature blue"><span>The<br/>Midnight<br/>Library</span><small>Matt Haig</small></div>
              <h3>The Midnight Library</h3><p>Matt Haig</p><div className="stars">★★★★<i>★</i></div>
            </article>
             <article className="feature-card">
              <div className="cover feature ochre"><span>The<br/>Livns<br/>Visiam</span><small>Henna Vance</small></div>
              <h3>The Livns Visiam</h3><p>Henna Vance</p><div className="stars">★★★★</div>
            </article>
          </div>
        </section>

        <aside className="sidebar">
          <section className="recent">
            <h2>Recently Read</h2>
            <article className="recent-item">
              <div className="cover recent-cover burgundy"><span>Echoes<br/>of the<br/>Past</span></div>
              <h3>The Silent of the Hours</h3>
            </article>
          </section>
          <section className="stats">
            <h2>Reading Stats</h2>
            <dl>
              <div><dt>329</dt><dd>Reader reviews</dd></div>
              <div><dt>363</dt><dd>Readings</dd></div>
              <div><dt>65</dt><dd>Reatings</dd></div>
            </dl>
          </section>
        </aside>
      </div>

      {/* SECONDARY VIEWS */}
      
      {/* Book Detail View */}
      <section className={`app-section detail-section ${activeView === 'book-detail' ? 'active-view' : ''}`}>
        <div className="section-shell">
            <a className="view-return" href="#" onClick={(e) => { e.preventDefault(); navigateTo('home'); }}>← Back to library</a>
        </div>
        <div className="section-shell detail-grid">
            <aside className="detail-cover-wrap">
                <div className="cover detail-cover burgundy"><span>Echoes<br/>of the<br/>Past</span><small>Eleanor Vance</small></div>
                <button className="warm-button block" onClick={() => navigateTo('reader')}>Continue Reading</button>
            </aside>
            <article className="detail-copy">
                <p className="kicker">Book details</p>
                <h2>Echoes of the Past</h2>
                <p className="author-line">Eleanor Vance · Historical fiction · 428 pages</p>
                <div className="detail-stars">★★★★★ <small>4.8 · 329 reader reviews</small></div>
                <p className="lead">A hushed, atmospheric novel of inherited memory, family secrets, and the strange way old houses preserve the voices of those who leave them.</p>
                <div className="synopsis-box">
                    <h3>Synopsis</h3>
                    <p>Archivist Clara Vale returns to Thornfield House to catalogue her grandmother’s library. In the margins of a weathered atlas, she finds three handwritten clues that unravel a disappearance everyone in the family agreed never to name.</p>
                </div>
            </article>
        </div>
      </section>

      {/* Reader View */}
      <section className={`app-section reader-section ${activeView === 'reader' ? 'active-view' : ''}`}>
        <div className="section-shell">
            <a className="view-return" href="#" onClick={(e) => { e.preventDefault(); navigateTo('book-detail'); }}>← Back to book details</a>
        </div>
        <div className="section-shell reader-grid">
            <aside className="chapter-list">
                <p className="kicker">Contents</p>
                <a className="active" href="#">I. The Locked Alcove</a>
                <a href="#">II. A Note in Sepia</a>
                <a href="#">III. The Orchard Path</a>
            </aside>
            <article className="reader-paper">
                <div className="reader-tools">
                    <button type="button">Aa</button>
                    <span>Page 126</span>
                    <button type="button">Bookmark</button>
                </div>
                <p className="kicker">Echoes of the Past</p>
                <h2>The Locked Alcove</h2>
                <div className="reading-prose">
                    <p><span className="dropcap">T</span>he rain began before the carriage crossed the outer gate, a fine grey needling that made the house appear farther away than it was. Clara watched Thornfield gather itself from the mist: first the chimneys, then the slate roof, then the high windows reflecting a sky the colour of pewter.</p>
                    <p>Inside, the library held its breath. Dust lay softly on the long table, on the green-shaded lamps, on the brass ladder fixed to the eastern wall.</p>
                    <blockquote>Some rooms are not silent because they are empty, but because every object inside them remembers what was said.</blockquote>
                </div>
            </article>
        </div>
      </section>

    </div>
  );
}
