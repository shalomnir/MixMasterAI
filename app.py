import os
import re
from flask import Flask, render_template, redirect, url_for, flash, request, jsonify, make_response
import json
from datetime import datetime, timedelta
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from models import db, User, Recipe, Pump, PourHistory, MachineState
# --- GPIO Configuration & Hardware Interface ---
# Active-High Relay Logic: GPIO.HIGH = Relay ON (pump running), GPIO.LOW = Relay OFF (pump stopped)
GPIO_AVAILABLE = False
try:
    import RPi.GPIO as GPIO
    GPIO_AVAILABLE = True
    GPIO.setmode(GPIO.BCM)
    GPIO.setwarnings(False)
    print("✅ RPi.GPIO module loaded. Hardware control enabled.")
except ImportError:
    print("⚠️ RPi.GPIO not found. Running in SIMULATION mode.")


def initialize_pump_pin(pin_number):
    """
    Initialize a GPIO pin for pump control (Active-High relay).
    Sets pin as OUTPUT and immediately sets LOW to ensure pump is OFF.
    
    Args:
        pin_number (int): The BCM GPIO pin number
    """
    if GPIO_AVAILABLE and pin_number:
        GPIO.setup(pin_number, GPIO.OUT)
        GPIO.output(pin_number, GPIO.LOW)  # LOW = OFF for Active-High relay
        print(f"📌 Pin {pin_number} initialized as OUTPUT (set LOW - pump OFF)")


def pour_ingredient(pin_number, duration, pump_id=None):
    """
    Control the pump to pour ingredient using Active-High relay logic.
    Handles both Simulation Mode and Real GPIO Mode.
    
    Active-High Logic:
        - GPIO.HIGH = Relay activated = Pump ON (pouring)
        - GPIO.LOW  = Relay deactivated = Pump OFF (stopped)
    
    Args:
        pin_number (int): The BCM GPIO pin number (from Pump.pin_number in database)
        duration (float): How long to run the pump in seconds
        pump_id (int, optional): The pump ID for logging purposes
    """
    import time
    
    pump_label = f"Pump {pump_id}" if pump_id else f"Pin {pin_number}"
    
    if not GPIO_AVAILABLE:
        # --- SIMULATION MODE ---
        print(f"🧪 [SIMULATION] START: {pump_label} (Pin {pin_number}) running for {duration:.2f}s")
        time.sleep(duration)
        print(f"🧪 [SIMULATION] STOP: {pump_label} finished")
        return True
    
    # --- REAL HARDWARE MODE (Active-Low relay) ---
    if not pin_number:
        print(f"❌ {pump_label} has no pin assigned - SKIPPED")
        return False
    
    try:
        # Ensure pin is configured as output with initial LOW state (OFF)
        GPIO.setup(pin_number, GPIO.OUT, initial=GPIO.LOW)
        
        # ACTIVE-HIGH: Set pin HIGH to turn pump ON
        GPIO.output(pin_number, GPIO.HIGH)
        print(f"⚡ [HARDWARE] {pump_label} (Pin {pin_number}) ON - Pouring...")
        
        time.sleep(duration)
        
        # ACTIVE-HIGH: Set pin LOW to turn pump OFF
        GPIO.output(pin_number, GPIO.LOW)
        print(f"⚡ [HARDWARE] {pump_label} (Pin {pin_number}) OFF - Complete")
        return True
        
    except Exception as e:
        # Safety: Ensure pin is set LOW (OFF) on any error
        try:
            GPIO.output(pin_number, GPIO.LOW)
        except:
            pass
        print(f"❌ [ERROR] {pump_label} (Pin {pin_number}): {str(e)}")
        return False


from sqlalchemy import update
from sqlalchemy.exc import SQLAlchemyError
from html import escape
from functools import wraps
import threading

app = Flask(__name__)
app.config['SECRET_KEY'] = 'yoursecretkey123'  # IMPORTANT: Change for production!
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///cocktails.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
# Permanent session configuration (12-hour lifetime)
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=12)
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'None' # Changed to None for cross-site if needed, or keep Strict if same domain
app.config['SESSION_COOKIE_SECURE'] = True # Secure required for None

from flask_cors import CORS
# Allow both localhost (dev) and production app
CORS(app, supports_credentials=True, resources={r"/api/*": {"origins": ["http://localhost:5000", "https://mixmasterai.app", "https://api.mixmasterai.app"]}})

db.init_app(app)

login_manager = LoginManager()
login_manager.login_view = 'index'
login_manager.init_app(app)

# Helper for Admin Auth (Cookie OR Header)
def check_admin_auth():
    # 1. Check Magic Header (Transient Session)
    auth_header = request.headers.get('Authorization')
    if auth_header == 'Bearer admin-session-token':
        return True
        
    # 2. Check Legacy Cookie
    admin_password = request.cookies.get('admin_password')
    if admin_password == 'COCKTAIL2026':
        return True
        
    # 3. Check Flask Login (if User is Admin)
    if current_user.is_authenticated and getattr(current_user, 'is_admin', False):
        return True
        
    return False

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# --- Security Utilities ---
def validate_nickname(nickname):
    """Validate and sanitize nickname input"""
    if not nickname or not nickname.strip():
        return None, "Nickname cannot be empty"
    
    nickname = nickname.strip()
    
    # Length validation (2-50 chars)
    if len(nickname) < 2:
        return None, "Nickname must be at least 2 characters"
    if len(nickname) > 50:
        return None, "Nickname must be less than 50 characters"
    
    # Allow only alphanumeric, spaces, and basic punctuation
    if not re.match(r'^[a-zA-Z0-9\s._-]+$', nickname):
        return None, "Nickname can only contain letters, numbers, spaces, dots, underscores, and hyphens"
    
    # Escape HTML to prevent XSS
    nickname = escape(nickname)
    
    return nickname, None

def admin_required(f):
    """Decorator to require admin authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            flash("Please log in first", "error")
            return redirect(url_for('index'))
        if current_user.nickname != "Admin2001":
            flash("Unauthorized: Admin access required", "error")
            return redirect(url_for('menu'))
        return f(*args, **kwargs)
    return decorated_function

@app.after_request
def security_headers(response):
    """Add security headers to all responses"""
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    # Only add HSTS in production with HTTPS
    # response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    return response

# --- Auth Wall ---
@app.before_request
def check_auth():
    """Global auth wall - redirect unauthorized users to landing page"""
    from flask import session
    
    # Define public routes (accessible without authentication)
    public_routes = ['index', 'recovery', 'static']
    
    # Allow public routes
    if request.endpoint in public_routes:
        return None
    
    # Allow admin dashboard route (has its own cookie-based auth)
    if request.endpoint == 'admin_dashboard':
        return None
    
    # Allow API endpoints that have their own auth checks
    if request.endpoint and request.endpoint.startswith('admin_api'):
        return None
    
    # Redirect unauthenticated users to landing page
    if not current_user.is_authenticated:
        flash('Please log in to access this page.', 'error')
        return redirect(url_for('index'))

# --- CLI Commands ---
@app.cli.command("init-db")
def init_db_command():
    """Create database tables and predefined data."""
    with app.app_context():
        db.create_all()
        
        # Create Pumps if not exist
        if Pump.query.count() == 0:
            pumps = [
                Pump(id=1, ingredient_name='Vodka', is_active=True),
                Pump(id=2, ingredient_name='Orange Juice', is_active=True),
                Pump(id=3, ingredient_name='Blue Curacao', is_active=True),
                Pump(id=4, ingredient_name='Sprite', is_active=True),
                Pump(id=5, ingredient_name='Empty', is_active=False),
                Pump(id=6, ingredient_name='Empty', is_active=False),
                Pump(id=7, ingredient_name='Empty', is_active=False),
                Pump(id=8, ingredient_name='Empty', is_active=False)
            ]
            db.session.add_all(pumps)
            
            # Create a sample recipe
            vodka_oj = Recipe(
                name='Screwdriver', 
                points_reward=15, 
                ingredients_json='{"1": 2, "2": 4}' # 2 sec vodka, 4 sec OJ
            )
            # Create a sample recipe 2
            blue_lagoon = Recipe(
                name='Blue Lagoon',
                points_reward=20,
                ingredients_json='{"1": 2, "3": 2, "4": 4}'
            )
            
            db.session.add(vodka_oj)
            db.session.add(blue_lagoon)
            
            # Initialize MachineState
            machine_state = MachineState(id=1, is_pouring=False)
            db.session.add(machine_state)
            
            db.session.commit()
            print("Database initialized with sample data.")
        else:
            print("Database already contains data.")

# --- Routes ---

@app.route('/', methods=['GET', 'POST'])
def index():
    # Check for persistent cookie
    user_id_cookie = request.cookies.get('user_id')
    if user_id_cookie:
        try:
            user = User.query.get(int(user_id_cookie))
            if user:
                login_user(user)
                return redirect(url_for('menu'))
        except Exception:
            pass
    
    if current_user.is_authenticated:
        return redirect(url_for('menu'))
    
    if request.method == 'POST':
        # Check if this is an AJAX request
        is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'
        
        nickname = request.form.get('nickname', '')
        
        # --- ADMIN BYPASS LOGIC ---
        # Immediate redirect for Admin2001 - No DB entry, no session
        if nickname == "Admin2001":
            response = make_response(redirect(url_for('admin_dashboard')))
            response.set_cookie(
                'admin_password',
                'COCKTAIL2026',
                max_age=3600,
                httponly=True,
                samesite='Strict'
            )
            flash('Welcome, Admin! Access granted via bypass.', 'success')
            return response
        # ---------------------------
        
        # Use validation function
        validated_nickname, error = validate_nickname(nickname)
        if error:
            if is_ajax:
                return jsonify({'status': 'error', 'message': error}), 400
            flash(error, 'error')
            return redirect(url_for('index'))
        
        try:
            # Check if nickname already exists - PREVENT DUPLICATE
            existing_user = User.query.filter_by(nickname=validated_nickname).first()
            
            if existing_user:
                # Return error for duplicate nickname
                error_msg = 'Nickname already taken. Please choose another one.'
                if is_ajax:
                    return jsonify({'status': 'error', 'message': error_msg}), 400
                flash(error_msg, 'error')
                return redirect(url_for('index'))
            else:
                # Create new user with auto-generated recovery key
                recovery_key = User.generate_recovery_key()
                user = User(nickname=validated_nickname, recovery_key=recovery_key)
                db.session.add(user)
                db.session.commit()
                flash(f"Welcome, {validated_nickname}! Your account has been created.", "success")
            
            # Login user with permanent session
            login_user(user, remember=True)
            from flask import session
            session.permanent = True
            
        except SQLAlchemyError as e:
            db.session.rollback()
            error_msg = 'Database error. Please try again.'
            if is_ajax:
                return jsonify({'status': 'error', 'message': error_msg}), 500
            flash(error_msg, 'error')
            return redirect(url_for('index'))
        
        # Redirect to menu (session is already set by login_user)
        if is_ajax:
            return jsonify({'status': 'success', 'redirect': url_for('menu')})
        return redirect(url_for('menu'))
            
    return render_template('index.html', now=datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S'))

@app.route('/recovery', methods=['GET', 'POST'])
def recovery():
    """Account recovery using recovery key"""
    # If already logged in, redirect to menu
    if current_user.is_authenticated:
        return redirect(url_for('menu'))
    
    if request.method == 'POST':
        recovery_key = request.form.get('recovery_key', '').strip().upper()
        
        if not recovery_key:
            flash('Please enter a recovery key.', 'error')
            return redirect(url_for('recovery'))
        
        # Validate recovery key format (6 alphanumeric characters)
        if len(recovery_key) != 6 or not recovery_key.isalnum():
            flash('Invalid recovery key format. Must be 6 alphanumeric characters.', 'error')
            return redirect(url_for('recovery'))
        
        try:
            # Find user by recovery key
            user = User.query.filter_by(recovery_key=recovery_key).first()
            
            if user:
                # Login user with permanent session
                login_user(user, remember=True)
                from flask import session
                session.permanent = True
                
                flash(f'Welcome back, {user.nickname}! Your session has been restored.', 'success')
                return redirect(url_for('menu'))
            else:
                flash('Invalid recovery key. Please check with the admin.', 'error')
                return redirect(url_for('recovery'))
                
        except SQLAlchemyError:
            flash('Database error. Please try again.', 'error')
            return redirect(url_for('recovery'))
    
    return render_template('recovery.html')

@app.route('/menu')
@login_required
def menu():
    # Group recipes by category
    classic_cocktails = Recipe.query.filter_by(category='classic').all()
    highballs = Recipe.query.filter_by(category='highball').all()
    shots = Recipe.query.filter_by(category='shot').all()
    
    machine_state = MachineState.get_instance()
    return render_template(
        'menu.html', 
        classic_cocktails=classic_cocktails,
        highballs=highballs,
        shots=shots,
        taste_amount_ml=machine_state.taste_amount_ml
    )

@app.route('/api/pumps')
def get_pumps():
    """API endpoint to get pump information"""
    pumps = Pump.query.all()
    pump_data = {}
    for pump in pumps:
        pump_data[str(pump.id)] = {
            'name': pump.ingredient_name,
            'is_alcohol': pump.is_alcohol,  # Send alcohol flag
            'is_virtual': pump.is_virtual,  # NEW: Send virtual pump flag
            'seconds_per_50ml': pump.seconds_per_50ml  # Send calibration data
        }
    
    # Include all global volume settings in response
    machine_state = MachineState.get_instance()
    return jsonify({
        'pumps': pump_data,
        'classic_target_vol': machine_state.classic_target_vol,
        'highball_target_vol': machine_state.highball_target_vol,
        'shot_target_vol': machine_state.shot_target_vol,
        'taste_amount_ml': machine_state.taste_amount_ml
    })

@app.route('/pour/<int:recipe_id>', methods=['POST'])
@login_required
def pour_cocktail(recipe_id):
    # Atomic compare-and-swap for machine state (prevents race conditions)
    result = db.session.execute(
        update(MachineState)
        .where(MachineState.id == 1, MachineState.is_pouring == False)
        .values(is_pouring=True)
    )
    db.session.commit()
    
    # Check if we successfully acquired the lock
    if result.rowcount == 0:
        return jsonify({
            'status': 'error',
            'message': 'Oops! Someone beat you to it! The machine is currently busy.'
        }), 400
    
    # Get machine state instance for later use
    machine_state = MachineState.get_instance()
    
    try:
        # Get is_strong and is_taste flags from request
        data = request.get_json() or {}
        is_strong = data.get('is_strong', False)
        is_taste = data.get('is_taste', False)
        
        recipe = Recipe.query.get_or_404(recipe_id)
        ingredients = recipe.get_ingredients()
        category = recipe.category  # Get drink category (classic, highball, or shot)
        
        # Calculate proportional recipe based on drink category
        # CATEGORY MODE: Scale to category-specific target volume
        # TASTE MODE: Override with taste_amount_ml regardless of category
        
        if is_taste:
            # Tasting mode overrides category volume
            target_volume = machine_state.taste_amount_ml
        else:
            # Use category-specific target volume
            if category == 'highball':
                target_volume = machine_state.highball_target_vol
            elif category == 'shot':
                target_volume = machine_state.shot_target_vol
            else:  # default to 'classic'
                target_volume = machine_state.classic_target_vol
        
        # Scaling Logic (Standardized)
        # Formula: Ingredient_Vol_new = (Ingredient_Vol_original / Total_Recipe_Vol) * Target_Vol_category
        
        # Step 1: Calculate total ml from original recipe
        original_total = sum(float(ml) for ml in ingredients.values())
        
        if original_total == 0:
            return jsonify({'status': 'error', 'message': 'Invalid recipe: Zero volume.'}), 400

        # Step 2: Calculate actual ml based on target volume
        calculated_ingredients = {}
        for pump_id, orig_ml in ingredients.items():
            # Apply the scaling formula
            calculated_ingredients[pump_id] = (float(orig_ml) / original_total) * target_volume
        
        # Step 3: Strong Mode (1.5x alcohol)
        # This increases the final volume and the alcohol amount
        if is_strong:
            for pump_id in calculated_ingredients.keys():
                pump = Pump.query.get(int(pump_id))
                if pump and pump.is_alcohol:
                    calculated_ingredients[pump_id] = calculated_ingredients[pump_id] * 1.5
        
        # Pour process with ML-based calibration (PARALLEL EXECUTION)
        # All pumps are activated via GPIO - no virtual pump handling
        threads = []
        durations = []
        
        for pump_id_str, ml_amount in calculated_ingredients.items():
            pump_id = int(pump_id_str)
            pump = Pump.query.get(pump_id)
            
            if not pump:
                continue
            
            # Get dynamic pin_number from database (set via Admin UI)
            pin_number = pump.pin_number
            
            # Initialize pin to HIGH (OFF) before pouring to prevent auto-start
            initialize_pump_pin(pin_number)
                
            # Convert ML to seconds using calibration: Time = (ML / 50) * seconds_per_50ml
            duration = (ml_amount / 50.0) * pump.seconds_per_50ml
            durations.append(duration)
            
            # Create and start a thread for GPIO activation
            # Pass pin_number (dynamic from DB), duration, and pump_id (for logging)
            thread = threading.Thread(target=pour_ingredient, args=(pin_number, duration, pump_id))
            threads.append(thread)
            thread.start()
        
        # Wait for all pumps to finish
        for thread in threads:
            thread.join()
        
        # Total duration is the longest pump duration (since they run in parallel)
        total_duration = max(durations) if durations else 0
        
        # Calculate points based on actual alcohol poured (1 point per 1 ml)
        total_alcohol_ml = 0
        for pump_id_str, ml_amount in calculated_ingredients.items():
            pump = Pump.query.get(int(pump_id_str))
            if pump and pump.is_alcohol:
                total_alcohol_ml += ml_amount
        
        # Points = total alcohol ml (rounded to nearest integer)
        points_earned = round(total_alcohol_ml)
        
        current_user.points += points_earned
        
        # Record History with is_strong flag and points_awarded
        history = PourHistory(
            user_id=current_user.id, 
            recipe_id=recipe.id,
            is_strong=is_strong,
            points_awarded=points_earned
        )
        db.session.add(history)
        db.session.commit()
        
        # Build message based on pour type
        mode_text = ""
        if is_taste:
            mode_text = " 🥄 TASTE!"
        if is_strong:
            mode_text += " 💪 STRONG!"
        
        # Highball specific notification
        is_highball = (category == 'highball' and not is_taste)
        highball_msg = " Base poured! Please top up with Soda/Tonic for the perfect balance." if is_highball else ""

        return jsonify({
            'status': 'success',
            'message': f'Cheers! {points_earned} points added to your profile.{mode_text}{highball_msg}',
            'new_points': current_user.points,
            'points_added': points_earned,
            'total_duration': total_duration,
            'is_highball': is_highball
        })
    
    except Exception as e:
        # Catch ANY exception during pour process
        import traceback
        error_details = traceback.format_exc()
        print(f"ERROR in pour_cocktail: {str(e)}")
        print(error_details)
        
        # Rollback any uncommitted database changes
        db.session.rollback()
        
        return jsonify({
            'status': 'error',
            'message': f'Pour failed: {str(e)}'
        }), 500
    
    finally:
        # Always release the lock - use direct update to avoid stale object issues
        try:
            db.session.execute(
                update(MachineState)
                .where(MachineState.id == 1)
                .values(is_pouring=False)
            )
            db.session.commit()
        except Exception as e:
            # If commit fails, rollback and try one more time
            db.session.rollback()
            try:
                db.session.execute(
                    update(MachineState)
                    .where(MachineState.id == 1)
                    .values(is_pouring=False)
                )
                db.session.commit()
            except Exception as final_error:
                # Log error but don't raise - we don't want to break the response
                print(f"CRITICAL: Failed to release machine lock: {final_error}")

@app.route('/leaderboard')
def leaderboard():
    # Top 10 users (excluding Admin2001)
    users = User.query.filter(User.nickname != 'Admin2001').order_by(User.points.desc()).limit(10).all()
    return render_template('leaderboard.html', users=users)

@app.route('/api/user/rank')
@login_required
def get_user_rank():
    """Get current user's rank and position information"""
    # Get all users sorted by points (excluding Admin2001)
    all_users = User.query.filter(User.nickname != 'Admin2001').order_by(User.points.desc()).all()
    
    # Find current user's position
    current_position = None
    player_ahead = None
    points_behind = 0
    
    for idx, user in enumerate(all_users):
        if user.id == current_user.id:
            current_position = idx + 1  # 1-indexed position
            if idx > 0:  # There's someone ahead
                player_ahead = all_users[idx - 1]
                points_behind = player_ahead.points - current_user.points
            break
    
    if current_position is None:
        return jsonify({'status': 'error', 'message': 'User not found'}), 404
    
    return jsonify({
        'status': 'success',
        'position': current_position,
        'total_users': len(all_users),
        'player_ahead': {
            'nickname': player_ahead.nickname,
            'points': player_ahead.points,
            'points_behind': points_behind
        } if player_ahead else None
    })

@app.route('/api/user/statistics')
@login_required
def get_user_statistics():
    """Get current user's personal statistics"""
    try:
        # Get all pour history for current user
        user_history = PourHistory.query.filter_by(user_id=current_user.id).all()
        
        # Initialize statistics
        total_alcohol_ml = 0
        favorite_cocktail = None
        strong_mode_percentage = 0
        current_rank = 0
        
        # Calculate total alcohol consumed
        machine_state = MachineState.get_instance()
        recipe_counts = {}  # Track cocktail frequency for favorite
        
        for pour in user_history:
            recipe = Recipe.query.get(pour.recipe_id)
            if not recipe:
                continue
            
            # Count for favorite cocktail
            recipe_name = recipe.name
            recipe_counts[recipe_name] = recipe_counts.get(recipe_name, 0) + 1
            
            # Alcohol consumed = points awarded (1:1 ratio in new logic)
            total_alcohol_ml += pour.points_awarded if pour.points_awarded else 0
        
        # Calculate favorite cocktail (most frequently poured)
        if recipe_counts:
            favorite_cocktail = max(recipe_counts, key=recipe_counts.get)
        
        # Calculate Strong Mode %
        total_pours = len(user_history)
        if total_pours > 0:
            strong_pours = sum(1 for pour in user_history if pour.is_strong)
            strong_mode_percentage = round((strong_pours / total_pours) * 100, 1)
        
        # Calculate current rank (reuse logic from get_user_rank)
        all_users = User.query.filter(User.nickname != 'Admin2001').order_by(User.points.desc()).all()
        for idx, user in enumerate(all_users):
            if user.id == current_user.id:
                current_rank = idx + 1
                break
        
        return jsonify({
            'status': 'success',
            'total_alcohol_ml': round(total_alcohol_ml, 1),
            'favorite_cocktail': favorite_cocktail,
            'current_rank': current_rank,
            'strong_mode_percentage': strong_mode_percentage,
            'total_pours': total_pours
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Error calculating statistics: {str(e)}'
        }), 500

@app.route('/api/user/<int:user_id>/statistics')
@login_required
def get_public_user_statistics(user_id):
    """Get any user's public statistics (for leaderboard modal)"""
    try:
        # Get the target user
        target_user = User.query.get(user_id)
        if not target_user:
            return jsonify({'status': 'error', 'message': 'User not found'}), 404
        
        # Get all pour history for target user
        user_history = PourHistory.query.filter_by(user_id=user_id).all()
        
        # Initialize statistics
        total_alcohol_ml = 0
        favorite_cocktail = None
        strong_mode_percentage = 0
        current_rank = 0
        
        # Calculate total alcohol consumed
        machine_state = MachineState.get_instance()
        recipe_counts = {}  # Track cocktail frequency for favorite
        
        for pour in user_history:
            recipe = Recipe.query.get(pour.recipe_id)
            if not recipe:
                continue
            
            # Count for favorite cocktail
            recipe_name = recipe.name
            recipe_counts[recipe_name] = recipe_counts.get(recipe_name, 0) + 1
            
            # Alcohol consumed = points awarded (1:1 ratio in new logic)
            total_alcohol_ml += pour.points_awarded if pour.points_awarded else 0
        
        # Calculate favorite cocktail (most frequently poured)
        if recipe_counts:
            favorite_cocktail = max(recipe_counts, key=recipe_counts.get)
        
        # Calculate Strong Mode %
        total_pours = len(user_history)
        if total_pours > 0:
            strong_pours = sum(1 for pour in user_history if pour.is_strong)
            strong_mode_percentage = round((strong_pours / total_pours) * 100, 1)
        
        # Calculate current rank
        all_users = User.query.filter(User.nickname != 'Admin2001').order_by(User.points.desc()).all()
        for idx, user in enumerate(all_users):
            if user.id == user_id:
                current_rank = idx + 1
                break
        
        return jsonify({
            'status': 'success',
            'user_id': target_user.id,
            'nickname': target_user.nickname,
            'points': target_user.points,
            'total_alcohol_ml': round(total_alcohol_ml, 1),
            'favorite_cocktail': favorite_cocktail,
            'current_rank': current_rank,
            'strong_mode_percentage': strong_mode_percentage,
            'total_pours': total_pours
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Error calculating statistics: {str(e)}'
        }), 500

@app.route('/api/global/statistics')
def get_global_statistics():
    """Get global platform statistics for leaderboard KPIs"""
    try:
        # Get all pour history
        all_pours = PourHistory.query.all()
        total_pours = len(all_pours)
        
        # Calculate total alcohol consumed across all users
        total_alcohol_ml = 0
        machine_state = MachineState.get_instance()
        
        for pour in all_pours:
            # Alcohol consumed = points awarded
            total_alcohol_ml += pour.points_awarded or 0
        
        # Convert to liters
        total_alcohol_liters = total_alcohol_ml / 1000.0
        
        return jsonify({
            'status': 'success',
            'total_alcohol_liters': round(total_alcohol_liters, 2),
            'total_cocktails_poured': total_pours
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Error calculating global statistics: {str(e)}'
        }), 500


@app.route('/api/status')
def api_status():
    """Real-time status API for machine state"""
    machine_state = MachineState.get_instance()
    return jsonify({
        'is_pouring': machine_state.is_pouring
    })


@app.route('/api/settings')
def get_global_settings():
    """Get global machine settings (volumes, etc.)"""
    machine_state = MachineState.get_instance()
    return jsonify({
        'status': 'success',
        'classic_target_vol': machine_state.classic_target_vol,
        'highball_target_vol': machine_state.highball_target_vol,
        'shot_target_vol': machine_state.shot_target_vol,
        'taste_amount_ml': machine_state.taste_amount_ml
    })


@app.route('/api/admin/update', methods=['POST'])
def admin_api_update():
    """Generic API endpoint for admin auto-save updates"""
    if not check_admin_auth():
        return jsonify({'status': 'error', 'message': 'Unauthorized'}), 403

    data = request.get_json()
    if not data:
        return jsonify({'status': 'error', 'message': 'No data provided'}), 400

    entity = data.get('entity')
    entity_id = data.get('id')
    field = data.get('field')
    value = data.get('value')

    try:
        if entity == 'pump':
            pump = Pump.query.get(entity_id)
            if not pump:
                return jsonify({'status': 'error', 'message': 'Pump not found'}), 404
            
            if field == 'is_active':
                pump.is_active = bool(value)
            elif field == 'ingredient_name':
                pump.ingredient_name = str(value)
            elif field == 'pin_number':
                pump.pin_number = int(value) if value else None
            elif field == 'seconds_per_50ml':
                pump.seconds_per_50ml = float(value)
            elif field == 'is_alcohol':
                pump.is_alcohol = bool(value)
            elif field == 'is_virtual':  # NEW
                pump.is_virtual = bool(value)
            
            db.session.commit()
            return jsonify({'status': 'success', 'message': 'Pump updated'})

        elif entity == 'user':
            user = User.query.get(entity_id)
            if not user:
                return jsonify({'status': 'error', 'message': 'User not found'}), 404
            
            if field == 'points':
                user.points = int(value)
                db.session.commit()
                return jsonify({'status': 'success', 'message': 'Points updated'})

        elif entity == 'recipe':
            # Create new recipe if ID is 0 or 'new'
            if str(entity_id) == 'new':
                 return jsonify({'status': 'error', 'message': 'Cannot auto-save new recipe before creation'}), 400

            recipe = Recipe.query.get(entity_id)
            if not recipe:
                return jsonify({'status': 'error', 'message': 'Recipe not found'}), 404

            if field == 'name':
                recipe.name = str(value)
            elif field == 'description':
                recipe.description = str(value)
            elif field == 'points_reward':
                # Points are auto-calculated and cannot be manually edited
                return jsonify({'status': 'error', 'message': 'Points are auto-calculated based on alcohol content'}), 400
            elif field == 'category':  # NEW: Handle category field
                if value in ['classic', 'highball', 'shot']:
                    recipe.category = str(value)
                else:
                    return jsonify({'status': 'error', 'message': 'Invalid category'}), 400
            elif field.startswith('ingredient_'):
                # Handle single ingredient update
                pump_id = field.split('_')[1]
                current_ingredients = recipe.get_ingredients() # returns dict
                
                amount = float(value)
                if amount > 0:
                    current_ingredients[pump_id] = amount
                else:
                    # Remove ingredient if 0
                    if pump_id in current_ingredients:
                        del current_ingredients[pump_id]
                
                recipe.ingredients_json = json.dumps(current_ingredients)

            db.session.commit()
            return jsonify({'status': 'success', 'message': 'Recipe updated'})

    except (ValueError, TypeError, OverflowError) as e:
        return jsonify({'status': 'error', 'message': f'Invalid value: {str(e)}'}), 400
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': 'Database error'}), 500

    return jsonify({'status': 'error', 'message': 'Invalid entity or field'}), 400



@app.route('/api/admin/recipe/save', methods=['POST'])
def admin_api_save_recipe():
    if not check_admin_auth():
        return jsonify({'status': 'error', 'message': 'Unauthorized'}), 403

    data = request.get_json()
    recipe_id = data.get('id')
    name = data.get('name')
    description = data.get('description')
    # points_reward is deprecated - now auto-calculated at pour time
    ingredients = data.get('ingredients', {}) # {pump_id: float_amount}
    category = data.get('category', 'classic')  # NEW: Get category (default to 'classic')

    if not name or not ingredients:
         return jsonify({'status': 'error', 'message': 'Name and at least one ingredient required'}), 400
    
    # Validate category
    if category not in ['classic', 'highball', 'shot']:
        return jsonify({'status': 'error', 'message': 'Invalid category. Must be classic, highball, or shot'}), 400

    try:
        # Validate ingredients
        valid_ingredients = {}
        for pid, amount in ingredients.items():
            if float(amount) > 0:
                valid_ingredients[str(pid)] = float(amount)
        
        ingredients_json = json.dumps(valid_ingredients)

        if recipe_id: # Update
            recipe = Recipe.query.get(recipe_id)
            if not recipe:
                return jsonify({'status': 'error', 'message': 'Recipe not found'}), 404
            recipe.name = name
            recipe.description = description
            recipe.points_reward = 0  # Deprecated field - always set to 0
            recipe.ingredients_json = ingredients_json
            recipe.category = category  # NEW: Set category
            message = 'Recipe updated successfully'
        else: # Create
            new_recipe = Recipe(
                name=name,
                description=description,
                points_reward=0,  # Deprecated field - always set to 0
                ingredients_json=ingredients_json,
                category=category  # NEW: Set category
            )
            db.session.add(new_recipe)
            message = 'Recipe created successfully'
        
        db.session.commit()
        return jsonify({'status': 'success', 'message': message})

    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/admin/user/save', methods=['POST'])
def admin_api_save_user():
    if not check_admin_auth():
        return jsonify({'status': 'error', 'message': 'Unauthorized'}), 403

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
        
        # Check uniqueness if nickname changed
        if user.nickname != nickname:
            existing = User.query.filter_by(nickname=nickname).first()
            if existing: # Nickname taken
                return jsonify({'status': 'error', 'message': 'Nickname already taken'}), 400
            user.nickname = nickname

        user.points = int(points) if points is not None else user.points
        
        db.session.commit()
        return jsonify({'status': 'success', 'message': 'User updated successfully'})

    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/admin/action', methods=['POST'])
def admin_api_action():
    if not check_admin_auth():
        return jsonify({'status': 'error', 'message': 'Unauthorized'}), 403

    data = request.get_json()
    action = data.get('action')
    target_id = data.get('id')

    try:
        if action == 'delete_recipe':
            Recipe.query.filter_by(id=target_id).delete()
            db.session.commit()
            return jsonify({'status': 'success', 'message': 'Recipe deleted'})

        elif action == 'delete_user':
            # Delete history first
            PourHistory.query.filter_by(user_id=target_id).delete()
            User.query.filter_by(id=target_id).delete()
            db.session.commit()
            return jsonify({'status': 'success', 'message': 'User deleted'})

        elif action == 'delete_all_users':
            PourHistory.query.delete() # Wipe history
            User.query.delete() # Wipe all users
            db.session.commit()
            return jsonify({'status': 'success', 'message': 'All users deleted'})

        elif action == 'reset_points':
            users = User.query.all()
            for user in users:
                user.points = 0
            db.session.commit()
            return jsonify({'status': 'success', 'message': 'All points reset'})

    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500
    
    return jsonify({'status': 'error', 'message': 'Invalid action'}), 400

@app.route('/api/admin/category-volumes', methods=['GET', 'POST'])
def admin_api_category_volumes():
    """Admin API endpoint to get/set all category volumes"""
    if not check_admin_auth():
        return jsonify({'status': 'error', 'message': 'Unauthorized'}), 403
    
    machine_state = MachineState.get_instance()
    
    if request.method == 'GET':
        return jsonify({
            'status': 'success',
            'classic_target_vol': machine_state.classic_target_vol,
            'highball_target_vol': machine_state.highball_target_vol,
            'shot_target_vol': machine_state.shot_target_vol
        })
    
    # POST - Update category volumes
    data = request.get_json()
    category = data.get('category')
    volume = data.get('volume')
    
    if not category or not volume:
        return jsonify({'status': 'error', 'message': 'category and volume required'}), 400
    
    try:
        volume = int(volume)
        
        # Update based on category (no validation - allow any positive value)
        if category == 'classic':
            machine_state.classic_target_vol = volume
        elif category == 'highball':
            machine_state.highball_target_vol = volume
        elif category == 'shot':
            machine_state.shot_target_vol = volume
        else:
            return jsonify({'status': 'error', 'message': 'Invalid category'}), 400
        
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': f'{category.capitalize()} volume updated to {volume}ml',
            'category': category,
            'volume': volume
        })
        
    except (ValueError, TypeError):
        return jsonify({'status': 'error', 'message': 'Invalid volume value'}), 400
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': 'Database error'}), 500

@app.route('/api/settings', methods=['GET'])
def get_global_settings():
    """Get global settings (volumes, taste amount)"""
    machine_state = MachineState.get_instance()
    return jsonify({
        'classic_target_vol': machine_state.classic_target_vol,
        'highball_target_vol': machine_state.highball_target_vol,
        'shot_target_vol': machine_state.shot_target_vol,
        'taste_amount_ml': machine_state.taste_amount_ml,
        'is_pouring': machine_state.is_pouring
    })

# --- Admin GET Endpoints ---

@app.route('/api/admin/pumps', methods=['GET'])
def admin_api_get_pumps():
    if not check_admin_auth():
        return jsonify({'status': 'error', 'message': 'Unauthorized'}), 403
    
    pumps = Pump.query.all()
    # Format for Admin UI
    pump_list = []
    for p in pumps:
        pump_list.append({
            'id': p.id,
            'ingredient_name': p.ingredient_name,
            'pin_number': p.pin_number,
            'is_alcohol': p.is_alcohol,
            'is_active': p.is_active,
            'is_virtual': p.is_virtual,
            'seconds_per_50ml': p.seconds_per_50ml
        })
    return jsonify({'pumps': pump_list})

@app.route('/api/admin/recipes', methods=['GET', 'POST'])
def admin_api_recipes():
    if not check_admin_auth():
        return jsonify({'status': 'error', 'message': 'Unauthorized'}), 403

    if request.method == 'POST':
        # Create new recipe logic would go here, effectively covered by /save
        pass
        
    recipes = Recipe.query.all()
    recipe_list = []
    for r in recipes:
        recipe_list.append({
            'id': r.id,
            'name': r.name,
            'description': r.description,
            'category': r.category,
            'ingredients': r.get_ingredients(), # returns dict
            'ingredients_json': r.ingredients_json,
            'points_reward': r.points_reward
        })
    return jsonify({'recipes': recipe_list})

@app.route('/api/admin/users', methods=['GET'])
def admin_api_users():
    if not check_admin_auth():
        return jsonify({'status': 'error', 'message': 'Unauthorized'}), 403
        
    users = User.query.all()
    user_list = [{'id': u.id, 'nickname': u.nickname, 'points': u.points, 'is_admin': (u.nickname == 'Admin2001')} for u in users]
    return jsonify({'users': user_list})

@app.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
def admin_api_delete_user(user_id):
    if not check_admin_auth():
        return jsonify({'status': 'error', 'message': 'Unauthorized'}), 403
        
    user = User.query.get_or_404(user_id)
    db.session.delete(user)
    db.session.commit()
    return jsonify({'status': 'success'})

@app.route('/api/admin/recipes/<int:recipe_id>', methods=['DELETE'])
def admin_api_delete_recipe(recipe_id):
    if not check_admin_auth():
        return jsonify({'status': 'error', 'message': 'Unauthorized'}), 403
        
    recipe = Recipe.query.get_or_404(recipe_id)
    db.session.delete(recipe)
    db.session.commit()
    return jsonify({'status': 'success'})

@app.route('/api/admin/taste-amount', methods=['GET', 'POST'])
def admin_api_taste_amount():
    """Admin API endpoint to get/set taste amount"""
    if not check_admin_auth():
        return jsonify({'status': 'error', 'message': 'Unauthorized'}), 403
    
    machine_state = MachineState.get_instance()
    
    if request.method == 'GET':
        return jsonify({
            'status': 'success',
            'taste_amount_ml': machine_state.taste_amount_ml
        })
    
    # POST - Update taste amount
    data = request.get_json()
    new_amount = data.get('taste_amount_ml')
    
    if not new_amount:
        return jsonify({'status': 'error', 'message': 'taste_amount_ml required'}), 400
    
    try:
        new_amount = int(new_amount)
        
        # Validate range
        if new_amount < 10 or new_amount > 100:
            return jsonify({'status': 'error', 'message': 'Taste amount must be between 10-100ml'}), 400
        
        machine_state.taste_amount_ml = new_amount
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': f'Taste amount updated to {new_amount}ml',
            'taste_amount_ml': new_amount
        })
        
    except (ValueError, TypeError):
        return jsonify({'status': 'error', 'message': 'Invalid taste amount value'}), 400
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': 'Database error'}), 500

@app.route('/admin-dashboard', methods=['GET'])
def admin_dashboard():
    # Simple password check for admin access
    if not check_admin_auth():
        flash('Unauthorized. Admin access only. Contact event organizer.', 'error')
        return redirect(url_for('menu'))
    
    # Ensure we have all 8 pumps
    existing_pumps = Pump.query.count()
    if existing_pumps < 8:
        for i in range(existing_pumps + 1, 9):
            new_pump = Pump(id=i, ingredient_name='Empty', is_active=False, seconds_per_50ml=3.0)
            db.session.add(new_pump)
        db.session.commit()
    
    pumps = Pump.query.order_by(Pump.id).all()
    recipes = Recipe.query.all()
    # Filter out Admin2001 explicitly, just in case
    users = User.query.filter(User.nickname != 'Admin2001').order_by(User.points.desc()).all()
    
    return render_template('admin_dashboard.html', pumps=pumps, recipes=recipes, users=users)


@app.route('/profile', methods=['GET', 'POST'])
@login_required
def profile():
    if request.method == 'POST':
        action = request.form.get('action')
        
        if action == 'delete_account':
            try:
                # Delete user history first
                PourHistory.query.filter_by(user_id=current_user.id).delete()
                
                # Delete user
                db.session.delete(current_user)
                db.session.commit()
                
                # Logout and clear session
                logout_user()
                response = make_response(redirect(url_for('index')))
                response.delete_cookie('user_id')
                
                flash('Your account has been successfully deleted.', 'info')
                return response
                
            except Exception as e:
                db.session.rollback()
                flash(f'Error deleting account: {str(e)}', 'error')
    
    return render_template('profile.html')

# Logout functionality removed - users have permanent 12-hour sessions
# If admin needs to logout, they can clear cookies manually

# Error Handlers
@app.errorhandler(500)
def internal_error(error):
    """Handle internal server errors gracefully"""
    db.session.rollback()
    return render_template('error.html', error="Something went wrong. Please try again."), 500

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return render_template('error.html', error="Page not found."), 404

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')
