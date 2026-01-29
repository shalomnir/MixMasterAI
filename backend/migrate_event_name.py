"""Add current_event_name to MachineState table"""
import sqlite3
import os

def migrate():
    db_path = os.path.join(os.path.dirname(__file__), 'instance', 'cocktails.db')
    
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check if column exists
    cursor.execute("PRAGMA table_info(machine_state)")
    columns = [col[1] for col in cursor.fetchall()]
    
    if 'current_event_name' not in columns:
        cursor.execute("ALTER TABLE machine_state ADD COLUMN current_event_name VARCHAR(200) DEFAULT 'Welcome Party' NOT NULL")
        conn.commit()
        print("[OK] Added current_event_name column to machine_state table")
    else:
        print("[INFO] Column current_event_name already exists")
    
    conn.close()

if __name__ == '__main__':
    migrate()
