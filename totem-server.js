const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, res, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// In-memory state for each totem
const totemStates = {
  totem1: { text: null, background: { type: 'color', value: '#F8E1E9' }, media: null },
  totem2: { text: null, background: { type: 'color', value: '#F8E1E9' }, media: null },
  totem3: { text: null, background: { type: 'color', value: '#F8E1E9' }, media: null }
};

// Upload endpoint
app.post('/upload', upload.single('media'), (req, res) => {
  try {
    const totemId = req.body.totemId;
    if (!['totem1', 'totem2', 'totem3'].includes(totemId)) {
      return res.status(400).json({ error: 'Invalid totemId' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const filePath = `/uploads/${req.file.filename}`;
    res.json({ path: filePath });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// State update endpoint
app.post('/state', (req, res) => {
  try {
    const { totemId, text, background, media } = req.body;
    if (!['totem1', 'totem2', 'totem3'].includes(totemId)) {
      return res.status(400).json({ error: 'Invalid totemId' });
    }
    totemStates[totemId] = { text, background, media };
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// State retrieval endpoint for display
app.get('/state/:totemId', (req, res) => {
  const totemId = req.params.totemId;
  if (!['totem1', 'totem2', 'totem3'].includes(totemId)) {
    return res.status(400).json({ error: 'Invalid totemId' });
  }
  res.json(totemStates[totemId]);
});

// Serve control and display pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/display/:totemId', (req, res) => {
  res.sendFile(path.join(__dirname, 'display.html'));
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
