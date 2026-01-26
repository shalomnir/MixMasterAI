"""
Migration script to add missing 'points_awarded' column to pour_history table
"""

from app import app, db
from sqlalchemy import text

def migrate():
    """Add points_awarded column to pour_history table"""
    with app.app_context():
        try:
            # Check if column already exists
            result = db.session.execute(text("PRAGMA table_info(pour_history)"))
            columns = [row[1] for row in result]
            
            if 'points_awarded' in columns:
                print("✅ Column 'points_awarded' already exists in pour_history table")
                return
            
            # Add the column
            print("Adding 'points_awarded' column to pour_history table...")
            db.session.execute(text(
                "ALTER TABLE pour_history ADD COLUMN points_awarded INTEGER NOT NULL DEFAULT 0"
            ))
            db.session.commit()
            print("✅ Successfully added 'points_awarded' column to pour_history table")
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Migration failed: {str(e)}")
            raise

if __name__ == "__main__":
    migrate()
