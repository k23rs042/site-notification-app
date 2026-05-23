import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import './Works.css';

const allWorks = [
  { title: '進撃の巨人', category: 'anime' },
  { title: '鬼滅の刃', category: 'anime' },
  { title: 'ワンピース', category: 'anime' },
  { title: 'ドラえもん', category: 'anime' },
  { title: 'スパイファミリー', category: 'anime' },
  { title: '呪術廻戦', category: 'anime' },
  { title: '名探偵コナン', category: 'anime' },
  { title: 'チェンソーマン', category: 'anime' },
  { title: '原神', category: 'game' },
  { title: '僕のヒーローアカデミア', category: 'anime' },
  { title: '学園アイドルマスター', category: 'game' },

];

function Works() {
  const { title } = useParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [goods, setGoods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [favorites, setFavorites] = useState([]);

  const ITEMS_PER_PAGE = 20;
  const [currentPage, setCurrentPage] = useState(1);

  // お気に入りをローカルストレージから読み込み
  useEffect(() => {
    const savedFavorites = localStorage.getItem('favorites');
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
  }, []);

  // タグ一覧
  const tags = allWorks.map(w => w.title);

  // タグクリックで絞り込み
  const [activeTag, setActiveTag] = useState(title || '');
  
  useEffect(() => {
    if (title) setActiveTag(title);
  }, [title]);

  // タグ選択時にAPIからグッズ情報を取得
  useEffect(() => {
    if (!activeTag) {
      setGoods([]);
      return;
    }
    setLoading(true);
    setError(null);
    
    // 作品に応じて適切なAPIエンドポイントを選択
    let apiUrl;
    if (activeTag === '学園アイドルマスター') {
      apiUrl = 'https://site-notification-app-3.onrender.com/api/gakuen-idolmaster';
    } else if (activeTag === '僕のヒーローアカデミア') {
      apiUrl = 'https://site-notification-app-3.onrender.com/api/my-hero-academia';
    } else if(activeTag === '原神'){
      apiUrl = 'https://site-notification-app-3.onrender.com/api/genshin';
    } else {
      apiUrl = `https://site-notification-app-3.onrender.com/api/goods/${encodeURIComponent(activeTag)}`;
    }
    
    fetch(apiUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error('APIからデータを取得できませんでした');
        }
        return response.json();
      })
      .then(data => {
        setGoods(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
        // エラー時はダミーデータを表示
        const dummyGoods = Array.from({ length: 10 }, (_, i) => ({
          id: `${activeTag}-${i + 1}`,
          title: activeTag,
          name: `${activeTag}グッズ${i + 1}`,
          image: 'https://via.placeholder.com/120x120?text=Goods',
          url: i % 2 === 0
            ? 'https://shop.asobistore.jp/category/10107/'
            : 'https://list.amiami.jp/top/search/list?s_originaltitle_id=36257&pagecnt=40&getcnt=0&pagehnt=2',
          category: allWorks.find(w => w.title === activeTag)?.category || 'anime',
        }));
        setGoods(dummyGoods);
      });
  }, [activeTag]);

  // 検索・カテゴリフィルタリング
  const filteredGoods = goods.filter(good => {
    const matchesSearch = good.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || good.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.ceil(filteredGoods.length / ITEMS_PER_PAGE);
  const getVisiblePages = () => {
  const range = 10; // 現在ページの前後10ページ
  const start = Math.max(1, currentPage - range);
  const end = Math.min(totalPages, currentPage + range);

  return Array.from(
    { length: end - start + 1 },
    (_, i) => start + i
  );
};
  const paginatedGoods = filteredGoods.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1); // タグや検索が変わったら1ページ目に戻す
  }, [activeTag, searchTerm, selectedCategory]);

  // お気に入りを切り替える関数
  const toggleFavorite = (good) => {
    const newFavorites = favorites.includes(good.id) 
      ? favorites.filter(id => id !== good.id)
      : [...favorites, good.id];
    
    setFavorites(newFavorites);
    localStorage.setItem('favorites', JSON.stringify(newFavorites));
  };

  return (
    <div className="works-container">
      <div className="tag-list">
        {tags.map(tag => (
          <button
            key={tag}
            className={`work-tag${activeTag === tag ? ' active' : ''}`}
            onClick={() => setActiveTag(tag)}
          >
            {tag}
          </button>
        ))}
      </div>
      
      <div className="search-section">
        <h2>{activeTag ? `${activeTag}のグッズ一覧` : '作品名から探す'}</h2>
        <div className="search-controls">
          <input
            type="text"
            placeholder="グッズ名を入力..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="category-select"
            disabled={activeTag === '学園アイドルマスター'}
          >
            <option value="all">すべて</option>
            <option value="anime">アニメ</option>
            <option value="game">ゲーム</option>
          </select>
        </div>
      </div>

      {loading && (
        <div className="loading">
          <p>グッズ情報を取得中...</p>
        </div>
      )}

      {error && (
        <div className="error">
          <p>エラー: {error}</p>
        </div>
      )}

      <div className="works-grid">
        {paginatedGoods.map((good, index) => (
          <div className="work-card" key={good.id || `good-${index}`}>
            <div className="work-header">
              <div className="work-image">
                <img 
                  src={good.image} 
                  alt={good.name} 
                  style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }}
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/120x120?text=No+Image';
                  }}
                />
              </div>
              <button 
                className={`favorite-button ${favorites.includes(good.id) ? 'favorited' : ''}`}
                onClick={() => toggleFavorite(good)}
                title={favorites.includes(good.id) ? 'お気に入りから削除' : 'お気に入りに追加'}
              >
                ⭐
              </button>
            </div>
            <div className="work-info">
              <h3 className="work-title">{good.name}</h3>
              {good.source && <span className="work-category">{good.source}</span>}
              <a 
                href={good.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="work-link"
              >
                商品ページ
              </a>
            </div>
          </div>
        ))}
      </div>
      
      {!loading && !error && filteredGoods.length === 0 && (
        <div className="no-results">
          <p>該当するグッズが見つかりませんでした。</p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>前へ</button>
       {getVisiblePages().map(page => (
  <button
    key={page}
    onClick={() => setCurrentPage(page)}
    className={currentPage === page ? 'active' : ''}
  >
    {page}
  </button>
))}
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>次へ</button>
        </div>
      )}
    </div>
  );
}

export default Works; 