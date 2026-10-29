# ASHDOM for Foundry Virtual Tabletop

ASHDOM is the official Foundry Virtual Tabletop implementation of the ASHDOM tabletop roleplaying game.

> This system is currently under development. Back up important Worlds before installing development releases.

## Foundry Compatibility

- Minimum Foundry VTT version: 13
- Verified Foundry VTT version: 14

## Current Features

- ASHDOM Character Sheet
- NPC Sheet
- Vehicles Sheet
- Primary and Secondary Statistics
- Automatic Skill calculations
- Tagged Skills
- Weapon attacks
  - Single Attacks
  - Targeted Attacks
  - Burst Attacks
- Armor and vehicle tracking
- Inventory and Carry Weight
- Perks, Traits, Effects, and Languages
- Roll notes and customized chat cards
- Optional variant rules
  - Critical Shenanigans
  - FORMULA Base Limits
  - FORMULA Skill Equations
  - Psychic Anomalies
  - D100 Variant Rule
  - Expanded Crippled Status
- Item and Perk Compendium
- Bestiary Compendium

- Loot Generator
- Encounter Generator
- Shop Generator

## Installation

### Foundry Package Browser

Once officially listed, ASHDOM can be installed from Foundry VTT's Game Systems browser.

1. Open the Foundry VTT Setup screen.
2. Select **Game Systems**.
3. Select **Install System**.
4. Search for **ASHDOM**.
5. Select **Install**.

### Manifest Installation

ASHDOM can also be installed using this manifest URL:

```text
https://raw.githubusercontent.com/Skyeris/ashdom-foundry/main/system.json
```

### Sheet convenience tools

- Effects Tracker supports remaining rounds or in-game minutes. Active round timers advance with combat rounds for participating actors; minute timers advance with world time. A connected GM processes timers. Expiration shows a reminder and leaves the effect for review. Set a new positive duration to restart it; choose No timer to stop tracking.
- Expanded and collapsed skill, equipment, inventory and Group Rules sections are remembered per player, world and actor in the current browser.
- Undo resource change restores the most recent HP, ammo, charge, quantity, armor damage or vehicle fuel adjustment. Reload undo restores both loaded and inventory ammunition. Later row changes can make an old undo unavailable. This does not undo chat messages or attack rolls.

- Character and NPC inventory search combines name/category/notes text with ammunition, consumable, equipped, and rarity filters. Filtering never deletes items. New drops retain rarity; older rows use their source item when available.
- Pin skills, weapons and perks using the thumbtack beside their name. Pinned actions appear near the top of the sheet: skill roll, weapon attack selection (Single, Targeted or Burst), or perk display. Pins are personal to the player, world and actor in the current browser. Use the highlighted pin to remove one.

Pinned Actions is optional and starts off. Enable it in Settings above Critical Chance. Disabling it hides the tools and preserves all saved pins for the next time it is enabled.

### Containers, transfers, and resource history

- Enter a container name beneath an inventory item, such as Backpack or Medical Pouch. Matching names group items together and show their combined weight. Blank names use Unassigned. This organizes existing weight; it does not add container capacity rules or extra weight.
- Transfer opens a destination and quantity prompt. You must own both actors. Equipped items must be unequipped first. Transfers support Character, NPC and Vehicle inventories and preserve notes and stored equipment details. Transferred items arrive Unassigned. Transfers clear one-actor undo to avoid duplicating items; transfer back to reverse one.
- Settings shows the latest 50 resource adjustments, undo actions and transfers, starting with this update. Vehicles have a collapsible Settings area. History is shared with the actor's viewers.

Undo Change is located inside Resource History under Settings on Character, NPC and Vehicle sheets.

### Token resource bars and AP tracker

Tokens display HP (green), DR (gray), and AP (blue), stacked in that order, for the GM and actor owner. These replace the two standard resource bars visually. HP and DR mirror sheet values; Character DR uses the first equipped armor set, NPC DR uses its armor values including Group adjustments. The DR bar is hidden when both current and maximum DR are zero, including vehicles without a DR resource.

Select exactly one owned token to show the floating AP tracker near the bottom of the screen. Use −1, +1, or Reset; automatic attack/reload spending is controlled by Automatic AP in actor Settings. AP starts at the sheet's calculated maximum and is saved with the actor. The active GM resets AP at the start of each combat turn. Linked tokens share their actor's AP; unlinked tokens keep their individual actor resources. AP adjustments appear in Resource History and can be undone.

### Damage and healing

The selected-token tracker has an amount field and Damage/Heal buttons for direct HP adjustment. These bypass defenses and support Resource History and Undo Change.

New Single, Targeted and Burst weapon attack messages include Apply Damage controls. Target exactly one token (or select one if no tokens are targeted), then apply only confirmed hits. Burst uses one Apply Damage button with a Hits landed count, applying DT separately to each selected hit. The preview shows the target, DT calculation, and resulting DR/HP. DT reductions lower matching DT to a minimum of zero; remaining damage drains DR before HP. Poison and True damage go directly to HP. Fully blocked damage costs no DR or HP. The GM or target owner must apply damage. Special status effects, extra critical damage, and hit confirmation remain manual. Existing chat messages lack the new attack data and need a new roll.

Automatic AP is enabled by default for Character and NPC actors. It spends the weapon's S, T, B, or Reload AP cost when an action completes. Insufficient AP blocks the action without spending ammunition. Turn off the setting for manual tracking. AP and ammunition changes are recorded together and can be undone together.

Burst Apply Damage tracks how many hits from that message have already been applied to each actor. The hit-count field is limited to remaining hits; Misc. is extra damage per selected hit. A single Undo Change restores the entire applied batch.

Cooked Food uses total carried weight: each Use 1 lb consumes one pound. Fractional quantities represent partially eaten items while unit weight stays unchanged; less than one pound cannot supply another full use. Other consumables still spend one item.

### Perk charges and optional delayed damage
- Character and NPC Perk Charges support formulas such as `ceil(FRT / 2)`, using current FORMULA totals. Remaining charges are preserved when the maximum changes. Leave Formula blank for a manual maximum.
- Opening the sheet imports recognizable charge descriptions from its perks. Complex descriptions create review trackers; enter the appropriate formula manually. Edited custom formulas are preserved. Deleted trackers are not recreated unless the source description changes.
- Settings → Roll attack before damage is off by default. When enabled, Single, Targeted, and Burst attacks show AC reduction and notes first. The author or GM can press Roll Damage to reveal damage, DT reduction, and Apply Damage on the same chat card. AP and ammunition are spent only on the original attack.

Character recovery: Break restores HP by FRT + ceil(Level / 2), capped at maximum. R&R restores HP, equipped armor DR, and R&R-enabled charge trackers. Both support Resource History and Undo Change. Equipped armor DR appears beneath HP and saves directly to that armor; unequipping hides the row without changing its value. Flat charges: leave Formula blank and enter Max manually.

Each charge tracker has separate R&R and Break reset checkboxes in its collapsed settings. Checked trackers refill to their current maximum on that rest. Both may be checked; neither means manual recovery. Both default off, including existing trackers.

NPC Break restores FRT + a DEFCON bonus: 5< +2, 5- +3, 5> +4, 4< +6, 4- +7, 4> +8, 3 +12, 2 +16, 1 +17. Uses displayed tier (including Groups) and caps HP at maximum. Character Break remains FRT + ceil(Level/2). Break restores only Break-enabled charges; R&R restores HP, current armor DR, and R&R-enabled charges. Neither selected means manual charge recovery.

Character HP Progression (Settings): Level 1 uses 15 + Base MGT + 2 × Base FRT + level modifier + checked perk bonus. Later levels use previous total + manually entered HP Per Level + level modifier + checked perk bonus. Perk names are editable. Highest active level sets maximum HP; current HP is not refilled. Existing maximum HP is preserved using an initial Level 1 modifier, and stored higher-level entries remain when Level is reduced. Settings sections collapse and remember their state. Resource History is beneath Variant Rules.


### Saved generators, bulk trading, and sheet tools
- Each generator has Saved Results controls: Save, Open, Save Copy, Rename, and Delete. Saves are world-specific. Shop Refresh Stock rerolls stock using the current generator settings and replaces the saved stock. Save results before sharing a trading link.
- The active GM can select a saved shop and choose Share Trading Link. Players open the chat link and select an owned Character or NPC, Buy or Sell, a currency entry, a percentage adjustment, and quantities across multiple rows. Prices use the selected currency directly; no currency conversion is assumed. Selling adjustments add percentage points: Pristine starts at 50% (a +10% adjustment gives 60%), Broken at 10%. Selling caps are 200% for Pristine and 100% for Broken. Buying starts at 100% for Pristine, 50% for Broken, or 25% for schematics, and cannot exceed those rates. All rates have a 10% minimum. The cart and approval view show each effective rate; schematic base values refer to the full Pristine item value. Unknown sale values can be entered for GM review.
- A private cart request goes to the requester and GMs. The active GM reviews the entire cart and approves or rejects it. No items or money move before approval. Approval rechecks ownership, stock, inventory and funds. Equipped equipment must be unequipped before sale. Stock changes invalidate old carts. Approved trades are recorded in Resource History; reverse trades through a new approved transaction rather than Undo Change. Shops do not track a merchant cash balance.
- Container headers display current weight and an optional capacity. Set capacity inside the container; blank means unlimited. Overloaded containers are highlighted without blocking transfers.
- Settings → Alerts & Reminders controls low-HP percentage, low-ammunition threshold, empty-charge warnings, carry-weight warnings, and status reminders. Conditions are shown before weapon attacks and at the start of an owned actor’s turn. Rules and penalties remain manual.
- Advancement History appears immediately below Resource History in Settings. It retains the latest 100 changes to Level, Base FORMULA, skill investment, perks, and HP progression, separate from routine resource spending.
- Expanded weapon details include Configuration. Edit the weapon's values and notes, then Save Current under a name. Select a saved configuration to use it. Previous active configuration edits are retained on switching. This supports melee and unarmed moves, with the selected name shown on attack cards. Switching preserves loaded ammunition and equipped state; unload before changing ammo type.
- No Party Overview or Equipment Sets were added in this update.

- Loot and ordinary shop draws have a 5% chance to produce a named schematic instead of the selected item. Each schematic draw yields one plan. Schematic Dealer stocks only plans, respecting rarity and excluded item types. Enabled custom generator items are eligible too. Plans drag into inventory as Misc / Schematics, not functional equipment. Their full source value is retained for the 25% schematic buying rate.

- Schematic weight uses Paper (Sheet) at 0.01 lb: Common 5 sheets / 0.05 lb, Uncommon 10 / 0.10 lb, Rare 15 / 0.15 lb, Radical 20 / 0.20 lb, Atomic 25 / 0.25 lb per plan.

- Resource History provides Undo Change and Redo Change for up to five recent resource adjustments, one step at a time, on Character, NPC, and Vehicle sheets. New adjustments clear Redo; transfers and collection changes clear saved undo/redo steps. Combined resource costs and chat damage are restored together, including damage application markers. The visible history remains limited to 50 entries.

- NPC reloads use unlimited reserve ammunition, filling the weapon without consuming or requiring inventory ammo. Reload AP is still spent when Automatic AP is enabled. Character reloads continue to use matching inventory ammunition.

- Perks have Radius (ft) on Character/NPC sheets and perk item editors. Positive values draw a private gold ring from the center of an owned, selected token; zero disables it. No bonuses are applied automatically. Weapon Notes are beside the Skill dropdown and are saved with attack configurations.

- Perk Radius controls are collapsible. Use PL takes the actor’s total PL as feet and updates automatically. Turning it off restores the saved manual distance.

### Validation, crew, merchant preferences, and loot distribution

- Sheet Validation under Settings provides warnings and links for missing weapon skills, charge formulas, recipe requirements, and crew issues.
- Vehicle Crew tracks drivers, gunners, passengers, and editable seating costs, with actor shortcuts and capacity warnings.
- Saved shops offer Merchant Settings for optional coin budgets and accepted item types, including Broken-item preferences. Approved trades adjust funds; restocking preserves them.
- Expanded inventory and cargo rows offer Split. The Loot Generator offers Divide Loot with editable even shares and a confirmation preview.

### Bundled journal help

ASHDOM Module Documents contains the Module Guide, Check Examples & Critical Tables, and Variant Rules (20 pages). Small book buttons open the appropriate guide page and heading without importing journals. The GM can right-click a book to override its destination or choose Use Bundled Guide to restore the default. The compendium is readable by players.

### Hope Points

Character sheets show current / maximum Hope Points. The maximum is 3 + one at each fifth level (5, 10, 15, ...), plus the signed adjustment under Settings → Hope Points, below HP Progression. Changing the maximum preserves current points. Alerts & Reminders and Supplements appear above Variant Rules. Critical Chance settings now explain their distinct behavior and link to Critical Chance in Sheet Tools & Settings, above Custom Skills.
