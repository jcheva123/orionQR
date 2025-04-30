const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

const app = express();
app.use(cors());
app.use(express.json());

// Configuración de Multer para subir archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'Uploads');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = Date.now() + '-' + Math.random().toString(36).substring(2, 15) + ext;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'video/mp4'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Formato no permitido. Usa JPEG, PNG o MP4.'));
    }
  },
  limits: { fileSize: 100 * 1024 * 1024 }
});

const uploadsDir = path.join(__dirname, 'Uploads');
fs.mkdir(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// Estado inicial
let state = {
  text: null,
  background: { type: 'color', value: '#F8E1E9' },
  media: null
};
const stateFile = path.join(__dirname, 'state.json');

// Cargar estado inicial
async function loadState() {
  try {
    const data = await fs.readFile(stateFile, 'utf8');
    state = JSON.parse(data);
  } catch (error) {
    state = {
      text: null,
      background: { type: 'color', value: '#F8E1E9' },
      media: null
    };
  }
}

async function saveState() {
  await fs.writeFile(stateFile, JSON.stringify(state));
}

loadState();

// Endpoints
app.get('/state', (req, res) => {
  res.json(state);
});

app.post('/state', (req, res) => {
  const { text, background, media } = req.body;
  if (text !== undefined) state.text = text;
  if (background !== undefined) state.background = background;
  if (media !== undefined) state.media = media;
  saveState();
  res.json(state);
});

app.post('/upload', upload.single('media'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se subió ningún archivo' });
  }
  const filePath = `/uploads/${req.file.filename}`;
  state.media = filePath;
  state.text = null; // Clear text when uploading media
  saveState();
  res.json({ path: filePath });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
