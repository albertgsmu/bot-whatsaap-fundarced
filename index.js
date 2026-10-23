const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// 1. Verificación del Webhook
app.get('/webhook', (req, res) => {
  const VERIFY_TOKEN = 'fundarced2026';
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token && mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('WEBHOOK_VERIFIED');
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// 2. Recepción de mensajes de WhatsApp
app.post('/webhook', async (req, res) => {
  try {
    const body = req.body;
    console.log('Webhook recibido:', JSON.stringify(body, null, 2));

    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          const value = change.value;
          if (value && value.messages && value.messages.length > 0) {
            const message = value.messages[0];
            const senderPhone = message.from;
            const messageText = message.text ? message.text.body : '';

            console.log(`Procesando mensaje de ${senderPhone}: "${messageText}"`);

            if (messageText) {
              await enviarATypebot(senderPhone, messageText);
            }
          }
        }
      }
      return res.status(200).send('EVENT_RECEIVED');
    }
    return res.sendStatus(404);
  } catch (error) {
    console.error('Error crítico en POST /webhook:', error.message);
    return res.status(500).send('Internal Server Error');
  }
});

// Comunicación con Typebot
async function enviarATypebot(senderPhone, messageText) {
  const typebotId = process.env.TYPEBOT_ID;
  const whatsappToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  try {
    const typebotResponse = await axios.post(
      `https://bot.typebot.io/v1/typebots/${typebotId}/chats`,
      {
        message: messageText,
        sessionId: senderPhone,
      }
    );

    const messages = typebotResponse.data.messages;
    console.log('Respuesta obtenida de Typebot:', messages);

    if (messages && messages.length > 0) {
      for (const msg of messages) {
        let textoRespuesta = '';
        
        if (msg.type === 'text') {
          if (msg.content && msg.content.richText) {
            textoRespuesta = msg.content.richText
              .map(rt => rt.children.map(c => c.text).join(''))
              .join('\n');
          } else if (msg.content && msg.content.text) {
            textoRespuesta = msg.content.text;
          }
        }

        if (!textoRespuesta) {
          textoRespuesta = '¡Hola! Bienvenido a Fundarced.';
        }

        // Enviar respuesta a WhatsApp
        await axios.post(
          `https://graph.facebook.com/v25.0/${phoneId}/messages`,
          {
            messaging_product: 'whatsapp',
            to: senderPhone,
            text: { body: textoRespuesta },
          },
          {
            headers: {
              Authorization: `Bearer ${whatsappToken}`,
              'Content-Type': 'application/json',
            },
          }
        );
        console.log('Mensaje enviado con éxito de vuelta a WhatsApp.');
      }
    }
  } catch (error) {
    console.error('Error detallado con Typebot o WhatsApp:', error.response?.data || error.message);
  }
}

app.get('/', (req, res) => {
  res.send('Bot de WhatsApp para Fundarced activo 🚀');
});

module.exports = app;
