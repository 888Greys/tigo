exports.handler = async (event) => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'text/html' },
            body: errorPage('❌ TELEGRAM_BOT_TOKEN haijawekwa kwenye environment variables.')
        };
    }

    // Derive the site URL from the incoming request
    const host = event.headers['x-forwarded-host'] || event.headers['host'];
    const proto = event.headers['x-forwarded-proto'] || 'https';
    const siteUrl = `${proto}://${host}`;
    const webhookUrl = `${siteUrl}/.netlify/functions/telegram-webhook`;

    try {
        // Check current webhook status
        const infoRes = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
        const infoData = await infoRes.json();
        const currentWebhook = infoData.result?.url || '';

        // If already set to the same URL, just confirm
        if (currentWebhook === webhookUrl) {
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'text/html' },
                body: successPage(webhookUrl, '✅ Webhook tayari imewekwa sahihi!', infoData.result)
            };
        }

        // Set the webhook
        const setRes = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: webhookUrl,
                allowed_updates: ['callback_query', 'message']
            })
        });
        const setData = await setRes.json();

        if (!setData.ok) {
            return {
                statusCode: 500,
                headers: { 'Content-Type': 'text/html' },
                body: errorPage(`❌ Imeshindwa kuweka webhook: ${setData.description}`)
            };
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'text/html' },
            body: successPage(webhookUrl, '✅ Webhook imewekwa! Approve sasa itafanya kazi.', setData)
        };

    } catch (err) {
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'text/html' },
            body: errorPage(`❌ Hitilafu: ${err.message}`)
        };
    }
};

function successPage(webhookUrl, message, info) {
    return `<!DOCTYPE html>
<html lang="sw">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Webhook Setup</title>
    <style>
        body { font-family: Inter, sans-serif; background: #f2f2f7; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
        .card { background: white; border-radius: 16px; padding: 32px; max-width: 480px; width: 90%; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .title { font-size: 22px; font-weight: 700; color: #1c1c1e; margin-bottom: 12px; }
        .msg { font-size: 16px; color: #28a745; font-weight: 600; margin-bottom: 20px; }
        .url-box { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 12px; font-size: 12px; word-break: break-all; color: #555; margin-bottom: 20px; }
        .info-box { background: #e8f5e9; border: 1px solid #c8e6c9; border-radius: 8px; padding: 12px; font-size: 12px; color: #2e7d32; }
        .back-btn { display: inline-block; margin-top: 20px; padding: 12px 24px; background: #E3000F; color: white; border-radius: 8px; text-decoration: none; font-weight: 600; }
    </style>
</head>
<body>
    <div class="card">
        <div class="title">🔗 Telegram Webhook Setup</div>
        <div class="msg">${message}</div>
        <div class="url-box"><strong>Webhook URL:</strong><br>${webhookUrl}</div>
        <div class="info-box"><pre style="margin:0;white-space:pre-wrap;">${JSON.stringify(info, null, 2)}</pre></div>
        <a class="back-btn" href="/">← Rudi Nyumbani</a>
    </div>
</body>
</html>`;
}

function errorPage(message) {
    return `<!DOCTYPE html>
<html lang="sw">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Webhook Setup - Hitilafu</title>
    <style>
        body { font-family: Inter, sans-serif; background: #f2f2f7; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
        .card { background: white; border-radius: 16px; padding: 32px; max-width: 480px; width: 90%; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .title { font-size: 22px; font-weight: 700; color: #1c1c1e; margin-bottom: 12px; }
        .msg { font-size: 15px; color: #E3000F; font-weight: 500; margin-bottom: 20px; }
        .back-btn { display: inline-block; margin-top: 10px; padding: 12px 24px; background: #E3000F; color: white; border-radius: 8px; text-decoration: none; font-weight: 600; }
    </style>
</head>
<body>
    <div class="card">
        <div class="title">🔗 Telegram Webhook Setup</div>
        <div class="msg">${message}</div>
        <a class="back-btn" href="/">← Rudi Nyumbani</a>
    </div>
</body>
</html>`;
}
