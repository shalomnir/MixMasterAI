"""
AI Cocktail Mixer - REST API Backend
=====================================
This is a pure REST API backend designed to run on Raspberry Pi.
All endpoints return JSON responses for consumption by a decoupled frontend.

Authentication: JWT tokens (stateless, suitable for cross-domain requests)
Hardware: GPIO control via gpio_service module
"""

import os
import re
import json
import secrets
import threading
from datetime import datetime, timedelta
from functools import wraps
from html import escape

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import update
from sqlalchemy.exc import SQLAlchemyError
import jwt

# Import GPIO service
from services.gpio_service import gpio_service

# =============================================================================
# APP CONFIGURATION
# =============================================================================

app = Flask(__name__)

# Configuration
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=12)
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URI', 'sqlite:///cocktails.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# CORS Configuration - Allow frontend on different domain
# Explicitly list allowed origins for security
CORS_ORIGINS = [
    'https://mixmasterai.app',
    'https://mixmasterai.pages.dev',
    'http://localhost:3000'
]
CORS(app, origins=CORS_ORIGINS, 
     supports_credentials=True,
     allow_headers=['Content-Type', 'Authorization'])

# =============================================================================
# DATABASE MODELS (imported from shared models)
# =============================================================================

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nickname = db.Column(db.String(80), unique=True, nullable=False)
    recovery_key = db.Column(db.String(6), unique=True, nullable=False)
    points = db.Column(db.Integer, default=0)
    
    @staticmethod
    def generate_recovery_key():
        """Generate a unique 6-character alphanumeric recovery key"""
        import string
        characters = string.ascii_uppercase + string.digits
        while True:
            key = ''.join(secrets.choice(characters) for _ in range(6))
            if not User.query.filter_by(recovery_key=key).first():
                return key
    
    def to_dict(self, include_recovery=False):
        """Convert user to dictionary for JSON response"""
        data = {
            'id': self.id,
            'nickname': self.nickname,
            'points': self.points
        }
        if include_recovery:
            data['recovery_key'] = self.recovery_key
        return data

class Pump(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    pin_number = db.Column(db.Integer, nullable=True)
    ingredient_name = db.Column(db.String(80), nullable=False, default="Empty")
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    is_alcohol = db.Column(db.Boolean, default=False, nullable=False)
    is_virtual = db.Column(db.Boolean, default=False, nullable=False)
    seconds_per_50ml = db.Column(db.Float, default=3.0, nullable=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'pin_number': self.pin_number,
            'ingredient_name': self.ingredient_name,
            'is_active': self.is_active,
            'is_alcohol': self.is_alcohol,
            'is_virtual': self.is_virtual,
            'seconds_per_50ml': self.seconds_per_50ml
        }

class Recipe(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    ingredients_json = db.Column(db.Text, nullable=False, default="{}")
    points_reward = db.Column(db.Integer, default=0)
    image_url = db.Column(db.String(200), nullable=True)
    category = db.Column(db.String(20), default='classic', nullable=False)
    
    def get_ingredients(self):
        return json.loads(self.ingredients_json)
    
    def set_ingredients(self, ingredients_dict):
        self.ingredients_json = json.dumps(ingredients_dict)
    
    def to_dict(self, include_ingredients=True):
        data = {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'category': self.category,
            'image_url': self.image_url
        }
        if include_ingredients:
            data['ingredients'] = self.get_ingredients()
        return data

class PourHistory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    recipe_id = db.Column(db.Integer, db.ForeignKey('recipe.id'), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    is_strong = db.Column(db.Boolean, default=False, nullable=False)
    points_awarded = db.Column(db.Integer, default=0, nullable=False)
    
    user = db.relationship('User', backref=db.backref('history', lazy=True))
    recipe = db.relationship('Recipe')

class MachineState(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    is_pouring = db.Column(db.Boolean, default=False, nullable=False)
    classic_target_vol = db.Column(db.Integer, default=110, nullable=False)
    highball_target_vol = db.Column(db.Integer, default=90, nullable=False)
    shot_target_vol = db.Column(db.Integer, default=40, nullable=False)
    taste_amount_ml = db.Column(db.Integer, default=30, nullable=False)
    
    @staticmethod
    def get_instance():
        state = MachineState.query.first()
        if not state:
            state = MachineState(id=1, is_pouring=False)
            db.session.add(state)
            db.session.commit()
        return state
    
    def to_dict(self):
        return {
            'is_pouring': self.is_pouring,
            'classic_target_vol': self.classic_target_vol,
            'highball_target_vol': self.highball_target_vol,
            'shot_target_vol': self.shot_target_vol,
            'taste_amount_ml': self.taste_amount_ml
        }

db.init_app(app)

# =============================================================================
# JWT AUTHENTICATION
# =============================================================================

def create_token(user_id, is_admin=False):
    """Create a JWT access token"""
    payload = {
        'user_id': user_id,
        'is_admin': is_admin,
        'exp': datetime.utcnow() + app.config['JWT_ACCESS_TOKEN_EXPIRES'],
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, app.config['JWT_SECRET_KEY'], algorithm='HS256')

def decode_token(token):
    """Decode and validate a JWT token"""
    try:
        payload = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def token_required(f):
    """Decorator to require valid JWT token"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')
        
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        
        if not token:
            return jsonify({'status': 'error', 'message': 'Token is missing'}), 401
        
        payload = decode_token(token)
        if not payload:
            return jsonify({'status': 'error', 'message': 'Token is invalid or expired'}), 401
        
        # Get user from database
        user = User.query.get(payload['user_id'])
        if not user:
            return jsonify({'status': 'error', 'message': 'User not found'}), 401
        
        # Pass user to the route
        return f(user, *args, **kwargs)
    return decorated

def admin_required(f):
    """Decorator to require admin token"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')
        
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        
        if not token:
            return jsonify({'status': 'error', 'message': 'Token is missing'}), 401
        
        payload = decode_token(token)
        if not payload:
            return jsonify({'status': 'error', 'message': 'Token is invalid or expired'}), 401
        
        if not payload.get('is_admin'):
            return jsonify({'status': 'error', 'message': 'Admin access required'}), 403
        
        return f(*args, **kwargs)
    return decorated

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def validate_nickname(nickname):
    """Validate and sanitize nickname input"""
    if not nickname or not nickname.strip():
        return None, "Nickname cannot be empty"
    
    nickname = nickname.strip()
    
    if len(nickname) < 2:
        return None, "Nickname must be at least 2 characters"
    if len(nickname) > 50:
        return None, "Nickname must be less than 50 characters"
    
    if not re.match(r'^[a-zA-Z0-9\s._-]+$', nickname):
        return None, "Nickname can only contain letters, numbers, spaces, dots, underscores, and hyphens"
    
    nickname = escape(nickname)
    return nickname, None

# =============================================================================
# SECURITY HEADERS
# =============================================================================

@app.after_request
def security_headers(response):
    """Add security headers to all responses"""
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    return response

# =============================================================================
# AUTH API ENDPOINTS
# =============================================================================

@app.route('/api/auth/register', methods=['POST'])
def api_register():
    """Register a new user"""
    data = request.get_json()
    if not data:
        return jsonify({'status': 'error', 'message': 'No data provided'}), 400
    
    nickname = data.get('nickname', '')
    
    # Validate nickname
    validated_nickname, error = validate_nickname(nickname)
    if error:
        return jsonify({'status': 'error', 'message': error}), 400
    
    try:
        # Check if nickname already exists
        existing_user = User.query.filter_by(nickname=validated_nickname).first()
        if existing_user:
            return jsonify({'status': 'error', 'message': 'Nickname already taken'}), 400
        
        # Create new user
        recovery_key = User.generate_recovery_key()
        user = User(nickname=validated_nickname, recovery_key=recovery_key)
        db.session.add(user)
        db.session.commit()
        
        # Generate token
        token = create_token(user.id)
        
        return jsonify({
            'status': 'success',
            'message': f'Welcome, {validated_nickname}!',
            'token': token,
            'user': user.to_dict(include_recovery=True)
        })
        
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': 'Database error'}), 500

@app.route('/api/auth/login', methods=['POST'])
def api_login():
    """Login with existing nickname (for returning users via recovery)"""
    data = request.get_json()
    if not data:
        return jsonify({'status': 'error', 'message': 'No data provided'}), 400
    
    nickname = data.get('nickname', '')
    
    # Check for admin login
    if nickname == "Admin2001":
        admin_password = data.get('password', '')
        if admin_password == 'COCKTAIL2026':
            token = create_token(0, is_admin=True)
            return jsonify({
                'status': 'success',
                'message': 'Admin access granted',
                'token': token,
                'is_admin': True
            })
        else:
            return jsonify({'status': 'error', 'message': 'Invalid admin password'}), 401
    
    # Regular user lookup
    user = User.query.filter_by(nickname=nickname).first()
    if not user:
        return jsonify({'status': 'error', 'message': 'User not found. Please register first.'}), 404
    
    token = create_token(user.id)
    return jsonify({
        'status': 'success',
        'message': f'Welcome back, {user.nickname}!',
        'token': token,
        'user': user.to_dict()
    })

@app.route('/api/auth/recovery', methods=['POST'])
def api_recovery():
    """Recover account using recovery key"""
    data = request.get_json()
    if not data:
        return jsonify({'status': 'error', 'message': 'No data provided'}), 400
    
    recovery_key = data.get('recovery_key', '').strip().upper()
    
    if not recovery_key:
        return jsonify({'status': 'error', 'message': 'Recovery key required'}), 400
    
    if len(recovery_key) != 6 or not recovery_key.isalnum():
        return jsonify({'status': 'error', 'message': 'Invalid recovery key format'}), 400
    
    user = User.query.filter_by(recovery_key=recovery_key).first()
    if not user:
        return jsonify({'status': 'error', 'message': 'Invalid recovery key'}), 404
    
    token = create_token(user.id)
    return jsonify({
        'status': 'success',
        'message': f'Welcome back, {user.nickname}!',
        'token': token,
        'user': user.to_dict()
    })

@app.route('/api/auth/me', methods=['GET'])
@token_required
def api_get_current_user(current_user):
    """Get current authenticated user info"""
    return jsonify({
        'status': 'success',
        'user': current_user.to_dict()
    })

# =============================================================================
# RECIPES API ENDPOINTS
# =============================================================================

@app.route('/api/recipes', methods=['GET'])
def api_get_recipes():
    """Get all recipes grouped by category"""
    classic = Recipe.query.filter_by(category='classic').all()
    highballs = Recipe.query.filter_by(category='highball').all()
    shots = Recipe.query.filter_by(category='shot').all()
    
    return jsonify({
        'status': 'success',
        'recipes': {
            'classic': [r.to_dict() for r in classic],
            'highball': [r.to_dict() for r in highballs],
            'shot': [r.to_dict() for r in shots]
        }
    })

@app.route('/api/recipes/<int:recipe_id>', methods=['GET'])
def api_get_recipe(recipe_id):
    """Get a single recipe by ID"""
    recipe = Recipe.query.get(recipe_id)
    if not recipe:
        return jsonify({'status': 'error', 'message': 'Recipe not found'}), 404
    
    return jsonify({
        'status': 'success',
        'recipe': recipe.to_dict()
    })

# =============================================================================
# PUMPS API ENDPOINTS
# =============================================================================

@app.route('/api/pumps', methods=['GET'])
def api_get_pumps():
    """Get all pump information"""
    pumps = Pump.query.all()
    pump_data = {}
    for pump in pumps:
        pump_data[str(pump.id)] = pump.to_dict()
    
    machine_state = MachineState.get_instance()
    return jsonify({
        'status': 'success',
        'pumps': pump_data,
        'machine_state': machine_state.to_dict()
    })

# =============================================================================
# POUR API ENDPOINTS
# =============================================================================

@app.route('/api/pour/<int:recipe_id>', methods=['POST'])
@token_required
def api_pour_cocktail(current_user, recipe_id):
    """Pour a cocktail - main hardware control endpoint"""
    
    # Atomic compare-and-swap for machine state
    result = db.session.execute(
        update(MachineState)
        .where(MachineState.id == 1, MachineState.is_pouring == False)
        .values(is_pouring=True)
    )
    db.session.commit()
    
    if result.rowcount == 0:
        return jsonify({
            'status': 'error',
            'message': 'Machine is currently busy. Please wait.'
        }), 400
    
    machine_state = MachineState.get_instance()
    
    try:
        data = request.get_json() or {}
        is_strong = data.get('is_strong', False)
        is_taste = data.get('is_taste', False)
        
        recipe = Recipe.query.get(recipe_id)
        if not recipe:
            return jsonify({'status': 'error', 'message': 'Recipe not found'}), 404
        
        ingredients = recipe.get_ingredients()
        category = recipe.category
        
        # Determine target volume
        if is_taste:
            target_volume = machine_state.taste_amount_ml
        else:
            if category == 'highball':
                target_volume = machine_state.highball_target_vol
            elif category == 'shot':
                target_volume = machine_state.shot_target_vol
            else:
                target_volume = machine_state.classic_target_vol
        
        # Calculate scaled ingredients
        original_total = sum(float(ml) for ml in ingredients.values())
        if original_total == 0:
            return jsonify({'status': 'error', 'message': 'Invalid recipe: Zero volume'}), 400
        
        calculated_ingredients = {}
        for pump_id, orig_ml in ingredients.items():
            calculated_ingredients[pump_id] = (float(orig_ml) / original_total) * target_volume
        
        # Apply strong mode (1.5x alcohol)
        if is_strong:
            for pump_id in calculated_ingredients.keys():
                pump = Pump.query.get(int(pump_id))
                if pump and pump.is_alcohol:
                    calculated_ingredients[pump_id] *= 1.5
        
        # Pour process (parallel execution)
        threads = []
        durations = []
        
        for pump_id_str, ml_amount in calculated_ingredients.items():
            pump_id = int(pump_id_str)
            pump = Pump.query.get(pump_id)
            
            if not pump:
                continue
            
            pin_number = pump.pin_number
            gpio_service.initialize_pin(pin_number)
            
            duration = (ml_amount / 50.0) * pump.seconds_per_50ml
            durations.append(duration)
            
            thread = threading.Thread(
                target=gpio_service.pour,
                args=(pin_number, duration, pump_id)
            )
            threads.append(thread)
            thread.start()
        
        # Wait for all pumps
        for thread in threads:
            thread.join()
        
        total_duration = max(durations) if durations else 0
        
        # Calculate points (1 point per 1ml alcohol)
        total_alcohol_ml = 0
        for pump_id_str, ml_amount in calculated_ingredients.items():
            pump = Pump.query.get(int(pump_id_str))
            if pump and pump.is_alcohol:
                total_alcohol_ml += ml_amount
        
        points_earned = round(total_alcohol_ml)
        current_user.points += points_earned
        
        # Record history
        history = PourHistory(
            user_id=current_user.id,
            recipe_id=recipe.id,
            is_strong=is_strong,
            points_awarded=points_earned
        )
        db.session.add(history)
        db.session.commit()
        
        # Build response
        mode_text = ""
        if is_taste:
            mode_text = " 🥄 TASTE!"
        if is_strong:
            mode_text += " 💪 STRONG!"
        
        is_highball = (category == 'highball' and not is_taste)
        highball_msg = " Please top up with Soda/Tonic." if is_highball else ""
        
        return jsonify({
            'status': 'success',
            'message': f'Cheers! {points_earned} points earned.{mode_text}{highball_msg}',
            'points_earned': points_earned,
            'new_total_points': current_user.points,
            'total_duration': total_duration,
            'is_highball': is_highball
        })
    
    except Exception as e:
        import traceback
        print(f"ERROR in pour: {str(e)}")
        print(traceback.format_exc())
        db.session.rollback()
        return jsonify({'status': 'error', 'message': f'Pour failed: {str(e)}'}), 500
    
    finally:
        # Always release the lock
        try:
            db.session.execute(
                update(MachineState)
                .where(MachineState.id == 1)
                .values(is_pouring=False)
            )
            db.session.commit()
        except:
            db.session.rollback()

# =============================================================================
# MACHINE STATUS API
# =============================================================================

@app.route('/api/status', methods=['GET'])
def api_status():
    """Get machine status"""
    machine_state = MachineState.get_instance()
    return jsonify({
        'status': 'success',
        'machine': machine_state.to_dict()
    })

# =============================================================================
# LEADERBOARD API
# =============================================================================

@app.route('/api/leaderboard', methods=['GET'])
def api_leaderboard():
    """Get leaderboard data"""
    users = User.query.order_by(User.points.desc()).limit(10).all()
    return jsonify({
        'status': 'success',
        'leaderboard': [u.to_dict() for u in users]
    })

@app.route('/api/user/<int:user_id>/statistics', methods=['GET'])
def api_user_statistics(user_id):
    """Get user statistics"""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'status': 'error', 'message': 'User not found'}), 404
    
    user_history = PourHistory.query.filter_by(user_id=user_id).all()
    
    total_alcohol_ml = 0
    recipe_counts = {}
    
    for pour in user_history:
        recipe = Recipe.query.get(pour.recipe_id)
        if recipe:
            recipe_counts[recipe.name] = recipe_counts.get(recipe.name, 0) + 1
        total_alcohol_ml += pour.points_awarded or 0
    
    favorite_cocktail = max(recipe_counts, key=recipe_counts.get) if recipe_counts else None
    
    total_pours = len(user_history)
    strong_pours = sum(1 for p in user_history if p.is_strong)
    strong_percentage = round((strong_pours / total_pours) * 100, 1) if total_pours > 0 else 0
    
    # Calculate rank
    all_users = User.query.order_by(User.points.desc()).all()
    rank = next((i + 1 for i, u in enumerate(all_users) if u.id == user_id), 0)
    
    return jsonify({
        'status': 'success',
        'user': user.to_dict(),
        'statistics': {
            'total_alcohol_ml': round(total_alcohol_ml, 1),
            'favorite_cocktail': favorite_cocktail,
            'total_pours': total_pours,
            'strong_mode_percentage': strong_percentage,
            'rank': rank
        }
    })

@app.route('/api/statistics/global', methods=['GET'])
def api_global_statistics():
    """Get global platform statistics"""
    all_pours = PourHistory.query.all()
    total_alcohol_ml = sum(p.points_awarded or 0 for p in all_pours)
    
    return jsonify({
        'status': 'success',
        'statistics': {
            'total_alcohol_liters': round(total_alcohol_ml / 1000, 2),
            'total_cocktails_poured': len(all_pours)
        }
    })

# =============================================================================
# ADMIN API ENDPOINTS
# =============================================================================

@app.route('/api/admin/pumps', methods=['GET'])
@admin_required
def api_admin_get_pumps():
    """Get all pumps for admin"""
    pumps = Pump.query.order_by(Pump.id).all()
    return jsonify({
        'status': 'success',
        'pumps': [p.to_dict() for p in pumps]
    })

@app.route('/api/admin/pumps/<int:pump_id>', methods=['PUT'])
@admin_required
def api_admin_update_pump(pump_id):
    """Update pump configuration"""
    pump = Pump.query.get(pump_id)
    if not pump:
        return jsonify({'status': 'error', 'message': 'Pump not found'}), 404
    
    data = request.get_json()
    
    if 'ingredient_name' in data:
        pump.ingredient_name = data['ingredient_name']
    if 'pin_number' in data:
        pump.pin_number = data['pin_number']
    if 'is_active' in data:
        pump.is_active = data['is_active']
    if 'is_alcohol' in data:
        pump.is_alcohol = data['is_alcohol']
    if 'seconds_per_50ml' in data:
        pump.seconds_per_50ml = float(data['seconds_per_50ml'])
    
    db.session.commit()
    return jsonify({'status': 'success', 'pump': pump.to_dict()})

@app.route('/api/admin/recipes', methods=['GET'])
@admin_required
def api_admin_get_recipes():
    """Get all recipes for admin"""
    recipes = Recipe.query.all()
    return jsonify({
        'status': 'success',
        'recipes': [r.to_dict() for r in recipes]
    })

@app.route('/api/admin/recipes', methods=['POST'])
@admin_required
def api_admin_create_recipe():
    """Create a new recipe"""
    data = request.get_json()
    
    name = data.get('name')
    if not name:
        return jsonify({'status': 'error', 'message': 'Name required'}), 400
    
    recipe = Recipe(
        name=name,
        description=data.get('description'),
        category=data.get('category', 'classic'),
        ingredients_json=json.dumps(data.get('ingredients', {}))
    )
    
    db.session.add(recipe)
    db.session.commit()
    
    return jsonify({'status': 'success', 'recipe': recipe.to_dict()})

@app.route('/api/admin/recipes/<int:recipe_id>', methods=['PUT'])
@admin_required
def api_admin_update_recipe(recipe_id):
    """Update an existing recipe"""
    recipe = Recipe.query.get(recipe_id)
    if not recipe:
        return jsonify({'status': 'error', 'message': 'Recipe not found'}), 404
    
    data = request.get_json()
    
    if 'name' in data:
        recipe.name = data['name']
    if 'description' in data:
        recipe.description = data['description']
    if 'category' in data:
        recipe.category = data['category']
    if 'ingredients' in data:
        recipe.ingredients_json = json.dumps(data['ingredients'])
    
    db.session.commit()
    return jsonify({'status': 'success', 'recipe': recipe.to_dict()})

@app.route('/api/admin/recipes/<int:recipe_id>', methods=['DELETE'])
@admin_required
def api_admin_delete_recipe(recipe_id):
    """Delete a recipe"""
    recipe = Recipe.query.get(recipe_id)
    if not recipe:
        return jsonify({'status': 'error', 'message': 'Recipe not found'}), 404
    
    db.session.delete(recipe)
    db.session.commit()
    return jsonify({'status': 'success', 'message': 'Recipe deleted'})

@app.route('/api/admin/users', methods=['GET'])
@admin_required
def api_admin_get_users():
    """Get all users for admin"""
    users = User.query.order_by(User.points.desc()).all()
    return jsonify({
        'status': 'success',
        'users': [u.to_dict(include_recovery=True) for u in users]
    })

@app.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
@admin_required
def api_admin_delete_user(user_id):
    """Delete a user"""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'status': 'error', 'message': 'User not found'}), 404
    
    PourHistory.query.filter_by(user_id=user_id).delete()
    db.session.delete(user)
    db.session.commit()
    return jsonify({'status': 'success', 'message': 'User deleted'})

@app.route('/api/admin/machine-state', methods=['GET'])
@admin_required
def api_admin_get_machine_state():
    """Get machine state for admin"""
    state = MachineState.get_instance()
    return jsonify({'status': 'success', 'machine_state': state.to_dict()})

@app.route('/api/admin/machine-state', methods=['PUT'])
@admin_required
def api_admin_update_machine_state(pump_id):
    """Update machine state settings"""
    state = MachineState.get_instance()
    data = request.get_json()
    
    if 'classic_target_vol' in data:
        state.classic_target_vol = int(data['classic_target_vol'])
    if 'highball_target_vol' in data:
        state.highball_target_vol = int(data['highball_target_vol'])
    if 'shot_target_vol' in data:
        state.shot_target_vol = int(data['shot_target_vol'])
    if 'taste_amount_ml' in data:
        state.taste_amount_ml = int(data['taste_amount_ml'])
    
    db.session.commit()
    return jsonify({'status': 'success', 'machine_state': state.to_dict()})

# =============================================================================
# CLI COMMANDS
# =============================================================================

@app.cli.command("init-db")
def init_db_command():
    """Create database tables and seed data"""
    with app.app_context():
        db.create_all()
        
        if Pump.query.count() == 0:
            for i in range(1, 9):
                pump = Pump(id=i, ingredient_name='Empty', is_active=False)
                db.session.add(pump)
            
            machine_state = MachineState(id=1, is_pouring=False)
            db.session.add(machine_state)
            db.session.commit()
            print("Database initialized with default data.")
        else:
            print("Database already contains data.")

# =============================================================================
# ERROR HANDLERS
# =============================================================================

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return jsonify({'status': 'error', 'message': 'Internal server error'}), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({'status': 'error', 'message': 'Resource not found'}), 404

# =============================================================================
# HEALTH CHECK ROUTE
# =============================================================================

@app.route('/', methods=['GET'])
def health_check():
    """Health check endpoint - verifies the API is online"""
    return jsonify({'status': 'online', 'machine': 'MixMasterAI'})

# =============================================================================
# MAIN
# =============================================================================

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
