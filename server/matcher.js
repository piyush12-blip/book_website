/**
 * Pure JavaScript String Similarity (Dice Coefficient)
 * No external node_modules dependencies required!
 */
function compareTwoStrings(str1 = '', str2 = '') {
    const s1 = String(str1).toLowerCase().replace(/\s+/g, '');
    const s2 = String(str2).toLowerCase().replace(/\s+/g, '');

    if (s1 === s2) return 1.0;
    if (s1.length < 2 || s2.length < 2) return 0.0;

    const bigrams1 = new Map();
    for (let i = 0; i < s1.length - 1; i++) {
        const bigram = s1.substring(i, i + 2);
        const count = bigrams1.has(bigram) ? bigrams1.get(bigram) + 1 : 1;
        bigrams1.set(bigram, count);
    }

    let intersectionSize = 0;
    for (let i = 0; i < s2.length - 1; i++) {
        const bigram = s2.substring(i, i + 2);
        const count = bigrams1.has(bigram) ? bigrams1.get(bigram) : 0;
        if (count > 0) {
            bigrams1.set(bigram, count - 1);
            intersectionSize++;
        }
    }

    return (2.0 * intersectionSize) / (s1.length + s2.length - 2);
}

function normalizeQuery(title = '', author = '') {
    const cleanTitle = (title || '')
        .replace(/[\(\[\{].*?[\)\]\}]/g, '')
        .replace(/:\s*(Reese's Book Club|Oprah's Book Club|A Novel|A Memoir|A Thriller|A Mystery|A Novel of.*).*/gi, '')
        .replace(/:\s*.*$/g, '')
        .replace(/\s+by\s+.*$/gi, '')
        .replace(/\s+(taylor|jenkins|reid|bonnie|garmus|gabrielle|zevin|madeline|miller|colleen|hoover|matt|haig|blake|crouch|andy|weir|lucy|foley|jennette|mccurdy|rebecca|yarros|sarah|maas).*/gi, '')
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const cleanAuthor = (author || '')
        .replace(/[\(\[\{].*?[\)\]\}]/g, '')
        .replace(/Easy Reads|Unabridged|Audiobook|Publisher|Edition/gi, '')
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    return { cleanTitle, cleanAuthor };
}

function scoreMatch(candidate, target) {
    if (!candidate || !candidate.title) return 0;

    const candTitle = candidate.title.toLowerCase().replace(/[^a-zA-Z0-9\s]/g, '').trim();
    const targetTitle = target.cleanTitle.toLowerCase().trim();

    const titleScore = compareTwoStrings(candTitle, targetTitle);

    let authorScore = 0;
    if (candidate.author && target.cleanAuthor) {
        const candAuthor = candidate.author.toLowerCase().replace(/[^a-zA-Z0-9\s]/g, '').trim();
        const targetAuthor = target.cleanAuthor.toLowerCase().trim();
        authorScore = compareTwoStrings(candAuthor, targetAuthor);
    } else {
        authorScore = titleScore;
    }

    let yearPenalty = 0;
    const textDesc = `${candidate.title} ${candidate.description || ''} ${candidate.creator || ''}`.toLowerCase();
    const isOldTextbook = /textbook|emeritus|laboratory|manual|188\d|189\d|190\d|191\d|192\d/.test(textDesc);
    if (isOldTextbook) {
        yearPenalty = 0.5;
    }

    return (titleScore * 0.6 + authorScore * 0.4) - yearPenalty;
}

module.exports = { normalizeQuery, scoreMatch, compareTwoStrings };
