const API_URL = 'http://localhost:5050/api';

// Helper function to get authorization headers
function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

// Check logged in status
function isLoggedIn() {
  return !!localStorage.getItem('token');
}

// -------------------------------------------------------------
// Header & Login Button Update
// -------------------------------------------------------------
function updateHeaderAuthUI() {
  const farRightSection = document.querySelector('.far-right-section');
  if (!farRightSection) return;

  // Remove existing login button or profile container
  const oldLoginBtn = farRightSection.querySelector('.btn-login');
  const oldProfileContainer = farRightSection.querySelector('.user-profile-container');
  if (oldLoginBtn) oldLoginBtn.remove();
  if (oldProfileContainer) oldProfileContainer.remove();

  if (isLoggedIn()) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const firstLetter = (user.name || 'U').charAt(0);

    const profileContainer = document.createElement('div');
    profileContainer.className = 'user-profile-container';
    profileContainer.innerHTML = `
      <div class="user-profile-avatar" id="userAvatar">${firstLetter}</div>
      <div class="user-profile-dropdown" id="userDropdown">
        <div class="user-profile-dropdown-item user-profile-dropdown-name">Hi, ${user.name || 'User'}</div>
        <div class="user-profile-dropdown-item" id="logoutBtn">Logout</div>
      </div>
    `;

    farRightSection.appendChild(profileContainer);

    const avatar = profileContainer.querySelector('#userAvatar');
    const dropdown = profileContainer.querySelector('#userDropdown');
    const logoutBtn = profileContainer.querySelector('#logoutBtn');

    avatar.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('show');
    });

    // Close dropdown on click outside
    document.addEventListener('click', () => {
      dropdown.classList.remove('show');
    });

    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      alert('Logged out successfully!');
      window.location.reload();
    });
  } else {
    const loginBtn = document.createElement('button');
    loginBtn.className = 'btn btn-login';
    loginBtn.innerHTML = `
      <img src="img/pngegg.png" alt="" class="icon-image">
      Login
    `;
    loginBtn.onclick = (e) => {
      e.preventDefault();
      window.location.href = 'signin.html';
    };
    farRightSection.appendChild(loginBtn);
  }
}

// -------------------------------------------------------------
// Cart Logic
// -------------------------------------------------------------
async function updateCartCount() {
  const cartQnt = document.querySelector(".cart-count");
  if (!cartQnt) return;

  if (isLoggedIn()) {
    try {
      const res = await fetch(`${API_URL}/cart`, { headers: getAuthHeaders() });
      if (res.ok) {
        const cartItems = await res.json();
        const totalQty = cartItems.reduce((sum, item) => sum + item.quantity, 0);
        cartQnt.innerText = totalQty;
        return;
      }
    } catch (err) {
      console.error('Error fetching cart count:', err);
    }
  }

  // Fallback to local storage if not logged in
  const localCart = JSON.parse(localStorage.getItem('cart') || '[]');
  const localTotalQty = localCart.reduce((sum, item) => sum + item.quantity, 0);
  cartQnt.innerText = localTotalQty;
}

// Attach click event to Cart Icon
const cartIcon = document.querySelector('.shopping-cart-icon') || document.querySelector('.btn-cart');
if (cartIcon) {
  cartIcon.style.cursor = 'pointer';
  cartIcon.addEventListener('click', () => {
    window.location.href = 'cart.html';
  });
}

// -------------------------------------------------------------
// Search Functionality
// -------------------------------------------------------------
const searchInput = document.querySelector('.search');
const searchBtn = document.querySelector('.btn-search');

if (searchInput) {
  const handleSearch = () => {
    const query = searchInput.value.toLowerCase().trim();
    const productContainers = document.querySelectorAll('.flex-container a, .main-item-section');

    productContainers.forEach(container => {
      const text = container.textContent.toLowerCase();
      if (text.includes(query)) {
        container.style.display = '';
      } else {
        container.style.display = 'none';
      }
    });
  };

  if (searchBtn) {
    searchBtn.addEventListener('click', handleSearch);
  }
  searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') handleSearch();
  });
}

// -------------------------------------------------------------
// Auth Page (signin.html) Logic
// -------------------------------------------------------------
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

if (tabLogin && tabRegister && loginForm && registerForm) {
  tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    loginForm.classList.add('active');
    registerForm.classList.remove('active');
  });

  tabRegister.addEventListener('click', () => {
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    registerForm.classList.add('active');
    loginForm.classList.remove('active');
  });

  // Login Submit
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('login-error');

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        // Sync local storage cart to server if any
        await syncLocalCartToServer();
        alert('Welcome back!');
        window.location.href = 'index.html';
      } else {
        errorDiv.innerText = data.message || 'Login failed';
        errorDiv.style.display = 'block';
      }
    } catch (err) {
      errorDiv.innerText = 'Network error. Please try again.';
      errorDiv.style.display = 'block';
    }
  });

  // Register Submit
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const errorDiv = document.getElementById('register-error');

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        alert('Account created successfully!');
        window.location.href = 'index.html';
      } else {
        errorDiv.innerText = data.message || 'Registration failed';
        errorDiv.style.display = 'block';
      }
    } catch (err) {
      errorDiv.innerText = 'Network error. Please try again.';
      errorDiv.style.display = 'block';
    }
  });
}

async function syncLocalCartToServer() {
  const localCart = JSON.parse(localStorage.getItem('cart') || '[]');
  if (localCart.length === 0) return;

  for (const item of localCart) {
    try {
      await fetch(`${API_URL}/cart`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ productId: item.product_id, quantity: item.quantity })
      });
    } catch (e) {
      console.error(e);
    }
  }
  localStorage.removeItem('cart');
}

// -------------------------------------------------------------
// Product Detail Page Logic (load dynamic details, add to cart, review)
// -------------------------------------------------------------
async function initProductPage() {
  // Determine product code based on file name (e.g., shirt.html -> shirt)
  const pathParts = window.location.pathname.split('/');
  const filename = pathParts[pathParts.length - 1];
  const productCode = filename.replace('.html', '');

  // Verify this matches a real product page
  const validProducts = ['shirt', 'jeans', 'cargo', 'hoddie', 'shoes'];
  if (!validProducts.includes(productCode)) return;

  // Make backend API request to fetch product details
  let product;
  try {
    const res = await fetch(`${API_URL}/products/${productCode}`);
    if (res.ok) {
      product = await res.json();
    }
  } catch (err) {
    console.error('Failed to connect to backend product API:', err);
  }

  if (!product) return;

  // Add to cart click handler
  const cartBtn = document.querySelector("#Cartbtn");
  if (cartBtn) {
    cartBtn.style.cursor = 'pointer';
    cartBtn.onclick = async () => {
      if (isLoggedIn()) {
        try {
          // Get current quantity in backend cart
          const cartRes = await fetch(`${API_URL}/cart`, { headers: getAuthHeaders() });
          const cartItems = await cartRes.json();
          const existingItem = cartItems.find(item => item.product_id === product.id);
          const newQty = existingItem ? existingItem.quantity + 1 : 1;

          const updateRes = await fetch(`${API_URL}/cart`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ productId: product.id, quantity: newQty })
          });
          if (updateRes.ok) {
            alert('Added to cart!');
            updateCartCount();
          }
        } catch (e) {
          alert('Could not add to cart');
        }
      } else {
        // Local storage cart
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        const existing = cart.find(item => item.product_id === product.id);
        if (existing) {
          existing.quantity += 1;
        } else {
          cart.push({ product_id: product.id, quantity: 1 });
        }
        localStorage.setItem('cart', JSON.stringify(cart));
        alert('Added to cart!');
        updateCartCount();
      }
    };
  }

  // Load reviews
  const reviewContainer = document.querySelector('.review-section');
  if (reviewContainer) {
    // Add write review UI
    const writeReviewHTML = `
      <div style="background: #fff; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
        <h3 style="margin-bottom: 15px;">Write a Customer Review</h3>
        <form id="review-form">
          <div style="margin-bottom: 10px;">
            <label style="display:block; margin-bottom: 5px;">Your Name</label>
            <input type="text" id="rev-name" required style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;" value="${JSON.parse(localStorage.getItem('user') || '{}').name || ''}">
          </div>
          <div style="margin-bottom: 10px;">
            <label style="display:block; margin-bottom: 5px;">Rating (1-5)</label>
            <select id="rev-rating" required style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;">
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
          </div>
          <div style="margin-bottom: 15px;">
            <label style="display:block; margin-bottom: 5px;">Comment</label>
            <textarea id="rev-comment" required style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px; height:80px;"></textarea>
          </div>
          <button type="submit" class="btn" style="background:#000; color:#fff; padding:10px 20px; border:none; border-radius:4px; cursor:pointer;">Submit Review</button>
        </form>
      </div>
      <div id="reviews-list-container"></div>
    `;

    reviewContainer.innerHTML = writeReviewHTML;

    const renderReviews = async () => {
      const listContainer = document.getElementById('reviews-list-container');
      try {
        const res = await fetch(`${API_URL}/products/${product.id}/reviews`);
        if (res.ok) {
          const reviews = await res.json();
          if (reviews.length === 0) {
            listContainer.innerHTML = '<p class="review-content">Not rated yet! Be the first to review.</p>';
          } else {
            listContainer.innerHTML = reviews.map(r => `
              <div class="review-container" style="margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                <p><strong>${r.user_name}</strong> - <span style="color:#f39c12;">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</span></p>
                <p class="review-content" style="margin-top: 5px;">${r.comment}</p>
                <span style="font-size: 0.8rem; color:#888;">${new Date(r.created_at).toLocaleDateString()}</span>
              </div>
            `).join('');
          }
        }
      } catch (err) {
        listContainer.innerHTML = '<p class="review-content">Unable to load reviews.</p>';
      }
    };

    await renderReviews();

    // Review submit
    const reviewForm = document.getElementById('review-form');
    reviewForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user_name = document.getElementById('rev-name').value;
      const rating = parseInt(document.getElementById('rev-rating').value);
      const comment = document.getElementById('rev-comment').value;

      try {
        const res = await fetch(`${API_URL}/products/${product.id}/reviews`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_name, rating, comment })
        });
        if (res.ok) {
          alert('Review submitted successfully!');
          document.getElementById('rev-comment').value = '';
          await renderReviews();
        }
      } catch (err) {
        alert('Failed to submit review');
      }
    });
  }
}

// -------------------------------------------------------------
// Cart Page Logic
// -------------------------------------------------------------
async function initCartPage() {
  const container = document.getElementById('cart-items-container');
  if (!container) return;

  const renderCart = async () => {
    let items = [];
    if (isLoggedIn()) {
      try {
        const res = await fetch(`${API_URL}/cart`, { headers: getAuthHeaders() });
        if (res.ok) {
          items = await res.json();
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      // Offline / unregistered cart loader
      const localCart = JSON.parse(localStorage.getItem('cart') || '[]');
      if (localCart.length > 0) {
        try {
          const res = await fetch(`${API_URL}/products`);
          if (res.ok) {
            const allProducts = await res.json();
            items = localCart.map(item => {
              const prod = allProducts.find(p => p.id === item.product_id);
              return prod ? { ...prod, quantity: item.quantity, product_id: item.product_id } : null;
            }).filter(Boolean);
          }
        } catch (e) {
          console.error(e);
        }
      }
    }

    if (items.length === 0) {
      container.innerHTML = '<div class="empty-cart-message">Your shopping cart is empty.</div>';
      document.getElementById('summary-subtotal').innerText = '₹0';
      document.getElementById('summary-total').innerText = '₹0';
      return;
    }

    container.innerHTML = items.map(item => `
      <div class="cart-item">
        <img src="${item.image_url}" alt="${item.name}" class="cart-item-img">
        <div class="cart-item-details">
          <div class="cart-item-name">${item.name}</div>
          <div>
            <span class="cart-item-original-price">₹${item.original_price}</span>
            <span class="cart-item-price">₹${item.price}</span>
          </div>
          <div class="cart-item-qty">
            <span>Qty:</span>
            <button class="qty-btn btn-minus" data-id="${item.product_id}">-</button>
            <input type="text" class="qty-input" value="${item.quantity}" readonly>
            <button class="qty-btn btn-plus" data-id="${item.product_id}">+</button>
          </div>
          <button class="remove-btn" data-id="${item.product_id}">Remove</button>
        </div>
      </div>
    `).join('');

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    document.getElementById('summary-subtotal').innerText = `₹${subtotal}`;
    document.getElementById('summary-total').innerText = `₹${subtotal}`;

    // Add event listeners to buttons
    document.querySelectorAll('.btn-minus').forEach(btn => {
      btn.onclick = async () => {
        const id = parseInt(btn.dataset.id);
        const item = items.find(i => i.product_id === id);
        if (item && item.quantity > 1) {
          await updateQuantity(id, item.quantity - 1);
        }
      };
    });

    document.querySelectorAll('.btn-plus').forEach(btn => {
      btn.onclick = async () => {
        const id = parseInt(btn.dataset.id);
        const item = items.find(i => i.product_id === id);
        if (item) {
          await updateQuantity(id, item.quantity + 1);
        }
      };
    });

    document.querySelectorAll('.remove-btn').forEach(btn => {
      btn.onclick = async () => {
        const id = parseInt(btn.dataset.id);
        await removeItem(id);
      };
    });
  };

  const updateQuantity = async (productId, qty) => {
    if (isLoggedIn()) {
      try {
        await fetch(`${API_URL}/cart`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ productId, quantity: qty })
        });
      } catch (e) {
        console.error(e);
      }
    } else {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      const item = cart.find(i => i.product_id === productId);
      if (item) item.quantity = qty;
      localStorage.setItem('cart', JSON.stringify(cart));
    }
    await renderCart();
    updateCartCount();
  };

  const removeItem = async (productId) => {
    if (isLoggedIn()) {
      try {
        await fetch(`${API_URL}/cart/${productId}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
      } catch (e) {
        console.error(e);
      }
    } else {
      let cart = JSON.parse(localStorage.getItem('cart') || '[]');
      cart = cart.filter(i => i.product_id !== productId);
      localStorage.setItem('cart', JSON.stringify(cart));
    }
    await renderCart();
    updateCartCount();
  };

  await renderCart();

  // Checkout button handler
  const checkoutBtn = document.getElementById('btn-checkout');
  if (checkoutBtn) {
    checkoutBtn.onclick = async () => {
      if (!isLoggedIn()) {
        alert('Please login to place an order.');
        window.location.href = 'signin.html';
        return;
      }

      try {
        const res = await fetch(`${API_URL}/cart/checkout`, {
          method: 'POST',
          headers: getAuthHeaders()
        });
        if (res.ok) {
          alert('Order placed successfully! Thank you for shopping with us.');
          await renderCart();
          updateCartCount();
        }
      } catch (e) {
        alert('Checkout failed.');
      }
    };
  }
}

// -------------------------------------------------------------
// Theme / Dark Mode Handler
// -------------------------------------------------------------
function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.body.classList.add('dark-mode');
  }

  const farRightSection = document.querySelector('.far-right-section');
  if (farRightSection && !farRightSection.querySelector('.theme-toggle-btn')) {
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'theme-toggle-btn';
    toggleBtn.innerHTML = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
    toggleBtn.title = 'Toggle Dark/Light Theme';
    
    toggleBtn.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      const isDark = document.body.classList.contains('dark-mode');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      toggleBtn.innerHTML = isDark ? '☀️' : '🌙';
    });

    farRightSection.insertBefore(toggleBtn, farRightSection.firstChild);
  }
}

// -------------------------------------------------------------
// App Initialization
// -------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  updateHeaderAuthUI();
  updateCartCount();
  initProductPage();
  initCartPage();
});
