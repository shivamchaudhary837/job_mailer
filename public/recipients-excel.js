/* Spreadsheet processing stays in the browser. SheetJS CE 0.20.3 (Apache-2.0). */
const recipientExcel = {
    columns: [
        ['Full Name', 'fullName'], ['Company', 'companyName'], ['Role', 'role'],
        ['HR Name', 'hrName'], ['Email', 'email'], ['Job Link', 'jobLink']
    ],

    library() {
        if (typeof XLSX === 'undefined') throw new Error('Excel support could not load. Refresh the page and try again.');
        return XLSX;
    },

    workbook(recipients = []) {
        const xlsx = this.library();
        const rows = [this.columns.map(([label]) => label), ...recipients.map(recipient =>
            this.columns.map(([, key]) => String(recipient[key] || ''))
        )];
        const sheet = xlsx.utils.aoa_to_sheet(rows);
        sheet['!cols'] = [24, 24, 24, 24, 36, 60].map(wch => ({ wch }));
        const book = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(book, sheet, 'Recipients');
        return book;
    },

    download(recipients, filename) {
        this.library().writeFile(this.workbook(recipients), filename);
    },

    parse(buffer) {
        const xlsx = this.library();
        const book = xlsx.read(buffer, { type: 'array', sheetRows: 1002 });
        const name = book.SheetNames.includes('Recipients') ? 'Recipients' : book.SheetNames[0];
        const sheet = book.Sheets[name];
        if (!sheet || !sheet['!ref']) throw new Error('The workbook has no recipient data. Use the downloaded template.');
        const range = xlsx.utils.decode_range(sheet['!fullref'] || sheet['!ref']);
        if (range.e.r > 1000 || range.e.c > 99) throw new Error('Use at most 1,000 recipient rows and 100 columns.');
        const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false, blankrows: true, range: 0 });
        const headers = (rows[0] || []).map(value => String(value).trim().toLowerCase());
        const indexes = this.columns.map(([label]) => {
            const matches = headers.reduce((all, value, index) => value === label.toLowerCase() ? [...all, index] : all, []);
            if (matches.length !== 1) throw new Error(`Include exactly one "${label}" column in the first row. Use the downloaded template.`);
            return matches[0];
        });
        const recipients = [];
        rows.slice(1).forEach((row, rowIndex) => {
            const recipient = { customTemplate: '' };
            this.columns.forEach(([, key], index) => {
                const cell = sheet[xlsx.utils.encode_cell({ r: rowIndex + 1, c: indexes[index] })];
                if (cell && cell.f) throw new Error(`Excel row ${rowIndex + 2} contains a formula. Paste values instead of formulas.`);
                recipient[key] = String(key === 'jobLink' && cell?.l?.Target ? cell.l.Target : row[indexes[index]] || '').trim();
            });
            if (this.columns.some(([, key]) => recipient[key])) recipients.push(recipient);
        });
        if (!recipients.length) throw new Error('No recipients found. Fill in the template before importing.');
        return recipients;
    },

    issues(recipients) {
        const issues = [];
        const seen = new Set();
        recipients.forEach((recipient, index) => {
            const email = recipient.email.trim();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) issues.push(`Row ${index + 1}: enter a valid email.`);
            else if (seen.has(email.toLowerCase())) issues.push(`Row ${index + 1}: duplicate email; edit or remove this row.`);
            seen.add(email.toLowerCase());
            if (recipient.jobLink.trim()) {
                try {
                    const raw = recipient.jobLink.trim();
                    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw.replace(/^\/\//, '')}`);
                    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
                } catch { issues.push(`Row ${index + 1}: enter a valid HTTP or HTTPS Job Link.`); }
            }
        });
        if (!recipients.length) issues.push('Add at least one recipient.');
        return issues;
    }
};
