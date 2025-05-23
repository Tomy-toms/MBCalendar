const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

// Connexion à ta base MySQL locale (via XAMPP)
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',         // mot de passe MySQL (souvent vide sur XAMPP)
  database: 'mbcalendar', // assure-toi de l’avoir créé
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Création des tables si elles n'existent pas
async function initDb() {
  const conn = await pool.getConnection();

  await conn.query(`CREATE TABLE IF NOT EXISTS livreurs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name TEXT,
    phone TEXT
  )`);

  await conn.query(`CREATE TABLE IF NOT EXISTS poseurs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name TEXT,
    phone TEXT
  )`);

  await conn.query(`CREATE TABLE IF NOT EXISTS chantiers (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name TEXT,
    address TEXT
  )`);

  await conn.query(`CREATE TABLE IF NOT EXISTS tasks (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    type TEXT,
    artisan_id BIGINT,
    day INT,
    week INT,
    year INT,
    description TEXT,
    chantier_id BIGINT,
    notes TEXT,
    completed BOOLEAN
  )`);

  const bcrypt = require('bcrypt');

  await conn.query(`CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(255) UNIQUE,
    password VARCHAR(255),
    role VARCHAR(50)
  )`);

  // Créer un utilisateur "developpeur" si aucun n'existe
  const [existingUsers] = await conn.query('SELECT COUNT(*) AS count FROM users');

  if (existingUsers[0].count === 0) {
    const hashedPassword = await bcrypt.hash('dev1234', 10);
    await conn.query(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      ['developpeur', hashedPassword, 'developpeur']
    );
    console.log('✅ Utilisateur "developpeur" créé (mot de passe : dev1234)');
  }

  conn.release();
  console.log('✅ Base de données MySQL initialisée');
}

initDb();

module.exports = pool;
