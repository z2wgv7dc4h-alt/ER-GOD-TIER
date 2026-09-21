/** Live sources. Mirrors live under public/sourced. */
export const hosted = {
  text: 'https://raw.githubusercontent.com/EldenRingExplorer/EldenRingTextExplorer/main/elden_ring_text.json',
  carian: 'https://github.com/AsteriskAmpersand/Carian-Archive',
  refs: 'https://ihascats.github.io/Elden-Text/',
  fanapi: {
    base: 'https://eldenring.fanapis.com/api',
    docs: 'https://docs.eldenring.fanapis.com/docs',
    images: 'https://eldenring.fanapis.com/images',
    routes: ['bosses', 'weapons', 'armors', 'talismans', 'sorceries', 'incantations', 'items', 'locations', 'npcs', 'ashes', 'spirits', 'ammos', 'shields', 'classes', 'creatures'] as const,
  },
  paramdex: {
    root: 'https://raw.githubusercontent.com/soulsmods/Paramdex/master/ER/Names/',
    files: [
      'BonfireWarpParam', 'WorldMapPointParam', 'GameAreaParam',
      'EquipParamGoods', 'EquipParamWeapon', 'EquipParamProtector',
      'EquipParamAccessory', 'EquipParamGem', 'Magic', 'BuddyParam',
      'ShopLineupParam', 'ItemLotParam_map', 'ItemLotParam_enemy', 'NpcParam',
    ],
  },
  flags: {
    hunts: 'https://raw.githubusercontent.com/BuLEEto/ER_Boss_Kill_Checklist/main/bosses.json',
  },
}
