# PROOF OF CONCEPT // CURSE INDEX

## FAT Expansion

**Status:** Implemented
**Date:** 2026-08-20
**Curse Type:** `FAT`
**Seed records:** 140

## Boundary

FAT is not defined only by room-temperature physical state. It is defined by the relevant cocktail-design intervention: the lipid phase. Oils therefore belong under FAT even when they pour like liquids.

FAT includes:

- isolated lipid phases;
- rendered fats;
- skimmed or separated fats;
- culinary oils;
- fat-dominant emulsions.

FAT does not automatically include every food that happens to contain fat. Ordinary cheeses, meats, spreads, pastries, nuts, and similar foods should wait for another Curse Type unless the lipid fraction itself is the indexed material.

## Tier-2 taxonomy

1. Animal rendered fat
2. Food drippings / skimmed fat
3. Dairy fat
4. Plant culinary oil
5. Nut / seed oil
6. Marine oil
7. Infused / flavored oil
8. Packaged-food / preservation oil
9. Emulsified fat
10. Specialty / manufactured fat

## Evidence boundary

The existing Curse Index rule remains unchanged:

> Catalogued does not mean tested.

No FAT seed record receives experimental status, a score, sensory metadata, culinary-potential metadata, or safety clearance merely because it appears in the index.

## Initial implementation notes

- IDs use `CURSE-FAT-###`.
- Slugs remain globally unique across the Curse Index.
- FAT is selectable beside LIQUID in the Tier-1 browser.
- Tier-2 material types update to the selected Tier-1 type.
- Search and sorting operate within the selected Tier-1 type.
- Direct detail pages retain `/curses/[slug]`.
- Missing metadata renders explicitly as uncatalogued, not as a negative finding.
