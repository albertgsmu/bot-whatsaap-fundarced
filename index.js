const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// 1. VERIFICACIÓN DEL WEBHOOK (Meta exige esto al guardar la URL)
app.get('/webhook', (req, res) => {
    const VERIFY_TOKEN = "fundarced2026";

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
    }
});

// 2. RECEPCIÓN DE MENSAJES DE WHATSAPP
app.post('/webhook', async (req, res) => {
    try {
        const body = req.body;

        if (body.object === 'whatsapp_business_account') {
            const entry = body.entry?.[0];
            const changes = entry?.changes?.[0];
            const value = changes?.value;
            const message = value?.messages?.[0];

            if (message) {
                const phone = message.from; 
                const text = message.text?.body; 

                // Conectamos con tu Typebot usando el ID de tu flujo
                const typebotResponse = await axios.post(
                    `https://typebot.io/api/v1/typebots/cmvjprmhw000a08l0mprt4h0y/startChat`, 
                    {
                        message: text,
                        sessionId: phone 
                    }
                );

                const messagesToSend = typebotResponse.data.messages;

                for (const msg of messagesToSend) {
                    if (msg.type === 'text') {
                        await axios.post(
                            `https://graph.facebook.com/v18.0/${value.metadata.phone_number_id}/messages`,
                            {
                                messaging_product: "whatsapp",
                                to: phone,
                                text: { body: msg.content.richText[0].children[0].text }
                            },
                            {
                                headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` }
                            }
                        );
                    }
                }
            }
            res.sendStatus(200);
        } else {
            res.sendStatus(404);
        }
    } catch (error) {
        console.error("Error procesando el mensaje:", error);
        res.sendStatus(500);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
