# PHOTO-EVAL — PS5 photo reader (fixture set)

Generated 2026-10-08T13:31:12.007Z by `npm run eval:photos`.

| screen | photos | correct | wrong | missed | field accuracy | total ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| status | 1 | 21 | 0 | 0 | 100% | 5121 |
| equipment | 1 | 14 | 0 | 0 | 100% | 25174 |
| inventory | 6 | 22 | 6 | 1 | 76% | 201361 |
| equipment-picker | 1 | 1 | 1 | 1 | 33% | 33848 |
| item-crafting | 1 | 3 | 0 | 0 | 100% | 27547 |
| world-map | 3 | 31 | 0 | 0 | 100% | 43699 |
| **all** | 13 | 92 | 7 | 2 | **91%** | 336750 |

## Per photo / per field

### status-photo-01.jpg — status (5121 ms)

detail: `{"level":87,"stats":{"vigor":64,"mind":14,"endurance":27,"strength":21,"dexterity":23,"intelligence":9,"faith":15,"arcane":13},"base":{"vigor":59,"mind":14,"endurance":22,"strength":16,"dexterity":18,"intelligence":9,"faith":15,"arcane":13}}`

- **name**: correct — expected "UrMumMyToilet", got "UrMumMyToilet"
- **level**: correct — expected 87, got 87
- **runesHeld**: correct — expected 45381, got 45381
- **runesNeeded**: correct — expected 45723, got 45723
- **vigor**: correct — expected 64, got 64
- **mind**: correct — expected 14, got 14
- **endurance**: correct — expected 27, got 27
- **strength**: correct — expected 21, got 21
- **dexterity**: correct — expected 23, got 23
- **intelligence**: correct — expected 9, got 9
- **faith**: correct — expected 15, got 15
- **arcane**: correct — expected 13, got 13
- **base.vigor**: correct — expected 59, got 59
- **base.mind**: correct — expected 14, got 14
- **base.endurance**: correct — expected 22, got 22
- **base.strength**: correct — expected 16, got 16
- **base.dexterity**: correct — expected 18, got 18
- **base.intelligence**: correct — expected 9, got 9
- **base.faith**: correct — expected 15, got 15
- **base.arcane**: correct — expected 13, got 13
- **talisman**: correct — expected "Radagon's Soreseal", got "Radagon's Soreseal"

### equipment-photo-01.jpg — equipment (25174 ms)

detail: `{"slot":"Right Hand Armament 1","item":"Reed Great Katana","counts":[null,null,null,25,36,null,null,null,70,99,null,null,null,null,null,null,null,null,null,null,10,2,null,1,30,13,null,null,null,null]}`

- **slot**: correct — expected "Right Hand Armament 1", got "Right Hand Armament 1"
- **item**: correct — expected "Reed Great Katana", got "Reed Great Katana"
- **affinity**: correct — expected "Blood", got "Blood"
- **upgrade**: correct — expected 14, got 14
- **weaponType**: correct — expected "Great Katana", got "Great Katana"
- **count.arrows**: correct — expected 25, got 25
- **count.fireArrows**: correct — expected 36, got 36
- **count.bolts1**: correct — expected 70, got 70
- **count.bolts2**: correct — expected 99, got 99
- **count.crimsonFlask**: correct — expected 10, got 10
- **count.ceruleanFlask**: correct — expected 2, got 2
- **count.throwingKnives**: correct — expected 30, got 30
- **count.slot23Count**: correct — expected 1, got 1
- **count.pots**: correct — expected 13, got 13

### inventory-spirit-ashes-01.jpg — inventory (35940 ms)

detail: `{"tab":"Ashes","names":["Putrid Corpse Ashes","Ashes Coil I ow A"],"occupied":19,"counts":[1,null,4,null,null,null,null,null,null,4,null,1,null,2,null,null,null,null,null,null,null,8,null,null,null]}`

- **tab**: correct — expected "Ashes", got "Ashes"
- **selected**: correct — expected "Putrid Corpse Ashes", got "Putrid Corpse Ashes"
- **category**: correct — expected "spirit", got "spirit"
- **iconCells**: wrong — expected 14, got 19

### inventory-bolstering-01.jpg — inventory (32958 ms)

detail: `{"tab":"Bolstering Materials","names":["Grave Glovewort (1)","lstering Material"],"occupied":23,"counts":[null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null]}`

- **tab**: correct — expected "Bolstering Materials", got "Bolstering Materials"
- **selected**: correct — expected "Grave Glovewort [1]", got "Grave Glovewort (1)"
- **category**: correct — expected "material", got "material"
- **held**: correct — expected 1, got 1
- **effect**: missed — expected "Strengthen ashes to +1", got undefined
- **iconCells**: wrong — expected 19, got 23
- **counts**: wrong — expected "3,27,12,7,5,4,1,2,1,8,7,3,5,10,7,7,5,1,1", got "1,2"

### inventory-key-items-01.jpg — inventory (39608 ms)

detail: `{"tab":"Key Items","names":["Holy-Shrouding Cracked Tear"],"occupied":20,"counts":[null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,3,null,4,null,null]}`

- **tab**: correct — expected "Key Items", got "Key Items"
- **selected**: correct — expected "Holy-Shrouding Cracked Tear", got "Holy-Shrouding Cracked Tear"
- **category**: correct — expected "key-item", got "key-item"
- **iconCells**: correct — expected 20, got 20
- **counts**: wrong — expected "14,5,3,2,3,11,2", got "8,3,4"

### inventory-sorceries-01.jpg — inventory (32521 ms)

detail: `{"tab":"Sorceries","names":["Ambush Shard"],"occupied":14,"counts":[null,null,null,5,null,null,4,null,null,null,5,null,null,null,null,null,null,null,null,null,null,null,null,null,null]}`

- **tab**: correct — expected "Sorceries", got "Sorceries"
- **selected**: correct — expected "Ambush Shard", got "Ambush Shard"
- **category**: correct — expected "sorcery", got "sorcery"
- **iconCells**: wrong — expected 15, got 14

### inventory-ashes-of-war-01.jpg — inventory (34073 ms)

detail: `{"tab":"Ashes of War","names":["Ash of War: Spinning Slash"],"occupied":17,"counts":[5,null,null,null,null,4,null,null,null,null,null,null,null,45,7,null,null,null,41,1,null,null,null,null,null]}`

- **tab**: correct — expected "Ashes of War", got "Ashes of War"
- **selected**: correct — expected "Ash of War: Spinning Slash", got "Ash of War: Spinning Slash"
- **category**: correct — expected "ash-of-war", got "ash-of-war"
- **iconCells**: correct — expected 17, got 17

### inventory-tools-01.jpg — inventory (26261 ms)

detail: `{"tab":"Tools","names":["Blue Cipher Ring","Blue £3 Cipher 1 Ring a fre"],"occupied":21,"counts":[null,null,null,null,null,null,null,null,null,null,null,23,2,4,3,1,null,null,null,null,null,null,null,null,null]}`

- **tab**: correct — expected "Tools", got "Tools"
- **selected**: correct — expected "Blue Cipher Ring", got "Blue Cipher Ring"
- **category**: correct — expected "tool", got "tool"
- **iconCells**: correct — expected 21, got 21
- **counts**: wrong — expected "1,1,3,1,4,1,1,1,1,1,1,1,110,8", got "23,2,4,3,1"

### equipment-talisman-list-01.jpg — equipment-picker (33848 ms)

detail: `{"names":["Green Turtle Talisman","Green >A Turtle REO Talisman EOE"],"occupied":20}`

- **selected**: correct — expected "Green Turtle Talisman", got "Green Turtle Talisman"
- **iconCells**: wrong — expected 19, got 20
- **equippedBadges**: missed — expected "3,5,13", got undefined

### crafting-all-items-01.jpg — item-crafting (27547 ms)

detail: `{"tab":"All Items","names":["Preserving Boluses"],"occupied":25}`

- **tab**: correct — expected "All Items", got "All Items"
- **selected**: correct — expected "Preserving Boluses", got "Preserving Boluses"
- **iconCells**: correct — expected 25, got 25

### map-overworld-01.jpg — world-map (13004 ms)

detail: `{"detected":40,"snapped":35,"purity":1,"snapRate":0.875,"graceMs":112,"regions":["Limgrave","Liurnia","Stormveil","Stormhill","Weeping Peninsula","Caelid","Raya Lucaria","Redmane Castle"]}`

- **registration**: correct — expected "inliers≥12 err<6", got "inliers=67 err=2.74"
- **detected**: correct — expected "≥29", got 40
- **graceSnapRate**: correct — expected "≥0.70", got "0.88"
- **gracePurity**: correct — expected "≥0.95", got "1.00"
- **revealed.Limgrave**: correct — expected true, got true
- **revealed.Weeping Peninsula**: correct — expected true, got true
- **revealed.Liurnia**: correct — expected true, got true
- **revealed.Caelid**: correct — expected true, got true
- **revealed.Dragonbarrow**: correct — expected true, got true
- **unrevealed.Altus**: correct — expected false, got false
- **unrevealed.Leyndell**: correct — expected false, got false
- **unrevealed.Mt. Gelmir**: correct — expected false, got false
- **unrevealed.Mountaintops**: correct — expected false, got false

### map-overworld-north-01.jpg — world-map (13804 ms)

detail: `{"detected":54,"snapped":45,"purity":1,"snapRate":0.8333333333333334,"graceMs":98,"regions":["Limgrave","Liurnia","Stormveil","Leyndell","Stormhill","Caelid","Mountaintops","Raya Lucaria","Altus","Forbidden Lands"]}`

- **registration**: correct — expected "inliers≥12 err<6", got "inliers=82 err=2.66"
- **detected**: correct — expected "≥46", got 54
- **graceSnapRate**: correct — expected "≥0.70", got "0.83"
- **gracePurity**: correct — expected "≥0.95", got "1.00"
- **revealed.Liurnia**: correct — expected true, got true
- **revealed.Altus**: correct — expected true, got true
- **revealed.Leyndell**: correct — expected true, got true
- **revealed.Mt. Gelmir**: correct — expected true, got true
- **revealed.Mountaintops**: correct — expected true, got true
- **revealed.Caelid**: correct — expected true, got true
- **revealed.Limgrave**: correct — expected true, got true
- **unrevealed.Consecrated Snowfield**: correct — expected false, got false

### map-underground-01.jpg — world-map (16891 ms)

detail: `{"detected":16,"snapped":12,"purity":1,"snapRate":0.75,"graceMs":65,"regions":["Ainsel"]}`

- **registration**: correct — expected "inliers≥12 err<6", got "inliers=26 err=2.30"
- **detected**: correct — expected "≥12", got 16
- **graceSnapRate**: correct — expected "≥0.70", got "0.75"
- **gracePurity**: correct — expected "≥0.95", got "1.00"
- **revealed.Ainsel River**: correct — expected true, got true
- **revealed.Siofra River**: correct — expected true, got true

