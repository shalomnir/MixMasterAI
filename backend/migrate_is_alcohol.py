"""
Migration script to add is_alcohol column to Pump table
Run this script once to update existing database
"""
from app import app, db
from sqlalchemy import text

def migrate():
    with app.app_context():
        try:
            # Check if column already exists
            result = db.session.execute(text("PRAGMA table_info(pump)"))
            columns = [row[1] for row in result.fetchall()]
            
            if 'is_alcohol' in columns:
                print("✓ Column 'is_alcohol' already exists. No migration needed.")
                return
            
            # Add the new column
            print("Adding 'is_alcohol' column to pump table...")
            db.session.execute(text('ALTER TABLE pump ADD COLUMN is_alcohol BOOLEAN DEFAULT 0 NOT NULL'))
            db.session.commit()
            print("✓ Migration completed successfully!")
            print("  - Added is_alcohol column with default value of False")
            print("\n  NOTE: You can now mark pumps as alcoholic in the admin dashboard.")
            
        except Exception as e:
            db.session.rollback()
            print(f"✗ Migration failed: {str(e)}")
            raise

if __name__ == '__main__':
    migrate()
