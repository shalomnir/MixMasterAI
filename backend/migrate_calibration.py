"""
Database migration script to add calibration field to Pump model.
Adds seconds_per_50ml column for ML-based recipe system.
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
    # Add seconds_per_50ml column to pump table
    print("Adding 'seconds_per_50ml' column to pump table...")
    cursor.execute("""
        ALTER TABLE pump 
        ADD COLUMN seconds_per_50ml FLOAT NOT NULL DEFAULT 3.0
    """)
    print("✓ Added seconds_per_50ml column to pump table")
    
    conn.commit()
    print("\n✅ Calibration migration completed successfully!")
    print("   All pumps now have a default calibration of 3.0 seconds per 50ml")
    
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
