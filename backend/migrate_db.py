"""
Database migration script to add new columns to existing database.
This adds 'is_active' to Pump model and 'description' to Recipe model.
"""
import sqlite3
import os

# Path to the database
db_path = 'instance/cocktails.db'

if not os.path.exists(db_path):
    print(f"Error: Database not found at {db_path}")
    exit(1)

# Connect to database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # Add is_active column to pump table
    print("Adding 'is_active' column to pump table...")
    cursor.execute("""
        ALTER TABLE pump 
        ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT 1
    """)
    print("✓ Added is_active column to pump table")
    
    # Add description column to recipe table
    print("Adding 'description' column to recipe table...")
    cursor.execute("""
        ALTER TABLE recipe 
        ADD COLUMN description TEXT
    """)
    print("✓ Added description column to recipe table")
    
    # Ensure all pumps 1-8 exist
    print("\nEnsuring all 8 pumps exist...")
    for i in range(1, 9):
        cursor.execute("SELECT id FROM pump WHERE id = ?", (i,))
        if not cursor.fetchone():
            cursor.execute("""
                INSERT INTO pump (id, ingredient_name, is_active, pin_number) 
                VALUES (?, 'Empty', 0, NULL)
            """, (i,))
            print(f"✓ Created pump {i}")
    
    # Update existing pumps to be active
    cursor.execute("UPDATE pump SET is_active = 1 WHERE id <= 4")
    print("\nSet pumps 1-4 as active")
    
    conn.commit()
    print("\n✅ Database migration completed successfully!")
    
except sqlite3.OperationalError as e:
    if "duplicate column name" in str(e).lower():
        print(f"⚠️  Column already exists: {e}")
    else:
        print(f"❌ Error during migration: {e}")
        conn.rollback()
except Exception as e:
    print(f"❌ Unexpected error: {e}")
    conn.rollback()
finally:
    conn.close()
