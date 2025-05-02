const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const { Dropbox } = require('dropbox');

const app = express();
app.use(cors());
app.use(express.json());

// Configuración de Multer para manejar la subida temporal
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'temp'); // Carpeta temporal para procesar el archivo
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'video/mp4', 'video/quicktime'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Formato no permitido. Usa JPEG, PNG, MP4 o MOV.'));
    }
  },
  limits: { fileSize: 100 * 1024 * 1024 } // Límite de 100 MB
});

const uploadsDir = path.join(__dirname, 'temp');
fs.mkdir(uploadsDir, { recursive: true });

// Estado inicial
let state = {
  text: null,
  background: { type: 'color', value: '#F8E1E9' },
  media: null
};
const stateFile = path.join(__dirname, 'state.json');

async function loadState() {
  try {
    const data = await fs.readFile(stateFile, 'utf8');
    state = JSON.parse(data);
  } catch (error) {
    // Mantén el estado inicial
  }
}

async function saveState() {
  await fs.writeFile(stateFile, JSON.stringify(state));
}

loadState();

// Configura el cliente de Dropbox con el access token generado
const dbx = new Dropbox({
  clientId: 'nsuaumqkjz76k05',
  clientSecret: '9v9z75jb04q9klc',
  accessToken: process.env.DROPBOX_ACCESS_TOKEN, // Usar variable de entorno para mayor seguridad
  fetch: fetch // Usar fetch nativo de Node.js
});

// Endpoint para subir archivos a Dropbox
app.post('/upload', upload.single('media'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se subió ningún archivo' });
  }
  try {
    // Sube el archivo a la carpeta 'orionQR'
    const fileContent = await fs.readFile(req.file.path);
    const response = await dbx.filesUpload({
      path: '/orionQR/' + req.file.originalname, // Sube a la carpeta orionQR
      contents: fileContent,
      autorename: true // Renombra si el archivo ya existe
    });

    // Obtén la URL compartida
    const shareLink = await dbx.sharingCreateSharedLinkWithSettings({
      path: response.result.path_display
    });
    const mediaUrl = shareLink.result.url.replace('dl=0', 'dl=1'); // URL para descarga directa

    state.media = mediaUrl;
    state.text = null;
    await saveState();
    // Elimina el archivo temporal
    await fs.unlink(req.file.path);
    res.json({ path: mediaUrl });
  } catch (error) {
    console.error('Error subiendo a Dropbox:', error);
    res.status(500).json({ error: 'Error al subir a Dropbox: ' + error.message });
  }
});

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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
