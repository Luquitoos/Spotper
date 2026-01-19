function formatPhoneNumber(input) {
    const cursorPos = input.selectionStart;
    const oldValue = input.value;
    let numbers = input.value.replace(/[^\d]/g, '');
    numbers = numbers.substring(0, 13);
    let formatted = '';
    if (numbers.length > 0) {
        formatted = '+' + numbers.substring(0, 2);
        if (numbers.length > 2) {
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
    if (oldValue.length < formatted.length) {
        let newPos = cursorPos + (formatted.length - oldValue.length);
        input.setSelectionRange(newPos, newPos);
    }
}
function initPhoneMasking() {
    document.addEventListener('input', (e) => {
        if (e.target && e.target.type === 'tel') {
            formatPhoneNumber(e.target);
        }
    });
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPhoneMasking);
} else {
    initPhoneMasking();
}
window.formatPhoneNumber = formatPhoneNumber;
