"""
Import 25 curated cocktail recipes into the AI Cocktail Mixer database.
Categories: Classic Cocktails, Highballs, and Shots.
"""

from app import app
from models import db, Recipe

# Pump mapping (based on current configuration)
PUMPS = {
    'vodka': 1,
    'gin': 2,
    'tequila': 3,  # Note: Currently spelled "Taqila" in DB
    'rum': 4,
    'triple_sec': 5,
    'lime': 6,
    'syrup': 7,
    'cranberry': 8
}

# Recipe data structure
RECIPES = [
    # ===== CLASSIC COCKTAILS (No Soda) =====
    {
        'name': 'Margarita',
        'description': 'Classic tequila citrus cocktail—sharp, bright, and iconic.',
        'category': 'classic',
        'ingredients': {'3': 50, '5': 25, '6': 25, '7': 10}  # Tequila/Triple Sec/Lime/Syrup
    },
    {
        'name': "Tommy's Margarita",
        'description': 'Cleaner Margarita style—tequila, lime, and sweetness only.',
        'category': 'classic',
        'ingredients': {'3': 60, '6': 25, '7': 15}  # Tequila/Lime/Syrup
    },
    {
        'name': 'Daiquiri',
        'description': 'Crisp rum sour—simple, elegant, and insanely drinkable.',
        'category': 'classic',
        'ingredients': {'4': 60, '6': 25, '7': 15}  # Rum/Lime/Syrup
    },
    {
        'name': 'Gimlet',
        'description': 'Gin-forward citrus hit—fresh, sharp, and classy.',
        'category': 'classic',
        'ingredients': {'2': 60, '6': 25, '7': 15}  # Gin/Lime/Syrup
    },
    {
        'name': 'Vodka Sour',
        'description': 'Smooth citrus vodka cocktail—balanced and crowd-friendly.',
        'category': 'classic',
        'ingredients': {'1': 60, '6': 25, '7': 15}  # Vodka/Lime/Syrup
    },
    {
        'name': 'Tequila Sour',
        'description': 'A tequila twist on a sour—punchy and refreshing.',
        'category': 'classic',
        'ingredients': {'3': 60, '6': 25, '7': 15}  # Tequila/Lime/Syrup
    },
    {
        'name': 'Rum Sour',
        'description': 'Rum-based sour—light, tangy, and easy to drink.',
        'category': 'classic',
        'ingredients': {'4': 60, '6': 25, '7': 15}  # Rum/Lime/Syrup
    },
    {
        'name': 'White Lady',
        'description': 'Citrus-forward gin cocktail with orange notes—clean and premium.',
        'category': 'classic',
        'ingredients': {'2': 45, '5': 20, '6': 20, '7': 10}  # Gin/Triple Sec/Lime/Syrup
    },
    {
        'name': 'Kamikaze',
        'description': 'A classic party shooter-style cocktail—strong, zesty, direct.',
        'category': 'classic',
        'ingredients': {'1': 40, '5': 20, '6': 20}  # Vodka/Triple Sec/Lime
    },
    {
        'name': 'Cosmopolitan',
        'description': 'The famous pink cocktail—citrusy, lightly sweet, and smooth.',
        'category': 'classic',
        'ingredients': {'1': 45, '5': 15, '6': 15, '8': 30}  # Vodka/Triple Sec/Lime/Cranberry
    },
    {
        'name': 'Cranberry Margarita',
        'description': 'Margarita with a fruity cranberry edge—bold and fun.',
        'category': 'classic',
        'ingredients': {'3': 45, '5': 20, '6': 20, '8': 30}  # Tequila/Triple Sec/Lime/Cranberry
    },
    {
        'name': 'Ocean Breeze',
        'description': 'Light, fruity, and super approachable—easy crowd-pleaser.',
        'category': 'classic',
        'ingredients': {'1': 45, '5': 15, '8': 60, '6': 15}  # Vodka/Triple Sec/Cranberry/Lime
    },
    
    # ===== HIGHBALLS (With Soda) =====
    # Note: Soda is manual top-up, so we use base recipe amounts
    {
        'name': 'Vodka Soda Lime',
        'description': 'Clean and ultra-refreshing—light, fizzy, and sharp.',
        'category': 'highball',
        'ingredients': {'1': 50, '6': 15}  # Vodka/Lime (Soda topped manually)
    },
    {
        'name': 'Gin Rickey',
        'description': 'The classic gin & lime highball—crisp, dry, and bubbly.',
        'category': 'highball',
        'ingredients': {'2': 50, '6': 20}  # Gin/Lime
    },
    {
        'name': 'Tequila Highball',
        'description': 'Tequila + lime + soda—simple, fresh, and dangerously easy.',
        'category': 'highball',
        'ingredients': {'3': 50, '6': 15}  # Tequila/Lime
    },
    {
        'name': 'Rum Soda',
        'description': 'Light rum highball—clean, fizzy, and refreshing.',
        'category': 'highball',
        'ingredients': {'4': 50, '6': 15}  # Rum/Lime
    },
    {
        'name': 'Vodka Cran Soda',
        'description': 'Fruity, fizzy vodka drink—sweet-tart and super popular.',
        'category': 'highball',
        'ingredients': {'1': 45, '8': 35, '6': 10}  # Vodka/Cranberry/Lime (base for soda top-up)
    },
    {
        'name': 'Gin Cran Soda',
        'description': 'Cranberry gin spritz vibe—fresh, slightly dry, and bright.',
        'category': 'highball',
        'ingredients': {'2': 45, '8': 35, '6': 10}  # Gin/Cranberry/Lime
    },
    {
        'name': 'Tequila Cran Soda',
        'description': 'Tequila with cranberry sparkle—bold, fruity, and clean.',
        'category': 'highball',
        'ingredients': {'3': 45, '8': 35, '6': 10}  # Tequila/Cranberry/Lime
    },
    {
        'name': 'Rum Cran Soda',
        'description': 'Rum + cranberry fizz—light tropical energy without being too sweet.',
        'category': 'highball',
        'ingredients': {'4': 45, '8': 35, '6': 10}  # Rum/Cranberry/Lime
    },
    {
        'name': 'Pink Spritz',
        'description': 'A bubbly citrus-cran drink—easy, playful, and smooth.',
        'category': 'highball',
        'ingredients': {'1': 30, '5': 15, '8': 35, '6': 10}  # Vodka/Triple Sec/Cranberry/Lime
    },
    {
        'name': 'Citrus Gin Fizz',
        'description': 'Bright gin fizz style—orange-citrus lift with a clean finish.',
        'category': 'highball',
        'ingredients': {'2': 45, '5': 15, '6': 15, '7': 10}  # Gin/Triple Sec/Lime/Syrup
    },
    
    # ===== SHOTS =====
    {
        'name': 'Vodka Shot',
        'description': 'Straight vodka—clean, sharp, and simple.',
        'category': 'shot',
        'ingredients': {'1': 40}  # Vodka
    },
    {
        'name': 'Tequila Shot',
        'description': 'Straight tequila—classic party shot with bold kick.',
        'category': 'shot',
        'ingredients': {'3': 40}  # Tequila
    },
    {
        'name': 'White Rum Shot',
        'description': 'Straight white rum—smooth, light, and easy.',
        'category': 'shot',
        'ingredients': {'4': 40}  # Rum
    },
]


def import_recipes():
    """Import all recipes into the database."""
    with app.app_context():
        print(f"Starting import of {len(RECIPES)} recipes...")
        
        imported_count = 0
        skipped_count = 0
        
        for recipe_data in RECIPES:
            # Check if recipe already exists
            existing = Recipe.query.filter_by(name=recipe_data['name']).first()
            
            if existing:
                print(f"  ⚠️  Skipped '{recipe_data['name']}' (already exists)")
                skipped_count += 1
                continue
            
            # Create new recipe
            new_recipe = Recipe(
                name=recipe_data['name'],
                description=recipe_data['description'],
                category=recipe_data['category'],
                ingredients_json=str(recipe_data['ingredients']).replace("'", '"'),  # Convert to JSON format
                points_reward=0  # Auto-calculated at pour time
            )
            
            db.session.add(new_recipe)
            imported_count += 1
            
            # Category emoji
            emoji = '🍸' if recipe_data['category'] == 'classic' else '🥤' if recipe_data['category'] == 'highball' else '🥃'
            print(f"  ✅ Added: {emoji} {recipe_data['name']}")
        
        # Commit all changes
        db.session.commit()
        
        print(f"\n{'='*60}")
        print(f"Import complete!")
        print(f"  ✅ Imported: {imported_count} recipes")
        print(f"  ⚠️  Skipped: {skipped_count} recipes (already existed)")
        print(f"  📊 Total in DB: {Recipe.query.count()} recipes")
        print(f"{'='*60}\n")


if __name__ == '__main__':
    import_recipes()
