exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const body = JSON.parse(event.body);
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
        const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

        console.log('Webhook received:', JSON.stringify(body).substring(0, 500));

        // Only handle callback_query (inline button presses)
        if (!body.callback_query) {
            console.log('Not a callback_query, ignoring');
            return { statusCode: 200, body: 'OK' };
        }

        const callbackQuery = body.callback_query;
        const callbackData = callbackQuery.data;
        const chatId = callbackQuery.message.chat.id;
        const messageId = callbackQuery.message.message_id;

        console.log('Callback data:', callbackData);

        // Parse action and sessionId
        const underscoreIndex = callbackData.indexOf('_');
        const action = callbackData.substring(0, underscoreIndex);
        const sessionId = callbackData.substring(underscoreIndex + 1);

        console.log('Action:', action, 'SessionId:', sessionId);

        // Get current session from Redis
        const getRes = await fetch(redisUrl, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${redisToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(["GET", sessionId])
        });
        const getData = await getRes.json();
        console.log('Redis GET result:', JSON.stringify(getData));

        if (!getData.result) {
            console.log('Session not found or expired');
            try { await answerCallback(botToken, callbackQuery.id, '⏰ Session expired'); } catch (e) { }
            return { statusCode: 200, body: 'OK' };
        }

        const session = JSON.parse(getData.result);
        console.log('Current session status:', session.status);

        if (session.status !== 'pending') {
            try { await answerCallback(botToken, callbackQuery.id, '⚠️ Already handled'); } catch (e) { }
            return { statusCode: 200, body: 'OK' };
        }

        // Update status in Redis
        session.status = action === 'approve' ? 'approved' : 'rejected';
        const setRes = await fetch(redisUrl, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${redisToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(["SET", sessionId, JSON.stringify(session), "EX", "600"])
        });
        const setData = await setRes.json();
        console.log('Redis SET result:', JSON.stringify(setData));

        // Answer the callback query (wrapped in try/catch so it doesn't break the flow)
        const statusEmoji = action === 'approve' ? '✅' : '❌';
        const statusText = action === 'approve' ? 'APPROVED' : 'REJECTED';
        try {
            await answerCallback(botToken, callbackQuery.id, `${statusEmoji} ${statusText}`);
        } catch (e) {
            console.error('answerCallback error:', e);
        }

        // Remove buttons and send reply
        try {
            await fetch(`https://api.telegram.org/bot${botToken}/editMessageReplyMarkup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    message_id: messageId,
                    reply_markup: { inline_keyboard: [] }
                })
            });

            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: `${statusEmoji} ${statusText}`,
                    reply_to_message_id: messageId
                })
            });
        } catch (editErr) {
            console.error('Edit message error:', editErr);
        }

        console.log('Webhook completed successfully');
        return { statusCode: 200, body: 'OK' };
    } catch (error) {
        console.error('Webhook error:', error);
        return { statusCode: 200, body: 'OK' };
    }
};

async function answerCallback(botToken, callbackQueryId, text) {
    await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            callback_query_id: callbackQueryId,
            text: text
        })
    });
}
