import os
from flask import Flask, render_template, redirect, url_for, request, flash, jsonify
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash
import datetime
from dotenv import load_dotenv
from models import db, User, UserSession, UserRole, Home, Floor, Room, Device, Sensor, SensorReading, Actuator, ActuatorStatus, UserAction
from sqlalchemy import func

# Load environment variables from .env file
load_dotenv()

# Initialize Flask application
app = Flask(__name__)

# Configure Flask application
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'default-secret-key')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///smart_home.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize database with Flask app
db.init_app(app)

# Initialize Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Create database tables
def create_tables():
    with app.app_context():
        db.create_all()
        # Initialize admin user if not exists
        if not User.query.filter_by(username='admin').first():
            admin_user = User(
                username='admin',
                email='admin@example.com',
                first_name='Admin',
                last_name='User',
                role='Admin',
                is_admin=True
            )
            admin_user.set_password('admin')
            db.session.add(admin_user)
            db.session.commit()

# Initialize database tables
create_tables()

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        remember_me = True if request.form.get('remember-me') else False
        user = User.query.filter_by(username=username).first()
        
        if user and user.check_password(password):
            login_user(user, remember=remember_me)
            user.last_login = datetime.datetime.utcnow()
            
            # Create a new user session
            session = UserSession(user_id=user.id)
            db.session.add(session)
            db.session.commit()
            
            # Redirect to admin dashboard if user is admin
            if user.is_admin:
                return redirect(url_for('admin_dashboard'))
            return redirect(url_for('index'))
        flash('Invalid username or password')
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    # Update user session
    session = UserSession.query.filter_by(
        user_id=current_user.id,
        logout_time=None
    ).order_by(UserSession.login_time.desc()).first()
    
    if session:
        session.logout_time = datetime.datetime.utcnow()
        session.session_duration = (session.logout_time - session.login_time).total_seconds() / 60.0  # in minutes
        db.session.commit()
    
    logout_user()
    return redirect(url_for('login'))

@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
        
    if request.method == 'POST':
        # Get form data
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        first_name = request.form.get('first_name')
        last_name = request.form.get('last_name')
        
        # Validate form data
        error = None
        
        # Check if username already exists
        if User.query.filter_by(username=username).first():
            error = 'Username already exists.'
        
        # Check if email already exists
        elif User.query.filter_by(email=email).first():
            error = 'Email already registered.'
            
        # Check if passwords match
        elif password != confirm_password:
            error = 'Passwords do not match.'
            
        # Check password length
        elif len(password) < 6:
            error = 'Password must be at least 6 characters long.'
            
        if error:
            flash(error, 'danger')
            return render_template('register.html')
            
        # Create new user
        new_user = User(
            username=username,
            email=email,
            first_name=first_name,
            last_name=last_name,
            role='User',
            is_admin=False
        )
        new_user.set_password(password)
        
        try:
            db.session.add(new_user)
            db.session.commit()
            flash('Registration successful! You can now log in.', 'success')
            return redirect(url_for('login'))
        except Exception as e:
            db.session.rollback()
            flash(f'An error occurred: {str(e)}', 'danger')
            
    return render_template('register.html')

# API Routes for devices and sensors 
@app.route('/api/devices', methods=['GET'])
@login_required
def get_devices():
    if current_user.is_admin:
        devices = Device.query.all()
    else:
        devices = Device.query.filter_by(user_id=current_user.id).all()
    
    return {'devices': [device.to_dict() for device in devices]}

@app.route('/api/devices/<device_id>/control', methods=['POST'])
@login_required
def control_device(device_id):
    device = Device.query.filter_by(device_id=device_id).first()
    
    if not device:
        return jsonify({'success': False, 'message': 'Device not found'}), 404
    
    data = request.json
    if not data or 'action' not in data:
        return jsonify({'success': False, 'message': 'Invalid request, action required'}), 400
    
    action = data['action']
    value = data.get('value')
    
    # Create a new user action
    user_action = UserAction(
        device_id=device_id,
        action=action,
        value=value,
        user_id=current_user.id,
        status='processing'
    )
    
    db.session.add(user_action)
    
    # Simulate device state change (in a real system this would be handled by IoT communication)
    if action == 'toggle':
        # Toggle device status between 'online' and 'offline'
        device.status = 'online' if device.status == 'offline' else 'offline'
        device.last_seen = datetime.datetime.utcnow()
    elif action == 'power':
        device.status = 'online' if value == 'on' else 'offline'
        device.last_seen = datetime.datetime.utcnow()
    
    # Mark the action as completed
    user_action.status = 'completed'
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'device': device.to_dict(),
        'action': user_action.to_dict()
    })

@app.route('/api/sensors', methods=['GET'])
@login_required
def get_sensors():
    sensors = Sensor.query.all()
    return {'sensors': [sensor.to_dict() for sensor in sensors]}

# Admin routes
@app.route('/admin')
@login_required
def admin_dashboard():
    if not current_user.is_admin:
        flash('You do not have permission to access the admin dashboard')
        return redirect(url_for('index'))
    return render_template('admin_dashboard.html')

# Admin API routes
@app.route('/api/admin/users', methods=['GET'])
@login_required
def admin_get_users():
    if not current_user.is_admin:
        return jsonify({'success': False, 'message': 'Permission denied'}), 403
    
    users = User.query.all()
    return jsonify({'users': [user.to_dict() for user in users]})

@app.route('/api/admin/users/<int:user_id>', methods=['GET', 'PUT', 'DELETE'])
@login_required
def admin_manage_user(user_id):
    if not current_user.is_admin:
        return jsonify({'success': False, 'message': 'Permission denied'}), 403
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404
    
    if request.method == 'GET':
        return jsonify({'user': user.to_dict()})
    
    elif request.method == 'PUT':
        data = request.json
        if 'username' in data:
            user.username = data['username']
        if 'email' in data:
            user.email = data['email']
        if 'first_name' in data:
            user.first_name = data['first_name']
        if 'last_name' in data:
            user.last_name = data['last_name']
        if 'role' in data:
            user.role = data['role']
        if 'is_admin' in data:
            user.is_admin = data['is_admin']
        if 'password' in data:
            user.set_password(data['password'])
        
        db.session.commit()
        return jsonify({'success': True, 'user': user.to_dict()})
    
    elif request.method == 'DELETE':
        db.session.delete(user)
        db.session.commit()
        return jsonify({'success': True, 'message': 'User deleted'})

@app.route('/api/admin/users', methods=['POST'])
@login_required
def admin_create_user():
    if not current_user.is_admin:
        return jsonify({'success': False, 'message': 'Permission denied'}), 403
    
    data = request.json
    if not data or 'username' not in data or 'email' not in data or 'password' not in data:
        return jsonify({'success': False, 'message': 'Missing required fields'}), 400
    
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'success': False, 'message': 'Username already exists'}), 400
    
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'success': False, 'message': 'Email already exists'}), 400
    
    new_user = User(
        username=data['username'],
        email=data['email'],
        first_name=data.get('first_name', ''),
        last_name=data.get('last_name', ''),
        role=data.get('role', 'User'),
        is_admin=data.get('is_admin', False)
    )
    new_user.set_password(data['password'])
    
    db.session.add(new_user)
    db.session.commit()
    
    return jsonify({'success': True, 'user': new_user.to_dict()}), 201

@app.route('/api/admin/devices', methods=['GET', 'POST'])
@login_required
def admin_manage_devices():
    if not current_user.is_admin:
        return jsonify({'success': False, 'message': 'Permission denied'}), 403
    
    if request.method == 'GET':
        devices = Device.query.all()
        return jsonify({'devices': [device.to_dict() for device in devices]})
    
    elif request.method == 'POST':
        data = request.json
        if not data or 'name' not in data or 'type' not in data or 'room_id' not in data:
            return jsonify({'success': False, 'message': 'Missing required fields'}), 400
        
        new_device = Device(
            name=data['name'],
            device_type=data['type'],
            room_id=data['room_id'],
            status=data.get('status', 'offline'),
            manufacturer=data.get('manufacturer', ''),
            model=data.get('model', ''),
            serial_number=data.get('serial_number', '')
        )
        
        db.session.add(new_device)
        db.session.commit()
        
        return jsonify({'success': True, 'device': new_device.to_dict()}), 201

@app.route('/api/admin/devices/<int:device_id>', methods=['GET', 'PUT', 'DELETE'])
@login_required
def admin_manage_device(device_id):
    if not current_user.is_admin:
        return jsonify({'success': False, 'message': 'Permission denied'}), 403
    
    device = Device.query.get(device_id)
    if not device:
        return jsonify({'success': False, 'message': 'Device not found'}), 404
    
    if request.method == 'GET':
        return jsonify({'success': True, 'device': device.to_dict()})
    
    elif request.method == 'PUT':
        data = request.json
        if 'name' in data:
            device.name = data['name']
        if 'type' in data:
            device.device_type = data['type']
        if 'room_id' in data:
            device.room_id = data['room_id']
        if 'status' in data:
            device.status = data['status']
        if 'manufacturer' in data:
            device.manufacturer = data['manufacturer']
        if 'model' in data:
            device.model = data['model']
        if 'serial_number' in data:
            device.serial_number = data['serial_number']
        
        db.session.commit()
        return jsonify({'success': True, 'device': device.to_dict()})
    
    elif request.method == 'DELETE':
        db.session.delete(device)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Device deleted'})

@app.route('/api/admin/rooms', methods=['GET'])
@login_required
def admin_get_rooms():
    if not current_user.is_admin:
        return jsonify({'success': False, 'message': 'Permission denied'}), 403
    
    rooms = Room.query.all()
    room_data = []
    
    for room in rooms:
        home = Home.query.get(room.home_id)
        home_name = home.name if home else "Unknown Home"
        
        room_data.append({
            'id': room.id,
            'name': room.name,
            'home_id': room.home_id,
            'home_name': home_name
        })
    
    return jsonify({'success': True, 'rooms': room_data})

@app.route('/api/admin/homes', methods=['GET', 'POST'])
@login_required
def admin_manage_homes():
    if not current_user.is_admin:
        return jsonify({'success': False, 'message': 'Permission denied'}), 403
    
    if request.method == 'GET':
        homes = Home.query.all()
        return jsonify({'homes': [home.to_dict() for home in homes]})
    
    elif request.method == 'POST':
        data = request.json
        if not data or 'name' not in data or 'owner_id' not in data:
            return jsonify({'success': False, 'message': 'Missing required fields'}), 400
        
        new_home = Home(
            name=data['name'],
            address=data.get('address', ''),
            owner_id=data['owner_id'],
            description=data.get('description', '')
        )
        
        db.session.add(new_home)
        db.session.commit()
        
        return jsonify({'success': True, 'home': new_home.to_dict()}), 201

@app.route('/api/admin/homes/<int:home_id>', methods=['GET', 'PUT', 'DELETE'])
@login_required
def admin_manage_home(home_id):
    if not current_user.is_admin:
        return jsonify({'success': False, 'message': 'Permission denied'}), 403
    
    home = Home.query.get(home_id)
    if not home:
        return jsonify({'success': False, 'message': 'Home not found'}), 404
    
    if request.method == 'GET':
        return jsonify({'home': home.to_dict()})
    
    elif request.method == 'PUT':
        data = request.json
        if 'name' in data:
            home.name = data['name']
        if 'address' in data:
            home.address = data['address']
        if 'owner_id' in data:
            home.owner_id = data['owner_id']
        if 'description' in data:
            home.description = data['description']
        
        db.session.commit()
        return jsonify({'success': True, 'home': home.to_dict()})
    
    elif request.method == 'DELETE':
        db.session.delete(home)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Home deleted'})

@app.route('/api/admin/statistics', methods=['GET'])
@login_required
def admin_get_statistics():
    if not current_user.is_admin:
        return jsonify({'success': False, 'message': 'Permission denied'}), 403
    
    # Get some basic statistics
    user_count = User.query.count()
    device_count = Device.query.count()
    sensor_count = Sensor.query.count()
    actions_count = UserAction.query.count()
    
    # Get active users (users with sessions in the last 24 hours)
    day_ago = datetime.datetime.utcnow() - datetime.timedelta(days=1)
    active_users = UserSession.query.filter(UserSession.login_time >= day_ago).distinct(UserSession.user_id).count()
    
    return jsonify({
        'user_count': user_count,
        'device_count': device_count,
        'sensor_count': sensor_count,
        'actions_count': actions_count,
        'active_users': active_users
    })

@app.route('/api/admin/chart-data', methods=['GET'])
@login_required
def admin_get_chart_data():
    if not current_user.is_admin:
        return jsonify({'success': False, 'message': 'Permission denied'}), 403
    
    try:
        # Get device types distribution
        device_types = {}
        for device in Device.query.all():
            device_type = device.device_type
            if device_type in device_types:
                device_types[device_type] += 1
            else:
                device_types[device_type] = 1
        
        # Get user activity for last 7 days
        user_activity = []
        today = datetime.datetime.now().date()
        for i in range(6, -1, -1):  # Count from 6 down to 0
            date = today - datetime.timedelta(days=i)
            start_datetime = datetime.datetime.combine(date, datetime.time.min)
            end_datetime = datetime.datetime.combine(date, datetime.time.max)
            count = UserAction.query.filter(
                UserAction.timestamp >= start_datetime,
                UserAction.timestamp <= end_datetime
            ).count()
            user_activity.append({
                'date': date.strftime('%Y-%m-%d'),
                'count': count
            })
        
        # Get device status overview
        device_status = {
            'online': Device.query.filter_by(status='online').count(),
            'offline': Device.query.filter_by(status='offline').count(),
            'maintenance': Device.query.filter_by(status='maintenance').count()
        }
        
        return jsonify({
            'device_types': device_types,
            'user_activity': user_activity,
            'device_status': device_status
        })
    
    except Exception as e:
        app.logger.error(f"Error in chart data API: {str(e)}")
        return jsonify({'success': False, 'message': f'Internal server error: {str(e)}'}), 500

@app.route('/api/power-consumption', methods=['GET'])
@login_required
def get_power_consumption():
    """
    Get power consumption data for actuators aggregated by day, month, or year.
    
    Query parameters:
    - period: 'day', 'month', or 'year' (default: 'day')
    - start_date: YYYY-MM-DD format (default: 7 days ago for day, 12 months ago for month, 5 years ago for year)
    - end_date: YYYY-MM-DD format (default: today)
    - actuator_id: Optional specific actuator ID to filter
    - room_id: Optional room ID to filter actuators
    """
    try:
        period = request.args.get('period', 'day')
        actuator_id = request.args.get('actuator_id')
        room_id = request.args.get('room_id')
        
        # Calculate default dates based on period
        today = datetime.datetime.now().date()
        if period == 'day':
            default_start = today - datetime.timedelta(days=7)
        elif period == 'month':
            default_start = today.replace(year=today.year-1 if today.month == 12 else today.year, 
                                         month=12 if today.month == 12 else today.month+1)
        elif period == 'year':
            default_start = today.replace(year=today.year-5)
        else:
            return jsonify({'success': False, 'message': 'Invalid period parameter'}), 400
        
        # Parse date parameters
        try:
            start_date_str = request.args.get('start_date', default_start.strftime('%Y-%m-%d'))
            end_date_str = request.args.get('end_date', today.strftime('%Y-%m-%d'))
            
            start_date = datetime.datetime.strptime(start_date_str, '%Y-%m-%d')
            end_date = datetime.datetime.strptime(end_date_str, '%Y-%m-%d')
            # Set end date to end of day
            end_date = end_date.replace(hour=23, minute=59, second=59)
            
            if start_date > end_date:
                return jsonify({'success': False, 'message': 'Start date cannot be after end date'}), 400
        except ValueError:
            return jsonify({'success': False, 'message': 'Invalid date format, use YYYY-MM-DD'}), 400
        
        # Base query for power consumption
        query = db.session.query(
            ActuatorStatus.actuator_id,
            Actuator.actuator_type,
            func.sum(ActuatorStatus.power_consumption).label('total_power')
        ).join(Actuator)
        
        # Apply filters
        query = query.filter(
            ActuatorStatus.timestamp >= start_date,
            ActuatorStatus.timestamp <= end_date,
            ActuatorStatus.power_consumption != None
        )
        
        if actuator_id:
            query = query.filter(ActuatorStatus.actuator_id == actuator_id)
        
        if room_id:
            query = query.filter(Actuator.room_id == room_id)
        
        # Add time-based grouping based on period
        if period == 'day':
            query = query.add_columns(
                func.strftime('%Y-%m-%d', ActuatorStatus.timestamp).label('date')
            ).group_by('date', ActuatorStatus.actuator_id)
        elif period == 'month':
            query = query.add_columns(
                func.strftime('%Y-%m', ActuatorStatus.timestamp).label('date')
            ).group_by('date', ActuatorStatus.actuator_id)
        elif period == 'year':
            query = query.add_columns(
                func.strftime('%Y', ActuatorStatus.timestamp).label('date')
            ).group_by('date', ActuatorStatus.actuator_id)
        
        result = query.all()
        
        # Create data structure for response
        consumption_data = {}
        actuator_info = {}
        
        for row in result:
            date_str = row.date
            actuator_id = row.actuator_id
            actuator_type = row.actuator_type
            power_value = float(row.total_power) if row.total_power else 0
            
            if actuator_id not in actuator_info:
                actuator_info[actuator_id] = {
                    'id': actuator_id,
                    'type': actuator_type
                }
            
            if date_str not in consumption_data:
                consumption_data[date_str] = {}
            
            consumption_data[date_str][actuator_id] = power_value
        
        # Format the data for easy reading in charts
        time_series = []
        for date_str, actuators in sorted(consumption_data.items()):
            data_point = {'date': date_str}
            for act_id, power in actuators.items():
                data_point[f'actuator_{act_id}'] = power
            time_series.append(data_point)
        
        return jsonify({
            'success': True,
            'period': period,
            'start_date': start_date_str,
            'end_date': end_date_str,
            'actuators': actuator_info,
            'time_series': time_series
        })
    
    except Exception as e:
        app.logger.error(f"Error in power consumption API: {str(e)}")
        return jsonify({'success': False, 'message': f'Internal server error: {str(e)}'}), 500

# Context processor for global template variables
@app.context_processor
def utility_processor():
    def user_homes():
        if current_user.is_authenticated:
            return Home.query.filter_by(owner_id=current_user.id).all()
        return []
    return dict(user_homes=user_homes)

if __name__ == '__main__':
    app.run(debug=True)