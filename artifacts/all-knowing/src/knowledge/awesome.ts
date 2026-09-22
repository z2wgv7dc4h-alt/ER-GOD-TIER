export type ResourceRole =
  | 'icons'
  | 'stats'
  | 'text'
  | 'lore'
  | 'extract'
  | 'tracker'
  | 'map'
  | 'community'
  | 'video'

export type AwesomeResource = {
  id: string
  name: string
  href: string
  section: 'assets' | 'community' | 'lore' | 'tools' | 'youtube'
  role: ResourceRole
  by?: string
  blurb: string
  /** What All-Knowing actually does with it. */
  use: string
}

/**
 * Structured copy of EanNewton/Awesome-Elden-Ring-Resources (CC0 list).
 * The list is the index. Game assets stay FromSoftware's.
 */
export const awesomeResources: AwesomeResource[] = [
  {
    id: 'elden-refs',
    name: 'Elden Refs',
    href: 'https://ihascats.github.io/Elden-Text/',
    section: 'assets',
    role: 'text',
    blurb: 'Dump of subtitled dialogue, item descriptions, and related FMG text.',
    use: 'Alias table for Reckoning OCR / typed names. Pickup banners use the same strings the game prints.',
  },
  {
    id: 'elden-jp',
    name: 'Elden JP',
    href: 'https://raw.githubusercontent.com/AsteriskAmpersand/Carian-Archive/main/MasterJP.html',
    section: 'assets',
    role: 'text',
    by: 'AsteriskAmpersand, syde',
    blurb: 'Japanese subtitle and item-description dump.',
    use: 'Same matcher, JP locale. PS5 store region JP players type names as they appear.',
  },
  {
    id: 'er-assets',
    name: 'Elden Ring Assets',
    href: 'https://drive.google.com/drive/folders/15ymEOfn0_0L3x4ZQo-9Q5ZooZuC1U53c',
    section: 'assets',
    role: 'icons',
    by: 'Ashelian',
    blurb: 'Concept art, Adventure Guide, interviews, in-game sprites.',
    use: 'No-install sprite drop: copy Ingame Sprites into public/sourced/sprites. Artbooks stay Codex flavour. This folder is not map tiles.',
  },
  {
    id: 'er-icons',
    name: 'Elden Ring Icons',
    href: 'https://drive.google.com/drive/folders/1QlFDRjtwJvJXBED7JsLN7jnkxB6ySr3p',
    section: 'assets',
    role: 'icons',
    by: 'RubyRed',
    blurb: 'Dump of all item icons, including cut content.',
    use: 'No-install item thumbs: copy the category folders into public/sourced/icons. iconFor() uses those names before chrome seals.',
  },
  {
    id: 'er-stats',
    name: 'Elden Ring Stats',
    href: 'https://docs.google.com/spreadsheets/d/1jZokIy9PcX5UhUPcTe992aP21JiXL015sfP4sjYktu4/edit#gid=0',
    section: 'assets',
    role: 'stats',
    by: 'Zullie the Witch (circulated sheet of player-model NPC stats)',
    blurb: 'Dump of NPC stats for player-model characters.',
    use: 'Build lab “what does this NPC actually have” and invasion/NPC fight cards. Canonical combat params still come from ERDB / NpcParam extract.',
  },
  {
    id: 'internal-er',
    name: 'Internal Elden Ring',
    href: 'https://docs.google.com/spreadsheets/d/1WbUQSgJiZZNl5PefmUsvlhtNJ0PLhTfv-W9zRD1_fzM/htmlview',
    section: 'assets',
    role: 'text',
    blurb: 'Internal CNT names as a spreadsheet.',
    use: 'Id ↔ display-name bridge when a screenshot or save flag only has an internal string.',
  },
  {
    id: 'er-discord',
    name: 'Elden Ring Discord',
    href: 'https://discord.gg/eldenring',
    section: 'community',
    role: 'community',
    blurb: 'Community Discord.',
    use: 'Not ingested. Link out.',
  },
  {
    id: 'carian-archive',
    name: 'Carian Archive',
    href: 'https://github.com/AsteriskAmpersand/Carian-Archive',
    section: 'lore',
    role: 'text',
    by: 'AsteriskAmpersand',
    blurb: 'String dump of Elden Ring.',
    use: 'Primary FMG/string corpus beside Elden Refs. Feed fact.aliases and Codex blurbs from game text, not wiki paraphrase.',
  },
  {
    id: 'lore-db',
    name: 'Elden Ring Lore Database',
    href: 'https://valeriolp.notion.site/Elden-Ring-Lore-Database-36b35438aeba4328bccd3466d8229517',
    section: 'lore',
    role: 'lore',
    by: 'Valerio',
    blurb: 'Tagged item lore in English and Italian.',
    use: 'Optional Codex overlay. Do not treat as param truth.',
  },
  {
    id: 'ofnir-library',
    name: 'Ofnir Library',
    href: 'https://docs.google.com/document/u/1/d/e/2PACX-1vQ-m63lmzRR9N_LwUNmmUZx1eSp2yYst1lJlkYDpHx5Uey5S4_JcBKz8Ln02-jOmuif3_C0LbSczd74/pub',
    section: 'lore',
    role: 'lore',
    by: 'Gideon Ofnir',
    blurb: 'Dump of lore descriptor text.',
    use: 'Same as lore DB — flavour text next to a fact, never a flag.',
  },
  {
    id: 'bindertool',
    name: 'Binder Tool',
    href: 'https://github.com/Atvaark/BinderTool',
    section: 'tools',
    role: 'extract',
    by: 'Atvaark',
    blurb: 'bdt, bhd, bnd, dcx, tpf, fmg, param unpacker.',
    use: 'Already implied by EldenRingMap/erlib. Keep as the documented unpacker if we grow a second extract path.',
  },
  {
    id: 'ean-tracker',
    name: 'Elden Ring Progress Tracker',
    href: 'https://docs.google.com/spreadsheets/d/1_7sTNSle8kxB72eNgICAfdGoWMbe4tFycy2PNwJFTw8/edit?usp=sharing',
    section: 'tools',
    role: 'tracker',
    by: 'EanNewton',
    blurb: 'Interactive spreadsheet for bosses and item acquisition.',
    use: 'Checklist schema to diff against our fact catalog. Import column names, do not embed the sheet.',
  },
  {
    id: 'er-bdt',
    name: 'ER.BDT.Tool',
    href: 'https://github.com/Ekey/ER.BDT.Tool',
    section: 'tools',
    role: 'extract',
    by: 'Ekey',
    blurb: 'BDT archive extractor.',
    use: 'Alternate archive path next to BinderTool / erlib.dvdbnd.',
  },
  {
    id: 'fextra-map',
    name: 'Fextralife Interactive Map',
    href: 'https://eldenring.wiki.fextralife.com/Interactive+Map',
    section: 'tools',
    role: 'map',
    blurb: 'Community interactive map.',
    use: 'Competitor reference only. Atlas is egormagurin/EldenRingMap generated from the install.',
  },
  {
    id: 'fextra-wiki',
    name: 'Fextralife Wiki',
    href: 'https://eldenring.wiki.fextralife.com/Elden+Ring+Wiki',
    section: 'tools',
    role: 'lore',
    blurb: 'Community wiki.',
    use: 'Human notes. Not the database. Quest lockout prose can be re-authored from here, then tied to flag ids.',
  },
  {
    id: 'noesis',
    name: 'Noesis',
    href: 'https://richwhitehouse.com/index.php?content=inc_projects.php',
    section: 'tools',
    role: 'extract',
    by: 'Rich Whitehouse',
    blurb: 'Model / image / animation preview and convert.',
    use: 'Offline inspection of TPF/DDS if extract_icons needs a sanity check.',
  },
  {
    id: 'fan-api',
    name: 'Elden Ring Fan API',
    href: 'https://eldenring.fanapis.com',
    section: 'tools',
    role: 'text',
    by: 'deliton',
    blurb: 'REST/GraphQL JSON for items, bosses, weapons, NPCs. MIT JSON in-repo.',
    use: 'Bootstrap Codex copy while ERDB extract is cold. Replace with FMG/param once generated.',
  },
  {
    id: 'clark-calc',
    name: 'Thomas Clark weapon calculator',
    href: 'https://github.com/ThomasJClark/elden-ring-weapon-calculator',
    section: 'tools',
    role: 'stats',
    by: 'ThomasJClark',
    blurb: 'Attack-rating engine. Ships regulation-vanilla-v1.17.js. MIT.',
    use: 'The Build lab math. Do not invent AR.',
  },
  {
    id: 'compass',
    name: 'Elden Ring Compass',
    href: 'https://github.com/EthanShoeDev/elden-ring-compass',
    section: 'tools',
    role: 'tracker',
    by: 'EthanShoeDev',
    blurb: 'Pure TypeScript in-browser .sl2 parser and progression site.',
    use: 'PC ingest when EldenRingMap is not running. Vendor save-parser-ts behind lib/save.ts.',
  },
  {
    id: 'er-guide',
    name: 'er-guide 100% route',
    href: 'https://github.com/aether-auto/er-guide',
    section: 'tools',
    role: 'tracker',
    by: 'aether-auto',
    blurb: 'Grace-to-grace 100% route with checkable items. MIT code.',
    use: 'Quest and item-placement prose; tiles/scraped data may be reused with the source noted.',
  },
  {
    id: 'bonfirevn',
    name: 'BonfireVN',
    href: 'https://www.youtube.com/c/shinymous',
    section: 'youtube',
    role: 'video',
    by: 'Shinymous',
    blurb: 'Close-up model views.',
    use: 'Link from a Codex model entry. Not ingested.',
  },
  {
    id: 'vaati',
    name: 'VaatiVidya',
    href: 'https://www.youtube.com/c/VaatiVidya',
    section: 'youtube',
    role: 'video',
    blurb: 'Lore videos.',
    use: 'Link out.',
  },
  {
    id: 'ratatoskr-flame',
    name: 'What is The Flame of Frenzy?',
    href: 'https://www.youtube.com/watch?v=pblth0JJz-c',
    section: 'youtube',
    role: 'video',
    by: 'Ratatoskr',
    blurb: 'Philosophy of the Frenzied Flame.',
    use: 'Link from the Three Fingers / Hyetta fact cluster.',
  },
  {
    id: 'zullie',
    name: 'Zullie the Witch',
    href: 'https://www.youtube.com/c/ZullietheWitch',
    section: 'youtube',
    role: 'video',
    blurb: 'Datamine and encounter videos. Also origin of the NPC stats sheet above.',
    use: 'Link out. Stats sheet is the ingestible artifact.',
  },
]

export const awesomeByRole = (role: ResourceRole) => awesomeResources.filter((r) => r.role === role)
