# Stacklands — Klon w HTML/React

Przeglądarkowa gra karciana inspirowana [Stacklands](https://store.steampowered.com/app/1948280/Stacklands/).

---

## 🚀 Uruchamianie gry

### Opcja A — Podwójne kliknięcie (bez serwera)

```
Otwórz index.html bezpośrednio w przeglądarce.
```

`index.html` jest w pełni statyczny — wszystkie dane (karty, receptury, questy)
są wbudowane bezpośrednio w plik HTML. **Nie wymaga Pythona ani serwera HTTP.**

> Obrazki kart (`assets/*.png`) będą widoczne tylko gdy plik jest serwowany
> przez HTTP (patrz Opcja B). Bez serwera gra działa normalnie, wyświetlając emoji.

---

## Jak uruchomić?

```bash
python -m http.server 8080
# → otwórz http://localhost:8080
```

## 🗺️ Edytor Map

```bash
python server.py
# → otwórz http://localhost:8080/map_editor.html
```

Edytor pozwala na:
- Tworzenie nowych map
- Przeciąganie kart i assetów na planszę
- Edycję pozycji (x, y) i skali
- Zapisywanie map do folderu `maps/`

### Generowanie Assetów (Opcjonalne)

Jeśli chcesz wygenerować ładne grafiki kart za pomocą AI (DALL-E 3 lub Midjourney):

1.  Upewnij się, że masz zainstalowanego Pythona.
2.  Zainstaluj zależności:
    ```bash
    pip install pyyaml requests replicate
    ```
3.  Ustaw klucz API OpenAI:
    ```powershell
    $env:OPENAI_API_KEY="twój-klucz"
    ```
4.  Uruchom skrypt:
    ```bash
    python generate.py --model dalle
    ```
    Skrypt pobierze opisy z `assets.yaml` i zapisze wygenerowane obrazy w folderze `assets/`. Gra automatycznie je wykryje i wyświetli zamiast emoji.

## Struktura Projektu

- `index.html`: Minimalna powłoka gry.
- `stacklands.jsx`: Główna logika Reactowa (ładowana przez Babel w przeglądarce).
- `generate.py`: Skrypt do generowania assetów graficznych.
- `assets.yaml`: Definicje kart i pakiety.
- `recipes.csv`: Przepisy rzemieślnicze.
- `quests.json`: Zadania do wykonania.

### Konfiguracja klucza API

**Windows (PowerShell):**
```powershell
$env:OPENAI_API_KEY = "sk-..."
```

**Windows (CMD):**
```cmd
set OPENAI_API_KEY=sk-...
```

**Linux / macOS:**
```bash
export OPENAI_API_KEY="sk-..."
```

Dla Midjourney (Replicate):
```bash
export REPLICATE_API_KEY="r8_..."
```

---

### Użycie

```bash
# Wygeneruj wszystkie karty przez DALL-E 3 (domyślny model)
python generate.py --model dalle

# Wygeneruj wszystkie karty przez Midjourney (Replicate)
python generate.py --model midjourney

# Wygeneruj tylko jedną kartę
python generate.py --model dalle --card villager

# Wymusz nadpisanie istniejących plików
python generate.py --model dalle --force
```

Obrazki trafiają do folderu `assets/` (tworzony automatycznie):
```
assets/
  villager.png
  berry_bush.png
  tree.png
  ... (18 kart)
```

---

## 📁 Struktura projektu

```
stacklands/
├── index.html       ← Gra (statyczna, otwórz w przeglądarce)
├── generate.py      ← Generator assetów (DALL-E / Midjourney)
├── assets.yaml      ← Definicje kart i prompty dla AI
├── recipes.csv      ← Logika craftingu
├── quests.json      ← Questy i nagrody
├── stacklands.jsx   ← Komponent React (wersja deweloperska / archiwum)
└── assets/
    ├── villager.png
    └── ...          ← Generowane przez generate.py
```

> **Uwaga:** `stacklands.jsx` to osobna wersja komponentu React.
> Aktywna gra jest w całości zawarta w `index.html` i nie korzysta z tego pliku.

---

## 🎮 Jak grać

| Akcja | Opis |
|-------|------|
| **Przeciągnij kartę** na inną | Rozpoczyna craftowanie według receptury |
| **Pasek postępu** na karcie | Pokazuje czas do ukończenia craftu |
| **Pakiety** (górny pasek) | Kup za złoto, by dostać nowe karty |
| **📖 Receptury** | Przycisk w prawym dolnym rogu |
| **Panel questów** | Lewy panel — śledzenie postępu |

### Przykładowe receptury

| Składniki | Wynik | Czas |
|-----------|-------|------|
| Wieśniak + Krzak jagód | Jagody | 5s |
| Wieśniak + Drzewo | Drewno | 10s |
| Drewno + Kamień | Ognisko | 8s |
| Drewno + Drewno | Dom | 20s |
| Wieśniak + Ognisko | Złoto | 10s |
