import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pkg from 'pg';
import fetch from 'node-fetch';

const { Pool } = pkg;
const app = express();
const port = process.env.PORT || 5000;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

app.use(cors());
app.use(express.json());

const fetchExternalJoke = async () => {
  try {
    const response = await fetch('https://teehee.dev/api/joke');
    if (!response.ok) throw new Error('Failed to fetch external joke');

    const joke = await response.json();
    
    const existingJoke = await pool.query('SELECT * FROM jokes WHERE id = $1', [joke.id]);

    if (existingJoke.rows.length === 0) {
      await pool.query(
        'INSERT INTO jokes (id, question, answer, votes) VALUES ($1, $2, $3, $4)',
        [joke.id, joke.question, joke.answer, '{}']
      );
    }

    return {
      id: joke.id,
      question: joke.question,
      answer: joke.answer,
      availableVotes: ["😂", "👍", "❤️", "🤔", "😐"],
      votes: {} 
    };
  } catch (error) {
    console.error('Error fetching external joke:', error);
    return null;
  }
};

app.get('/api/joke', async (req, res) => {
  try {
    const joke = await pool.query('SELECT * FROM jokes ORDER BY RANDOM() LIMIT 1');

    if (joke.rows.length > 0) {
      return res.json({
        ...joke.rows[0],
        availableVotes: ["😂", "👍", "❤️", "🤔", "😐"]
      });
    }

    const externalJoke = await fetchExternalJoke();
    if (!externalJoke) {
      return res.status(500).json({ error: 'No jokes available' });
    }

    res.json(externalJoke);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch joke' });
  }
});

app.post('/api/joke/:id/vote', async (req, res) => {
  const { id } = req.params;
  const { emoji } = req.body;

  try {
    const joke = await pool.query('SELECT votes FROM jokes WHERE id = $1', [id]);

    if (joke.rows.length === 0) {
      return res.status(404).json({ message: 'Joke not found' });
    }

    let votes = joke.rows[0].votes || {};
    votes[emoji] = (votes[emoji] || 0) + 1;

    await pool.query('UPDATE jokes SET votes = $1 WHERE id = $2', [JSON.stringify(votes), id]);
    res.json({ message: 'Vote added', votes });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/joke', async (req, res) => {
  const { question, answer } = req.body;
  if (!question || !answer) {
    return res.status(400).json({ error: 'Missing question or answer' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO jokes (question, answer, votes) VALUES ($1, $2, $3) RETURNING *',
      [question, answer, '{}']
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});


app.delete('/api/joke/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM jokes WHERE id = $1 RETURNING *;', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Joke not found' });
    }
    res.json({ message: 'Joke deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
