document.addEventListener("DOMContentLoaded", function() {
  if (document.getElementById("cartCount")) {
    updateCartCount();
  }
  var overlay = document.getElementById("modalOverlay");
  if (overlay) {
    overlay.addEventListener("click", function(e) {
      if (e.target === overlay) {
        overlay.classList.remove("active");
        overlay.querySelector(".modal.active") && overlay.querySelector(".modal.active").classList.remove("active");
      }
    });
    var cancelBtn = document.getElementById("modalConfirmCancel");
    if (cancelBtn) cancelBtn.addEventListener("click", function() {
      overlay.classList.remove("active");
      document.getElementById("modalConfirm").classList.remove("active");
      window._modalConfirmCallback = null;
    });
    var confirmOk = document.getElementById("modalConfirmOk");
    if (confirmOk) confirmOk.addEventListener("click", function() {
      overlay.classList.remove("active");
      document.getElementById("modalConfirm").classList.remove("active");
      if (window._modalConfirmCallback) { window._modalConfirmCallback(); window._modalConfirmCallback = null; }
    });
    var alertOk = document.getElementById("modalAlertOk");
    if (alertOk) alertOk.addEventListener("click", function() {
      overlay.classList.remove("active");
      document.getElementById("modalAlert").classList.remove("active");
      if (window._modalAlertCallback) { window._modalAlertCallback(); window._modalAlertCallback = null; }
    });
  }
});

function showConfirmModal(options) {
  var title = (options && options.title) || "Confirm";
  var body = (options && options.body) || "";
  var onConfirm = options && options.onConfirm;
  var overlay = document.getElementById("modalOverlay");
  var modal = document.getElementById("modalConfirm");
  if (!overlay || !modal) return;
  document.getElementById("modalConfirmTitle").textContent = title;
  document.getElementById("modalConfirmBody").textContent = body;
  overlay.classList.add("active");
  modal.classList.add("active");
  window._modalConfirmCallback = onConfirm || null;
}

function showAlertModal(options) {
  var title = (options && options.title) || "Notice";
  var body = (options && options.body) || "";
  var onClose = options && options.onClose;
  var overlay = document.getElementById("modalOverlay");
  var modal = document.getElementById("modalAlert");
  if (!overlay || !modal) return;
  document.getElementById("modalAlertTitle").textContent = title;
  document.getElementById("modalAlertBody").textContent = body;
  window._modalAlertCallback = onClose;
  overlay.classList.add("active");
  modal.classList.add("active");
}

var _toastTimeout = null;
function showToast(message, type, noBlur) {
  var backdrop = document.getElementById("toastBackdrop");
  var toast = document.getElementById("toast");
  if (!toast) return;
  if (_toastTimeout) clearTimeout(_toastTimeout);
  toast.textContent = message || "";
  toast.className = "toast show" + (type === "error" ? " toast-error" : " toast-success");
  if (backdrop && !noBlur) backdrop.classList.add("show");
  toast.classList.add("show");
  _toastTimeout = setTimeout(function() {
    toast.classList.remove("show");
    if (backdrop) backdrop.classList.remove("show");
    _toastTimeout = null;
  }, 3200);
}

async function updateCartCount() {
  try {
    const response = await fetch("/cart/count");
    const data = await response.json();
    const countEl = document.getElementById("cartCount");
    if (countEl && data.count > 0) {
      countEl.textContent = data.count;
      countEl.style.display = "flex";
    } else if (countEl) {
      countEl.style.display = "none";
    }
  } catch (error) {
  }
}

function confirmLogout() {
  showConfirmModal({
    title: "Log out",
    body: "Are you sure you want to logout?",
    onConfirm: function() {
      var logoutLink = document.querySelector("#logoutUrl");
      var logoutUrl = logoutLink ? logoutLink.dataset.url : window.logoutUrl || "/logout";
      window.location.href = logoutUrl;
    }
  });
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const newTheme = currentTheme === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
  updateThemeButton(newTheme);
}

function updateThemeButton(theme) {
  const icon = document.getElementById("themeIcon");
  if (icon) {
    if (theme === "light") {
      icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
    } else {
      icon.innerHTML = '<circle cx="12" cy="12" r="5"/><path d="M12 1v3m0 16v3M5.64 5.64l2.12 2.12m8.48 8.48l2.12 2.12M1 12h3m16 0h3M5.64 18.36l2.12-2.12m8.48-8.48l2.12-2.12"/>';
    }
  }
}

window.addEventListener("DOMContentLoaded", function () {
  const savedTheme = localStorage.getItem("theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);
  updateThemeButton(savedTheme);
});

async function updateQuantity(cartId, change) {
  try {
    const response = await fetch(`/cart/update/${cartId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ change: change }),
    });

    const data = await response.json();

    if (data.success) {
      location.reload();
    } else {
      if (typeof showToast === "function") showToast(data.error || "Error", "error");
    }
  } catch (error) {
    if (typeof showToast === "function") showToast(error.message || "Error", "error");
  }
}

function removeItem(cartId) {
  showConfirmModal({
    title: "Remove item",
    body: "Remove this item from cart?",
    onConfirm: function() {
      fetch("/cart/remove/" + cartId, { method: "DELETE" })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.success) location.reload();
          else showAlertModal({ title: "Error", body: data.error || "Failed to remove item" });
        })
        .catch(function(err) {
          showAlertModal({ title: "Error", body: err.message || "Request failed" });
        });
    }
  });
}

window.voucherApplied = false;
window.baseSubtotal = 0;

function showPaymentDetails() {
  var paymentMethod = document.querySelector('input[name="payment"]:checked');
  if (!paymentMethod) return;
  var paymentValue = paymentMethod.value;
  var deliveryAddressInput = document.getElementById("deliveryAddress");
  if (deliveryAddressInput) deliveryAddressInput.required = true;
  var paymentDetails = document.getElementById("paymentDetails");
  if (paymentDetails) paymentDetails.style.display = "block";
  var codDetails = document.getElementById("codDetails");
  var gcashDetails = document.getElementById("gcashDetails");
  var deliveryDetails = document.getElementById("deliveryDetails");
  if (deliveryDetails) deliveryDetails.classList.add("show");
  if (codDetails) codDetails.classList.remove("show");
  if (gcashDetails) gcashDetails.classList.remove("show");
  if (paymentValue === "cod") {
    if (codDetails) codDetails.classList.add("show");
  } else if (paymentValue === "gcash") {
    if (gcashDetails) gcashDetails.classList.add("show");
    var gcashNumberInput = document.getElementById("gcashNumber");
    var gcashAccountNameInput = document.getElementById("gcashAccountName");
    if (gcashNumberInput) gcashNumberInput.required = true;
    if (gcashAccountNameInput) gcashAccountNameInput.required = true;
  }
}

function applyVoucher() {
  var voucherCodeInput = document.getElementById("voucherCode");
  if (!voucherCodeInput) return;
  var code = voucherCodeInput.value.trim();
  if (!code) {
    showAlertModal({ title: "Voucher", body: "Please enter a voucher code" });
    return;
  }
  var subtotal = window.baseSubtotal || 0;
  var deliveryFee = 50 + Math.floor(Math.random() * 51);
  fetch("/cart/voucher/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: code, subtotal: subtotal, delivery_fee: deliveryFee })
  })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.valid) {
        window.voucherApplied = true;
        window.voucherCode = code.toUpperCase();
        window.voucherDiscount = data.discount_amount || 0;
        var voucherAppliedEl = document.getElementById("voucherApplied");
        document.querySelectorAll(".voucher-discount-amount").forEach(function(el) {
          el.textContent = "-₱" + (window.voucherDiscount).toFixed(2);
        });
        if (voucherAppliedEl) voucherAppliedEl.style.display = "block";
        updateTotal();
      } else {
        showAlertModal({ title: "Voucher", body: data.error || "Invalid voucher" });
      }
    })
    .catch(function() {
      showAlertModal({ title: "Error", body: "Could not validate voucher" });
    });
}

function removeVoucher() {
  window.voucherApplied = false;
  window.voucherCode = "";
  window.voucherDiscount = 0;
  var voucherAppliedEl = document.getElementById("voucherApplied");
  if (voucherAppliedEl) voucherAppliedEl.style.display = "none";
  var voucherCodeInput = document.getElementById("voucherCode");
  if (voucherCodeInput) voucherCodeInput.value = "";
  updateTotal();
}

function updateTotal() {
  var voucherRow = document.getElementById("voucherDiscountRow");
  var totalEl = document.getElementById("totalDisplay");
  var subtotal = window.baseSubtotal || 0;
  var discount = window.voucherDiscount || 0;
  var total = subtotal - discount;
  if (window.voucherApplied && voucherRow) {
    voucherRow.style.display = "flex";
    document.querySelectorAll(".voucher-discount-amount").forEach(function(el) {
      el.textContent = "-₱" + discount.toFixed(2);
    });
  } else if (voucherRow) {
    voucherRow.style.display = "none";
  }
  if (totalEl) totalEl.textContent = "₱" + total.toFixed(2);
}

function checkoutBtnHandler(btn) {
  var paymentMethod = document.querySelector('input[name="payment"]:checked');
  if (!paymentMethod) {
    showAlertModal({ title: "Checkout", body: "Please select a payment method" });
    return;
  }
  var paymentValue = paymentMethod.value;
  var addressInput = document.getElementById("deliveryAddress");
  if (!addressInput || !addressInput.value.trim()) {
    showAlertModal({ title: "Checkout", body: "Please enter your delivery address" });
    if (addressInput) addressInput.focus();
    return;
  }
  var paymentDetails = {
    address: addressInput.value.trim(),
    customer_address: addressInput.value.trim()
  };
  if (paymentValue === "gcash") {
    var gcashNumber = document.getElementById("gcashNumber");
    var gcashAccountName = document.getElementById("gcashAccountName");
    if (!gcashNumber || !gcashNumber.value.trim()) {
      showAlertModal({ title: "Checkout", body: "Please enter your GCash number" });
      return;
    }
    if (!gcashAccountName || !gcashAccountName.value.trim()) {
      showAlertModal({ title: "Checkout", body: "Please enter your GCash account name" });
      return;
    }
    paymentDetails.gcash_number = gcashNumber.value.trim();
    paymentDetails.gcash_account_name = gcashAccountName.value.trim();
  }
  showConfirmationSummary(paymentValue, paymentDetails);
}

function showConfirmationSummary(paymentMethod, paymentDetails) {
  var subtotal = window.baseSubtotal || 0;
  var discount = window.voucherDiscount || 0;
  var deliveryFee = 50 + Math.floor(Math.random() * 51);
  var total = subtotal - discount + deliveryFee;
  var summary = "ORDER CONFIRMATION\n\n";
  summary += "Subtotal: ₱" + subtotal.toFixed(2) + "\n";
  if (discount > 0) summary += "Voucher Discount: -₱" + discount.toFixed(2) + "\n";
  summary += "Delivery Fee: ₱" + deliveryFee.toFixed(2) + "\n";
  summary += "Total: ₱" + total.toFixed(2) + "\n\n";
  summary += "Payment: " + paymentMethod.toUpperCase() + "\n";
  if (paymentDetails.customer_address || paymentDetails.address) {
    summary += "Delivery: " + (paymentDetails.customer_address || paymentDetails.address) + "\n";
  }
  if (paymentMethod === "gcash") {
    summary += "GCash: " + (paymentDetails.gcash_number || "") + " (" + (paymentDetails.gcash_account_name || "") + ")";
  }
  showConfirmModal({
    title: "Confirm order",
    body: summary + "\n\nConfirm order?",
    onConfirm: function() { proceedCheckout(paymentMethod, paymentDetails, deliveryFee); }
  });
}

function proceedCheckout(paymentMethod, paymentDetails, deliveryFee) {
  var subtotal = window.baseSubtotal || 0;
  var discount = window.voucherDiscount || 0;
  var total = subtotal - discount + deliveryFee;
  var payload = {
    payment_method: paymentMethod,
    customer_address: paymentDetails.customer_address || paymentDetails.address || "",
    gcash_number: paymentDetails.gcash_number || "",
    gcash_account_name: paymentDetails.gcash_account_name || "",
    voucher_code: window.voucherCode || "",
    voucher_applied: !!(window.voucherCode),
    delivery_fee: deliveryFee,
    total: total
  };
  fetch("/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.success) {
        showAlertModal({
          title: "Order placed",
          body: "Order placed successfully. Receipt has been sent to your email.",
          onClose: function() {
            window.location.href = "/shop";
          }
        });
      } else {
        showAlertModal({ title: "Checkout error", body: data.error || "Something went wrong" });
      }
    })
    .catch(function(err) {
      showAlertModal({ title: "Error", body: err.message || "Request failed" });
    });
}

window.addEventListener("load", function() {
  if (document.getElementById("paymentDetails")) {
    showPaymentDetails();
  }
});

document.addEventListener("DOMContentLoaded", function() {
  const filterButtons = document.querySelectorAll(".filter-btn");
  const productCards = document.querySelectorAll(".product-card");

  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const category = btn.dataset.category;

      filterButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      productCards.forEach((card) => {
        if (category === "all" || card.dataset.category === category) {
          card.style.display = "block";
        } else {
          card.style.display = "none";
        }
      });
    });
  });
});
async function addToCartShop(productId) {
  try {
    const response = await fetch("/cart/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        product_id: productId,
        quantity: 1,
      }),
    });

    const data = await response.json();

    if (data.success) {
      if (typeof showToast === "function") showToast("Item added to cart!", "success", true);
      if (typeof updateCartCount === "function") updateCartCount();
    } else if (response.status === 401 && typeof showConfirmModal === "function") {
      showConfirmModal({
        title: "Login required",
        body: "Please login to add items to cart. Go to login?",
        onConfirm: function() { window.location.href = window.loginUrl || "/login"; }
      });
    } else {
      if (typeof showToast === "function") showToast(data.error || "Error", "error");
    }
  } catch (error) {
    if (typeof showToast === "function") showToast(error.message || "Error", "error");
  }
}

let currentFilter = "all";
let allTransactions = [];

async function viewOrders() {
  const modal = document.getElementById("ordersModal");
  const container = document.getElementById("ordersTableContainer");
  
  if (modal) modal.classList.add("active");
  
  try {
    const response = await fetch("/admin/orders?limit=200");
    const data = await response.json();
    if (data.success) {
      allTransactions = data.transactions || [];
      displayOrders(allTransactions);
      
      if (container) {
        const existingMsg = container.querySelector(".orders-info-message");
        if (existingMsg) existingMsg.remove();
        
        const totals = data.totals || {};
        const combinedTotal = totals.combined ?? allTransactions.length;
        const infoMsg = document.createElement("div");
        infoMsg.className = "orders-info-message";
        infoMsg.style.cssText = "text-align: center; padding: 1rem; margin-top: 1rem; color: var(--text-gray); font-size: 0.9rem; border-top: 1px solid var(--border-color);";
        let summaryText = `Showing ${allTransactions.length} recent transactions (Customer: ${totals.customer_orders ?? 0} | POS: ${totals.pos_sales ?? 0} | Combined: ${combinedTotal}).`;
        if (combinedTotal > allTransactions.length) {
          summaryText += " Use filters to narrow down results.";
        }
        infoMsg.textContent = summaryText;
        container.appendChild(infoMsg);
      }
    } else {
      if (container) {
        container.innerHTML = `<p style="text-align: center; padding: 2rem; color: #ff4444;">Error: ${data.error}</p>`;
      } else {
        if (typeof showToast === "function") showToast("Error loading orders: " + (data.error || ""), "error");
      }
    }
  } catch (error) {
    if (container) {
      container.innerHTML = `<p style="text-align: center; padding: 2rem; color: #ff4444;">Error: ${error.message}</p>`;
    } else {
      if (typeof showToast === "function") showToast("Error loading orders: " + error.message, "error");
    }
  }
}

function filterOrders(filter, button) {
  currentFilter = filter;
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.classList.remove("active");
  });
  if (button) {
    button.classList.add("active");
  } else {
    const buttons = document.querySelectorAll(".filter-btn");
    buttons.forEach((btn) => {
      if (btn.textContent.trim().includes(filter.toUpperCase())) {
        btn.classList.add("active");
      }
    });
  }

  let filteredTransactions = allTransactions;
  if (filter === "paid") {
    filteredTransactions = allTransactions.filter((transaction) => {
      const status = (transaction.status || "").toLowerCase();
      if (transaction.record_type === "pos_sale") {
        return true;
      }
      return status === "completed" || status === "paid";
    });
  } else if (filter === "pending") {
    filteredTransactions = allTransactions.filter(
      (transaction) =>
        transaction.record_type === "customer_order" &&
        (transaction.status || "").toLowerCase() === "pending"
    );
  }
  
  displayOrders(filteredTransactions);
}

function displayOrders(transactions) {
  const tbody = document.getElementById("ordersTableBody");
  if (!tbody) return;
  if (!transactions || transactions.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="8" style="text-align: center; padding: 2rem;">No orders found</td></tr>';
    return;
  }

  tbody.innerHTML = transactions
    .map((transaction) => {
      const isPosSale = transaction.record_type === "pos_sale";
      const statusValue = (transaction.status || (isPosSale ? "completed" : "")).toLowerCase();
      const statusClass =
        statusValue === "completed" || statusValue === "paid"
          ? "status-paid"
          : statusValue === "pending"
          ? "status-pending"
          : "";
      const statusLabel = isPosSale
        ? "COMPLETED"
        : (transaction.status || "N/A").toUpperCase();
      const paymentLabel = (transaction.payment_method || (isPosSale ? "cash" : "n/a")).toUpperCase();
      const reference = transaction.reference || `#${transaction.id}`;
      const badgeClass = isPosSale ? "badge-pos" : "badge-customer";
      const badgeLabel = isPosSale ? "POS" : "ONLINE";
      const dateDisplay = transaction.created_at_display || transaction.created_at || "";
      const totalAmount = parseFloat(transaction.total_amount || 0).toFixed(2);
      const customerName = transaction.customer_name || (isPosSale ? "POS Walk-in" : "N/A");
      const changeStatusCell = isPosSale
        ? '<td style="text-align: center; color: var(--text-gray);">—</td>'
        : `<td>
            <select class="status-select" data-order-id="${transaction.id}" onchange="updateOrderStatus(${transaction.id}, this.value)">
              <option value="pending" ${statusValue === "pending" ? "selected" : ""}>PENDING</option>
              <option value="completed" ${statusValue === "completed" || statusValue === "paid" ? "selected" : ""}>COMPLETED</option>
            </select>
          </td>`;
      return `
        <tr>
          <td>
            <span class="transaction-badge ${badgeClass}">${badgeLabel}</span>
            ${reference}
          </td>
          <td>${dateDisplay}</td>
          <td>${customerName}</td>
          <td>₱${totalAmount}</td>
          <td class="${statusClass}">${statusLabel}</td>
          <td>${paymentLabel}</td>
          <td><button class="order-details-btn" onclick="viewOrderDetails(${
            transaction.id
          })">VIEW DETAILS</button></td>
          ${changeStatusCell}
        </tr>
      `;
    })
    .join("");
}

async function viewOrderDetails(orderId) {
  try {
    const response = await fetch(`/admin/orders/${orderId}`);
    const data = await response.json();
    if (data.success) {
      displayTransactionDetails(data.transaction, data.record_type);
      const modal = document.getElementById("orderDetailsModal");
      if (modal) modal.classList.add("active");
    } else {
      if (typeof showToast === "function") showToast("Error loading order details: " + (data.error || ""), "error");
    }
  } catch (error) {
    if (typeof showToast === "function") showToast("Error loading order details: " + error.message, "error");
  }
}

function displayTransactionDetails(transaction, recordType) {
  if (!transaction) return;
  const container = document.getElementById("orderDetailsContent");
  if (!container) return;

  const isPosSale = recordType === "pos_sale" || transaction.record_type === "pos_sale";
  const items = Array.isArray(transaction.items) ? transaction.items : [];
  const dateDisplay = transaction.created_at_display || transaction.created_at || "";
  const statusValue = (transaction.status || (isPosSale ? "completed" : "")).toUpperCase();
  const statusClass =
    statusValue === "COMPLETED" || statusValue === "PAID"
      ? "status-paid"
      : statusValue === "PENDING"
      ? "status-pending"
      : "";
  const paymentMethod = (transaction.payment_method || (isPosSale ? "cash" : "n/a")).toUpperCase();
  const subtotal = parseFloat(transaction.subtotal || 0);
  const shippingFee = parseFloat(transaction.shipping_fee || 0);
  const discountAmount = parseFloat(transaction.discount_amount || 0);
  const discountLabel = transaction.discount_type
    ? transaction.discount_type.toUpperCase()
    : "DISCOUNT";
  const total = parseFloat(transaction.total_amount || 0);
  const processedBy = transaction.processed_by || (isPosSale ? "Admin" : "Online Checkout");
  const reference = transaction.reference || `#${transaction.id}`;
  const customerName = transaction.customer_name || (isPosSale ? "POS Walk-in" : "N/A");
  const customerEmail = transaction.customer_email || "";
  const customerAddress = transaction.customer_address || "";
  
  const itemRows =
    items && items.length
      ? items
          .map((item) => {
            const name = item.product_name || item.name || "Item";
            const quantity = parseFloat(item.quantity || 0);
            const price = parseFloat(item.price || 0);
            const lineTotal = price * quantity;
            return `
              <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 0.5rem;">${name}</td>
                <td style="padding: 0.5rem; text-align: right;">${quantity}</td>
                <td style="padding: 0.5rem; text-align: right;">₱${price.toFixed(2)}</td>
                <td style="padding: 0.5rem; text-align: right;">₱${lineTotal.toFixed(2)}</td>
              </tr>
            `;
          })
          .join("")
      : `<tr><td colspan="4" style="padding: 1rem; text-align: center; color: var(--text-gray);">No items recorded.</td></tr>`;
  
  const discountRow =
    discountAmount > 0
      ? `<p style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
          <span>Discount (${discountLabel}):</span>
          <span>-₱${discountAmount.toFixed(2)}</span>
        </p>`
      : "";
  
  const shippingRow = !isPosSale
    ? `<p style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
        <span>Shipping Fee:</span>
        <span>₱${shippingFee.toFixed(2)}</span>
      </p>`
    : "";
  
  const customerDetails = isPosSale
    ? `<p><strong>Customer:</strong> POS Walk-in</p>`
    : `
        <p><strong>Customer:</strong> ${customerName}</p>
        ${customerEmail ? `<p><strong>Email:</strong> ${customerEmail}</p>` : ""}
        ${customerAddress ? `<p><strong>Address:</strong> ${customerAddress}</p>` : ""}
      `;
  
  const content = `
      <div class="transaction-receipt-block">
        <div style="margin-bottom: 1.5rem;">
          <h3 style="font-family: 'Cinzel', serif; letter-spacing: 2px; margin-bottom: 0.75rem;">${isPosSale ? "POS SALE" : "CUSTOMER ORDER"}</h3>
          <p><strong>Reference:</strong> ${reference}</p>
          <p><strong>Date & Time:</strong> ${dateDisplay}</p>
          <p><strong>Payment Method:</strong> ${paymentMethod}</p>
          <p><strong>Status:</strong> <span class="${statusClass}">${statusValue}</span></p>
          <p><strong>Processed By:</strong> ${processedBy}</p>
        </div>
        <div style="margin-bottom: 1.5rem;">
          <h4 style="font-family: 'Cinzel', serif; letter-spacing: 2px; margin-bottom: 0.75rem;">CUSTOMER DETAILS</h4>
          ${customerDetails}
        </div>
        <div style="margin-bottom: 1.5rem;">
          <h4 style="font-family: 'Cinzel', serif; letter-spacing: 2px; margin-bottom: 0.75rem;">ITEMS</h4>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border-color);">
                <th style="padding: 0.5rem; text-align: left;">Product</th>
                <th style="padding: 0.5rem; text-align: right;">Qty</th>
                <th style="padding: 0.5rem; text-align: right;">Price</th>
                <th style="padding: 0.5rem; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
          </table>
        </div>
        <div style="border-top: 2px solid var(--border-color); padding-top: 1rem;">
          <p style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
            <span>Subtotal:</span>
            <span>₱${subtotal.toFixed(2)}</span>
          </p>
          ${discountRow}
          ${shippingRow}
          <p style="display: flex; justify-content: space-between; font-size: 1.2rem; font-weight: bold; margin-top: 1rem;">
            <span>Total:</span>
            <span>₱${total.toFixed(2)}</span>
          </p>
        </div>
      </div>
    `;
  
  container.innerHTML = content;
}

function closeOrdersModal() {
  const modal = document.getElementById("ordersModal");
  if (modal) modal.classList.remove("active");
}

function closeOrderDetailsModal() {
  const modal = document.getElementById("orderDetailsModal");
  if (modal) modal.classList.remove("active");
}

// Close modals when clicking outside
document.addEventListener("DOMContentLoaded", function() {
  const ordersModal = document.getElementById("ordersModal");
  if (ordersModal) {
    ordersModal.addEventListener("click", (e) => {
      if (e.target.id === "ordersModal") {
        closeOrdersModal();
      }
    });
  }

  const orderDetailsModal = document.getElementById("orderDetailsModal");
  if (orderDetailsModal) {
    orderDetailsModal.addEventListener("click", (e) => {
      if (e.target.id === "orderDetailsModal") {
        closeOrderDetailsModal();
      }
    });
  }
});

async function viewProducts() {
  const modal = document.getElementById("productsModal");
  const container = document.getElementById("productsListContainer");
  
  if (modal) modal.classList.add("active");
  
  try {
    const response = await fetch("/admin/products/list");
    const data = await response.json();
    if (data.success) {
      displayProducts(data.products);
    } else {
      if (container) {
        container.innerHTML = `<p style="text-align: center; padding: 2rem; color: #ff4444;">Error: ${data.error}</p>`;
      } else {
        if (typeof showToast === "function") showToast("Error loading products: " + (data.error || ""), "error");
      }
    }
  } catch (error) {
    if (container) {
      container.innerHTML = `<p style="text-align: center; padding: 2rem; color: #ff4444;">Error: ${error.message}</p>`;
    } else {
      if (typeof showToast === "function") showToast("Error loading products: " + error.message, "error");
    }
  }
}

function displayProducts(products) {
  const container = document.getElementById("productsListContainer");
  if (!container) return;
  if (!products || products.length === 0) {
    container.innerHTML =
      '<p style="text-align: center; padding: 2rem;">No products found</p>';
    return;
  }

  container.innerHTML = `
      <table class="orders-table">
        <thead>
          <tr>
            <th>Image</th>
            <th>Product Name</th>
            <th>Category</th>
            <th>Price</th>
            <th>Stock</th>
          </tr>
        </thead>
        <tbody>
          ${products
            .map(
              (product) => `
            <tr>
              <td>
                ${
                  product.image_url
                    ? `<img src="${product.image_url}" alt="${product.name}" class="product-item-image" />`
                    : `<div class="product-item-placeholder">E</div>`
                }
              </td>
              <td>${product.name}</td>
              <td>${product.category || "Uncategorized"}</td>
              <td>₱${parseFloat(product.price).toFixed(2)}</td>
              <td class="${
                product.stock === 0
                  ? "stock-out"
                  : product.stock < 10
                  ? "stock-low"
                  : ""
              }">${product.stock}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `;
}

function closeProductsModal() {
  const modal = document.getElementById("productsModal");
  if (modal) modal.classList.remove("active");
}

// Revenue Modal Functions
async function viewRevenue() {
  const modal = document.getElementById("revenueModal");
  const container = document.getElementById("revenueContent");
  
  if (modal) modal.classList.add("active");
  
  try {
    const response = await fetch("/admin/revenue");
    const data = await response.json();
    if (data.success) {
      displayRevenue(data.revenue);
    } else {
      if (container) container.innerHTML = `<p class="revenue-error">Error: ${data.error}</p>`;
      else if (typeof showToast === "function") showToast("Error loading revenue: " + (data.error || ""), "error");
    }
  } catch (error) {
    if (container) container.innerHTML = `<p class="revenue-error">Error: ${error.message}</p>`;
    else if (typeof showToast === "function") showToast("Error loading revenue: " + error.message, "error");
  }
}

function displayRevenue(revenue) {
  const container = document.getElementById("revenueContent");
  if (!container || !revenue) return;
  container.innerHTML = `
      <div class="revenue-layout">
        <div class="report-controls">
          <h3 class="report-controls-title">Report Actions</h3>
          <div class="report-tabs">
            <button type="button" class="btn report-tab active" data-view="current">Current</button>
            <button type="button" class="btn report-tab" data-view="history">History</button>
          </div>
          <div id="revenueCurrentView" class="revenue-view">
          <div class="report-buttons">
            <button class="btn report-btn" onclick="resetReports('weekly')">Reset Weekly</button>
            <button class="btn report-btn" onclick="resetReports('monthly')">Reset Monthly</button>
            <button class="btn report-btn" onclick="resetReports('yearly')">Reset Yearly</button>
          </div>
          <div class="report-buttons">
            <button class="btn report-btn" onclick="downloadReport('weekly')">Download Weekly PDF</button>
            <button class="btn report-btn" onclick="downloadReport('monthly')">Download Monthly PDF</button>
            <button class="btn report-btn" onclick="downloadReport('yearly')">Download Yearly PDF</button>
          </div>
          <div id="reportCheckpoints" class="report-checkpoints">
            <p style="color: var(--text-gray);">Loading report status...</p>
          </div>
          </div>
          <div id="revenueHistoryView" class="revenue-view" style="display:none;">
            <label class="revenue-history-label">Months:</label>
            <select id="revenueHistoryMonths" class="revenue-history-select">
              <option value="6">Last 6 months</option>
              <option value="12" selected>Last 12 months</option>
              <option value="24">Last 24 months</option>
            </select>
            <div id="revenueHistoryTableWrap"><p class="revenue-history-loading">Loading...</p></div>
          </div>
        </div>
        <div class="revenue-breakdown" id="revenueBreakdown">
          <div class="revenue-item">
            <div class="revenue-item-header">
              <h3 style="font-family: 'Cinzel', serif; letter-spacing: 2px;">Total Revenue</h3>
              <div class="revenue-amount">₱${parseFloat(revenue.total).toFixed(
                2
              )}</div>
            </div>
          </div>
          <div class="revenue-item">
            <div class="revenue-item-header">
              <h3 style="font-family: 'Cinzel', serif; letter-spacing: 2px;">From Orders</h3>
              <div class="revenue-amount">₱${parseFloat(
                revenue.from_orders
              ).toFixed(2)}</div>
            </div>
            <p style="color: var(--text-gray); margin-top: 0.5rem;">Total: ${
              revenue.orders_count
            } orders</p>
          </div>
          <div class="revenue-item">
            <div class="revenue-item-header">
              <h3 style="font-family: 'Cinzel', serif; letter-spacing: 2px;">From POS Sales</h3>
              <div class="revenue-amount">₱${parseFloat(revenue.from_pos).toFixed(
                2
              )}</div>
            </div>
            <p style="color: var(--text-gray); margin-top: 0.5rem;">Total: ${
              revenue.pos_count
            } sales</p>
          </div>
          <div class="revenue-item">
            <div class="revenue-item-header">
              <h3 style="font-family: 'Cinzel', serif; letter-spacing: 2px;">Average Order Value</h3>
              <div class="revenue-amount">₱${parseFloat(
                revenue.avg_order_value
              ).toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  loadReportCheckpoints();
  (function() {
    var tabs = container.querySelectorAll(".report-tab");
    var currentView = document.getElementById("revenueCurrentView");
    var historyView = document.getElementById("revenueHistoryView");
    var breakdown = document.getElementById("revenueBreakdown");
    tabs.forEach(function(tab) {
      tab.addEventListener("click", function() {
        var v = tab.getAttribute("data-view");
        tabs.forEach(function(t) { t.classList.toggle("active", t === tab); });
        if (v === "history") {
          if (currentView) currentView.style.display = "none";
          if (historyView) historyView.style.display = "block";
          if (breakdown) breakdown.style.display = "none";
          loadRevenueHistory();
        } else {
          if (currentView) currentView.style.display = "block";
          if (historyView) historyView.style.display = "none";
          if (breakdown) breakdown.style.display = "block";
        }
      });
    });
    var monthsSelect = document.getElementById("revenueHistoryMonths");
    if (monthsSelect) monthsSelect.addEventListener("change", loadRevenueHistory);
  })();
}

async function loadRevenueHistory() {
  var wrap = document.getElementById("revenueHistoryTableWrap");
  if (!wrap) return;
  var months = (document.getElementById("revenueHistoryMonths") || {}).value || "12";
  wrap.innerHTML = "<p class=\"revenue-history-loading\">Loading...</p>";
  try {
    var res = await fetch("/admin/revenue/history?months=" + months);
    var data = await res.json();
    if (data.success && data.history && data.history.length) {
      var html = "<table class=\"revenue-history-table\"><thead><tr><th>Period</th><th>Orders</th><th>POS</th><th>Total</th></tr></thead><tbody>";
      data.history.forEach(function(row) {
        html += "<tr><td>" + (row.period_label || "") + "</td><td>₱" + parseFloat(row.from_orders || 0).toFixed(2) + "</td><td>₱" + parseFloat(row.from_pos || 0).toFixed(2) + "</td><td>₱" + parseFloat(row.total || 0).toFixed(2) + "</td></tr>";
      });
      html += "</tbody></table>";
      wrap.innerHTML = html;
    } else {
      wrap.innerHTML = "<p class=\"revenue-history-loading\">No history data.</p>";
    }
  } catch (e) {
    wrap.innerHTML = "<p class=\"revenue-history-loading\" style=\"color:#ff7373;\">Failed to load history.</p>";
  }
}

async function loadReportCheckpoints() {
  const container = document.getElementById("reportCheckpoints");
  if (!container) return;
  
  try {
    const response = await fetch("/admin/reports/checkpoints");
    const data = await response.json();
    if (data.success) {
      renderReportCheckpoints(data.checkpoints || {});
    } else {
      container.innerHTML = `<p style="color: #ff7373;">${data.error || "Unable to load report status."}</p>`;
    }
  } catch (error) {
    container.innerHTML = `<p style="color: #ff7373;">${error.message}</p>`;
  }
}

function renderReportCheckpoints(checkpoints) {
  const container = document.getElementById("reportCheckpoints");
  if (!container) return;
  
  const periods = [
    { key: "weekly", label: "Weekly" },
    { key: "monthly", label: "Monthly" },
    { key: "yearly", label: "Yearly" },
  ];
  
  const items = periods
    .map(({ key, label }) => {
      const entry = checkpoints[key];
      const displayValue = entry ? entry.last_reset_at_display : "Not reset yet";
      return `
        <div class="report-checkpoint-item">
          <span class="report-checkpoint-label">${label} reset:</span>
          <span class="report-checkpoint-value">${displayValue}</span>
        </div>
      `;
    })
    .join("");
  
  container.innerHTML = items;
}

function resetReports(period) {
  var periodLabel = period.charAt(0).toUpperCase() + period.slice(1);
  if (typeof showConfirmModal !== "function") {
    if (!confirm("Reset " + periodLabel + " sales reports? This will update the baseline timestamp.")) return;
    doResetReports(period, periodLabel);
    return;
  }
  showConfirmModal({
    title: "Reset reports",
    body: "Reset " + periodLabel + " sales reports? This will update the baseline timestamp for " + periodLabel.toLowerCase() + " reporting.",
    onConfirm: function() { doResetReports(period, periodLabel); }
  });
}

async function doResetReports(period, periodLabel) {
  try {
    var response = await fetch("/admin/reports/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ period: period })
    });
    var data = await response.json();
    if (data.success) {
      if (typeof showToast === "function") showToast(data.message || periodLabel + " reports reset.", "success", true);
      loadReportCheckpoints();
    } else {
      if (typeof showToast === "function") showToast(data.error || "Failed to reset reports.", "error");
    }
  } catch (error) {
    if (typeof showToast === "function") showToast(error.message || "Error", "error");
  }
}

function downloadReport(period) {
  const url = `/admin/reports/pdf?period=${encodeURIComponent(period)}`;
  window.open(url, "_blank");
}

function closeRevenueModal() {
  const modal = document.getElementById("revenueModal");
  if (modal) modal.classList.remove("active");
}

// Update Order Status
async function updateOrderStatus(orderId, newStatus) {
  const targetOrder = allTransactions.find(
    (transaction) =>
      transaction.id === orderId &&
      transaction.record_type === "customer_order"
  );
  if (!targetOrder) {
    if (typeof showToast === "function") showToast("Only customer orders can be updated.", "error");
    return;
  }
  if (typeof showConfirmModal === "function") {
    showConfirmModal({
      title: "Update order status",
      body: "Change order #" + orderId + " status to " + (newStatus || "").toUpperCase() + "?",
      onConfirm: function() { doUpdateOrderStatus(orderId, newStatus); }
    });
    return;
  }
  if (!confirm("Change order #" + orderId + " status to " + (newStatus || "").toUpperCase() + "?")) return;
  doUpdateOrderStatus(orderId, newStatus);
}

async function doUpdateOrderStatus(orderId, newStatus) {
  try {
    const response = await fetch("/admin/orders/" + orderId + "/status", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: newStatus }),
    });

    const data = await response.json();

    if (data.success) {
      const orderIndex = allTransactions.findIndex(
        (transaction) =>
          transaction.id === orderId &&
          transaction.record_type === "customer_order"
      );
      if (orderIndex !== -1) {
        allTransactions[orderIndex].status = newStatus;
      }
      filterOrders(currentFilter, null);
      if (typeof showToast === "function") showToast("Order status updated successfully!", "success", true);
    } else {
      if (typeof showToast === "function") showToast("Error: " + (data.error || ""), "error");
      try {
        const response = await fetch("/admin/orders");
        const data = await response.json();
        if (data.success) {
          allTransactions = data.transactions || [];
          filterOrders(currentFilter, null);
        }
      } catch (error) {
      }
    }
  } catch (error) {
    if (typeof showToast === "function") showToast("Error: " + error.message, "error");
    try {
      const res = await fetch("/admin/orders");
      const d = await res.json();
      if (d.success) {
        allTransactions = d.transactions || [];
        filterOrders(currentFilter, null);
      }
    } catch (err) {}
  }
}

document.addEventListener("DOMContentLoaded", function() {
  const productsModal = document.getElementById("productsModal");
  if (productsModal) {
    productsModal.addEventListener("click", (e) => {
      if (e.target.id === "productsModal") {
        closeProductsModal();
      }
    });
  }

  const revenueModal = document.getElementById("revenueModal");
  if (revenueModal) {
    revenueModal.addEventListener("click", (e) => {
      if (e.target.id === "revenueModal") {
        closeRevenueModal();
      }
    });
  }
});

function updateImagePreview(url) {
  const previewDiv = document.getElementById("imagePreview");
  const previewImg = document.getElementById("previewImg");

  if (url && url.trim() !== "") {
    if (previewImg) {
      previewImg.src = url;
      previewImg.onerror = function() {
        if (previewDiv) previewDiv.style.display = "none";
      };
      previewImg.onload = function() {
        if (previewDiv) previewDiv.style.display = "block";
      };
    }
  } else {
    if (previewDiv) previewDiv.style.display = "none";
  }
}

function handleImageUpload(input) {
  const file = input.files[0];
  if (file) {
    if (!file.type.startsWith('image/')) {
      if (typeof showToast === "function") showToast("Please select an image file", "error");
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
      const previewDiv = document.getElementById("imagePreview");
      const previewImg = document.getElementById("previewImg");
      if (previewImg) {
        previewImg.src = e.target.result;
      }
      if (previewDiv) {
        previewDiv.style.display = "block";
      }

      const urlInput = document.getElementById("productImage");
      if (urlInput) urlInput.value = "";
    };
    reader.readAsDataURL(file);
  }
}

function openEditModal(productId) {
  const productsDataById = window.productsDataById || {};
  
  const product = productsDataById[productId];
  if (!product) {
    if (typeof showToast === "function") showToast("Product data not found", "error");
    return;
  }

  window.isEditMode = true;
  const modalTitle = document.getElementById("modalTitle");
  if (modalTitle) modalTitle.textContent = "EDIT PRODUCT";
  
  const { id, name, description, price, stock, category, image_url, image_urls, is_pinned } = product;
  const productIdInput = document.getElementById("productId");
  const productName = document.getElementById("productName");
  const productDescription = document.getElementById("productDescription");
  const productPrice = document.getElementById("productPrice");
  const productStock = document.getElementById("productStock");
  const productCategory = document.getElementById("productCategory");
  const productImage = document.getElementById("productImage");
  const productImageFile = document.getElementById("productImageFile");
  const productIsPinned = document.getElementById("productIsPinned");
  const productPinToggle = document.getElementById("productPinToggle");
  const productImageUrlsExtra = document.getElementById("productImageUrlsExtra");
  const urls = Array.isArray(image_urls) && image_urls.length ? image_urls : (image_url ? [image_url] : []);
  const primary = urls[0] || "";
  const extra = urls.slice(1);
  
  if (productIdInput) productIdInput.value = id || "";
  if (productName) productName.value = name || "";
  if (productDescription) productDescription.value = description || "";
  if (productPrice) productPrice.value = price || 0;
  if (productStock) productStock.value = stock || 0;
  if (productCategory) productCategory.value = category || "";
  if (productImage) productImage.value = primary;
  if (productImageFile) productImageFile.value = "";
  if (productIsPinned) productIsPinned.value = is_pinned ? "1" : "0";
  if (productPinToggle) {
    productPinToggle.classList.toggle("on", !!is_pinned);
    productPinToggle.setAttribute("aria-pressed", is_pinned ? "true" : "false");
  }
  if (productImageUrlsExtra) productImageUrlsExtra.value = extra.join("\n");
  updateImagePreview(primary);
  
  const modal = document.getElementById("productModal");
  if (modal) modal.classList.add("active");
}

function openAddModal() {
  window.isEditMode = false;
  var modalTitle = document.getElementById("modalTitle");
  if (modalTitle) modalTitle.textContent = "ADD PRODUCT";
  var form = document.getElementById("productForm");
  if (form) form.reset();
  var productId = document.getElementById("productId");
  if (productId) productId.value = "";
  var productImageFile = document.getElementById("productImageFile");
  if (productImageFile) productImageFile.value = "";
  var productIsPinned = document.getElementById("productIsPinned");
  if (productIsPinned) productIsPinned.value = "0";
  var productPinToggle = document.getElementById("productPinToggle");
  if (productPinToggle) {
    productPinToggle.classList.remove("on");
    productPinToggle.setAttribute("aria-pressed", "false");
  }
  var productImageUrlsExtra = document.getElementById("productImageUrlsExtra");
  if (productImageUrlsExtra) productImageUrlsExtra.value = "";
  var imagePreview = document.getElementById("imagePreview");
  if (imagePreview) imagePreview.style.display = "none";
  var modal = document.getElementById("productModal");
  if (modal) modal.classList.add("active");
}

function closeModal() {
  const modal = document.getElementById("productModal");
  if (modal) modal.classList.remove("active");
}

document.addEventListener("DOMContentLoaded", function() {
  const productForm = document.getElementById("productForm");
  if (productForm) {
    productForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const imageFileInput = document.getElementById("productImageFile");
      const imageUrlInput = document.getElementById("productImage");
      
      const imageFile = imageFileInput ? imageFileInput.files[0] : null;
      const imageUrl = imageUrlInput ? imageUrlInput.value.trim() : "";

      let finalImageUrl = imageUrl;
      if (imageFile) {
        try {
          const formData = new FormData();
          formData.append('image', imageFile);

          const uploadResponse = await fetch('/admin/products/upload-image', {
            method: 'POST',
            body: formData
          });

          const uploadData = await uploadResponse.json();
          if (uploadData.success) {
            finalImageUrl = uploadData.image_url;
          } else {
            if (typeof showToast === "function") showToast("Upload failed: " + (uploadData.error || "Error"), "error");
            return;
          }
        } catch (error) {
          if (typeof showToast === "function") showToast("Upload failed: " + (error.message || "Error"), "error");
          return;
        }
      }

      const productName = document.getElementById("productName");
      const productDescription = document.getElementById("productDescription");
      const productPrice = document.getElementById("productPrice");
      const productStock = document.getElementById("productStock");
      const productCategory = document.getElementById("productCategory");
          const productIsPinned = document.getElementById("productIsPinned");
      const productPinToggle = document.getElementById("productPinToggle");
      const productImageUrlsExtra = document.getElementById("productImageUrlsExtra");
      var imageUrlList = finalImageUrl ? [finalImageUrl] : [];
      if (productImageUrlsExtra && productImageUrlsExtra.value.trim()) {
        var lines = productImageUrlsExtra.value.split("\n").map(function(s) { return s.trim(); }).filter(Boolean);
        if (finalImageUrl) imageUrlList = [finalImageUrl].concat(lines.filter(function(u) { return u !== finalImageUrl; }));
        else imageUrlList = lines;
      }
      const productData = {
        name: productName ? productName.value : "",
        description: productDescription ? productDescription.value : "",
        price: productPrice ? productPrice.value : "",
        stock: productStock ? productStock.value : "",
        category: productCategory ? productCategory.value : "",
        image_url: finalImageUrl || (imageUrlList[0] || ""),
        image_urls: imageUrlList,
        is_pinned: productIsPinned ? productIsPinned.value === "1" : (productPinToggle ? productPinToggle.classList.contains("on") : false),
      };

      try {
        let response;

        if (window.isEditMode) {
          const productId = document.getElementById("productId");
          const id = productId ? productId.value : "";
          response = await fetch(`/admin/products/update/${id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(productData),
          });
        } else {
          response = await fetch("/admin/products/add", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(productData),
          });
        }

        const data = await response.json();

        if (data.success) {
          if (typeof showToast === "function") showToast(window.isEditMode ? "Product updated successfully!" : "Product added successfully!");
          closeModal();
          location.reload();
        } else {
          if (typeof showToast === "function") showToast(data.error || "Error", "error");
        }
      } catch (error) {
        if (typeof showToast === "function") showToast(error.message || "Error", "error");
      }
    });
  }
  var stockInput = document.getElementById("productStock");
  var stockMinus = document.getElementById("stockMinus");
  var stockPlus = document.getElementById("stockPlus");
  if (stockInput && stockMinus) stockMinus.addEventListener("click", function() {
    var v = parseInt(stockInput.value, 10) || 0;
    if (v > 0) stockInput.value = v - 1;
  });
  if (stockInput && stockPlus) stockPlus.addEventListener("click", function() {
    stockInput.value = (parseInt(stockInput.value, 10) || 0) + 1;
  });
  var productPinToggle = document.getElementById("productPinToggle");
  var productIsPinned = document.getElementById("productIsPinned");
  if (productPinToggle && productIsPinned) {
    productPinToggle.addEventListener("click", function() {
      productPinToggle.classList.toggle("on");
      productIsPinned.value = productPinToggle.classList.contains("on") ? "1" : "0";
      productPinToggle.setAttribute("aria-pressed", productIsPinned.value === "1" ? "true" : "false");
    });
  }
  var productImageFile = document.getElementById("productImageFile");
  if (productImageFile) productImageFile.addEventListener("change", function() { handleImageUpload(this); });
  var productImageInput = document.getElementById("productImage");
  if (productImageInput) productImageInput.addEventListener("input", function() { updateImagePreview(this.value); });
});

function deleteProduct(productId) {
  if (typeof showConfirmModal !== "function") {
    if (!confirm("Are you sure you want to delete this product? This action cannot be undone.")) return;
    doDeleteProduct(productId);
    return;
  }
  showConfirmModal({
    title: "Delete product",
    body: "Are you sure you want to delete this product? This action cannot be undone.",
    onConfirm: function() { doDeleteProduct(productId); }
  });
}

async function doDeleteProduct(productId) {
  try {
    const response = await fetch("/admin/products/delete/" + productId, { method: "DELETE" });
    const data = await response.json();
    if (data.success) {
      if (typeof showToast === "function") showToast("Product deleted successfully!");
      location.reload();
    } else {
      if (typeof showToast === "function") showToast(data.error || "Error", "error");
    }
  } catch (error) {
    if (typeof showToast === "function") showToast(error.message || "Error", "error");
  }
}

// Close modal when clicking outside
document.addEventListener("DOMContentLoaded", function() {
  const productModal = document.getElementById("productModal");
  if (productModal) {
    productModal.addEventListener("click", (e) => {
      if (e.target.id === "productModal") {
        closeModal();
      }
    });
  }
});

async function viewProductOrders(productId) {
  try {
    const response = await fetch(`/admin/products/${productId}/orders`);
    const data = await response.json();
    if (data.success) {
      const orderIds = data.order_ids;
      if (orderIds.length === 0) {
        if (typeof showToast === "function") showToast("This product has not been ordered yet.", "success", true);
      } else {
        const orderList = orderIds.map(id => "#" + id).join(", ");
        if (typeof showToast === "function") showToast("Order IDs: " + orderList, "success", true);
      }
    } else {
      if (typeof showToast === "function") showToast(data.error || "Error", "error");
    }
  } catch (error) {
    if (typeof showToast === "function") showToast(error.message || "Error", "error");
  }
}

// ============================================
// ADMIN POS JAVASCRIPT
// ============================================

// POS cart and discount variables
window.posCart = [];
window.posCurrentDiscount = { type: null, amount: 0 };

// POS addToCart function (different signature from shop page)
function addToPosCart(productId, productName, productPrice, stock) {
  const existingItem = window.posCart.find((item) => item.product_id === productId);

  if (existingItem) {
    if (existingItem.quantity < stock) {
      existingItem.quantity++;
    } else {
      if (typeof showToast === "function") showToast("Cannot add more. Stock limit reached.", "error");
      return;
    }
  } else {
    window.posCart.push({
      product_id: productId,
      name: productName,
      price: productPrice,
      quantity: 1,
      stock: stock,
    });
  }

  renderPosCart();
}

async function addToCart(productId, productName, productPrice, stock) {
  if (arguments.length === 4 && productName !== undefined) {
    addToPosCart(productId, productName, productPrice, stock);
    return;
  }
  
  await addToCartShop(productId);
}

function updatePosQuantity(productId, change) {
  const item = window.posCart.find((item) => item.product_id === productId);
  if (item) {
    const newQty = item.quantity + change;
    if (newQty > 0 && newQty <= item.stock) {
      item.quantity = newQty;
      renderPosCart();
    } else if (newQty <= 0) {
      removeFromPosCart(productId);
    } else {
      if (typeof showToast === "function") showToast("Cannot exceed available stock.", "error");
    }
  }
}

function removeFromPosCart(productId) {
  window.posCart = window.posCart.filter((item) => item.product_id !== productId);
  renderPosCart();
}

function clearCart() {
  const cartItemsDiv = document.getElementById("cartItems");
  if (!cartItemsDiv) {
    return;
  }
  
  if (typeof showConfirmModal === "function") {
    showConfirmModal({
      title: "Clear cart",
      body: "Clear all items from cart?",
      onConfirm: function() { window.posCart = []; renderPosCart(); }
    });
  } else if (confirm("Clear all items from cart?")) {
    window.posCart = [];
    renderPosCart();
  }
}

function renderPosCart() {
  const cartItemsDiv = document.getElementById("cartItems");
  const totalAmountSpan = document.getElementById("totalAmount");
  const subtotalAmountSpan = document.getElementById("subtotalAmount");
  const discountRow = document.getElementById("discountRow");
  const discountAmountSpan = document.getElementById("discountAmount");

  if (!cartItemsDiv || !totalAmountSpan || !subtotalAmountSpan) return;

  if (window.posCart.length === 0) {
    cartItemsDiv.innerHTML = '<div class="pos-empty-cart">No items added</div>';
    totalAmountSpan.textContent = "₱0.00";
    subtotalAmountSpan.textContent = "₱0.00";
    if (discountRow) discountRow.style.display = "none";
    window.posCurrentDiscount = { type: null, amount: 0 };
    return;
  }

  let html = "";
  let subtotal = 0;

  window.posCart.forEach((item) => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;

    html += `
                <div class="pos-cart-item">
                    <div class="pos-cart-item-info">
                        <div class="pos-cart-item-name">${item.name}</div>
                        <div class="pos-cart-item-price">₱${item.price.toFixed(
                          2
                        )} each</div>
                    </div>
                    <div class="pos-cart-item-controls">
                        <div class="pos-qty-control">
                            <button class="pos-qty-btn" onclick="updatePosQuantity(${
                              item.product_id
                            }, -1)">-</button>
                            <span class="pos-qty-display">${
                              item.quantity
                            }</span>
                            <button class="pos-qty-btn" onclick="updatePosQuantity(${
                              item.product_id
                            }, 1)">+</button>
                        </div>
                        <div>₱${itemTotal.toFixed(2)}</div>
                        <div class="pos-remove-btn" onclick="removeFromPosCart(${
                          item.product_id
                        })">✕</div>
                    </div>
                </div>
            `;
  });

  cartItemsDiv.innerHTML = html;
  subtotalAmountSpan.textContent = `₱${subtotal.toFixed(2)}`;

  let total = subtotal - window.posCurrentDiscount.amount;
  if (total < 0) total = 0;

  if (window.posCurrentDiscount.amount > 0) {
    if (discountRow) discountRow.style.display = "flex";
    if (discountAmountSpan) discountAmountSpan.textContent = `-₱${window.posCurrentDiscount.amount.toFixed(2)}`;
  } else {
    if (discountRow) discountRow.style.display = "none";
  }

  totalAmountSpan.textContent = `₱${total.toFixed(2)}`;
}

function applyDiscount(type) {
  const subtotal = window.posCart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  let discountAmount = 0;

  if (type === "pwd" || type === "senior") {
    discountAmount = subtotal * 0.2; // 20% discount
  } else if (type === "voucher") {
    discountAmount = 100; // Fixed ₱100 discount
  }

  window.posCurrentDiscount = { type: type, amount: discountAmount };
  renderPosCart();
}

function removeDiscount() {
  window.posCurrentDiscount = { type: null, amount: 0 };
  renderPosCart();
}

async function completeSale() {
  if (window.posCart.length === 0) {
    if (typeof showToast === "function") showToast("Cart is empty!", "error");
    return;
  }

  const subtotal = window.posCart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const total = subtotal - window.posCurrentDiscount.amount;

  try {
    const response = await fetch("/admin/sales/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: window.posCart,
        payment_method: "cash",
        discount_type: window.posCurrentDiscount.type || "none",
      }),
    });

    const data = await response.json();

    if (data.success) {
      const singaporeTime = new Intl.DateTimeFormat("en-SG", {
        dateStyle: "medium",
        timeStyle: "medium",
        timeZone: "Asia/Singapore",
      }).format(new Date());
      if (typeof showToast === "function") showToast("Sale completed successfully. Generating receipt...", "success", true);
      window.open("/admin/receipt/" + data.sale_id, "_blank");
      window.posCart = [];
      window.posCurrentDiscount = { type: null, amount: 0 };
      renderPosCart();
      location.reload(); // Reload to update stock numbers
    } else {
      if (typeof showToast === "function") showToast(data.error || "Error", "error");
    }
  } catch (error) {
    if (typeof showToast === "function") showToast("Error completing sale: " + error.message, "error");
  }
}

