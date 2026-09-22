import { endings, knownSet, planRoute, type EndingRoute, type PlanStep } from './endings'
import { approachingGates, triggeredGates } from './gates'
import type { Character } from '../types'

export type Line = EndingRoute & { kind: 'ending' | 'story' | 'blitz' }

/**
 * The Age of Stars route is owned by `endings.ts`, but Ranni also has to be a
 * traversable companion line (Task 53). Share the exact `steps` array rather than
 * copy it, so there is one lockout graph and the two can never disagree.
 */
const ageOfStars = endings.find((e) => e.id === 'stars')!

export const storylines: Line[] = [
  {
    id: 'ranni',
    kind: 'story',
    name: 'Ranni, the Witch',
    aliases: ['ranni', 'lunar princess', 'ranni the witch'],
    lockedIf: (c) => ageOfStars.lockedIf(c),
    steps: ageOfStars.steps,
  },
  {
    id: 'millicent',
    kind: 'story',
    name: 'Millicent',
    aliases: ['millicent', 'gower', 'unalloyed', 'rot girl'],
    lockedIf: (c) => (knownSet(c).has('quest:millicent-killed') ? 'Millicent is already dead on this run.' : null),
    steps: [
      { id: 'm1', do: 'Get the Unalloyed Gold Needle from Commander O’Neil', detail: 'Swamp of Aeonia, Caelid. Gowry in Sellia asks for it first; O’Neil drops it.', factId: 'quest:millicent:needle', module: 'map', minLevel: 50, requires: [], grants: ['quest:millicent:needle', 'item:rotted-wing'], lockouts: ['quest:millicent-killed'] },
      { id: 'm2', do: 'Cure Millicent at the Church of the Plague', detail: 'Gowry repairs the needle; give it to the rot-afflicted Millicent in the swamp church. She then travels toward Altus.', factId: 'quest:millicent:cured', module: 'map', minLevel: 60, requires: ['quest:millicent:needle'], grants: ['quest:millicent:cured'], lockouts: ['quest:millicent-killed'] },
      { id: 'm3', do: 'Meet Millicent at Erdtree-Gazing Hill', detail: 'She waits on the Altus plateau road and repeats her thanks. Keep the conversation going or the line stalls.', factId: 'quest:millicent:altus', module: 'map', minLevel: 70, requires: ['quest:millicent:cured'], grants: ['quest:millicent:altus'], lockouts: ['quest:millicent-killed'] },
      { id: 'm4', do: 'Aid her at Dominula and the Godskin Apostle', detail: 'Windmill Village. Her gold summon sign sits by the Godskin Apostle; fight beside her, then talk to her.', factId: 'quest:millicent:godskin', module: 'map', minLevel: 80, requires: ['quest:millicent:altus'], grants: ['quest:millicent:godskin'], lockouts: ['quest:millicent-killed'] },
      { id: 'm5', do: 'Bring her the Valkyrie’s Prosthesis', detail: 'She asks for the prosthesis once her travels resume. Gowry rewards the errand with the Prosthesis-Wearer Heirloom.', factId: 'quest:millicent:prosthesis', module: 'quests', minLevel: 90, requires: ['quest:millicent:godskin'], grants: ['quest:millicent:prosthesis'], lockouts: ['quest:millicent-killed'] },
      { id: 'm6', do: 'Aid Millicent at Elphael (gold sign)', detail: 'Below the Haligtree, choose the gold summon sign and beat her four sisters. She leaves the Unalloyed Gold Needle behind.', factId: 'quest:millicent:aid', module: 'map', minLevel: 110, obtain: 'Unalloyed Gold Needle', requires: ['quest:millicent:godskin'], grants: ['quest:millicent:aid', 'item:miquella-needle', 'item:rotten-winged-sword-insignia'], lockouts: ['quest:millicent:betrayed', 'quest:millicent-killed'], lockout: 'The two Elphael signs are mutually exclusive.' },
      { id: 'm7', do: 'Challenge Millicent at Elphael (red sign)', detail: 'The red summon sign makes her an enemy. You get her prosthesis; you lose the needle and the insignia.', factId: 'quest:millicent:betrayed', module: 'map', minLevel: 110, obtain: "Millicent's Prosthesis", requires: ['quest:millicent:godskin'], grants: ['quest:millicent:betrayed', 'item:millicent-prosthesis'], lockouts: ['quest:millicent:aid', 'quest:millicent-killed'], lockout: 'The two Elphael signs are mutually exclusive.' },
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
      { id: 'a3', do: 'Find him in the Gelmir lava, then Farum', detail: 'Finish the duel in Farum for the Shard of Alexander.', factId: 'quest:alexander:complete', module: 'map', minLevel: 110, obtain: 'Shard of Alexander', requires: ['quest:alexander:festival'], grants: ['quest:alexander:complete', 'item:shard-of-alexander'], lockouts: ['quest:alexander:missed-limgrave'] },
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
      { id: 'ld1', do: 'Meet Leda at the Three-Path Cross', detail: 'Gravesite Plain. Leda, Hornsent and Freyja wait at the first Miquella’s Cross; Thiollier is nearby.', factId: 'quest:leda:met', module: 'map', requires: [], grants: ['quest:leda:met', 'quest:hornsent:met'], lockouts: [] },
      { id: 'ld2', do: 'Clear Castle Ensis and meet them at the Highroad Cross', detail: 'The next Miquella’s Cross sits past Rellana. Freyja and Thiollier have their own words there.', factId: 'quest:leda:highroad', module: 'map', minLevel: 140, requires: ['quest:leda:met'], grants: ['quest:leda:highroad', 'quest:freyja:met', 'quest:thiollier:met'], lockouts: [] },
      { id: 'ld3', do: 'Enter the Shadow Keep and free Ansbach', detail: 'The Specimen Storehouse holds Sir Ansbach. He once served Mohg and knows Miquella’s charm.', factId: 'quest:ansbach:met', module: 'map', minLevel: 150, requires: ['quest:leda:highroad'], grants: ['quest:ansbach:met'], lockouts: ['quest:leda:invitations-locked'] },
      { id: 'ld4', do: 'Clear the Shadow Keep invitations', detail: 'Leda offers an invitation on the storehouse floor. Which allies you keep decides the Enir-Ilim assault.', factId: 'quest:leda:invitations', module: 'map', minLevel: 150, requires: ['quest:ansbach:met'], grants: ['quest:leda:invitations'], lockouts: ['quest:leda:invitations-locked'], lockout: 'The invitations close at the Sealing Tree.' },
      { id: 'ld5', do: 'Defeat Messmer the Impaler', detail: 'The Shadow Keep’s lord. His flame is the key to burning the Sealing Tree.', factId: 'boss:messmer', module: 'map', minLevel: 155, requires: ['quest:leda:invitations'], grants: ['boss:messmer'], lockouts: ['quest:leda:invitations-locked'] },
      { id: 'ld6', do: 'Burn the Sealing Tree', detail: 'The last window. Crossing it locks every unfinished Keep invitation and freezes the alliance choices.', factId: 'quest:leda:invitations-locked', module: 'map', minLevel: 160, requires: ['boss:messmer'], grants: ['quest:leda:invitations-locked'], lockouts: [] },
      { id: 'ld7', do: 'Side with your allies at Enir-Ilim', detail: 'Leda turns on whoever remains. Keep the allies you want summons from and fight the rest.', factId: 'quest:leda:concluded', module: 'map', minLevel: 170, requires: ['quest:leda:invitations-locked'], grants: ['quest:leda:concluded'], lockouts: [] },
      { id: 'ld8', do: 'Promised Consort Radahn', detail: 'Miquella’s consort at the top of Enir-Ilim. Bring the allies you kept.', factId: 'boss:consort', module: 'map', minLevel: 175, requires: ['quest:leda:concluded'], grants: ['boss:consort'], lockouts: [] },
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
      { id: 'nepheli2', do: 'Refuse Seluvis’s potion test', detail: 'Seluvis asks you to test the potion on her. Giving it to her ends her line and makes her a puppet.', factId: 'quest:nepheli:refused-potion', module: 'quests', requires: ['quest:nepheli:met'], grants: ['quest:nepheli:refused-potion'], lockouts: ['quest:nepheli:potioned'], lockout: 'Handing Nepheli Seluvis’s potion forecloses her rule of Limgrave.' },
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
      { id: 'de2', do: 'Open his cell in the Subterranean Shunning-Grounds', detail: 'Find the body and the key in Leyndell’s sewers, then free him for the invasion.', factId: 'quest:dungeater:freed', module: 'map', minLevel: 80, requires: ['quest:dungeater:met'], grants: ['quest:dungeater:freed'], lockouts: [] },
      { id: 'de3', do: 'Defeat him at the Leyndell moat invasion', detail: 'Sword of Milos drops here. Must happen before the Erdtree burns.', factId: 'quest:dungeater:invasion', module: 'map', minLevel: 90, obtain: 'Sword of Milos', requires: ['quest:dungeater:freed'], grants: ['quest:dungeater:invasion', 'item:sword-of-milos'], lockouts: ['boss:fire-giant'], lockout: 'The moat invasion does not occur in the Ashen Capital.' },
      { id: 'de4', do: 'Collect five Seedbed Curses', detail: 'One from the Roundtable’s corpse after he is freed, the rest across Leyndell, the sewers and the Mountaintops.', factId: 'item:seedbed-curse', module: 'map', minLevel: 85, requires: ['quest:dungeater:freed'], grants: ['item:seedbed-curse'], lockouts: ['quest:dungeater:potioned'] },
      { id: 'de5', do: 'Give him the Seedbed Curses for the Mending Rune', detail: 'Hand over five curses and he relents, giving the Mending Rune of the Fell Curse.', factId: 'item:mending-rune-fell-curse', module: 'quests', minLevel: 100, requires: ['quest:dungeater:invasion', 'item:seedbed-curse'], grants: ['item:mending-rune-fell-curse'], lockouts: ['quest:dungeater:potioned'], lockout: 'Making him a puppet with Seluvis’s potion ends the Mending Rune path.' },
      { id: 'de6', do: 'Or pour Seluvis’s potion into him', detail: 'The puppet fork. It forecloses the Fell Curse rune but yields the Dung Eater puppet.', factId: 'quest:dungeater:potioned', module: 'quests', minLevel: 70, requires: ['quest:dungeater:freed'], grants: ['quest:dungeater:potioned'], lockouts: ['item:mending-rune-fell-curse'], lockout: 'The potion and the Mending Rune are mutually exclusive.' },
      { id: 'de7', do: 'Use the Fell Curse rune after the Elden Beast', detail: 'The curse blesses everyone equally. Only if he is not a puppet.', factId: 'boss:radagon', module: 'map', minLevel: 110, requires: ['item:mending-rune-fell-curse'], grants: ['boss:radagon'], lockouts: [] },
    ],
  },
  {
    id: 'fia',
    kind: 'story',
    name: 'Fia, Deathbed Companion',
    aliases: ['fia', 'deathbed', 'cursemark', 'lichdragon', 'fortissax'],
    lockedIf: () => null,
    steps: [
      { id: 'fia1', do: 'Let Fia hold you at the Roundtable Hold', detail: 'She offers an embrace and the Weathered Dagger. Rogier’s knifeprint is the thread that leads here.', factId: 'quest:fia:met', module: 'quests', minLevel: 30, requires: [], grants: ['quest:fia:met'], lockouts: ['quest:fia:killed'] },
      { id: 'fia2', do: 'Decide the Weathered Dagger’s fate', detail: 'Give it to D and Fia leaves the Roundtable; keep it and D lives. Either way she moves to the Deeproot Depths.', factId: 'quest:fia:dagger', module: 'quests', minLevel: 50, requires: ['quest:fia:met'], grants: ['quest:fia:dagger'], lockouts: ['quest:fia:killed'], lockout: 'Killing Fia at the Roundtable closes the Death-Prince line.' },
      { id: 'fia3', do: 'Ride the coffin down to the Deeproot Depths', detail: 'Past the Valiant Gargoyles in Nokron, the coffin lifts you to the Prince of Death’s throne.', factId: 'grace:deeproot', module: 'map', minLevel: 80, requires: ['quest:fia:dagger'], grants: ['grace:deeproot'], lockouts: ['quest:fia:killed'] },
      { id: 'fia4', do: 'Give Fia the Cursemark of Death', detail: 'From the inverted Carian Study Hall. Defend her from Lionel’s puppets, then accept the Mending Rune of the Death-Prince.', factId: 'quest:fia:cursemark', module: 'map', minLevel: 90, requires: ['grace:deeproot', 'quest:ranni:statue'], grants: ['quest:fia:cursemark', 'item:cursemark-of-death'], lockouts: ['quest:fia:killed'] },
      { id: 'fia5', do: 'Defeat Lichdragon Fortissax in her dream', detail: 'Sleep in her deathbed; the dragon is the last guardian of the Death-Prince’s rune.', factId: 'boss:fortissax', module: 'map', minLevel: 100, obtain: 'Mending Rune of the Death-Prince', requires: ['quest:fia:cursemark'], grants: ['boss:fortissax', 'item:mending-rune-death-prince'], lockouts: ['quest:fia:killed'] },
      { id: 'fia6', do: 'Meet D’s brother in Deeproot', detail: 'The surviving twin inherits D’s Twinned Armor and hunts Fia. This is the fork against the Death-Prince line.', factId: 'quest:d:brother', module: 'map', minLevel: 90, requires: ['quest:fia:dagger'], grants: ['quest:d:brother', 'item:twinned-armor'], lockouts: ['quest:fia:killed'] },
      { id: 'fia7', do: 'Use the Mending Rune after the Elden Beast', detail: 'The Death-Prince ending, or keep another rune instead.', factId: 'boss:radagon', module: 'map', minLevel: 110, requires: ['item:mending-rune-death-prince'], grants: ['boss:radagon'], lockouts: [] },
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
      { id: 'se4', do: 'Report both primeval sorcerers to Sellen', detail: 'Tell her of Azur and Lusat and she asks you to meet her at the academy.', factId: 'quest:sellen:primers', module: 'quests', minLevel: 85, requires: ['quest:sellen:azur', 'quest:sellen:lusat'], grants: ['quest:sellen:primers'], lockouts: ['quest:sellen:jerren-side'] },
      { id: 'se5', do: 'Meet Witch-Hunter Jerren at Raya Lucaria', detail: 'Jerren waits in the Debate Parlor, hunting the witch. Which side you take is final.', factId: 'quest:sellen:jerren', module: 'map', minLevel: 90, requires: ['quest:sellen:primers'], grants: ['quest:sellen:jerren'], lockouts: ['quest:sellen:jerren-side'] },
      { id: 'se6', do: 'Side with Sellen', detail: 'Help her against Jerren to earn Stars of Ruin and her ending.', factId: 'quest:sellen:side', factIds: ['item:stars-of-ruin'], module: 'quests', minLevel: 90, obtain: 'Stars of Ruin', requires: ['quest:sellen:jerren'], grants: ['quest:sellen:side', 'item:stars-of-ruin'], lockouts: ['quest:sellen:jerren-side'], lockout: 'Siding with Jerren kills Sellen and forfeits Stars of Ruin.' },
      { id: 'se7', do: 'Or side with Jerren', detail: 'Take the Witch-Hunter’s side; Sellen is lost, and her spells and bell bearing go with her.', factId: 'quest:sellen:jerren-side', module: 'quests', minLevel: 90, requires: ['quest:sellen:jerren'], grants: ['quest:sellen:jerren-side'], lockouts: ['quest:sellen:side'], lockout: 'Siding with Sellen forfeits the Witch-Hunter’s side.' },
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
      { id: 'd3', do: 'Decide whether to hand D the Weathered Dagger', detail: 'Fia’s dagger. Giving it to D advances Fia but costs D his life.', factId: 'quest:d:dagger-choice', module: 'quests', minLevel: 60, requires: ['quest:d:roundtable'], grants: ['quest:d:dagger-choice'], lockouts: ['quest:d:killed'], lockout: 'The dagger decision is mutually exclusive with keeping D alive.' },
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
  {
    id: 'seluvis',
    kind: 'story',
    name: 'Preceptor Seluvis',
    aliases: ['seluvis', 'seluvis puppet', 'preceptor seluvis', 'seluvis potion'],
    lockedIf: (c) => (knownSet(c).has('quest:ranni:nokron') ? 'Ranni has the Fingerslayer Blade; Seluvis is already dead on this run.' : null),
    steps: [
      { id: 'sv1', do: 'Enter Ranni’s service and meet Seluvis at Seluvis’s Rise', detail: 'Three Sisters, after Caria Manor. He sells sorceries and wants a puppet errand.', factId: 'quest:seluvis:met', module: 'quests', minLevel: 40, requires: [], grants: ['quest:seluvis:met'], lockouts: [] },
      { id: 'sv2', do: 'Take Seluvis’s potion and choose a target', detail: 'He asks you to pour it into Nepheli or Dung Eater. Both choices permanently change those lines — give it to neither if you want their endings.', factId: 'quest:seluvis:potion', module: 'quests', requires: ['quest:seluvis:met'], grants: ['quest:seluvis:potion'], lockouts: [], lockout: 'Nepheli loses her rule and Dung Eater loses the Mending Rune if they drink it.' },
      { id: 'sv3', do: 'Buy out his puppet stock before Nokron', detail: 'Once Ranni has the Fingerslayer Blade, Seluvis is found dead in his rise and his spells and the Magic Scorpion Charm are gone for the run.', factId: 'quest:seluvis:concluded', module: 'quests', requires: ['quest:seluvis:potion'], grants: ['quest:seluvis:concluded'], lockouts: ['quest:ranni:nokron'], lockout: 'Advancing Ranni past the blade closes Seluvis permanently.' },
    ],
  },
  {
    id: 'kenneth',
    kind: 'story',
    name: 'Kenneth Haight',
    aliases: ['kenneth', 'kenneth haight', 'fort haight', 'limgrave ruler'],
    lockedIf: () => null,
    steps: [
      { id: 'kh1', do: 'Clear Fort Haight and meet Kenneth', detail: 'East Limgrave. Kill the Demi-Human Chief on the ramparts, then take the Bloody Slash ash and Kenneth’s request.', factId: 'quest:kenneth:fort', module: 'map', minLevel: 20, requires: [], grants: ['quest:kenneth:fort'], lockouts: [] },
      { id: 'kh2', do: 'Accept his knightly errand at Mistwood Ruins', detail: 'He asks you to find a worthy ruler for Limgrave. Nepheli Loux is that ruler.', factId: 'quest:kenneth:knighthood', module: 'quests', minLevel: 40, requires: ['quest:kenneth:fort'], grants: ['quest:kenneth:knighthood'], lockouts: [] },
      { id: 'kh3', do: 'Crown Nepheli at Stormveil with Kenneth as steward', detail: 'After Morgott and after giving Nepheli the Stormhawk King ashes, return to the Stormveil throne room. Requires the Nepheli line, not Seluvis’s potion.', factId: 'quest:kenneth:ruler', module: 'map', minLevel: 90, requires: ['quest:kenneth:knighthood', 'quest:nepheli:stormhawk'], grants: ['quest:kenneth:ruler'], lockouts: ['quest:nepheli:potioned'], lockout: 'If Nepheli drank Seluvis’s potion there is no coronation.' },
    ],
  },
  {
    id: 'rogier',
    kind: 'story',
    name: 'Sorcerer Rogier',
    aliases: ['rogier', 'sorcerer rogier', 'black knifeprint', 'knifeprint'],
    lockedIf: () => null,
    steps: [
      { id: 'rg1', do: 'Meet Rogier in Stormveil and again at the Roundtable Hold', detail: 'He sits in the chapel with the corpse of Godwyn’s face, then at the Roundtable by the fireplace.', factId: 'quest:rogier:met', module: 'quests', minLevel: 30, requires: [], grants: ['quest:rogier:met'], lockouts: [] },
      { id: 'rg2', do: 'Bring him the Black Knifeprint from Black Knife Catacombs', detail: 'He is dying from the deathroot curse. The knifeprint is the key to Ranni’s service.', factId: 'item:black-knifeprint', module: 'map', minLevel: 50, requires: ['quest:rogier:met'], grants: ['quest:rogier:knifeprint', 'item:black-knifeprint'], lockouts: [] },
      { id: 'rg3', do: 'Show the knifeprint to Ranni and enter her service', detail: 'This is the alternate door into the Age of Stars line; you can still serve her without it.', factId: 'quest:ranni:service', module: 'quests', minLevel: 50, requires: ['quest:rogier:knifeprint'], grants: ['quest:ranni:service'], lockouts: [] },
      { id: 'rg4', do: 'Find Rogier’s body in Deeproot Depths and take his set', detail: 'After he dies at the Roundtable, his body rests in the Deeproot Depths near the Prince of Death’s throne.', factId: 'quest:rogier:concluded', module: 'map', minLevel: 90, requires: ['quest:rogier:knifeprint'], grants: ['quest:rogier:concluded'], lockouts: [] },
    ],
  },
  {
    id: 'tanith',
    kind: 'story',
    name: 'Lady Tanith / Volcano Manor',
    aliases: ['tanith', 'lady tanith', 'recusant', 'volcano contracts'],
    lockedIf: () => null,
    steps: [
      { id: 'ta1', do: 'Recover Rya’s necklace and accept her invitation', detail: 'Big Boggart in the Liurnia marsh has it. Returning it opens Volcano Manor to you.', factId: 'quest:rya:necklace', module: 'map', minLevel: 40, requires: [], grants: ['quest:rya:necklace', 'quest:rya:manor', 'item:volcano-manor-invitation'], lockouts: ['quest:rya:killed'] },
      { id: 'ta2', do: 'Take Tanith’s first contract', detail: 'Inside the manor, Lady Tanith hands you invasion contracts against the Erdtree’s servants.', factId: 'quest:tanith:contracts', module: 'quests', minLevel: 60, requires: ['quest:rya:manor'], grants: ['quest:tanith:contracts'], lockouts: ['boss:rykard'] },
      { id: 'ta3', do: 'Complete the named contracts (Istvan, Rileigh, Hoslow)', detail: 'Each is a red summon sign in the world. Finishing them opens the drawing room and Tanith’s reward.', factId: 'quest:tanith:targets', module: 'quests', minLevel: 90, requires: ['quest:tanith:contracts'], grants: ['quest:tanith:targets'], lockouts: ['boss:rykard'] },
      { id: 'ta4', do: 'Take the Drawing-Room Key and search the manor', detail: 'Tanith’s key opens the upstairs rooms; letters and a hidden imp statue guard a serpent’s amnion.', factId: 'item:drawing-room-key', module: 'map', minLevel: 80, requires: ['quest:tanith:targets'], grants: ['item:drawing-room-key', 'item:serpent-amnion'], lockouts: ['boss:rykard'] },
      { id: 'ta5', do: 'Give Rya the Serpent’s Amnion', detail: 'She learns she is the serpent’s daughter. Do this before Rykard dies.', factId: 'quest:rya:amnion', module: 'quests', minLevel: 80, requires: ['quest:rya:manor', 'item:serpent-amnion'], grants: ['quest:rya:amnion'], lockouts: ['quest:rya:killed', 'boss:rykard'], lockout: 'Killing Rykard first strands Rya.' },
      { id: 'ta6', do: 'Defeat Rykard, Lord of Blasphemy', detail: 'The serpent-devouring god. His death is the point of no return for the manor.', factId: 'boss:rykard', module: 'map', minLevel: 100, requires: ['quest:tanith:contracts'], grants: ['boss:rykard'], lockouts: [] },
      { id: 'ta7', do: 'Hear Tanith’s final request, or end her', detail: 'She asks you to devour the god together. Refuse and she leaves; strike her and she stays by his corpse.', factId: 'quest:tanith:concluded', module: 'map', minLevel: 100, requires: ['boss:rykard'], grants: ['quest:tanith:concluded'], lockouts: [] },
      { id: 'ta8', do: 'Choose Rya’s aftermath', detail: 'Spare her or tell her the truth of her birth. The manor is quiet either way.', factId: 'quest:rya:concluded', module: 'map', minLevel: 100, requires: ['quest:rya:amnion'], grants: ['quest:rya:concluded'], lockouts: ['quest:rya:killed'] },
    ],
  },
  {
    id: 'gurranq',
    kind: 'story',
    name: 'Gurranq, Beast Clergyman',
    aliases: ['gurranq', 'beast sanctum', 'deathroot', 'beast clergyman quest'],
    lockedIf: () => null,
    steps: [
      { id: 'gu1', do: 'Reach the Bestial Sanctum and meet Gurranq', detail: 'Portal behind the Third Church of Marika in Limgrave, or the Divine Bridge teleporter. He begs for Deathroot.', factId: 'quest:gurranq:met', module: 'map', minLevel: 40, requires: [], grants: ['quest:gurranq:met'], lockouts: [] },
      { id: 'gu2', do: 'Feed him Deathroot from the Tibia Mariners and elsewhere', detail: 'Nine Deathroot exist; each turn-in teaches a Beast incantation and the Clawmark Seal. He is Maliketh in disguise.', factId: 'quest:gurranq:deathroot', module: 'quests', minLevel: 70, requires: ['quest:gurranq:met'], grants: ['quest:gurranq:deathroot'], lockouts: [] },
      { id: 'gu3', do: 'Finish the Deathroot and face him', detail: 'After the ninth he turns hostile in the sanctum. The Farum Azula fight is the same character, so this is a preview, not a second boss.', factId: 'quest:gurranq:concluded', module: 'map', minLevel: 100, requires: ['quest:gurranq:deathroot'], grants: ['quest:gurranq:concluded'], lockouts: [] },
    ],
  },
  {
    id: 'latenna',
    kind: 'story',
    name: 'Latenna the Albinauric',
    aliases: ['latenna', 'latenna the albinauric', 'albinauric woman', 'apostate derelict'],
    lockedIf: () => null,
    steps: [
      { id: 'la1', do: 'Meet Latenna at the Slumbering Wolf’s Shack', detail: 'Liurnia, south-west past the gate town. She is the last of the Albinaurics and gives you the Haligtree Secret Medallion (Right).', factId: 'quest:latenna:met', module: 'map', minLevel: 40, requires: [], grants: ['quest:latenna:met', 'item:haligtree-secret-medallion'], lockouts: [] },
      { id: 'la2', do: 'Take Castle Sol for the medallion’s other half', detail: 'Commander Niall holds the (Left) half. Both halves open the Grand Lift of Rold’s hidden path to the Consecrated Snowfield.', factId: 'boss:commander-niall', module: 'map', minLevel: 110, requires: ['quest:latenna:met'], grants: ['boss:commander-niall'], lockouts: [] },
      { id: 'la3', do: 'Summon Latenna at the Apostate Derelict', detail: 'In the Consecrated Snowfield. She reunites with her wolf Lobo; her spirit ash is complete and she can be summoned anywhere.', factId: 'quest:latenna:concluded', module: 'map', minLevel: 110, requires: ['quest:latenna:met', 'item:haligtree-secret-medallion'], grants: ['quest:latenna:concluded'], lockouts: [] },
    ],
  },
  {
    id: 'freyja',
    kind: 'story',
    name: 'Redmane Freyja',
    aliases: ['freyja', 'redmane freyja'],
    lockedIf: (c) => (!knownSet(c).has('region:shadow') ? 'You have not entered the Realm of Shadow yet. Need Mohg + the withered arm.' : null),
    steps: [
      { id: 'fr1', do: 'Meet Freyja at the Three-Path Cross', detail: 'Gravesite Plain, near the first Miquella’s Cross. She is searching for the meaning of her Redmane oath.', factId: 'quest:freyja:met', module: 'map', requires: [], grants: ['quest:freyja:met'], lockouts: [] },
      { id: 'fr2', do: 'Find her in the Shadow Keep Specimen Storehouse', detail: 'She studies the jars and asks you to keep her counsel. Do not attack her; the Keep invitations decide who lives.', factId: 'quest:freyja:keep', module: 'map', minLevel: 150, requires: ['quest:freyja:met'], grants: ['quest:freyja:keep'], lockouts: ['quest:leda:invitations-locked'], lockout: 'The Sealing Tree closes the invitation window and freezes alliances.' },
      { id: 'fr3', do: 'Carry her alliance into Enir-Ilim', detail: 'She can be summoned for the Leda fights. Siding against Leda keeps her; siding with Leda forecloses her.', factId: 'quest:freyja:concluded', module: 'map', minLevel: 170, requires: ['quest:freyja:keep'], grants: ['quest:freyja:concluded'], lockouts: ['quest:leda:invitations-locked'] },
    ],
  },
  {
    id: 'igon',
    kind: 'story',
    name: 'Igon',
    aliases: ['igon', 'dragon hunter igon', 'jagged peak'],
    lockedIf: (c) => (!knownSet(c).has('region:shadow') ? 'You have not entered the Realm of Shadow yet. Need Mohg + the withered arm.' : null),
    steps: [
      { id: 'ig1', do: 'Find Igon on the path up the Jagged Peak', detail: 'He is crawling toward Bayle the Dread, obsessed with revenge. Talk to him twice as you climb.', factId: 'quest:igon:met', module: 'map', requires: [], grants: ['quest:igon:met'], lockouts: [] },
      { id: 'ig2', do: 'Meet him again at the peak’s edge', detail: 'He is spent but still points you at Bayle. His summon sign appears at the boss gate.', factId: 'quest:igon:peak', module: 'map', minLevel: 150, requires: ['quest:igon:met'], grants: ['quest:igon:peak'], lockouts: ['boss:bayle'], lockout: 'Bayle must be alive for the summon and the payoff.' },
      { id: 'ig3', do: 'Summon Igon and kill Bayle the Dread', detail: 'His summon survives the fight. His quest closes with Igon’s Harpoon and the Dragon Hunter’s Great Katana world drop nearby.', factId: 'boss:bayle', module: 'map', minLevel: 160, obtain: 'Igon’s Harpoon', requires: ['quest:igon:peak'], grants: ['boss:bayle', 'quest:igon:concluded'], lockouts: [] },
    ],
  },
  {
    id: 'thiollier',
    kind: 'story',
    name: 'Thiollier & St. Trina',
    aliases: ['thiollier', 'st trina', 'st. trina', 'saint trina', 'nectar'],
    lockedIf: (c) => (!knownSet(c).has('region:shadow') ? 'You have not entered the Realm of Shadow yet. Need Mohg + the withered arm.' : null),
    steps: [
      { id: 'th1', do: 'Meet Thiollier at the Three-Path Cross', detail: 'He seeks St. Trina and offers his concoctions. He moves to the Church of Consolation on the Gravesite Plain.', factId: 'quest:thiollier:met', module: 'map', requires: [], grants: ['quest:thiollier:met'], lockouts: [] },
      { id: 'th2', do: 'Find St. Trina’s Nectar in the Stone Coffin Fissure', detail: 'Give it to Thiollier and he asks you to seek her. The nectar can also be drunk at the Garden of Deep Purple.', factId: 'quest:thiollier:nectar', module: 'map', minLevel: 150, requires: ['quest:thiollier:met'], grants: ['quest:thiollier:nectar'], lockouts: [] },
      { id: 'th3', do: 'Hear St. Trina at the Garden of Deep Purple', detail: 'Drink the nectar repeatedly to reach her voice. This is the St. Trina thread and explains Miquella’s fate.', factId: 'quest:thiollier:sttrina', module: 'quests', minLevel: 160, requires: ['quest:thiollier:nectar'], grants: ['quest:thiollier:sttrina'], lockouts: [] },
      { id: 'th4', do: 'Choose Thiollier’s side at Enir-Ilim', detail: 'He can be summoned against Leda if you kept him. Attacking him forecloses his gear.', factId: 'quest:thiollier:concluded', module: 'map', minLevel: 170, requires: ['quest:thiollier:sttrina'], grants: ['quest:thiollier:concluded'], lockouts: ['quest:leda:invitations-locked'] },
    ],
  },
  {
    id: 'ansbach',
    kind: 'story',
    name: 'Sir Ansbach',
    aliases: ['ansbach', 'sir ansbach', 'pureblood knight ansbach'],
    lockedIf: (c) => (!knownSet(c).has('region:shadow') ? 'You have not entered the Realm of Shadow yet. Need Mohg + the withered arm.' : null),
    steps: [
      { id: 'an1', do: 'Free and meet Ansbach in the Shadow Keep', detail: 'He is imprisoned in the Specimen Storehouse. He once served Mohg and knows Miquella’s charm.', factId: 'quest:ansbach:met', module: 'map', requires: [], grants: ['quest:ansbach:met'], lockouts: [] },
      { id: 'an2', do: 'Learn what Miquella did to Mohg', detail: 'Talk him through the charm and the withered arm. This unlocks the Leda alliance choice at the Sealing Tree.', factId: 'quest:ansbach:mohg', module: 'quests', minLevel: 150, requires: ['quest:ansbach:met'], grants: ['quest:ansbach:mohg'], lockouts: ['quest:leda:invitations-locked'], lockout: 'The Sealing Tree is the last window to pick a side.' },
      { id: 'an3', do: 'Side with Ansbach at Enir-Ilim', detail: 'He can be summoned for the Leda fight and the Consort. Killing him loses his set and the summon.', factId: 'quest:ansbach:concluded', module: 'map', minLevel: 170, requires: ['quest:ansbach:mohg'], grants: ['quest:ansbach:concluded'], lockouts: ['quest:leda:invitations-locked'] },
    ],
  },
  {
    id: 'ymir',
    kind: 'story',
    name: 'Count Ymir, Mother of Fingers',
    aliases: ['ymir', 'count ymir', 'finger ruins', 'metyr', 'jolan', 'mother of fingers'],
    lockedIf: (c) => (!knownSet(c).has('region:shadow') && !knownSet(c).has('item:shadow-realm-blessing') ? 'You have not entered the Realm of Shadow yet. Need Mohg + the withered arm.' : null),
    steps: [
      { id: 'ym1', do: 'Meet Count Ymir at the Cathedral of Manus Metyr', detail: 'On the Gravesite Plain. He asks you to ring the bells at the Finger Ruins.', factId: 'quest:ymir:met', module: 'map', requires: [], grants: ['quest:ymir:met'], lockouts: [] },
      { id: 'ym2', do: 'Ring the bell at the Finger Ruins of Rhia', detail: 'South of the cathedral, past the fissure. Report back to Ymir.', factId: 'quest:ymir:rhia', module: 'map', minLevel: 130, requires: ['quest:ymir:met'], grants: ['quest:ymir:rhia'], lockouts: [] },
      { id: 'ym3', do: 'Ring the bell at the Finger Ruins of Dheo', detail: 'North of the cathedral, on the Scadu Altus plateau. Report back again.', factId: 'quest:ymir:dheo', module: 'map', minLevel: 140, requires: ['quest:ymir:rhia'], grants: ['quest:ymir:dheo'], lockouts: [] },
      { id: 'ym4', do: 'Meet Jolan, Swordhand of Night', detail: 'Ymir’s follower watches the cathedral. Her line runs alongside the Count’s.', factId: 'quest:jolan:met', module: 'map', minLevel: 130, requires: ['quest:ymir:met'], grants: ['quest:jolan:met'], lockouts: [] },
      { id: 'ym5', do: 'Descend beneath the cathedral and defeat Metyr', detail: 'With both bells rung, the hidden stair opens. Metyr, Mother of Fingers, is the Greater Will’s envoy.', factId: 'boss:metyr', module: 'map', minLevel: 150, requires: ['quest:ymir:dheo'], grants: ['boss:metyr'], lockouts: [] },
      { id: 'ym6', do: 'Claim the Iris of Grace', detail: 'Ymir’s reward for the bells. It decides the ending of his line.', factId: 'item:iris-of-grace', module: 'codex', minLevel: 150, requires: ['boss:metyr'], grants: ['item:iris-of-grace'], lockouts: [] },
      { id: 'ym7', do: 'Claim the Iris of Occultation', detail: 'The other Iris, for the fork Jolan offers at the altar.', factId: 'item:iris-of-occultation', module: 'codex', minLevel: 150, requires: ['boss:metyr'], grants: ['item:iris-of-occultation'], lockouts: [] },
      { id: 'ym8', do: 'Choose whose age to begin', detail: 'Use one Iris at the altar to close Ymir’s line and settle what Jolan becomes.', factId: 'quest:ymir:concluded', module: 'map', minLevel: 150, requires: ['boss:metyr'], grants: ['quest:ymir:concluded'], lockouts: [] },
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

/**
 * Companion-NPC mention -> line id, for routing "what does Ranni want next"
 * style questions. `findLine` already catches many of these through line aliases,
 * but a bare first name is ambiguous ("ranni" is also an item, "azur" is a
 * spell) and some NPCs share no alias with their line. This index is checked
 * only when the question reads like a quest-intent question, so a location
 * lookup for an item named after an NPC still wins.
 */
export const npcLines: { alias: string; line: string }[] = [
  { alias: 'ranni', line: 'stars' },
  { alias: 'seluvis', line: 'seluvis' },
  { alias: 'alexander', line: 'alexander' },
  { alias: 'nepheli', line: 'nepheli' },
  { alias: 'kenneth', line: 'kenneth' },
  { alias: 'boc', line: 'boc' },
  { alias: 'seamster', line: 'boc' },
  { alias: 'millicent', line: 'millicent' },
  { alias: 'dung eater', line: 'dung-eater' },
  { alias: 'defiler', line: 'dung-eater' },
  { alias: 'fia', line: 'fia' },
  { alias: 'deathbed', line: 'fia' },
  { alias: 'rogier', line: 'rogier' },
  { alias: 'rya', line: 'rya' },
  { alias: 'zorayas', line: 'rya' },
  { alias: 'tanith', line: 'tanith' },
  { alias: 'hyetta', line: 'hyetta' },
  { alias: 'yura', line: 'yura' },
  { alias: 'gowry', line: 'gowry' },
  { alias: 'gurranq', line: 'gurranq' },
  { alias: 'deathroot', line: 'gurranq' },
  { alias: 'd hunter', line: 'd-hunter' },
  { alias: 'hunter of the dead', line: 'd-hunter' },
  { alias: 'corhyn', line: 'corhyn' },
  { alias: 'goldmask', line: 'corhyn' },
  { alias: 'thops', line: 'thops' },
  { alias: 'irina', line: 'irina' },
  { alias: 'edgar', line: 'irina' },
  { alias: 'latenna', line: 'latenna' },
  { alias: 'freyja', line: 'freyja' },
  { alias: 'igon', line: 'igon' },
  { alias: 'thiollier', line: 'thiollier' },
  { alias: 'st trina', line: 'thiollier' },
  { alias: 'st. trina', line: 'thiollier' },
  { alias: 'saint trina', line: 'thiollier' },
  { alias: 'ansbach', line: 'ansbach' },
  { alias: 'varre', line: 'varre' },
  { alias: 'leda', line: 'leda' },
  { alias: 'sellen', line: 'sellen' },
  { alias: 'ymir', line: 'ymir' },
  { alias: 'jolan', line: 'ymir' },
]

/** The line a companion NPC name refers to, if any. */
export function findNpcLine(text: string): Line | undefined {
  const n = text.toLowerCase()
  for (const { alias, line } of npcLines) {
    const re = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`)
    if (re.test(n)) return allLines.find((l) => l.id === line)
  }
  return undefined
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
    // Task 52: the survey consults world-state gates too, so callers can warn
    // before a line's next beat walks into a point of no return.
    gates: { approaching: approachingGates(character), fired: triggeredGates(character) },
  }
}
