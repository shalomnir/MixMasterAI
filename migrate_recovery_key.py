"""
Migration script to add recovery_key to existing users
Run this script ONCE before deploying the updated application
"""

from app import app, db
from models import User
import secrets
import string

def generate_recovery_key():
    """Generate a unique 6-character alphanumeric recovery key"""
    characters = string.ascii_uppercase + string.digits
    existing_keys = set(user.recovery_key for user in User.query.all() if hasattr(user, 'recovery_key') and user.recovery_key)
    
    while True:
        key = ''.join(secrets.choice(characters) for _ in range(6))
        if key not in existing_keys:
            existing_keys.add(key)
            return key

def migrate():
    with app.app_context():
        print("Starting migration: Adding recovery_key to User table...")
        
        # Add the column if it doesn't exist
        try:
            # Try to access recovery_key - if it fails, we need to add it
            from sqlalchemy import Column, String
            
            # Check if column exists by trying to query it
            try:
                User.query.with_entities(User.recovery_key).first()
                print("✓ recovery_key column already exists")
            except Exception:
                print("Adding recovery_key column...")
                # Add column using raw SQL
                with db.engine.connect() as conn:
                    conn.execute(db.text('ALTER TABLE user ADD COLUMN recovery_key VARCHAR(6)'))
                    conn.commit()
                print("✓ recovery_key column added")
            
            # Generate recovery keys for all users that don't have one
            users = User.query.all()
            updated_count = 0
            
            for user in users:
                if not user.recovery_key:
                    user.recovery_key = generate_recovery_key()
                    updated_count += 1
                    print(f"  Generated key for user: {user.nickname} -> {user.recovery_key}")
            
            if updated_count > 0:
                db.session.commit()
                print(f"\n✓ Migration complete! Updated {updated_count} users with recovery keys")
            else:
                print("\n✓ All users already have recovery keys")
            
            # Verify all users have recovery keys
            users_without_keys = User.query.filter_by(recovery_key=None).count()
            if users_without_keys == 0:
                print("✓ Verification passed: All users have recovery keys")
            else:
                print(f"⚠ Warning: {users_without_keys} users still missing recovery keys")
                
        except Exception as e:
            db.session.rollback()
            print(f"✗ Migration failed: {str(e)}")
            raise

if __name__ == '__main__':
    migrate()
