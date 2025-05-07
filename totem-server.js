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

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'Uploads/');
  },
  filename: (req, file, cb) => {
    const totemId = req.body.totemId || 'totem1';
    const ext = path.extname(file.originalname);
    cb(null, `${totemId}-${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

// State storage
const states = {
  totem1: { background: { type: 'color', value: '#F8E1E9' } },
  totem2: { background: { type: 'color', value: '#F8E1E9' } },
  totem3: { background: { type: 'color', value: '#F8E1E9' } }
};

// Routes
app.post('/upload', upload.single('media'), (req, res) => {
  if (!req.file) {
    console.error('Upload error: No file uploaded'); // Debug
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const filePath = `/uploads/${req.file.filename}`;
  console.log('Uploaded file:', { totemId: req.body.totemId, path: filePath }); // Debug
  res.json({ path: filePath });
});

app.post('/state', (req, res) => {
  const { totemId } = req.body;
  if (!['totem1', 'totem2', 'totem3'].includes(totemId)) {
    console.error('Invalid totemId:', totemId); // Debug
    return res.status(400).json({ error: 'Invalid totemId' });
  }
  states[totemId] = req.body;
  console.log('Stored state:', { totemId, state: req.body }); // Debug
  res.json({ success: true });
});

app.get('/state/:totemId', (req, res) => {
  const { totemId } = req.params;
  if (!['totem1', 'totem2', 'totem3'].includes(totemId)) {
    console.error('Invalid totemId for GET:', totemId); // Debug
    return res.status(400).json({ error: 'Invalid totemId' });
  }
  const state = states[totemId] || { background: { type: 'color', value: '#F8E1E9' } };
  console.log('Retrieved state:', { totemId, state }); // Debug
  res.json(state);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
