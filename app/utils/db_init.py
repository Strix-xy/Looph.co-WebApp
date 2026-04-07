"""
ETERNO E-Commerce Platform - Database Initialization
Creates database tables and default admin account
"""
from app import db
from app.models import User
from werkzeug.security import generate_password_hash

def _add_missing_columns():
    """Add columns that were added to models after the table was first created."""
    if db.engine.url.drivername != "sqlite":
        return
    with db.engine.connect() as conn:
        result = conn.execute(db.text("PRAGMA table_info(product)"))
        rows = result.fetchall()
        columns = [row[1] for row in rows]
        if "image_urls" not in columns:
            conn.execute(db.text("ALTER TABLE product ADD COLUMN image_urls TEXT"))
            conn.commit()


def init_database():
    """
    Initialize database tables and create default admin account
    This function is called automatically when the app starts
    """
    db.create_all()
    _add_missing_columns()

    # Check if default admin exists
    admin = User.query.filter_by(username='admin').first()
    
    if not admin:
        # Create default admin account
        admin = User(
            username='admin',
            email='admin@eterno.com',
            password=generate_password_hash('admin123'),
            role='admin'
        )
        
        db.session.add(admin)
        db.session.commit()
        
        print("[OK] Default admin account created:")
        print("  Username: admin")
        print("  Password: admin123")
        print("  Email: admin@eterno.com")
    
    print("[OK] Database initialized successfully")

def seed_sample_data():
    """
    Seed database with sample products (optional, for testing)
    Call this function manually if you want sample data
    """
    from app.models import Product
    
    # Check if products already exist
    if Product.query.count() > 0:
        print("Sample data already exists")
        return
    
    sample_products = [
        {
            'name': 'Classic White T-Shirt',
            'description': 'Premium cotton t-shirt with timeless design',
            'price': 599.00,
            'stock': 50,
            'category': 'Shirts',
            'image_url': '/static/images/products/white-tshirt.jpg'
        },
        {
            'name': 'Slim Fit Jeans',
            'description': 'Comfortable denim jeans with modern fit',
            'price': 1299.00,
            'stock': 30,
            'category': 'Pants',
            'image_url': '/static/images/products/jeans.jpg'
        },
        {
            'name': 'Leather Belt',
            'description': 'Genuine leather belt with silver buckle',
            'price': 799.00,
            'stock': 40,
            'category': 'Accessories',
            'image_url': '/static/images/products/belt.jpg'
        },
        {
            'name': 'Casual Sneakers',
            'description': 'Comfortable sneakers for everyday wear',
            'price': 2499.00,
            'stock': 25,
            'category': 'Footwear',
            'image_url': '/static/images/products/sneakers.jpg'
        },
        {
            'name': 'Black Polo Shirt',
            'description': 'Classic polo shirt perfect for any occasion',
            'price': 899.00,
            'stock': 35,
            'category': 'Shirts',
            'image_url': '/static/images/products/polo.jpg'
        }
    ]
    
    for product_data in sample_products:
        product = Product(**product_data)
        db.session.add(product)
    
    db.session.commit()
    print(f"[OK] {len(sample_products)} sample products added")