export function sanitizePhoneNumber(input) {
    if (!input) return '';
    let digits = input.replace(/\D/g, '');
    if (digits.startsWith('82')) digits = digits.substring(2);
    if (digits.startsWith('010')) digits = digits.substring(1);
    return digits;
}

export function parseCSVLine(text) {
    const re_value = /(?!\s*$)\s*(?:'([^']*(?:''[^']*)*)'|"([^"]*(?:""[^"]*)*)"|([^,'"\s\\]*(?:\s+[^,'"\s\\]+)*))\s*(?:,|$)/g;
    const a = [];
    text.replace(re_value, (m0, m1, m2, m3) => {
        if (m1 !== undefined) a.push(m1.replace(/''/g, "'"));
        else if (m2 !== undefined) a.push(m2.replace(/""/g, '"'));
        else if (m3 !== undefined) a.push(m3);
        return '';
    });
    if (/,\s*$/.test(text)) a.push('');
    return a;
}

export function chunkArray(array, size) {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
}

export function getStats(participants, checkins) {
    const stats = {};
    const checkedMap = new Map();
    checkins.forEach(c => {
        const sPhone = sanitizePhoneNumber(c.phone || '');
        if (sPhone) checkedMap.set(sPhone, true);
    });

    participants.forEach(p => {
        let activity = p.activity_name || p.액티비티 || p.bus || 'Unknown';
        if (activity.includes(':')) activity = activity.split(':')[0].trim();

        if (!stats[activity]) stats[activity] = { total: 0, checked: 0 };
        stats[activity].total++;
        const sPhone = sanitizePhoneNumber(p.phone || p.휴대전화 || '');
        if (checkedMap.has(sPhone)) stats[activity].checked++;
    });
    return stats;
}

// Helper to loosely match headers
export function getSafeHeader(row, possibleHeaders) {
    // defined headers we want
    for (const h of possibleHeaders) {
        // check actual keys in the row
        for (const key of Object.keys(row)) {
            // remove spaces and lowercase for comparison
            if (key.replace(/\s/g, '').toLowerCase() === h.replace(/\s/g, '').toLowerCase()) {
                return row[key];
            }
        }
    }
    return '';
}
