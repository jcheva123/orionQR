const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const { google } = require('googleapis');

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

// Configuración de Google Sheets API
const auth = new google.auth.GoogleAuth({
  keyFile: 'nube-de-palabras-458413-497eea29e123.json', // Archivo de credenciales
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = '1vxgtdTKBrAFMcSNnlpNza5RreQemwOZDuB8XuDBL-Ho'; // ID del Google Sheet

// Estado inicial
let state = { type: 'color', value: '#F8E1E9' };
let messages = [];
let wordCloudData = [];
const stateFile = path.join(__dirname, 'state.json');

// Cargar estado inicial
async function loadState() {
  try {
    const data = await fs.readFile(stateFile, 'utf8');
    state = JSON.parse(data);
  } catch (error) {
    state = { type: 'color', value: '#F8E1E9' };
  }
}

async function saveState() {
  await fs.writeFile(stateFile, JSON.stringify(state));
}

loadState();

// Leer mensajes y palabras del Google Sheet
async function fetchFromGoogleSheets() {
  try {
    // Leer mensajes
    const messagesRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Mensajes!A2:B'
    });
    messages = (messagesRes.data.values || []).map((row, index) => ({
      id: index,
      text: row[0] || '',
      timestamp: row[1] || new Date().toISOString()
    }));

    // Leer palabras para la nube
    const wordsRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Palabras!A2:C'
    });
    wordCloudData = (wordsRes.data.values || []).map((row, index) => ({
      id: index,
      text: row[0] || '',
      frequency: parseInt(row[1], 10) || 1,
      timestamp: row[2] || new Date().toISOString()
    }));

    // Publicar mensajes automáticamente (rotar cada 10s)
    if (messages.length > 0) {
      const currentIndex = state.index !== undefined ? (state.index + 1) % messages.length : 0;
      const currentMessage = messages[currentIndex];
      state = {
        type: 'messages',
        value: currentMessage.text,
        index: currentIndex
      };
      await saveState();
    }
  } catch (error) {
    console.error('Error fetching from Google Sheets:', error);
  }
}

// Actualizar datos cada 10 segundos
setInterval(fetchFromGoogleSheets, 10000);
fetchFromGoogleSheets();

// Endpoints existentes
app.get('/state', (req, res) => {
  res.json(state);
});

app.post('/state', (req, res) => {
  state = req.body;
  saveState();
  res.json(state);
});

app.post('/upload', upload.single('media'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se subió ningún archivo' });
  }
  const filePath = `/uploads/${req.file.filename}`;
  state = { type: 'media', value: filePath };
  saveState();
  res.json({ path: filePath });
});

// Endpoints para la nube de palabras y gestión del coordinador
app.get('/wordcloud', (req, res) => {
  res.json(wordCloudData);
});

// Endpoint para que el coordinador elimine mensajes o palabras
app.delete('/manage/:type/:id', (req, res) => {
  const { type, id } = req.params;
  const idNum = parseInt(id, 10);

  if (type === 'message') {
    messages = messages.filter(msg => msg.id !== idNum);
    // Actualizar el Sheet
    sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Mensajes!A${idNum + 2}:B${idNum + 2}`,
      valueInputOption: 'RAW',
      resource: { values: [['', '']] }
    });
    // Actualizar el estado si el mensaje eliminado era el actual
    if (messages.length > 0) {
      const currentIndex = state.index !== undefined ? state.index % messages.length : 0;
      const currentMessage = messages[currentIndex];
      state = { type: 'messages', value: currentMessage.text, index: currentIndex };
    } else {
      state = { type: 'color', value: '#F8E1E9' };
    }
    saveState();
  } else if (type === 'word') {
    wordCloudData = wordCloudData.filter(word => word.id !== idNum);
    // Actualizar el Sheet
    sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Palabras!A${idNum + 2}:C${idNum + 2}`,
      valueInputOption: 'RAW',
      resource: { values: [['', '', '']] }
    });
  }

  res.json({ success: true });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
