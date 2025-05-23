const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all chantiers
router.get('/', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM chantiers');
  res.json(rows);
});

// POST new chantier
router.post('/', async (req, res) => {
  const { name, address } = req.body;

  if (!name || !address) {
    return res.status(400).json({ error: 'Nom et adresse requis' });
  }

  const [result] = await db.query(
    'INSERT INTO chantiers (name, address) VALUES (?, ?)',
    [name, address]
  );

  const [newChantier] = await db.query('SELECT * FROM chantiers WHERE id = ?', [result.insertId]);

  res.status(201).json(newChantier[0]);
});

// PUT update chantier
router.put('/:id', async (req, res) => {
  const id = req.params.id;
  const { name, address } = req.body;

  await db.query(
    'UPDATE chantiers SET name = ?, address = ? WHERE id = ?',
    [name, address, id]
  );

  res.json({ success: true });
});

// DELETE chantier
router.delete('/:id', async (req, res) => {
  await db.query('DELETE FROM chantiers WHERE id = ?', [req.params.id]);
  res.status(204).send();
});

module.exports = router;
