const cors = require('cors');
const next = require('next');
const Pusher = require('pusher');
const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv').config();
const Sentiment = require('sentiment');

const dev = process.env.NODE_ENV !== 'production';
const port = process.env.PORT || 3000;

const app = next({ dev });
const handler = app.getRequestHandler();
const sentiment = new Sentiment();

// Configure the pusher
const pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.PUSHER_APP_KEY,
    secret: process.env.PUSHER_APP_SECRET,
    cluster: process.env.PUSHER_APP_CLUSTER,
    useTLS: true
});

app.prepare().then(() => {
    const server = express();

    server.use(cors());
    server.use(bodyParser.json());
    server.use(bodyParser.urlencoded({ extended: true }));

    server.get('*', (req, res) => {
        return handler(req, res);
    });

    const chatHistory = { messages: [] };

    // Add route for '/message'
    server.post('/message', (req, res, next) => {
        console.log("Receive request POST /message")
        const { user = null, message = '', timestamp = +new Date } = req.body;
        const sentimentScore = sentiment.analyze(message).score;

        const chat = { user, message, timestamp, sentiment: sentimentScore };

        chatHistory.messages.push(chat);
        pusher.trigger('chat-room', 'new-message', { chat });
    })

    // Add route for '/messages'
    server.post('/messages', (req, res, next) => {
        console.log("Receive request POST /messages")
        res.json({ ...chatHistory, status: 'success' });
    });

    // Start the server and listen to specific port
    server.listen(port, err => {
        if (err) throw err;
        console.log(`> Server is ready to work`)
    })
})
.catch(exception => { // Handle exceptions
    console.error(exception.stack);
    process.exit(1);
})