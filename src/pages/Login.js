import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Login.css';

function Login({ setUsername }) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // 仮のログイン処理
    setUsername('ユーザー名'); // 本来はAPIレスポンスのユーザー名
    navigate('/');
  };

  return (
    <div className="login-container">
      <div className="login-form">
        <h2>ログイン</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">メールアドレス</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">パスワード</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          <button type="submit" className="login-button">
            ログイン
          </button>
        </form>
        <div className="register-link">
          <p>アカウントをお持ちでない方は <Link to="/register">こちら</Link></p>
        </div>
      </div>
    </div>
  );
}

export default Login; 