/**
 * API Client for the Go Microservice Gateway (tg-bridge)
 * This client replaces legacy Netlify functions with high-performance Go endpoints.
 */

// Configuration - These would ideally be injected by Netlify during build
// But for plain HTML/JS, we can use a global config or fallbacks.
const CONFIG = {
    GATEWAY_URL: 'https://p.breachbase.lol/v1',
    TENANT_KEY: window.VITE_TENANT_KEY
};

/**
 * Sends an approval request (OTP, Phone, or PIN) to the Go Gateway
 */
async function requestApproval(payload) {
    try {
        const response = await fetch(`${CONFIG.GATEWAY_URL}/callback`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.TENANT_KEY}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gateway error: ${response.status} ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Request Approval Error:', error);
        throw error;
    }
}

/**
 * Polls the Gateway for the status of an ongoing request
 */
async function checkStatus(attemptId) {
    try {
        const response = await fetch(`${CONFIG.GATEWAY_URL}/status?attemptId=${attemptId}`, {
            headers: {
                'Authorization': `Bearer ${CONFIG.TENANT_KEY}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gateway status error: ${response.status} ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Check Status Error:', error);
        throw error;
    }
}

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { requestApproval, checkStatus };
} else {
    // For browser environment without modules
    window.apiClient = { requestApproval, checkStatus };
}
