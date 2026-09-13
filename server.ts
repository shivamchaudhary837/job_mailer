import express from 'express';
import path from 'path';
import testSmtpHandler from './api/test-smtp';
import sendBatchHandler from './api/send-batch';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '4mb' }));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Mock Vercel Request/Response for our existing handlers
const wrapHandler = (handler: any) => async (req: express.Request, res: express.Response) => {
  try {
    // Vercel handlers expect req.body to be parsed, which express.json() handles
    await handler(req, res);
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

app.post('/api/test-smtp', wrapHandler(testSmtpHandler));
app.post('/api/send-batch', wrapHandler(sendBatchHandler));

// Catch-all to serve index.html for the SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`
🚀 Server ready at http://localhost:${PORT}
No Vercel login required.
  `);
});
