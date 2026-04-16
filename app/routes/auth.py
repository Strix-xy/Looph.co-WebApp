"""
ETERNO E-Commerce Platform - Authentication Routes
Handles user login, registration, and logout with enhanced validation
"""
from flask import Blueprint, render_template, request, redirect, url_for, session, flash
from werkzeug.security import generate_password_hash, check_password_hash
from app.utils.crypto import encrypt_field
from app import db
from app.models import User
from app.utils.helpers import is_valid_email, sanitize_string
from app.utils.export import export_to_excel
from app.auth.utils import verify_captcha
from app.utils.email import send_welcome_email

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    """
    User login - validates credentials and creates session
    Redirects to appropriate dashboard based on role
    """
    # Redirect if already logged in
    if 'user_id' in session:
        if session.get('role') == 'admin':
            return redirect(url_for('admin.dashboard'))
        return redirect(url_for('customer.shop'))
    
    if request.method == 'POST':
        username = sanitize_string(request.form.get('username'), max_length=80)
        password = request.form.get('password', '')
        
        # Validate input
        if not username or not password:
            return render_template('login.html', error='Username and password are required')
        
        # Find user by username
        user = User.query.filter_by(username=username).first()
        
        # Verify credentials
        if user and check_password_hash(user.password, password):
            # Create session
            session['user_id'] = user.id
            session['username'] = user.username
            session['role'] = user.role
            session.permanent = True
            
            # Redirect based on role
            if user.role == 'admin':
                return redirect(url_for('admin.dashboard', toast='login'))
            else:
                return redirect(url_for('customer.shop', toast='login'))
        else:
            return render_template('login.html', error='Invalid credentials')
    
    return render_template('login.html')


@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    if 'user_id' in session:
        return redirect(url_for('customer.shop'))
    
    if request.method == 'POST':
        username = sanitize_string(request.form.get('username'), max_length=80)
        email = sanitize_string(request.form.get('email'), max_length=120)
        full_name = sanitize_string(request.form.get('full_name'), max_length=120)
        address = sanitize_string(request.form.get('address'))
        phone_number = sanitize_string(request.form.get('phone_number'), max_length=30)
        password = request.form.get('password', '')
        confirm_password = request.form.get('confirm_password', '')
        captcha_response = request.form.get('g-recaptcha-response', '')
        
        if not username or not email or not password or not confirm_password or not full_name or not address or not phone_number:
            return render_template('register.html', error='All fields are required')
        
        if len(username) < 3:
            return render_template('register.html', error='Username must be at least 3 characters long')
        
        if len(password) < 6:
            return render_template('register.html', error='Password must be at least 6 characters long')
        
        if password != confirm_password:
            return render_template('register.html', error='Passwords do not match')
        
        if not is_valid_email(email):
            return render_template('register.html', error='Invalid email format')
        email_lower = email.lower().strip()
        if not email_lower.endswith('@gmail.com'):
            return render_template('register.html', error='Please use a Gmail address (must end with @gmail.com)')
        
        if User.query.filter_by(username=username).first():
            return render_template('register.html', error='Username already exists')
        
        if User.query.filter_by(email=email).first():
            return render_template('register.html', error='Email already registered')
        
        if not verify_captcha(captcha_response, request.remote_addr):
            return render_template('register.html', error='CAPTCHA verification failed. Please try again.')
        
        try:
            hashed_password = generate_password_hash(password)
            new_user = User(
                username=username,
                email=email.lower(),
                password=hashed_password,
                role='customer',
                full_name=full_name,
                address=encrypt_field(address),
                phone_number=encrypt_field(phone_number)
            )
            
            db.session.add(new_user)
            db.session.commit()
            
            export_to_excel()
            send_welcome_email(new_user)
            
            return redirect(url_for('auth.login', toast='register'))
        
        except Exception:
            db.session.rollback()
            return render_template('register.html', error='An error occurred during registration. Please try again.')
    
    return render_template('register.html')


@auth_bp.route('/logout', methods=['GET', 'POST'])
def logout():
    """Clear user session and redirect to landing page.

    Use POST for actual logout to avoid accidental GET-triggered logouts.
    """
    if request.method == 'POST':
        session.clear()
        return redirect(url_for('main.index', toast='logout'))
    # Ignore direct GET logout attempts to prevent accidental session clears.
    if session.get('role') == 'admin':
        return redirect(url_for('admin.dashboard'))
    if session.get('user_id'):
        return redirect(url_for('customer.shop'))
    return redirect(url_for('main.index'))