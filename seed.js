const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

const productsJsPath = path.join(__dirname, 'products.js');
let productsData = fs.readFileSync(productsJsPath, 'utf8');

const context = {};
const script = `(function() { ${productsData}; return typeof products !== 'undefined' ? products : window.products; })()`;
const products = eval(script) || [];

try {
  db.serialize(() => {
    db.run("DROP TABLE IF EXISTS products");
    db.run(`CREATE TABLE products (
      id TEXT PRIMARY KEY, 
      title TEXT, 
      category TEXT, 
      price REAL, 
      rating REAL,
      reviews INTEGER,
      image TEXT, 
      color TEXT,
      fabric TEXT,
      description TEXT, 
      stitchingOptions TEXT,
      inStock INTEGER,
      tags TEXT,
      badge TEXT, 
      badgeColor TEXT
    )`);

    const stmt = db.prepare(`INSERT INTO products (id, title, category, price, rating, reviews, image, color, fabric, description, stitchingOptions, inStock, tags, badge, badgeColor) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    products.forEach(p => {
      stmt.run(
        p.id, 
        p.name, 
        p.category, 
        p.price, 
        p.rating || 5.0,
        p.reviews || 0,
        p.image, 
        p.color || '',
        p.fabric || '',
        p.description || '', 
        JSON.stringify(p.stitchingOptions || []),
        p.inStock ? 1 : 0,
        JSON.stringify(p.tags || []),
        p.badge || null, 
        p.badgeColor || null
      );
    });

    stmt.finalize();
    console.log(`Successfully seeded ${products.length} products into the database with full attributes!`);
  });

} catch (err) {
  console.error("Failed to parse products.js or seed DB:", err.message);
} finally {
  db.close();
}
