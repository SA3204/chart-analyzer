// sagarkhanal.com — Chart Analyzer API proxy
// Deploy on Railway / Render / VPS then point sagarkhanal.com/api → this server

require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const Anthropic = require('@anthropic-ai/sdk');

const app    = express();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Allow requests from your domain only
app.use(cors({
  origin: [
    'https://sagarkhanal.com',
    'https://www.sagarkhanal.com',
    'http://localhost:3000',  // for local dev
    'http://127.0.0.1:5500', // for VS Code Live Server
  ]
}));

app.use(express.json({ limit: '20mb' }));

app.get('/', (_req, res) => res.json({ status: 'sagarkhanal.com Chart API ✅' }));

app.post('/api/analyze', async (req, res) => {
  const { imageBase64, imageType, market, timeframe, style } = req.body;
  if (!imageBase64) return res.status(400).json({ error: 'No image provided' });

  const prompt = `You are a world-class technical analyst for ${market} market. Analyse this ${timeframe} chart.

Return ONLY valid JSON, no markdown:
{
  "signal": "BUY" or "SELL" or "HOLD",
  "confidence": "High" or "Medium" or "Low",
  "ticker": "symbol if visible else null",
  "trend": "Uptrend" or "Downtrend" or "Sideways",
  "support": "key support level or null",
  "resistance": "key resistance level or null",
  "entry_zone": "entry price zone or null",
  "stop_loss": "stop loss level or null",
  "target": "price target or null",
  "rr_ratio": "risk/reward ratio or null",
  "patterns": ["detected patterns"],
  "indicators": ["indicator readings visible"],
  "analysis": "4-6 sentence professional analysis",
  "risk": "one sentence risk warning"
}
${style === 'candlestick' ? 'Focus on candlestick patterns.' : ''}
${style === 'full' ? 'Include all indicators, volume, full price action.' : ''}
Market: ${market}, Timeframe: ${timeframe}.`;

  try {
    const msg = await client.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: imageType || 'image/jpeg', data: imageBase64 } },
          { type: 'text', text: prompt }
        ]
      }]
    });

    const raw    = msg.content.map(b => b.text || '').join('');
    const clean  = raw.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);
    res.json(result);

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message || 'Analysis failed' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`sagarkhanal.com Chart API running on :${PORT}`));
