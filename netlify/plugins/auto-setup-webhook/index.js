module.exports = {
    // Runs automatically after every successful deploy
    onSuccess: async ({ utils, constants }) => {
        const siteUrl = process.env.DEPLOY_PRIME_URL || process.env.URL;
        const botToken = process.env.TELEGRAM_BOT_TOKEN;

        if (!botToken) {
            console.log('⚠️  TELEGRAM_BOT_TOKEN not set — skipping webhook registration.');
            return;
        }

        if (!siteUrl) {
            console.log('⚠️  Could not determine site URL — skipping webhook registration.');
            return;
        }

        const webhookUrl = `${siteUrl}/.netlify/functions/telegram-webhook`;

        console.log('🔗 Auto-registering Telegram webhook...');
        console.log(`   URL: ${webhookUrl}`);

        try {
            const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: webhookUrl,
                    allowed_updates: ['callback_query', 'message']
                })
            });

            const data = await res.json();

            if (data.ok) {
                console.log('✅ Telegram webhook registered successfully!');
            } else {
                console.error(`❌ Failed to register webhook: ${data.description}`);
                // Don't fail the deploy — just warn
            }
        } catch (err) {
            console.error(`❌ Webhook registration error: ${err.message}`);
        }
    }
};
