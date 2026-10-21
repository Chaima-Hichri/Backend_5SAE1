const express = require('express');
const mysql = require('mysql2');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = 3306;

app.use(express.json());

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'movies_db',
});

db.connect((err) => {
  if (err) {
    console.error('Erreur de connexion à MySQL:', err.message);
    return;
  }
  console.log('✅ Connecté à la base de données MySQL.');
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });


app.get('/movies', (req, res) => {
  const query = 'SELECT * FROM movies';
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post('/movies', upload.single('image'), (req, res) => {
  const { title, description, price } = req.body;
  const image = req.file ? `/uploads/${req.file.filename}` : null;

  if (!title || !description || !price || !image) {
    return res.status(400).json({ error: "Le titre, la description, le prix et l'image sont requis" });
  }

  const query = 'INSERT INTO movies (title, description, price, image) VALUES (?, ?, ?, ?)';
  db.query(query, [title, description, price, image], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: result.insertId, title, description, price, image });
  });
});

app.use('/uploads', express.static('uploads'));


app.post('/signup', (req, res) => {
  const { username, email, password } = req.body;

  db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
    if (err) return res.status(500).json({ message: err.message });

    if (results.length > 0) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const query = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
    db.query(query, [username, email, password], (err, result) => {
      if (err) return res.status(500).json({ message: err.message });
      res.status(201).json({ message: 'User created successfully', userId: result.insertId });
    });
  });
});

app.post('/signin', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: "Email and password are required" });

  const query = 'SELECT * FROM users WHERE email = ?';
  db.query(query, [email], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: "User not found" });

    const user = results[0];
    if (user.password === password) {
      res.status(200).json({ message: "Login successful", userId: user.id,username:user.username });
    } else {
      res.status(401).json({ message: "Invalid credentials" });
    }
  });
});

app.delete('/movies/:id', (req, res) => {
  const movieId = req.params.id;

  const query = 'DELETE FROM movies WHERE id = ?';
  db.query(query, [movieId], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Movie not found' });
    }

    res.status(200).json({ message: 'Movie deleted successfully' });
  });
});


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
