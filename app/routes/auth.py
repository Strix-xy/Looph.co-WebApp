"""
LOOPH E-Commerce Platform - Authentication Routes
Handles user login, registration (with OTP), forgot password, and logout
"""
from flask import Blueprint, render_template, request, redirect, url_for, session, flash
from werkzeug.security import generate_password_hash, check_password_hash
from app.utils.crypto import encrypt_field
from app import db
from app.models import User, OtpToken
from app.utils.helpers import is_valid_email, sanitize_string
from app.utils.export import export_to_excel
from app.auth.utils import verify_captcha, generate_otp, validate_otp
from app.utils.email import send_email, send_welcome_email
import random
from datetime import datetime, timedelta

auth_bp = Blueprint('auth', __name__)


# ============================================================
#  HELPERS
# ============================================================

def _send_otp_email(to_email, otp_code, purpose='verify'):
    """Send a branded LOOPH OTP email."""
    if purpose == 'reset':
        subject = "Your Looph Password Reset Code"
        heading = "PASSWORD RESET"
        note = "You requested a password reset."
    else:
        subject = "Your Looph Verification Code"
        heading = "EMAIL VERIFICATION"
        note = "Thanks for creating a Looph account."

    html_body = f"""
    <div style="background:#111;padding:40px;font-family:sans-serif;color:white;text-align:center;">
        <h1 style="letter-spacing:6px;font-size:2rem;">LOOPH</h1>
        <p style="color:#888;letter-spacing:2px;">{heading}</p>
        <div style="border:1px solid #333;padding:30px;margin:20px 0;">
            <p style="color:#888;">{note} Your one-time code is:</p>
            <h1 style="font-size:3rem;letter-spacing:12px;color:white;">{otp_code}</h1>
            <p style="color:#555;font-size:0.8rem;">Expires in 10 minutes. Do not share this code.</p>
        </div>
        <p style="color:#555;font-size:0.75rem;">If you did not request this, you can ignore this email.</p>
    </div>
    """
    text_body = f"Your Looph code is: {otp_code}. Expires in 10 minutes."
    return send_email(to_email, subject, html_body, text_body)


# ============================================================
#  LOGIN
# ============================================================

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if 'user_id' in session:
        if session.get('role') == 'admin':
            return redirect(url_for('admin.dashboard'))
        return redirect(url_for('customer.shop'))

    if request.method == 'POST':
        username = sanitize_string(request.form.get('username'), max_length=80)
        password = request.form.get('password', '')

        if not username or not password:
            return render_template('login.html', error='Username and password are required')

        user = User.query.filter_by(username=username).first()

        if user and check_password_hash(user.password, password):
            session['user_id'] = user.id
            session['username'] = user.username
            session['role'] = user.role
            session.permanent = True

            if user.role == 'admin':
                return redirect(url_for('admin.dashboard', toast='login'))
            else:
                return redirect(url_for('customer.shop', toast='login'))
        else:
            return render_template('login.html', error='Invalid credentials')

    return render_template('login.html')


# ============================================================
#  REGISTER — Step 1: Collect details, validate, send OTP
# ============================================================

@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    if 'user_id' in session:
        return redirect(url_for('customer.shop'))

    if request.method == 'POST':
        username     = sanitize_string(request.form.get('username'), max_length=80)
        email        = sanitize_string(request.form.get('email'), max_length=120)
        full_name    = sanitize_string(request.form.get('full_name'), max_length=120)
        address      = sanitize_string(request.form.get('address'))
        phone_number = sanitize_string(request.form.get('phone_number'), max_length=30)
        password     = request.form.get('password', '')
        confirm_password  = request.form.get('confirm_password', '')
        captcha_response  = request.form.get('g-recaptcha-response', '')

        # --- Validation ---
        if not all([username, email, password, confirm_password, full_name, address, phone_number]):
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
            return render_template('register.html', error='Please use a Gmail address (@gmail.com)')

        if User.query.filter_by(username=username).first():
            return render_template('register.html', error='Username already exists')

        if User.query.filter_by(email=email_lower).first():
            return render_template('register.html', error='Email already registered')

        if not verify_captcha(captcha_response, request.remote_addr):
            return render_template('register.html', error='CAPTCHA verification failed. Please try again.')

        # --- Store pending data in session ---
        otp_code = str(random.randint(100000, 999999))
        session['pending_email']       = email_lower
        session['pending_username']    = username
        session['pending_full_name']   = full_name
        session['pending_address']     = address
        session['pending_phone']       = phone_number
        session['pending_password']    = generate_password_hash(password)
        session['pending_otp']         = otp_code

        try:
            _send_otp_email(email_lower, otp_code, purpose='verify')
        except Exception as e:
            print(f"--- OTP EMAIL ERROR: {e} ---")
            return render_template('register.html', error='Failed to send verification email. Please try again.')

        return redirect(url_for('auth.verify_email'))

    return render_template('register.html')


# ============================================================
#  REGISTER — Step 2: Verify OTP
# ============================================================

@auth_bp.route('/verify-email', methods=['GET', 'POST'])
def verify_email():
    email = session.get('pending_email')
    if not email:
        return redirect(url_for('auth.register'))

    if request.method == 'POST':
        otp_entered  = request.form.get('otp_code', '').strip()
        otp_expected = session.get('pending_otp')

        if not otp_entered or not otp_expected:
            return render_template('verify_otp.html',
                                   error='Session expired. Please register again.', email=email)

        if otp_entered != otp_expected:
            return render_template('verify_otp.html',
                                   error='Invalid code. Please check your email.', email=email)

        try:
            new_user = User(
                username     = session.get('pending_username'),
                email        = email,
                password     = session.get('pending_password'),
                role         = 'customer',
                full_name    = session.get('pending_full_name'),
                address      = encrypt_field(session.get('pending_address', '')),
                phone_number = encrypt_field(session.get('pending_phone', ''))
            )
            db.session.add(new_user)
            db.session.commit()

            export_to_excel()
            send_welcome_email(new_user)

            # Clean up session
            for key in ['pending_email', 'pending_username', 'pending_full_name',
                        'pending_address', 'pending_phone', 'pending_password', 'pending_otp']:
                session.pop(key, None)

            flash('Account verified! You can now login.', 'success')
            return redirect(url_for('auth.login'))

        except Exception as e:
            print(f"--- DB SAVE ERROR: {e} ---")
            db.session.rollback()
            return render_template('verify_otp.html',
                                   error='Something went wrong. Please try again.', email=email)

    return render_template('verify_otp.html', email=email)


# ============================================================
#  REGISTER — Resend OTP
# ============================================================

@auth_bp.route('/resend-otp', methods=['POST'])
def resend_otp():
    email = session.get('pending_email')
    if not email:
        return redirect(url_for('auth.register'))

    try:
        otp_code = str(random.randint(100000, 999999))
        session['pending_otp'] = otp_code
        _send_otp_email(email, otp_code, purpose='verify')
        flash('A new code has been sent to your email.', 'info')
    except Exception as e:
        print(f"--- RESEND OTP ERROR: {e} ---")
        flash('Failed to resend code. Please try again.', 'error')

    return redirect(url_for('auth.verify_email'))


# ============================================================
#  FORGOT PASSWORD — Step 1: Enter email
# ============================================================

@auth_bp.route('/forgot-password', methods=['GET', 'POST'])
def forgot_password():
    if request.method == 'POST':
        email = sanitize_string(request.form.get('email', ''), max_length=120).lower()

        user = User.query.filter_by(email=email).first()
        if user:
            # Use OtpToken model (already in the system)
            otp_code = generate_otp(user.id, purpose='reset', ttl_minutes=10)
            try:
                _send_otp_email(email, otp_code, purpose='reset')
            except Exception as e:
                print(f"--- RESET OTP EMAIL ERROR: {e} ---")
                return render_template('forgot_password.html',
                                       error='Failed to send email. Please try again.')

        # Always store email and redirect (prevents email enumeration)
        session['reset_email'] = email
        return redirect(url_for('auth.forgot_password_verify'))

    return render_template('forgot_password.html')


# ============================================================
#  FORGOT PASSWORD — Step 2: Verify OTP
# ============================================================

@auth_bp.route('/forgot-password/verify', methods=['GET', 'POST'])
def forgot_password_verify():
    email = session.get('reset_email')
    if not email:
        return redirect(url_for('auth.forgot_password'))

    if request.method == 'POST':
        otp_entered = request.form.get('otp_code', '').strip()

        user = User.query.filter_by(email=email).first()
        if not user:
            return render_template('forgot_password_verify.html',
                                   error='No account found for this email.', email=email)

        if not validate_otp(user.id, otp_entered, purpose='reset'):
            return render_template('forgot_password_verify.html',
                                   error='Invalid or expired code. Please try again.', email=email)

        session['reset_verified'] = True
        return redirect(url_for('auth.forgot_password_reset'))

    return render_template('forgot_password_verify.html', email=email)


# ============================================================
#  FORGOT PASSWORD — Resend reset OTP
# ============================================================

@auth_bp.route('/forgot-password/resend', methods=['POST'])
def forgot_password_resend():
    email = session.get('reset_email')
    if not email:
        return redirect(url_for('auth.forgot_password'))

    user = User.query.filter_by(email=email).first()
    if user:
        try:
            otp_code = generate_otp(user.id, purpose='reset', ttl_minutes=10)
            _send_otp_email(email, otp_code, purpose='reset')
            flash('A new code has been sent to your email.', 'info')
        except Exception as e:
            print(f"--- RESEND RESET OTP ERROR: {e} ---")
            flash('Failed to resend code. Please try again.', 'error')
    else:
        flash('Email not found.', 'error')

    return redirect(url_for('auth.forgot_password_verify'))


# ============================================================
#  FORGOT PASSWORD — Step 3: Set new password
# ============================================================

@auth_bp.route('/forgot-password/reset', methods=['GET', 'POST'])
def forgot_password_reset():
    email    = session.get('reset_email')
    verified = session.get('reset_verified', False)

    if not email or not verified:
        return redirect(url_for('auth.forgot_password'))

    if request.method == 'POST':
        new_password     = request.form.get('new_password', '')
        confirm_password = request.form.get('confirm_password', '')

        if len(new_password) < 6:
            return render_template('forgot_password_reset.html',
                                   error='Password must be at least 6 characters.')

        if new_password != confirm_password:
            return render_template('forgot_password_reset.html',
                                   error='Passwords do not match.')

        user = User.query.filter_by(email=email).first()
        if not user:
            return redirect(url_for('auth.forgot_password'))

        try:
            user.password = generate_password_hash(new_password)
            db.session.commit()

            for key in ['reset_email', 'reset_verified']:
                session.pop(key, None)

            flash('Password reset successful! You can now login.', 'success')
            return redirect(url_for('auth.login'))

        except Exception as e:
            print(f"--- PASSWORD RESET DB ERROR: {e} ---")
            db.session.rollback()
            return render_template('forgot_password_reset.html',
                                   error='Something went wrong. Please try again.')

    return render_template('forgot_password_reset.html')


# ============================================================
#  LOGOUT
# ============================================================

@auth_bp.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('main.index', toast='logout'))
