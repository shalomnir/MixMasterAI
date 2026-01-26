"""
Database Migration: Add is_strong column to pour_history table
This migration adds a boolean field to track Strong Mode usage per pour.
"""

import sqlite3
import os

# Database path
DB_PATH = os.path.join('instance', 'cocktails.db')

def migrate():
    """Add is_strong column to pour_history table"""
    
    if not os.path.exists(DB_PATH):
        print(f"Error: Database not found at {DB_PATH}")
        return False
    
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Check if column already exists
        cursor.execute("PRAGMA table_info(pour_history)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'is_strong' in columns:
            print("✓ Column 'is_strong' already exists in pour_history table")
            conn.close()
            return True
        
        # Add the new column with default value False
        cursor.execute("""
            ALTER TABLE pour_history 
            ADD COLUMN is_strong BOOLEAN NOT NULL DEFAULT 0
        """)
        
        conn.commit()
        print("✓ Successfully added 'is_strong' column to pour_history table")
        print("  - All existing records defaulted to False (not strong)")
        
        conn.close()
        return True
        
    except sqlite3.Error as e:
        print(f"✗ Database error: {e}")
        return False
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        return False

if __name__ == '__main__':
    print("Starting database migration...")
    print("-" * 50)
    success = migrate()
    print("-" * 50)
    if success:
        print("Migration completed successfully!")
    else:
        print("Migration failed. Please check the errors above.")
