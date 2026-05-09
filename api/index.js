const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs'); // Usando bcryptjs para melhor compatibilidade serverless
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-kanban-key-123';

// Configuração do PostgreSQL
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Helper para executar queries no Postgres
const db = {
  get: (query, params) => pool.query(query, params).then(res => res.rows[0]),
  all: (query, params) => pool.query(query, params).then(res => res.rows),
  run: (query, params) => pool.query(query, params)
};

// Inicialização das tabelas (PostgreSQL)
const initDB = async () => {
  try {
    await db.run(`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE,
      password_hash TEXT,
      avatar_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await db.run(`CREATE TABLE IF NOT EXISTS tags (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      name TEXT,
      color TEXT
    )`);
    await db.run(`CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      title TEXT,
      description TEXT,
      status TEXT DEFAULT 'TODO',
      priority TEXT DEFAULT 'MEDIUM',
      due_date TIMESTAMP,
      category_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await db.run(`CREATE TABLE IF NOT EXISTS task_tags (
      task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
      tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY(task_id, tag_id)
    )`);
    console.log("Database tables initialized");
  } catch (err) {
    console.error("Error initializing database:", err);
  }
};

// Middleware para garantir que o banco está pronto
app.use(async (req, res, next) => {
  await initDB();
  next();
});

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- Auth Routes ---
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password required' });

  const avatar_url = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.run(
      'INSERT INTO users (name, email, password_hash, avatar_url) VALUES ($1, $2, $3, $4) RETURNING id',
      [name, email, hashedPassword, avatar_url]
    );
    res.status(201).json({ message: 'User created successfully', userId: result.rows[0].id });
  } catch (error) {
    if (error.message.includes('unique constraint') || error.code === '23505') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await db.get('SELECT * FROM users WHERE email = $1', [email]);
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, avatar_url: user.avatar_url } });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// --- Tags Routes ---
app.get('/api/tags', authenticateToken, async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM tags WHERE user_id = $1', [req.user.id]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tags', authenticateToken, async (req, res) => {
  const { name, color } = req.body;
  try {
    const result = await db.run(
      'INSERT INTO tags (user_id, name, color) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, name, color]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Tasks Routes ---
app.get('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const tasks = await db.all('SELECT * FROM tasks WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    
    const query = `
      SELECT tt.task_id, t.id, t.name, t.color 
      FROM task_tags tt
      JOIN tags t ON tt.tag_id = t.id
      WHERE t.user_id = $1
    `;
    const tagsData = await db.all(query, [req.user.id]);
    
    const tasksWithTags = tasks.map(task => {
      return {
        ...task,
        tags: tagsData.filter(t => t.task_id === task.id).map(t => ({ id: t.id, name: t.name, color: t.color }))
      };
    });
    res.json(tasksWithTags);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tasks', authenticateToken, async (req, res) => {
  const { title, description, status, priority, due_date, category_id, tags } = req.body;
  
  try {
    const result = await db.run(
      `INSERT INTO tasks (user_id, title, description, status, priority, due_date, category_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [req.user.id, title, description, status || 'TODO', priority || 'MEDIUM', due_date, category_id]
    );
    const taskId = result.rows[0].id;
    
    if (tags && tags.length > 0) {
      for (const tagId of tags) {
        await db.run('INSERT INTO task_tags (task_id, tag_id) VALUES ($1, $2)', [taskId, tagId]);
      }
    }
    
    res.status(201).json({ id: taskId, message: 'Task created' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
  const { title, description, status, priority, due_date, category_id, tags } = req.body;
  const taskId = req.params.id;

  try {
    await db.run(
      `UPDATE tasks SET 
        title = COALESCE($1, title), 
        description = COALESCE($2, description), 
        status = COALESCE($3, status), 
        priority = COALESCE($4, priority), 
        due_date = COALESCE($5, due_date), 
        category_id = COALESCE($6, category_id)
       WHERE id = $7 AND user_id = $8`,
      [title, description, status, priority, due_date, category_id, taskId, req.user.id]
    );
    
    if (tags !== undefined) {
      await db.run('DELETE FROM task_tags WHERE task_id = $1', [taskId]);
      if (tags.length > 0) {
        for (const tagId of tags) {
          await db.run('INSERT INTO task_tags (task_id, tag_id) VALUES ($1, $2)', [taskId, tagId]);
        }
      }
    }
    res.json({ message: 'Task updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    await db.run('DELETE FROM task_tags WHERE task_id = $1', [req.params.id]);
    const result = await db.run('DELETE FROM tasks WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Task not found' });
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/dashboard', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'DONE' AND created_at >= NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END) as completed_last_7_days,
        SUM(CASE WHEN status != 'DONE' AND due_date < CURRENT_DATE THEN 1 ELSE 0 END) as overdue
      FROM tasks
      WHERE user_id = $1
    `;
    
    const upcomingQuery = `
      SELECT * FROM tasks 
      WHERE user_id = $1 AND status != 'DONE' AND due_date >= CURRENT_DATE
      ORDER BY due_date ASC
      LIMIT 5
    `;

    const statsRow = await db.get(statsQuery, [userId]);
    const upcomingTasks = await db.all(upcomingQuery, [userId]);
    
    res.json({
      total: parseInt(statsRow.total) || 0,
      completed_last_7_days: parseInt(statsRow.completed_last_7_days) || 0,
      overdue: parseInt(statsRow.overdue) || 0,
      upcomingTasks: upcomingTasks || []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = app;
