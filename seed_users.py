from app import app, db
from models import User, PourHistory
import random

def seed_users():
    with app.app_context():
        print("Resetting users...")
        
        # Delete all history first to avoid foreign key constraints (if any enforced)
        try:
            PourHistory.query.delete()
            User.query.delete()
            db.session.commit()
            print("✓ Deleted all existing users and history")
        except Exception as e:
            db.session.rollback()
            print(f"Error clearing database: {e}")
            return

        # Create 5 mock users
        mock_users = [
            'Alice', 'Bob', 'Charlie', 'David', 'Eve'
        ]
        
        print("\nCreating mock users...")
        for nickname in mock_users:
            try:
                # Generate random points between 50 and 500
                points = random.randint(50, 500) * 10 
                
                # Create user
                user = User(
                    nickname=nickname, 
                    points=points,
                    recovery_key=User.generate_recovery_key()
                )
                db.session.add(user)
                print(f"  + Created {nickname} (Points: {points}, Key: {user.recovery_key})")
                
            except Exception as e:
                print(f"  Failed to create {nickname}: {e}")

        try:
            db.session.commit()
            print("\n✓ Successfully seeded 5 mock users!")
        except Exception as e:
            db.session.rollback()
            print(f"\nError saving users: {e}")

if __name__ == '__main__':
    seed_users()
