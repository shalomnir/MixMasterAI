"""
Utility script to reset the cocktail machine state.
Use this if the machine gets stuck in 'busy' mode.
"""

from app import app, db
from models import MachineState

def reset_machine_state():
    """Reset the machine to not pouring state"""
    with app.app_context():
        state = MachineState.get_instance()
        print(f"Current is_pouring state: {state.is_pouring}")
        
        if state.is_pouring:
            state.is_pouring = False
            db.session.commit()
            print("✅ Machine state has been reset to is_pouring=False")
        else:
            print("✅ Machine is already in the correct state (is_pouring=False)")

if __name__ == "__main__":
    reset_machine_state()
