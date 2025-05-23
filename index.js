const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

app.use(cors());
const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));
app.use('/script', express.static(path.join(__dirname, 'script')));
app.use(express.json());

const livreurRoutes = require('./routes/livreurs');
const poseurRoutes = require('./routes/poseurs');
const chantierRoutes = require('./routes/chantiers');
const taskRoutes = require('./routes/tasks');

app.use('/livreurs', livreurRoutes);
app.use('/poseurs', poseurRoutes);
app.use('/chantiers', chantierRoutes);
app.use('/tasks', taskRoutes);

const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

const userRoutes = require('./routes/users');
app.use('/users', userRoutes);

app.get('/', (req, res) => {
  res.send('API planning en ligne fonctionne ✅');
});

app.listen(PORT, () => {
  console.log(`API planning en écoute sur http://localhost:${PORT}`);
});
