const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all livreurs
router.get('/', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM livreurs');
  res.json(rows);
});

// POST new livreur
router.post('/', async (req, res) => {
  const { name, phone } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Nom du livreur requis' });
  }

  const [result] = await db.query(
    'INSERT INTO livreurs (name, phone) VALUES (?, ?)',
    [name, phone || '']
  );

  const [newLivreur] = await db.query('SELECT * FROM livreurs WHERE id = ?', [result.insertId]);

  res.status(201).json(newLivreur[0]);
});

// PUT update livreur
router.put('/:id', async (req, res) => {
  const id = req.params.id;
  const { name, phone } = req.body;

  await db.query('UPDATE livreurs SET name = ?, phone = ? WHERE id = ?', [name, phone, id]);

  res.json({ success: true });
});

// DELETE livreur
router.delete('/:id', async (req, res) => {
  await db.query('DELETE FROM livreurs WHERE id = ?', [req.params.id]);
  res.status(204).send();
});

module.exports = router;
