const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

// Initialize SQLite Database
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    
    // Create Tables
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE,
      password TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      title TEXT,
      category TEXT,
      price REAL,
      image TEXT,
      description TEXT,
      reviews INTEGER,
      badge TEXT,
      badgeColor TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      order_number TEXT,
      total_payable REAL,
      items TEXT,
      status TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // We will let the frontend continue using products.js for now,
    // but the backend is ready to handle checkout securely.
  }
});

// API Endpoints

// 1. Newsletter Subscriptions
const SUBSCRIBERS_FILE = path.join(__dirname, 'subscribers.json');
if (!fs.existsSync(SUBSCRIBERS_FILE)) {
  fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify([]));
}
app.post('/api/subscribe', (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'Invalid email address' });

  try {
    const data = fs.readFileSync(SUBSCRIBERS_FILE, 'utf8');
    const subscribers = JSON.parse(data);
    if (subscribers.includes(email)) return res.status(400).json({ error: 'Email already subscribed' });

    subscribers.push(email);
    fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(subscribers, null, 2));
    res.status(200).json({ message: 'Successfully subscribed to the newsletter!' });
  } catch (err) {
    res.status(500).json({ error: 'Server error saving subscription' });
  }
});

// 2. Auth: Register
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  const id = uuidv4();
  
  db.run(`INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)`, [id, name, email, password], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(400).json({ error: 'Email already exists' });
      }
      return res.status(500).json({ error: 'Registration failed' });
    }
    res.status(201).json({ id, name, email });
  });
});

// 3. Auth: Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  db.get(`SELECT id, name, email FROM users WHERE email = ? AND password = ?`, [email, password], (err, row) => {
    if (err) return res.status(500).json({ error: 'Login error' });
    if (!row) return res.status(401).json({ error: 'Invalid email or password' });
    
    res.status(200).json(row);
  });
});

// 3.5. Products Catalog
app.get('/api/products', (req, res) => {
  const { category, minPrice, maxPrice } = req.query;
  
  let query = `SELECT * FROM products WHERE 1=1`;
  const params = [];

  if (category) {
    query += ` AND category = ?`;
    params.push(category);
  }
  
  if (minPrice) {
    query += ` AND price >= ?`;
    params.push(minPrice);
  }

  if (maxPrice) {
    query += ` AND price <= ?`;
    params.push(maxPrice);
  }

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch products' });
    
    // Convert back to format frontend expects
    const mappedRows = rows.map(r => ({
      id: r.id,
      name: r.title,
      category: r.category,
      price: r.price,
      rating: r.rating,
      reviews: r.reviews,
      image: r.image,
      color: r.color,
      fabric: r.fabric,
      description: r.description,
      stitchingOptions: JSON.parse(r.stitchingOptions || "[]"),
      inStock: r.inStock === 1,
      tags: JSON.parse(r.tags || "[]"),
      badge: r.badge,
      badgeColor: r.badgeColor
    }));
    
    res.status(200).json(mappedRows);
  });
});

// 4. Checkout
app.post('/api/checkout', (req, res) => {
  const { user_id, items, total_payable } = req.body;
  if (!items || items.length === 0) return res.status(400).json({ error: 'Cart is empty' });

  const order_id = uuidv4();
  const order_number = 'ORD-' + Math.floor(Math.random() * 1000000);
  const itemsJson = JSON.stringify(items);
  const uId = user_id || 'guest';

  db.run(`INSERT INTO orders (id, user_id, order_number, total_payable, items, status) VALUES (?, ?, ?, ?, ?, ?)`, 
    [order_id, uId, order_number, total_payable, itemsJson, 'Processing'], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to create order' });
    
    res.status(201).json({ 
      message: 'Order placed successfully!', 
      order_number, 
      total_payable 
    });
  });
});

// 5. User Orders
app.get('/api/orders/:user_id', (req, res) => {
  const { user_id } = req.params;
  
  db.all(`SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC`, [user_id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch orders' });
    res.status(200).json(rows);
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`E-Commerce Backend server running at http://localhost:${PORT}`);
});
