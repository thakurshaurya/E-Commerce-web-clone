const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 5050;
const JWT_SECRET = 'ecommerce_secret_key_12345';

app.use(cors());
app.use(express.json());

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// --- Auth Endpoints ---

// Register
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  db.run(
    'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
    [name, email, hashedPassword],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ message: 'Email already registered' });
        }
        return res.status(500).json({ message: err.message });
      }
      const token = jwt.sign({ id: this.lastID, name, email }, JWT_SECRET, { expiresIn: '7d' });
      res.status(201).json({ token, user: { id: this.lastID, name, email } });
    }
  );
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!user) return res.status(400).json({ message: 'Invalid email or password' });

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) return res.status(400).json({ message: 'Invalid email or password' });

    const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  });
});

// Get User Profile
app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// --- Product Endpoints ---

// Get all products
app.get('/api/products', (req, res) => {
  const { search } = req.query;
  if (search) {
    db.all(
      'SELECT * FROM products WHERE name LIKE ? OR category LIKE ? OR description LIKE ?',
      [`%${search}%`, `%${search}%`, `%${search}%`],
      (err, rows) => {
        if (err) return res.status(500).json({ message: err.message });
        res.json(rows);
      }
    );
  } else {
    db.all('SELECT * FROM products', [], (err, rows) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json(rows);
    });
  }
});

// Get product details by code (e.g. "shirt", "jeans") or ID
app.get('/api/products/:identifier', (req, res) => {
  const ident = req.params.identifier;
  const isId = /^\d+$/.test(ident);

  const query = isId
    ? 'SELECT * FROM products WHERE id = ?'
    : 'SELECT * FROM products WHERE code = ?';

  db.get(query, [ident], (err, product) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  });
});

// --- Review Endpoints ---

// Get reviews for a product
app.get('/api/products/:productId/reviews', (req, res) => {
  const { productId } = req.params;
  db.all(
    'SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC',
    [productId],
    (err, rows) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json(rows);
    }
  );
});

// Post a review
app.post('/api/products/:productId/reviews', (req, res) => {
  const { productId } = req.params;
  const { user_name, rating, comment } = req.body;

  if (!user_name || !rating || !comment) {
    return res.status(400).json({ message: 'All review fields are required' });
  }

  db.run(
    'INSERT INTO reviews (product_id, user_name, rating, comment) VALUES (?, ?, ?, ?)',
    [productId, user_name, rating, comment],
    function (err) {
      if (err) return res.status(500).json({ message: err.message });
      db.get('SELECT * FROM reviews WHERE id = ?', [this.lastID], (err, newReview) => {
        if (err) return res.status(500).json({ message: err.message });
        res.status(201).json(newReview);
      });
    }
  );
});

// --- Cart Endpoints (Authenticated) ---

// Get cart items
app.get('/api/cart', authenticateToken, (req, res) => {
  db.all(
    `SELECT c.quantity, p.id as product_id, p.name, p.price, p.original_price, p.image_url, p.code 
     FROM cart c 
     JOIN products p ON c.product_id = p.id 
     WHERE c.user_id = ?`,
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json(rows);
    }
  );
});

// Add or update cart item
app.post('/api/cart', authenticateToken, (req, res) => {
  const { productId, quantity } = req.body;
  if (!productId || quantity === undefined) {
    return res.status(400).json({ message: 'productId and quantity are required' });
  }

  db.run(
    `INSERT INTO cart (user_id, product_id, quantity) 
     VALUES (?, ?, ?) 
     ON CONFLICT(user_id, product_id) 
     DO UPDATE SET quantity = ?`,
    [req.user.id, productId, quantity, quantity],
    (err) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json({ message: 'Cart updated successfully' });
    }
  );
});

// Delete cart item
app.delete('/api/cart/:productId', authenticateToken, (req, res) => {
  const { productId } = req.params;
  db.run(
    'DELETE FROM cart WHERE user_id = ? AND product_id = ?',
    [req.user.id, productId],
    (err) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json({ message: 'Item removed from cart' });
    }
  );
});

// Checkout
app.post('/api/cart/checkout', authenticateToken, (req, res) => {
  db.run('DELETE FROM cart WHERE user_id = ?', [req.user.id], (err) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ message: 'Checkout successful' });
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
