# stacklands.jsx — Architektura i Podział Odpowiedzialności

Plik zawiera całą logikę gry React w jednym module (~490 linii). Poniżej szczegółowy podział na komponenty, funkcje i ich odpowiedzialności.

---

## 📁 Struktura Pliku

```
stacklands.jsx
├── Globalne dane i konstanty
├── Funkcje pomocnicze (utilities)
├── Komponenty UI
│   ├── GameCard
│   ├── Toasts
│   └── RecipeBook
├── Custom Hook
│   └── useBackgroundMusic
├── Komponent Gry
│   └── Stacklands
├── Komponent Ładowania
│   └── GameWrapper
└── Inicjalizacja React
```

---

## 🔧 Globalne Dane i Konstanty (linie 1–27)

| Nazwa | Typ | Linia | Opis |
|-------|-----|-------|------|
| `CARD_DEFS` | `object` | 7 | Słownik definicji kart (ładowany z `assets.yaml`) |
| `PACK_DEFS` | `object` | 8 | Słownik definicji pakietów kart (ładowany z `assets.yaml`) |
| `RECIPES` | `array` | 9 | Tablica receptur craftingu (ładowana z `recipes.csv`) |
| `QUESTS` | `array` | 10 | Tablica questów (ładowana z `quests.json`) |
| `TYPE_COLORS` | `object` | 12–16 | Mapowanie typów kart na kolory hex |
| `CARD_W` | `number` | 18 | Stała szerokości karty w pikselach (175px) |
| `CARD_H` | `number` | 19 | Stała wysokości karty w pikselach (230px) |

---

## 🛠️ Funkcje Pomocnicze (Utilities)

### `mkCard(id, x, y)` — linia 23
**Moduł:** `stacklands.jsx` | **Typ:** Factory function

```javascript
const mkCard = (id, x, y) => ({ uid: _uid++, id, x, y });
```

**Odpowiedzialność:** Tworzy obiekt karty z unikalnym identyfikatorem `uid`.

| Parametr | Typ | Opis |
|----------|-----|------|
| `id` | `string` | ID definicji karty (np. `"villager"`) |
| `x` | `number` | Pozycja X na stole |
| `y` | `number` | Pozycja Y na stole |

**Zwraca:** `{ uid: number, id: string, x: number, y: number }`

---

### `findRecipe(a, b)` — linia 25
**Moduł:** `stacklands.jsx` | **Typ:** Helper function

```javascript
function findRecipe(a, b) {
  return RECIPES.find(r => (r.a === a && r.b === b) || (r.a === b && r.b === a));
}
```

**Odpowiedzialność:** Wyszukuje recepturę dla dwóch kart (dwukierunkowo).

| Parametr | Typ | Opis |
|----------|-----|------|
| `a` | `string` | ID pierwszej karty |
| `b` | `string` | ID drugiej karty |

**Zwraca:** `RECIPE | undefined`

---

## 🎨 Komponenty UI

### `GameCard(props)` — linie 30–92
**Moduł:** `stacklands.jsx` | **Typ:** React Functional Component

**Odpowiedzialność:** Renderuje pojedynczą kartę na stole graficznym.

| Prop | Typ | Opis |
|------|-----|------|
| `card` | `object` | Dane karty (`uid`, `id`, `x`, `y`) |
| `isDragging` | `boolean` | Czy karta jest aktualnie przeciągana |
| `craftPct` | `number` | Postęp craftingu (0–1) |
| `craftRemaining` | `number` | Pozostały czas craftingu w sekundach |
| `onMouseDown` | `function` | Handler rozpoczęcia przeciągania |

**Renderuje:**
- Rama karty z gradientem i cieniem
- Kolorowy pasek typu na górze
- Grafika/emoji karty
- Nazwa (EN + PL)
- Pasek postępu craftingu (jeśli aktywny)

---

### `Toasts({ list })` — linie 94–102
**Moduł:** `stacklands.jsx` | **Typ:** React Functional Component

**Odpowiedzialność:** Wyświetla powiadomienia typu "toast" na dole ekranu.

| Prop | Typ | Opis |
|------|-----|------|
| `list` | `array` | Tablica toastów: `{ id: number, text: string }` |

---

### `RecipeBook()` — linie 104–130
**Moduł:** `stacklands.jsx` | **Typ:** React Functional Component

**Odpowiedzialność:** Rozwijane okno z listą wszystkich receptur craftingu.

**Stan lokalny:**
- `open` (boolean) — czy okno jest rozwinięte

**Renderuje:**
- Przycisk toggle (📖 Receptury)
- Lista receptur z emoji, wynikami i czasem

---

## 🎵 Custom Hook

### `useBackgroundMusic(url)` — linie 131–163
**Moduł:** `stacklands.jsx` | **Typ:** React Custom Hook

**Odpowiedzialność:** Odtwarza muzykę tła w pętli po pierwszej interakcji użytkownika.

| Parametr | Typ | Opis |
|----------|-----|------|
| `url` | `string` | Ścieżka do pliku audio (np. `'bg_soundtrack.mp3'`) |

**Mechanizm:**
- Tworzy obiekt `Audio` jednokrotnie (ref)
- Próbuje odtworzyć natychmiast
- Jeśli zablokowane przez przeglądarkę, czeka na `click`/`keydown`
- Ustawia głośność na 20%

---

## 🎮 Główny Komponent Gry

### `Stacklands()` — linie 166–412
**Moduł:** `stacklands.jsx` | **Typ:** React Functional Component

**Odpowiedzialność:** Główna logika gry — stan, interakcje, rendering stołu, UI.

### Stan (useState)

| Stan | Typ | Inicjalizacja | Opis |
|------|-----|---------------|------|
| `cards` | `array` | 7 kart startowych | Lista kart na stole |
| `inventory` | `object` | `{}` | Zebrane zasoby (poza stołem) |
| `gold` | `number` | `15` | Złoto gracza |
| `food` | `number` | `12` | Jedzenie gracza |
| `moon` | `number` | `5` | Licznik cykli księżycowych |
| `draggingUid` | `number|null` | `null` | UID przeciąganej karty |
| `craftMap` | `object` | `{}` | Postępy craftingu per UID |
| `completedQuests` | `array` | `[]` | ID ukończonych questów |
| `unlockedPacks` | `array` | `["humble_beginnings"]` | Odblokowane pakiety |
| `toasts` | `array` | `[]` | Aktywne powiadomienia |
| `hovered` | `string|null` | `null` | ID karty pod kursorem |

### Refs

| Ref | Typ | Opis |
|-----|-----|------|
| `boardRef` | `RefObject` | Referencja do elementu stołu (DOM) |
| `dragRef` | `RefObject` | Tymczasowe dane przeciągania |
| `craftsRef` | `RefObject` | Aktywne crafty (poza stanem React) |

### Callbacki

#### `toast(text)` — linia 196
**Odpowiedzialność:** Dodaje powiadomienie i usuwa je po 2.9s.

#### `handleMouseDown(e, card)` — linia 202
**Odpowiedzialność:** Rozpoczyna przeciąganie karty, oblicza offset, przesuwa kartę na wierzch listy.

### Efekty

#### `useEffect` — Drag & Drop (linie 214–239)
**Odpowiedzialność:** Obsługuje ruch myszy i upuszczenie karty.
- `onMove`: Aktualizuje pozycję przeciąganej karty
- `onUp`: Sprawdza kolizję z inną kartą, uruchamia crafting jeśli receptura istnieje

#### `useEffect` — Game Tick (linie 241–293)
**Odpowiedzialność:** Aktualizuje postępy craftingu co 80ms.
- Oblicza `%` ukończenia na podstawie `Date.now()`
- Kończy crafty i tworzy nowe karty (produkty)
- Zachowuje karty jednostek jeśli `out_b` wskazuje na nie

#### `useEffect` — Quest Logic (linie 296–320)
**Odpowiedzialność:** Sprawdza warunki questów przy zmianie stanu gry.
- `card_count_on_board`: Liczy karty danego typu
- `proximity`: Sprawdza odległość między kartami
- `requirements`: Porównuje inventory/questy/liczniki

### Akcje

#### `buyPack(packId)` — linia 322
**Odpowiedzialność:** Kupuje pakiet kart za złoto.
1. Sprawdza odblokowanie i cenę
2. Pobiera złoto
3. Losuje kartę z puli pakietu
4. Dodaje kartę na stół w losowej pozycji

### Rendering
```
<div> (kontener gry)
├── <div> (górny pasek)
│   ├── Sell button
│   ├── Pakiety kart (dynamiczna lista)
│   └── Zasoby (złoto, jedzenie, księżyc)
├── <div> (środek)
│   ├── <div> (lewy panel questów)
│   │   ├── Taby (Quests/Ideas)
│   │   ├── Lista questów
│   │   └── Tooltip hoverowanej karty
│   └── <div> (stół)
│       ├── Tło z gradientami
│       ├── Ramka stołu
│       ├── <GameCard> × N
│       └── Podpowiedź tekstowa
├── <RecipeBook />
└── <Toasts />
```

---

## 📦 Komponent Ładowania

### `GameWrapper()` — linie 415–484
**Moduł:** `stacklands.jsx` | **Typ:** React Functional Component

**Odpowiedzialność:** Inicjalizuje dane gry z plików zewnętrznych.

### Stan

| Stan | Typ | Opis |
|------|-----|------|
| `loading` | `boolean` | Czy dane są jeszcze ładowane |
| `error` | `string|null` | Komunikat błędu |

### Proces Ładowania

```javascript
fetchAllData() {
  1. fetch('quests.json')   → QUESTS (JSON)
  2. fetch('assets.yaml')   → CARD_DEFS, PACK_DEFS (YAML → jsyaml.load)
  3. fetch('recipes.csv')   → RECIPES (CSV → Papa.parse)
}
```

**Konwersja CSV na RECIPES:**
```javascript
{
  a: String(r.input_a).trim(),      // ID pierwszej karty
  b: String(r.input_b || "").trim(), // ID drugiej karty
  out: String(r.output_a || r.output || "").trim(), // Główny produkt
  out_b: String(r.output_b || "").trim(), // Drugi produkt/zachowana karta
  time: parseInt(r.time_seconds || 5) // Czas w sekundach
}
```

### Rendering Błędu
Jeśli `error !== null`: Wyświetla komunikat z instrukcją uruchomienia serwera HTTP.

### Rendering Ładowania
Jeśli `loading === true`: Zwraca `null` (index.html pokazuje komunikat "Trwa ładowanie...").

### Rendering Sukcesu
Renderuje komponent `<Stacklands />`.

---

## 🚀 Inicjalizacja (linie 487–488)

```javascript
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<GameWrapper />);
```

**Odpowiedzialność:** Tworzy React root i renderuje główny komponent.

---

## 🔍 Gdzie Szukać...

| Funkcjonalność | Plik | Linia | Komponent/Funkcja |
|----------------|------|-------|-------------------|
| Definicje kart | `assets.yaml` | — | — |
| Receptury | `recipes.csv` | — | — |
| Questy | `quests.json` | — | — |
| Tworzenie karty | `stacklands.jsx` | 23 | `mkCard()` |
| Wyszukiwanie receptury | `stacklands.jsx` | 25 | `findRecipe()` |
| Renderowanie karty | `stacklands.jsx` | 30 | `GameCard` |
| Powiadomienia | `stacklands.jsx` | 94 | `Toasts` |
| Lista receptur | `stacklands.jsx` | 104 | `RecipeBook` |
| Muzyka tła | `stacklands.jsx` | 131 | `useBackgroundMusic()` |
| Główna logika gry | `stacklands.jsx` | 166 | `Stacklands()` |
| Przeciąganie kart | `stacklands.jsx` | 202 | `handleMouseDown()` |
| Obsługa ruchu myszy | `stacklands.jsx` | 214 | `useEffect` (drag) |
| Crafting tick | `stacklands.jsx` | 241 | `useEffect` (tick) |
| Logika questów | `stacklands.jsx` | 296 | `useEffect` (questy) |
| Kupno pakietu | `stacklands.jsx` | 322 | `buyPack()` |
| Ładowanie danych | `stacklands.jsx` | 423 | `fetchAllData()` |
| Parsowanie YAML | `stacklands.jsx` | 439 | `jsyaml.load()` |
| Parsowanie CSV | `stacklands.jsx` | 449 | `Papa.parse()` |
