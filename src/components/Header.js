import React from 'react';
import { Link } from 'react-router-dom';
import './Header.css';

function Header({ username = 'ゲスト' }) {
  return (
    <header className="header">
      <div className="header-title-wrapper">
        <Link to="/" className="site-title-link">
          <h1 className="site-title">グッズまとめサイト（仮）</h1>
        </Link>
      </div>
      <nav className="nav">
        <span className="username-label">{username}</span>
        <Link to="/favorites">お気に入りの作品</Link>
        <Link to="/works">作品名から探す</Link>
        <Link to="/login">ログイン</Link>
      </nav>
    </header>
  );
}

export default Header; 