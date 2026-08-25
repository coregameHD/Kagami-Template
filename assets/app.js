'use strict';

const $id = (id) => document.getElementById(id);

function insertAtCursor(el, text) {
  el.focus();
  el.setSelectionRange(el.selectionStart ?? el.value.length, el.selectionEnd ?? el.value.length);
  // execCommand keeps the native undo stack intact; direct .value writes wipe it.
  if (document.execCommand('insertText', false, text)) return;
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  el.value = el.value.slice(0, start) + text + el.value.slice(end);
  el.selectionStart = el.selectionEnd = start + text.length;
}

function flash(btn, msg) {
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = msg;
  setTimeout(() => {
    btn.textContent = original;
    btn.disabled = false;
  }, 1500);
}

async function copyText(btn, text) {
  if (!text) {
    flash(btn, 'Nothing to copy');
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    flash(btn, 'Copied!');
  } catch {
    flash(btn, 'Copy failed');
  }
}

// Shared side nav: every page carries an empty <aside class="side-nav"></aside>,
// filled here so the nav lives in one place. Brand follows data-accent,
// active link follows the URL.
{
  const nav = document.querySelector('.side-nav');
  if (nav) {
    const brands = { vn: 'Visual Novel', nihongo: 'Nihongo', blog: 'Blog' };
    const brand = brands[document.documentElement.dataset.accent] || 'Template';
    const path = location.pathname.replace(/\/$/, '') || '/';
    const active = (href) => (href === path ? ' class="active"' : '');
    nav.innerHTML = `
        <a class="brand" href="/">Kagami <span>${brand}</span></a>
        <nav class="nav-group">
            <span class="group-label">Visual Novel</span>
            <a href="/visualnovel/japanese"${active('/visualnovel/japanese')}>Japanese</a>
            <a href="/visualnovel/english"${active('/visualnovel/english')}>English</a>
            <a href="/visualnovel/media"${active('/visualnovel/media')}>Media</a>
        </nav>
        <nav class="nav-group" lang="th">
            <span class="group-label" lang="en">Nihongo</span>
            <a href="/nihongo"${active('/nihongo')}>คำศัพท์</a>
            <a href="/nihongo/katakana"${active('/nihongo/katakana')}>คาตาคานะ</a>
            <a href="/nihongo/yojijukugo"${active('/nihongo/yojijukugo')}>โยจิจุคุโกะ</a>
            <a href="/nihongo/idioms"${active('/nihongo/idioms')}>สุภาษิต-สำนวน</a>
        </nav>
        <nav class="nav-group">
            <span class="group-label">Blog</span>
            <a href="/blog"${active('/blog')}>Post Generator</a>
            <a href="/blog/publish"${active('/blog/publish')}>Publish Guide</a>
        </nav>
        <div class="nav-foot">
            <button class="btn-quiet theme-btn" id="themeBtn" aria-label="Toggle theme"></button>
        </div>`;
  }
}

// Manual theme toggle; no stored value = follow system.
{
  const btn = $id('themeBtn');
  if (btn) {
    const isDark = () => document.documentElement.dataset.theme
      ? document.documentElement.dataset.theme === 'dark'
      : matchMedia('(prefers-color-scheme: dark)').matches;
    const label = () => { btn.textContent = isDark() ? '☀ Light mode' : '☾ Dark mode'; };
    btn.addEventListener('click', () => {
      const next = isDark() ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      localStorage.theme = next;
      label();
    });
    label();
  }
}

// Copy draft on Ctrl/Cmd+Enter from anywhere on the page.
document.addEventListener('keydown', (e) => {
  if (!(e.ctrlKey || e.metaKey) || e.key !== 'Enter') return;
  const btn = $id('copyBtn');
  if (!btn) return;
  e.preventDefault();
  btn.click();
});

// Autosave: persist form field values per page so drafts survive reloads/tab closes.
// Fields without an id (e.g. checkboxes in a fieldset) key off their closest ancestor
// id plus their value, so unlabeled checkbox groups still round-trip.
const AUTOSAVE_KEY = `draft:${location.pathname}`;
const AUTOSAVE_MAX_AGE_MS = 6 * 60 * 60 * 1000;

function autosaveKeyFor(el) {
  if (el.id) return el.id;
  const parent = el.closest('[id]');
  return parent ? `${parent.id}:${el.value}` : null;
}

function autosaveFields() {
  return [...document.querySelectorAll('input, select, textarea')]
    .filter((el) => autosaveKeyFor(el));
}

function saveAutosave() {
  const data = {};
  autosaveFields().forEach((el) => {
    data[autosaveKeyFor(el)] = el.type === 'checkbox' || el.type === 'radio' ? el.checked : el.value;
  });
  localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ savedAt: Date.now(), data }));
}

function clearAutosave() {
  localStorage.removeItem(AUTOSAVE_KEY);
}

function setupAutosave() {
  let saved = {};
  try {
    const record = JSON.parse(localStorage.getItem(AUTOSAVE_KEY) || 'null');
    if (record && Date.now() - record.savedAt < AUTOSAVE_MAX_AGE_MS) saved = record.data;
    else if (record) clearAutosave();
  } catch {
    saved = {};
  }
  const fields = autosaveFields().filter((el) => autosaveKeyFor(el) in saved);
  // Set every value first, then dispatch — so handlers that read a sibling
  // field (e.g. "if exam checked, copy the level select") see restored data.
  fields.forEach((el) => {
    const value = saved[autosaveKeyFor(el)];
    if (el.type === 'checkbox' || el.type === 'radio') el.checked = value;
    else el.value = value;
  });
  fields.forEach((el) => el.dispatchEvent(new Event('change')));

  autosaveFields().forEach((el) => {
    el.addEventListener('input', saveAutosave);
    el.addEventListener('change', saveAutosave);
  });
}

// Wire snippet buttons: data-snippet inserts its value into the target textarea,
// data-snippet-select inserts the current value of the referenced <select>.
function setupSnippets(editor) {
  document.querySelectorAll('[data-snippet], [data-snippet-select]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const selectId = btn.dataset.snippetSelect;
      const text = selectId ? $id(selectId).value : btn.dataset.snippet;
      insertAtCursor(editor, text);
    });
  });
}

// VN editor pages share this Snippets card verbatim; each page carries an empty
// <div class="card snippets-card"></div> filled here, next to its own template card.
// data-snippet values are byte-exact template text (trailing spaces significant).
const SNIPPETS_CARD = `
                <div class="card-head"><h2>Snippets</h2></div>
                <div class="card-body stack">
                    <div class="field">
                        <label for="greetingSelect" lang="th">หัวข้อข่าว</label>
                        <div class="row">
                            <select id="greetingSelect">
                                <option value="【NEWS】 ⇒ Announcements">【NEWS】 ⇒ Announcements</option>
                                <option value="【NEWS】 ⇒ Updates">【NEWS】 ⇒ Updates</option>
                                <option disabled>──────────</option>
                                <option value="【MEDIA】 ⇒ Illustration">【MEDIA】 ⇒ Illustration</option>
                                <option value="【MEDIA】 ⇒ Merchandise">【MEDIA】 ⇒ Merchandise</option>
                                <option value="【MEDIA】 ⇒ Music">【MEDIA】 ⇒ Music</option>
                                <option value="【MEDIA】 ⇒ Screenshots">【MEDIA】 ⇒ Screenshots</option>
                            </select>
                            <button class="btn" data-snippet-select="greetingSelect">Insert</button>
                        </div>
                    </div>
                    <div class="field">
                        <label for="storyHookSelect">Hyperlink</label>
                        <div class="row">
                            <select id="storyHookSelect">
                                <option value="🔗 Website ⋮ ">Website</option>
                                <option value="🔗 X (Twitter) ⋮ ">X (Twitter)</option>
                                <option value="🔗 Youtube ⋮ ">Youtube</option>
                                <option value="🔗 Steam ⋮ ">Steam</option>
                                <option disabled>──────────</option>
                                <option value="🔗 Source ⋮ ">Source</option>
                            </select>
                            <button class="btn" data-snippet-select="storyHookSelect">Insert</button>
                        </div>
                    </div>
                    <div class="grid-2">
                        <button class="btn-outline" data-snippet="📅 Release Date ⋮ {date}
">วันที่จัดจำหน่าย</button>
                        <button class="btn-outline" data-snippet="————————————
* หมายเหตุ ⋮ ">หมายเหตุ</button>
                    </div>
                </div>`;

// VN editor pages: snippet rail + freeform draft textarea, shared wiring.
// The editor pane is identical on every page, so it's injected here too;
// pages carry an empty <section class="pane pane-editor"></section>.
function setupEditorPage() {
  document.querySelector('.snippets-card').innerHTML = SNIPPETS_CARD;
  document.querySelector('.pane-editor').innerHTML = `
            <div class="pane-head">
                <h2>Post Draft</h2>
                <span class="char-count" id="charCount"></span>
            </div>
            <textarea id="editor" class="bare" spellcheck="false"></textarea>
            <div class="pane-foot">
                <button class="btn-danger" id="clearBtn">Clear Draft</button>
                <button class="btn" id="copyBtn">Copy to Clipboard</button>
            </div>`;
  const editor = $id('editor');
  const charCount = $id('charCount');
  const updateCount = () => { charCount.textContent = `${editor.value.length} chars`; };
  setupSnippets(editor);
  editor.addEventListener('input', updateCount);
  $id('copyBtn').addEventListener('click', () => copyText($id('copyBtn'), editor.value));
  $id('clearBtn').addEventListener('click', () => {
    if (confirm('Clear the entire editor content?')) {
      editor.value = '';
      editor.focus();
      clearAutosave();
      updateCount();
    }
  });
  setupAutosave();
  updateCount();
}

// Doc pages: button with data-copy-target="<pre id>" copies that block's text.
function setupCopyBlocks() {
  document.querySelectorAll('[data-copy-target]').forEach((btn) => {
    btn.addEventListener('click', () => copyText(btn, $id(btn.dataset.copyTarget).textContent));
  });
}

// Kana → Hepburn romaji. Katakana is folded to hiragana first, so one map
// covers both. Handles digraphs (きゃ), sokuon (っ, incl. っち → tchi) and
// the katakana long-vowel mark (ー repeats the previous vowel).
const KANA_ROMAJI = {
  きゃ: 'kya', きゅ: 'kyu', きょ: 'kyo', しゃ: 'sha', しゅ: 'shu', しょ: 'sho',
  ちゃ: 'cha', ちゅ: 'chu', ちょ: 'cho', にゃ: 'nya', にゅ: 'nyu', にょ: 'nyo',
  ひゃ: 'hya', ひゅ: 'hyu', ひょ: 'hyo', みゃ: 'mya', みゅ: 'myu', みょ: 'myo',
  りゃ: 'rya', りゅ: 'ryu', りょ: 'ryo', ぎゃ: 'gya', ぎゅ: 'gyu', ぎょ: 'gyo',
  じゃ: 'ja', じゅ: 'ju', じょ: 'jo', びゃ: 'bya', びゅ: 'byu', びょ: 'byo',
  ぴゃ: 'pya', ぴゅ: 'pyu', ぴょ: 'pyo',
  しぇ: 'she', ちぇ: 'che', じぇ: 'je', ふぁ: 'fa', ふぃ: 'fi', ふぇ: 'fe', ふぉ: 'fo',
  てぃ: 'ti', でぃ: 'di', とぅ: 'tu', どぅ: 'du', うぃ: 'wi', うぇ: 'we', うぉ: 'wo',
  ゔぁ: 'va', ゔぃ: 'vi', ゔぇ: 've', ゔぉ: 'vo', つぁ: 'tsa', つぇ: 'tse', つぉ: 'tso',
  あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o',
  か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko',
  さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so',
  た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to',
  な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no',
  は: 'ha', ひ: 'hi', ふ: 'fu', へ: 'he', ほ: 'ho',
  ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo',
  や: 'ya', ゆ: 'yu', よ: 'yo',
  ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro',
  わ: 'wa', を: 'o', ん: 'n',
  が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go',
  ざ: 'za', じ: 'ji', ず: 'zu', ぜ: 'ze', ぞ: 'zo',
  だ: 'da', ぢ: 'ji', づ: 'zu', で: 'de', ど: 'do',
  ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo',
  ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po',
  ぁ: 'a', ぃ: 'i', ぅ: 'u', ぇ: 'e', ぉ: 'o', ゔ: 'vu',
};

function kanaToRomaji(kana) {
  // Fold katakana (30A1–30F6) onto hiragana; ー has no hiragana twin, keep it.
  const hira = kana.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
  let out = '';
  for (let i = 0; i < hira.length; i += 1) {
    if (hira[i] === 'っ') {
      const next = KANA_ROMAJI[hira.slice(i + 1, i + 3)] || KANA_ROMAJI[hira[i + 1]];
      if (next) out += next.startsWith('ch') ? 't' : next[0];
      continue;
    }
    if (hira[i] === 'ー') {
      out += out.slice(-1);
      continue;
    }
    const two = KANA_ROMAJI[hira.slice(i, i + 2)];
    if (two) {
      out += two;
      i += 1;
    } else {
      out += KANA_ROMAJI[hira[i]] || hira[i];
    }
  }
  return out;
}

// Jisho parts_of_speech → the Thai word-type checkbox values on vocab pages.
const POS_TO_WORD_TYPE = [
  [/^Noun/, 'คำนาม'],
  [/^Na-adjective/, 'คำคุณศัพท์ な'],
  [/^I-adjective/, 'คำคุณศัพท์ い'],
  [/^Godan verb/, 'คำกริยากลุ่ม 1'],
  [/^Ichidan verb/, 'คำกริยากลุ่ม 2'],
  [/^(Suru verb|Kuru verb)/, 'คำกริยากลุ่ม 3 (する)'],
  [/^Transitive verb/, 'สกรรมกริยา (他動詞)'],
  [/^Intransitive verb/, 'อกรรมกริยา (自動詞)'],
  [/^Adverb/, 'คำวิเศษณ์'],
  [/^Pre-noun adjectival/, 'คำขยายคำหลัก (連体詞)'],
];

// Lookup button: query Jisho (via /api/jisho proxy — jisho.org blocks browser
// CORS) and fill romaji, word-type checkboxes, and JLPT level from the result.
function setupLookup() {
  const btn = $id('lookupBtn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    const query = $id('japanese-text').value.trim();
    if (!query) {
      flash(btn, 'Type a word first');
      return;
    }
    btn.disabled = true;
    try {
      const res = await fetch(`/api/jisho?keyword=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error(res.status);
      const { data } = await res.json();
      // Prefer the entry that exactly matches what was typed over Jisho's
      // fuzzy first hit.
      const entry = data.find((d) => d.japanese.some((j) => j.word === query || j.reading === query)) || data[0];
      btn.disabled = false;
      if (!entry) {
        flash(btn, 'Not found');
        return;
      }

      const romaji = $id('romaji-text');
      if (romaji && entry.japanese[0].reading) romaji.value = kanaToRomaji(entry.japanese[0].reading);

      const pos = entry.senses.flatMap((s) => s.parts_of_speech);
      document.querySelectorAll('#word-types input').forEach((cb) => {
        const [re] = POS_TO_WORD_TYPE.find(([, value]) => value === cb.value) || [];
        cb.checked = !!re && pos.some((p) => re.test(p));
      });

      // Jisho tags a word with every JLPT list it appears in; the word's own
      // level is the easiest one (highest N).
      const n = Math.max(0, ...entry.jlpt.map((t) => +t.match(/\d+/)[0]));
      $id('n-level').value = n >= 1 && n <= 5 ? `N${n}` : 'None';

      const { word, reading } = entry.japanese[0];
      $id('description').value = `${word || reading} (${reading}) หมายถึง `;

      $id('n-level').dispatchEvent(new Event('change'));
      $id('japanese-text').dispatchEvent(new Event('input'));
    } catch {
      btn.disabled = false;
      flash(btn, 'Lookup failed');
    }
  });
}

// Nihongo vocab pages (คำศัพท์ / คาตาคานะ): identical Word Properties card,
// JLPT wiring, and post format — only the post title and the middle input differ.
// Page carries <div class="card" id="word-props"></div>; template text is
// byte-exact per PRODUCT.md, do not reword.
function setupVocabPage(title, midFieldId) {
  $id('word-props').innerHTML = `
                <div class="card-head"><h2>Word Properties</h2></div>
                <div class="card-body stack">
                    <div class="field">
                        <label lang="th">ประเภทของคำศัพท์</label>
                        <fieldset class="checks cols-3" id="word-types" lang="th">
                            <label><input type="checkbox" value="คำนาม"> คำนาม</label>
                            <label><input type="checkbox" value="คำคุณศัพท์ な"> คำคุณศัพท์ な</label>
                            <label><input type="checkbox" value="คำคุณศัพท์ い"> คำคุณศัพท์ い</label>
                            <label><input type="checkbox" value="คำกริยากลุ่ม 1"> คำกริยากลุ่ม 1</label>
                            <label><input type="checkbox" value="คำกริยากลุ่ม 2"> คำกริยากลุ่ม 2</label>
                            <label><input type="checkbox" value="คำกริยากลุ่ม 3 (する)"> คำกริยากลุ่ม 3 (する)</label>
                            <label><input type="checkbox" value="สกรรมกริยา (他動詞)"> สกรรมกริยา (他動詞)</label>
                            <label><input type="checkbox" value="อกรรมกริยา (自動詞)"> อกรรมกริยา (自動詞)</label>
                            <label><input type="checkbox" value="คำวิเศษณ์"> คำวิเศษณ์</label>
                            <label><input type="checkbox" value="คำขยายคำหลัก (連体詞)"> คำขยายคำหลัก (連体詞)</label>
                        </fieldset>
                    </div>
                    <div class="props-row">
                        <div class="field">
                            <label for="n-level" lang="th">ระดับ JLPT</label>
                            <select id="n-level">
                                <option value="None">None</option>
                                <option value="N1">N1</option>
                                <option value="N2">N2</option>
                                <option value="N3">N3</option>
                                <option value="N4">N4</option>
                                <option value="N5">N5</option>
                            </select>
                        </div>
                        <label class="check" lang="th"><input type="checkbox" id="jlpt-exam"> ออกสอบ JLPT</label>
                        <div class="field">
                            <label for="jlpt-level">JLPT Level</label>
                            <select id="jlpt-level" disabled>
                                <option value="N1">N1</option>
                                <option value="N2">N2</option>
                                <option value="N3">N3</option>
                            </select>
                        </div>
                        <div class="field">
                            <label for="year">Year</label>
                            <input type="text" id="year" disabled>
                        </div>
                        <div class="field">
                            <label for="month">Month</label>
                            <select id="month" disabled>
                                <option value="07">07</option>
                                <option value="12">12</option>
                            </select>
                        </div>
                    </div>
                </div>`;

  const jlptExam = $id('jlpt-exam');
  const nLevel = $id('n-level');
  const jlptLevel = $id('jlpt-level');
  const year = $id('year');
  const month = $id('month');

  jlptExam.addEventListener('change', () => {
    jlptLevel.disabled = year.disabled = month.disabled = !jlptExam.checked;
    if (jlptExam.checked) {
      if (nLevel.value !== 'None') jlptLevel.value = nLevel.value;
      year.value = new Date().getFullYear();
    }
  });
  nLevel.addEventListener('change', () => {
    if (jlptExam.checked && nLevel.value !== 'None') {
      jlptLevel.value = nLevel.value;
      year.value = new Date().getFullYear();
    }
  });

  setupGenerator(() => {
    const wordTypes = [...document.querySelectorAll('#word-types input:checked')]
      .map((el) => el.value).join(' / ');

    let output = `【VOCABULARY】 ⇒ ${title}\n\n${$id('japanese-text').value}\n${$id(midFieldId).value}\n${$id('thai-text').value}\n\n※ ${wordTypes}`;

    if (nLevel.value !== 'None') {
      output += `\n※ คำศัพท์ JLPT ${nLevel.value}`;
    }
    if (jlptExam.checked) {
      output += `\n⭐️ ออกสอบ JLPT ${jlptLevel.value} (รอบ ${year.value}年${month.value}月)`;
    }

    output += `\n\n————————————\n${$id('description').value}\n\n————————————\n▍ภาพจากเกม ${$id('gametitle').value}`;
    return output;
  });

  setupLookup();
}

// Generator pages: build() returns the post text, rendered live into #preview.
function setupGenerator(build) {
  const preview = $id('preview');
  const charCount = $id('charCount');
  const update = () => {
    preview.textContent = build();
    if (charCount) charCount.textContent = `${preview.textContent.trim().length} chars`;
  };

  document.querySelectorAll('input, select, textarea').forEach((el) => {
    el.addEventListener('input', update);
    el.addEventListener('change', update);
  });

  $id('copyBtn')?.addEventListener('click', () => copyText($id('copyBtn'), preview.textContent.trim()));

  $id('clearBtn').addEventListener('click', () => {
    if (!confirm('Clear all draft content?')) return;
    document.querySelectorAll('input[type="text"], textarea').forEach((el) => { el.value = ''; });
    document.querySelectorAll('select').forEach((el) => { el.selectedIndex = 0; });
    document.querySelectorAll('input[type="checkbox"]').forEach((el) => {
      el.checked = false;
      el.dispatchEvent(new Event('change'));
    });
    clearAutosave();
    update();
  });

  update();
  setupAutosave();
}
