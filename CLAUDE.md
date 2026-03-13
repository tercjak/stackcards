# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Stacklands-style browser card game — a crafting/simulation game where players drag cards together to craft items, complete quests, and unlock card packs. Wuxia-themed (martial sect cultivation).

## Quick Start

```bash
# Run without server (static files)
Open index.html directly in browser

# Run with HTTP server (required for asset images)
python -m http.server 8080
# Open http://localhost:8080
```

## Asset Generation

Requires Python 3 + API keys:

```bash
pip install pyyaml requests replicate

# Set API key
$env:OPENAI_API_KEY="sk-..."        # PowerShell
export OPENAI_API_KEY="sk-..."       # Linux/Mac

# Generate card images
python generate.py --model dalle
python generate.py --model midjourney
python generate.py --card villager   # Single card
```

## Architecture

**Data-driven design** — all game content loaded from data files at runtime:

| File | Purpose |
|------|---------|
| `index.html` | Static shell, loads React + Babel via CDN, YAML/CSV parsers |
| `stacklands.jsx` | Main React component (drag-drop, crafting, quests, inventory) |
| `assets.yaml` | Card definitions (id, name, type, emoji, texture path, LLM prompts) |
| `recipes.csv` | Crafting recipes (input_a + input_b → output, time, optional building) |
| `quests.json` | Quest definitions (requirements, conditions, rewards, pack unlocks) |

**Runtime flow:**
1. `GameWrapper` component fetches all data files
2. Parses YAML → `CARD_DEFS`, `PACK_DEFS`
3. Parses CSV → `RECIPES`
4. Parses JSON → `QUESTS`
5. Renders `Stacklands` game component

**Card types** (`assets.yaml`): unit, resource, food, material, building, currency, weapon, enemy, knowledge, consumable

**Quest conditions**: `card_count_on_board`, `proximity` (spatial card placement)

## Key Patterns

- Global mutable state for game data (`CARD_DEFS`, `RECIPES`, etc.) populated once on load
- Crafting uses ref-based timers with `Date.now()` deltas
- Quests auto-complete via `useEffect` watching game state changes
- Drag-drop collision detection determines recipe triggers

---

## 📄 stacklands.jsx — Struktura Pliku

Plik (~490 linii) zawiera całą logikę gry. Szczegółowa dokumentacja w [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

### Komponenty i Funkcje

| Nazwa | Linia | Typ | Odpowiedzialność |
|-------|-------|-----|------------------|
| `mkCard()` | 23 | Utility | Tworzy obiekt karty z unikalnym `uid` |
| `findRecipe()` | 25 | Utility | Wyszukuje recepturę dla dwóch kart |
| `GameCard` | 30 | Component | Renderuje pojedynczą kartę na stole |
| `Toasts` | 94 | Component | Powiadomienia typu "toast" |
| `RecipeBook` | 104 | Component | Rozwijana lista wszystkich receptur |
| `useBackgroundMusic` | 131 | Custom Hook | Odtwarza muzykę tła w pętli |
| `Stacklands` | 166 | Component | Główna logika gry (stan, drag-drop, crafting, questy) |
| `GameWrapper` | 415 | Component | Ładuje dane z plików (YAML, CSV, JSON) |

### Gdzie Szukać Funkcjonalności

- **Tworzenie karty:** `mkCard()` (l. 23)
- **Receptury:** `findRecipe()` (l. 25), `recipes.csv` → parsowane w `GameWrapper` (l. 449)
- **Drag & Drop:** `handleMouseDown()` (l. 202), `useEffect` (l. 214)
- **Crafting:** `useEffect` game tick (l. 241)
- **Questy:** `useEffect` quest logic (l. 296)
- **Pakiety:** `buyPack()` (l. 322)
- **Ładowanie danych:** `fetchAllData()` (l. 423)


## Tool Usage

- **Context Gathering**: Before starting major refactors or adding new mechanics (e.g., new recipes), use the `jcodemunch` tool to "munch" `stacklands.jsx`,  simultaneously. This provides a holistic view of the dependencies between game logic and data without redundant file reads.
- **Data Synchronization**: Always verify consistency between `recipes.csv` and `assets.yaml` using the aggregate view from `jcodemunch` to prevent Card ID mismatches or broken recipe references.
- **Efficient Analysis**: Prefer `jcodemunch` over standard `read_file` when the task requires understanding how the React frontend interacts with the external data layers.