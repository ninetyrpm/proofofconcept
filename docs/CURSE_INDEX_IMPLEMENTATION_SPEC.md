# PROOF OF CONCEPT // CURSE INDEX

## Website Implementation Specification

**Status:** Approved for implementation
**Initial scope:** Liquid ingredients
**Purpose:** Maintain a structured reference database of unusual, obscure, unexpected, or otherwise cursed materials that may inspire future PROOF OF CONCEPT cocktails.

---

## 1. Concept

Add a new section to the PROOF OF CONCEPT website called:

# CURSE INDEX

The Curse Index is a **reference and ideation database**, not a cocktail-development record.

An entry means:

> This material exists and may be interesting to use.

It does **not** mean:

> This material has been tested, works in a cocktail, is recommended, or has produced any experimental evidence.

Physical use of a Curse Index ingredient only becomes evidence when recorded as part of a cocktail's dedicated development history.

The site must preserve this distinction visually and structurally.

---

## 2. Information hierarchy

The database uses a three-tier taxonomy.

### Tier 1 — Curse Type

Broad physical/conceptual class.

Initial implemented value:

- `LIQUID`

Future possible values may include:

- `SOLID`
- `POWDER`
- `FAT`
- `GAS`
- `CULTURE / MICROBE`
- `PROCESS`
- `SERVICE / PRESENTATION`
- `OBJECT`

Do **not** create empty public-facing sections for these yet. The architecture should support additional Tier-1 types later.

### Tier 2 — Material Type

A functional/category grouping within the Curse Type.

Examples beneath `LIQUID`:

- Condiment / seasoning
- Vinegar / acid
- Pickling / preservation brine
- Fermentation liquid
- Dairy / cultured dairy
- Animal broth / stock
- Seafood liquid
- Vegetable juice / water
- Fruit syrup / packing liquid
- Grain / starch liquid
- Legume / seed / nut liquid
- Tea / decoction
- Prepared savory food
- Prepared sweet food
- Breakfast-adjacent
- Commercial / regional beverage
- Packaged-food / processing liquid

### Tier 3 — Specific Curse

The actual material.

Example:

```text
LIQUID
└── Seafood liquid
    ├── Clam juice
    ├── Oyster liquor
    ├── Mussel liquor
    ├── Tuna-can liquid
    └── Sardine-can liquid

```

---

## 3. Public site architecture

Add:

```text
/curses
/curses/[slug]

```

Suggested primary navigation label:

**CURSE INDEX**

Do not fold Curse Index records into the main cocktail archive.

The conceptual architecture is:

```text
COCKTAIL ARCHIVE
    actual cocktail projects
    evidence-backed development records

GRAVEYARD
    terminated cocktail projects or branches

CURSE INDEX
    materials that could inspire future development

PROTOCOL / ABOUT
    project methodology and explanation

```

Exact navigation placement may be adapted to the existing POC interface.

---

## 4. Curse Index landing page

The `/curses` page should behave primarily as an **explorable database**, not as an essay or novelty list.

### Header

Display:

**CURSE INDEX**

Suggested supporting copy:

> Materials under consideration for purposes they may not have anticipated.

Include a quieter methodological note:

> Catalogued does not mean tested.

This distinction should remain visible somewhere on the page.

---

## 5. Primary browser

The database browser should expose the taxonomy directly.

Recommended desktop hierarchy:

```text
CURSE TYPE
LIQUID

TYPE
Condiment / seasoning
Fermentation liquid
Seafood liquid
...

RESULTS
Fish sauce
Maggi seasoning
Kimchi liquor
Clam juice
...

```

On mobile, Tier 1 and Tier 2 may collapse into filters/dropdowns rather than persistent columns.

A user should be able to:

- browse by Tier 1;
- browse by Tier 2;
- search specific materials;
- filter by attributes/tags;
- sort by curse score;
- sort by culinary potential;
- open an individual material record.

---

## 6. Curse record data model

Create a dedicated Curse Index schema/data structure rather than embedding these records in the cocktail schema.

Suggested canonical model:

```yaml
schema_version: "1.0"

identity:
  id: CURSE-LIQ-000
  name: ""
  slug: ""

classification:
  curse_type: liquid
  material_type: ""
  material_type_slug: ""

description:
  summary: ""
  notes: null

sensory:
  tags: []

function:
  tags: []

attributes: []

scores:
  curse_score: null
  culinary_potential: null

safety:
  allergens: []
  dietary_flags: []
  ingredient_flags: []
  notes: null

relationships:
  related_curse_ids: []

editorial:
  catalog_status: active
  added: YYYY-MM-DD
  updated: YYYY-MM-DD

```

A dedicated project schema such as:

`POC_CURSE_SCHEMA.yaml`

should eventually become the authoritative structure for these records.

---

## 7. IDs

Curse Index records need stable IDs independent of names.

Recommended format:

```text
CURSE-LIQ-001
CURSE-LIQ-002
CURSE-LIQ-003

```

Future branches can use corresponding type prefixes:

```text
CURSE-SOL-001
CURSE-POW-001
CURSE-FAT-001

```

Slugs and display names may change without changing IDs.

---

## 8. Tags versus taxonomy

Do not overload Tier 2 with every useful property.

For example:

### Mozzarella whey

```yaml
classification:
  curse_type: liquid
  material_type: dairy_cultured_dairy

sensory:
  tags:
    - lactic
    - saline
    - milky

function:
  tags:
    - acidity
    - texture
    - salinity

attributes:
  - byproduct
  - waste_stream
  - cloudy

```

### Tuna-can liquid

```yaml
classification:
  curse_type: liquid
  material_type: seafood_liquid

sensory:
  tags:
    - saline
    - umami
    - marine

function:
  tags:
    - salinity
    - umami

attributes:
  - packing_liquid
  - canned
  - animal_derived

```

This allows future queries such as:

- all byproducts;
- all saline liquids;
- all fermented liquids;
- all animal-derived materials;
- all high-curse/high-potential ingredients;
- all packing liquids;
- all materials with an umami function.

---

## 9. Scoring

Each Curse Index entry may have two independent editorial scores.

### Curse Score

`1–10`

Measures how categorically wrong, alarming, unexpected, or socially questionable the ingredient sounds in a cocktail.

This is **not** a quality score.

### Culinary Potential

`1–10`

Editorial estimate of how plausibly useful the material appears from a flavor/structural standpoint.

This is also **not experimental evidence**.

Example:

```yaml
Fish sauce:
  curse_score: 7
  culinary_potential: 10

Hot-dog water:
  curse_score: 10
  culinary_potential: 3

```

The UI should make the distinction obvious.

A high culinary-potential score must never visually imply that the ingredient has been validated.

---

## 10. Detail view

Selecting an entry should open either a dedicated detail page or a substantial drawer consistent with the existing POC interaction model.

Display:

**Name**

**Classification**
`LIQUID → Seafood liquid`

**Description**

A concise explanation of what the material actually is.

**Sensory profile**
Tags such as:
`saline · marine · umami · fermented`

**Possible functions**
Tags such as:
`acid · sweetness · salinity · aroma · texture · dilution · fermentation`

**Attributes**
Tags such as:
`BYPRODUCT · PACKING LIQUID · CANNED`

**Curse Score**

**Culinary Potential**

**Safety / allergen information**

**POC usage**

Eventually:

> Used in 2 experiments across 1 cocktail.

or:

> No documented POC use.

Do not describe an unused curse as “untested” in a way that implies the Curse Index itself maintains experimental testing status. Experimental evidence lives with cocktails.

---

## 11. Cocktail integration

Curse Index records and cocktail ingredient records should eventually be linkable by stable ID.

Preferred future addition to the cocktail ingredient item:

```yaml
amount: null
unit: null
ingredient: ""
curse_id: null
brand: null
preparation: null
optional: false
notes: null

```

`curse_id` is optional.

Normal cocktail ingredients do not need Curse Index records.

Example:

```yaml
amount: 2
unit: drops
ingredient: fish sauce
curse_id: CURSE-LIQ-001
brand: Viet Huong

```

This allows the site to derive:

```text
CURSE → cocktails using it
COCKTAIL → linked cursed materials

```

Do not maintain a manually entered `used_in` list inside the Curse record if the same relationship can be derived from cocktail data.

Existing cocktails may remain unlinked until backfilled. No immediate migration is required simply to launch the Curse Index.

---

## 12. Safety

Curse Index entries should contain basic safety/allergen metadata where relevant.

Examples include:

- fish;
- shellfish;
- dairy;
- soy;
- sesame;
- nuts;
- gluten;
- fermentation/storage concerns;
- perishability;
- raw or improperly processed ingredients.

Do not treat the index as a food-safety authority.

The record should communicate known concerns relevant to experimental beverage use, while cocktail-specific preparation and disclosure remain the responsibility of the cocktail's development record.

Safety information must never be hidden merely because the ingredient quantity might be small or sensorially imperceptible.

---

## 13. Initial LIQUID taxonomy

Seed the Tier-2 structure with:

```text
LIQUID

├── Condiment / seasoning
├── Vinegar / acid
├── Pickling / preservation brine
├── Fermentation liquid
├── Dairy / cultured dairy
├── Animal broth / stock
├── Seafood liquid
├── Vegetable juice / water
├── Fruit syrup / packing liquid
├── Grain / starch liquid
├── Legume / seed / nut liquid
├── Tea / decoction
├── Prepared savory food
├── Prepared sweet food
├── Breakfast-adjacent
├── Commercial / regional beverage
└── Packaged-food / processing liquid

```

---

## 14. Initial seed records

### Condiment / seasoning

- Fish sauce
- Worcestershire sauce
- Maggi seasoning
- Soy sauce
- Tamari
- Ponzu
- Oyster sauce
- Banana ketchup
- Tonkatsu sauce
- HP sauce
- Steak sauce
- Hot sauce
- Mustard wash
- Horseradish liquid

### Vinegar / acid

- Black vinegar
- Malt vinegar
- Sherry vinegar
- Balsamic vinegar
- Cane vinegar
- Umeboshi vinegar

### Pickling / preservation brine

- Dill pickle brine
- Olive brine
- Caper brine
- Pepperoncini brine
- Giardiniera brine
- Pickled beet liquid
- Pickled onion liquid
- Jalapeño escabeche
- Preserved-lemon brine

### Fermentation liquid

- Sauerkraut juice
- Kimchi liquor
- Fermented mustard-green brine
- Lacto-fermented fruit brine
- Lacto-fermented vegetable brine
- Kombucha
- Water kefir
- Kvass
- Bread kvass
- Tepache
- Boza
- Amazake
- Fermented rice water
- Sourdough hooch

### Dairy / cultured dairy

- Milk
- Goat milk
- Sheep milk
- Buttermilk
- Milk kefir
- Yogurt whey
- Ricotta whey
- Mozzarella whey
- Evaporated milk
- Sweetened condensed milk

### Animal broth / stock

- Chicken broth
- Beef broth
- Beef consommé
- Pork broth
- Ham stock
- Ramen broth

### Seafood liquid

- Dashi
- Niboshi dashi
- Clam juice
- Oyster liquor
- Mussel liquor
- Shrimp-shell stock
- Bonito broth
- Tuna-can liquid
- Sardine-can liquid
- Anchovy packing liquid

### Vegetable juice / water

- Tomato water
- Cucumber water
- Celery juice
- Carrot juice
- Beet juice
- Cabbage juice
- Onion water
- Roasted-pepper liquid
- Corn milk
- Mushroom stock
- Artichoke liquid

### Fruit syrup / packing liquid

- Canned pineapple syrup
- Canned peach syrup
- Canned pear syrup
- Mandarin-orange syrup
- Lychee syrup
- Rambutan syrup
- Maraschino cherry syrup
- Nata de coco syrup
- Thawed-berry purge

### Grain / starch liquid

- Rice-washing water
- Congee water
- Pasta water
- Potato cooking water
- Wort
- Malt extract solution
- Spent-grain tea
- Oat milk
- Horchata

### Legume / seed / nut liquid

- Aquafaba
- Black-bean cooking liquor
- Red-bean cooking liquor
- Soy milk
- Tofu whey
- Sesame milk
- Black-sesame wash
- Peanut milk
- Tahini water

### Tea / decoction

- Garlic tea
- Mushroom tea
- Kombu tea
- Roasted corn tea
- Barley tea
- Buckwheat tea
- Burdock tea
- Chrysanthemum tea
- Lapsang concentrate
- Yerba mate concentrate

### Prepared savory food

- Miso soup
- Gazpacho
- Gravy
- Au jus
- Clarified clam chowder
- Diluted Caesar dressing
- Ranch whey

### Prepared sweet food

- Melted ice cream
- Melted sorbet
- Crème anglaise
- Thinned pastry cream
- Liquid gelatin dessert
- Melted popsicle

### Breakfast-adjacent

- Cereal milk
- Oatmeal water
- Coffee
- Espresso
- Coffee creamer
- Malted milk
- Chocolate milk

### Commercial / regional beverage

- Calpico / Calpis
- Malta
- Sikhye
- Sujeonggwa
- Chicha morada
- Mauby
- Ayran
- Doogh
- Lassi
- Salep
- Aloe drink
- Grass-jelly drink
- Basil-seed drink

### Packaged-food / processing liquid

- Hot-dog water
- Vienna-sausage packing liquid
- Canned Spam cooking liquid / glaze
- Instant-noodle seasoning broth

---

## 15. Seed-data expectations

The initial implementation does **not** need researched descriptions, scores, complete safety metadata, or detailed tagging for every item before launch.

Minimum viable seed record:

```yaml
identity:
  id:
  name:
  slug:

classification:
  curse_type:
  material_type:

```

Everything else may initially be null or empty.

Do not fabricate metadata simply to fill the interface.

The database should tolerate incomplete records gracefully.

---

## 16. Storage

For v1, prefer **version-controlled structured data** unless the existing POC architecture already has a compelling database layer.

For example:

```text
/data/curses.yaml

```

or:

```text
/data/curses/*.yaml

```

A backend/database service should not be introduced solely because the feature is called an “index” or “database.”

The important requirement is a stable structured data model that can later be migrated without changing public URLs or IDs.

---

## 17. Design direction

The Curse Index should feel like part of the same experimental archive as the cocktail records.

Avoid turning it into:

- a novelty “gross ingredients” page;
- a BuzzFeed-style ranking;
- a meme list;
- a bright recipe-discovery interface.

The humor should emerge from the seriousness with which ridiculous materials are catalogued.

Desired tone:

**clinical taxonomy applied to questionable decisions.**

The interface should make “Hot-dog water — culinary potential 3/10” feel like a legitimate archival finding.

---

## 18. Evidence boundary

This is mandatory.

The website must never infer experimental status from Curse Index metadata.

Examples:

```text
curse_score: 10

```

does not mean tested.

```text
culinary_potential: 9

```

does not mean viable.

```text
related cocktail exists

```

does not mean the curse itself caused that cocktail to succeed.

Only cocktail development events establish:

- physical testing;
- observations;
- viability;
- validation;
- peer review;
- locked builds.

---

## 19. Version-one acceptance criteria

The feature is ready for initial deployment when:

1. `/curses` exists.
2. `LIQUID` exists as the first Tier-1 Curse Type.
3. The listed Tier-2 categories exist.
4. Tier-3 seed materials are represented as structured records.
5. Users can browse Tier 1 → Tier 2 → Tier 3.
6. Search works across material names.
7. The UI clearly states that cataloguing is not testing.
8. Detail views support future metadata even where initial fields are empty.
9. IDs are stable and independent of slugs.
10. The implementation does not alter cocktail development status or manufacture experimental evidence.
11. The architecture can support additional Curse Types later without a redesign.
12. No unnecessary external database dependency is introduced for v1.

---

## 20. Explicitly out of scope for v1

Do not block initial launch on:

- generating every possible Curse Type;
- complete scores for every material;
- comprehensive safety research for every record;
- automatic cocktail generation;
- recommendation algorithms;
- user submissions;
- voting;
- community ratings;
- AI-generated pairings;
- complete back-linking of historical cocktails;
- append-only development events for Curse Index entries.

Those may be considered separately later.

---

## 21. Guiding rule

The Curse Index answers:

> **What questionable materials could we work with?**

The cocktail archive answers:

> **What did we actually do with them, and what happened?**

Do not collapse those questions into the same data model.