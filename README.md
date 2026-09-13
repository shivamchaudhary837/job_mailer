# Job Outreach Mailer

Prepare personalized job referral emails, reuse recipient lists from Excel, and attach a PDF resume to every email in a batch.

**[Open the website](https://job-mailer-beta.vercel.app/)**

You do not need to install this repository to use the website. Open the link and follow the three steps below. Sending is manual: the app does not schedule daily emails.

## Before you start

Have these ready:

- Your sending email address and an SMTP app password.
- Your name, current company, current role, and phone number.
- The recipients' email addresses and job details, entered manually or in an Excel file.
- An optional PDF resume, no larger than 2 MB.

Start with a campaign addressed to yourself to check the email layout, job link, and attachment before contacting others.

## 1. SMTP Config

For a Gmail account, enter:

| Field | Value |
| --- | --- |
| SMTP Host | `smtp.gmail.com` |
| Port | `465` |
| Username (Email) | Your full Gmail address |
| App Password | The app password generated for that same Google account |
| Secure (SSL/TLS) | Checked |
| From Name | Your name as recipients should see it |

**Username, App Password, and From Name are required.** From Name also supplies `{{yourName}}` in the email template.

### Generate a Google App Password

1. Enable **2-Step Verification** in your [Google Account security settings](https://myaccount.google.com/security).
2. Open [Google App Passwords](https://myaccount.google.com/apppasswords) while signed into the sending account.
3. Create an app password named something recognizable, such as **Job Mailer**.
4. Paste the generated password into the website's **App Password** field. Do not enter your regular Google account password. The app removes spaces from Gmail app passwords.

Some work, school, or protected accounts may not offer app passwords. See [Google's app-password instructions](https://support.google.com/accounts/answer/185833).

Click **Test Connection**. This checks SMTP and sends a real test email to the address in **Username (Email)**. It does not send the campaign template or your PDF. Check your inbox and spam folder for **Job Mailer Test**.

Once the test succeeds, click **Next: Campaign Builder**.

## 2. Campaign Builder

### Fill in Your Details

Enter **Current Company**, **Current Role**, and **Phone Number**. These values are shared across the campaign. If the default description of your experience does not apply, edit the body template before sending.

### Customize the email

Edit **Subject Template** and **Body Template (HTML)**. The default body asks for a referral and mentions an attached resume.

| Placeholder | Value comes from |
| --- | --- |
| `{{fullName}}` | Recipient row: Full Name |
| `{{companyName}}` | Recipient row: Company |
| `{{role}}` | Recipient row: Role |
| `{{hrName}}` | Recipient row: HR Name |
| `{{jobLink}}` | Recipient row: Job Link |
| `{{yourName}}` | SMTP Config: From Name |
| `{{currentCompanyName}}` | Your Details: Current Company |
| `{{currentRole}}` | Your Details: Current Role |
| `{{phoneNumber}}` | Your Details: Phone Number |

Use `<br>` for a line break and `<br><br>` between paragraphs. The body is HTML; plain newlines alone may not create line breaks in email clients.

To show a clickable alias instead of a long URL, use:

```html
<a href="{{jobLink}}" target="_blank" rel="noopener noreferrer">JobLink</a>
```

The default template already includes this link. Enter the actual job URL in each recipient's **Job Link** field. Links without a protocol get `https://` added; only HTTP and HTTPS links are accepted. Spaces inside placeholders, such as `{{jobLink  }}`, are supported.

Fill in the values used by your template. Known placeholders with blank values become empty text; unknown placeholder names remain visible. Review the final wording before sending.

### Attach your PDF resume

1. Under **PDF attachment (optional)**, choose a PDF up to **2 MB**.
2. Confirm the filename shown below the field.
3. Use **Remove attachment** or choose another file to change it.

One selected PDF is attached to **every email in the batch**. It is not a per-recipient attachment. If you do not attach a resume, remove the sentence saying it is attached from your email template.

### Add recipients manually

Fill the table with **Full Name**, **Company**, **Role**, **HR Name**, **Email**, and **Job Link**. Use **+ Add Recipient** for more rows and the remove button to delete a row.

Every retained row needs a valid email address. Remove unused blank rows. Duplicate email addresses and invalid job links must be corrected before proceeding.

### Import recipients from Excel

1. Click **Download Excel Template** to save `recipients-template.xlsx`.
2. Open the file in Excel or another compatible spreadsheet editor.
3. Keep the first-row column headings and add one recipient per row:

   | Full Name | Company | Role | HR Name | Email | Job Link |
   | --- | --- | --- | --- | --- | --- |
   | Alex Example | Example Company | Frontend Developer | Alex | alex@example.com | https://example.com/jobs/frontend |

   This is an illustrative row; replace it with your own recipient information.

4. Save the workbook as `.xlsx` or `.xls`.
5. Choose it under **Import Excel recipient list**.
6. **Check all imported rows in the Recipients table.** You can edit or remove them there. Fix the validation messages before continuing.
7. Click **Next: Review & Send** only after checking the list.

Import never sends emails automatically and does not advance to the next step.

Excel import rules:

- Maximum file size: **2 MB**; maximum recipient rows: **1,000**. The workbook range must stay within 1,001 rows including the heading and 100 columns.
- All six column headings must appear exactly once in the first row. Column order can change; capitalization and surrounding spaces are ignored.
- The app uses the sheet named **Recipients**, or the first sheet if that name is absent. Other sheets are not imported.
- Completely blank recipient rows are skipped. Use plain values: formulas in recipient columns are rejected.
- **A successful import replaces the current recipient list.** Export existing edits first if you need to keep them.
- An unreadable, empty, or structurally invalid workbook leaves the previous list intact. Rows with invalid email addresses still appear for correction.
- Importing 1,000 recipients does not send 1,000 emails: the separate per-run sending limit still applies.

### Export and reuse your list

Click **Export Recipients** to download the table as `recipients.xlsx`. The export contains the six recipient columns, including edits made in the app. Keep this file locally and import it on your next visit.

The export does not include SMTP credentials, sender details, email templates, the PDF, or sending results.

## 3. Review & Send

1. Check the recipient count.
2. Read the rendered subject and body. **The preview shows only the first recipient**, so check other rows' data in Campaign Builder as well.
3. Check the PDF filename, if attached.
4. Set **Max Emails per Run** and **Delay between (ms)**.
5. Click **Send Emails Now** once and keep the page open while waiting for results.

### Understand the sending controls

| Control | Meaning |
| --- | --- |
| Max Emails per Run | Sends to the first N recipients in the current list. Default: 10; allowed range: 1–20. |
| Delay between (ms) | Wait after each email attempt, except the last. Default: 15,000 ms = 15 seconds; maximum: 60,000 ms. Currently, entering 0 or leaving it blank falls back to 15 seconds in the browser. |

Total waiting time cannot exceed **180 seconds per run**:

```text
Waiting time = (number of emails in this run - 1) × delay
```

For example, 10 emails with a 15-second delay require 135 seconds of waiting, plus SMTP connection and sending time. Twenty emails with the same delay are rejected because the waiting time alone is 285 seconds.

The hosting configuration allows up to 300 seconds per request. The waiting-time check leaves room for sending, but slow SMTP connections can still cause a timeout. Use smaller batches if needed. Fifteen seconds is the app's default, not a Google-guaranteed minimum or a promise of delivery. Google sending limits still apply: [Gmail limits](https://support.google.com/mail/answer/22839).

### Avoid duplicate sends

**The app does not remember which recipients have already received a message.** With four recipients and Max Emails per Run set to two, it sends to rows 1 and 2. Clicking Send again sends to rows 1 and 2 again; it does not continue to rows 3 and 4.

To send the remaining recipients, remove the already-sent rows from the current table or import a separate list containing only the remaining recipients. Keep your exported master list and track sends separately.

### Read the results

- **Sent** means the SMTP server accepted the send operation. It does not guarantee inbox placement or that the recipient read the email.
- **Failed** includes an error message to help diagnose the problem.
- Results appear after the batch request returns. The progress bar is not a live per-email indicator; reaching 100% alone does not mean every email succeeded.
- After a timeout or network error, some emails may already have been sent. Check your Gmail Sent folder before retrying. Do not blindly repeat the whole batch.

## Returning to the website

The app does not implement saved campaigns, browser persistence, account login, sending history, or automatic morning schedules. Treat refresh or closing the page as losing the current form data and selected PDF.

On your next visit, enter your SMTP and sender details, import your saved Excel file, reselect your PDF, check your template and recipients, then send manually.

## Privacy and responsible use

- Excel parsing happens in the browser; the original workbook is not uploaded to the backend.
- When testing, the browser sends your SMTP credentials to the app's backend. When sending a campaign, it also sends the selected messages and PDF. The backend connects to your SMTP provider to send them.
- The application code does not implement persistent storage for credentials or campaign data. This is not a claim that hosting providers or email providers keep no logs: backend errors can be logged, and your email provider processes the messages.
- Only enter an app password into a deployment you trust. You can revoke it through your Google account when no longer needed.
- Never post app passwords, real recipient spreadsheets, or private resumes in public GitHub issues or commits. Redact credentials from screenshots and logs.
- Send relevant, respectful messages, honor requests not to be contacted, and avoid repeated unsolicited daily emails to the same people.

## Troubleshooting

| Problem | What to do |
| --- | --- |
| Required-field message | Fill in Username, App Password, and From Name; check the SMTP host and port. |
| SMTP authentication failed | Confirm the sending account and its app password. If unavailable, check account restrictions in Google's linked instructions. |
| `ECONNRESET`, `ESOCKET`, or connection timeout | Check SMTP settings and provider/network restrictions. Gmail can also use port 587 with Secure unchecked; the backend uses STARTTLS and can try the alternate Gmail port before sending. |
| Certificate error | A proxy or security tool may be inspecting the connection. For a local deployment, ask your network administrator about the approved certificate. For the hosted app, inspect Vercel's function logs. Do not disable certificate validation. |
| Excel import fails | Use the downloaded template, retain all six headings, use values instead of formulas, and check file and row limits. |
| Duplicate or invalid recipient | Edit or remove the flagged table row before clicking Next. |
| PDF rejected | Choose an actual, non-empty PDF under the 2 MB limit. Renaming another file to `.pdf` does not convert it. |
| Batch waiting-time error | Reduce Max Emails per Run or the delay. Try 10 emails with a 15-second delay. |
| Request times out or results do not appear | Check Sent mail before retrying, then use a smaller batch. A timeout does not prove that nothing was sent. |
| Email is missing from the inbox | Check spam and the sending account's Sent folder. SMTP acceptance does not guarantee delivery to the inbox. |

## Run locally (optional)

With Node.js and npm installed:

```sh
git clone https://github.com/shivamchaudhary837/job_mailer.git
cd job_mailer
npm install
npm run dev
```

Open `http://localhost:3000`. On Windows PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`. Run `npm run build` to compile the TypeScript backend.

The frontend lives in `public/`; the two backend handlers live in `api/`. Local development uses Express through `server.ts`; Vercel uses the API functions and the settings in `vercel.json`.

Excel support uses the bundled SheetJS Community Edition library. Its license is included in [public/vendor/SheetJS-LICENSE.txt](public/vendor/SheetJS-LICENSE.txt).
