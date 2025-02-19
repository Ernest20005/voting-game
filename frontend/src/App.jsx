import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [joke, setJoke] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [voted, setVoted] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');

  useEffect(() => {
    fetchJoke();
  }, []);

  const fetchJoke = async () => {
    setLoading(true);
    setError(null);
    setVoted(false);
    try {
      const response = await fetch('http://localhost:5000/api/joke');
      if (!response.ok) throw new Error('Server response was not OK');

      const data = await response.json();
      console.log("Fetched joke:", data);

      setJoke(data);
      setVoted(localStorage.getItem(`voted_${data.id}`) === 'true');
    } catch (err) {
      console.error("Fetch joke error:", err);
      setError('Failed to fetch joke');
    }
    setLoading(false);
  };

  const voteJoke = async (emoji) => {
    if (!joke || voted) return;

    try {
      const response = await fetch(`http://localhost:5000/api/joke/${joke.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji })
      });

      if (!response.ok) throw new Error('Failed to vote');

      const result = await response.json();
      console.log("Vote response:", result);

      setJoke((prevJoke) => ({
        ...prevJoke,
        votes: result.votes || {}
      }));

      localStorage.setItem(`voted_${joke.id}`, 'true');
      setVoted(true);
    } catch (err) {
      console.error("Vote error:", err);
      setError('Failed to vote');
    }
  };

  const addJoke = async () => {
    if (!newQuestion.trim() || !newAnswer.trim()) return;

    const newJoke = {
      question: newQuestion,
      answer: newAnswer
    };

    try {
      console.log("Adding new joke:", newJoke);

      const response = await fetch("http://localhost:5000/api/joke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newJoke),
      });

      if (!response.ok) throw new Error("Error adding joke");

      const result = await response.json();
      console.log("Response from server:", result);

      setNewQuestion("");
      setNewAnswer("");
      fetchJoke();
    } catch (err) {
      console.error("Add joke error:", err);
      setError("Failed to add joke");
    }
  };

  const deleteJoke = async () => {
    if (!joke) return;
    try {
      const response = await fetch(`http://localhost:5000/api/joke/${joke.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete joke');

      fetchJoke();
    } catch (err) {
      console.error("Delete joke error:", err);
      setError('Failed to delete joke');
    }
  };

  return (
    <div className="container">
      <h1 className="title">😂 Daily Joke 😂</h1>
      {loading ? (
        <p className="loading">Loading...</p>
      ) : error ? (
        <p className="error">{error}</p>
      ) : (
        <div className="joke-box">
          <p className="question"><strong>{joke?.question}</strong></p>
          <p className="answer">{joke?.answer}</p>
          <div className="votes">
            {joke?.availableVotes?.map((emoji) => (
              <button 
                key={emoji} 
                className={`vote-btn ${voted ? 'disabled' : ''}`} 
                onClick={() => voteJoke(emoji)} 
                disabled={voted}
              >
                {emoji} {joke.votes?.[emoji] || 0}
              </button>
            ))}
          </div>
          <div className="buttons">
            <button className="next-btn" onClick={fetchJoke}>Next Joke</button>
            <button className="delete-btn" onClick={deleteJoke}>Delete Joke</button>
          </div>
        </div>
      )}
      <div className="add-joke">
        <input 
          type="text" 
          placeholder="Question" 
          value={newQuestion} 
          onChange={(e) => setNewQuestion(e.target.value)} 
        />
        <input 
          type="text" 
          placeholder="Answer" 
          value={newAnswer} 
          onChange={(e) => setNewAnswer(e.target.value)} 
        />
        <button onClick={addJoke}>Add Joke</button>
      </div>
    </div>
  );
}

export default App;
