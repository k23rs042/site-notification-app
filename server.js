const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const fs = require('fs');
const puppeteer = require('puppeteer');

const app = express();
const PORT = 3001;

// CORS設定
app.use(cors());
app.use(express.json());

// asobistoreのグッズ一覧を取得（全ページ対応）
app.get('/api/asobistore', async (req, res) => {
  try {
    const category = req.query.category || '10107';
    let page = 1;
    let hasNext = true;
    const allItems = [];
    while (hasNext) {
      const url = `https://shop.asobistore.jp/category/${category}/` + (page > 1 ? `?p=${page}` : '');
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
      $('.item_box').each((index, element) => {
        const $item = $(element);
        const $nameElement = $item.find('.name.product_name_area a');
        const $priceElement = $item.find('.selling_price');
        const $imageElement = $item.find('img');
        if ($nameElement.length > 0) {
          const name = $nameElement.text().trim();
          const url = 'https://shop.asobistore.jp' + $nameElement.attr('href');
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
      // 次ページがあるか判定（li.nextが存在し、disabledでなければ続行）
      const nextLi = $('.pagination li.next');
      const isNextDisabled = nextLi.hasClass('disabled') || nextLi.attr('aria-disabled') === 'true';
      hasNext = nextLi.length > 0 && !isNextDisabled && foundItems > 0;
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
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });
    const html = await page.content();
    await browser.close();
    
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

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log(`  GET /api/asobistore?category=10107`);
  console.log(`  GET /api/amiami?originaltitle_id=36257`);
  console.log(`  GET /api/goods/学園アイドルマスター`);
}); 