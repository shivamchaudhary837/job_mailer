const app = {
    state: {
        attachment: null,
        smtp: {
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            user: '',
            pass: '', // Memory only
            fromName: ''
        },
        recipients: [
            { fullName: '', companyName: '', role: '', hrName: '', email: '', jobLink: '', customTemplate: '' }
        ],
        template: {
            subject: 'Request for an Interview Opportunity - {{role}} at {{companyName}}',
            body: '' // Loaded from HTML default
        }
    },

    init() {
        this.cacheDOM();
        this.bindEvents();
        this.renderRecipients();
        this.state.template.body = this.dom.tplBody.value;
    },

    cacheDOM() {
        this.dom = {
            sections: {
                1: document.getElementById('step1-section'),
                2: document.getElementById('step2-section'),
                3: document.getElementById('step3-section')
            },
            btns: {
                1: document.getElementById('step1-btn'),
                2: document.getElementById('step2-btn'),
                3: document.getElementById('step3-btn')
            },
            smtpForm: document.getElementById('smtp-form'),
            testSmtpBtn: document.getElementById('test-smtp-btn'),
            smtpStatus: document.getElementById('smtp-status'),
            
            tplSubject: document.getElementById('tpl-subject'),
            tplBody: document.getElementById('tpl-body'),
            recipientsBody: document.getElementById('recipients-body'),
            addRowBtn: document.getElementById('add-row-btn'),
            importExcel: document.getElementById('import-excel'),
            excelStatus: document.getElementById('excel-status'),
            recipientErrors: document.getElementById('recipient-errors'),
            attachmentInput: document.getElementById('pdf-attachment'),
            attachmentStatus: document.getElementById('attachment-status'),
            removeAttachmentBtn: document.getElementById('remove-attachment-btn'),
            reviewAttachment: document.getElementById('review-attachment'),

            reviewSummary: document.getElementById('review-summary'),
            previewSubject: document.getElementById('preview-subject'),
            previewBody: document.getElementById('preview-body'),
            maxEmails: document.getElementById('max-emails'),
            delayMs: document.getElementById('delay-ms'),
            sendEmailsBtn: document.getElementById('send-emails-btn'),
            resultsContainer: document.getElementById('results-container'),
            resultsBody: document.getElementById('results-body'),
            progressBar: document.querySelector('#send-progress-bar .progress-bar')
        };
    },

    bindEvents() {
        this.dom.btns[1].onclick = () => this.navTo(1);
        this.dom.btns[2].onclick = () => this.navTo(2);
        this.dom.btns[3].onclick = () => this.navTo(3);

        this.dom.testSmtpBtn.onclick = () => this.testSmtp();
        this.dom.addRowBtn.onclick = () => this.addRecipientRow();
        this.dom.importExcel.onchange = () => this.importRecipients();
        document.getElementById('download-excel-btn').onclick = () => this.downloadRecipients(true);
        document.getElementById('export-excel-btn').onclick = () => this.downloadRecipients(false);
        this.dom.sendEmailsBtn.onclick = () => this.sendBatch();
        this.dom.attachmentInput.onchange = () => this.selectAttachment();
        this.dom.removeAttachmentBtn.onclick = () => {
            this.dom.attachmentInput.value = '';
            this.selectAttachment();
        };

        // Auto-save template changes to state
        this.dom.tplSubject.onchange = (e) => this.state.template.subject = e.target.value;
        this.dom.tplBody.onchange = (e) => this.state.template.body = e.target.value;
    },

    navTo(step) {
        if (step !== 1 && !this.validateSmtp()) return;
        if (step === 3 && (this.importingExcel || !this.validateRecipients())) return;
        Object.values(this.dom.sections).forEach(s => s.classList.add('d-none'));
        Object.values(this.dom.btns).forEach(b => b.classList.remove('active'));

        this.dom.sections[step].classList.remove('d-none');
        this.dom.btns[step].classList.add('active');

        if (step === 3) this.prepareReview();
    },

    // --- Step 1: SMTP ---
    async testSmtp() {
        if (!this.validateSmtp()) return;
        const config = this.getSmtpConfig();
        this.dom.smtpStatus.innerHTML = '<div class="alert alert-info">Testing connection...</div>';
        this.dom.testSmtpBtn.disabled = true;

        try {
            const res = await fetch('/api/test-smtp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
            const data = await res.json();
            if (data.ok) {
                this.dom.smtpStatus.innerHTML = `<div class="alert alert-success">${data.message}</div>`;
            } else {
                this.dom.smtpStatus.innerHTML = `<div class="alert alert-danger">Error: ${data.error}</div>`;
            }
        } catch (err) {
            this.dom.smtpStatus.innerHTML = `<div class="alert alert-danger">Network error: ${err.message}</div>`;
        } finally {
            this.dom.testSmtpBtn.disabled = false;
        }
    },

    validateSmtp() {
        for (const id of ['smtp-user', 'smtp-pass', 'from-name']) {
            const input = document.getElementById(id);
            input.setCustomValidity(input.value.trim() ? '' : 'Please fill out this field.');
            input.oninput = () => input.setCustomValidity('');
        }
        if (this.dom.smtpForm.checkValidity()) return true;
        this.navTo(1);
        this.dom.smtpForm.reportValidity();
        return false;
    },

    getSmtpConfig() {
        return {
            host: document.getElementById('smtp-host').value,
            port: parseInt(document.getElementById('smtp-port').value),
            secure: document.getElementById('smtp-secure').checked,
            user: document.getElementById('smtp-user').value,
            pass: document.getElementById('smtp-pass').value,
            fromName: document.getElementById('from-name').value
        };
    },

    // --- Step 2: Campaign ---
    downloadRecipients(template) {
        try {
            recipientExcel.download(template ? [] : this.state.recipients, template ? 'recipients-template.xlsx' : 'recipients.xlsx');
            this.dom.excelStatus.textContent = template
                ? 'Template downloaded. Fill in the Recipients sheet, keeping the column headings.'
                : 'Recipient list exported.';
        } catch (err) { this.dom.excelStatus.textContent = err.message; }
    },

    async importRecipients() {
        const file = this.dom.importExcel.files[0];
        if (!file || this.importingExcel) return;
        this.importingExcel = true;
        this.dom.importExcel.disabled = true;
        this.dom.excelStatus.textContent = 'Reading Excel file...';
        try {
            if (!/\.xlsx?$/i.test(file.name) || !file.size || file.size > 2 * 1024 * 1024) {
                throw new Error('Choose an .xlsx or .xls file no larger than 2 MB.');
            }
            const recipients = recipientExcel.parse(await file.arrayBuffer());
            this.state.recipients = recipients;
            this.renderRecipients();
            this.showRecipientIssues();
            this.dom.excelStatus.textContent = `Imported ${recipients.length} recipients from ${file.name}. Check every row below, then click Next: Review & Send. Import does not send emails.`;
        } catch (err) {
            this.dom.excelStatus.textContent = `Import failed: ${err.message} Your previous list has been kept.`;
        } finally {
            this.importingExcel = false;
            this.dom.importExcel.disabled = false;
            this.dom.importExcel.value = '';
        }
    },

    showRecipientIssues() {
        const issues = recipientExcel.issues(this.state.recipients);
        this.dom.recipientErrors.textContent = issues.slice(0, 10).join(' ') + (issues.length > 10 ? ` Plus ${issues.length - 10} more issues.` : '');
        return issues;
    },

    validateRecipients() {
        if (!this.showRecipientIssues().length) return true;
        this.navTo(2);
        this.dom.recipientErrors.scrollIntoView({ block: 'center' });
        return false;
    },

    selectAttachment() {
        const file = this.dom.attachmentInput.files[0];
        this.state.attachment = null;
        this.dom.removeAttachmentBtn.classList.add('d-none');
        this.dom.attachmentStatus.textContent = 'No PDF selected.';
        if (!file) return;
        if (!/\.pdf$/i.test(file.name) || file.size === 0 || file.size > 2 * 1024 * 1024) {
            this.dom.attachmentInput.value = '';
            this.dom.attachmentStatus.textContent = 'Please choose a non-empty PDF no larger than 2 MB.';
            return;
        }
        this.state.attachment = file;
        this.dom.attachmentStatus.textContent = `${file.name} (${Math.ceil(file.size / 1024)} KB) — attached to every email.`;
        this.dom.removeAttachmentBtn.classList.remove('d-none');
    },

    async encodeAttachment(file) {
        if (!file) return null;
        const header = await file.slice(0, 5).text();
        if (header !== '%PDF-') throw new Error('The selected file is not a PDF. Choose a valid PDF in Campaign Builder.');
        const content = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = () => reject(new Error('Could not read the PDF. Please select it again.'));
            reader.onabort = () => reject(new Error('Reading the PDF was cancelled.'));
            reader.readAsDataURL(file);
        });
        return { filename: file.name, content };
    },

    renderRecipients() {
        this.dom.recipientsBody.innerHTML = '';
        this.state.recipients.forEach((recipient, idx) => {
            // Spreadsheet values must be text, never executable HTML.
            const r = Object.fromEntries(Object.entries(recipient).map(([key, value]) => [key,
                String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]))
            ]));
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><input type="text" class="form-control form-control-sm" value="${r.fullName}" oninput="app.updateRecipient(${idx}, 'fullName', this.value)"></td>
                <td><input type="text" class="form-control form-control-sm" value="${r.companyName}" oninput="app.updateRecipient(${idx}, 'companyName', this.value)"></td>
                <td><input type="text" class="form-control form-control-sm" value="${r.role}" oninput="app.updateRecipient(${idx}, 'role', this.value)"></td>
                <td><input type="text" class="form-control form-control-sm" value="${r.hrName}" oninput="app.updateRecipient(${idx}, 'hrName', this.value)"></td>
                <td><input type="email" class="form-control form-control-sm" value="${r.email}" oninput="app.updateRecipient(${idx}, 'email', this.value)"></td>
                <td><input type="text" class="form-control form-control-sm" value="${r.jobLink}" oninput="app.updateRecipient(${idx}, 'jobLink', this.value)"></td>
                <td>
                    <button class="btn btn-sm btn-outline-danger" onclick="app.removeRecipient(${idx})">×</button>
                </td>
            `;
            this.dom.recipientsBody.appendChild(tr);
        });
    },

    updateRecipient(idx, field, val) {
        this.state.recipients[idx][field] = val;
        this.showRecipientIssues();
    },

    addRecipientRow() {
        this.state.recipients.push({ fullName: '', companyName: '', role: '', hrName: '', email: '', jobLink: '', customTemplate: '' });
        this.renderRecipients();
    },

    removeRecipient(idx) {
        this.state.recipients.splice(idx, 1);
        this.renderRecipients();
        this.showRecipientIssues();
    },

    // --- Step 3: Review ---
    prepareReview() {
        const count = this.state.recipients.filter(r => r.email).length;
        this.dom.reviewSummary.innerText = `Ready to send to ${count} recipient(s).`;
        const file = this.state.attachment;
        this.dom.reviewAttachment.textContent = file
            ? `PDF attachment: ${file.name} (${Math.ceil(file.size / 1024)} KB). Included with every email.`
            : 'No PDF attachment.';
        
        if (count > 0) {
            const first = this.state.recipients.find(r => r.email);
            try {
                const rendered = this.renderTemplate(first);
                this.dom.previewSubject.innerText = rendered.subject;
                this.dom.previewBody.innerHTML = rendered.html;
            } catch (err) {
                this.dom.previewSubject.innerText = '';
                this.dom.previewBody.textContent = err.message;
            }
        }
    },

    renderTemplate(recipient) {
        const data = {
            ...recipient,
            yourName: document.getElementById('from-name').value,
            currentCompanyName: document.getElementById('current-company-name').value,
            currentRole: document.getElementById('current-role').value,
            phoneNumber: document.getElementById('phone-number').value
        };
        const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[char]));
        const replace = (str, html = false) => {
            return str.replace(/{{\s*(\w+)\s*}}/g, (match, key) => {
                if (!Object.prototype.hasOwnProperty.call(data, key)) return match;
                let value = data[key] || '';
                if (key === 'jobLink' && value.trim()) {
                    try {
                        const raw = value.trim();
                        const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw.replace(/^\/\//, '')}`);
                        if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
                        value = url.href;
                    } catch {
                        throw new Error(`Enter a valid HTTP or HTTPS Job Link for ${recipient.email || 'this recipient'}.`);
                    }
                }
                return html ? escapeHtml(value) : value;
            });
        };

        return {
            subject: replace(this.state.template.subject),
            html: replace(recipient.customTemplate || this.state.template.body, true)
        };
    },

    async sendBatch() {
        if (!this.validateSmtp()) return;
        if (this.importingExcel || !this.validateRecipients()) return;
        const config = this.getSmtpConfig();
        const rawRecipients = this.state.recipients.filter(r => r.email);
        const limit = parseInt(this.dom.maxEmails.value) || 10;
        const delay = parseInt(this.dom.delayMs.value) || 15000;
        
        const toSend = rawRecipients.slice(0, limit);
        let messages;
        try {
            messages = toSend.map(r => ({
                to: r.email,
                ...this.renderTemplate(r)
            }));
        } catch (err) {
            alert(err.message);
            return;
        }

        this.dom.sendEmailsBtn.disabled = true;
        const attachmentFile = this.state.attachment;
        this.dom.resultsContainer.classList.remove('d-none');
        this.dom.resultsBody.innerHTML = '';
        this.dom.progressBar.style.width = '0%';

        try {
            const attachment = await this.encodeAttachment(attachmentFile);
            const res = await fetch('/api/send-batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    smtpConfig: { ...config, fromEmail: config.user },
                    messages,
                    attachment,
                    delayMs: delay
                })
            });
            const data = await res.json();
            
            if (data.ok) {
                this.renderResults(data.results);
            } else {
                alert('Error: ' + data.error);
            }
        } catch (err) {
            alert('Could not send emails: ' + err.message);
        } finally {
            this.dom.sendEmailsBtn.disabled = false;
            this.dom.progressBar.style.width = '100%';
            this.dom.progressBar.classList.remove('progress-bar-animated');
        }
    },

    renderResults(results) {
        this.dom.resultsBody.innerHTML = '';
        results.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${r.to}</td>
                <td><span class="badge bg-${r.success ? 'success' : 'danger'}">${r.success ? 'Sent' : 'Failed'}</span></td>
                <td><small>${r.errorMessage || '-'}</small></td>
            `;
            this.dom.resultsBody.appendChild(tr);
        });
    }
};

app.init();
