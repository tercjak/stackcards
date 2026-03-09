#!/usr/bin/env python3
"""
generate.py – Stacklands Asset Generator
Reads llm_prompt from assets.yaml and generates card textures
via DALL-E 3 or Midjourney (via replicate).

Usage:
  python generate.py --model dalle      # use OpenAI DALL-E 3
  python generate.py --model midjourney # use Replicate/Midjourney
  python generate.py --card villager    # generate single card
  python generate.py --all              # generate all cards
"""

import os
import sys
import argparse
import yaml
import requests
import base64
from pathlib import Path

# ── ENV KEYS ──────────────────────────────────────────────────────────────────
OPENAI_API_KEY    = os.environ.get("OPENAI_API_KEY")
REPLICATE_API_KEY = os.environ.get("REPLICATE_API_KEY")

# ── PATH CONFIGURATION ────────────────────────────────────────────────────────
# Pobiera bezwzględną ścieżkę do folderu, w którym znajduje się ten skrypt
BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "assets"
OUTPUT_DIR.mkdir(exist_ok=True)

def load_cards(yaml_filename: str = "assets.yaml") -> list[dict]:
    # Szukaj pliku yaml w tym samym folderze co skrypt
    yaml_path = BASE_DIR / yaml_filename
    
    if not yaml_path.exists():
        print(f"❌ BŁĄD: Nie znaleziono pliku {yaml_path}")
        return []

    with open(yaml_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return data.get("cards", [])


# ── DALL-E 3 ──────────────────────────────────────────────────────────────────
def generate_dalle(card: dict) -> bytes:
    if not OPENAI_API_KEY:
        raise EnvironmentError("OPENAI_API_KEY not set in environment.")

    # Removed 512x512 mentioned in implementation plan to avoid confusion with size: 1024x1024
    prompt = (
        f"{card['llm_prompt']}. "
        "Style: flat 2D card game illustration, cream/parchment background, "
        "black line art, Stacklands game aesthetic, no text."
    )

    try:
        response = requests.post(
            "https://api.openai.com/v1/images/generations",
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "dall-e-3",
                "prompt": prompt,
                "n": 1,
                "size": "1024x1024",
                "response_format": "b64_json",
                "quality": "standard",
            },
            timeout=60,
        )
        if response.status_code != 200:
            print(f"   API Error {response.status_code}: {response.text}")
        response.raise_for_status()
        b64 = response.json()["data"][0]["b64_json"]
        return base64.b64decode(b64)
    except Exception as e:
        raise RuntimeError(f"DALL-E request failed: {e}")


# ── MIDJOURNEY via Replicate ──────────────────────────────────────────────────
def generate_midjourney(card: dict) -> bytes:
    """
    Uses replicate.com API to call a Midjourney-compatible model
    (e.g. stability-ai/stable-diffusion or similar).
    Replace model version as needed.
    """
    if not REPLICATE_API_KEY:
        raise EnvironmentError("REPLICATE_API_KEY not set in environment.")

    import replicate  # pip install replicate

    prompt = (
        f"{card['llm_prompt']}, "
        "flat 2D card game art, cream parchment background, "
        "black ink line art, Stacklands style, centered, no text --v 6 --ar 1:1"
    )

    output = replicate.run(
        # Swap for your preferred model:
        "stability-ai/sdxl:39ed52f2319f9b0b5de3a16d2edd73cbbf29520c",
        input={
            "prompt": prompt,
            "width": 512,
            "height": 512,
            "num_outputs": 1,
            "guidance_scale": 7.5,
        },
    )

    # replicate returns a list of URLs
    img_url = output[0]
    resp = requests.get(img_url, timeout=30)
    resp.raise_for_status()
    return resp.content


# ── MAIN ──────────────────────────────────────────────────────────────────────
def save_card_image(card: dict, image_bytes: bytes):
    out_path = OUTPUT_DIR / f"{card['id']}.png"
    out_path.write_bytes(image_bytes)
    print(f"   Saved: {out_path}")


def run(args):
    cards = load_cards("assets.yaml")

    if args.card:
        cards = [c for c in cards if c["id"] == args.card]
        if not cards:
            print(f"Card '{args.card}' not found in assets.yaml")
            sys.exit(1)

    generator = generate_dalle if args.model == "dalle" else generate_midjourney

    print(f" Generating {len(cards)} card(s) with {args.model.upper()}...\n")

    for card in cards:
        out_path = OUTPUT_DIR / f"{card['id']}.png"
        if out_path.exists() and not args.force:
            print(f"  Skip (exists): {out_path}")
            continue

        print(f"    Generating: {card['id']} ({card['name']})")
        print(f"      Prompt: {card['llm_prompt'][:80]}...")
        try:
            image_bytes = generator(card)
            save_card_image(card, image_bytes)
        except Exception as e:
            print(f"   Error for {card['id']}: {e}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Stacklands asset generator")
    parser.add_argument(
        "--model",
        choices=["dalle", "midjourney"],
        default="dalle",
        help="AI model to use for generation",
    )
    parser.add_argument(
        "--card",
        type=str,
        default=None,
        help="Generate only a specific card by ID",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Generate all cards (default behavior)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite existing assets",
    )
    args = parser.parse_args()
    run(args)
