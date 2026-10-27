# Aion 2 worlds, pairing and merges (as of 2026-10-27)

Method: official NC notices read in a browser (Playwright), aion2.exchange `/api/servers`, aion2t.com crafting page selectors, plus web search. Labels: **[official]** read on aion2.plaync.com, **[site]** read from the third-party site, **[secondary]** guide or press, **[unverified]** not confirmed by a primary source.

## Answers

1. **Pairing is real, merging is not.** NC: "each Elyos server is paired with an Asmodian server for a limited time" and "Whenever you enter the Abyss or another cross-faction mode, the players you meet from the other faction will come from your matched server." Pairings "will [be] update[d] periodically to keep the factions balanced." [official] https://aion2.plaync.com/en-us/board/notice/view?articleId=6ac10581a279104f7d9d5f4c (2026-10-04, announcement list says it is continuously updated)
2. **No world merge or integration has been announced in any region.** The official EN notice list (checked 2026-10-27) holds no merge notice. Only server transfers exist (see below). Korea: no merge notice found; Korean "서버 매칭" is pairing into 21 groups of 2 (42 servers) [secondary]. Japan: no separate Japan service found, Asia is hosted in Japan [secondary]. Taiwan: not researched beyond the aion2t region list [unverified]. Absence of evidence, not proof.
3. **Pair is not a market unit by any primary source.** Nothing official says the market, broker or trade crosses the pair. Global market is server-scoped and the cross-server market is not live [secondary, unverified by NC]. Dungeons are cross-server [secondary, aion2game.com].
4. **aion2.exchange and aion2t.com model each world as its own server id and know nothing of pairs or merges** (details below).

## Pair semantics for the selector

- A "pair" is a matchmaking link (Abyss, Spacetime Rifts, cross-faction modes). Official source above.
- Pairs are temporary and rotate. The notice has a "Time Updated" column. So never hard-code a pair as identity. Store it as optional, dated metadata, if at all.
- Same-name worlds repeat across regions (Siel exists in all 5). The unique key is the id, not the name. aion2.exchange says so and uses `server_id` (e.g. 11101) with `game_server_key` (1101). [site]
- The pair is by name today: Elyos X vs Asmodian Y, same region. Exchange ids pair as 11xyz <-> 12xyz (same last digits) for all 53 id pairs, but this is a coincidence of id allocation, not NC's pairing rule. Do not derive the pairing from ids. [inferred from the API]

## Official pairings per region [official]
Source for every row in the tables below: https://aion2.plaync.com/en-us/board/notice/view?articleId=6ac10581a279104f7d9d5f4c . Merge status for all rows: none announced as of 2026-10-27.
Pairing is as published on 2026-10-04 and may have rotated since. NC says the list is "continuously updated", and the page was checked 2026-10-27 with the same content. Time-updated cells are launch-open times, not pair changes.

### NA East (NAE). exchange ids 111xx/121xx. 9 pairs in the exchange list
| Elyos | Asmodian | Tier in notice | exchange ids |
|---|---|---|---|
| Siel | Israphel | Advanced Access | 11101 / 12101 |
| Nezekan | Zikel | Advanced Access | 11102 / 12102 |
| Vaizel | Triniel | Advanced Access | 11103 / 12103 |
| Kaisinel | Lumiel | Launch | 11104 / 12104 |
| Yustiel | Marchutan | Launch | 11105 / 12105 |
| Ariel | Azphel | Launch | 11106 / 12106 |
| Fregion | Ereshkigal | Launch | 11107 / 12107 |
| Meslamtaeda | Beritra | Launch | 11108 / 12108 |
| Hithanya | Nemon | Launch (opened Oct 9 15:00 PDT) | 11109 / 12109 |

### NA West (NAW). ids 112xx/122xx. 5 pairs
| Elyos | Asmodian | Tier | ids |
|---|---|---|---|
| Siel | Israphel | Advanced Access | 11201 / 12201 |
| Nezekan | Zikel | Advanced Access | 11202 / 12202 |
| Vaizel | Triniel | Launch | 11203 / 12203 |
| Kaisinel | Lumiel | Launch | 11204 / 12204 |
| Yustiel | Marchutan | Launch | 11205 / 12205 |

### Europe (EU). ids 113xx/123xx. 23 pairs
| Elyos | Asmodian | Tier | ids |
|---|---|---|---|
| Siel | Israphel | Advanced Access | 11301 / 12301 |
| Nezekan | Zikel | AA | 11302 / 12302 |
| Vaizel | Triniel | AA | 11303 / 12303 |
| Kaisinel | Lumiel | AA | 11304 / 12304 |
| Yustiel | Marchutan | AA | 11305 / 12305 |
| Ariel | Azphel | AA | 11306 / 12306 |
| Fregion | Ereshkigal | AA | 11307 / 12307 |
| Meslamtaeda | Beritra | AA | 11308 / 12308 |
| Hithanya | Nemon | AA | 11309 / 12309 |
| Nania | Hadala | Launch | 11310 / 12310 |
| Tahavatha | Ludra | Launch | 11311 / 12311 |
| Luteros | Ulgorn | Launch | 11312 / 12312 |
| Phernos | Munin | Launch | 11313 / 12313 |
| Daminu | Odar | Launch | 11314 / 12314 |
| Kasaka | Zemurru | Launch | 11315 / 12315 |
| Bakarma | Kromede | Launch | 11316 / 12316 |
| Tsenka | Quai | Launch | 11317 / 12317 |
| Kochi | Baba | Launch | 11318 / 12318 |
| Ishtar | Fafnir | Launch | 11319 / 12319 |
| Tiamat | Indnath | Launch | 11320 / 12320 |
| Gauss | Agnita | Launch | 11321 / 12321 |
| Lamuatan | Atiel | Launch | 11322 / 12322 |
| Nathara | Tassin | Launch | 11323 / 12323 |

Official EU table: 9 Advanced Access pairs + 14 launch pairs = 23, matching aion2.exchange. Spelling variants: official "Tahavatha", aion2t "Tahabata"; official "Kasaka", aion2t "Kasika". Use the official spelling.

### Latin America (LA). ids 114xx/124xx. 6 pairs
| Elyos | Asmodian | Tier | ids |
|---|---|---|---|
| Siel | Israphel | AA | 11401 / 12401 |
| Nezekan | Zikel | AA | 11402 / 12402 |
| Vaizel | Triniel | Launch | 11403 / 12403 |
| Kaisinel | Lumiel | Launch | 11404 / 12404 |
| Yustiel | Marchutan | Launch | 11405 / 12405 |
| Ariel | Azphel | Launch | 11406 / 12406 |

### Asia (AS, hosted in Japan [secondary]). ids 115xx/125xx. 10 pairs in exchange
| Elyos | Asmodian | Tier | ids |
|---|---|---|---|
| Siel | Israphel | AA | 11501 / 12501 |
| Nezekan | Zikel | AA | 11502 / 12502 |
| Vaizel | Triniel | AA | 11503 / 12503 |
| Kaisinel | Lumiel | Launch | 11504 / 12504 |
| Yustiel | Marchutan | Launch | 11505 / 12505 |
| Ariel | Azphel | Launch | 11506 / 12506 |
| Fregion | Ereshkigal | Launch | 11507 / 12507 |
| Meslamtaeda | Beritra | Launch | 11508 / 12508 |
| "Hitani" (notice spelling; presumably Hithanya, unverified) | Nemon | Launch | 11509 / 12509 |
| Nania | Hadala | **Not in the official 2026-10-04 notice**; present in aion2.exchange [site] and a secondary guide (timesaver.gg, attributes it to Metabot) [unverified by NC] | 11510 / 12510 |

## Server counts and discrepancies
- aion2.exchange: 106 servers = NAE 18, NAW 10, EU 46, LA 12, AS 20 (53 pairs). [site] https://aion2.exchange/api/servers (fetched 2026-10-27, `default` = 11304 Kaisinel EU).
- Secondary guides: 53 pairs / 106 servers as of 2026-10-19 (timesaver.gg, metammo.com, senseos.gg): matches. Others report older counts of 43 and 49 pairs from earlier in October (games.gg, neonsect.com). Those are snapshots before later launches, not merges.
- aion2game.com (https://aion2game.com/release/aion-2-server-list) lists inconsistent data (Kaisinel/Yustiel/Ariel in Asia, Siel and Israphel absent, an NAW Asmodian "Triniel, Lumie, Marchutan"). Treat as unreliable.
- Some guides cite the "Advance Access" worlds as separate. In the notice they are normal worlds in the same list (Advanced Access tier), which live on into launch. Characters on AA are kept, not wiped [secondary: timesaver.gg].

## Transfers (not merges) [official]
- Transfer periods: Early Access servers 2026-10-13/14 to before the 10-20/21 maintenance. Launch servers 10-20/21 to before the 10-27/28 maintenance. Faction cannot change [secondary, aion2game.com/ timesaver.gg]. Q&A: https://aion2.plaync.com/en-us/board/notice/view?articleId=6ac7e128d97eae18cc40e3b7
- 2026-10-27 06:27 notice: transfers were put on hold, are resuming with Europe at 03:00 PDT / 12:00 CET, other regions at their next open period, and the level requirement is now 45. https://aion2.plaync.com/en-us/board/notice/view?articleId=6adfa9906276ae76f3e4a593
- Also listed: "[Notice] Advance Notice of Server Transfer Limits" (2026-10-14) https://aion2.plaync.com/en-us/board/notice/view?articleId=6acf52e3058fb5520d6ffc5a . Not read in full.
- Transfers move characters between worlds with capacity limits. They are a reason world popularity shifts but do not change world ids.
- The "Detailed Server Merge Notice" with Siel and Ascend (merge 2026-09-29) found in search is **AION Classic**, not Aion 2: https://aiononline.plaync.com/en-us/board/classicnotice/view?articleId=6ab2ba015657e135c2f5ee3b . Ignore it.

## Korea (and Taiwan, Japan)
- Korea service uses the same world names in Korean. The 2026-07-22 transfer notice lists 21 Elyos/Asmodian name pairs (시엘 이스라펠, 네자칸 지켈, ..., 티아마트 인드나흐, 포에타 이스할겐) = 42 servers. https://aion2.plaync.com/ko-kr/board/notice/view?articleId=6a6094a094d8116f4fd094f8 [official]. No merge.
- Season 2 (2026-01-21): "42 servers in 21 matching groups", chosen from combat metrics (Abyss kills, combat population, artifact occupation). Grouping, not merging. https://www.gamevu.co.kr/news/articleView.html?idxno=54993 [secondary]
- Korea 통합 거래소 / 월드 거래소 (cross-server market) exists in Korea: https://www.playforum.net/news/articleView.html?idxno=633368 and https://www.inven.co.kr/webzine/news/?news=311613 [secondary]. Its age is stated only as "about 8 months" in a search summary, date [unverified]. It is a cross-server market feature, not a merge.
- No "서버 통합" / "합서" notice found on the official KR notice board (searched 2026-10-27, titles only: transfers, matching, maintenance). A keyword search of the board was not usable.
- Taiwan: aion2t.com has a TW region. No server list obtained, no merge info [unverified]. Japan: no distinct Japan service found [unverified].

## Market / connected-world features for a selector
- Official: the only cross-world link is the Abyss/Spacetime Rift matchmaking pair. https://aion2.plaync.com/en-us/board/notice/view?articleId=6ac10581a279104f7d9d5f4c
- Server Market is per-server on global, cross-server market not live as of mid-October 2026, no date announced, direct player trade disabled: https://games.gg/aion-2/guides/aion-2-market-guide/ and https://bo3.gg/games/articles/aion-2-market-guide-how-trading-and-the-quna-exchange-work (the search summary quoted these; page bodies did not load) [secondary, unverified by NC].
- Dungeons cross-server [secondary]. Guild/open-world progress does not carry across worlds [secondary].
- Recommendation: model world = (region, faction, name, id). Pairs and cross-server markets should be optional later fields. Do not merge price data across a pair on the strength of the pairing alone.

## aion2.exchange and aion2t.com
- aion2.exchange `/api/servers` returns `{default, servers[{server_id, name, game_server_key, region, region_name, faction, has_data}]}`. 106 entries, all `has_data: true`. No pair or merge field, no alias or retired ids. [site] https://aion2.exchange/api/servers
- aion2t.com crafting calculator (https://aion2t.com/crafting): regions TW, KR, NAW, NAE, EU, AS, LA. The EU server dropdown has 46 worlds keyed by game_server_key (1301..1323, 2301..2323), e.g. `1304:Kaisinel`. Pricing toggle Both/Asmodian/Elyos. No pair, merge, or alias handling visible. NA/AS/LA lists were not enumerated. [site]
- Neither site has dropped or aliased an id because no merge has happened. Behavior on a future merge is unknown [unverified].
- Id scheme [site, inferred from API]: `game_server_key` = faction digit (1 Elyos, 2 Asmodian) + region digit (1 NAE, 2 NAW, 3 EU, 4 LA, 5 AS) + 2-digit world index, e.g. 1304 = Kaisinel EU. aion2.exchange `server_id` = "1" + key for Elyos worlds is 11304, and Asmodian 12304 = "1" + 2304. Key worlds by `server_id`, never by name.
