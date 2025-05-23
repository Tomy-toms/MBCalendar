const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/authMiddleware');

const JWT_SECRET = 'mbcalendar_secret'; // 🔐 À placer dans .env pour production

// REGISTER
router.post('/register', async (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ error: 'Champs manquants' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [
      username,
      hashedPassword,
      role
    ]);

    res.status(201).json({ message: 'Utilisateur enregistré' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'Nom d’utilisateur déjà utilisé' });
    } else {
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  console.log(`Tentative de connexion pour l'utilisateur: ${username}`);
  
  const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
  console.log(`Résultat de la requête:`, rows.length > 0 ? 'Utilisateur trouvé' : 'Utilisateur non trouvé');
  
  const user = rows[0];
  if (!user) {
    console.log('Échec: Utilisateur non trouvé');
    return res.status(401).json({ error: 'Utilisateur inconnu' });
  }
  
  const isMatch = await bcrypt.compare(password, user.password);
  console.log(`Comparaison du mot de passe: ${isMatch ? 'Succès' : 'Échec'}`);
  
  if (!isMatch) {
    console.log('Échec: Mot de passe incorrect');
    return res.status(401).json({ error: 'Mot de passe incorrect' });
  }

  const token = jwt.sign({
    userId: user.id,
    username: user.username,
    firstname: user.firstname,
    lastname: user.lastname,
    role: user.role,
    mustChangePassword: user.must_change_password
  }, JWT_SECRET, { expiresIn: '8h' });

  res.json({ token });
});

// ✅ POST /auth/change-password — pour que l’utilisateur change son mot de passe temporaire
router.post('/change-password', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 4) {
    return res.status(400).json({ error: 'Mot de passe invalide ou trop court' });
  }

  try {
    const hashed = await bcrypt.hash(newPassword, 10);
    await db.query(
      'UPDATE users SET password = ?, must_change_password = false WHERE id = ?',
      [hashed, userId]
    );
    res.json({ message: 'Mot de passe mis à jour avec succès' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur lors de la mise à jour' });
  }
});


module.exports = router;
