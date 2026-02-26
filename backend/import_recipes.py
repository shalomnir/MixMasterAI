"""
Recipe Import Script — MixMasterAI v2
Uses sqlite3 directly (no Flask/venv required).

Usage:
    python backend/import_recipes.py          # auto-detects DB location
    python backend/import_recipes.py /path/to/cocktails.db   # explicit path

Pump mapping:
  1=Vodka  2=Gin  3=Tequila Blanco  4=Pineapple Juice
  5=Triple Sec  6=Lime Juice  7=Simple Syrup  8=Cranberry Juice
"""

import json
import os
import sqlite3
import sys

# ── Recipe data ────────────────────────────────────────────────────────────
RECIPES = [
    # Classics
    ('Classic Margarita',              'Shake with ice, strain into salt-rimmed glass.',   'classic',  {3:60, 5:30, 6:30, 7:15}),
    ('Cosmopolitan',                   'Shake with ice, strain into chilled glass.',        'classic',  {1:45, 5:15, 6:15, 8:30}),
    ('Gimlet',                         'Stir or shake with ice, strain.',                  'classic',  {2:60, 6:22, 7:22}),
    ('Pineapple Margarita',            'Tropical twist on the classic.',                   'classic',  {3:50, 4:45, 6:20, 7:15}),
    ('Lemon Drop Martini',             'Serve in a sugar-rimmed glass.',                   'classic',  {1:60, 5:15, 6:25, 7:25}),
    ('Bay Breeze',                     'Build over ice, no shaking required.',              'classic',  {1:60, 4:60, 8:60}),
    ('White Lady',                     'A gin-based sour classic.',                        'classic',  {2:45, 5:25, 6:20}),
    ('Tequila Sunrise (Machine Style)',"Cranberry provides the 'sunset' effect.",          'classic',  {3:60, 4:90, 8:15}),
    # Highballs
    ('Gin Fizz',                       'Pour base over ice, fill rest with soda.',         'highball', {2:45, 6:30, 7:30}),
    ('Tom Collins',                    'Classic tall refreshing drink.',                   'highball', {2:60, 6:22, 7:15}),
    ('Vodka Collins',                  'Neutral and refreshing.',                          'highball', {1:60, 6:30, 7:30}),
    ('Tequila Collins',                'Agave notes with bubbles.',                        'highball', {3:60, 6:30, 7:20}),
    ('Tropical Gin Juice',             'Gin with a pineapple kick.',                       'highball', {2:45, 4:60, 6:15}),
    ('Cranberry Gin Fizz',             'Beautiful pink refreshing drink.',                 'highball', {2:45, 8:30, 6:15, 7:15}),
    ('Pineapple Express',              'Vodka, pineapple and orange notes.',               'highball', {1:60, 4:60, 5:15}),
    ('Holiday Highball',               'Perfect for festive parties.',                     'highball', {3:45, 8:45, 6:15, 7:15}),
    # Shots
    ('Kamikaze Shot',                  'The ultimate party shot.',                         'shot',     {1:20, 5:20, 6:20}),
    ('Mexican Lemonade Shot',          'Fast Tequila Sour shot.',                          'shot',     {3:30, 6:15, 7:15}),
    ('Pink Gin Shot',                  'Tart and punchy.',                                 'shot',     {2:30, 8:15, 6:10}),
    ('Pineapple Upside Down',          'Sweet dessert-style shot.',                        'shot',     {1:30, 4:20, 7:10}),
]


def find_db():
    """Try common locations for cocktails.db."""
    candidates = [
        # relative to script location
        os.path.join(os.path.dirname(__file__), 'cocktails.db'),
        # Docker / production path
        '/home/nirsh/MixMasterAI/backend/cocktails.db',
        '/app/cocktails.db',
        # relative to cwd
        'backend/cocktails.db',
        'cocktails.db',
    ]
    for p in candidates:
        if os.path.exists(p):
            return p
    return None


def main():
    # Allow explicit path via CLI arg
    if len(sys.argv) > 1:
        db_path = sys.argv[1]
    else:
        db_path = find_db()

    if not db_path or not os.path.exists(db_path):
        print("ERROR: Could not find cocktails.db")
        print("Pass the path explicitly:  python import_recipes.py /path/to/cocktails.db")
        sys.exit(1)

    print(f"Using DB: {db_path}")
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # Ensure recipe table exists (basic check)
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='recipe'")
    if not cur.fetchone():
        print("ERROR: 'recipe' table not found. Is this the right database?")
        conn.close()
        sys.exit(1)

    # Step 1: Delete all existing recipes
    cur.execute("DELETE FROM recipe")
    deleted = cur.rowcount
    print(f"\nDeleted {deleted} existing recipes.")

    # Step 2: Insert new recipes
    for name, description, category, ingredients in RECIPES:
        ingredients_json = json.dumps({str(k): float(v) for k, v in ingredients.items()})
        cur.execute(
            "INSERT INTO recipe (name, description, category, ingredients_json, points_reward) VALUES (?, ?, ?, ?, 0)",
            (name, description, category, ingredients_json)
        )
        print(f"  ✓ [{category:8s}] {name}")

    conn.commit()
    conn.close()

    print(f"\nSuccessfully imported {len(RECIPES)} recipes.")


if __name__ == '__main__':
    main()
