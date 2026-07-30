Bibliothèque Warm Classic Reader — Start Here

QUICK OPEN
1. Extract the ZIP folder.
2. Open index.html.

BEST WAY TO VIEW EVERYTHING
Some browsers block books.json when you double-click index.html because it opens as file://.
The app has a fallback, but for the full data-file version, run a tiny local server.

WINDOWS
1. Open the extracted folder.
2. Double-click start_server_windows.bat
3. Open this in your browser:
   http://localhost:8000

MAC / LINUX
1. Open Terminal inside the extracted folder.
2. Run:
   python3 -m http.server 8000
3. Open:
   http://localhost:8000

IF PORT 8000 IS BUSY
Use another port:
python3 -m http.server 5173
Then open:
http://localhost:5173

WHAT IS INCLUDED
- index.html
- styles.css
- script.js
- books.json
- assets/covers/ real SVG cover images
- assets/illustrations/ public-domain Alice illustration

CURRENT FEATURES
- Warm classic homepage
- Separate Library, Explore, Search, Book Detail, Reader, Profile, Settings sections
- Books / Novels / Manga & Manhwa / More categories
- Day/System/Night app theme
- Reader Paper/Sepia/Night theme
- Save and Like buttons
- Recently read tracking
- Reading progress bars
- Chapter lists and direct chapter opening
- Public-domain illustrated Alice demo
- Local sign-in prototype
- Export/import sync JSON

NOTE ABOUT SAVED DATA
The app uses your browser localStorage. If you want to reset it, clear site data/localStorage for this page.
