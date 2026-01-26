"""
Database Migration: Category-Based Volume System
Migrates from is_chaser boolean to category string field
Adds category-specific target volumes to MachineState
"""

from app import app, db
from models import Recipe, MachineState
from sqlalchemy import text

def migrate():
    with app.app_context():
        print("Starting migration to category-based volume system...")
        
        # Step 1: Add category column to Recipe table (if not exists)
        try:
            with db.engine.connect() as conn:
                # Check if category column exists
                result = conn.execute(text("PRAGMA table_info(recipe)"))
                columns = [row[1] for row in result]
                
                if 'category' not in columns:
                    print("Adding 'category' column to Recipe table...")
                    conn.execute(text("ALTER TABLE recipe ADD COLUMN category VARCHAR(20) DEFAULT 'classic' NOT NULL"))
                    conn.commit()
                    print("✓ Category column added")
                else:
                    print("✓ Category column already exists")
        except Exception as e:
            print(f"Error adding category column: {e}")
            return False
        
        # Step 2: Migrate is_chaser data to category field
        try:
            print("Migrating is_chaser data to category...")
            recipes = Recipe.query.all()
            migrated_count = 0
            
            for recipe in recipes:
                # Check if recipe has is_chaser attribute (old schema)
                if hasattr(recipe, 'is_chaser'):
                    if recipe.is_chaser:
                        recipe.category = 'shot'
                        migrated_count += 1
                    else:
                        recipe.category = 'classic'
                else:
                    # If is_chaser doesn't exist, ensure category is set
                    if not recipe.category or recipe.category == '':
                        recipe.category = 'classic'
            
            db.session.commit()
            print(f"✓ Migrated {migrated_count} chasers to 'shot' category")
            print(f"✓ Set default 'classic' category for remaining recipes")
        except Exception as e:
            db.session.rollback()
            print(f"Error migrating recipe data: {e}")
            return False
        
        # Step 3: Add category volume columns to MachineState (if not exist)
        try:
            with db.engine.connect() as conn:
                result = conn.execute(text("PRAGMA table_info(machine_state)"))
                columns = [row[1] for row in result]
                
                if 'classic_target_vol' not in columns:
                    print("Adding category volume columns to MachineState...")
                    conn.execute(text("ALTER TABLE machine_state ADD COLUMN classic_target_vol INTEGER DEFAULT 150 NOT NULL"))
                    conn.execute(text("ALTER TABLE machine_state ADD COLUMN highball_target_vol INTEGER DEFAULT 250 NOT NULL"))
                    conn.execute(text("ALTER TABLE machine_state ADD COLUMN shot_target_vol INTEGER DEFAULT 60 NOT NULL"))
                    conn.commit()
                    print("✓ Category volume columns added")
                else:
                    print("✓ Category volume columns already exist")
        except Exception as e:
            print(f"Error adding category volume columns: {e}")
            return False
        
        # Step 4: Set default values for category volumes
        try:
            machine_state = MachineState.get_instance()
            
            # Only set if not already configured
            if not hasattr(machine_state, 'classic_target_vol') or machine_state.classic_target_vol == 0:
                machine_state.classic_target_vol = 150
            if not hasattr(machine_state, 'highball_target_vol') or machine_state.highball_target_vol == 0:
                machine_state.highball_target_vol = 250
            if not hasattr(machine_state, 'shot_target_vol') or machine_state.shot_target_vol == 0:
                machine_state.shot_target_vol = 60
            
            db.session.commit()
            print(f"✓ Category volumes set: Classic={machine_state.classic_target_vol}ml, Highball={machine_state.highball_target_vol}ml, Shot={machine_state.shot_target_vol}ml")
        except Exception as e:
            db.session.rollback()
            print(f"Error setting default category volumes: {e}")
            return False
        
        print("\n✅ Migration completed successfully!")
        print("\nNext steps:")
        print("1. Restart your Flask application")
        print("2. Test the admin dashboard to configure category volumes")
        print("3. Create/edit recipes with the new category dropdown")
        
        return True

if __name__ == '__main__':
    migrate()
