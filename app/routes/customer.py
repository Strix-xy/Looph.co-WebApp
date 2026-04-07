"""
ETERNO E-Commerce Platform - Customer Routes
Handles customer shopping, cart, and checkout functionality
"""
from flask import Blueprint, render_template, request, jsonify, redirect, url_for, session, send_file
from app import db
from app.models import Product, Cart, Order, User, Review, WishlistItem, Voucher
from app.utils.helpers import (
    calculate_shipping_fee, calculate_cart_totals,
    validate_payment_method, sanitize_string
)
from app.utils.crypto import encrypt_field, decrypt_field
from app.utils.export import export_to_excel
from app.utils.email import send_order_receipt_email
import json

customer_bp = Blueprint('customer', __name__)

# ==================== SHOP ====================

@customer_bp.route('/shop')
def shop():
    products = Product.query.filter(Product.stock > 0).order_by(
        Product.is_pinned.desc(), Product.created_at.desc()
    ).all()
    return render_template('shop.html', products=products)


@customer_bp.route('/product/<int:product_id>')
def product_detail(product_id):
    product = Product.query.get_or_404(product_id)
    reviews = product.reviews.order_by(Review.created_at.desc()).limit(50).all()
    in_wishlist = False
    if 'user_id' in session:
        in_wishlist = WishlistItem.query.filter_by(
            user_id=session['user_id'], product_id=product_id
        ).first() is not None
    return render_template(
        'product_detail.html',
        product=product,
        reviews=reviews,
        in_wishlist=in_wishlist
    )


@customer_bp.route('/wishlist/toggle/<int:product_id>', methods=['POST'])
def wishlist_toggle(product_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Please login'}), 401
    Product.query.get_or_404(product_id)
    item = WishlistItem.query.filter_by(
        user_id=session['user_id'], product_id=product_id
    ).first()
    if item:
        db.session.delete(item)
        db.session.commit()
        return jsonify({'success': True, 'in_wishlist': False})
    wi = WishlistItem(user_id=session['user_id'], product_id=product_id)
    db.session.add(wi)
    db.session.commit()
    return jsonify({'success': True, 'in_wishlist': True})


@customer_bp.route('/wishlist/remove/<int:product_id>')
def wishlist_remove(product_id):
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    item = WishlistItem.query.filter_by(
        user_id=session['user_id'], product_id=product_id
    ).first()
    if item:
        db.session.delete(item)
        db.session.commit()
    return redirect(url_for('customer.profile'))


@customer_bp.route('/product/<int:product_id>/review', methods=['POST'])
def add_review(product_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Please login'}), 401
    Product.query.get_or_404(product_id)
    data = request.json or {}
    rating = data.get('rating')
    comment = sanitize_string(data.get('comment', ''))
    if rating is None or not (1 <= int(rating) <= 5):
        return jsonify({'error': 'Rating must be 1-5'}), 400
    review = Review(
        product_id=product_id,
        user_id=session['user_id'],
        rating=int(rating),
        comment=comment[:2000] if comment else None
    )
    db.session.add(review)
    db.session.commit()
    return jsonify({'success': True, 'review_id': review.id})


@customer_bp.route('/about')
def about():
    """About page - brand story and values"""
    return render_template('about.html')


# ==================== SHOPPING CART ====================

@customer_bp.route('/cart')
def cart():
    """Shopping cart page - view items before checkout"""
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    
    cart_items = db.session.query(Cart, Product).join(Product).filter(
        Cart.user_id == session['user_id']
    ).all()
    
    total_subtotal = sum(product.price * cart_item.quantity for cart_item, product in cart_items)
    user = User.query.get(session['user_id'])
    
    display_address = decrypt_field(user.address) if user else ''
    return render_template(
        'cart.html',
        cart_items=cart_items,
        total_subtotal=total_subtotal,
        user_profile=user,
        display_address=display_address
    )


@customer_bp.route('/profile')
def profile():
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    user = User.query.get_or_404(session['user_id'])
    orders = user.orders.order_by(Order.created_at.desc()).limit(20).all()
    wishlist_items = user.wishlist_items.order_by(WishlistItem.id.desc()).all()
    display_address = decrypt_field(user.address)
    display_phone = decrypt_field(user.phone_number)
    return render_template('profile.html', user=user, orders=orders,
                          wishlist_items=wishlist_items,
                          display_address=display_address, display_phone=display_phone)


@customer_bp.route('/profile/edit', methods=['GET', 'POST'])
def edit_profile():
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    user = User.query.get_or_404(session['user_id'])
    if request.method == 'POST':
        from app.utils.helpers import is_valid_phone_ph
        phone_raw = request.form.get('phone_number', '')
        if not is_valid_phone_ph(phone_raw):
            display_address = decrypt_field(user.address)
            display_phone = decrypt_field(user.phone_number)
            return render_template('profile_edit.html', user=user,
                                  display_address=display_address, display_phone=display_phone,
                                  error='Invalid phone. Use Philippine format: 09XXXXXXXXX or +639XXXXXXXXX')
        user.full_name = sanitize_string(request.form.get('full_name'), max_length=120)
        user.address = encrypt_field(sanitize_string(request.form.get('address')))
        user.phone_number = encrypt_field(sanitize_string(phone_raw, max_length=30))
        user.default_payment_method = sanitize_string(request.form.get('default_payment_method'), max_length=50)
        db.session.commit()
        return redirect(url_for('customer.profile'))
    display_address = decrypt_field(user.address)
    display_phone = decrypt_field(user.phone_number)
    return render_template('profile_edit.html', user=user,
                          display_address=display_address, display_phone=display_phone)


@customer_bp.route('/cart/count')
def cart_count():
    """API endpoint to get total items in cart (for navbar badge)"""
    if 'user_id' not in session:
        return jsonify({'count': 0})
    
    # Sum all quantities in cart
    count = db.session.query(db.func.sum(Cart.quantity)).filter(
        Cart.user_id == session['user_id']
    ).scalar() or 0
    
    return jsonify({'count': int(count)})


@customer_bp.route('/cart/add', methods=['POST'])
def add_to_cart():
    """Add product to shopping cart"""
    # Check if user is logged in
    if 'user_id' not in session:
        return jsonify({'error': 'Please login'}), 401
    
    try:
        data = request.json
        product_id = data.get('product_id')
        quantity = data.get('quantity', 1)
        
        # Validate input
        if not product_id:
            return jsonify({'error': 'Product ID required'}), 400
        
        if quantity < 1:
            return jsonify({'error': 'Quantity must be at least 1'}), 400
        
        # Check if product exists and has stock
        product = Product.query.get(product_id)
        if not product:
            return jsonify({'error': 'Product not found'}), 404
        
        if not product.is_in_stock(quantity):
            return jsonify({'error': 'Insufficient stock'}), 400
        
        # Check if item already in cart
        cart_item = Cart.query.filter_by(
            user_id=session['user_id'],
            product_id=product_id
        ).first()
        
        if cart_item:
            # Increase quantity
            new_quantity = cart_item.quantity + quantity
            if not product.is_in_stock(new_quantity):
                return jsonify({'error': 'Insufficient stock'}), 400
            cart_item.quantity = new_quantity
        else:
            # Add new cart item
            cart_item = Cart(
                user_id=session['user_id'],
                product_id=product_id,
                quantity=quantity
            )
            db.session.add(cart_item)
        
        db.session.commit()
        
        # Return updated cart count
        cart_count = db.session.query(db.func.sum(Cart.quantity)).filter(
            Cart.user_id == session['user_id']
        ).scalar() or 0
        
        return jsonify({
            'success': True,
            'cart_count': int(cart_count)
        })
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to add to cart'}), 500


@customer_bp.route('/cart/update/<int:cart_id>', methods=['PUT'])
def update_cart(cart_id):
    """Update cart item quantity"""
    # Check if user is logged in
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        cart_item = Cart.query.get_or_404(cart_id)
        
        # Verify cart item belongs to user
        if cart_item.user_id != session['user_id']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        data = request.json
        change = data.get('change', 0)
        new_quantity = cart_item.quantity + change
        
        # Remove item if quantity reaches 0 or below
        if new_quantity <= 0:
            db.session.delete(cart_item)
        else:
            # Check stock availability
            if not cart_item.product.is_in_stock(new_quantity):
                return jsonify({'error': 'Insufficient stock'}), 400
            cart_item.quantity = new_quantity
        
        db.session.commit()
        
        return jsonify({'success': True})
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to update cart'}), 500


@customer_bp.route('/cart/remove/<int:cart_id>', methods=['DELETE'])
def remove_from_cart(cart_id):
    """Remove item from cart"""
    # Check if user is logged in
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        cart_item = Cart.query.get_or_404(cart_id)
        
        # Verify cart item belongs to user
        if cart_item.user_id != session['user_id']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        db.session.delete(cart_item)
        db.session.commit()
        
        return jsonify({'success': True})
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to remove item'}), 500


# ==================== VOUCHER ====================

@customer_bp.route('/cart/voucher/validate', methods=['POST'])
def validate_voucher():
    """Validate a voucher code and return discount amount for cart display."""
    try:
        data = request.json or {}
        code = (data.get('code') or '').strip().upper()
        subtotal = float(data.get('subtotal', 0))
        delivery_fee = float(data.get('delivery_fee', 0))
        if not code:
            return jsonify({'error': 'Please enter a voucher code'}), 400
        v = Voucher.query.filter_by(code=code, is_active=True).first()
        if not v:
            return jsonify({'error': 'Invalid voucher code'}), 400
        if v.max_uses and (v.uses or 0) >= v.max_uses:
            return jsonify({'error': 'Voucher has reached maximum uses'}), 400
        from datetime import datetime
        now = datetime.utcnow()
        if v.start_at and now < v.start_at:
            return jsonify({'error': 'Voucher is not yet valid'}), 400
        if v.end_at and now > v.end_at:
            return jsonify({'error': 'Voucher has expired'}), 400
        if v.min_purchase and subtotal < float(v.min_purchase):
            return jsonify({'error': f'Minimum purchase ₱{float(v.min_purchase):,.2f} required'}), 400
        if v.voucher_type == 'free_delivery':
            discount_amount = min(float(v.discount_value), delivery_fee) if v.discount_value else delivery_fee
        elif v.voucher_type in ('product_discount', 'min_spend_discount'):
            discount_amount = min(float(v.discount_value), subtotal)
        elif v.voucher_type == 'bogo':
            discount_amount = float(v.discount_value)
        else:
            discount_amount = min(float(v.discount_value), subtotal)
        return jsonify({
            'valid': True,
            'discount_amount': round(discount_amount, 2),
            'voucher_type': v.voucher_type,
        })
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid request'}), 400


# ==================== CHECKOUT ====================

@customer_bp.route('/checkout', methods=['POST'])
def checkout():
    """Process customer checkout with shipping details"""
    if 'user_id' not in session:
        return jsonify({'error': 'Please login'}), 401
    
    try:
        data = request.json
        payment_method = data.get('payment_method')
        customer_address = sanitize_string(data.get('customer_address', ''))
        voucher_applied = data.get('voucher_applied', False)
        delivery_fee = data.get('delivery_fee', 0)

        if not customer_address:
            return jsonify({'error': 'Delivery address is required for checkout'}), 400
        
        valid_methods = ['cod', 'gcash']
        if payment_method not in valid_methods:
            return jsonify({'error': 'Invalid payment method'}), 400
        if payment_method == 'gcash' and not data.get('gcash_number'):
            return jsonify({'error': 'GCash number is required'}), 400
        
        user = User.query.get(session['user_id'])
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        cart_items = db.session.query(Cart, Product).join(Product).filter(
            Cart.user_id == session['user_id']
        ).all()
        
        if not cart_items:
            return jsonify({'error': 'Cart is empty'}), 400
        
        cart_data = calculate_cart_totals(cart_items)
        subtotal = cart_data['subtotal']
        voucher_code = (data.get('voucher_code') or '').strip().upper()
        discount_amount = 0
        free_delivery_applied = False
        if voucher_code:
            v = Voucher.query.filter_by(code=voucher_code, is_active=True).first()
            if not v or (v.max_uses and v.uses >= v.max_uses):
                return jsonify({'error': 'Invalid or expired voucher'}), 400
            from datetime import datetime
            now = datetime.utcnow()
            if v.start_at and now < v.start_at:
                return jsonify({'error': 'Voucher not yet valid'}), 400
            if v.end_at and now > v.end_at:
                return jsonify({'error': 'Voucher expired'}), 400
            if v.min_purchase and subtotal < float(v.min_purchase):
                return jsonify({'error': f'Minimum purchase ₱{v.min_purchase:.2f} for this voucher'}), 400
            if v.voucher_type == 'free_delivery':
                delivery_fee = 0
                discount_amount = data.get('delivery_fee') or 0
                free_delivery_applied = True
            elif v.voucher_type in ('product_discount', 'min_spend_discount'):
                discount_amount = min(float(v.discount_value), subtotal)
            elif v.voucher_type == 'bogo':
                discount_amount = float(v.discount_value)
            else:
                discount_amount = min(float(v.discount_value), subtotal)
            subtotal = max(0, subtotal - discount_amount)
        
        import random
        if not free_delivery_applied and (not delivery_fee or delivery_fee < 50):
            delivery_fee = random.randint(50, 100)
        
        total_amount = subtotal + delivery_fee
        
        order_items = []
        for cart_item, product in cart_items:
            if not product.is_in_stock(cart_item.quantity):
                return jsonify({
                    'error': f'Insufficient stock for {product.name}. Available: {product.stock}'
                }), 400
            
            product.reduce_stock(cart_item.quantity)
            product.sold_count = (product.sold_count or 0) + cart_item.quantity
            
            order_items.append({
                'product_id': product.id,
                'product_name': product.name,
                'quantity': cart_item.quantity,
                'price': product.price
            })
        
        new_order = Order(
            user_id=session['user_id'],
            customer_name=user.full_name or user.username,
            customer_email=user.email,
            customer_address=customer_address,
            subtotal=subtotal + discount_amount,
            shipping_fee=delivery_fee,
            total_amount=total_amount,
            payment_method=payment_method,
            items=json.dumps(order_items),
            status='completed' if payment_method == 'cod' else 'pending',
            voucher_code=voucher_code or None,
            voucher_discount=discount_amount
        )
        db.session.add(new_order)
        if voucher_code:
            v = Voucher.query.filter_by(code=voucher_code).first()
            if v:
                v.uses = (v.uses or 0) + 1
        Cart.query.filter_by(user_id=session['user_id']).delete()
        db.session.commit()
        export_to_excel()
        send_order_receipt_email(new_order)
        
        return jsonify({
            'success': True,
            'order_id': new_order.id,
            'payment_method': payment_method,
            'shipping_fee': delivery_fee,
            'total_amount': total_amount
        })
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Checkout failed. Please try again.'}), 500


@customer_bp.route('/receipt/<int:order_id>')
def customer_receipt(order_id):
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    order = Order.query.get_or_404(order_id)
    if order.user_id != session['user_id']:
        return redirect(url_for('customer.shop'))
    return redirect(url_for('customer.shop'))