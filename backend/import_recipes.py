"""
Recipe Import Script
Deletes all existing recipes and imports 25 new cocktail recipes
"""

from app import app
from models import db, Recipe, Pump
import json

# Map ingredient names to pump IDs (you'll need to adjust based on actual pump setup)
PUMP_MAPPING = {
    'Vodka': 1,
    'Gin': 2,
    'White Rum': 3,
    'Tequila': 4,
    'Triple Sec': 5,
    'Lime': 6,
    'Cranberry': 7,
    'Simple Syrup': 8,
}

# Recipe data organized by category
RECIPES = {
    'classic': [
        {
            'name': 'Margarita',
            'description': 'Classic tequila citrus cocktail—sharp, bright, and iconic.',
            'ingredients': {'Tequila': 50, 'Triple Sec': 25, 'Lime': 25, 'Simple Syrup': 10}
        },
        {
            'name': "Tommy's Margarita",
            'description': 'Cleaner Margarita style—tequila, lime, and sweetness only.',
            'ingredients': {'Tequila': 60, 'Lime': 25, 'Simple Syrup': 15}
        },
        {
            'name': 'Daiquiri',
            'description': 'Crisp rum sour—simple, elegant, and insanely drinkable.',
            'ingredients': {'White Rum': 60, 'Lime': 25, 'Simple Syrup': 15}
        },
        {
            'name': 'Gimlet',
            'description': 'Gin-forward citrus hit—fresh, sharp, and classy.',
            'ingredients': {'Gin': 60, 'Lime': 25, 'Simple Syrup': 15}
        },
        {
            'name': 'Vodka Sour',
            'description': 'Smooth citrus vodka cocktail—balanced and crowd-friendly.',
            'ingredients': {'Vodka': 60, 'Lime': 25, 'Simple Syrup': 15}
        },
        {
            'name': 'Tequila Sour',
            'description': 'A tequila twist on a sour—punchy and refreshing.',
            'ingredients': {'Tequila': 60, 'Lime': 25, 'Simple Syrup': 15}
        },
        {
            'name': 'Rum Sour',
            'description': 'Rum-based sour—light, tangy, and easy to drink.',
            'ingredients': {'White Rum': 60, 'Lime': 25, 'Simple Syrup': 15}
        },
        {
            'name': 'White Lady',
            'description': 'Citrus-forward gin cocktail with orange notes—clean and premium.',
            'ingredients': {'Gin': 45, 'Triple Sec': 20, 'Lime': 20, 'Simple Syrup': 10}
        },
        {
            'name': 'Kamikaze',
            'description': 'A classic party shooter-style cocktail—strong, zesty, direct.',
            'ingredients': {'Vodka': 40, 'Triple Sec': 20, 'Lime': 20}
        },
        {
            'name': 'Cosmopolitan',
            'description': 'The famous pink cocktail—citrusy, lightly sweet, and smooth.',
            'ingredients': {'Vodka': 45, 'Triple Sec': 15, 'Lime': 15, 'Cranberry': 30}
        },
        {
            'name': 'Cranberry Margarita',
            'description': 'Margarita with a fruity cranberry edge—bold and fun.',
            'ingredients': {'Tequila': 45, 'Triple Sec': 20, 'Lime': 20, 'Cranberry': 30}
        },
        {
            'name': 'Ocean Breeze',
            'description': 'Light, fruity, and super approachable—easy crowd-pleaser.',
            'ingredients': {'Vodka': 45, 'Triple Sec': 15, 'Cranberry': 60, 'Lime': 15}
        },
    ],
    'highball': [
        {
            'name': 'Vodka Soda Lime',
            'description': 'Clean and ultra-refreshing—light, fizzy, and sharp.',
            'ingredients': {'Vodka': 50, 'Lime': 15}
        },
        {
            'name': 'Gin Rickey',
            'description': 'The classic gin & lime highball—crisp, dry, and bubbly.',
            'ingredients': {'Gin': 50, 'Lime': 20}
        },
        {
            'name': 'Tequila Highball',
            'description': 'Tequila + lime + soda—simple, fresh, and dangerously easy.',
            'ingredients': {'Tequila': 50, 'Lime': 15}
        },
        {
            'name': 'Rum Soda',
            'description': 'Light rum highball—clean, fizzy, and refreshing.',
            'ingredients': {'White Rum': 50, 'Lime': 15}
        },
        {
            'name': 'Vodka Cran Soda',
            'description': 'Fruity, fizzy vodka drink—sweet-tart and super popular.',
            'ingredients': {'Vodka': 45, 'Cranberry': 80, 'Lime': 10}
        },
        {
            'name': 'Gin Cran Soda',
            'description': 'Cranberry gin spritz vibe—fresh, slightly dry, and bright.',
            'ingredients': {'Gin': 45, 'Cranberry': 80, 'Lime': 10}
        },
        {
            'name': 'Tequila Cran Soda',
            'description': 'Tequila with cranberry sparkle—bold, fruity, and clean.',
            'ingredients': {'Tequila': 45, 'Cranberry': 80, 'Lime': 10}
        },
        {
            'name': 'Rum Cran Soda',
            'description': 'Rum + cranberry fizz—light tropical energy without being too sweet.',
            'ingredients': {'White Rum': 45, 'Cranberry': 80, 'Lime': 10}
        },
        {
            'name': 'Pink Spritz',
            'description': 'A bubbly citrus-cran drink—easy, playful, and smooth.',
            'ingredients': {'Vodka': 30, 'Triple Sec': 15, 'Cranberry': 60, 'Lime': 10}
        },
        {
            'name': 'Citrus Gin Fizz',
            'description': 'Bright gin fizz style—orange-citrus lift with a clean finish.',
            'ingredients': {'Gin': 45, 'Triple Sec': 15, 'Lime': 15, 'Simple Syrup': 10}
        },
    ],
    'shot': [
        {
            'name': 'Vodka Shot',
            'description': 'Straight vodka—clean, sharp, and simple.',
            'ingredients': {'Vodka': 40}
        },
        {
            'name': 'Tequila Shot',
            'description': 'Straight tequila—classic party shot with bold kick.',
            'ingredients': {'Tequila': 40}
        },
        {
            'name': 'White Rum Shot',
            'description': 'Straight white rum—smooth, light, and easy.',
            'ingredients': {'White Rum': 40}
        },
    ]
}

def import_recipes():
    with app.app_context():
        # Step 1: Get current pump configuration
        pumps = Pump.query.all()
        print(f"\n=== Current Pump Configuration ===")
        for pump in pumps:
            print(f"Pump {pump.id}: {pump.ingredient_name} (Alcohol: {pump.is_alcohol}, Active: {pump.is_active})")
        
        # Build mapping based on actual pump names
        pump_map = {}
        for pump in pumps:
            pump_map[pump.ingredient_name] = pump.id
        
        print(f"\n=== Pump Mapping ===")
        print(pump_map)
        
        # Step 2: Delete all existing recipes
        deleted_count = Recipe.query.delete()
        db.session.commit()
        print(f"\n=== Deleted {deleted_count} existing recipes ===")
        
        # Step 3: Insert new recipes
        total_created = 0
        
        for category, recipes in RECIPES.items():
            print(f"\n=== Inserting {category.upper()} recipes ===")
            for recipe_data in recipes:
                # Convert ingredient names to pump IDs
                ingredients_json = {}
                for ing_name, ml in recipe_data['ingredients'].items():
                    if ing_name in pump_map:
                        ingredients_json[str(pump_map[ing_name])] = ml
                    else:
                        print(f"WARNING: Ingredient '{ing_name}' not found in pumps. Skipping recipe '{recipe_data['name']}'")
                        break
                else:
                    # All ingredients found, create recipe
                    new_recipe = Recipe(
                        name=recipe_data['name'],
                        description=recipe_data['description'],
                        points_reward=10,  # Will be auto-calculated based on alcohol
                        category=category,
                        ingredients_json=json.dumps(ingredients_json)
                    )
                    db.session.add(new_recipe)
                    total_created += 1
                    print(f"✓ Created: {recipe_data['name']}")
        
        # Commit all recipes
        db.session.commit()
        print(f"\n=== Successfully imported {total_created} recipes ===")
        
        # Verify
        classic_count = Recipe.query.filter_by(category='classic').count()
        highball_count = Recipe.query.filter_by(category='highball').count()
        shot_count = Recipe.query.filter_by(category='shot').count()
        
        print(f"\nFinal counts:")
        print(f"  Classic Cocktails: {classic_count}")
        print(f"  Highballs: {highball_count}")
        print(f"  Shots: {shot_count}")
        print(f"  Total: {classic_count + highball_count + shot_count}")

if __name__ == '__main__':
    import_recipes()
