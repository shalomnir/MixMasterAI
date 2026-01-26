import sqlite3
import os

# Path to the database
db_path = 'instance/cocktails.db'

def migrate():
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    print("Running migration...")

    # 1. Update MachineState volumes
    try:
        cursor.execute("""
            UPDATE machine_state 
            SET classic_target_vol = 110, 
                highball_target_vol = 90, 
                shot_target_vol = 40
            WHERE id = 1
        """)
        print("Updated MachineState volumes.")
    except Exception as e:
        print(f"Error updating MachineState: {e}")

    # 2. Add points_awarded to PourHistory
    try:
        cursor.execute("ALTER TABLE pour_history ADD COLUMN points_awarded INTEGER DEFAULT 0")
        print("Added points_awarded column to PourHistory.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("Column points_awarded already exists in PourHistory.")
        else:
            print(f"Error adding column to PourHistory: {e}")

    conn.commit()
    conn.close()
    print("Migration completed.")

if __name__ == "__main__":
    migrate()
