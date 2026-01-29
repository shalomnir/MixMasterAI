"""
Migration script to add current_event_name column to machine_state table.
Run this script from the backend directory:
    python migrate_add_event_column.py
"""
import sqlite3
import os

# Database path
db_path = os.path.join('instance', 'cocktails.db')

if not os.path.exists(db_path):
    print(f"[ERROR] Database not found at: {db_path}")
    print("Make sure you're running this from the backend directory.")
    exit(1)

print(f"[INFO] Connecting to database: {db_path}")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check if column already exists
cursor.execute("PRAGMA table_info(machine_state)")
columns = [col[1] for col in cursor.fetchall()]
print(f"[INFO] Existing columns: {columns}")

if 'current_event_name' in columns:
    print("[OK] Column 'current_event_name' already exists. No migration needed.")
else:
    print("[INFO] Adding 'current_event_name' column...")
    cursor.execute("""
        ALTER TABLE machine_state 
        ADD COLUMN current_event_name VARCHAR(200) DEFAULT 'Welcome Party'
    """)
    conn.commit()
    print("[OK] Column 'current_event_name' added successfully!")

conn.close()
print("[DONE] Migration complete.")
