const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all poseurs
router.get('/', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM poseurs');
  res.json(rows);
});

// POST new poseur
router.post('/', async (req, res) => {
  const { name, phone } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Nom du poseur requis' });
  }

  const [result] = await db.query(
    'INSERT INTO poseurs (name, phone) VALUES (?, ?)',
    [name, phone || '']
  );

  // Récupération du nouvel ID
  const [newPoseur] = await db.query('SELECT * FROM poseurs WHERE id = ?', [result.insertId]);

  res.status(201).json(newPoseur[0]);
});

// PUT update poseur
router.put('/:id', async (req, res) => {
  const id = req.params.id;
  const { name, phone } = req.body;

  await db.query(
    'UPDATE poseurs SET name = ?, phone = ? WHERE id = ?',
    [name, phone, id]
  );

  res.json({ success: true });
});

// DELETE poseur
router.delete('/:id', async (req, res) => {
  await db.query('DELETE FROM poseurs WHERE id = ?', [req.params.id]);
  res.status(204).send();
});

module.exports = router;
