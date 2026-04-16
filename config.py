"""
ETERNO E-Commerce Platform - Configuration
Centralized configuration for all environments
"""
import os
from datetime import timedelta

class Config:
    """Base configuration class"""
    # Flask settings
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'eterno_secret_key_2024'
    
    # Database settings - using instance folder
    basedir = os.path.abspath(os.path.dirname(__file__))
    instance_dir = os.path.join(basedir, 'instance')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or f'sqlite:///{os.path.join(instance_dir, "eterno.db")}'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Session settings
    PERMANENT_SESSION_LIFETIME = timedelta(hours=24)
    SESSION_COOKIE_SECURE = False  # Set to True in production with HTTPS
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    
    # Application settings
    ITEMS_PER_PAGE = 20
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file upload
    
    # Currency settings
    CURRENCY_SYMBOL = '₱'
    CURRENCY_NAME = 'PHP'
    
    # Shipping settings
    SHIPPING_FEE_MIN = 50
    SHIPPING_FEE_MAX = 200
    COD_ADDITIONAL_FEE = 50
    
    # Discount settings
    PWD_SENIOR_DISCOUNT = 0.20  # 20%
    VOUCHER_DISCOUNT = 100  # Fixed ₱100
    
    # CAPTCHA (configured via environment in production)
    RECAPTCHA_SITE_KEY = os.environ.get('RECAPTCHA_SITE_KEY', '')
    RECAPTCHA_SECRET_KEY = os.environ.get('RECAPTCHA_SECRET_KEY', '')
    
    # Email: send from loophco@gmail.com (set MAIL_USERNAME/MAIL_PASSWORD in env for SMTP)
    MAIL_SERVER = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', 587))
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'true').lower() == 'true'
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME', 'loophco@gmail.com')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD', '')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER', 'loophco@gmail.com')

class DevelopmentConfig(Config):
    """Development environment configuration"""
    DEBUG = True
    TESTING = False

class ProductionConfig(Config):
    """Production environment configuration"""
    DEBUG = False
    TESTING = False
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'eterno_production_key_2024'
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Strict'

class PythonAnywhereConfig(Config):
    """PythonAnywhere hosting configuration"""
    DEBUG = False
    TESTING = False
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'eterno_pythonanywhere_key_2024'
    
    # PythonAnywhere provides a persistent home directory
    basedir = os.path.expanduser('~')
    instance_dir = os.path.join(basedir, '.eterno_instance')
    
    # Use PostgreSQL on PythonAnywhere if DATABASE_URL is set, else SQLite
    # PythonAnywhere recommends PostgreSQL for production
    if os.environ.get('DATABASE_URL'):
        SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
    else:
        # Fall back to SQLite in home directory
        os.makedirs(instance_dir, exist_ok=True)
        SQLALCHEMY_DATABASE_URI = f'sqlite:///{os.path.join(instance_dir, "eterno.db")}'
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Session settings for HTTPS
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Strict'

class VercelConfig(Config):
    """Vercel serverless configuration"""
    DEBUG = False
    TESTING = False
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'vercel_secret_key_2024'
    # Use in-memory SQLite for Vercel (data won't persist between requests)
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Strict'
    # Disable Flask static file serving for Vercel (let Vercel handle it)
    SEND_FILE_MAX_AGE_DEFAULT = 0

class TestingConfig(Config):
    """Testing environment configuration"""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///test_eterno.db'
    WTF_CSRF_ENABLED = False

# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'pythonanywhere': PythonAnywhereConfig,
    'vercel': VercelConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}