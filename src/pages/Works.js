import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import './Works.css';

const allWorks = [
  { title: '進撃の巨人', category: 'anime' },
  { title: '鬼滅の刃', category: 'anime' },
  { title: 'ワンピース', category: 'manga' },
  { title: 'ドラえもん', category: 'manga' },
  { title: 'スパイファミリー', category: 'anime' },
  { title: '呪術廻戦', category: 'manga' },
  { title: '名探偵コナン', category: 'anime' },
  { title: 'チェンソーマン', category: 'manga' },
  { title: 'ハイキュー!!', category: 'anime' },
  { title: '僕のヒーローアカデミア', category: 'anime' },
  { title: '学園アイドルマスター', category: 'anime' },
];

function Works() {
  const { title } = useParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [goods, setGoods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const ITEMS_PER_PAGE = 12;
  const [currentPage, setCurrentPage] = useState(1);

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

    // 学園アイドルマスターの場合のみAPIから取得
    if (activeTag === '学園アイドルマスター') {
      setLoading(true);
      setError(null);
      
      fetch(`http://localhost:3001/api/goods/${encodeURIComponent(activeTag)}`)
        .then(response => {
          if (!response.ok) {
            throw new Error('APIからデータを取得できませんでした');
          }
          return response.json();
        })
        .then(data => {
          console.log('API response:', data);
          setGoods(data);
          setLoading(false);
        })
        .catch(err => {
          console.error('API fetch error:', err);
          setError(err.message);
          setLoading(false);
          // エラー時はダミーデータを表示
          setGoods([
            {
              id: 'fallback-1',
              name: '学園アイドルマスター Tシャツ 藤田ことね',
              image: 'https://shop.asobistore.jp/simages/product_image_huge/4573685102001_220_gkmas_undokai_special_003_.jpg?1',
              url: 'https://shop.asobistore.jp/products/detail/219880-00-00-00',
              source: 'asobistore'
            },
            {
              id: 'fallback-2',
              name: '学園アイドルマスター Tシャツ 月村手毬',
              image: 'https://shop.asobistore.jp/simages/product_image_huge/4573685102001_220_gkmas_undokai_special_002_.jpg?1',
              url: 'https://shop.asobistore.jp/products/detail/219879-00-00-00',
              source: 'asobistore'
            }
          ]);
        });
    } else {
      // 他の作品はダミーデータ
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
    }
  }, [activeTag]);

  // 検索・カテゴリフィルタリング
  const filteredGoods = goods.filter(good => {
    const matchesSearch = good.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || good.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.ceil(filteredGoods.length / ITEMS_PER_PAGE);
  const paginatedGoods = filteredGoods.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1); // タグや検索が変わったら1ページ目に戻す
  }, [activeTag, searchTerm, selectedCategory]);

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
            <option value="manga">漫画</option>
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
          <a
            className="work-card"
            key={good.id || `good-${index}`}
            href={good.url}
            target="_blank"
            rel="noopener noreferrer"
          >
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
            <div className="work-info">
              <h3 className="work-title">{good.name}</h3>
              {good.source && <span className="work-category">{good.source}</span>}
            </div>
          </a>
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
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => setCurrentPage(i + 1)}
              className={currentPage === i + 1 ? 'active' : ''}
            >
              {i + 1}
            </button>
          ))}
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>次へ</button>
        </div>
      )}
    </div>
  );
}

export default Works; 