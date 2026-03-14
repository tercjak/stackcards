# Cauldron Crafting System

## Koncepcja

System craftingu oparty na przeciąganiu kart bezpośrednio na kociołek alchemiczny z wizualną siatką 3x3.

## Wizualizacja

- **Kociołek**: `assets/crafting_cauldron_top.png` i `assets/crafting_cauldron_bottom.png`
- **Siatka 4x4 z centrowaną 3x3**: Obrazek kociołka ma siatkę pixel-art 4x4, w której aktywna strefa craftingu to centrowana siatka 3x3
- **Sloty aktywne** (zgodnie z `crafting_recipes.csv`):
  ```
  [0][1][2]      slot 1: góra (input01)
  [3][4][5]  →   slot 3: lewo (input10), slot 4: centrum (input11), slot 5: prawo (input12)
  [6][7][8]      slot 7: dół (input21)
  ```

## Geometria Siatki

### Struktura 4x4 z centrowaną 3x3

```
Obrazek (524x515 px) - siatka 4x4:
┌────┬────┬────┬────┐
│    │    │    │    │
├────┼────┼────┼────┤  Margines: 1/8 obrazka z każdej strony
│    │ 0  │ 1  │ 2  │  ← 3x3 crafting grid starts here
├────┼────┼────┼────┤
│    │ 3  │ 4  │ 5  │
├────┼────┼────┼────┤
│    │ 6  │ 7  │ 8  │
└────┴────┴────┴────┘
```

### Obliczenia pozycji slotów (pixel-based)

```javascript
// Wymiary górnego kociołka - image z 8px padding na outline: 540x566
// Content area: 524x515 (oryginalny obrazek)
// Grid offset = padding (8px) + offset wewnątrz contentu
const CAULDRON_TOP_W = 540 / 3;  // ~180px (full image scaled)
const CAULDRON_TOP_H = 566 / 3;  // ~188.67px (full image scaled)

// Offset = padding + original grid offset (1/8 content width/height)
const GRID_OFFSET_X = 8/3 + (524 / 4) * 0.5 / 3;  // ~24.50px
const GRID_OFFSET_Y = 8/3 + (515 / 4) * 0.5 / 3;  // ~24.12px

// Wymiary aktywnej siatki 3x3 (w content area)
const GRID_W = (524 / 4) * 3 / 3;  // ~131px
const GRID_H = (515 / 4) * 3 / 3;  // ~128.75px

// Wymiary pojedynczego slotu
const SLOT_W = GRID_W / 3;  // ~43.67px
const SLOT_H = GRID_H / 3;  // ~42.92px

// Pozycje slotów
const slotPositions = [
  { x: GRID_OFFSET_X, y: GRID_OFFSET_Y },                           // slot 0
  { x: GRID_OFFSET_X + SLOT_W, y: GRID_OFFSET_Y },                  // slot 1
  { x: GRID_OFFSET_X + SLOT_W * 2, y: GRID_OFFSET_Y },              // slot 2
  { x: GRID_OFFSET_X, y: GRID_OFFSET_Y + SLOT_H },                  // slot 3
  { x: GRID_OFFSET_X + SLOT_W, y: GRID_OFFSET_Y + SLOT_H },         // slot 4
  { x: GRID_OFFSET_X + SLOT_W * 2, y: GRID_OFFSET_Y + SLOT_H },     // slot 5
  { x: GRID_OFFSET_X, y: GRID_OFFSET_Y + SLOT_H * 2 },              // slot 6
  { x: GRID_OFFSET_X + SLOT_W, y: GRID_OFFSET_Y + SLOT_H * 2 },     // slot 7
  { x: GRID_OFFSET_X + SLOT_W * 2, y: GRID_OFFSET_Y + SLOT_H * 2 }, // slot 8
];
```

## Przepływ UX

1. **Przeciągnij karty na kociołek**
   - Gracz przeciąga karty ingredientów z stołu na obszar kociołka
   - Karta znika ze stołu po upuszczeniu w obszarze kociołka
   - W odpowiednim slocie 3x3 pojawia się miniaturka ikony karty

2. **Wizualizacja na kotle**
   - Sloty pozycjonowane w siatce 3x3 (aktywne: 1, 3, 4, 5, 7 - wzór krzyża)
   - Każdy slot to ~43.67 x ~42.92 px (GRID_W/3 x GRID_H/3)
   - Ghost/preview wymaganych ingredientów widoczny jako przezroczyste ikony (opacity: 0.5)
   - Wypełnione sloty podświetlone na zielono
   - Hover nad slotem: podświetlenie na niebiesko
   - **Kliknięcie wypełnionego slotu** usuwa kartę i zwraca ją na stół (obok kociołka)
   - **Przeciągnięcie z slotu** i puszczenie poza kociołkiem usuwa kartę w miejscu puszczenia

3. **Kliknij przycisk Craft pod kociołkiem**
   - Widoczny tylko gdy karty wypełniają aktywną recepturę
   - Crafts directly without opening additional panel

4. **Przycisk CRAFT**
   - Usunięcie wszystkich składników z kociołka
   - Dodanie wyniku craftingu na stół (obok kociołka)
   - Czyszczenie slotów

5. **Wyjmowanie składników**
   - Kliknięcie: karta wraca na stół obok kociołka
   - Przeciągnięcie: karta podąża za kursorem, ląduje w miejscu puszczenia

## Struktura danych

### `crafting_recipes.csv`

```csv
id,name,input00,input01,input02,input10,input11,input12,input20,input21,input22,output_perfect1,output_great1,output_avg1,output_bad
pill001,Spirit Pill,,qi_stone,,qi_stone,spirit_herb,cultivation_manual,,qi_stone,,spirit_pill_p,,spirit_pill,,spirit_pill_b
```

- `inputXY` - ID karty wymaganej w slocie (puste = slot nieaktywny)
- `output_*` - ID wyniku w zależności od jakości

## Implementacja

### Stan w Stacklands component

```javascript
const [cauldronSlots, setCauldronSlots] = useState(Array(9).fill(null));
const [selectedRecipe, setSelectedRecipe] = useState(null);
const [draggedCard, setDraggedCard] = useState(null);
const [cauldronHoveredSlot, setCauldronHoveredSlot] = useState(null);
const [draggingFromSlot, setDraggingFromSlot] = useState(null); // Slot being dragged from
const [draggedSlotCard, setDraggedSlotCard] = useState(null); // Card rendered during drag
```

### Drop handling (w onUp)

```javascript
const cauldronAsset = assets.find(a => a.id === "crafting_cauldron_top");
if (cauldronAsset && movedCard) {
  const cx = cauldronAsset.x;
  const cy = cauldronAsset.y;
  const cw = 540 / 3;  // full image width scaled
  const ch = 566 / 3;  // full image height scaled

  // Grid offset = padding (8px) + original content offset
  const GRID_OFFSET_X = 8/3 + (524 / 4) * 0.5 / 3;
  const GRID_OFFSET_Y = 8/3 + (515 / 4) * 0.5 / 3;
  const GRID_W = (524 / 4) * 3 / 3;  // content grid width
  const GRID_H = (515 / 4) * 3 / 3;  // content grid height
  const SLOT_W = GRID_W / 3;
  const SLOT_H = GRID_H / 3;

  // Check if card is within cauldron bounds
  if (cardPos.x >= cx && cardPos.x <= cx + cw &&
      cardPos.y >= cy && cardPos.y <= cy + ch) {

    // Calculate slot index from position
    const relativeX = cardPos.x - cx - GRID_OFFSET_X;
    const relativeY = cardPos.y - cy - GRID_OFFSET_Y;
    const slotX = Math.floor(relativeX / SLOT_W);
    const slotY = Math.floor(relativeY / SLOT_H);
    const slotIndex = slotY * 3 + slotX;

    if (slotIndex >= 0 && slotIndex < 9 && !cauldronSlots[slotIndex]) {
      // Remove card from board, add to slot
      setCards(prev => prev.filter(c => c.uid !== movedUid));
      const newSlots = [...cauldronSlots];
      newSlots[slotIndex] = movedCard;
      setCauldronSlots(newSlots);
    }
  }
}
```

### Drag-to-remove from slot

```javascript
const handleSlotDragStart = (e, slotIndex) => {
  const card = cauldronSlots[slotIndex];
  if (!card) return;

  const br = boardRef.current.getBoundingClientRect();
  const mouseX = e.clientX - br.left;
  const mouseY = e.clientY - br.top;

  // Create temporary card for rendering during drag
  setDraggedSlotCard({
    ...card,
    x: mouseX - CARD_W / 2,
    y: mouseY - CARD_H / 2
  });
  setDraggingFromSlot(slotIndex);
};

// In mouse up handler:
const outsideCauldron = mouseX < cx || mouseX > cx + cw ||
                        mouseY < cy || mouseY > cy + ch;
if (outsideCauldron) {
  // Add card to board at drop position
  setCards(prev => [...prev, {
    ...cardInSlot,
    x: mouseX - CARD_W / 2,
    y: mouseY - CARD_H / 2
  }]);
  // Clear the slot
  newSlots[draggingFromSlot] = null;
  setCauldronSlots(newSlots);
}
```

### GameAsset component (cauldron rendering)

```javascript
const slotPositions = [
  { x: GRID_OFFSET_X, y: GRID_OFFSET_Y },                           // slot 0
  { x: GRID_OFFSET_X + SLOT_W, y: GRID_OFFSET_Y },                  // slot 1 (active)
  { x: GRID_OFFSET_X + SLOT_W * 2, y: GRID_OFFSET_Y },              // slot 2
  { x: GRID_OFFSET_X, y: GRID_OFFSET_Y + SLOT_H },                  // slot 3 (active)
  { x: GRID_OFFSET_X + SLOT_W, y: GRID_OFFSET_Y + SLOT_H },         // slot 4 (active)
  { x: GRID_OFFSET_X + SLOT_W * 2, y: GRID_OFFSET_Y + SLOT_H },     // slot 5 (active)
  { x: GRID_OFFSET_X, y: GRID_OFFSET_Y + SLOT_H * 2 },              // slot 6
  { x: GRID_OFFSET_X + SLOT_W, y: GRID_OFFSET_Y + SLOT_H * 2 },     // slot 7 (active)
  { x: GRID_OFFSET_X + SLOT_W * 2, y: GRID_OFFSET_Y + SLOT_H * 2 }, // slot 8
];
```

- Renderuje slot overlays zawsze (gdy wybrana receptura lub karty w slotach)
- Sloty pozycjonowane pixel-perfect względem kociołka (GRID_OFFSET_X/Y + SLOT_W/H)
- Ghost images dla requirements: `opacity: 0.5`
- Zielone podświetlenie dla wypełnionych slotów: `rgba(123,194,68,0.35)`
- Niebieskie podświetlenie dla hovered slotów: `rgba(58,158,253,0.4)`
- Kliknięcie slotu usuwa kartę (zwraca na stół obok kociołka)
- Przeciągnięcie z slotu: karta podąża za kursorem, ląduje w miejscu puszczenia
- Kociołek ma `pointerEvents: "none"` - tylko sloty i Craft button są interaktywne
- DEBUG_CAULDRON_GRID flag: pokazuje czerwoną ramkę dookoła aktywnej siatki 3x3

### Slot rendering

```javascript
const isDraggingFromThisSlot = draggingFromSlot === i;

<div
  onMouseDown={(e) => {
    e.stopPropagation();
    if (card) handleSlotDragStart(e, i);
  }}
  onClick={(e) => {
    if (draggingFromSlot !== null) return; // Prevent click if dragging
    e.stopPropagation();
    if (card) onSlotClick && onSlotClick(i);
  }}
  style={{
    opacity: isDraggingFromThisSlot ? 0.3 : 1, // Fade slot while dragging
    cursor: card ? "grab" : "default"
  }}
>
  {card && !isDraggingFromThisSlot && <img src={texture} />}
</div>
```

## UI Layout

```
Stół (board):
┌─────────────────────────────────────────────────────┐
│ [Karty]    [Kociołek: crafting_cauldron_top.png]    │
│            ┌─────────────────┐                      │
│            │  [  ][🔮][  ]   │  ← sloty z ghostami  │
│            │  [🔮][🌿][📜]   │                       │
│            │  [  ][🔮][  ]   │                       │
│            └─────────────────┘                      │
│            [🔥 Craft]  ← przycisk pod kociołkiem    │
└─────────────────────────────────────────────────────┘
```

## Lista receptur (crafting_recipes.csv)

| ID | Nazwa | Slot 1 | Slot 3 | Slot 4 | Slot 5 | Slot 7 | Wynik (perfect) |
|----|-------|--------|--------|--------|--------|--------|-----------------|
| pill001 | Spirit Pill | qi_stone | qi_stone | spirit_herb | cultivation_manual | qi_stone | spirit_pill_p |
| pill002 | Improved Pill | qi_stone | qi_stone | spirit_essence | cultivation_manual | qi_stone | imp_pill_p |
| wpn001 | Spirit Sword | qi_stone | qi_stone | spirit_essence | qi_stone | qi_stone | spirit_sword_p |

### activeSlots

Code checks only active slots when validating recipe:
```javascript
const activeSlots = [1, 3, 4, 5, 7]; // Cross pattern
for (let i of activeSlots) {
  const inputKey = `input${Math.floor(i/3)}${i%3}`;
  const requiredId = recipe[inputKey];
  // Validate slot filled with correct ingredient
}
```

## Troubleshooting

| Problem | Przyczyna | Rozwiązanie |
|---------|-----------|-------------|
| Kociołek nie wyświetla się | Brak definicji w assets.yaml | Dodaj `crafting_cauldron_top` i `crafting_cauldron_bottom` z teksturami |
| Sloty na siebie nachodzą | Złe obliczenia SLOT_W/SLOT_H | Użyj: `SLOT_W = GRID_W / 3`, `SLOT_H = GRID_H / 3` |
| Sloty nie alignują z grafiką | Brak GRID_OFFSET_X/Y | Użyj: `(dimension / 4) * 0.5 / 3` dla marginesu 1/8 |
| Kociołek znika po kliknięciu | `pointerEvents: "auto"` na GameAsset | Ustaw `pointerEvents: "none"` na GameAsset, sloty mają `pointerEvents: "auto"` |
| Craft button nie działa | Zła pozycja relative do kociołka | Oblicz pozycję: `cauldron.x + CARD_W/2 - 40` |
| Ghost images nie widoczne | Brak texture w CARD_DEFS | Sprawdź czy ingredient ma `texture` w definicji |
| Przeciąganie z slotu nie działa | draggingFromSlot nie ustawiony | Dodaj `handleSlotDragStart` z `setDraggingFromSlot(slotIndex)` |
| Karta znika przy drag z slotu | Brak draggedSlotCard rendering | Renderuj `<GameCard>` dla `draggedSlotCard` poza `cards.map()` |
| Sloty mają odstępy | Użycie % zamiast pixeli | Użyj pikseli: `GRID_OFFSET_X + SLOT_W * slotX` |

## DEBUG_CAULDRON_GRID

```javascript
const DEBUG_CAULDRON_GRID = false; // Set true to show grid boundary
```

Gdy ustawione na `true`, czerwona ramka (`2px dashed #ff0000`) pojawia się dookoła aktywnej siatki 3x3, pomagając zdiagnozować problemy z pozycjonowaniem slotów.
