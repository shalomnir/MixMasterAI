"""
Migration script: Add personal_token to existing users.
Run this ONCE on any existing database before or after deploying the updated app.
New registrations auto-generate the token; this backfills existing users.
"""

import uuid
from app import app, db
from models import User


def migrate():
    with app.app_context():
        print("Starting migration: Adding personal_token to User table...")

        # 1. Add column if it doesn't exist
        try:
            User.query.with_entities(User.personal_token).first()
            print("✓ personal_token column already exists")
        except Exception:
            print("Adding personal_token column...")
            with db.engine.connect() as conn:
                conn.execute(db.text('ALTER TABLE user ADD COLUMN personal_token VARCHAR(36)'))
                conn.commit()
            print("✓ personal_token column added")

        # 2. Backfill all users that don't have a token yet
        users = User.query.all()
        existing_tokens = {u.personal_token for u in users if u.personal_token}
        updated_count = 0

        for user in users:
            if not user.personal_token:
                while True:
                    token = str(uuid.uuid4())
                    if token not in existing_tokens:
                        existing_tokens.add(token)
                        break
                user.personal_token = token
                updated_count += 1
                print(f"  Generated token for: {user.nickname} -> {token}")

        if updated_count > 0:
            db.session.commit()
            print(f"\n✓ Migration complete! Updated {updated_count} users with personal tokens.")
        else:
            print("\n✓ All users already have personal tokens.")

        # 3. Verify
        missing = User.query.filter_by(personal_token=None).count()
        if missing == 0:
            print("✓ Verification passed: All users have personal tokens.")
        else:
            print(f"⚠ Warning: {missing} users still missing a personal token.")


if __name__ == '__main__':
    migrate()
