const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = 'super-secret-kanban-key-123'; 

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
    db.run('INSERT INTO users (name, email, password_hash, avatar_url) VALUES (?, ?, ?, ?)', [name, email, hashedPassword, avatar_url], function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Email already exists' });
        return res.status(500).json({ error: 'Database error' });
      }
      res.status(201).json({ message: 'User created successfully', userId: this.lastID });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, avatar_url: user.avatar_url } });
  });
});

// --- Tags Routes ---
app.get('/api/tags', authenticateToken, (req, res) => {
  db.all('SELECT * FROM tags WHERE user_id = ?', [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/tags', authenticateToken, (req, res) => {
  const { name, color } = req.body;
  db.run('INSERT INTO tags (user_id, name, color) VALUES (?, ?, ?)', [req.user.id, name, color], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    db.get('SELECT * FROM tags WHERE id = ?', [this.lastID], (err, row) => {
      res.status(201).json(row);
    });
  });
});

// --- Tasks Routes ---
app.get('/api/tasks', authenticateToken, (req, res) => {
  db.all('SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC', [req.user.id], (err, tasks) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Fetch all tags for the user's tasks
    const query = `
      SELECT tt.task_id, t.id, t.name, t.color 
      FROM task_tags tt
      JOIN tags t ON tt.tag_id = t.id
      WHERE t.user_id = ?
    `;
    db.all(query, [req.user.id], (err, tagsData) => {
      if (err) return res.status(500).json({ error: err.message });
      
      const tasksWithTags = tasks.map(task => {
        return {
          ...task,
          tags: tagsData.filter(t => t.task_id === task.id).map(t => ({ id: t.id, name: t.name, color: t.color }))
        };
      });
      res.json(tasksWithTags);
    });
  });
});

app.post('/api/tasks', authenticateToken, (req, res) => {
  const { title, description, status, priority, due_date, category_id, tags } = req.body;
  
  db.run(
    `INSERT INTO tasks (user_id, title, description, status, priority, due_date, category_id) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [req.user.id, title, description, status || 'TODO', priority || 'MEDIUM', due_date, category_id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      const taskId = this.lastID;
      
      // Insert tags
      if (tags && tags.length > 0) {
        const stmt = db.prepare('INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)');
        tags.forEach(tagId => stmt.run([taskId, tagId]));
        stmt.finalize();
      }
      
      res.status(201).json({ id: taskId, message: 'Task created' });
    }
  );
});

app.put('/api/tasks/:id', authenticateToken, (req, res) => {
  const { title, description, status, priority, due_date, category_id, tags } = req.body;
  const taskId = req.params.id;

  db.run(
    `UPDATE tasks SET 
      title = COALESCE(?, title), 
      description = COALESCE(?, description), 
      status = COALESCE(?, status), 
      priority = COALESCE(?, priority), 
      due_date = COALESCE(?, due_date), 
      category_id = COALESCE(?, category_id)
     WHERE id = ? AND user_id = ?`,
    [title, description, status, priority, due_date, category_id, taskId, req.user.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Task not found' });
      
      if (tags !== undefined) {
        db.run('DELETE FROM task_tags WHERE task_id = ?', [taskId], (err) => {
          if (err) console.error(err);
          if (tags.length > 0) {
            const stmt = db.prepare('INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)');
            tags.forEach(tagId => stmt.run([taskId, tagId]));
            stmt.finalize();
          }
          res.json({ message: 'Task updated' });
        });
      } else {
        res.json({ message: 'Task updated' });
      }
    }
  );
});

app.delete('/api/tasks/:id', authenticateToken, (req, res) => {
  db.run('DELETE FROM task_tags WHERE task_id = ?', [req.params.id], (err) => {
    db.run('DELETE FROM tasks WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Task not found' });
      res.json({ message: 'Task deleted successfully' });
    });
  });
});

// --- Dashboard Stats Route ---
app.get('/api/dashboard', authenticateToken, (req, res) => {
  const userId = req.user.id;
  
  // Queries
  const statsQuery = `
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'DONE' AND created_at >= date('now', '-7 days') THEN 1 ELSE 0 END) as completed_last_7_days,
      SUM(CASE WHEN status != 'DONE' AND due_date < date('now') THEN 1 ELSE 0 END) as overdue
    FROM tasks
    WHERE user_id = ?
  `;
  
  const upcomingQuery = `
    SELECT * FROM tasks 
    WHERE user_id = ? AND status != 'DONE' AND due_date >= date('now')
    ORDER BY due_date ASC
    LIMIT 5
  `;

  db.get(statsQuery, [userId], (err, statsRow) => {
    if (err) return res.status(500).json({ error: err.message });
    
    db.all(upcomingQuery, [userId], (err, upcomingTasks) => {
      if (err) return res.status(500).json({ error: err.message });
      
      res.json({
        total: statsRow.total || 0,
        completed_last_7_days: statsRow.completed_last_7_days || 0,
        overdue: statsRow.overdue || 0,
        upcomingTasks: upcomingTasks || []
      });
    });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
