const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'ecommerce.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    createTables();
  }
});

function createTables() {
  db.serialize(() => {
    // Users Table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
      )
    `);

    // Products Table
    db.run(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        price REAL NOT NULL,
        original_price REAL NOT NULL,
        image_url TEXT NOT NULL,
        description TEXT,
        code TEXT UNIQUE NOT NULL
      )
    `, () => {
      seedProducts();
    });

    // Cart Table
    db.run(`
      CREATE TABLE IF NOT EXISTS cart (
        user_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        PRIMARY KEY (user_id, product_id),
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
      )
    `);

    // Reviews Table
    db.run(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        user_name TEXT NOT NULL,
        rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
        comment TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
      )
    `);
  });
}

function seedProducts() {
  const initialProducts = [
    {
      name: "Cotten Regular Fit Hoddie : UNISEX",
      category: "hoodies",
      price: 699,
      original_price: 799,
      image_url: "img/610wKosBKsL._AC_UL640_FMwebp_QL65_.jpg",
      description: "Cotton Regular Fit Hoodie: UNISEX. Cozy and stylish.",
      code: "hoddie"
    },
    {
      name: "Men Straight Fit Jeans",
      category: "jeans",
      price: 799,
      original_price: 999,
      image_url: "img/compress_men-straight-fit-jeans-0923-361vtstdnm-10-light-blue__1.jpg",
      description: "Men Straight Fit Jeans. Classic fit with maximum comfort.",
      code: "jeans"
    },
    {
      name: "Men Cotten Cargo Pant",
      category: "cargoes",
      price: 599,
      original_price: 799,
      image_url: "img/cargo.webp",
      description: "Men Cotton Cargo Pant. Durable with multiple utility pockets.",
      code: "cargo"
    },
    {
      name: "Casual Cotten Shirt",
      category: "shirts",
      price: 299,
      original_price: 499,
      image_url: "img/shirt.jpg",
      description: "Casual Cotton Shirt. Standard regular fit, perfect for smart casual look.",
      code: "shirt"
    },
    {
      name: "Star Wars: Darth Vader Men Low Top Sneakers",
      category: "shoes",
      price: 1999,
      original_price: 2499,
      image_url: "img/1745836876_7154809.avif",
      description: "Star Wars: Darth Vader Men Low Top Sneakers. Premium quality sneakers.",
      code: "shoes"
    }
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO products (name, category, price, original_price, image_url, description, code)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  initialProducts.forEach((p) => {
    stmt.run(p.name, p.category, p.price, p.original_price, p.image_url, p.description, p.code);
  });

  stmt.finalize();
}

module.exports = db;
