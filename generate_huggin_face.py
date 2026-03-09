#!/usr/bin/env python3
import os
import sys
import argparse
import yaml
import requests
import time
from pathlib import Path

# --- KONFIGURACJA SCIEZEK ---
# Path(__file__).resolve().parent gwarantuje, ze assets powstanie w folderze skryptu
BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "assets"
OUTPUT_DIR.mkdir(exist_ok=True)

# Pobieranie klucza ze zmiennych srodowiskowych
HF_API_KEY = os.environ.get("HF_API_KEY")

def load_cards(yaml_filename: str = "assets.yaml") -> list[dict]:
    yaml_path = BASE_DIR / yaml_filename
    if not yaml_path.exists():
        print(f"Blad: Nie znaleziono pliku {yaml_path}")
        return []
    with open(yaml_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return data.get("cards", [])

def generate_huggingface(card: dict) -> bytes:
    if not HF_API_KEY:
        raise EnvironmentError("Blad: Zmienna srodowiskowa HF_API_KEY nie jest ustawiona.")

    # Zaktualizowany URL routera
    API_URL = "https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-xl-base-1.0"
    headers = {"Authorization": f"Bearer {HF_API_KEY}"}

    prompt = (
        f"{card['llm_prompt']}, Stacklands game style, flat 2D vector art, "
        "black outlines, isolated on parchment background, vertical composition"
    )

    payload = {
        "inputs": prompt,
        "parameters": {
            "negative_prompt": "realistic, 3d, photo, shading, complex background, text, watermark",
            "width": 768,
            "height": 1024  
        },
        "options": {"wait_for_model": True}
    }

    response = requests.post(API_URL, headers=headers, json=payload, timeout=120)
    
    if response.status_code != 200:
        raise RuntimeError(f"HuggingFace API Error {response.status_code}: {response.text}")
        
    return response.content

def run(args):
    cards = load_cards()
    if args.card:
        cards = [c for c in cards if c["id"] == args.card]

    if not cards:
        print("Nie znaleziono kart do przetworzenia.")
        return

    print(f"Start generowania ({len(cards)} kart) przez Hugging Face...")

    for card in cards:
        out_path = OUTPUT_DIR / f"{card['id']}.png"
        if out_path.exists() and not args.force:
            print(f"Pominieto: {card['id']}")
            continue

        print(f"Przetwarzanie: {card['id']}...")
        try:
            image_bytes = generate_huggingface(card)
            out_path.write_bytes(image_bytes)
            print(f"Zapisano: {out_path}")
        except Exception as e:
            print(f"Blad {card['id']}: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--card", type=str, help="ID karty z assets.yaml")
    parser.add_argument("--force", action="store_true", help="Nadpisz pliki")
    run(parser.parse_args())