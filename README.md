OrionQR - Evento Interactivo
Una aplicación web para eventos interactivos que permite a los invitados enviar mensajes, palabras para una nube de palabras, y selfies, mostrados en una pantalla LED con moderación.
Estructura

frontend/: Contiene index.html (React, Tailwind) para el formulario, pantalla de visualización, panel del operador, y QR.
backend/: Contiene worker.js (Cloudflare Worker) y wrangler.toml para la lógica del servidor con Cloudflare KV.

Requisitos

Node.js (para Wrangler)
Cuenta de Cloudflare (Pages y Workers)
GitHub (para control de versiones)

Configuración

Frontend:

Despliega en Cloudflare Pages desde la carpeta frontend.
Configura un dominio personalizado (por ejemplo, orionqr.com).
Actualiza API_URL y la URL del QR en index.html.


Backend:

Crea un KV Namespace en Cloudflare (EVENTO_KV).
Actualiza wrangler.toml con el Namespace ID.
Despliega el Worker con wrangler publish.


QR:

Imprime el QR generado en /qr para que los invitados accedan al formulario.



Uso

Los invitados escanean el QR para enviar mensajes y palabras.
El operador modera mensajes desde /operator (contraseña: admin123).
La pantalla de visualización (/display) muestra la nube de palabras y el muro de mensajes.
Las selfies se envían por WhatsApp y se cargan manualmente en Resolume.

Personalización

Modifica los colores en tailwind.config en index.html.
Agrega un fondo personalizado en .display-screen.
Usa marcos PNG en Resolume para selfies.

Despliegue

Frontend: Cloudflare Pages (conectar al repositorio GitHub).
Backend: Cloudflare Workers (usar Wrangler).

TODO

Mejorar la autenticación del operador.
Agregar soporte para subir selfies a la web (opcional).
Optimizar KV para eventos con muchos mensajes.

