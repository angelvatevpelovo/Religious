# Holy Books Import Roadmap

This roadmap is a practical plan for expanding the RELIGIOUS sacred text library without changing the current Supabase schema. It prioritizes public-domain, stable, structured sources that can be mapped into the existing `holy_books`, `chapters`, and `verses` tables.

## Already imported

Current supported/imported sacred texts:

| Title | Religion | Tradition | Import script | Structure |
| --- | --- | --- | --- | --- |
| Holy Bible / KJV | Christianity | King James Version | `scripts/import-bible.js` | Bible books as `chapters.title`, chapter numbers, verses |
| Tao Te Ching | Taoism | Taoist | `scripts/import-tao-te-ching.js` | 81 chapters, line/passages |
| Dhammapada | Buddhism | Theravada / Pali Canon | `scripts/import-dhammapada.js` | 26 chapters, 423 numbered verses |
| Bhagavad Gita | Hinduism | Hindu / Vedantic | `scripts/import-bhagavad-gita.js` | 18 chapters, stanza rows |
| Quran | Islam | Islamic | `scripts/import-quran.js` | 114 canonical surahs, ayah/text rows |
| The Upanishads: Isa, Katha, Kena | Hinduism | Hindu / Vedantic | `scripts/import-upanishads.js` | 3 Upanishad sections, mantra/passages |

Current npm import commands:

- `npm run import:tao-te-ching`
- `npm run import:dhammapada`
- `npm run import:bhagavad-gita`
- `npm run import:quran`
- `npm run import:upanishads`

## High priority next imports

These are good next targets because they are important, public-domain, and likely parseable with careful section detection.

| Candidate | Religion | Tradition | Language | Translator | Source | License / public domain note | Expected structure | Difficulty |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| JPS 1917 Tanakh / Hebrew Bible | Judaism | Jewish scriptures | English | Jewish Publication Society committee | https://mechon-mamre.org/e/et/et0.htm or Internet Archive JPS 1917 scans | 1917 translation is public domain in the US, but source site terms should be checked before scraping | Books, chapters, verses | Medium |
| Sutta Nipata | Buddhism | Theravada / Pali Canon | English | V. Fausboll / Max Muller edition in Sacred Books of the East vol. 10 | https://www.sacred-texts.com/bud/sbe10/ | Sacred Books of the East translations are public domain in the US | Vaggas/chapters, numbered suttas/passages | Medium |
| Buddhist Suttas | Buddhism | Theravada / Pali Canon | English | T. W. Rhys Davids | https://www.sacred-texts.com/bud/sbe11/ | Public-domain Sacred Books of the East | Individual suttas as sections, paragraph rows | Medium |
| Zend-Avesta: Vendidad | Zoroastrianism | Avesta | English | James Darmesteter | https://www.sacred-texts.com/zor/sbe04/ | Public-domain Sacred Books of the East | Fargards/chapters, paragraphs | Medium |
| Analects of Confucius | Confucianism | Chinese Classics | English | James Legge | https://www.gutenberg.org/ebooks/3330 or Sacred Books of the East / Chinese Classics sources | Public-domain Legge translation | Books/chapters, numbered sayings | Easy / Medium |

## Medium priority imports

These are valuable but may need more parser review, more source comparison, or more metadata care.

| Candidate | Religion | Tradition | Language | Translator | Source | License / public domain note | Expected structure | Difficulty |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Lotus Sutra / Saddharma Pundarika | Buddhism | Mahayana | English | H. Kern | https://www.sacred-texts.com/bud/lotus/ or Sacred Books of the East vol. 21 | Public-domain Sacred Books of the East | Chapters, prose/verse passages | Medium |
| Jaina Sutras Part I | Jainism | Svetambara Jain | English | Hermann Jacobi | https://www.sacred-texts.com/jai/sbe22/ | Public-domain Sacred Books of the East | Acaranga Sutra, Kalpa Sutra sections | Medium |
| Jaina Sutras Part II | Jainism | Svetambara Jain | English | Hermann Jacobi | https://www.sacred-texts.com/jai/sbe45/ | Public-domain Sacred Books of the East | Uttaradhyayana Sutra chapters, Sutrakritanga sections | Medium |
| Additional Upanishads, SBE Part 1 | Hinduism | Vedantic | English | Max Muller | https://www.sacred-texts.com/hin/sbe01/ | Public-domain Sacred Books of the East | Upanishad sections, paragraphs/mantras | Medium |
| Additional Upanishads, SBE Part 2 | Hinduism | Vedantic | English | Max Muller | https://www.sacred-texts.com/hin/sbe15/ | Public-domain Sacred Books of the East | Katha, Mundaka, Taittiriya, Brihadaranyaka, Svetasvatara, Prasna, Maitrayani | Medium / Hard |
| Chuang Tzu / Zhuangzi selections | Taoism | Taoist | English | James Legge | https://www.sacred-texts.com/tao/sbe39/ and https://www.sacred-texts.com/tao/sbe40/ | Public-domain Sacred Books of the East | Books/chapters, paragraph rows | Medium |
| Mencius | Confucianism | Chinese Classics | English | James Legge | Project Gutenberg / Sacred Texts / Internet Archive Legge editions | Public-domain Legge translation | Books, chapters, sayings | Medium |

## Hard / needs research

These are important, but should not be rushed into the current schema without checking source quality, copyright, representation, and parser reliability.

| Candidate | Religion | Tradition | Concern |
| --- | --- | --- | --- |
| Guru Granth Sahib selections | Sikhism | Sikh scripture | Many modern English translations are copyrighted. Public-domain English sources are limited or may be incomplete/dated. Needs careful religious/contextual handling. |
| Full Tanakh from a modern Jewish translation | Judaism | Jewish scriptures | Modern JPS/NJPS translations are copyrighted. Use only public-domain 1917 JPS or another verified public-domain source. |
| Full Buddhist Pali Canon | Buddhism | Theravada | Very large corpus. Public-domain translations exist only for selections; source consistency varies. |
| Full Avesta | Zoroastrianism | Zoroastrian scripture | Sacred Books of the East has multiple volumes and complex structure. Good candidate, but split into smaller imports. |
| Vedas / Rig Veda full import | Hinduism | Vedic | Large and structurally complex; many translations include extensive commentary and notes. |
| Hadith collections | Islam | Hadith literature | Translation copyright and religious sensitivity issues. Not recommended until source and scope are very clear. |
| Book of Mormon or newer religious scriptures | Latter-day Saint / other modern traditions | Modern scripture | Copyright and denomination permissions must be checked carefully. |

## Copyright caution

- Prefer Project Gutenberg, Sacred Books of the East, Internet Archive scans of pre-1929 editions, or other clearly public-domain sources.
- Do not scrape modern translation sites without checking terms and copyright.
- Treat "publicly available online" as different from "public domain."
- For Sikh, modern Jewish, modern Buddhist, and modern Hindu translations, copyright risk is higher.
- Keep source URL and translator metadata in `holy_books` whenever available.
- When a source mixes scripture, commentary, introduction, notes, and index, create parse-only/debug modes before import.

## Recommended next 5 imports

1. **Analects of Confucius**
   - Religion/tradition: Confucianism / Chinese Classics
   - Why next: major world tradition, public-domain Legge translation, relatively structured sayings.
   - Suggested metadata:
     - `title`: The Analects of Confucius
     - `religion`: Confucianism
     - `tradition`: Chinese Classics
     - `language`: English
     - `translator`: James Legge
     - `source_url`: https://www.gutenberg.org/ebooks/3330
     - `license`: Public domain in the USA
     - `public_domain`: true
     - `text_type`: sayings_collection
   - Expected structure: books/chapters as sections; sayings as passage rows.
   - Difficulty: Easy / Medium

2. **Sutta Nipata**
   - Religion/tradition: Buddhism / Theravada Pali Canon
   - Why next: expands Buddhist coverage beyond Dhammapada.
   - Suggested metadata:
     - `title`: Sutta Nipata
     - `religion`: Buddhism
     - `tradition`: Theravada Buddhist / Pali Canon
     - `language`: English
     - `translator`: V. Fausboll / Sacred Books of the East edition
     - `source_url`: https://www.sacred-texts.com/bud/sbe10/
     - `license`: Public domain in the USA
     - `public_domain`: true
     - `text_type`: sutta_collection
   - Expected structure: vaggas/suttas/passages.
   - Difficulty: Medium

3. **Zend-Avesta: Vendidad**
   - Religion/tradition: Zoroastrianism / Avesta
   - Why next: adds major underrepresented world religion.
   - Suggested metadata:
     - `title`: Zend-Avesta: Vendidad
     - `religion`: Zoroastrianism
     - `tradition`: Avesta
     - `language`: English
     - `translator`: James Darmesteter
     - `source_url`: https://www.sacred-texts.com/zor/sbe04/
     - `license`: Public domain in the USA
     - `public_domain`: true
     - `text_type`: avesta_text
   - Expected structure: fargards/chapters and paragraph rows.
   - Difficulty: Medium

4. **JPS 1917 Tanakh**
   - Religion/tradition: Judaism / Hebrew Bible
   - Why next: essential for Jewish scripture coverage; complements KJV without treating KJV as the only Hebrew Bible route.
   - Suggested metadata:
     - `title`: Tanakh: JPS 1917
     - `religion`: Judaism
     - `tradition`: Jewish scripture
     - `language`: English
     - `translator`: Jewish Publication Society
     - `source_url`: https://mechon-mamre.org/e/et/et0.htm
     - `license`: 1917 translation public domain in the USA; source terms should be reviewed
     - `public_domain`: true
     - `text_type`: bible_translation
   - Expected structure: books, chapters, verses.
   - Difficulty: Medium

5. **Jaina Sutras Part I**
   - Religion/tradition: Jainism / Svetambara Jain
   - Why next: adds Jain coverage through a public-domain scholarly translation.
   - Suggested metadata:
     - `title`: Jaina Sutras Part I
     - `religion`: Jainism
     - `tradition`: Svetambara Jain
     - `language`: English
     - `translator`: Hermann Jacobi
     - `source_url`: https://www.sacred-texts.com/jai/sbe22/
     - `license`: Public domain in the USA
     - `public_domain`: true
     - `text_type`: sutra_collection
   - Expected structure: Acaranga Sutra and Kalpa Sutra sections.
   - Difficulty: Medium

## Notes for future import scripts

- Every new importer should include parse-only mode and debug mode before real import.
- Every importer should be idempotent: reuse book, skip existing populated chapters, avoid duplicate rows.
- Every parser should stop on Project Gutenberg / source license text and validate section counts.
- Use `section_label` and `verse_label` consistently:
  - Confucian classics: `Book` / `Saying`
  - Buddhist suttas: `Sutta` / `Passage`
  - Avesta: `Fargard` / `Passage`
  - Jaina sutras: `Section` / `Passage`
  - Tanakh: `Book` or existing Bible-style section / `Verse`
