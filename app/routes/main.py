"""
ETERNO E-Commerce Platform - Main Public Routes
Handles public pages accessible to all visitors
"""
from flask import Blueprint, render_template
from app.models import Product

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index():
    """Landing page - show homepage with featured products"""
    # Get featured products (products with stock, limit to 8)
    featured_products = Product.query.filter(Product.stock > 0).order_by(Product.created_at.desc()).limit(8).all()
    return render_template('landing.html', featured_products=featured_products)