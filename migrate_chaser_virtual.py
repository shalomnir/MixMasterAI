"""
Database migration script to add:
- is_chaser field to Recipe model
- chaser_amount_ml field to MachineState model
- is_virtual field to Pump model
"""
from app import app, db
from models import Recipe, MachineState, Pump

def migrate():
    with app.app_context():
        print("Starting migration for chaser and virtual pump features...")
        
        try:
            # Get connection from engine
            with db.engine.connect() as conn:
                # Add is_chaser to Recipe table (default False)
                print("Adding is_chaser column to recipe table...")
                conn.execute(db.text('ALTER TABLE recipe ADD COLUMN is_chaser BOOLEAN DEFAULT 0 NOT NULL'))
                
                # Add chaser_amount_ml to MachineState table (default 100ml)
                print("Adding chaser_amount_ml column to machine_state table...")
                conn.execute(db.text('ALTER TABLE machine_state ADD COLUMN chaser_amount_ml INTEGER DEFAULT 100 NOT NULL'))
                
                # Add is_virtual to Pump table (default False)
                print("Adding is_virtual column to pump table...")
                conn.execute(db.text('ALTER TABLE pump ADD COLUMN is_virtual BOOLEAN DEFAULT 0 NOT NULL'))
                
                conn.commit()
            
            print("✅ Migration complete! All new columns added successfully.")
            print("   - recipe.is_chaser (default: False)")
            print("   - machine_state.chaser_amount_ml (default: 100ml)")
            print("   - pump.is_virtual (default: False)")
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Migration failed: {e}")
            print("Note: If columns already exist, this is expected. You can safely ignore this error.")

if __name__ == '__main__':
    migrate()
