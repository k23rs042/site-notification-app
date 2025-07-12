import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Works.css';

const favoriteTitles = [
  '進撃の巨人',
  '鬼滅の刃',
  'ワンピース',
  'ドラえもん',
  'スパイファミリー',
  '呪術廻戦',
  '名探偵コナン',
  'チェンソーマン',
  'ハイキュー!!',
  '僕のヒーローアカデミア',
  '学園アイドルマスター',
];

function Favorites() {
  const navigate = useNavigate();
  return (
    <div className="works-container">
      <h2>お気に入りの作品</h2>
      <div className="tag-list">
        {favoriteTitles.map(title => (
          <button
            key={title}
            className="work-tag"
            onClick={() => navigate(`/works/${encodeURIComponent(title)}`)}
          >
            {title}
          </button>
        ))}
      </div>
    </div>
  );
}

export default Favorites; 