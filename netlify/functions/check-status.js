exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { sessionId } = JSON.parse(event.body);
        const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
        const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

        if (!redisUrl || !redisToken) {
            return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error' }) };
        }

        // Use POST body format for Upstash Redis
        const res = await fetch(redisUrl, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${redisToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(["GET", sessionId])
        });

        const redisData = await res.json();

        if (!redisData.result) {
            // Session expired or not found
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'expired' })
            };
        }

        const session = JSON.parse(redisData.result);
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: session.status })
        };
    } catch (error) {
        console.error('Function error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error' }) };
    }
};
