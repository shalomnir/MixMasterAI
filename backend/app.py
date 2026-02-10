import os
import re
import json
import time
import threading
import jwt
from datetime import datetime, timedelta
from functools import wraps
from html import escape

from flask import Flask, request, jsonify
from flask_cors import CORS
from sqlalchemy import update
from sqlalchemy.exc import SQLAlchemyError

from models import db, User, Recipe, Pump, PourHistory, MachineState

# --- GPIO Configuration & Hardware Interface ---
# Active-High Relay Logic: GPIO.HIGH = Relay ON (pump running), GPIO.LOW = Relay OFF (pump stopped)
GPIO_AVAILABLE = False
try:
    import RPi.GPIO as GPIO
    GPIO_AVAILABLE = True
    GPIO.setmode(GPIO.BCM)
    GPIO.setwarnings(False)
    print("[OK] RPi.GPIO module loaded. Hardware control enabled.")
except ImportError:
    print("[WARN] RPi.GPIO not found. Running in SIMULATION mode.")


def initialize_pump_pin(pin_number):
    """Initialize a GPIO pin for pump control (Active-High relay)."""
    if GPIO_AVAILABLE and pin_number:
        GPIO.setup(pin_number, GPIO.OUT)
        GPIO.output(pin_number, GPIO.LOW)
        print(f"[PIN] Pin {pin_number} initialized as OUTPUT (set LOW - pump OFF)")


def pour_ingredient(pin_number, duration, pump_id=None):
    """Control the pump to pour ingredient using Active-High relay logic."""
    pump_label = f"Pump {pump_id}" if pump_id else f"Pin {pin_number}"

    if not GPIO_AVAILABLE:
        print(f"[SIM] [SIMULATION] START: {pump_label} (Pin {pin_number}) running for {duration:.2f}s")
        time.sleep(duration)
        print(f"[SIM] [SIMULATION] STOP: {pump_label} finished")
        return True

    if not pin_number:
        print(f"[ERR] {pump_label} has no pin assigned - SKIPPED")
        return False

    try:
        GPIO.setup(pin_number, GPIO.OUT, initial=GPIO.LOW)
        GPIO.output(pin_number, GPIO.HIGH)
        print(f"[HW] [HARDWARE] {pump_label} (Pin {pin_number}) ON - Pouring...")
        time.sleep(duration)
        GPIO.output(pin_number, GPIO.LOW)
        print(f"[HW] [HARDWARE] {pump_label} (Pin {pin_number}) OFF - Complete")
        return True
    except Exception as e:
        try:
            GPIO.output(pin_number, GPIO.LOW)
        except:
            pass
        print(f"[ERR] [ERROR] {pump_label} (Pin {pin_number}): {str(e)}")
        return False


# --- Flask App Setup ---
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'yoursecretkey123')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///cocktails.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

JWT_SECRET = app.config['SECRET_KEY']
JWT_ALGORITHM = 'HS256'
JWT_EXPIRY_HOURS = 72

CORS(app, resources={r"/*": {
    "origins": "*",  # Allow all origins
    "allow_headers": ["Content-Type", "Authorization"],
    "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
}})

db.init_app(app)

# --- Database Initialization ---
_db_initialized = False

@app.before_request
def ensure_db_initialized():
    """Initialize database tables on first request if needed."""
    global _db_initialized
    if _db_initialized:
        return
    _db_initialized = True
    with app.app_context():
        db.create_all()
        # Ensure MachineState singleton exists
        if MachineState.query.count() == 0:
            db.session.add(MachineState(id=1, is_pouring=False))
            db.session.commit()
            print("[INIT] MachineState created via before_request.")
        # Ensure 8 pumps exist
        if Pump.query.count() == 0:
            for i in range(1, 9):
                db.session.add(Pump(id=i, ingredient_name='Empty', is_active=False, seconds_per_50ml=3.0))
            db.session.commit()
            print("[INIT] Default pumps created via before_request.")

# --- JWT Utilities ---

def create_token(user_id, is_admin=False):
    payload = {
        'user_id': user_id,
        'is_admin': is_admin,
        'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRY_HOURS),
        'iat': datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token):
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def get_current_user():
    """Extract user from Authorization header. Returns (User, is_admin) or (None, False)."""
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return None, False

    token = auth_header[7:]

    # Admin transient session token
    if token == 'admin-session-token':
        return None, True

    payload = decode_token(token)
    if not payload:
        return None, False

    if payload.get('is_admin'):
        return None, True

    user = User.query.get(payload.get('user_id'))
    return user, False


def login_required(f):
    """Decorator requiring a valid JWT token."""
    @wraps(f)
    def decorated(*args, **kwargs):
        user, is_admin = get_current_user()
        if not user and not is_admin:
            return jsonify({'status': 'error', 'message': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated


def check_admin_auth():
    """Check if request has admin privileges."""
    _, is_admin = get_current_user()
    return is_admin


# --- Security Utilities ---

def validate_nickname(nickname):
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


@app.after_request
def security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    return response


# ==========================================================================
# AUTH ENDPOINTS
# ==========================================================================

@app.route('/api/auth/register', methods=['POST'])
def auth_register():
    """Register a new user. Returns JWT token."""
    data = request.get_json() or {}
    nickname = data.get('nickname', '')

    validated_nickname, error = validate_nickname(nickname)
    if error:
        return jsonify({'status': 'error', 'message': error}), 400

    try:
        existing = User.query.filter_by(nickname=validated_nickname).first()
        if existing:
            return jsonify({'status': 'error', 'message': 'Nickname already taken. Please choose another one.'}), 400

        recovery_key = User.generate_recovery_key()
        user = User(nickname=validated_nickname, recovery_key=recovery_key)
        db.session.add(user)
        db.session.commit()

        token = create_token(user.id)
        return jsonify({
            'status': 'success',
            'token': token,
            'user': user.to_dict(),
        })
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': 'Database error. Please try again.'}), 500


@app.route('/api/auth/login', methods=['POST'])
def auth_login():
    """Login existing user by nickname, or admin by Admin2001."""
    data = request.get_json() or {}
    nickname = data.get('nickname', '').strip()

    if not nickname:
        return jsonify({'status': 'error', 'message': 'Nickname required'}), 400

    # Admin bypass
    if nickname == 'Admin2001':
        return jsonify({
            'status': 'success',
            'token': 'admin-session-token',
            'is_admin': True,
        })

    user = User.query.filter_by(nickname=nickname).first()
    if not user:
        return jsonify({'status': 'error', 'message': 'User not found. Register first or use recovery key.'}), 404

    token = create_token(user.id)
    return jsonify({
        'status': 'success',
        'token': token,
        'user': user.to_dict(),
    })


@app.route('/api/auth/recovery', methods=['POST'])
def auth_recovery():
    """Recover account using 6-char recovery key."""
    data = request.get_json() or {}
    recovery_key = data.get('recovery_key', '').strip().upper()

    if not recovery_key:
        return jsonify({'status': 'error', 'message': 'Please enter a recovery key.'}), 400

    if len(recovery_key) != 6 or not recovery_key.isalnum():
        return jsonify({'status': 'error', 'message': 'Invalid recovery key format.'}), 400

    user = User.query.filter_by(recovery_key=recovery_key).first()
    if not user:
        return jsonify({'status': 'error', 'message': 'Invalid recovery key.'}), 400

    token = create_token(user.id)
    return jsonify({
        'status': 'success',
        'token': token,
        'user': user.to_dict(),
    })


@app.route('/api/auth/me', methods=['GET'])
@login_required
def auth_me():
    """Get current authenticated user info."""
    user, is_admin = get_current_user()
    if is_admin and not user:
        return jsonify({'status': 'success', 'user': {'nickname': 'Admin', 'is_admin': True}})
    return jsonify({'status': 'success', 'user': user.to_dict()})


# ==========================================================================
# PUBLIC ENDPOINTS
# ==========================================================================

@app.route('/api/recipes', methods=['GET'])
def get_recipes():
    """Get all recipes grouped by category."""
    classic = Recipe.query.filter_by(category='classic').all()
    highballs = Recipe.query.filter_by(category='highball').all()
    shots = Recipe.query.filter_by(category='shot').all()
    machine_state = MachineState.get_instance()

    return jsonify({
        'status': 'success',
        'classic_cocktails': [r.to_dict() for r in classic],
        'highballs': [r.to_dict() for r in highballs],
        'shots': [r.to_dict() for r in shots],
        'taste_amount_ml': machine_state.taste_amount_ml,
    })


@app.route('/api/pumps', methods=['GET'])
def get_pumps():
    """Get pump info and global volume settings."""
    pumps = Pump.query.all()
    pump_data = {}
    for pump in pumps:
        pump_data[str(pump.id)] = {
            'name': pump.ingredient_name,
            'is_alcohol': pump.is_alcohol,
            'is_virtual': pump.is_virtual,
            'seconds_per_50ml': pump.seconds_per_50ml,
        }

    machine_state = MachineState.get_instance()
    return jsonify({
        'pumps': pump_data,
        'classic_target_vol': machine_state.classic_target_vol,
        'highball_target_vol': machine_state.highball_target_vol,
        'shot_target_vol': machine_state.shot_target_vol,
        'taste_amount_ml': machine_state.taste_amount_ml,
    })


@app.route('/api/status', methods=['GET'])
def api_status():
    """Machine pouring status."""
    machine_state = MachineState.get_instance()
    return jsonify({'is_pouring': machine_state.is_pouring})


@app.route('/api/settings', methods=['GET'])
def get_settings():
    """Get global machine settings."""
    machine_state = MachineState.get_instance()
    return jsonify({
        'classic_target_vol': machine_state.classic_target_vol,
        'highball_target_vol': machine_state.highball_target_vol,
        'shot_target_vol': machine_state.shot_target_vol,
        'taste_amount_ml': machine_state.taste_amount_ml,
        'is_pouring': machine_state.is_pouring,
        'current_event_name': machine_state.current_event_name,
    })


@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    """Top 10 users (excluding Admin2001)."""
    users = User.query.filter(User.nickname != 'Admin2001').order_by(User.points.desc()).limit(10).all()
    return jsonify({'users': [u.to_dict() for u in users]})


@app.route('/api/statistics/global', methods=['GET'])
def get_global_statistics():
    """Global platform statistics."""
    all_pours = PourHistory.query.all()
    total_alcohol_ml = sum(p.points_awarded or 0 for p in all_pours)
    return jsonify({
        'status': 'success',
        'total_alcohol_liters': round(total_alcohol_ml / 1000.0, 2),
        'total_cocktails_poured': len(all_pours),
    })


# ==========================================================================
# AUTHENTICATED USER ENDPOINTS
# ==========================================================================

@app.route('/api/pour/<int:recipe_id>', methods=['POST'])
@login_required
def pour_cocktail(recipe_id):
    """Pour a cocktail. Requires auth."""
    user, is_admin = get_current_user()
    if not user:
        return jsonify({'status': 'error', 'message': 'User account required to pour'}), 403

    # Atomic lock
    result = db.session.execute(
        update(MachineState)
        .where(MachineState.id == 1, MachineState.is_pouring == False)
        .values(is_pouring=True)
    )
    db.session.commit()

    if result.rowcount == 0:
        return jsonify({'status': 'error', 'message': 'Machine is currently busy.'}), 400

    machine_state = MachineState.get_instance()

    try:
        data = request.get_json() or {}
        is_strong = data.get('is_strong', False)
        is_taste = data.get('is_taste', False)

        recipe = Recipe.query.get_or_404(recipe_id)
        ingredients = recipe.get_ingredients()
        category = recipe.category

        # Target volume
        if is_taste:
            target_volume = machine_state.taste_amount_ml
        elif category == 'highball':
            target_volume = machine_state.highball_target_vol
        elif category == 'shot':
            target_volume = machine_state.shot_target_vol
        else:
            target_volume = machine_state.classic_target_vol

        original_total = sum(float(ml) for ml in ingredients.values())
        if original_total == 0:
            return jsonify({'status': 'error', 'message': 'Invalid recipe: Zero volume.'}), 400

        # Scale ingredients
        calculated = {}
        for pump_id, orig_ml in ingredients.items():
            calculated[pump_id] = (float(orig_ml) / original_total) * target_volume

        # Strong mode: 1.5x alcohol
        if is_strong:
            for pid in calculated:
                pump = Pump.query.get(int(pid))
                if pump and pump.is_alcohol:
                    calculated[pid] *= 1.5

        # Pour (parallel threads)
        threads = []
        durations = []
        for pump_id_str, ml_amount in calculated.items():
            pump = Pump.query.get(int(pump_id_str))
            if not pump:
                continue
            pin_number = pump.pin_number
            initialize_pump_pin(pin_number)
            duration = (ml_amount / 50.0) * pump.seconds_per_50ml
            durations.append(duration)
            t = threading.Thread(target=pour_ingredient, args=(pin_number, duration, pump.id))
            threads.append(t)
            t.start()

        for t in threads:
            t.join()

        total_duration = max(durations) if durations else 0

        # Points
        total_alcohol_ml = sum(
            ml for pid, ml in calculated.items()
            if db.session.get(Pump, int(pid)) and db.session.get(Pump, int(pid)).is_alcohol
        )
        points_earned = round(total_alcohol_ml)
        
        # Strong mode gives 2x points as gamification incentive
        # (Note: actual alcohol output only increases by 1.5x)
        if is_strong:
            points_earned = round(points_earned * 2)
        
        user.points += points_earned

        history = PourHistory(
            user_id=user.id, recipe_id=recipe.id,
            is_strong=is_strong, points_awarded=points_earned
        )
        db.session.add(history)
        db.session.commit()

        mode_text = ""
        if is_taste:
            mode_text = " 🥄 TASTE!"
        if is_strong:
            mode_text += " 💪 STRONG!"

        is_highball = (category == 'highball' and not is_taste)
        highball_msg = " Base poured! Please top up with Soda/Tonic." if is_highball else ""

        return jsonify({
            'status': 'success',
            'message': f'Cheers! {points_earned} points added.{mode_text}{highball_msg}',
            'new_points': user.points,
            'points_added': points_earned,
            'total_duration': total_duration,
            'is_highball': is_highball,
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        db.session.rollback()
        return jsonify({'status': 'error', 'message': f'Pour failed: {str(e)}'}), 500

    finally:
        try:
            db.session.execute(update(MachineState).where(MachineState.id == 1).values(is_pouring=False))
            db.session.commit()
        except Exception:
            db.session.rollback()
            try:
                db.session.execute(update(MachineState).where(MachineState.id == 1).values(is_pouring=False))
                db.session.commit()
            except Exception as fe:
                print(f"CRITICAL: Failed to release machine lock: {fe}")


@app.route('/api/user/rank', methods=['GET'])
@login_required
def get_user_rank():
    user, _ = get_current_user()
    if not user:
        return jsonify({'status': 'error', 'message': 'User required'}), 403

    all_users = User.query.filter(User.nickname != 'Admin2001').order_by(User.points.desc()).all()
    position = None
    player_ahead = None

    for idx, u in enumerate(all_users):
        if u.id == user.id:
            position = idx + 1
            if idx > 0:
                player_ahead = all_users[idx - 1]
            break

    if position is None:
        return jsonify({'status': 'error', 'message': 'User not found'}), 404

    return jsonify({
        'status': 'success',
        'position': position,
        'total_users': len(all_users),
        'player_ahead': {
            'nickname': player_ahead.nickname,
            'points': player_ahead.points,
            'points_behind': player_ahead.points - user.points,
        } if player_ahead else None,
    })


@app.route('/api/user/statistics', methods=['GET'])
@login_required
def get_user_statistics():
    user, _ = get_current_user()
    if not user:
        return jsonify({'status': 'error', 'message': 'User required'}), 403

    history = PourHistory.query.filter_by(user_id=user.id).all()
    total_alcohol_ml = 0
    recipe_counts = {}

    for pour in history:
        recipe = Recipe.query.get(pour.recipe_id)
        if recipe:
            recipe_counts[recipe.name] = recipe_counts.get(recipe.name, 0) + 1
        total_alcohol_ml += pour.points_awarded or 0

    favorite = max(recipe_counts, key=recipe_counts.get) if recipe_counts else None
    total_pours = len(history)
    strong_pct = round((sum(1 for p in history if p.is_strong) / total_pours) * 100, 1) if total_pours else 0

    all_users = User.query.filter(User.nickname != 'Admin2001').order_by(User.points.desc()).all()
    rank = next((i + 1 for i, u in enumerate(all_users) if u.id == user.id), 0)

    return jsonify({
        'status': 'success',
        'total_alcohol_ml': round(total_alcohol_ml, 1),
        'favorite_cocktail': favorite,
        'current_rank': rank,
        'strong_mode_percentage': strong_pct,
        'total_pours': total_pours,
    })


@app.route('/api/user/<int:user_id>/statistics', methods=['GET'])
@login_required
def get_public_user_statistics(user_id):
    target = User.query.get(user_id)
    if not target:
        return jsonify({'status': 'error', 'message': 'User not found'}), 404

    history = PourHistory.query.filter_by(user_id=user_id).all()
    total_alcohol_ml = 0
    recipe_counts = {}

    for pour in history:
        recipe = Recipe.query.get(pour.recipe_id)
        if recipe:
            recipe_counts[recipe.name] = recipe_counts.get(recipe.name, 0) + 1
        total_alcohol_ml += pour.points_awarded or 0

    favorite = max(recipe_counts, key=recipe_counts.get) if recipe_counts else None
    total_pours = len(history)
    strong_pct = round((sum(1 for p in history if p.is_strong) / total_pours) * 100, 1) if total_pours else 0

    all_users = User.query.filter(User.nickname != 'Admin2001').order_by(User.points.desc()).all()
    rank = next((i + 1 for i, u in enumerate(all_users) if u.id == user_id), 0)

    return jsonify({
        'status': 'success',
        'user_id': target.id,
        'nickname': target.nickname,
        'points': target.points,
        'total_alcohol_ml': round(total_alcohol_ml, 1),
        'favorite_cocktail': favorite,
        'current_rank': rank,
        'strong_mode_percentage': strong_pct,
        'total_pours': total_pours,
    })


@app.route('/api/profile', methods=['GET'])
@login_required
def get_profile():
    user, _ = get_current_user()
    if not user:
        return jsonify({'status': 'error', 'message': 'User required'}), 403
    return jsonify({'status': 'success', 'user': user.to_dict()})


@app.route('/api/profile/delete', methods=['POST'])
@login_required
def delete_profile():
    user, _ = get_current_user()
    if not user:
        return jsonify({'status': 'error', 'message': 'User required'}), 403
    try:
        PourHistory.query.filter_by(user_id=user.id).delete()
        db.session.delete(user)
        db.session.commit()
        return jsonify({'status': 'success', 'message': 'Account deleted'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


# ==========================================================================
# ADMIN ENDPOINTS
# ==========================================================================

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not check_admin_auth():
            return jsonify({'status': 'error', 'message': 'Unauthorized'}), 403
        return f(*args, **kwargs)
    return decorated


@app.route('/api/admin/pumps', methods=['GET'])
@admin_required
def admin_get_pumps():
    pumps = Pump.query.order_by(Pump.id).all()
    return jsonify({'pumps': [p.to_dict() for p in pumps]})


@app.route('/api/admin/recipes', methods=['GET'])
@admin_required
def admin_get_recipes():
    recipes = Recipe.query.all()
    return jsonify({'recipes': [r.to_dict() for r in recipes]})


@app.route('/api/admin/users', methods=['GET'])
@admin_required
def admin_get_users():
    users = User.query.all()
    return jsonify({'users': [
        {'id': u.id, 'nickname': u.nickname, 'points': u.points, 'is_admin': u.nickname == 'Admin2001'}
        for u in users
    ]})


@app.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
@admin_required
def admin_delete_user(user_id):
    user = User.query.get_or_404(user_id)
    PourHistory.query.filter_by(user_id=user_id).delete()
    db.session.delete(user)
    db.session.commit()
    return jsonify({'status': 'success'})


@app.route('/api/admin/recipes/<int:recipe_id>', methods=['DELETE'])
@admin_required
def admin_delete_recipe(recipe_id):
    recipe = Recipe.query.get_or_404(recipe_id)
    db.session.delete(recipe)
    db.session.commit()
    return jsonify({'status': 'success'})


@app.route('/api/admin/update', methods=['POST'])
@admin_required
def admin_update_entity():
    """Generic auto-save endpoint for pump/user/recipe field updates."""
    data = request.get_json()
    if not data:
        return jsonify({'status': 'error', 'message': 'No data provided'}), 400

    entity = data.get('entity')
    entity_id = data.get('id')
    field = data.get('field')
    value = data.get('value')

    try:
        if entity == 'pump':
            pump = Pump.query.get(int(entity_id))
            if not pump:
                return jsonify({'status': 'error', 'message': 'Pump not found'}), 404
            if field == 'pin_number':
                value = int(value) if value else None
            elif field in ('is_active', 'is_alcohol', 'is_virtual'):
                value = bool(int(value))
            elif field == 'seconds_per_50ml':
                value = float(value)
            if hasattr(pump, field):
                setattr(pump, field, value)
                db.session.commit()
                return jsonify({'status': 'success', 'message': 'Pump updated'})
            return jsonify({'status': 'error', 'message': 'Invalid field'}), 400

        elif entity == 'user':
            user = User.query.get(entity_id)
            if not user:
                return jsonify({'status': 'error', 'message': 'User not found'}), 404
            if field == 'points':
                user.points = int(value)
                db.session.commit()
                return jsonify({'status': 'success', 'message': 'Points updated'})

        elif entity == 'recipe':
            recipe = Recipe.query.get(entity_id)
            if not recipe:
                return jsonify({'status': 'error', 'message': 'Recipe not found'}), 404
            if field == 'name':
                recipe.name = str(value)
            elif field == 'description':
                recipe.description = str(value)
            elif field == 'category' and value in ('classic', 'highball', 'shot'):
                recipe.category = str(value)
            elif field.startswith('ingredient_'):
                pump_id = field.split('_')[1]
                ings = recipe.get_ingredients()
                amount = float(value)
                if amount > 0:
                    ings[pump_id] = amount
                elif pump_id in ings:
                    del ings[pump_id]
                recipe.ingredients_json = json.dumps(ings)
            db.session.commit()
            return jsonify({'status': 'success', 'message': 'Updated'})

    except (ValueError, TypeError, OverflowError) as e:
        return jsonify({'status': 'error', 'message': f'Invalid value: {str(e)}'}), 400
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': 'Database error'}), 500

    return jsonify({'status': 'error', 'message': 'Invalid entity or field'}), 400


@app.route('/api/admin/recipe/save', methods=['POST'])
@admin_required
def admin_save_recipe():
    """Create or update a recipe."""
    data = request.get_json()
    recipe_id = data.get('id')
    name = data.get('name')
    description = data.get('description')
    category = data.get('category', 'classic')
    ingredients = data.get('ingredients', {})

    if not name or not ingredients:
        return jsonify({'status': 'error', 'message': 'Name and ingredients required'}), 400
    if category not in ('classic', 'highball', 'shot'):
        return jsonify({'status': 'error', 'message': 'Invalid category'}), 400

    try:
        ingredients_json = json.dumps({str(k): float(v) for k, v in ingredients.items() if float(v) > 0})

        # Auto-calculate points
        points_reward = 0
        for pid, ml in ingredients.items():
            pump = Pump.query.get(int(pid))
            if pump and pump.is_alcohol:
                points_reward += float(ml)
        points_reward = round(points_reward)

        if recipe_id:
            recipe = Recipe.query.get(recipe_id)
            if not recipe:
                return jsonify({'status': 'error', 'message': 'Recipe not found'}), 404
            recipe.name = name
            recipe.description = description
            recipe.category = category
            recipe.ingredients_json = ingredients_json
            recipe.points_reward = points_reward
            message = 'Recipe updated'
        else:
            recipe = Recipe(name=name, description=description, category=category,
                            ingredients_json=ingredients_json, points_reward=points_reward)
            db.session.add(recipe)
            message = 'Recipe created'

        db.session.commit()
        return jsonify({'status': 'success', 'message': message})
    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/admin/user/save', methods=['POST'])
@admin_required
def admin_save_user():
    data = request.get_json()
    user_id = data.get('id')
    nickname = data.get('nickname')
    points = data.get('points')

    if not nickname:
        return jsonify({'status': 'error', 'message': 'Nickname required'}), 400

    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'status': 'error', 'message': 'User not found'}), 404
        if user.nickname != nickname:
            if User.query.filter_by(nickname=nickname).first():
                return jsonify({'status': 'error', 'message': 'Nickname already taken'}), 400
            user.nickname = nickname
        if points is not None:
            user.points = int(points)
        db.session.commit()
        return jsonify({'status': 'success', 'message': 'User updated'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/admin/action', methods=['POST'])
@admin_required
def admin_action():
    data = request.get_json()
    action = data.get('action')
    target_id = data.get('id')

    try:
        if action == 'delete_recipe':
            Recipe.query.filter_by(id=target_id).delete()
            db.session.commit()
            return jsonify({'status': 'success', 'message': 'Recipe deleted'})
        elif action == 'delete_user':
            PourHistory.query.filter_by(user_id=target_id).delete()
            User.query.filter_by(id=target_id).delete()
            db.session.commit()
            return jsonify({'status': 'success', 'message': 'User deleted'})
        elif action == 'delete_all_users':
            PourHistory.query.delete()
            User.query.delete()
            db.session.commit()
            return jsonify({'status': 'success', 'message': 'All users deleted'})
        elif action == 'reset_points':
            for u in User.query.all():
                u.points = 0
            db.session.commit()
            return jsonify({'status': 'success', 'message': 'All points reset'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500

    return jsonify({'status': 'error', 'message': 'Invalid action'}), 400


@app.route('/api/admin/category-volumes', methods=['GET', 'POST'])
@admin_required
def admin_category_volumes():
    machine_state = MachineState.get_instance()

    if request.method == 'GET':
        return jsonify({
            'status': 'success',
            'classic_target_vol': machine_state.classic_target_vol,
            'highball_target_vol': machine_state.highball_target_vol,
            'shot_target_vol': machine_state.shot_target_vol,
        })

    data = request.get_json()
    category = data.get('category')
    volume = data.get('volume')

    if not category or not volume:
        return jsonify({'status': 'error', 'message': 'category and volume required'}), 400

    try:
        volume = int(volume)
        if category == 'classic':
            machine_state.classic_target_vol = volume
        elif category == 'highball':
            machine_state.highball_target_vol = volume
        elif category == 'shot':
            machine_state.shot_target_vol = volume
        else:
            return jsonify({'status': 'error', 'message': 'Invalid category'}), 400

        db.session.commit()
        return jsonify({'status': 'success', 'message': f'{category} volume updated to {volume}ml'})
    except (ValueError, TypeError):
        return jsonify({'status': 'error', 'message': 'Invalid volume'}), 400


@app.route('/api/admin/taste-amount', methods=['GET', 'POST'])
@admin_required
def admin_taste_amount():
    machine_state = MachineState.get_instance()

    if request.method == 'GET':
        return jsonify({'status': 'success', 'taste_amount_ml': machine_state.taste_amount_ml})

    data = request.get_json()
    amount = data.get('taste_amount_ml')

    if not amount:
        return jsonify({'status': 'error', 'message': 'taste_amount_ml required'}), 400

    try:
        amount = int(amount)
        if amount < 10 or amount > 100:
            return jsonify({'status': 'error', 'message': 'Must be 10-100ml'}), 400
        machine_state.taste_amount_ml = amount
        db.session.commit()
        return jsonify({'status': 'success', 'message': f'Taste amount updated to {amount}ml', 'taste_amount_ml': amount})
    except (ValueError, TypeError):
        return jsonify({'status': 'error', 'message': 'Invalid value'}), 400


@app.route('/api/admin/start-event', methods=['POST'])
@admin_required
def start_new_event():
    """Start a new event: update event name and delete all guests."""
    data = request.get_json() or {}
    event_name = data.get('event_name', '').strip()
    
    if not event_name:
        return jsonify({'status': 'error', 'message': 'Event name is required'}), 400
    if len(event_name) > 200:
        return jsonify({'status': 'error', 'message': 'Event name must be 200 characters or less'}), 400
    
    try:
        # Update event name
        machine_state = MachineState.get_instance()
        machine_state.current_event_name = event_name
        
        # Delete all pour history first (foreign key constraint)
        PourHistory.query.delete()
        # Delete all guests
        User.query.delete()
        
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': f'New event "{event_name}" started! Guest list has been reset.',
            'event_name': event_name
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': f'Failed to start event: {str(e)}'}), 500


@app.route('/api/admin/shutdown', methods=['POST'])
@admin_required
def admin_shutdown():
    """Shutdown the Raspberry Pi (works from privileged Docker container with pid:host)."""
    import platform
    import subprocess

    # Only allow shutdown on Linux (Raspberry Pi)
    if platform.system() != 'Linux':
        return jsonify({
            'status': 'error', 
            'message': f'Shutdown not supported on {platform.system()}. Only available on Raspberry Pi.'
        }), 400

    def delayed_shutdown():
        """Run shutdown after a short delay so the HTTP response can be sent."""
        time.sleep(2)
        try:
            # Primary: nsenter into host PID namespace (requires pid:"host" in docker-compose)
            subprocess.run(
                ['nsenter', '--target', '1', '--mount', '--uts', '--ipc', '--net', '--pid',
                 '--', '/sbin/shutdown', '-h', 'now'],
                timeout=10
            )
        except Exception as e1:
            print(f"[SHUTDOWN] nsenter failed: {e1}, trying sysrq fallback...")
            try:
                # Fallback: sysrq trigger (works in privileged containers)
                with open('/proc/sysrq-trigger', 'w') as f:
                    f.write('o')  # Power off
            except Exception as e2:
                print(f"[SHUTDOWN] All methods failed: {e2}")

    t = threading.Thread(target=delayed_shutdown, daemon=True)
    t.start()

    return jsonify({'status': 'success', 'message': 'Shutting down in 2 seconds...'})


@app.route('/api/admin/pump/<int:pump_id>/test', methods=['POST'])
@admin_required
def admin_test_pump(pump_id):
    """Test a pump by turning it on/off."""
    data = request.get_json() or {}
    action = data.get('action', 'toggle')  # 'on', 'off', or 'toggle'
    duration = data.get('duration', 5)  # Default 5 seconds for timed test
    
    pump = Pump.query.get(pump_id)
    if not pump:
        return jsonify({'status': 'error', 'message': 'Pump not found'}), 404
    
    pin_number = pump.pin_number
    if not pin_number:
        return jsonify({'status': 'error', 'message': 'Pump has no GPIO pin assigned'}), 400
    
    try:
        if action == 'on':
            if GPIO_AVAILABLE:
                GPIO.setup(pin_number, GPIO.OUT)
                GPIO.output(pin_number, GPIO.HIGH)
            return jsonify({'status': 'success', 'message': f'Pump {pump_id} turned ON', 'state': 'on'})
        
        elif action == 'off':
            if GPIO_AVAILABLE:
                GPIO.setup(pin_number, GPIO.OUT)
                GPIO.output(pin_number, GPIO.LOW)
            return jsonify({'status': 'success', 'message': f'Pump {pump_id} turned OFF', 'state': 'off'})
        
        elif action == 'timed':
            # Run pump for specified duration (for calibration)
            duration = min(max(float(duration), 1), 30)  # Clamp between 1-30 seconds
            
            def run_timed():
                if GPIO_AVAILABLE:
                    GPIO.setup(pin_number, GPIO.OUT)
                    GPIO.output(pin_number, GPIO.HIGH)
                    time.sleep(duration)
                    GPIO.output(pin_number, GPIO.LOW)
                else:
                    print(f"[SIM] Pump {pump_id} running for {duration}s")
                    time.sleep(duration)
                    print(f"[SIM] Pump {pump_id} stopped")
            
            thread = threading.Thread(target=run_timed)
            thread.start()
            return jsonify({
                'status': 'success', 
                'message': f'Pump {pump_id} running for {duration}s',
                'duration': duration
            })
        
        else:
            return jsonify({'status': 'error', 'message': 'Invalid action. Use on, off, or timed'}), 400
            
    except Exception as e:
        # Safety: turn off pump on error
        if GPIO_AVAILABLE and pin_number:
            try:
                GPIO.output(pin_number, GPIO.LOW)
            except:
                pass
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/admin/pump/<int:pump_id>/calibrate', methods=['POST'])
@admin_required
def admin_calibrate_pump(pump_id):
    """Calculate seconds_per_50ml based on measured output."""
    data = request.get_json() or {}
    duration = data.get('duration', 5)  # How long the pump ran
    ml_measured = data.get('ml_measured')  # How many ml came out
    
    if not ml_measured or float(ml_measured) <= 0:
        return jsonify({'status': 'error', 'message': 'ml_measured is required and must be > 0'}), 400
    
    pump = Pump.query.get(pump_id)
    if not pump:
        return jsonify({'status': 'error', 'message': 'Pump not found'}), 404
    
    try:
        duration = float(duration)
        ml_measured = float(ml_measured)
        
        # Calculate: if pump ran for X seconds and produced Y ml,
        # then seconds_per_50ml = (X / Y) * 50
        seconds_per_50ml = (duration / ml_measured) * 50
        seconds_per_50ml = round(seconds_per_50ml, 2)
        
        # Sanity check (0.5 to 30 seconds per 50ml is reasonable)
        if seconds_per_50ml < 0.5 or seconds_per_50ml > 30:
            return jsonify({
                'status': 'warning',
                'message': f'Calculated value {seconds_per_50ml}s seems unusual. Please verify your measurement.',
                'seconds_per_50ml': seconds_per_50ml,
                'applied': False
            })
        
        pump.seconds_per_50ml = seconds_per_50ml
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': f'Calibration saved: {seconds_per_50ml}s per 50ml',
            'seconds_per_50ml': seconds_per_50ml,
            'applied': True
        })
    except (ValueError, TypeError) as e:
        return jsonify({'status': 'error', 'message': f'Invalid values: {str(e)}'}), 400


# ==========================================================================
# ERROR HANDLERS
# ==========================================================================

@app.errorhandler(404)
def not_found(error):
    return jsonify({'status': 'error', 'message': 'Endpoint not found'}), 404


@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return jsonify({'status': 'error', 'message': 'Internal Server Error'}), 500


# ==========================================================================
# STARTUP
# ==========================================================================

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        print("[OK] Database tables verified.")

        # Ensure 8 pumps exist
        if Pump.query.count() == 0:
            for i in range(1, 9):
                db.session.add(Pump(id=i, ingredient_name='Empty', is_active=False, seconds_per_50ml=3.0))
            db.session.add(MachineState(id=1, is_pouring=False))
            db.session.commit()
            print("[INIT] Default pumps and machine state created.")

        # Ensure Admin2001 exists
        try:
            if not User.query.filter_by(nickname='Admin2001').first():
                db.session.add(User(nickname='Admin2001', recovery_key='ADMIN1'))
                db.session.commit()
                print("[USER] Admin2001 user created.")
        except Exception as e:
            print(f"[WARN] Admin check: {e}")

    app.run(debug=True, host='0.0.0.0')
