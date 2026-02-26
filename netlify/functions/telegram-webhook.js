exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const body = JSON.parse(event.body);
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
        const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

        // Only handle callback_query (inline button presses)
        if (!body.callback_query) {
            return { statusCode: 200, body: 'OK' };
        }

        const callbackQuery = body.callback_query;
        const callbackData = callbackQuery.data; // e.g. "approve_abc123" or "reject_abc123"
        const chatId = callbackQuery.message.chat.id;
        const messageId = callbackQuery.message.message_id;

        // Parse action and sessionId
        const underscoreIndex = callbackData.indexOf('_');
        const action = callbackData.substring(0, underscoreIndex); // "approve" or "reject"
        const sessionId = callbackData.substring(underscoreIndex + 1);

        // Get current session from Redis using POST format
        const getRes = await fetch(`${redisUrl}`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${redisToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(["GET", sessionId])
        });
        const getData = await getRes.json();

        if (!getData.result) {
            // Session expired
            await answerCallback(botToken, callbackQuery.id, '⏰ Session expired');
            return { statusCode: 200, body: 'OK' };
        }

        const session = JSON.parse(getData.result);

        if (session.status !== 'pending') {
            await answerCallback(botToken, callbackQuery.id, '⚠️ Already handled');
            return { statusCode: 200, body: 'OK' };
        }

        // Update status in Redis using POST format
        session.status = action === 'approve' ? 'approved' : 'rejected';
        const setRes = await fetch(`${redisUrl}`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${redisToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(["SET", sessionId, JSON.stringify(session), "EX", "600"])
        });
        const setData = await setRes.json();

        if (setData.error) {
            console.error('Redis SET error:', setData.error);
        }

        // Answer the callback query
        const statusEmoji = action === 'approve' ? '✅' : '❌';
        const statusText = action === 'approve' ? 'APPROVED' : 'REJECTED';
        await answerCallback(botToken, callbackQuery.id, `${statusEmoji} ${statusText}`);

        // Edit the original message to show the decision (remove buttons)
        // Use editMessageReplyMarkup to remove buttons, then edit text without parse_mode
        // to avoid HTML parsing issues with plain text
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

            // Send a follow-up message with the decision
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
            // Non-critical, don't fail the webhook
        }

        return { statusCode: 200, body: 'OK' };
    } catch (error) {
        console.error('Webhook error:', error);
        return { statusCode: 200, body: 'OK' }; // Always return 200 to Telegram
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
