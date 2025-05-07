const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Ensure /tmp/uploads directory exists
const uploadDir = '/tmp/uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 60 * 1024 * 1024 }, // 60MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'video/mp4', 'video/quicktime'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Formato de archivo no soportado. Usa JPEG, PNG, MP4 o MOV.'), false);
    }
  }
});

// Serve uploaded files statically
app.use('/uploads', express.static(uploadDir));

// Store state for each totem
const totemStates = {};

// Endpoint to get state
app.get('/state/:totemId', (req, res) => {
  const { totemId } = req.params;
  const state = totemStates[totemId] || { background: { type: 'color', value: '#F8E1E9' } };
  console.log('Retrieved state:', { totemId, state });
  res.json(state);
});

// Endpoint to set state
app.post('/state', (req, res) => {
  const { totemId, text, background, media } = req.body;
  if (!totemId) {
    console.error('Invalid totemId:', totemId);
    return res.status(400).json({ error: 'TotemId requerido' });
  }
  totemStates[totemId] = { text, background, media };
  console.log('Stored state:', { totemId, state: totemStates[totemId] });
  res.json({ success: true });
});

// Endpoint to upload media
app.post('/upload', upload.single('media'), (req, res) => {
  try {
    if (!req.file) {
      console.error('No file uploaded');
      return res.status(400).json({ error: 'No se seleccionó ningún archivo' });
    }
    const filePath = `/uploads/${req.file.filename}`;
    console.log('File uploaded:', { filename: req.file.filename, path: filePath, size: req.file.size });
    res.json({ path: filePath });
  } catch (error) {
    console.error('Upload error:', error.message);
    res.status(500).json({ error: error.message || 'Error al subir archivo' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
