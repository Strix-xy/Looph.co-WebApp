"""
LOOPH - Database Check Script
Run this file to inspect your database tables and records.
Usage: python check_db.py
"""
import os
import sys
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from dotenv import load_dotenv
load_dotenv()

from app import create_app, db
from app.models import User, Product, Order, Sale, Cart, Review, WishlistItem, OtpToken, Voucher, ReportCheckpoint
from app.utils.crypto import decrypt_field

app = create_app()

with app.app_context():

    print("\n" + "="*55)
    print("          LOOPH — DATABASE OVERVIEW")
    print("="*55)

    # ── Users ──────────────────────────────────────────────
    users = User.query.order_by(User.id).all()
    print(f"\n👤  USERS ({len(users)} total)")
    print("-"*55)
    if users:
        for u in users:
            print(f"  ID: {u.id:>3} | {u.username:<20} | {u.role:<10} | {u.email}")
    else:
        print("  No users found.")

    # ── Products ───────────────────────────────────────────
    products = Product.query.order_by(Product.id).all()
    print(f"\n📦  PRODUCTS ({len(products)} total)")
    print("-"*55)
    if products:
        for p in products:
            pinned = "📌" if p.is_pinned else "  "
            stock_label = "OUT" if p.stock == 0 else str(p.stock)
            print(f"  {pinned} ID: {p.id:>3} | {p.name:<25} | ₱{p.price:>10.2f} | Stock: {stock_label}")
    else:
        print("  No products found.")

    # ── Orders ─────────────────────────────────────────────
    orders = Order.query.order_by(Order.id.desc()).all()
    print(f"\n🛒  ORDERS ({len(orders)} total)")
    print("-"*55)
    if orders:
        for o in orders:
            print(f"  ID: {o.id:>3} | {o.customer_name:<20} | ₱{o.total_amount:>10.2f} | {o.status:<12} | {o.payment_method}")
    else:
        print("  No orders found.")

    # ── POS Sales ──────────────────────────────────────────
    sales = Sale.query.order_by(Sale.id.desc()).all()
    print(f"\n🖥️   POS SALES ({len(sales)} total)")
    print("-"*55)
    if sales:
        for s in sales:
            discount = f"-₱{s.discount_amount:.2f}" if s.discount_amount else "none"
            print(f"  ID: {s.id:>3} | ₱{s.total_amount:>10.2f} | Discount: {discount:<12} | {s.payment_method}")
    else:
        print("  No POS sales found.")

    # ── Cart ───────────────────────────────────────────────
    carts = Cart.query.all()
    print(f"\n🧺  ACTIVE CART ITEMS ({len(carts)} total)")
    print("-"*55)
    if carts:
        for c in carts:
            product_name = c.product.name if c.product else "Unknown"
            print(f"  Cart ID: {c.id:>3} | User ID: {c.user_id} | {product_name:<25} | Qty: {c.quantity}")
    else:
        print("  No items in any cart.")

    # ── Reviews ────────────────────────────────────────────
    reviews = Review.query.order_by(Review.id.desc()).all()
    print(f"\n⭐  REVIEWS ({len(reviews)} total)")
    print("-"*55)
    if reviews:
        for r in reviews:
            product_name = r.product.name if r.product else "Unknown"
            username = r.user.username if r.user else "Unknown"
            comment_preview = (r.comment[:30] + "...") if r.comment and len(r.comment) > 30 else (r.comment or "—")
            print(f"  ID: {r.id:>3} | {username:<15} | {product_name:<20} | {r.rating}/5 | {comment_preview}")
    else:
        print("  No reviews found.")

    # ── Wishlist ───────────────────────────────────────────
    wishlist = WishlistItem.query.all()
    print(f"\n❤️   WISHLIST ITEMS ({len(wishlist)} total)")
    print("-"*55)
    if wishlist:
        for w in wishlist:
            product_name = w.product.name if w.product else "Unknown"
            username = w.user.username if w.user else "Unknown"
            print(f"  ID: {w.id:>3} | {username:<15} | {product_name}")
    else:
        print("  No wishlist items.")

    # ── OTP Tokens ─────────────────────────────────────────
    otps = OtpToken.query.order_by(OtpToken.id.desc()).limit(10).all()
    print(f"\n🔑  OTP TOKENS (last 10)")
    print("-"*55)
    if otps:
        for o in otps:
            status = "USED" if o.used else "ACTIVE"
            print(f"  ID: {o.id:>3} | User ID: {o.user_id} | Purpose: {o.purpose:<10} | {status:<6} | Expires: {o.expires_at}")
    else:
        print("  No OTP tokens found.")

    # ── Vouchers ───────────────────────────────────────────
    vouchers = Voucher.query.all()
    print(f"\n🎟️   VOUCHERS ({len(vouchers)} total)")
    print("-"*55)
    if vouchers:
        for v in vouchers:
            status = "ACTIVE" if v.is_active else "INACTIVE"
            print(f"  ID: {v.id:>3} | {v.code:<15} | {v.voucher_type:<20} | ₱{v.discount_value:.2f} | Uses: {v.uses}/{v.max_uses} | {status}")
    else:
        print("  No vouchers found.")

    # ── Summary ────────────────────────────────────────────
    total_order_revenue = sum(o.total_amount for o in orders)
    total_pos_revenue   = sum(s.total_amount for s in sales)
    total_revenue       = total_order_revenue + total_pos_revenue

    print(f"\n💰  REVENUE SUMMARY")
    print("-"*55)
    print(f"  From Orders:    ₱{total_order_revenue:>12,.2f}")
    print(f"  From POS Sales: ₱{total_pos_revenue:>12,.2f}")
    print(f"  TOTAL:          ₱{total_revenue:>12,.2f}")

    print("\n" + "="*55)
    print("  Database check complete.")
    print("="*55 + "\n")