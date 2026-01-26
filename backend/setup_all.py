"""
Setup Pumps and Import Recipes
This script will:
1. Configure the 8 pumps with the correct ingredients
2. Delete all existing recipes
3. Import the 25 new recipes
"""

from app import app
from models import db, Recipe, Pump
import json

def setup_pumps_and_recipes():
    with app.app_context():
        # Step 1: Configure pumps
        print("=== Configuring Pumps ===")
        pump_config = [
            {'id': 1, 'name': 'Vodka', 'is_alcohol': True},
            {'id': 2, 'name': 'Gin', 'is_alcohol': True},
            {'id': 3, 'name': 'White Rum', 'is_alcohol': True},
            {'id': 4, 'name': 'Tequila', 'is_alcohol': True},
            {'id': 5, 'name': 'Triple Sec', 'is_alcohol': True},
            {'id': 6, 'name': 'Lime', 'is_alcohol': False},
            {'id': 7, 'name': 'Cranberry', 'is_alcohol': False},
            {'id': 8, 'name': 'Simple Syrup', 'is_alcohol': False},
        ]
        
        for config in pump_config:
            pump = Pump.query.get(config['id'])
            if pump:
                pump.ingredient_name = config['name']
                pump.is_alcohol = config['is_alcohol']
                pump.is_active = True
                pump.is_virtual = False
                print(f"✓ Updated Pump {config['id']}: {config['name']} (Alcohol: {config['is_alcohol']})")
            else:
                # Create pump if it doesn't exist
                new_pump = Pump(
                    id=config['id'],
                    ingredient_name=config['name'],
                    is_alcohol=config['is_alcohol'],
                    is_active=True,
                    is_virtual=False,
                    seconds_per_50ml=3.0
                )
                db.session.add(new_pump)
                print(f"✓ Created Pump {config['id']}: {config['name']}")
        
        db.session.commit()
        
        # Step 2: Delete existing recipes
        deleted_count = Recipe.query.delete()
        db.session.commit()
        print(f"\n=== Deleted {deleted_count} existing recipes ===\n")
        
        # Step 3: Define all recipes
        recipes = [
            # CLASSIC COCKTAILS
            ('classic', 'Margarita', 'Classic tequila citrus cocktail—sharp, bright, and iconic.', {4: 50, 5: 25, 6: 25, 8: 10}),
            ('classic', "Tommy's Margarita", 'Cleaner Margarita style—tequila, lime, and sweetness only.', {4: 60, 6: 25, 8: 15}),
            ('classic', 'Daiquiri', 'Crisp rum sour—simple, elegant, and insanely drinkable.', {3: 60, 6: 25, 8: 15}),
            ('classic', 'Gimlet', 'Gin-forward citrus hit—fresh, sharp, and classy.', {2: 60, 6: 25, 8: 15}),
            ('classic', 'Vodka Sour', 'Smooth citrus vodka cocktail—balanced and crowd-friendly.', {1: 60, 6: 25, 8: 15}),
            ('classic', 'Tequila Sour', 'A tequila twist on a sour—punchy and refreshing.', {4: 60, 6: 25, 8: 15}),
            ('classic', 'Rum Sour', 'Rum-based sour—light, tangy, and easy to drink.', {3: 60, 6: 25, 8: 15}),
            ('classic', 'White Lady', 'Citrus-forward gin cocktail with orange notes—clean and premium.', {2: 45, 5: 20, 6: 20, 8: 10}),
            ('classic', 'Kamikaze', 'A classic party shooter-style cocktail—strong, zesty, direct.', {1: 40, 5: 20, 6: 20}),
            ('classic', 'Cosmopolitan', 'The famous pink cocktail—citrusy, lightly sweet, and smooth.', {1: 45, 5: 15, 6: 15, 7: 30}),
            ('classic', 'Cranberry Margarita', 'Margarita with a fruity cranberry edge—bold and fun.', {4: 45, 5: 20, 6: 20, 7: 30}),
            ('classic', 'Ocean Breeze', 'Light, fruity, and super approachable—easy crowd-pleaser.', {1: 45, 5: 15, 7: 60, 6: 15}),
            
            # HIGHBALLS
            ('highball', 'Vodka Soda Lime', 'Clean and ultra-refreshing—light, fizzy, and sharp.', {1: 50, 6: 15}),
            ('highball', 'Gin Rickey', 'The classic gin & lime highball—crisp, dry, and bubbly.', {2: 50, 6: 20}),
            ('highball', 'Tequila Highball', 'Tequila + lime + soda—simple, fresh, and dangerously easy.', {4: 50, 6: 15}),
            ('highball', 'Rum Soda', 'Light rum highball—clean, fizzy, and refreshing.', {3: 50, 6: 15}),
            ('highball', 'Vodka Cran Soda', 'Fruity, fizzy vodka drink—sweet-tart and super popular.', {1: 45, 7: 80, 6: 10}),
            ('highball', 'Gin Cran Soda', 'Cranberry gin spritz vibe—fresh, slightly dry, and bright.', {2: 45, 7: 80, 6: 10}),
            ('highball', 'Tequila Cran Soda', 'Tequila with cranberry sparkle—bold, fruity, and clean.', {4: 45, 7: 80, 6: 10}),
            ('highball', 'Rum Cran Soda', 'Rum + cranberry fizz—light tropical energy without being too sweet.', {3: 45, 7: 80, 6: 10}),
            ('highball', 'Pink Spritz', 'A bubbly citrus-cran drink—easy, playful, and smooth.', {1: 30, 5: 15, 7: 60, 6: 10}),
            ('highball', 'Citrus Gin Fizz', 'Bright gin fizz style—orange-citrus lift with a clean finish.', {2: 45, 5: 15, 6: 15, 8: 10}),
            
            # SHOTS
            ('shot', 'Vodka Shot', 'Straight vodka—clean, sharp, and simple.', {1: 40}),
            ('shot', 'Tequila Shot', 'Straight tequila—classic party shot with bold kick.', {4: 40}),
            ('shot', 'White Rum Shot', 'Straight white rum—smooth, light, and easy.', {3: 40}),
        ]
        
        # Step 4: Create recipes
        created_by_category = {'classic': 0, 'highball': 0, 'shot': 0}
        
        for category, name, description, ingredients in recipes:
            # Convert ingredients dict to JSON string format
            ingredients_json = json.dumps({str(k): v for k, v in ingredients.items()})
            
            new_recipe = Recipe(
                name=name,
                description=description,
                points_reward=10,  # Auto-calculated based on alcohol
                category=category,
                ingredients_json=ingredients_json
            )
            db.session.add(new_recipe)
            created_by_category[category] += 1
            print(f"✓ Created [{category.upper()}]: {name}")
        
        db.session.commit()
        
        print(f"\n=== Import Complete ===")
        print(f"Classic Cocktails: {created_by_category['classic']}")
        print(f"Highballs: {created_by_category['highball']}")
        print(f"Shots: {created_by_category['shot']}")
        print(f"Total: {sum(created_by_category.values())}")

if __name__ == '__main__':
    setup_pumps_and_recipes()
