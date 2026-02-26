"""
Migrate recipe ingredients_json from pump-ID keys to ingredient-name keys.
Also sets correct GPIO pin numbers for known pumps.

Usage (no venv/Flask needed — pure stdlib):
    python backend/migrate_ingredient_names.py /home/nirsh/MixMasterAI/instance/cocktails.db
"""
import json
import os
import sqlite3
import sys

# Known physical pump assignments: pump_id → (gpio_pin, ingredient_name)
# The user confirmed: pump 1→GPIO17=Vodka, pump4→GPIO23=Gin,
#                     pump5→GPIO24=Tequila, pump8→GPIO6=Pineapple Juice
KNOWN_PINS = {
    1: 17,
    4: 23,
    5: 24,
    8: 6,
}


def find_db():
    candidates = [
        os.path.join(os.path.dirname(__file__), 'cocktails.db'),
        '/home/nirsh/MixMasterAI/instance/cocktails.db',
        '/app/cocktails.db',
        'backend/cocktails.db',
        'instance/cocktails.db',
        'cocktails.db',
    ]
    for p in candidates:
        if os.path.exists(p):
            return p
    return None


def main():
    db_path = sys.argv[1] if len(sys.argv) > 1 else find_db()
    if not db_path or not os.path.exists(db_path):
        print("ERROR: cocktails.db not found. Pass path as argument.")
        sys.exit(1)

    print(f"Using DB: {db_path}")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # ── 1. Apply known GPIO pins ──────────────────────────────────
    print("\n── Updating known GPIO pins ──")
    for pump_id, gpio in KNOWN_PINS.items():
        cur.execute("UPDATE pump SET pin_number=? WHERE id=?", (gpio, pump_id))
        if cur.rowcount:
            print(f"  Pump {pump_id}: GPIO pin → {gpio}")
    conn.commit()

    # ── 2. Build pump_id → ingredient_name map from DB ───────────
    cur.execute("SELECT id, ingredient_name FROM pump")
    pump_rows = cur.fetchall()
    id_to_name = {str(row['id']): row['ingredient_name'] for row in pump_rows if row['ingredient_name']}
    print(f"\n── Pump ID → Name map ──")
    for pid, name in sorted(id_to_name.items(), key=lambda x: int(x[0])):
        print(f"  Pump {pid}: {name}")

    # ── 3. Migrate recipe ingredients_json ───────────────────────
    cur.execute("SELECT id, name, ingredients_json FROM recipe")
    recipes = cur.fetchall()
    print(f"\n── Migrating {len(recipes)} recipes ──")

    migrated = 0
    skipped = 0
    for row in recipes:
        try:
            ings = json.loads(row['ingredients_json'] or '{}')
        except json.JSONDecodeError:
            print(f"  SKIP (bad JSON): {row['name']}")
            skipped += 1
            continue

        # Check if already name-keyed (any non-numeric key)
        keys = list(ings.keys())
        if keys and not keys[0].isdigit():
            print(f"  SKIP (already named): {row['name']}")
            skipped += 1
            continue

        # Convert: pump_id str → ingredient_name
        new_ings = {}
        ok = True
        for pid_str, ml in ings.items():
            # Handle both "1" and "pump_1" style keys
            pid_str_clean = pid_str.replace('pump_', '')
            name = id_to_name.get(pid_str_clean)
            if not name:
                print(f"  WARN: pump {pid_str} has no ingredient name — skipping recipe '{row['name']}'")
                ok = False
                break
            new_ings[name] = float(ml)

        if ok and new_ings:
            cur.execute(
                "UPDATE recipe SET ingredients_json=? WHERE id=?",
                (json.dumps(new_ings), row['id'])
            )
            print(f"  ✓ {row['name']}: {new_ings}")
            migrated += 1
        else:
            skipped += 1

    conn.commit()
    conn.close()
    print(f"\nDone. Migrated: {migrated}, Skipped: {skipped}")


if __name__ == '__main__':
    main()
