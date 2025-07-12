import React from 'react';
import './Home.css';

const dummyGoods = [
  { id: 1, title: 'グッズA', date: '2024/07/01' },
  { id: 2, title: 'グッズB', date: '2024/07/02' },
  { id: 3, title: 'グッズC', date: '2024/07/03' },
  { id: 4, title: 'グッズD', date: '2024/07/04' },
  { id: 5, title: 'グッズE', date: '2024/07/05' },
  { id: 6, title: 'グッズF', date: '2024/07/06' },
];

function Home() {
  return (
    <div className="home-container">
      <div className="tag-filter">
        <span>タグ：</span>
        <select>
          <option>すべて</option>
          <option>アニメ</option>
          <option>漫画</option>
        </select>
      </div>
      <div className="goods-list">
        {dummyGoods.map(good => (
          <div className="goods-card" key={good.id}>
            <div className="goods-img" />
            <div className="goods-title">{good.title}</div>
            <div className="goods-date">投稿日: {good.date}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Home; 