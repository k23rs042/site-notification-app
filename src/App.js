import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Works from './pages/Works';
import Favorites from './pages/Favorites';
import './App.css';

function App() {
  // 仮のログイン状態管理
  const [username, setUsername] = useState('ゲスト');

  return (
    <div>
      <Header username={username} />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/login" element={<Login setUsername={setUsername} />} />
          <Route path="/register" element={<Register />} />
          <Route path="/works" element={<Works />} />
        </Routes>
      </main>
    </div>
  );
}

export default App; 