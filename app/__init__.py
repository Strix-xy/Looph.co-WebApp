"""
ETERNO E-Commerce Platform - Application Factory
Creates and configures the Flask application instance
"""
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from config import config

# Initialize extensions
db = SQLAlchemy()

def create_app(config_name='default'):
    """
    Application factory pattern
    Creates and configures the Flask application
    
    Args:
        config_name: Configuration to use (development, production, testing)
    
    Returns:
        Configured Flask application instance
    """
    # Create Flask app with instance folder support
    import os
    basedir = os.path.abspath(os.path.dirname(__file__))
    instance_path = os.path.join(os.path.dirname(basedir), 'instance')
    os.makedirs(instance_path, exist_ok=True)
    
    app = Flask(__name__, instance_path=instance_path, instance_relative_config=True)
    
    # Load configuration
    app.config.from_object(config[config_name])
    
    # Initialize extensions
    db.init_app(app)
    
    # Register custom Jinja2 filters
    from app.utils.helpers import format_peso
    app.jinja_env.filters['peso'] = format_peso
    
    # Register blueprints
    from app.routes.main import main_bp
    from app.routes.auth import auth_bp
    from app.routes.admin import admin_bp
    from app.routes.customer import customer_bp
    
    app.register_blueprint(main_bp)
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(admin_bp, url_prefix='/admin')
    app.register_blueprint(customer_bp)
    
    # Initialize database and create default data
    with app.app_context():
        from app.utils.db_init import init_database
        init_database()
    
    return app