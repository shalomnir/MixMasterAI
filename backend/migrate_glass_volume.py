"""
Migration script to add glass_volume_ml column to MachineState table
Run this script once to update existing database
"""
from app import app, db
from sqlalchemy import text

def migrate():
    with app.app_context():
        try:
            # Check if column already exists
            result = db.session.execute(text("PRAGMA table_info(machine_state)"))
            columns = [row[1] for row in result.fetchall()]
            
            if 'glass_volume_ml' in columns:
                print("✓ Column 'glass_volume_ml' already exists. No migration needed.")
                return
            
            # Add the new column
            print("Adding 'glass_volume_ml' column to machine_state table...")
            db.session.execute(text('ALTER TABLE machine_state ADD COLUMN glass_volume_ml INTEGER DEFAULT 200 NOT NULL'))
            db.session.commit()
            print("✓ Migration completed successfully!")
            print("  - Added glass_volume_ml column with default value of 200ml")
            
        except Exception as e:
            db.session.rollback()
            print(f"✗ Migration failed: {str(e)}")
            raise

if __name__ == '__main__':
    migrate()
