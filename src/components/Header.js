import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Header.css';

function Header({ username = 'ゲスト', setUsername }) {
  const navigate = useNavigate();
  
  const handleLogout = async () => {
    const sessionId = localStorage.getItem('sessionId');
    
    if (sessionId) {
      try {
        await fetch('http://localhost:3001/api/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId }),
        });
      } catch (err) {
        console.error('Logout error:', err);
      }
    }
    
    // ローカルストレージをクリア
    localStorage.removeItem('sessionId');
    localStorage.removeItem('user');
    
    // ユーザー名をリセット
    setUsername('ゲスト');
    navigate('/');
  };
  return (
    <header className="header">
      <div className="header-title-wrapper">
        <Link to="/" className="site-logo-link" aria-label="トップページへ">
           <img src="/header-bg.png" alt="" className="site-logo" />
        </Link>
      </div>
      <nav className="nav">
        <span className="username-label">{username}</span>
        <Link to="/favorites">お気に入りの商品</Link>
        <Link to="/works">作品名から探す</Link>
        {username === 'ゲスト' ? (
          <Link to="/login">ログイン</Link>
        ) : (
          <button onClick={handleLogout} className="logout-button">ログアウト</button>
        )}
      </nav>
    </header>
  );
}

export default Header; 