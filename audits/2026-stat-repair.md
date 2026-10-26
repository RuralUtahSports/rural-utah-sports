# 2026 player statistics repair: evidence and limitations

Generated: 2026-10-26T19:47:19.901Z

## Scope and root causes

Reviewed issues [#142](https://github.com/RuralUtahSports/rural-utah-sports/issues/142) and [#143](https://github.com/RuralUtahSports/rural-utah-sports/issues/143). Fresh Deseret News and MaxPreps requests were blocked by proxy CONNECT 403; all numerical repairs are supported by the saved source snapshots and their unique per-game rows, not a fresh independent verification.

- Team/game presence was incorrectly treated as complete player/category/field reporting, allowing partial sums to replace fuller totals. The old defensive-only floor did not protect offensive or kicking data.
- Blank strings converted to zero; repeated player/category cells could be added twice; contradictory cells now remain flagged as unknown rather than being added.
- Identity matching missed the documented Gordon/Gordan alias and could accept surname/jersey guesses. Stable roster IDs and original names are preserved; ambiguous people are not merged.
- Imports could write failed output before their health threshold, drop a successfully fetched component when another failed, or rebuild the MaxPreps game cache from only successful players.
- Game recovery required a separate scored schedule even when cached MaxPreps rows supplied consistent final scores/results. This caused the 15 missing matchups.
- Record merging omitted combined defensive and kicking categories; it also used a school schedule URL as a game citation and could compute total offense from an unknown component.
- Award metadata misassigned Grand, Layton Christian and Enterprise; cumulative special-team supplements lacked a certified regular-season cutoff.

## Original 280 flags

{"no-longer-below-original-game-sum":219,"still-needs-review":61}

The evidence JSON lists every original flag with the retained/corrected field and source evidence. “No longer below” is a numeric comparison, not independent certification. New game coverage adds further comparisons: 516 current game-sum flags remain, plus 6 conflicting game cells. Do not interpret increased audit coverage as a successful resolution of all discrepancies.

## Priority players

| Player | Current reported values | Evidence / limitation |
| --- | --- | --- |
| Ian Mair — SOUTH SUMMIT | Rushing: {"CARRIES":"14","YARDS":"153","YARDS/CARRY":"10.93","TD":"3"}; Passing: {"COMP-ATT":"101-195","COMP%":"51.79","YARDS":"1397","YARDS/COMP.":"13.83","TD":"16","Int":"2"} | Repaired cells carry source-season/per-game corroboration in statEvidence. Cached evidence is not fresh independent verification. Source: https://www.maxpreps.com/ut/kamas/south-summit-wildcats/football/stats/ (updated 2026-10-19T13:24:34). |
| Brody Larsen — SOUTH SUMMIT | Rushing: {"CARRIES":"158","YARDS":"1251","YARDS/CARRY":"7.92","TD":"14"}; Receiving: {"RECEPTIONS":"17","YARDS":"203","YARDS/RECEP.":"11.94","TD":"3"} | Repaired cells carry source-season/per-game corroboration in statEvidence. Cached evidence is not fresh independent verification. Source: https://www.maxpreps.com/ut/kamas/south-summit-wildcats/football/stats/ (updated 2026-10-19T13:24:34). |
| Corbin Black — GRAND | Rushing: {"CARRIES":"28","YARDS":"221","YARDS/CARRY":"7.89"}; Passing: {"COMP-ATT":"71-127","COMP%":"55.91","YARDS":"1556","YARDS/COMP.":"21.92","TD":"20","Int":"5"}; Receiving: {"RECEPTIONS":"1","YARDS":"6","YARDS/RECEP.":"6"} | Repaired cells carry source-season/per-game corroboration in statEvidence. Cached evidence is not fresh independent verification. Source: https://www.maxpreps.com/ut/moab/grand-county-red-devils/football/stats/ (updated 2026-10-18T17:48:09). |
| Beto Carroll — GRAND | Rushing: {"CARRIES":"2","YARDS":"5","YARDS/CARRY":"2.5"}; Receiving: {"RECEPTIONS":"32","YARDS":"1060","YARDS/RECEP.":"33.13","TD":"16"} | Repaired cells carry source-season/per-game corroboration in statEvidence. Cached evidence is not fresh independent verification. Source: https://www.maxpreps.com/ut/moab/grand-county-red-devils/football/stats/ (updated 2026-10-18T17:48:09). |
| Colton Johns — LAYTON CHRISTIAN | Rushing: {"CARRIES":"11","YARDS":"22","YARDS/CARRY":"2","TD":"0"}; Passing: {"COMP-ATT":"112-196","COMP%":"57.14","YARDS":"1967","YARDS/COMP.":"17.56","TD":"27","Int":"5"} | Repaired cells carry source-season/per-game corroboration in statEvidence. Cached evidence is not fresh independent verification. Source: https://www.maxpreps.com/ut/layton/layton-christian-academy-eagles/football/stats/ (updated 2026-10-26T09:04:13). |
| Cache Young — MONTICELLO | Rushing: {"CARRIES":"37","YARDS":"119","TD":"2","YARDS/CARRY":"3.22"}; Passing: {"TD":"40","YARDS":"2230","Int":"7","COMP-ATT":"122-219","COMP%":"55.71","YARDS/COMP.":"18.28"}; Receiving: {"TD":"0","YARDS/RECEP.":""} | Repaired cells carry source-season/per-game corroboration in statEvidence. Cached evidence is not fresh independent verification. Source: https://www.maxpreps.com/ut/monticello/monticello-buckaroo/football/stats/ (updated 2026-10-19T09:35:54). |
| Alma Barlow — WATER CANYON | Rushing: {"CARRIES":"187","YARDS":"2424","TD":"27","YARDS/CARRY":"12.96"}; Receiving: {"RECEPTIONS":"16","YARDS":"118","YARDS/RECEP.":"7.38","TD":"1"} | Rushing TD remains 27: configured conditional exact 9 conflicts with a minimum 27 and cached MaxPreps 33. Preserve value pending fresh verification. Source: https://www.maxpreps.com/ut/hildale/water-canyon-wildcats/football/stats/ (updated 2026-10-15T15:28:30). |
| DaShawn Gordan — BEN LOMOND | Rushing: {"CARRIES":"10","YARDS":"26","YARDS/CARRY":"2.6","TD":"6"}; Receiving: {"RECEPTIONS":"1","YARDS":"6","YARDS/RECEP.":"6","TD":"0"} | Alias to Dashawn Gordon documented in issue #143. Source game cache has no rows for this identity, so cached cumulative 875 rushing yards is not independently corroborated; retained primary 26. Oct 23 issue cited 762; reporting dates and playoff scope differ. Source: https://www.maxpreps.com/ut/ogden/ben-lomond-scots/football/stats/ (updated 2026-10-26T07:15:15). |

## Missing coverage

- **MONUMENT VAL**: Saved Deseret responses parsed no roster/stat rows; MaxPreps discovery unavailable. This does not prove coaches reported nothing.
- **UMA-HILLFIELD**: Deseret fetches failed; MaxPreps discovery unavailable. School slug/alias and source reporting still need live verification. Do not manufacture rows.

All 15 source matchups were recovered (including October 23 playoffs); cached source rows now all match games. Missing player/category reporting remains unknown. Dashawn Gordon’s player-game cache needs a fresh source fetch after alias repair.

## Awards

The original locked snapshot and published/editorial selections are unchanged. A separate candidate-stat overlay includes 909 source-season cells corroborated by unique source game cells through **October 16, 2026**. Full-season and postseason data do not automatically flow into it. Incomplete coverage badges remain explicit. Undated cumulative punting/return supplements are excluded from award scoring; rostered candidates remain available for editorial review. Alma Barlow’s conflicting manual TD rules are blocked from overwriting the existing value pending source review.

## Validation and delivery

See `audits/2026-stat-repair-validation.md` for commands, actual outcomes, visual checks, and delivery blockers. No merge or deployment was performed.
