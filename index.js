const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// 1. Verificación del Webhook (GET que pide Meta)
app.get('/webhook', (req, res) => {
  const VERIFY_TOKEN = 'fundarced2026'; // El token que pusiste en Meta

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
});

// 2. Recepción de mensajes de WhatsApp (POST que manda Meta)
app.post('/webhook', async (req, res) => {
  try {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          const value = change.value;
          if (value && value.messages && value.messages.length > 0) {
            const message = value.messages[0];
            const senderPhone = message.from; // Número del usuario
            const messageText = message.text ? message.text.body : '';

            console.log(`Mensaje recibido de ${senderPhone}: ${messageText}`);

            // Aquí puedes conectar con Typebot o enviar respuesta
            // Tu TYPEBOT_ID ya está configurado en las variables de entorno de Vercel
            const typebotId = process.env.TYPEBOT_ID;
            
            // Ejemplo de llamada a Typebot o respuesta de prueba por WhatsApp
            if (messageText) {
              await enviarMensajeWhatsApp(senderPhone, `¡Hola! Recibí tu mensaje: "${messageText}". Pronto te responderá el menú de Fundarced.`);
            }
          }
        }
      }
      res.status(200).send('EVENT_RECEIVED');
    } else {
      res.sendStatus(404);
    }
  } catch (error) {
    console.error('Error procesando webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Función auxiliar para enviar mensajes de vuelta a WhatsApp
async function enviarMensajeWhatsApp(to, text) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  try {
    await axios.post(
      `https://graph.facebook.com/v25.0/${phoneId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: to,
        text: { body: text },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error enviando mensaje a WhatsApp:', error.response?.data || error.message);
  }
}

// Ruta de prueba inicial
app.get('/', (req, res) => {
  res.send('Bot de WhatsApp para Fundarced funcionando correctamente 🚀');
});

// Exportar para que Vercel lo interprete como función serverless
module.exports = app;
