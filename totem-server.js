const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const cloudinary = require('cloudinary').v2;

const app = express();
app.use(cors());
app.use(express.json());

// Configuración de Multer para manejo temporal de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'temp'),
  filename: (req, file, cb) => cb(null, file.originalname)
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'video/mp4', 'video/quicktime'];
    if (allowedTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Formato no permitido. Usa JPEG, PNG, MP4 o MOV.'));
  },
  limits: { fileSize: 100 * 1024 * 1024 }
});

// Crear carpeta temporal
const uploadsDir = path.join(__dirname, 'temp');
fs.mkdir(uploadsDir, { recursive: true });

// Configurar Cloudinary desde variable de entorno
cloudinary.config({
  cloud_name: 'ddhie4lad',
  api_key: '493144731521638',
  api_secret: 'BaXbAjm8dhSafVKBGY5g5liGjAo'
});

// Estado inicial
let state = {
  text: null,
  background: { type: 'color', value: '#F8E1E9' },
  media: null,
  logo: null
};
const stateFile = path.join(__dirname, 'state.json');

async function loadState() {
  try {
    const data = await fs.readFile(stateFile, 'utf8');
    state = JSON.parse(data);
  } catch (error) {
    // No se pudo cargar estado anterior
  }
}

async function saveState() {
  await fs.writeFile(stateFile, JSON.stringify(state));
}

loadState();

// Subida de archivos a Cloudinary
app.post('/upload', upload.single('media'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo' });
  try {
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'orionQR',
      resource_type: 'auto'
    });

    state.media = result.secure_url;
    state.text = null;
    state.logo = null;
    await saveState();
    await fs.unlink(req.file.path);
    res.json({ path: result.secure_url });
  } catch (error) {
    console.error('Error subiendo a Cloudinary:', error);
    res.status(500).json({ error: 'Error al subir a Cloudinary: ' + error.message });
  }
});

// Estado actual
app.get('/state', (req, res) => {
  res.json(state);
});

app.post('/state', (req, res) => {
  const { text, background, media, logo } = req.body;
  if (text !== undefined) state.text = text;
  if (background !== undefined) state.background = background;
  if (media !== undefined) state.media = media;
  if (logo !== undefined) state.logo = logo;
  saveState();
  res.json(state);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
