from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime
import json
import secrets
import string

db = SQLAlchemy()

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nickname = db.Column(db.String(80), unique=True, nullable=False)
    recovery_key = db.Column(db.String(6), unique=True, nullable=False)
    points = db.Column(db.Integer, default=0)
    
    @staticmethod
    def generate_recovery_key():
        """Generate a unique 6-character alphanumeric recovery key"""
        characters = string.ascii_uppercase + string.digits
        while True:
            key = ''.join(secrets.choice(characters) for _ in range(6))
            # Check if key already exists
            if not User.query.filter_by(recovery_key=key).first():
                return key
    
    def to_dict(self):
        return {
            'id': self.id,
            'nickname': self.nickname,
            'points': self.points,
            'recovery_key': self.recovery_key,
        }

    def __repr__(self):
        return f'<User {self.nickname}>'

class Pump(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    # Pump ID 1-8
    pin_number = db.Column(db.Integer, nullable=True) # For future hardware implementation
    ingredient_name = db.Column(db.String(80), nullable=False, default="Empty")
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    is_alcohol = db.Column(db.Boolean, default=False, nullable=False)  # Mark if ingredient is alcoholic
    is_virtual = db.Column(db.Boolean, default=False, nullable=False)  # DEPRECATED: No longer affects pour behavior
    seconds_per_50ml = db.Column(db.Float, default=3.0, nullable=False) # Calibration: how many seconds to pour 50ml
    
    def to_dict(self):
        return {
            'id': self.id,
            'pin_number': self.pin_number,
            'ingredient_name': self.ingredient_name,
            'is_active': self.is_active,
            'is_alcohol': self.is_alcohol,
            'is_virtual': self.is_virtual,
            'seconds_per_50ml': self.seconds_per_50ml,
        }

    def __repr__(self):
        return f'<Pump {self.id}: {self.ingredient_name}>'

class Recipe(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    # ingredients stored as JSON: {"1": 30, "2": 0, "3": 10} where keys are pump_ids and values are duration/amount
    ingredients_json = db.Column(db.Text, nullable=False, default="{}") 
    points_reward = db.Column(db.Integer, default=0)  # DEPRECATED: Points are now auto-calculated at pour time (1ml alcohol = 1 point)
    image_url = db.Column(db.String(200), nullable=True) # Optional for UI
    category = db.Column(db.String(20), default='classic', nullable=False)  # Drink category: 'classic', 'highball', or 'shot'
    
    def get_ingredients(self):
        return json.loads(self.ingredients_json)

    def set_ingredients(self, ingredients_dict):
        self.ingredients_json = json.dumps(ingredients_dict)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'ingredients_json': self.ingredients_json,
            'ingredients': self.get_ingredients(),
            'points_reward': self.points_reward,
            'image_url': self.image_url,
            'category': self.category,
        }

class PourHistory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    recipe_id = db.Column(db.Integer, db.ForeignKey('recipe.id'), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    is_strong = db.Column(db.Boolean, default=False, nullable=False)  # Track if Strong Mode was used
    points_awarded = db.Column(db.Integer, default=0, nullable=False)  # Points awarded for this specific pour
    
    user = db.relationship('User', backref=db.backref('history', lazy=True))
    recipe = db.relationship('Recipe')

class MachineState(db.Model):
    """Singleton table to track machine state"""
    id = db.Column(db.Integer, primary_key=True)
    is_pouring = db.Column(db.Boolean, default=False, nullable=False)
    # Category-based target volumes
    classic_target_vol = db.Column(db.Integer, default=110, nullable=False)  # Classic cocktails (no soda)
    highball_target_vol = db.Column(db.Integer, default=90, nullable=False)  # Long drinks with soda/tonic
    shot_target_vol = db.Column(db.Integer, default=40, nullable=False)  # Shots and chasers
    taste_amount_ml = db.Column(db.Integer, default=30, nullable=False)  # Global taste portion size
    # Current event name for display on guest UI
    current_event_name = db.Column(db.String(200), default="Welcome Party", nullable=False)
    
    @staticmethod
    def get_instance():
        """Get or create the singleton instance"""
        state = MachineState.query.first()
        if not state:
            state = MachineState(id=1, is_pouring=False)
            db.session.add(state)
            db.session.commit()
        return state

