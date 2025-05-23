<<<<<<< HEAD
const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all tasks
router.get('/', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM tasks');
  
  // Convertir les noms de colonnes en camelCase pour le front-end
  const formattedRows = rows.map(row => ({
    id: row.id,
    type: row.type,
    artisanId: row.artisan_id,
    day: row.day,
    week: row.week,
    year: row.year,
    description: row.description,
    chantierId: row.chantier_id,
    notes: row.notes,
    completed: row.completed
  }));
  
  res.json(formattedRows);
});

// POST new task
router.post('/', async (req, res) => {
  const {
    type, artisanId, day, week, year,
    description, chantierId, notes, completed
  } = req.body;

  const [result] = await db.query(
    `INSERT INTO tasks (type, artisan_id, day, week, year, description, chantier_id, notes, completed)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [type, artisanId, day, week, year, description, chantierId, notes, completed]
  );

  const [newTaskRows] = await db.query('SELECT * FROM tasks WHERE id = ?', [result.insertId]);
  
  // Convertir les noms de colonnes en camelCase pour correspondre au format du front-end
  const formattedTask = {
    id: newTaskRows[0].id,
    type: newTaskRows[0].type,
    artisanId: newTaskRows[0].artisan_id,
    day: newTaskRows[0].day,
    week: newTaskRows[0].week,
    year: newTaskRows[0].year,
    description: newTaskRows[0].description,
    chantierId: newTaskRows[0].chantier_id,
    notes: newTaskRows[0].notes,
    completed: newTaskRows[0].completed
  };

  res.status(201).json(formattedTask);
});

// PUT update task
router.put('/:id', async (req, res) => {
  const id = req.params.id;
  const {
    type, artisanId, day, week, year,
    description, chantierId, notes, completed
  } = req.body;

  await db.query(
    `UPDATE tasks SET type = ?, artisan_id = ?, day = ?, week = ?, year = ?,
     description = ?, chantier_id = ?, notes = ?, completed = ? WHERE id = ?`,
    [type, artisanId, day, week, year, description, chantierId, notes, completed, id]
  );

  // Récupérer et retourner la tâche mise à jour
  const [updatedTaskRows] = await db.query('SELECT * FROM tasks WHERE id = ?', [id]);
  
  if (updatedTaskRows.length > 0) {
    // Convertir les noms de colonnes en camelCase
    const formattedTask = {
      id: updatedTaskRows[0].id,
      type: updatedTaskRows[0].type,
      artisanId: updatedTaskRows[0].artisan_id,
      day: updatedTaskRows[0].day,
      week: updatedTaskRows[0].week,
      year: updatedTaskRows[0].year,
      description: updatedTaskRows[0].description,
      chantierId: updatedTaskRows[0].chantier_id,
      notes: updatedTaskRows[0].notes,
      completed: updatedTaskRows[0].completed
    };
    
    res.json(formattedTask);
  } else {
    res.json({ success: true });
  }
});

// DELETE task
router.delete('/:id', async (req, res) => {
  await db.query('DELETE FROM tasks WHERE id = ?', [req.params.id]);
  res.status(204).send();
});

=======
const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all tasks
router.get('/', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM tasks');
  
  // Convertir les noms de colonnes en camelCase pour le front-end
  const formattedRows = rows.map(row => ({
    id: row.id,
    type: row.type,
    artisanId: row.artisan_id,
    day: row.day,
    week: row.week,
    year: row.year,
    description: row.description,
    chantierId: row.chantier_id,
    notes: row.notes,
    completed: row.completed
  }));
  
  res.json(formattedRows);
});

// POST new task
router.post('/', async (req, res) => {
  const {
    type, artisanId, day, week, year,
    description, chantierId, notes, completed
  } = req.body;

  const [result] = await db.query(
    `INSERT INTO tasks (type, artisan_id, day, week, year, description, chantier_id, notes, completed)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [type, artisanId, day, week, year, description, chantierId, notes, completed]
  );

  const [newTaskRows] = await db.query('SELECT * FROM tasks WHERE id = ?', [result.insertId]);
  
  // Convertir les noms de colonnes en camelCase pour correspondre au format du front-end
  const formattedTask = {
    id: newTaskRows[0].id,
    type: newTaskRows[0].type,
    artisanId: newTaskRows[0].artisan_id,
    day: newTaskRows[0].day,
    week: newTaskRows[0].week,
    year: newTaskRows[0].year,
    description: newTaskRows[0].description,
    chantierId: newTaskRows[0].chantier_id,
    notes: newTaskRows[0].notes,
    completed: newTaskRows[0].completed
  };

  res.status(201).json(formattedTask);
});

// PUT update task
router.put('/:id', async (req, res) => {
  const id = req.params.id;
  const {
    type, artisanId, day, week, year,
    description, chantierId, notes, completed
  } = req.body;

  await db.query(
    `UPDATE tasks SET type = ?, artisan_id = ?, day = ?, week = ?, year = ?,
     description = ?, chantier_id = ?, notes = ?, completed = ? WHERE id = ?`,
    [type, artisanId, day, week, year, description, chantierId, notes, completed, id]
  );

  // Récupérer et retourner la tâche mise à jour
  const [updatedTaskRows] = await db.query('SELECT * FROM tasks WHERE id = ?', [id]);
  
  if (updatedTaskRows.length > 0) {
    // Convertir les noms de colonnes en camelCase
    const formattedTask = {
      id: updatedTaskRows[0].id,
      type: updatedTaskRows[0].type,
      artisanId: updatedTaskRows[0].artisan_id,
      day: updatedTaskRows[0].day,
      week: updatedTaskRows[0].week,
      year: updatedTaskRows[0].year,
      description: updatedTaskRows[0].description,
      chantierId: updatedTaskRows[0].chantier_id,
      notes: updatedTaskRows[0].notes,
      completed: updatedTaskRows[0].completed
    };
    
    res.json(formattedTask);
  } else {
    res.json({ success: true });
  }
});

// DELETE task
router.delete('/:id', async (req, res) => {
  await db.query('DELETE FROM tasks WHERE id = ?', [req.params.id]);
  res.status(204).send();
});

>>>>>>> fc43a738188cdce725539ef8b5fbec58e7d6320d
module.exports = router;