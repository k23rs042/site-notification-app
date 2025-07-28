import React, { useEffect, useState } from 'react';
import './Home.css';

function Home() {
  const [goods, setGoods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch('http://localhost:3001/api/goods/学園アイドルマスター')
      .then(response => {
        if (!response.ok) throw new Error('APIからデータを取得できませんでした');
        return response.json();
      })
      .then(data => {
        setGoods(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
        setGoods([]);
      });
  }, []);

  return (
    <div className="home-container">
      <div className="tag-filter">
        <span>タグ：</span>
        <select disabled>
          <option>すべて</option>
          <option>アニメ</option>
          <option>漫画</option>
        </select>
      </div>
      <div className="goods-list">
        {loading && <div>グッズ情報を取得中...</div>}
        {error && <div>エラー: {error}</div>}
        {!loading && !error && goods.map(good => (
          <div className="goods-card" key={good.id}>
            <div className="goods-img">
              <img src={good.image} alt={good.name} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }} onError={e => { e.target.src = 'https://via.placeholder.com/120x120?text=No+Image'; }} />
            </div>
            <div className="goods-title">{good.name}</div>
            <div className="goods-date">{good.price ? `価格: ${good.price}` : ''}</div>
            <a href={good.url} target="_blank" rel="noopener noreferrer">商品ページ</a>
          </div>
        ))}
        {!loading && !error && goods.length === 0 && <div>グッズが見つかりませんでした。</div>}
      </div>
    </div>
  );
}

export default Home; 