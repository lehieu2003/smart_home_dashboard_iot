import sys
import os
import random
from datetime import datetime, timedelta
from faker import Faker
from app import app, db
from models import User, Home, Floor, Room, Device, Sensor, SensorReading, Actuator, ActuatorStatus, UserAction, UserRole, UserRoleMapping, HomeAccess, SensorData

fake = Faker()

def remove_database():
    """Remove the existing database file if it exists"""
    db_path = os.environ.get('DATABASE_URL', 'sqlite:///smart_home.db')
    
    # For SQLite database
    if db_path.startswith('sqlite:///'):
        db_file = db_path.replace('sqlite:///', '')
        # Make path absolute if it's not already
        if not os.path.isabs(db_file):
            db_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), db_file)
        
        if os.path.exists(db_file):
            print(f"Removing existing database: {db_file}")
            os.remove(db_file)
            print("Database removed successfully.")
        else:
            print(f"No existing database found at {db_file}")
    else:
        print("Not using SQLite. Please manually drop and recreate database tables.")

def create_fake_users(num_users=5):
    """Create fake users in the database"""
    print("Creating fake users...")
    
    # Skip if admin already exists
    if User.query.filter_by(username='admin').first():
        print("Admin user already exists, skipping creation")
    else:
        admin = User(
            username='admin',
            email='admin@example.com',
            first_name='Admin',
            last_name='User',
            role='Admin',
            is_admin=True,
            created_at=datetime.utcnow(),
            last_login=datetime.utcnow()
        )
        admin.set_password('admin')
        db.session.add(admin)
    
    # Create regular users
    for i in range(num_users):
        first_name = fake.first_name()
        last_name = fake.last_name()
        username = f"{first_name.lower()}{last_name.lower()}{random.randint(1, 999)}"
        user = User(
            username=username,
            email=f"{username}@example.com",
            password_hash='',
            first_name=first_name,
            last_name=last_name,
            role='User',
            created_at=datetime.utcnow() - timedelta(days=random.randint(1, 365)),
            last_login=datetime.utcnow() - timedelta(days=random.randint(0, 30))
        )
        user.set_password('password')
        db.session.add(user)
    
    db.session.commit()
    print(f"Created {num_users} users plus admin")
    return User.query.all()

def create_fake_homes(users):
    """Create fake homes for the given users"""
    print("Creating fake homes...")
    homes = []
    for user in users:
        # Skip if user already has a home
        if not Home.query.filter_by(owner_id=user.id).first():
            home = Home(
                name=f"{user.last_name}'s Home",
                address=fake.address(),
                owner_id=user.id,
                created_at=datetime.utcnow() - timedelta(days=random.randint(1, 365))
            )
            db.session.add(home)
            homes.append(home)
    
    db.session.commit()
    print(f"Created {len(homes)} homes")
    return Home.query.all()

def create_fake_floors_and_rooms(homes):
    """Create fake floors and rooms for each home"""
    print("Creating fake floors and rooms...")
    floors = []
    rooms = []
    
    room_types = ['Living Room', 'Bedroom', 'Kitchen', 'Bathroom', 'Dining Room', 
                  'Office', 'Garage', 'Laundry Room', 'Attic', 'Basement']
    
    for home in homes:
        num_floors = random.randint(1, 3)
        for floor_num in range(1, num_floors + 1):
            # Skip if floor already exists
            if not Floor.query.filter_by(home_id=home.id, floor_number=floor_num).first():
                floor = Floor(
                    home_id=home.id,
                    floor_number=floor_num,
                    name=f"Floor {floor_num}"
                )
                db.session.add(floor)
                db.session.flush()  # To get the floor.id
                floors.append(floor)
                
                # Create rooms for this floor
                num_rooms = random.randint(2, 5)
                for _ in range(num_rooms):
                    room_type = random.choice(room_types)
                    room = Room(
                        floor_id=floor.id,
                        name=f"{room_type} {random.randint(1, 100)}",
                        room_type=room_type,
                        home_id=home.id
                    )
                    db.session.add(room)
                    rooms.append(room)
    
    db.session.commit()
    print(f"Created {len(floors)} floors and {len(rooms)} rooms")
    return Room.query.all()

def create_fake_devices(rooms):
    """Create fake devices for each room"""
    print("Creating fake devices...")
    devices = []
    device_types = ['Light', 'Thermostat', 'Fan', 'Smart TV', 'Camera', 'Speaker', 
                   'Door Lock', 'Window Shade', 'Vacuum', 'Water Heater']
    
    for room in rooms:
        num_devices = random.randint(1, 3)
        for _ in range(num_devices):
            device_type = random.choice(device_types)
            device_id = f"DEV-{fake.unique.random_int(min=10000, max=99999)}"
            device = Device(
                device_id=device_id,
                name=f"{device_type} {random.randint(1, 100)}",
                type=device_type,
                room_id=room.id,
                home_id=room.home_id,
                user_id=Home.query.get(room.home_id).owner_id,
                status=random.choice(['online', 'offline']),
                last_seen=datetime.utcnow() - timedelta(minutes=random.randint(0, 1440)),
                is_active=random.choice([True, True, True, False])  # 75% active
            )
            db.session.add(device)
            devices.append(device)
    
    db.session.commit()
    print(f"Created {len(devices)} devices")
    return Device.query.all()

def create_fake_sensors():
    """Create 12 fake sensors as required"""
    print("Creating 12 fake sensors...")
    rooms = Room.query.all()
    
    # Sensor types with descriptions
    sensor_types = [
        ('Temperature', 'Measures ambient temperature in Celsius', 'Wall mounted'),
        ('Humidity', 'Monitors relative humidity percentage', 'Corner placement'),
        ('Motion', 'Detects movement in the room', 'Ceiling mounted'),
        ('Light', 'Measures light levels in lux', 'Window adjacent'),
        ('CO2', 'Measures carbon dioxide levels in ppm', 'Central location'),
        ('Smoke', 'Detects smoke particles in the air', 'Ceiling mounted'),
        ('Door/Window', 'Detects if door/window is open or closed', 'Door frame'),
        ('Water Leak', 'Detects water leakage', 'Under sink'),
        ('Pressure', 'Measures atmospheric pressure', 'Indoor weather station'),
        ('Air Quality', 'Monitors overall air quality index', 'Central location'),
        ('UV', 'Measures ultraviolet radiation levels', 'Near window'),
        ('Noise', 'Monitors sound levels in decibels', 'Living area')
    ]
    
    sensors = []
    for i, (sensor_type, description, location) in enumerate(sensor_types):
        # Assign to a random room
        room = random.choice(rooms)
        sensor = Sensor(
            sensor_type=sensor_type,
            description=description,
            location=f"{location} in {room.name}",
            room_id=room.id
        )
        db.session.add(sensor)
        sensors.append(sensor)
        
        # Create some sensor readings for each sensor
        for _ in range(5):
            reading = SensorReading(
                sensor_id=i+1,  # Using i+1 as we expect the ID will start from 1
                timestamp=datetime.utcnow() - timedelta(hours=random.randint(1, 72)),
                value1=round(random.uniform(10, 40), 1),  # Some generic value
                value2=round(random.uniform(0, 100), 1) if random.choice([True, False]) else None,
                unit1=get_unit_for_sensor_type(sensor_type),
                unit2='%' if sensor_type == 'Humidity' else None
            )
            db.session.add(reading)
    
    db.session.commit()
    print(f"Created 12 sensors with readings")
    return Sensor.query.all()

def create_fake_actuators():
    """Create 12 fake actuators as required"""
    print("Creating 12 fake actuators...")
    rooms = Room.query.all()
    
    # Actuator types with descriptions
    actuator_types = [
        ('Smart Light', 'Controls lighting brightness and color', 'Ceiling fixture'),
        ('Thermostat', 'Controls heating and cooling systems', 'Wall mounted'),
        ('Smart Lock', 'Controls door locking mechanism', 'Front door'),
        ('Window Blinds', 'Adjusts window covering position', 'Window frame'),
        ('Smart Plug', 'Controls power to connected devices', 'Wall outlet'),
        ('HVAC Control', 'Manages ventilation systems', 'Central system'),
        ('Irrigation System', 'Controls garden watering', 'Outdoor system'),
        ('Smart TV Control', 'Manages television functions', 'Entertainment center'),
        ('Smart Speaker', 'Controls audio playback and volume', 'Shelf mounted'),
        ('Security System', 'Arms/disarms security features', 'Control panel'),
        ('Robot Vacuum', 'Controls cleaning schedule and zones', 'Floor based'),
        ('Fan Control', 'Adjusts fan speed and direction', 'Ceiling mounted')
    ]
    
    actuators = []
    for i, (actuator_type, description, location) in enumerate(actuator_types):
        # Assign to a random room
        room = random.choice(rooms)
        actuator = Actuator(
            actuator_type=actuator_type,
            description=description,
            location=f"{location} in {room.name}",
            room_id=room.id
        )
        db.session.add(actuator)
        actuators.append(actuator)
        
        # Create some actuator statuses for each actuator
        for _ in range(3):
            status = ActuatorStatus(
                actuator_id=i+1,  # Using i+1 as we expect the ID will start from 1
                timestamp=datetime.utcnow() - timedelta(hours=random.randint(1, 48)),
                status=random.choice(['on', 'off', 'standby']),
                power_consumption=round(random.uniform(0.5, 15), 2) if random.choice([True, False]) else None,
                on_time=round(random.uniform(0.5, 12), 1) if random.choice([True, False]) else None
            )
            db.session.add(status)
    
    db.session.commit()
    print(f"Created 12 actuators with statuses")
    return Actuator.query.all()

def create_user_actions(devices, users):
    """Create fake user actions for devices"""
    print("Creating user actions...")
    actions = []
    
    action_types = ['toggle', 'power', 'adjust', 'schedule', 'configure']
    status_options = ['completed', 'failed', 'pending']
    
    for _ in range(20):  # Create 20 random actions
        device = random.choice(devices)
        user = random.choice(users)
        
        action = UserAction(
            device_id=device.device_id,
            action=random.choice(action_types),
            value='on' if random.choice([True, False]) else 'off',
            timestamp=datetime.utcnow() - timedelta(days=random.randint(0, 30)),
            status=random.choice(status_options),
            user_id=user.id
        )
        db.session.add(action)
        actions.append(action)
    
    db.session.commit()
    print(f"Created {len(actions)} user actions")

def get_unit_for_sensor_type(sensor_type):
    """Return appropriate unit based on sensor type"""
    units = {
        'Temperature': '°C',
        'Humidity': '%',
        'Light': 'lux',
        'CO2': 'ppm',
        'Pressure': 'hPa',
        'Noise': 'dB',
        'Air Quality': 'AQI',
        'UV': 'UV index',
    }
    return units.get(sensor_type, '')

def main():
    """Main function to generate all fake data"""
    with app.app_context():
        # Ask for confirmation before removing database
        confirm = input("This will remove the existing database and create new data. Continue? (y/n): ").lower()
        if confirm != 'y':
            print("Operation cancelled.")
            return
        
        # Remove existing database
        remove_database()
        
        # Create tables
        db.create_all()
        print("Database tables created successfully.")
        
        users = create_fake_users(5)
        homes = create_fake_homes(users)
        rooms = create_fake_floors_and_rooms(homes)
        devices = create_fake_devices(rooms)
        sensors = create_fake_sensors()
        actuators = create_fake_actuators()
        create_user_actions(devices, users)
        print("Fake data generation complete!")

if __name__ == '__main__':
    main()
