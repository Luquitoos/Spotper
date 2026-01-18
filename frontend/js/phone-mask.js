/**
 * Phone Number Input Mask Handler
 * Formats phone numbers as user types: +YY (DD) XXXXX-XXXX
 * Numbers fill from left to right, delete from right to left
 */
function formatPhoneNumber(input) {
    // Get current cursor position
    const cursorPos = input.selectionStart;
    const oldValue = input.value;

    // Remove all non-numeric characters
    let numbers = input.value.replace(/[^\d]/g, '');

    // Limit to 13 digits max (country code 2 + DDD 2 + number 9)
    numbers = numbers.substring(0, 13);

    let formatted = '';

    if (numbers.length > 0) {
        // Country code (first 2 digits)
        formatted = '+' + numbers.substring(0, 2);

        if (numbers.length > 2) {
            // Area code (next 2 digits)
            formatted += ' (' + numbers.substring(2, 4);

            if (numbers.length > 4) {
                formatted += ') ' + numbers.substring(4, 9);

                if (numbers.length > 9) {
                    formatted += '-' + numbers.substring(9, 13);
                }
            } else if (numbers.length === 4) {
                formatted += ')';
            }
        }
    }

    input.value = formatted;

    // Restore cursor position intelligently
    if (oldValue.length < formatted.length) {
        // User is typing - move cursor forward
        let newPos = cursorPos + (formatted.length - oldValue.length);
        input.setSelectionRange(newPos, newPos);
    }
}

/**
 * Initialize phone masking on all phone inputs
 */
function initPhoneMasking() {
    document.addEventListener('input', (e) => {
        if (e.target && e.target.type === 'tel') {
            formatPhoneNumber(e.target);
        }
    });
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPhoneMasking);
} else {
    initPhoneMasking();
}

window.formatPhoneNumber = formatPhoneNumber;
