import axios from 'axios';
import * as cheerio from 'cheerio';

async function testRawHtml() {
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  
  try {
    const res = await axios.get('https://www.reddit.com/r/saas/new.rss', {
      headers: {
        'User-Agent': userAgent
      }
    });
    
    const $ = cheerio.load(res.data, { xmlMode: true });
    const rawHtml = $('entry').first().find('content').text();
    console.log('--- Raw HTML content of first entry ---');
    console.log(rawHtml);
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

testRawHtml();
