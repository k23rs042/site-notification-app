import React, { useEffect, useState } from 'react';
import './Home.css';

function Home() {
  const [goods, setGoods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [showTopButton, setShowTopButton] = useState(false);

  // お気に入りをローカルストレージから読み込み
  useEffect(() => {
    const savedFavorites = localStorage.getItem('favorites');
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
  }, []);

  // スクロール位置を監視してトップボタンの表示/非表示を切り替え
  useEffect(() => {
    const handleScroll = () => {
      setShowTopButton(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch('https://site-notification-app-3.onrender.com/api/gakuen-idolmaster')
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

  // お気に入りを切り替える関数
  const toggleFavorite = (good) => {
    const newFavorites = favorites.includes(good.id) 
      ? favorites.filter(id => id !== good.id)
      : [...favorites, good.id];
    
    setFavorites(newFavorites);
    localStorage.setItem('favorites', JSON.stringify(newFavorites));
  };

  return (
    <div className="home-container">
      <div className="page-header">
        <div className="tag-filter">
          <span>タグ：</span>
          <select disabled>
            <option>すべて</option>
            <option>アニメ</option>
            <option>漫画</option>
          </select>
        </div>
        <button 
          className={`top-button ${showTopButton ? 'show' : ''}`} 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          🚀 トップへ
        </button>
      </div>
      <div className="goods-list">
        {loading && <div>グッズ情報を取得中...</div>}
        {error && <div>エラー: {error}</div>}
        {!loading && !error && goods.map(good => (
          <div className="goods-card" key={good.id}>
            <div className="goods-header">
              <div className="goods-img">
                <img src={good.image} alt={good.name} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }} onError={e => { e.target.src = 'https://via.placeholder.com/120x120?text=No+Image'; }} />
              </div>
              <button 
                className={`favorite-button ${favorites.includes(good.id) ? 'favorited' : ''}`}
                onClick={() => toggleFavorite(good)}
                title={favorites.includes(good.id) ? 'お気に入りから削除' : 'お気に入りに追加'}
              >
                ⭐
              </button>
            </div>
            <div className="goods-content">
              <div className="goods-title">{good.name}</div>
              <div className="goods-date">{good.price ? `価格: ${good.price}` : ''}</div>
              <div className="goods-actions">
                <a href={good.url} target="_blank" rel="noopener noreferrer">商品ページ</a>
              </div>
            </div>
          </div>
        ))}
        {!loading && !error && goods.length === 0 && <div>グッズが見つかりませんでした。</div>}
      </div>
    </div>
  );
}

export default Home; 