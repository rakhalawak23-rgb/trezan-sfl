const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Gunakan plugin Stealth agar Puppeteer tidak terdeteksi sebagai bot Cloudflare
puppeteer.use(StealthPlugin());

const app = express();

// Izinkan akses CORS dari frontend website Trezan Bypass
app.use(cors({ origin: '*' }));
app.use(express.json());

// Endpoint status server
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    engine: 'Trezan Bypass Puppeteer API v1.0',
    timestamp: new Date().toISOString()
  });
});

// Endpoint Utama Bypass
app.get('/api/bypass', async (req, res) => {
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).json({
      success: false,
      error: 'Parameter "url" wajib disertakan. Contoh: /api/bypass?url=https://sfl.gl/7H6i5pU'
    });
  }

  let browser = null;

  try {
    console.log(`[Bypass Engine] Memproses URL: ${targetUrl}`);

    // Jalankan Puppeteer dengan parameter kompatibel untuk server cloud (Render / Railway / VPS)
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();

    // Set User-Agent browser asli (Chrome Desktop)
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
    );

    // Optimize speed: Blokir loading gambar, stylesheet, dan font
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // Buka link sfl.gl
    await page.goto(targetUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Tunggu proses redirect sfl.gl -> app.khaddavi.net / link tujuan
    let currentUrl = page.url();
    const startTime = Date.now();

    while (Date.now() - startTime < 8000) {
      currentUrl = page.url();
      if (!currentUrl.includes('sfl.gl') && currentUrl !== targetUrl) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Cari tautan langsung jika ada di elemen <a> halaman tujuan
    try {
      const directHref = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href]'));
        for (const a of links) {
          const href = a.href;
          if (href && !href.includes('sfl.gl') && !href.includes('khaddavi') && href.startsWith('http')) {
            return href;
          }
        }
        return null;
      });

      if (directHref) {
        currentUrl = directHref;
      }
    } catch (e) {}

    const finalDestination = currentUrl;
    await browser.close();

    console.log(`[Bypass Engine] Hasil: ${finalDestination}`);

    if (finalDestination && finalDestination !== targetUrl) {
      return res.json({
        success: true,
        originalUrl: targetUrl,
        destinationUrl: finalDestination
      });
    } else {
      return res.status(422).json({
        success: false,
        error: 'Gagal mengekstrak URL tujuan. Shortlink memerlukan verifikasi CAPTCHA manual.'
      });
    }

  } catch (err) {
    if (browser) await browser.close();
    console.error('[Bypass Engine Error]:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan internal server: ' + err.message
    });
  }
});

// Port binding untuk Render / Cloud Hosting
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server Trezan Bypass aktif di port ${PORT}`);
});
