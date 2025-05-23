const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const { authenticateToken } = require('../middleware/authMiddleware');

// 📌 Utilisé pour limiter à 2 admins max
const MAX_ADMINS = 2;

// 🔐 Middleware pour sécuriser toutes les routes
router.use(authenticateToken);

// ✅ GET /users — Liste filtrée
router.get('/', async (req, res) => {
  try {
    const role = req.user.role;

    let query = 'SELECT id, firstname, lastname, username, role FROM users';
    const [users] = await db.query(query);

    // Supprimer le développeur si on est admin ET ne pas afficher soi-même
    const visibleUsers = users.filter(u => {
      if (u.id === req.user.userId) return false; // Masquer soi-même
      if (role === 'admin' && u.role === 'developpeur') return false;
      return true;
    });

    res.json(visibleUsers);
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ POST /users — Création d'un utilisateur
router.post('/', async (req, res) => {
  try {
    const { firstname, lastname, username, password, role } = req.body;
    const creator = req.user;

    // Validation
    if (!firstname || !lastname || !username || !password || !role) {
      return res.status(400).json({ error: 'Champs requis manquants' });
    }

    // Sécurité des rôles
    if (creator.role === 'admin' && (role === 'admin' || role === 'developpeur')) {
      return res.status(403).json({ error: 'Un admin ne peut pas créer ce type d\'utilisateur' });
    }

    if (creator.role !== 'developpeur' && role === 'developpeur') {
      return res.status(403).json({ error: 'Seul un développeur peut créer un développeur' });
    }

    // Limiter le nombre d'admins
    if (role === 'admin') {
      const [admins] = await db.query('SELECT COUNT(*) as count FROM users WHERE role = ?', ['admin']);
      if (admins[0].count >= MAX_ADMINS) {
        return res.status(400).json({ error: 'Limite de 2 administrateurs atteinte' });
      }
    }

    // Vérifier l'unicité du nom d'utilisateur
    const [existing] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Nom d\'utilisateur déjà pris' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (firstname, lastname, username, password, role, must_change_password) VALUES (?, ?, ?, ?, ?, ?)',
      [firstname, lastname, username, hashedPassword, role, true]
    );

    console.log('Utilisateur créé avec l\'ID:', result.insertId);
    res.status(201).json({ 
      message: 'Utilisateur créé avec succès',
      userId: result.insertId 
    });
  } catch (error) {
    console.error('Erreur lors de la création d\'utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la création' });
  }
});

// ✅ PUT /users/:id — Modifier un utilisateur
router.put('/:id', async (req, res) => {
  try {
    const currentUser = req.user;
    const targetId = parseInt(req.params.id);
    const { firstname, lastname, username, password, role } = req.body;

    if (!firstname || !lastname || !username || !role) {
      return res.status(400).json({ error: 'Champs requis manquants' });
    }

    if (isNaN(targetId)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    // On ne peut pas modifier soi-même
    if (currentUser.userId === targetId) {
      return res.status(403).json({ error: 'Vous ne pouvez pas modifier vos propres informations' });
    }

    // Récupération de l'utilisateur ciblé
    const [targetUsers] = await db.query('SELECT * FROM users WHERE id = ?', [targetId]);
    if (targetUsers.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const targetUser = targetUsers[0];

    // Sécurité de rôle
    if (currentUser.role === 'admin' && (targetUser.role === 'admin' || targetUser.role === 'developpeur')) {
      return res.status(403).json({ error: 'Un admin ne peut pas modifier un admin ou un développeur' });
    }

    if (targetUser.role === 'developpeur' && currentUser.role !== 'developpeur') {
      return res.status(403).json({ error: 'Seul un développeur peut modifier un autre développeur' });
    }

    // Vérifier si le nouveau nom d'utilisateur est déjà pris (sauf si c'est le sien)
    const [existingUsers] = await db.query('SELECT * FROM users WHERE username = ? AND id != ?', [username, targetId]);
    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'Nom d\'utilisateur déjà utilisé par un autre utilisateur' });
    }

    // Préparation des champs
    let query = 'UPDATE users SET firstname = ?, lastname = ?, username = ?, role = ?';
    const params = [firstname, lastname, username, role];

    if (password && password.length > 0) {
      const hashed = await bcrypt.hash(password, 10);
      query += ', password = ?';
      params.push(hashed);
    }

    query += ' WHERE id = ?';
    params.push(targetId);

    const [result] = await db.query(query, params);
    console.log('Utilisateur modifié, lignes affectées:', result.affectedRows);
    
    res.json({ 
      message: 'Utilisateur mis à jour avec succès',
      affectedRows: result.affectedRows 
    });
  } catch (error) {
    console.error('Erreur lors de la modification d\'utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la modification' });
  }
});

// ✅ GET /users/:id — Obtenir les infos d'un utilisateur (pour modification uniquement)
router.get('/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const currentUser = req.user;

    if (isNaN(userId)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    // On ne peut pas consulter ses propres données via cette route
    if (userId === currentUser.userId) {
      return res.status(403).json({ error: 'Vous ne pouvez pas consulter vos propres informations via cette route' });
    }

    const [users] = await db.query('SELECT id, firstname, lastname, username, role FROM users WHERE id = ?', [userId]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const user = users[0];

    // Vérifications de sécurité pour l'accès
    if (user.role === 'developpeur' && currentUser.role !== 'developpeur') {
      return res.status(403).json({ error: 'Accès refusé à cet utilisateur' });
    }

    if (currentUser.role === 'admin' && (user.role === 'admin' || user.role === 'developpeur')) {
      return res.status(403).json({ error: 'Un admin ne peut pas accéder à cet utilisateur' });
    }

    res.json(user);
  } catch (error) {
    console.error('Erreur lors de la récupération d\'utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ DELETE /users/:id — Suppression d'un utilisateur
router.delete('/:id', async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    const currentUser = req.user;

    if (isNaN(targetId)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    // On ne peut pas supprimer soi-même
    if (currentUser.userId === targetId) {
      return res.status(403).json({ error: 'Vous ne pouvez pas vous supprimer vous-même' });
    }

    // Récupérer le rôle de l'utilisateur à supprimer
    const [users] = await db.query('SELECT * FROM users WHERE id = ?', [targetId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const targetUser = users[0];

    if (targetUser.role === 'developpeur' && currentUser.role !== 'developpeur') {
      return res.status(403).json({ error: 'Seul un développeur peut supprimer un autre développeur' });
    }

    if (targetUser.role === 'admin' && currentUser.role !== 'developpeur') {
      return res.status(403).json({ error: 'Seul un développeur peut supprimer un admin' });
    }

    const [result] = await db.query('DELETE FROM users WHERE id = ?', [targetId]);
    console.log('Utilisateur supprimé, lignes affectées:', result.affectedRows);
    
    res.json({ 
      message: 'Utilisateur supprimé avec succès',
      affectedRows: result.affectedRows 
    });
  } catch (error) {
    console.error('Erreur lors de la suppression d\'utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression' });
  }
});

module.exports = router;