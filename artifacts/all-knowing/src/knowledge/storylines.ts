import { endings, knownSet, planRoute, type EndingRoute, type PlanStep } from './endings'
import type { Character } from '../types'

export type Line = EndingRoute & { kind: 'ending' | 'story' | 'blitz' }

export const storylines: Line[] = [
  {
    id: 'millicent',
    kind: 'story',
    name: 'Millicent',
    aliases: ['millicent', 'gower', 'unalloyed', 'rot girl'],
    lockedIf: (c) => (knownSet(c).has('quest:millicent-killed') ? 'Millicent is already dead on this run.' : null),
    steps: [
      { id: 'm1', do: 'Get the Unalloyed Gold Needle from Commander O’Neil', detail: 'Swamp of Aeonia, Caelid. Take it to Gowry in Sellia.', factId: 'quest:millicent:needle', module: 'quests', minLevel: 50, requires: [], grants: ['quest:millicent:needle', 'item:rotted-wing'], lockouts: [] },
      { id: 'm2', do: 'Cure Millicent at the Church of the Plague', detail: 'Return the repaired needle. She moves to Altus, then Dominula, then Haligtree.', module: 'map', minLevel: 70, requires: ['quest:millicent:needle'], grants: ['quest:millicent:cured'], lockouts: [] },
      { id: 'm3', do: 'Help her at the Haligtree drain', detail: 'Choose to aid Millicent, not her sisters. That keeps the needle for a Frenzy purge later.', factId: 'grace:drainage', module: 'map', minLevel: 110, obtain: 'Unalloyed Gold Needle (for Farum / Frenzy undo)', requires: ['quest:millicent:cured'], grants: ['grace:drainage', 'quest:millicent:aid', 'item:miquella-needle'], lockouts: ['quest:millicent-killed', 'quest:millicent:betrayed'], lockout: 'Attacking her here ends the good needle.' },
    ],
  },
  {
    id: 'alexander',
    kind: 'story',
    name: 'Iron Fist Alexander',
    aliases: ['alexander', 'warrior jar', 'jar uncle'],
    lockedIf: () => null,
    steps: [
      { id: 'a1', do: 'Free Alexander from the Limgrave hole', detail: 'South of Stormhill. Hit the ground. Missable if you never crack it, but he can still show later.', factId: 'alexander-1', module: 'quests', requires: [], grants: ['alexander-1', 'quest:alexander:met'], lockouts: ['quest:alexander:missed-limgrave'] },
      { id: 'a2', do: 'Meet him at Gael Tunnel and Redmane', detail: 'Festival fight. Talk after Radahn.', factId: 'boss:radahn', module: 'map', minLevel: 70, requires: ['alexander-1'], grants: ['boss:radahn', 'quest:alexander:festival'], lockouts: ['quest:alexander:missed-limgrave'] },
      { id: 'a3', do: 'Find him in the Gelmir lava, then Farum', detail: 'Finish the duel in Farum for the Shard of Alexander.', module: 'map', minLevel: 110, obtain: 'Shard of Alexander', requires: ['quest:alexander:festival'], grants: ['quest:alexander:complete', 'item:shard-of-alexander'], lockouts: ['quest:alexander:missed-limgrave'] },
    ],
  },
  {
    id: 'varre',
    kind: 'story',
    name: 'White Mask Varré',
    aliases: ['varre', 'varré', 'mohgwyn', 'maiden blood'],
    lockedIf: () => null,
    steps: [
      { id: 'v1', do: 'Talk to Varré at the First Step, then at Rose Church', detail: 'After one Great Rune he offers the invasion cloth.', factId: 'grace:first-step', module: 'map', requires: [], grants: ['grace:first-step', 'quest:varre:met'], lockouts: [] },
      { id: 'v2', do: 'Soak the cloth in maiden blood', detail: 'Church of Inhibition Eochaid corpse, or your own finger maiden at the beginning if you never used her.', factId: 'grace:lake-shore', module: 'map', minLevel: 40, requires: ['quest:varre:met'], grants: ['grace:lake-shore', 'quest:varre:cloth'], lockouts: [] },
      { id: 'v3', do: 'Use the medal to Mohgwyn', detail: 'Fast path to Mohg and the SotE withered arm. Skips a lot of snowfield.', factId: 'boss:mohg', module: 'map', minLevel: 80, obtain: 'Mohg’s Great Rune', requires: ['quest:varre:cloth'], grants: ['boss:mohg', 'item:pureblood-medal'], lockouts: ['quest:varre:killed'], lockout: 'Killing Varré or ignoring him at Rose Church strands the medal.' },
    ],
  },
  {
    id: 'leda',
    kind: 'story',
    name: 'Needle Knight Leda',
    aliases: ['leda', 'enir-ilim', 'shadow story', 'miquella'],
    lockedIf: (c) => (!knownSet(c).has('region:shadow') && !knownSet(c).has('item:shadow-realm-blessing') ? 'You have not entered the Realm of Shadow yet. Need Mohg + the withered arm.' : null),
    steps: [
      { id: 'ld1', do: 'Meet Leda at the Gravesite cross', detail: 'Talk to Freyja, Hornsent, Ansbach, Thiollier before the Keep turns.', factId: 'grace:gravesite', module: 'map', requires: [], grants: ['grace:gravesite', 'quest:leda:met'], lockouts: [] },
      { id: 'ld2', do: 'Clear Shadow Keep invitations', detail: 'Who you side with changes Enir-Ilim. Crossing the Sealing Tree locks several.', factId: 'grace:shadow-keep', module: 'map', minLevel: 150, requires: ['quest:leda:met'], grants: ['grace:shadow-keep', 'quest:leda:invitations'], lockouts: ['quest:leda:invitations-locked'], lockout: 'Sealing Tree is the last invitation window.' },
      { id: 'ld3', do: 'Enir-Ilim and the Consort', detail: 'Promised Consort Radahn. Bring the allies you kept.', factId: 'boss:consort', module: 'map', minLevel: 170, requires: ['quest:leda:invitations'], grants: ['boss:consort'], lockouts: ['quest:leda:invitations-locked'], lockout: 'Allies killed before the Sealing Tree do not return for the Enir-Ilim assault.' },
    ],
  },
  {
    id: 'boc',
    kind: 'story',
    name: 'Boc the Seamster',
    aliases: ['boc', 'seamster', 'demi-human tailor', 'gold sewing needle'],
    lockedIf: () => null,
    steps: [
      { id: 'boc1', do: 'Free Boc from the demi-human bush in Limgrave', detail: 'West of Agheel Lake the talking bush asks to be cut down. He then turns up at a grace to alter garments.', factId: 'quest:boc:freed', module: 'quests', requires: [], grants: ['quest:boc:freed'], lockouts: [] },
      { id: 'boc2', do: 'Give Boc the Gold Sewing Needle', detail: 'Chest in the Church of Vows, Liurnia. He becomes a proper seamster and can tailor your armour.', factId: 'quest:boc:needle', module: 'quests', minLevel: 40, requires: ['quest:boc:freed'], grants: ['quest:boc:needle'], lockouts: [] },
      { id: 'boc3', do: 'Reassure Boc with the Prattling Pate “You’re Beautiful”', detail: 'He doubts his looks once you reach Leyndell. The pate keeps him content; ignoring it sends him to seek rebirth.', factId: 'quest:boc:beautiful', module: 'quests', minLevel: 90, requires: ['quest:boc:needle'], grants: ['quest:boc:beautiful'], lockouts: ['quest:boc:rebirth'], lockout: 'Telling him he is ugly, or leaving the doubt unanswered, sends him to Rennala for a larval tear and ends the line.' },
    ],
  },
  {
    id: 'nepheli',
    kind: 'story',
    name: 'Nepheli Loux',
    aliases: ['nepheli', 'nepheli loux', 'stormhawk king', 'stormveil throne'],
    lockedIf: () => null,
    steps: [
      { id: 'nepheli1', do: 'Meet Nepheli inside Stormveil Castle', detail: 'Side room off the ramparts before Godrick. She is hunting her own past.', factId: 'quest:nepheli:met', module: 'quests', minLevel: 30, requires: [], grants: ['quest:nepheli:met'], lockouts: [] },
      { id: 'nepheli2', do: 'Refuse Seluvis’s potion test', detail: 'Seluvis asks you to test the potion on her. Giving it to her ends her line and makes her a puppet.', module: 'quests', requires: ['quest:nepheli:met'], grants: ['quest:nepheli:refused-potion'], lockouts: ['quest:nepheli:potioned'], lockout: 'Handing Nepheli Seluvis’s potion forecloses her rule of Limgrave.' },
      { id: 'nepheli3', do: 'Give her the Stormhawk King ashes', detail: 'From the Chapel of Anticipation. Do this after Morgott and after speaking to Gideon.', factId: 'quest:nepheli:stormhawk', module: 'quests', minLevel: 90, requires: ['quest:nepheli:refused-potion', 'boss:morgott'], grants: ['quest:nepheli:stormhawk'], lockouts: ['quest:nepheli:potioned'] },
      { id: 'nepheli4', do: 'See Nepheli crowned at Stormveil', detail: 'She takes the throne with Kenneth Haight and rewards you with an Ancient Dragon Smithing Stone.', factId: 'quest:nepheli:ruler', module: 'map', minLevel: 90, requires: ['quest:nepheli:stormhawk'], grants: ['quest:nepheli:ruler', 'item:ancient-dragon-smithing-stone'], lockouts: ['quest:nepheli:potioned'] },
    ],
  },
  {
    id: 'dung-eater',
    kind: 'story',
    name: 'Dung Eater',
    aliases: ['dung eater', 'fell curse', 'seedbed', 'defiler'],
    lockedIf: () => null,
    steps: [
      { id: 'de1', do: 'Talk to Dung Eater at the Roundtable Hold', detail: 'Behind the door on the lower level. He asks you to help him defile.', factId: 'quest:dungeater:met', module: 'quests', requires: [], grants: ['quest:dungeater:met'], lockouts: [] },
      { id: 'de2', do: 'Open his cell in the Subterranean Shunning-Grounds', detail: 'Find the body in Leyndell’s sewers and the key, then free him for the invasion.', factId: 'quest:dungeater:freed', module: 'map', minLevel: 80, requires: ['quest:dungeater:met'], grants: ['quest:dungeater:freed'], lockouts: [] },
      { id: 'de3', do: 'Defeat him at the Leyndell moat invasion', detail: 'Sword of Milos drops here. Must happen before the Erdtree burns.', factId: 'quest:dungeater:invasion', module: 'map', minLevel: 90, obtain: 'Sword of Milos', requires: ['quest:dungeater:freed'], grants: ['quest:dungeater:invasion', 'item:sword-of-milos'], lockouts: ['boss:fire-giant'], lockout: 'The moat invasion does not occur in the Ashen Capital.' },
      { id: 'de4', do: 'Give him five Seedbed Curses for the Mending Rune', detail: 'Or use Seluvis’s potion to make him a puppet, which forfeits the rune.', factId: 'item:mending-rune-fell-curse', module: 'quests', minLevel: 100, requires: ['quest:dungeater:invasion'], grants: ['item:mending-rune-fell-curse'], lockouts: ['quest:dungeater:potioned'], lockout: 'Making him a puppet with Seluvis’s potion ends the Mending Rune path.' },
    ],
  },
  {
    id: 'fia',
    kind: 'story',
    name: 'Fia, Deathbed Companion',
    aliases: ['fia', 'deathbed', 'cursemark', 'lichdragon', 'fortissax'],
    lockedIf: () => null,
    steps: [
      { id: 'fia1', do: 'Let Fia hold you at the Roundtable Hold', detail: 'She offers an embrace and gives you the Weathered Dagger.', factId: 'quest:fia:met', module: 'quests', minLevel: 30, requires: [], grants: ['quest:fia:met'], lockouts: [] },
      { id: 'fia2', do: 'Decide the Weathered Dagger’s fate', detail: 'Give it to D and Fia leaves; keep it and D lives. Either way Fia moves to the Deeproot Depths.', module: 'quests', requires: ['quest:fia:met'], grants: ['quest:fia:dagger'], lockouts: ['quest:fia:killed'], lockout: 'Killing Fia at the Roundtable closes the Death-Prince line.' },
      { id: 'fia3', do: 'Give Fia the Cursemark of Death in Deeproot Depths', detail: 'Cursemark from the Carian Study Hall inversion. Defend her from Lionel.', factId: 'quest:fia:cursemark', module: 'map', minLevel: 90, requires: ['quest:fia:dagger'], grants: ['quest:fia:cursemark'], lockouts: ['quest:fia:killed'] },
      { id: 'fia4', do: 'Defeat Lichdragon Fortissax in her dream', detail: 'Take the Mending Rune of the Death-Prince for the Duskborn ending.', factId: 'boss:fortissax', module: 'map', minLevel: 100, requires: ['quest:fia:cursemark'], grants: ['boss:fortissax', 'item:mending-rune-death-prince'], lockouts: ['quest:fia:killed'] },
    ],
  },
  {
    id: 'rya',
    kind: 'story',
    name: 'Rya / Zorayas',
    aliases: ['rya', 'zorayas', 'volcano manor', 'serpent amnion'],
    lockedIf: () => null,
    steps: [
      { id: 'rya1', do: 'Recover Rya’s necklace in Liurnia', detail: 'Blackguard Big Boggart in the marsh has it. Return it and she invites you to Volcano Manor.', factId: 'quest:rya:necklace', module: 'map', minLevel: 40, requires: [], grants: ['quest:rya:necklace'], lockouts: [] },
      { id: 'rya2', do: 'Accept the invitation and join Volcano Manor', detail: 'Do Lady Tanith’s contracts to earn access upstairs.', factId: 'quest:rya:manor', module: 'quests', minLevel: 70, requires: ['quest:rya:necklace'], grants: ['quest:rya:manor'], lockouts: [] },
      { id: 'rya3', do: 'Give Zorayas the Serpent’s Amnion', detail: 'She learns she is the serpent’s daughter. Amnion from the manor’s upper level.', factId: 'quest:rya:amnion', module: 'quests', minLevel: 80, requires: ['quest:rya:manor'], grants: ['quest:rya:amnion'], lockouts: ['quest:rya:killed', 'boss:rykard'] },
      { id: 'rya4', do: 'Choose to spare or tell Zorayas the truth after Rykard', detail: 'Killing Rykard without finishing her beats can strand her in the manor.', factId: 'quest:rya:concluded', module: 'map', minLevel: 90, requires: ['quest:rya:amnion'], grants: ['quest:rya:concluded'], lockouts: ['quest:rya:killed'], lockout: 'If Rykard dies first or you attack her, the amnion beat can no longer be completed.' },
    ],
  },
  {
    id: 'hyetta',
    kind: 'story',
    name: 'Hyetta',
    aliases: ['hyetta', 'shabriri grape', 'frenzied maiden'],
    lockedIf: () => null,
    steps: [
      { id: 'hy1', do: 'Meet Hyetta at the Lake-Facing Cliffs', detail: 'Liurnia, past Stormveil. Give her a Shabriri Grape to start the pilgrimage.', factId: 'quest:hyetta:met', module: 'map', minLevel: 30, requires: [], grants: ['quest:hyetta:met'], lockouts: [] },
      { id: 'hy2', do: 'Feed her the Shabriri Grapes across Liurnia', detail: 'Purified Ruins, Gate Town Bridge, and the others. She follows the trail toward the Frenzied Flame.', factId: 'quest:hyetta:grapes', module: 'map', minLevel: 50, requires: ['quest:hyetta:met'], grants: ['quest:hyetta:grapes'], lockouts: [] },
      { id: 'hy3', do: 'Give her the Fingerprint Grape at the Frenzied Flame Proscription', detail: 'She reveals she is a maiden of the Three Fingers. Taking the flame commits the Frenzy ending.', factId: 'quest:hyetta:maiden', module: 'quests', minLevel: 80, requires: ['quest:hyetta:grapes'], grants: ['quest:hyetta:maiden'], lockouts: ['quest:hyetta:killed'], lockout: 'Killing Hyetta, or taking the Frenzied Flame before this beat, forecloses her revelation.' },
    ],
  },
  {
    id: 'sellen',
    kind: 'story',
    name: 'Sorceress Sellen',
    aliases: ['sellen', 'azur', 'lusat', 'primeval sorcerer', 'stars of ruin'],
    lockedIf: () => null,
    steps: [
      { id: 'se1', do: 'Free Sellen from the Waypoint Ruins', detail: 'Defeat the Mad Pumpkin Head in the cellar below the Liurnia ruins.', factId: 'quest:sellen:freed', module: 'map', minLevel: 30, requires: [], grants: ['quest:sellen:freed'], lockouts: [] },
      { id: 'se2', do: 'Find Azur, the Primeval Sorcerer', detail: 'Mt. Gelmir, sealed cave behind the Hermit Village. Sellen’s first master.', factId: 'quest:sellen:azur', module: 'map', minLevel: 80, requires: ['quest:sellen:freed'], grants: ['quest:sellen:azur'], lockouts: [] },
      { id: 'se3', do: 'Find Lusat in the Sellia Hideaway', detail: 'Caelid. Break the illusory wall; the second primeval sorcerer.', factId: 'quest:sellen:lusat', module: 'map', minLevel: 80, requires: ['quest:sellen:freed'], grants: ['quest:sellen:lusat'], lockouts: [] },
      { id: 'se4', do: 'Side with Sellen at Raya Lucaria', detail: 'After both masters, return to the academy. Choose Sellen over Jerren to get Stars of Ruin and her ending.', factId: 'quest:sellen:side', module: 'quests', minLevel: 90, obtain: 'Stars of Ruin', requires: ['quest:sellen:azur', 'quest:sellen:lusat'], grants: ['quest:sellen:side', 'item:stars-of-ruin'], lockouts: ['quest:sellen:jerren-side'], lockout: 'Siding with Jerren kills Sellen and forfeits Stars of Ruin.' },
    ],
  },
  {
    id: 'yura',
    kind: 'story',
    name: 'Bloody Finger Hunter Yura',
    aliases: ['yura', 'shabriri', 'nerijus', 'nagakiba'],
    lockedIf: () => null,
    steps: [
      { id: 'yu1', do: 'Help Yura against Bloody Finger Nerijus', detail: 'Agheel Lake, Limgrave. He is summonable for the invasion and warns you about the Recusants.', factId: 'quest:yura:nerijus', module: 'map', minLevel: 25, requires: [], grants: ['quest:yura:nerijus'], lockouts: [] },
      { id: 'yu2', do: 'Help him again at the Liurnia invasion', detail: 'Near the Ravine-Veiled Village. He then gifts you the Nagakiba.', factId: 'quest:yura:nagakiba', module: 'map', minLevel: 50, obtain: 'Nagakiba', requires: ['quest:yura:nerijus'], grants: ['quest:yura:nagakiba', 'item:nagakiba'], lockouts: [] },
      { id: 'yu3', do: 'Find Shabriri wearing Yura’s body at Zamor Ruins', detail: 'The Mountaintops. Yura is gone; Shabriri offers the Frenzied Flame path. Kill Shabriri for Yura’s set.', factId: 'quest:yura:shabriri', module: 'map', minLevel: 100, requires: ['quest:yura:nagakiba'], grants: ['quest:yura:shabriri'], lockouts: ['quest:yura:killed'], lockout: 'Killing Yura early forecloses the Nagakiba and the Shabriri fork.' },
    ],
  },
  {
    id: 'gowry',
    kind: 'story',
    name: 'Gowry',
    aliases: ['gowry', 'sellia', 'kindred of rot', 'unalloyed'],
    lockedIf: () => null,
    steps: [
      { id: 'go1', do: 'Meet Gowry at his shack in Sellia', detail: 'Caelid. He asks for the Unalloyed Gold Needle and hints at Millicent.', factId: 'quest:gowry:met', module: 'map', minLevel: 50, requires: [], grants: ['quest:gowry:met'], lockouts: [] },
      { id: 'go2', do: 'Bring Gowry the Unalloyed Gold Needle', detail: 'From Commander O’Neil in the Swamp of Aeonia. He repairs it for Millicent.', factId: 'quest:millicent:needle', module: 'quests', minLevel: 60, requires: ['quest:gowry:met'], grants: ['quest:millicent:needle'], lockouts: ['quest:gowry:killed'], lockout: 'Attacking Gowry closes Millicent’s repair and the Flock’s Canvas Talisman.' },
      { id: 'go3', do: 'Return after Millicent’s line concludes', detail: 'Gowry’s true nature shows; he drops the Flock’s Canvas Talisman.', factId: 'quest:gowry:concluded', module: 'quests', minLevel: 110, requires: ['quest:millicent:needle'], grants: ['quest:gowry:concluded', 'item:flock-canvas-talisman'], lockouts: ['quest:gowry:killed'] },
    ],
  },
  {
    id: 'd-hunter',
    kind: 'story',
    name: 'D, Hunter of the Dead',
    aliases: ['d hunter', 'hunter of the dead', 'twinned armor', 'summonwater'],
    lockedIf: () => null,
    steps: [
      { id: 'd1', do: 'Meet D at Summonwater Village', detail: 'Limgrave. He warns you about Those Who Live in Death and the Tibia Mariner.', factId: 'quest:d:met', module: 'map', minLevel: 20, requires: [], grants: ['quest:d:met'], lockouts: [] },
      { id: 'd2', do: 'Speak with D at the Roundtable Hold', detail: 'He sells incantations and gives you the Skeletal Militiaman Ashes.', factId: 'quest:d:roundtable', module: 'quests', minLevel: 30, requires: ['quest:d:met'], grants: ['quest:d:roundtable'], lockouts: [] },
      { id: 'd3', do: 'Decide whether to hand D the Weathered Dagger', detail: 'Fia’s dagger. Giving it to D advances Fia but costs D his life.', module: 'quests', minLevel: 60, requires: ['quest:d:roundtable'], grants: ['quest:d:dagger-choice'], lockouts: ['quest:d:killed'], lockout: 'The dagger decision is mutually exclusive with keeping D alive.' },
      { id: 'd4', do: 'Meet D’s brother in Nokron / Deeproot', detail: 'The surviving twin inherits D’s armour and hunts Fia.', factId: 'quest:d:brother', module: 'map', minLevel: 90, requires: ['quest:d:dagger-choice'], grants: ['quest:d:brother', 'item:twinned-armor'], lockouts: [] },
    ],
  },
  {
    id: 'corhyn',
    kind: 'story',
    name: 'Brother Corhyn & Goldmask',
    aliases: ['corhyn', 'goldmask', 'order ending', 'regression', 'golden order'],
    lockedIf: () => null,
    steps: [
      { id: 'co1', do: 'Buy from Corhyn and find Goldmask', detail: 'Corhyn at the Roundtable Hold; Goldmask on the Altus highway. Tell Corhyn where Goldmask is.', factId: 'quest:corhyn:goldmask', module: 'map', minLevel: 50, requires: [], grants: ['quest:corhyn:goldmask'], lockouts: [] },
      { id: 'co2', do: 'Learn the Law of Regression and read the statue', detail: 'Goldmask in Leyndell. Cast Regression at the Erdtree statue to reveal Radagon.', factId: 'quest:goldmask:regression', module: 'quests', minLevel: 80, requires: ['quest:corhyn:goldmask'], grants: ['quest:goldmask:regression'], lockouts: [] },
      { id: 'co3', do: 'Take the Mending Rune of Perfect Order', detail: 'Goldmask’s body on the snowfield bridge after the Forge of the Giants.', factId: 'item:mending-rune-order', module: 'map', minLevel: 100, requires: ['quest:goldmask:regression', 'boss:fire-giant'], grants: ['item:mending-rune-order'], lockouts: [] },
    ],
  },
  {
    id: 'thops',
    kind: 'story',
    name: 'Thops',
    aliases: ['thops', 'academy key', 'church of irith', 'thops barrier'],
    lockedIf: () => null,
    steps: [
      { id: 'th1', do: 'Meet Thops at the Church of Irith', detail: 'Liurnia, south of the academy. He is locked out and asks for a Glintstone Key.', factId: 'quest:thops:met', module: 'map', minLevel: 30, requires: [], grants: ['quest:thops:met'], lockouts: [] },
      { id: 'th2', do: 'Find a second Academy Glintstone Key', detail: 'One key is on the corpse behind the academy (Smarag); give it to Thops.', factId: 'quest:thops:key', module: 'map', minLevel: 50, requires: ['quest:thops:met'], grants: ['quest:thops:key'], lockouts: ['quest:thops:killed'], lockout: 'Killing Thops before this forecloses his barrier spell and bell bearing.' },
      { id: 'th3', do: 'Find Thops’s body at Raya Lucaria', detail: 'He enters the academy and does not come out. Loot Thops’s Barrier and his bell bearing.', factId: 'quest:thops:barrier', module: 'map', minLevel: 60, requires: ['quest:thops:key'], grants: ['quest:thops:barrier', 'item:thops-barrier'], lockouts: [] },
    ],
  },
  {
    id: 'irina',
    kind: 'story',
    name: 'Irina & Edgar',
    aliases: ['irina', 'edgar', 'castle morne', 'revenger shack', 'weeping peninsula'],
    lockedIf: () => null,
    steps: [
      { id: 'ir1', do: 'Meet Irina on the Weeping Peninsula road', detail: 'She asks you to deliver a letter to her father Edgar at Castle Morne.', factId: 'quest:irina:met', module: 'map', minLevel: 15, requires: [], grants: ['quest:irina:met'], lockouts: ['quest:irina:killed'], lockout: 'Killing Irina forecloses the letter and Edgar’s line.' },
      { id: 'ir2', do: 'Deliver the letter to Edgar at Castle Morne', detail: 'He refuses to leave while the Misbegotten hold the castle. Clear the Leonine Misbegotten.', factId: 'quest:edgar:letter', module: 'map', minLevel: 30, requires: ['quest:irina:met'], grants: ['quest:edgar:letter'], lockouts: ['quest:irina:killed'] },
      { id: 'ir3', do: 'Face the Revenger at the Revenger’s Shack', detail: 'After Irina is found dead, Edgar invades you on the Liurnia road. Missable if you never return.', factId: 'quest:edgar:revenger', module: 'map', minLevel: 50, requires: ['quest:edgar:letter'], grants: ['quest:edgar:revenger'], lockouts: ['quest:irina:killed'] },
    ],
  },
]

export const blitz: Line[] = [
  {
    id: 'blitz-lord',
    kind: 'blitz',
    name: 'Blitz Elden Lord',
    aliases: ['blitz', 'speedrun', 'fast ending', 'blitz lord', 'rush the game'],
    lockedIf: () => null,
    steps: [
      { id: 'b1', do: 'Limgrave → Stormveil', detail: 'Margit, Godrick. Grab the Groveside / Gatefront kit and leave.', factId: 'boss:godrick', module: 'map', minLevel: 20, requires: [], grants: ['boss:godrick'], lockouts: [] },
      { id: 'b2', do: 'One more Great Rune, cheapest', detail: 'Rennala if you can cheese the students, or skip to Altus via the Ruin-Strewn Precipice / Dectus.', factId: 'boss:rennala', module: 'map', minLevel: 40, requires: ['boss:godrick'], grants: ['boss:rennala'], lockouts: [] },
      { id: 'b3', do: 'Leyndell, Morgott', detail: 'No side quests. Capital Rampart → East Rampart → Godfrey shade → Morgott.', factId: 'boss:morgott', module: 'map', minLevel: 70, requires: ['boss:rennala'], grants: ['boss:morgott'], lockouts: [] },
      { id: 'b4', do: 'Forge, Farum, Ashen Capital, Beast', detail: 'Ignore Haligtree, Mohgwyn, Ranni. This is the default Lord ending as fast as the seeded map allows.', factId: 'boss:radagon', module: 'map', minLevel: 100, requires: ['boss:morgott'], grants: ['boss:radagon'], lockouts: [] },
    ],
  },
  {
    id: 'blitz-stars',
    kind: 'blitz',
    name: 'Blitz Age of Stars',
    aliases: ['blitz stars', 'fast ranni', 'rush stars'],
    lockedIf: (c) => endings[0].lockedIf(c),
    steps: [
      { id: 'bs1', do: 'Godrick, then Ranni’s Rise', detail: 'Skip Weeping. Caria Manor as soon as Liurnia opens.', factId: 'quest:ranni:service', module: 'quests', minLevel: 40, requires: [], grants: ['quest:ranni:service'], lockouts: ['quest:seluvis-blade'] },
      { id: 'bs2', do: 'Radahn the moment the festival is up', detail: 'Do not tour Caelid. In, festival, out, Nokron.', factId: 'boss:radahn', module: 'map', minLevel: 60, requires: ['quest:ranni:service'], grants: ['quest:ranni:festival', 'boss:radahn'], lockouts: ['quest:seluvis-blade'] },
      { id: 'bs3', do: 'Blade → statue → Astel → ring', detail: 'No Seluvis side deals. Straight to Manus Celes.', factId: 'quest:ranni:ring', module: 'map', minLevel: 80, requires: ['quest:ranni:festival'], grants: ['quest:ranni:ring'], lockouts: ['quest:seluvis-blade'] },
      { id: 'bs4', do: 'Blitz the Lord path and summon Ranni', detail: 'Same as Blitz Elden Lord from Morgott onward.', factId: 'boss:radagon', module: 'map', minLevel: 100, requires: ['quest:ranni:ring'], grants: ['boss:radagon'], lockouts: ['quest:seluvis-blade'] },
    ],
  },
]

export const allLines: Line[] = [
  ...endings.map((e) => ({ ...e, kind: 'ending' as const })),
  ...storylines,
  ...blitz,
]

export function findLine(text: string) {
  const n = text.toLowerCase()
  return allLines.find((e) => e.aliases.some((a) => n.includes(a)) || n.includes(e.name.toLowerCase()) || n.includes(e.id))
}

export type LineStatus = {
  line: Line
  state: 'locked' | 'done' | 'active' | 'open'
  note: string
  current?: PlanStep
}

export function survey(character: Character): LineStatus[] {
  return allLines.map((line) => {
    const plan = planRoute(character, line)
    if (plan.locked) return { line, state: 'locked' as const, note: plan.locked }
    const foreNote = plan.foreclosed.length ? ` · ${plan.foreclosed.length} beat(s) foreclosed` : ''
    if (!plan.current) {
      if (plan.foreclosed.length || plan.blocked.length) {
        return { line, state: 'locked' as const, note: `No reachable beats left.${foreNote}` }
      }
      return { line, state: 'done' as const, note: 'Seeded beats are ticked.' }
    }
    if (plan.done.length) {
      return { line, state: 'active' as const, note: `${plan.done.length}/${plan.total} · next: ${plan.current.do}${foreNote}`, current: plan.current }
    }
    return { line, state: 'open' as const, note: `Not started · first: ${plan.current.do}${foreNote}`, current: plan.current }
  })
}

export function stillAvailable(character: Character) {
  const rows = survey(character)
  return {
    locked: rows.filter((r) => r.state === 'locked'),
    done: rows.filter((r) => r.state === 'done'),
    active: rows.filter((r) => r.state === 'active'),
    open: rows.filter((r) => r.state === 'open'),
  }
}
