// Lista de palabras prohibidas
const forbiddenWords = ['groseria', 'insulto', 'ofensa'];

// Validar contenido
function validateContent(text) {
  return !forbiddenWords.some((word) => text.toLowerCase().includes(word));
}

// Manejar solicitudes
addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  // CORS Headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Manejar CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // POST /api/messages - Recibir mensajes del formulario
  if (path === '/api/messages' && request.method === 'POST') {
    const data = await request.json();
    const { name, phone, word, message } = data;

    if (!name || !phone || !word || !message) {
      return new Response(JSON.stringify({ error: 'Todos los campos son requeridos' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (!validateContent(word) || !validateContent(message)) {
      return new Response(JSON.stringify({ error: 'Contenido no apropiado' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const messageId = Date.now().toString();
    const messageData = {
      id: messageId,
      name,
      phone,
      word,
      message,
      status: 'pending',
    };

    // Guardar en KV
    await EVENTO_KV.put(`message:${messageId}`, JSON.stringify(messageData));

    return new Response(JSON.stringify({ success: 'Mensaje enviado con éxito' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  // GET /api/messages/pending - Obtener mensajes pendientes (panel del operador)
  if (path === '/api/messages/pending' && request.method === 'GET') {
    const { keys } = await EVENTO_KV.list({ prefix: 'message:' });
    const messages = [];

    for (const key of keys) {
      const message = await EVENTO_KV.get(key.name, 'json');
      if (message.status === 'pending') {
        messages.push(message);
      }
    }

    return new Response(JSON.stringify(messages), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  // GET /api/messages/approved - Obtener mensajes aprobados (muro de mensajes)
  if (path === '/api/messages/approved' && request.method === 'GET') {
    const { keys } = await EVENTO_KV.list({ prefix: 'message:' });
    const messages = [];

    for (const key of keys) {
      const message = await EVENTO_KV.get(key.name, 'json');
      if (message.status === 'approved') {
        messages.push(message.message);
      }
    }

    return new Response(JSON.stringify(messages), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  // GET /api/words - Obtener palabras aprobadas (nube de palabras)
  if (path === '/api/words' && request.method === 'GET') {
    const { keys } = await EVENTO_KV.list({ prefix: 'message:' });
    const wordCount = {};

    for (const key of keys) {
      const message = await EVENTO_KV.get(key.name, 'json');
      if (message.status === 'approved') {
        wordCount[message.word] = (wordCount[message.word] || 0) + 1;
      }
    }

    const words = Object.entries(wordCount).map(([word, count]) => [word, count * 10]);

    return new Response(JSON.stringify(words), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  // PATCH /api/messages/:id - Aprobar o rechazar mensajes
  if (path.startsWith('/api/messages/') && request.method === 'PATCH') {
    const id = path.split('/').pop();
    const { status } = await request.json();

    if (!['approved', 'rejected'].includes(status)) {
      return new Response(JSON.stringify({ error: 'Estado inválido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const message = await EVENTO_KV.get(`message:${id}`, 'json');
    if (!message) {
      return new Response(JSON.stringify({ error: 'Mensaje no encontrado' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    message.status = status;
    await EVENTO_KV.put(`message:${id}`, JSON.stringify(message));

    return new Response(JSON.stringify({ success: 'Mensaje actualizado' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  return new Response('Not Found', { status: 404 });
}
