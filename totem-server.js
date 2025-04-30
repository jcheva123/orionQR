const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 4000;

// Configuración de Multer para subir archivos
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'video/mp4'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten JPEG, PNG o MP4'));
    }
  },
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Servir archivos estáticos desde public/
app.use(express.static(path.join(__dirname, 'public')));

// Estado inicial del totem
let totemState = { type: 'color', value: '#F8E1E9' };

// Crear directorio uploads si no existe
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Ruta para obtener el estado
app.get('/state', (req, res) => {
  res.json(totemState);
});

// Ruta para actualizar el estado
app.post('/state', (req, res) => {
  const { type, value } = req.body;
  if (!type || !value) {
    return res.status(400).json({ error: 'Faltan parámetros' });
  }
  if (!['color', 'media', 'messages'].includes(type)) {
    return res.status(400).json({ error: 'Tipo inválido' });
  }
  totemState = { type, value };
  res.json({ success: true });
});

// Ruta para subir archivos
app.post('/upload', upload.single('media'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se subió ningún archivo' });
  }
  const filePath = `/uploads/${req.file.filename}`;
  res.json({ path: filePath });
});

app.listen(port, () => {
  console.log(`Servidor del totem corriendo en http://localhost:${port}`);
});