#!/usr/bin/env python3
import os
import sys
import argparse
import yaml
import requests
import time
from pathlib import Path

# --- KONFIGURACJA SCIEZEK ---
BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "assets"
OUTPUT_DIR.mkdir(exist_ok=True)

OPENAI_API_KEY    = os.environ.get("OPENAI_API_KEY")
REPLICATE_API_KEY = os.environ.get("REPLICATE_API_KEY")

def load_cards(yaml_filename: str = "assets.yaml") -> list[dict]:
    yaml_path = BASE_DIR / yaml_filename
    if not yaml_path.exists():
        print(f"Blad: Nie znaleziono pliku {yaml_path}")
        return []
    with open(yaml_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return data.get("cards", [])

# --- DALL-E 3 ---
def generate_dalle(card: dict) -> bytes:
    if not OPENAI_API_KEY:
        raise EnvironmentError("Brak OPENAI_API_KEY.")
    
    prompt = f"{card['llm_prompt']}. Style: flat 2D card game illustration, Stacklands aesthetic."
    
    response = requests.post(
        "https://api.openai.com/v1/images/generations",
        headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
        json={"model": "dall-e-3", "prompt": prompt, "n": 1, "size": "1024x1024"},
        timeout=60
    )
    response.raise_for_status()
    img_url = response.json()["data"][0]["url"]
    return requests.get(img_url).content

# --- REPLICATE (Uniwersalny generator) ---
def generate_replicate_model(card: dict, model_version: str) -> bytes:
    if not REPLICATE_API_KEY:
        raise EnvironmentError("Brak REPLICATE_API_KEY.")

    headers = {
        "Authorization": f"Token {REPLICATE_API_KEY}",
        "Content-Type": "application/json"
    }

    # Zmieniony payload: usunieto sztywne wymiary 512x512, ktore mogly powodowac blad 422
    payload = {
        "version": model_version,
        "input": {
            "prompt": f"{card['llm_prompt']}, Stacklands game style, flat 2D art, cream background",
            "scheduler": "K_EULER",
            "guidance_scale": 7.5,
            "num_inference_steps": 30
        }
    }
    
    resp = requests.post("https://api.replicate.com/v1/predictions", headers=headers, json=payload)
    if resp.status_code != 201:
        raise RuntimeError(f"Replicate API Error {resp.status_code}: {resp.text}")
    
    prediction = resp.json()
    poll_url = prediction["urls"]["get"]
    
    while prediction["status"] not in ["succeeded", "failed"]:
        time.sleep(2)
        prediction = requests.get(poll_url, headers=headers).json()

    if prediction["status"] == "failed":
        raise RuntimeError("Generowanie Replicate nie powiodlo sie.")

    return requests.get(prediction["output"][0]).content

def run(args):
    cards = load_cards()
    if args.card:
        cards = [c for c in cards if c["id"] == args.card]

    for card in cards:
        out_path = OUTPUT_DIR / f"{card['id']}.png"
        if out_path.exists() and not args.force:
            print(f"Pominieto: {card['id']}")
            continue

        print(f"Generowanie: {card['id']} przy uzyciu {args.model}...")
        try:
            if args.model == "dalle":
                image_bytes = generate_dalle(card)
            elif args.model == "midjourney":
                # SDXL model version
                image_bytes = generate_replicate_model(card, "39ed52f2319f9b0b5de3a16d2edd73cbbf29520c")
            elif args.model == "nano_banana":
                # Szybki model Flux (czesto uzywany jako alternatywa)
                image_bytes = generate_replicate_model(card, "a840003b307ec3269b9f71c1209e99276d47b59e51c911075677b6932e64673b")
            
            out_path.write_bytes(image_bytes)
            print(f"Zapisano w: {out_path}")
        except Exception as e:
            print(f"Blad {card['id']}: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", choices=["dalle", "midjourney", "nano_banana"], default="dalle")
    parser.add_argument("--card", type=str)
    parser.add_argument("--force", action="store_true")
    run(parser.parse_args())