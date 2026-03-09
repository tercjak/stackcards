Gra typu Stackcards jak Stacklands 

store.steampowered.com/app/1948280/Stacklands/
1. Struktura plików
    assets.yaml: Definicje kart, opisy dla LLM (do generowania grafik) i ścieżki do tekstur.
    recipes.csv: Logika craftingu (np. wieśniak + krzak jagód = jagody).
    Card.tsx: Uniwersalny komponent 3D, który renderuje kartę na podstawie danych z YAML.
   generate.py kod ktory wczytuje klucze z zmiennych srodowiskowych i przekazuje llm_prompt by wygenerowac assety w wybranym modelu midjourney/dalle/nano banana
quests.json Logika questów
2. Konfiguracja Zasobów (assets.yaml)
Ten plik służy jako "źródło prawdy" dla gry i instrukcja dla AI.
YAML
cards:
  - id: "villager"
    name: "Wieśniak"
    type: "unit"
    description: "Podstawowa jednostka zbierająca zasoby."
    llm_prompt: "Minimalist icon of a medieval villager, flat vector art, white background"
    texture: "assets/villager.png"
  - id: "berry_bush"
    name: "Krzak jagód"
    type: "resource"
    description: "Źródło pożywienia."
    llm_prompt: "Stylized berry bush with red berries, 2D game asset, isometric view"
    texture: "assets/berries.png"
3. Logika Receptur (recipes.csv)
input_a,input_b,output,time_seconds
villager,berry_bush,berry,5
villager,tree,wood,10
wood,stone,campfire,15
4 Questy Proponowany format: quests.json
JSON
[
  {
    "id": "starter_food",
    "title": "Pierwszy posiłek",
    "description": "Zbierz jagody za pomocą wieśniaka.",
    "requirements": {
      "berry": 5
    },
    "rewards": {
      "gold": 10,
      "unlock_pack": "advanced_farming"
    },
    "is_main_quest": true
  },
  {
    "id": "build_camp",
    "title": "Osada",
    "condition": {
      "type": "proximity",
      "target_a": "villager",
      "target_b": "campfire",
      "count": 2
    },
    "description": "Umieść 2 wieśniaków przy ognisku."
  }
]
