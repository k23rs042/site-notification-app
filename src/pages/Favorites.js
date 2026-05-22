import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Works.css';

function Favorites() {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [favoriteGoods, setFavoriteGoods] = useState([]);
  const [loading, setLoading] = useState(false);

  // お気に入りをローカルストレージから読み込み
  useEffect(() => {
    const savedFavorites = localStorage.getItem('favorites');
    if (savedFavorites) {
      const favoriteIds = JSON.parse(savedFavorites);
      setFavorites(favoriteIds);
      
      // お気に入り商品の詳細を取得
      if (favoriteIds.length > 0) {
        setLoading(true);
        fetch('https://site-notification-app-api.onrender.com/api/gakuen-idolmaster')
          .then(response => response.json())
          .then(data => {
            const favoriteItems = data.filter(item => favoriteIds.includes(item.id));
            setFavoriteGoods(favoriteItems);
            setLoading(false);
          })
          .catch(err => {
            console.error('Error fetching favorites:', err);
            setLoading(false);
          });
      }
    }
  }, []);

  // お気に入りを削除する関数
  const removeFavorite = (goodId) => {
    const newFavorites = favorites.filter(id => id !== goodId);
    setFavorites(newFavorites);
    setFavoriteGoods(favoriteGoods.filter(item => item.id !== goodId));
    localStorage.setItem('favorites', JSON.stringify(newFavorites));
  };

  return (
    <div className="works-container">
      <h2>お気に入り商品</h2>
      {loading && <div>お気に入り商品を読み込み中...</div>}
      {!loading && favoriteGoods.length === 0 && (
        <div className="no-favorites">
          <p>お気に入り商品がありません。</p>
          <p>ホームページで商品の横にある⭐ボタンを押してお気に入りに追加してください。</p>
        </div>
      )}
      {!loading && favoriteGoods.length > 0 && (
        <div className="favorites-list">
          {favoriteGoods.map(good => (
            <div key={good.id} className="favorite-item">
              <div className="favorite-img">
                <img src={good.image} alt={good.name} />
              </div>
              <div className="favorite-content">
                <h3>{good.name}</h3>
                <p>{good.price}</p>
                <div className="favorite-actions">
                  <a href={good.url} target="_blank" rel="noopener noreferrer">商品ページ</a>
                  <button 
                    className="remove-favorite-button"
                    onClick={() => removeFavorite(good.id)}
                  >
                    ❌ 削除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Favorites; 