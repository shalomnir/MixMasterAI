"""
Recipe Import Script — MixMasterAI v2
Deletes all existing recipes and imports 20 new cocktail recipes.

Pump mapping:
  pump_1 = Vodka
  pump_2 = Gin
  pump_3 = Tequila Blanco
  pump_4 = Pineapple Juice
  pump_5 = Triple Sec
  pump_6 = Lime Juice
  pump_7 = Simple Syrup
  pump_8 = Cranberry Juice
"""

from app import app
from models import db, Recipe
import json

# Ingredients use pump_N keys → we store just the integer N as the key.
# Category values must match DB: 'classic', 'highball', 'shot'.
RECIPES = [
    # ── CLASSICS ──────────────────────────────────────────────────
    {
        'name': 'Classic Margarita',
        'description': 'Shake with ice, strain into salt-rimmed glass.',
        'category': 'classic',
        'ingredients': {3: 60, 5: 30, 6: 30, 7: 15},
    },
    {
        'name': 'Cosmopolitan',
        'description': 'Shake with ice, strain into chilled glass.',
        'category': 'classic',
        'ingredients': {1: 45, 5: 15, 6: 15, 8: 30},
    },
    {
        'name': 'Gimlet',
        'description': 'Stir or shake with ice, strain.',
        'category': 'classic',
        'ingredients': {2: 60, 6: 22, 7: 22},
    },
    {
        'name': 'Pineapple Margarita',
        'description': 'Tropical twist on the classic.',
        'category': 'classic',
        'ingredients': {3: 50, 4: 45, 6: 20, 7: 15},
    },
    {
        'name': 'Lemon Drop Martini',
        'description': 'Serve in a sugar-rimmed glass.',
        'category': 'classic',
        'ingredients': {1: 60, 5: 15, 6: 25, 7: 25},
    },
    {
        'name': 'Bay Breeze',
        'description': 'Build over ice, no shaking required.',
        'category': 'classic',
        'ingredients': {1: 60, 4: 60, 8: 60},
    },
    {
        'name': 'White Lady',
        'description': 'A gin-based sour classic.',
        'category': 'classic',
        'ingredients': {2: 45, 5: 25, 6: 20},
    },
    {
        'name': 'Tequila Sunrise (Machine Style)',
        'description': "Cranberry provides the 'sunset' effect.",
        'category': 'classic',
        'ingredients': {3: 60, 4: 90, 8: 15},
    },
    # ── HIGHBALLS ─────────────────────────────────────────────────
    {
        'name': 'Gin Fizz',
        'description': 'Pour base over ice, fill rest with soda.',
        'category': 'highball',
        'ingredients': {2: 45, 6: 30, 7: 30},
    },
    {
        'name': 'Tom Collins',
        'description': 'Classic tall refreshing drink.',
        'category': 'highball',
        'ingredients': {2: 60, 6: 22, 7: 15},
    },
    {
        'name': 'Vodka Collins',
        'description': 'Neutral and refreshing.',
        'category': 'highball',
        'ingredients': {1: 60, 6: 30, 7: 30},
    },
    {
        'name': 'Tequila Collins',
        'description': 'Agave notes with bubbles.',
        'category': 'highball',
        'ingredients': {3: 60, 6: 30, 7: 20},
    },
    {
        'name': 'Tropical Gin Juice',
        'description': 'Gin with a pineapple kick.',
        'category': 'highball',
        'ingredients': {2: 45, 4: 60, 6: 15},
    },
    {
        'name': 'Cranberry Gin Fizz',
        'description': 'Beautiful pink refreshing drink.',
        'category': 'highball',
        'ingredients': {2: 45, 8: 30, 6: 15, 7: 15},
    },
    {
        'name': 'Pineapple Express',
        'description': 'Vodka, pineapple and orange notes.',
        'category': 'highball',
        'ingredients': {1: 60, 4: 60, 5: 15},
    },
    {
        'name': 'Holiday Highball',
        'description': 'Perfect for festive parties.',
        'category': 'highball',
        'ingredients': {3: 45, 8: 45, 6: 15, 7: 15},
    },
    # ── SHOTS ─────────────────────────────────────────────────────
    {
        'name': 'Kamikaze Shot',
        'description': 'The ultimate party shot.',
        'category': 'shot',
        'ingredients': {1: 20, 5: 20, 6: 20},
    },
    {
        'name': 'Mexican Lemonade Shot',
        'description': 'Fast Tequila Sour shot.',
        'category': 'shot',
        'ingredients': {3: 30, 6: 15, 7: 15},
    },
    {
        'name': 'Pink Gin Shot',
        'description': 'Tart and punchy.',
        'category': 'shot',
        'ingredients': {2: 30, 8: 15, 6: 10},
    },
    {
        'name': 'Pineapple Upside Down',
        'description': 'Sweet dessert-style shot.',
        'category': 'shot',
        'ingredients': {1: 30, 4: 20, 7: 10},
    },
]


def import_recipes():
    with app.app_context():
        # Step 1: Delete all existing recipes
        deleted_count = Recipe.query.delete()
        db.session.commit()
        print(f"\n=== Deleted {deleted_count} existing recipes ===")

        # Step 2: Insert new recipes
        total_created = 0
        for r in RECIPES:
            ingredients_json = json.dumps({str(k): float(v) for k, v in r['ingredients'].items()})
            new_recipe = Recipe(
                name=r['name'],
                description=r['description'],
                category=r['category'],
                ingredients_json=ingredients_json,
                points_reward=0,  # auto-calculated at pour time
            )
            db.session.add(new_recipe)
            total_created += 1
            print(f"  ✓ {r['category'].upper():10s}  {r['name']}")

        db.session.commit()
        print(f"\n=== Successfully imported {total_created} recipes ===")

        # Verify
        classic_count  = Recipe.query.filter_by(category='classic').count()
        highball_count = Recipe.query.filter_by(category='highball').count()
        shot_count     = Recipe.query.filter_by(category='shot').count()
        print(f"  Classic : {classic_count}")
        print(f"  Highball: {highball_count}")
        print(f"  Shot    : {shot_count}")
        print(f"  Total   : {classic_count + highball_count + shot_count}")


if __name__ == '__main__':
    import_recipes()
