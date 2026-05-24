const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const fs = require('fs');
const puppeteer = require('puppeteer');
const mysql = require('mysql2/promise');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;

const dbEnabled =
  process.env.MYSQL_HOST &&
  process.env.MYSQL_PORT &&
  process.env.MYSQL_USER &&
  process.env.MYSQL_PASSWORD &&
  process.env.MYSQL_DATABASE;

const dbPool = dbEnabled
  ? mysql.createPool({
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
      ssl: {
        rejectUnauthorized: false
      }
    })
  : null;

function hashUrl(url) {
  return crypto.createHash('sha256').update(url).digest('hex');
}

async function initDb() {
  if (!dbPool) {
    console.warn('MySQL env is not configured');
    return;
  }

  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS goods (
      id INT AUTO_INCREMENT PRIMARY KEY,
      work_title VARCHAR(255) NOT NULL,
      source VARCHAR(50) NOT NULL,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      url_hash CHAR(64) NOT NULL,
      image TEXT,
      price VARCHAR(255),
      category VARCHAR(100),
      source_order INT NOT NULL DEFAULT 999999,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_goods_url_hash (url_hash),
      KEY idx_goods_work_title (work_title),
      KEY idx_goods_source (source),
      KEY idx_goods_source_order (work_title, source_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  const [columns] = await dbPool.query("SHOW COLUMNS FROM goods LIKE 'source_order'");
  if (columns.length === 0) {
    await dbPool.query('ALTER TABLE goods ADD COLUMN source_order INT NOT NULL DEFAULT 999999 AFTER category');
  }
}


async function saveGoodsToDb(items, workTitle) {
  if (!dbPool) {
    throw new Error('MySQL env is not configured');
  }

  const rows = items
    .filter(item => item && item.url && item.name)
    .map((item, index) => [
     workTitle,
     item.source || '',
     item.name,
     item.url,
     hashUrl(item.url),
     item.image || '',
     item.price || '',
     item.category || 'anime',
     item.sourceOrder ?? index    ]);
  if (rows.length === 0) {
    return { saved: 0, affectedRows: 0 };
  }

  const [result] = await dbPool.query(
    `
        INSERT INTO goods
        (work_title, source, name, url, url_hash, image, price, category, source_order)
        VALUES ?
        ON DUPLICATE KEY UPDATE
        work_title = VALUES(work_title),
        source = VALUES(source),
        name = VALUES(name),
        image = VALUES(image),
        price = VALUES(price),
        category = VALUES(category),
        source_order = VALUES(source_order),
        updated_at = CURRENT_TIMESTAMP
    `,
    [rows]
  );

  return {
    saved: rows.length,
    affectedRows: result.affectedRows
  };
}
// CORS設定
app.use(cors());
app.use(express.json());

// 仮のユーザーデータベース（実際のプロジェクトではデータベースを使用）
const users = [
  {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123' // 実際のプロジェクトではハッシュ化
  }
];

// セッション管理（実際のプロジェクトではJWTやセッションストアを使用）
const sessions = {};

// ログインAPI
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  // ユーザー認証
  const user = users.find(u => u.email === email && u.password === password);
  
  if (user) {
    // セッションIDを生成
    const sessionId = Math.random().toString(36).substring(2, 15);
    sessions[sessionId] = { userId: user.id, username: user.username };
    
    res.json({
      success: true,
      sessionId,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'メールアドレスまたはパスワードが正しくありません'
    });
  }
});

// ログアウトAPI
app.post('/api/logout', (req, res) => {
  const { sessionId } = req.body;
  
  if (sessions[sessionId]) {
    delete sessions[sessionId];
    res.json({ success: true });
  } else {
    res.status(400).json({ success: false, message: 'セッションが見つかりません' });
  }
});

// ユーザー登録API
app.post('/api/register', (req, res) => {
  const { username, email, password } = req.body;
  
  // 既存ユーザーチェック
  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'このメールアドレスは既に使用されています'
    });
  }
  
  // 新しいユーザーを作成
  const newUser = {
    id: users.length + 1,
    username,
    email,
    password
  };
  
  users.push(newUser);
  
  res.json({
    success: true,
    message: 'アカウントが正常に作成されました'
  });
});

// セッション確認API
app.get('/api/check-session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = sessions[sessionId];
  
  if (session) {
    const user = users.find(u => u.id === session.userId);
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } else {
    res.status(401).json({ success: false });
  }
});

// アニメイトのグッズ一覧を取得
app.get('/api/animate', async (req, res) => {
  try {
    const aid = req.query.aid || '3885';
    const maxPages = Number(req.query.maxPages || 12);
    const items = [];

    for (let page = 1; page <= maxPages; page++) {
      const url = `https://www.animate-onlineshop.jp/animetitle/index.php?aid=${aid}&nd[]=7&ss=8&sl=0&pageno=${page}`;

 let response;

for (let retry = 0; retry < 3; retry++) {
  try {
    response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8'
      }
    });
    break;
  } catch (error) {
    console.error(`animate page ${page} retry ${retry + 1} failed:`, error.message);

    if (retry === 2) {
      if (items.length > 0) {
        return res.json(items);
      }
      throw error;
    }

    await new Promise(resolve => setTimeout(resolve, 1200));
  }
}

const $ = cheerio.load(response.data);
      let foundItems = 0;

      $('li').each((index, element) => {
        const $item = $(element);
        const $link = $item.find('h3 a[href*="/pd/"]').first();

        if ($link.length === 0) return;

        const name = $link.text().trim();
        let link = $link.attr('href');
        let img = $item.find('.item_list_thumb img').attr('src');
        const price = $item.find('.item_list_detail .price').first().text().trim();

        if (link && !link.startsWith('http')) {
         link = 'https://www.animate-onlineshop.jp' + link;
        }

        if (img && !img.startsWith('http')) {
         img = 'https://www.animate-onlineshop.jp' + img;
        }
  
items.push({
  id: `animate-p${page}-${index}`,
  name,
  url: link,
  image: img || 'https://via.placeholder.com/120x120?text=No+Image',
  price: price || '価格未定',
  source: 'animate'
});

foundItems++;
      });

      if (foundItems === 0) {
        break;
      }
    }
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log(`Found ${items.length} items from animate`);
    res.json(items);
  } catch (error) {
    console.error('animate API error:', error.message);
    res.status(500).json({
      error: 'アニメイトからデータを取得できませんでした',
      message: error.message
    });
  }
});
  
// asobistoreのグッズ一覧を取得（全ページ対応）
app.get('/api/asobistore', async (req, res) => {
  try {
    const category = req.query.category || '10107';
    let page = 1;
    let hasNext = true;
    const allItems = [];
    const maxPages = Number(req.query.maxPages || 50);    while (hasNext && page <= maxPages) {
      const url = `https://shop.asobistore.jp/product/catalog/s/newer/n/30/t/category/ca/${category}/p/${page - 1}`;
      console.log(`Fetching asobistore: ${url}`);
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      // デバッグ用に1ページ目だけ保存
      if (page === 1) {
        fs.writeFileSync('asobistore_debug.html', response.data);
        console.log('HTML saved to asobistore_debug.html');
      }
      const $ = cheerio.load(response.data);
      let foundItems = 0;
      // asobistoreの実際のページ構造に対応したセレクター
      $('.item_box, .product-item, .goods-item, .item, .product').each((index, element) => {
        const $item = $(element);
        const $nameElement = $item.find('.name.product_name_area a, .product-name a, .item-name a, h3 a, h4 a, .name a, a[href*="/products/detail/"]');
        const $priceElement = $item.find('.selling_price, .price, .product-price, .price_area');
        const $imageElement = $item.find('img');
        if ($nameElement.length > 0) {
          const name = $nameElement.text().trim();
          const url = $nameElement.attr('href').startsWith('http') ? $nameElement.attr('href') : 'https://shop.asobistore.jp' + $nameElement.attr('href');
          const price = $priceElement.text().trim();
          let imageUrl = $imageElement.attr('data-src') || $imageElement.attr('src');
          if (imageUrl && !imageUrl.startsWith('http')) {
            if (!imageUrl.startsWith('/')) imageUrl = '/' + imageUrl;
            imageUrl = 'https://shop.asobistore.jp' + imageUrl;
          }
          const image = imageUrl || 'https://via.placeholder.com/120x120?text=No+Image';
          allItems.push({
            id: `asobistore-p${page}-${index}`,
            name,
            url,
            image,
            price,
            source: 'asobistore',
            category: 'anime'
          });
          foundItems++;
        }
      });
      // 次ページがあるか判定（ページネーションの「次へ」ボタンまたは「⇒」を確認）
      const nextButton = $('a[href*="/p/"]').filter(function() {
        const text = $(this).text().trim();
        return text.includes('次へ') || text.includes('⇒') || text.includes('>');
      });
      const hasNextPage = nextButton.length > 0 && foundItems > 0;
      hasNext = hasNextPage;
      console.log(`Page ${page}: Found ${foundItems} items, hasNext: ${hasNextPage}`);
      page++;
    }
    if (allItems.length === 0) {
      console.log('No items found, returning dummy data');
      allItems.push(
        {
          id: 'asobistore-dummy-1',
          name: '学園アイドルマスター Tシャツ 藤田ことね',
          url: 'https://shop.asobistore.jp/products/detail/222916-00-00-00',
          image: 'https://shop.asobistore.jp/simages/product_image_middle/4573685119337_photobook.jpg?1',
          price: '3,900円(税込)',
          source: 'asobistore'
        },
        {
          id: 'asobistore-dummy-2',
          name: '学園アイドルマスター Tシャツ 月村手毬',
          url: 'https://shop.asobistore.jp/products/detail/222915-00-00-00',
          image: 'https://shop.asobistore.jp/simages/product_image_middle/4573685119337_photobook.jpg?1',
          price: '3,900円(税込)',
          source: 'asobistore'
        },
        {
          id: 'asobistore-dummy-3',
          name: '学園アイドルマスター Tシャツ 花海咲季',
          url: 'https://shop.asobistore.jp/products/detail/222914-00-00-00',
          image: 'https://shop.asobistore.jp/simages/product_image_middle/4573685119337_photobook.jpg?1',
          price: '3,900円(税込)',
          source: 'asobistore'
        }
      );
    }
    console.log(`Found ${allItems.length} items from asobistore (all pages)`);
    res.json(allItems);
  } catch (error) {
    console.error('Error fetching from asobistore:', error.message);
    res.status(500).json({ error: 'Failed to fetch from asobistore' });
  }
});

// amiamiのグッズ一覧を取得
app.get('/api/amiami', async (req, res) => {
  try {
    const originaltitle_id = req.query.originaltitle_id || '36257';
    const url = `https://slist.amiami.jp/top/search/list?s_originaltitle_id=${originaltitle_id}&pagemax=40&getcnt=0&pagecnt=2`;
    
    console.log(`Fetching amiami: ${url}`);
    // Puppeteerでページ取得
   let browser;
let html;

try {
  browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setDefaultNavigationTimeout(20000);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

  await new Promise(resolve => setTimeout(resolve, 3000));
  html = await page.content();
} finally {
  if (browser) {
    await browser.close();
  }
}
    
    // HTMLをファイルに保存してデバッグ
    fs.writeFileSync('amiami_debug.html', html);
    console.log('HTML saved to amiami_debug.html');
    
    const $ = cheerio.load(html);
    const items = [];
    
    // HTML構造を詳細にデバッグ
    console.log('=== Amiami HTML structure debug ===');
    console.log('Page title:', $('title').text());
    console.log('Total elements with .item-list:', $('.item-list').length);
    console.log('Total elements with .item:', $('.item').length);
    console.log('Total elements with .product-item:', $('.product-item').length);
    console.log('Total elements with .item-name:', $('.item-name').length);
    console.log('Total elements with .product-name:', $('.product-name').length);
    console.log('Total elements with .name:', $('.name').length);
    console.log('Total elements with .title:', $('.title').length);
    
    // より広範囲のセレクターで商品を探す
    const possibleSelectors = [
      '.item-list .item',
      '.product-item',
      '.item',
      '.product',
      '.goods-item',
      '.item-list li',
      '.product-list li'
    ];
    
    for (const selector of possibleSelectors) {
      const elements = $(selector);
      console.log(`Amiami selector "${selector}" found ${elements.length} elements`);
      
      if (elements.length > 0) {
        elements.each((i, el) => {
          const $el = $(el);
          
          // 商品名を探す
          let name = $el.find('.item-name').text().trim() ||
                    $el.find('.product-name').text().trim() ||
                    $el.find('.name').text().trim() ||
                    $el.find('h3').text().trim() ||
                    $el.find('h4').text().trim();
          
          // リンクを探す
          let link = $el.find('a').attr('href');
          
          // 画像を探す
          let img = $el.find('img').attr('src') || $el.find('img').attr('data-src');
          
          if (name && link) {
            items.push({
              id: `amiami-${i}`,
              name: name,
              url: link.startsWith('http') ? link : `https://slist.amiami.jp${link}`,
              image: img ? (img.startsWith('http') ? img : `https://slist.amiami.jp${img}`) : 'https://via.placeholder.com/120x120?text=No+Image',
              source: 'amiami'
            });
          }
        });
        if (items.length > 0) {
          break;
        }
      }
    }
    
    // 商品が見つからない場合はダミーデータを返す
    if (items.length === 0) {
      console.log('No amiami items found, returning dummy data');
      items.push(
        {
          id: 'amiami-dummy-1',
          name: '学園アイドルマスター グッズ（amiami）',
          url: 'https://slist.amiami.jp/top/detail/detail?gcode=GOODS-123456',
          image: 'https://img.amiami.jp/images/product/main/242/GOODS-123456.jpg',
          source: 'amiami'
        }
      );
    }
    
    console.log(`Found ${items.length} items from amiami`);
    res.json(items);
    
  } catch (error) {
    console.error('amiami API error:', error.message);
    res.status(500).json({ 
      error: 'amiamiからデータを取得できませんでした',
      message: error.message 
    });
  }
});

// 学園アイドルマスター専用エンドポイント（全ページ収集）
// 学園アイドルマスター専用エンドポイント
app.get('/api/gakuen-idolmaster', async (req, res) => {
  try {
    console.log('Fetching all 学園アイドルマスター goods...');

    const [asobistoreRes, animateRes] = await Promise.allSettled([
      axios.get(`http://localhost:${PORT}/api/asobistore?category=10107&maxPages=7`, { timeout: 25000 }),
      axios.get(`http://localhost:${PORT}/api/animate?aid=18937&maxPages=20`, { timeout: 25000 })
    ]);

    const allItems = [];

    if (asobistoreRes.status === 'fulfilled') {
      allItems.push(...asobistoreRes.value.data);
    } else {
      console.error('asobistore failed:', asobistoreRes.reason.message);
    }

    if (animateRes.status === 'fulfilled') {
      allItems.push(...animateRes.value.data);
    } else {
      console.error('animate failed:', animateRes.reason.message);
    }

    console.log(`Total 学園アイドルマスター items found: ${allItems.length}`);
    res.json(allItems);
  } catch (error) {
    console.error('学園アイドルマスター API error:', error.message);
    res.status(500).json({
      error: '学園アイドルマスターのグッズデータを取得できませんでした',
      message: error.message
    });
  }
});

// 僕のヒーローアカデミア専用エンドポイント
app.get('/api/my-hero-academia', async (req, res) => {
  try {
    console.log('Fetching all 僕のヒーローアカデミア goods from animate...');
    
    // アニメイトから僕のヒーローアカデミア商品を取得
    const animateRes = await axios.get(`http://localhost:${PORT}/api/animate?aid=3885`);
    
    const allItems = animateRes.data;
    
    console.log(`Total 僕のヒーローアカデミア items found: ${allItems.length}`);
    res.json(allItems);
    
  } catch (error) {
    console.error('僕のヒーローアカデミア API error:', error.message);
    res.status(500).json({ 
      error: '僕のヒーローアカデミアのグッズデータを取得できませんでした',
      message: error.message 
    });
  }
});

// 作品名から両サイトのグッズを取得
app.get('/api/goods/:title', async (req, res) => {
  try {
    const title = req.params.title;
    console.log(`Fetching goods for: ${title}`);
    
    // 作品名とカテゴリIDのマッピング
    const titleMapping = {
      '学園アイドルマスター': {
        asobistore: '10107',
        amiami: '36257'
      }
      // 他の作品も追加可能
    };
    
    const mapping = titleMapping[title];
    if (!mapping) {
      return res.json([]);
    }
    
    // 両サイトから並行取得
    const [asobistoreRes, amiamiRes] = await Promise.allSettled([
      axios.get(`http://localhost:${PORT}/api/asobistore?category=${mapping.asobistore}`),
      axios.get(`http://localhost:${PORT}/api/amiami?originaltitle_id=${mapping.amiami}`)
    ]);
    
    const allItems = [];
    
    if (asobistoreRes.status === 'fulfilled') {
      allItems.push(...asobistoreRes.value.data);
    }
    
    if (amiamiRes.status === 'fulfilled') {
      allItems.push(...amiamiRes.value.data);
    }
    
    console.log(`Total items found: ${allItems.length}`);
    res.json(allItems);
    
  } catch (error) {
    console.error('Combined API error:', error.message);
    res.status(500).json({ 
      error: 'グッズデータを取得できませんでした',
      message: error.message 
    });
  }
});
app.get('/api/db/health', async (req, res) => {
  try {
    if (!dbPool) {
      return res.status(500).json({ ok: false, error: 'MySQL env is not configured' });
    }

    await initDb();
    const [rows] = await dbPool.query('SELECT 1 AS ok');

    res.json({ ok: true, db: rows[0].ok });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/api/db/goods', async (req, res) => {
  try {
    if (!dbPool) {
      return res.status(500).json({ error: 'MySQL env is not configured' });
    }

    const workTitle = req.query.workTitle;
    const source = req.query.source;
    const limit = Math.min(Number(req.query.limit || 500), 1000);

    const where = [];
    const params = [];

    if (workTitle) {
      where.push('work_title = ?');
      params.push(workTitle);
    }

    if (source) {
      where.push('source = ?');
      params.push(source);
    }

    params.push(limit);

    const [rows] = await dbPool.query(
      `
        SELECT id, work_title, source, name, url, image, price, category, created_at, updated_at
        FROM goods
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY
        CASE source
        WHEN 'asobistore' THEN 1
        WHEN 'animate' THEN 2
        WHEN 'amiami' THEN 3
        ELSE 9
        END,
        source_order ASC,
        id ASC
        LIMIT ?
        '
      params
      `
    );

    res.json(rows.map(row => ({
      id: `db-${row.id}`,
      workTitle: row.work_title,
      source: row.source,
      name: row.name,
      url: row.url,
      image: row.image,
      price: row.price,
      category: row.category,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    })));
  } catch (error) {
    res.status(500).json({ error: 'DBから商品情報を取得できませんでした', message: error.message });
  }
});

async function syncGakuenIdolmasterGoods(req, res) {
  try {
    if (!dbPool) {
      return res.status(500).json({ error: 'MySQL env is not configured' });
    }

    await initDb();

    const asobistorePages = Number(req.query.asobistorePages || 20);
    const animatePages = Number(req.query.animatePages || 20);

    const [asobistoreRes, animateRes] = await Promise.allSettled([
      axios.get(`http://localhost:${PORT}/api/asobistore?category=10107&maxPages=${asobistorePages}`, { timeout: 30000 }),
      axios.get(`http://localhost:${PORT}/api/animate?aid=18937&maxPages=${animatePages}`, { timeout: 30000 })
    ]);

    const items = [];

  if (asobistoreRes.status === 'fulfilled') {
  const asobistoreItems = asobistoreRes.value.data.map((item, index) => ({
    ...item,
    sourceOrder: index
  }));
  items.push(...asobistoreItems);
}

    if (animateRes.status === 'fulfilled') {
  const animateItems = animateRes.value.data.map((item, index) => ({
    ...item,
    sourceOrder: index
  }));
  items.push(...animateItems);
}

    const result = await saveGoodsToDb(items, '学園アイドルマスター');

    res.json({
      success: true,
      fetched: items.length,
      saved: result.saved,
      affectedRows: result.affectedRows
    });
  } catch (error) {
    res.status(500).json({
      error: 'DB保存に失敗しました',
      message: error.message
    });
  }
}

app.get('/api/db/sync/gakuen-idolmaster', syncGakuenIdolmasterGoods);
app.post('/api/db/sync/gakuen-idolmaster', syncGakuenIdolmasterGoods);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API server running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log(`  POST /api/login - ログイン`);
  console.log(`  POST /api/logout - ログアウト`);
  console.log(`  POST /api/register - ユーザー登録`);
  console.log(`  GET /api/check-session/:sessionId - セッション確認`);
  console.log(`  GET /api/asobistore?category=10107`);
  console.log(`  GET /api/amiami?originaltitle_id=36257`);
  console.log(`  GET /api/animate?aid=3885`);
  console.log(`  GET /api/goods/学園アイドルマスター`);
  console.log(`  GET /api/gakuen-idolmaster (学園アイドルマスター専用)`);
  console.log(`  GET /api/my-hero-academia (僕のヒーローアカデミア専用)`);
  initDb().catch(error => {
  console.error('DB init error:', error.message);
});
}); 