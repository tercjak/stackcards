#!/usr/bin/env python3
"""
generate_qwen.py – Stacklands Asset Generator for Qwen-Image
Reads llm_prompt from assets.yaml and generates card textures via Qwen-Image API.

Usage:
  python generate_qwen.py              # generate all cards with Qwen-Image
  python generate_qwen.py --card martial_arena  # generate single card
  python generate_qwen.py --force      # overwrite existing assets

Requires:
  - DASHSCOPE_API_KEY environment variable set
  - pip install dashscope pyyaml requests
"""

import os
import sys
import argparse
import yaml
import requests
from http import HTTPStatus
from pathlib import Path
from urllib.parse import urlparse, unquote
from dashscope import ImageSynthesis

# Ensure UTF-8 encoding for Windows console
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

# ── ENV KEYS ──────────────────────────────────────────────────────────────────
DASHSCOPE_API_KEY = os.environ.get("DASHSCOPE_API_KEY", "sk-0e4287eafe7d4d68a15d933d3b14633b")

# Set the API endpoint (Singapore region)
import dashscope
dashscope.base_http_api_url = 'https://dashscope-intl.aliyuncs.com/api/v1'

# ── PATH CONFIGURATION ────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "assets"
OUTPUT_DIR.mkdir(exist_ok=True)


def load_cards(yaml_filename: str = "assets.yaml") -> list[dict]:
    """Load card definitions from YAML file."""
    yaml_path = BASE_DIR / yaml_filename

    if not yaml_path.exists():
        print(f"❌ BŁĄD: Nie znaleziono pliku {yaml_path}")
        return []

    with open(yaml_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    # Handle both formats: list directly or dict with 'cards' key
    if isinstance(data, list):
        return data
    elif isinstance(data, dict):
        return data.get("cards", [])
    else:
        print(f"❌ BŁĄD: Nieoczekiwany format YAML: {type(data)}")
        return []


# ── QWEN-IMAGE ────────────────────────────────────────────────────────────────
def generate_qwen_image(card: dict) -> bytes:
    """
    Generate card image using Alibaba DashScope Qwen-Image API.

    Requires DASHSCOPE_API_KEY environment variable.
    """
    if not DASHSCOPE_API_KEY:
        raise EnvironmentError("DASHSCOPE_API_KEY not set in environment.")

    prompt = (
        f"{card['llm_prompt']}. "
        "Style: flat 2D card game illustration, cream/parchment background, "
        "black line art, Stacklands game aesthetic, no text."
    )

    try:
        print(f"   Calling Qwen-Image API...")
        rsp = ImageSynthesis.call(
            api_key=DASHSCOPE_API_KEY,
            model="qwen-image-plus",
            prompt=prompt,
            n=1,
            size='1024*1024',
            watermark=False
        )

        if rsp.status_code != HTTPStatus.OK:
            print(f"   API Error {rsp.status_code}: {rsp.code} - {rsp.message}")
            raise RuntimeError(f"Qwen-Image request failed: {rsp.code} - {rsp.message}")

        # Download the generated image
        for result in rsp.output.results:
            img_url = result.url
            img_response = requests.get(img_url, timeout=30)
            img_response.raise_for_status()
            return img_response.content

    except Exception as e:
        raise RuntimeError(f"Qwen-Image request failed: {e}")


# ── MAIN ──────────────────────────────────────────────────────────────────────
def save_card_image(card: dict, image_bytes: bytes):
    """Save generated image to assets folder."""
    out_path = OUTPUT_DIR / f"{card['id']}.png"
    out_path.write_bytes(image_bytes)
    print(f"   Saved: {out_path}")


def run(args):
    """Main generation loop."""
    cards = load_cards("assets.yaml")

    if args.card:
        cards = [c for c in cards if c["id"] == args.card]
        if not cards:
            print(f"Card '{args.card}' not found in assets.yaml")
            sys.exit(1)

    print(f" Generating {len(cards)} card(s) with Qwen-Image...\n")

    for card in cards:
        out_path = OUTPUT_DIR / f"{card['id']}.png"
        if out_path.exists() and not args.force:
            print(f"  Skip (exists): {out_path}")
            continue

        print(f"    Generating: {card['id']} ({card['name']})")
        print(f"      Prompt: {card['llm_prompt'][:80]}...")
        try:
            image_bytes = generate_qwen_image(card)
            save_card_image(card, image_bytes)
        except Exception as e:
            print(f"   Error for {card['id']}: {e}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Stacklands asset generator for Qwen-Image")
    parser.add_argument(
        "--card",
        type=str,
        default=None,
        help="Generate only a specific card by ID",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite existing assets",
    )
    args = parser.parse_args()
    run(args)
