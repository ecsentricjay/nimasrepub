import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? "placeholder");
}

const FROM = process.env.RESEND_FROM_EMAIL ?? "no-reply@nimasrepub.com.ng";
const EDITORIAL_EMAIL = process.env.EDITORIAL_EMAIL ?? "editorial@nimasrepub.com.ng";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nimasrepub.com.ng";

function journalName() {
  return "Nigerian Medical and Allied Sciences Research Publication";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function emailShell({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return `
    <div style="margin:0;background:#faf9ff;padding:32px 0;font-family:Arial,sans-serif;color:#1a1b20;">
      <div style="margin:0 auto;max-width:640px;background:#ffffff;border:1px solid #dadce5;border-radius:8px;overflow:hidden;">
        <div style="background:#001b44;color:#ffffff;padding:22px 28px;">
          <p style="margin:0;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#a3f69c;">
            NIMASREPUB
          </p>
          <h1 style="margin:6px 0 0;font-size:22px;line-height:1.3;">
            ${escapeHtml(title)}
          </h1>
        </div>
        <div style="padding:28px;font-size:15px;line-height:1.65;">
          ${body}
        </div>
        <div style="border-top:1px solid #e3e2e8;padding:18px 28px;font-size:12px;color:#5b6472;">
          <p style="margin:0;">
            ${journalName()}<br />
            Advancing health. Generating knowledge. Impacting lives.
          </p>
        </div>
      </div>
    </div>
  `;
}

export async function sendWelcomeEmail({
  toEmail,
  toName,
}: {
  toEmail: string;
  toName: string;
}) {
  const safeName = escapeHtml(toName);

  await getResend().emails.send({
    from: `${journalName()} <${FROM}>`,
    to: toEmail,
    subject: "Welcome to NIMASREPUB",
    html: emailShell({
      title: "Welcome to NIMASREPUB",
      body: `
        <p>Dear ${safeName},</p>
        <p>
          Your NIMASREPUB account is now active. You can submit manuscripts,
          track editorial decisions, respond to revision requests, and follow
          articles through publication from your author dashboard.
        </p>
        <p>
          <a href="${SITE_URL}/author/dashboard" style="display:inline-block;background:#001b44;color:#ffffff;text-decoration:none;border-radius:4px;padding:10px 16px;font-weight:700;">
            Go to author dashboard
          </a>
        </p>
        <p>
          Please review the author guidelines before beginning a new
          submission so your manuscript meets the journal's technical and
          ethical requirements.
        </p>
        <p>
          Regards,<br />
          Editorial Office
        </p>
      `,
    }),
  });
}

export async function sendSubmissionConfirmation({
  toEmail,
  toName,
  articleTitle,
  articleId,
}: {
  toEmail: string;
  toName: string;
  articleTitle: string;
  articleId: string;
}) {
  const safeName = escapeHtml(toName);
  const safeTitle = escapeHtml(articleTitle);

  await getResend().emails.send({
    from: `${journalName()} <${FROM}>`,
    to: toEmail,
    subject: `Submission received: "${articleTitle}"`,
    html: emailShell({
      title: "Submission received",
      body: `
      <p>Dear ${safeName},</p>
      <p>
        Thank you for submitting your manuscript to the <strong>${journalName()}</strong>.
        Your submission has been received and assigned a reference number.
      </p>
      <p><strong>Title:</strong> ${safeTitle}</p>
      <p>
        You can track the status of your submission at any time by visiting
        your author dashboard:
      </p>
      <p>
        <a href="${SITE_URL}/author/submissions/${articleId}">
          View submission status
        </a>
      </p>
      <p>
        Our editorial team will review your submission and be in touch
        with further updates. If you have any questions in the meantime,
        please reply to this email.
      </p>
      <p>
        Regards,<br/>
        Editorial Office<br/>
        ${journalName()}
      </p>
    `,
    }),
  });
}

export async function sendEditorNewSubmissionAlert({
  articleTitle,
  articleId,
  authorName,
  sectionName,
}: {
  articleTitle: string;
  articleId: string;
  authorName: string;
  sectionName: string;
}) {
  const safeTitle = escapeHtml(articleTitle);
  const safeAuthor = escapeHtml(authorName);
  const safeSection = escapeHtml(sectionName);

  await getResend().emails.send({
    from: `${journalName()} <${FROM}>`,
    to: EDITORIAL_EMAIL,
    subject: `New submission: "${articleTitle}"`,
    html: emailShell({
      title: "New manuscript submission",
      body: `
      <p>A new manuscript has been submitted to <strong>${journalName()}</strong>.</p>
      <ul>
        <li><strong>Title:</strong> ${safeTitle}</li>
        <li><strong>Corresponding author:</strong> ${safeAuthor}</li>
        <li><strong>Section:</strong> ${safeSection}</li>
      </ul>
      <p>
        <a href="${SITE_URL}/author/submissions/${articleId}">
          View submission
        </a>
      </p>
    `,
    }),
  });
}

export async function sendDecisionEmail({
  toEmail,
  toName,
  articleTitle,
  articleId,
  decision,
  decisionLetter,
}: {
  toEmail: string;
  toName: string;
  articleTitle: string;
  articleId: string;
  decision: "accept" | "minor_revisions" | "major_revisions" | "reject";
  decisionLetter: string;
}) {
  const safeName = escapeHtml(toName);
  const safeTitle = escapeHtml(articleTitle);
  const safeLetter = escapeHtml(decisionLetter);
  const decisionLabels: Record<typeof decision, string> = {
    accept: "Accept",
    minor_revisions: "Minor revisions required",
    major_revisions: "Major revisions required",
    reject: "Reject",
  };

  await getResend().emails.send({
    from: `${journalName()} <${FROM}>`,
    to: toEmail,
    subject: `Editorial decision on "${articleTitle}"`,
    html: emailShell({
      title: "Editorial decision",
      body: `
      <p>Dear ${safeName},</p>
      <p>
        We have reached an editorial decision on your manuscript
        submitted to <strong>${journalName()}</strong>.
      </p>
      <p><strong>Title:</strong> ${safeTitle}</p>
      <p><strong>Decision:</strong> ${decisionLabels[decision]}</p>
      <hr/>
      <div style="white-space:pre-wrap">${safeLetter}</div>
      <hr/>
      <p>
        <a href="${SITE_URL}/author/submissions/${articleId}">
          View your submission
        </a>
      </p>
      <p>
        Regards,<br/>
        Editorial Office<br/>
        ${journalName()}
      </p>
    `,
    }),
  });
}

export async function sendReviewerInvitationEmail({
  toEmail,
  toName,
  articleTitle,
  deadline,
}: {
  toEmail: string;
  toName: string;
  articleTitle: string;
  deadline: string | null;
}) {
  const safeName = escapeHtml(toName);
  const safeTitle = escapeHtml(articleTitle);

  await getResend().emails.send({
    from: `${journalName()} <${FROM}>`,
    to: toEmail,
    subject: `Invitation to review: "${articleTitle}"`,
    html: emailShell({
      title: "Invitation to review",
      body: `
      <p>Dear ${safeName},</p>
      <p>
        You have been invited to review a manuscript submitted to
        <strong>${journalName()}</strong>.
      </p>
      <p><strong>Title:</strong> ${safeTitle}</p>
      ${
        deadline
          ? `<p><strong>Review deadline:</strong> ${escapeHtml(deadline)}</p>`
          : ""
      }
      <p>
        Please log in to your reviewer dashboard to accept or decline this
        invitation and, if accepted, access the manuscript.
      </p>
      <p>
        <a href="${SITE_URL}/reviewer/dashboard">
          Go to reviewer dashboard
        </a>
      </p>
      <p>
        Regards,<br/>
        Editorial Office<br/>
        ${journalName()}
      </p>
    `,
    }),
  });
}

export async function sendPublicationEmail({
  toEmail,
  toName,
  articleTitle,
  articleSlug,
  articleId,
}: {
  toEmail: string;
  toName: string;
  articleTitle: string;
  articleSlug: string;
  articleId: string;
}) {
  const safeName = escapeHtml(toName);
  const safeTitle = escapeHtml(articleTitle);
  const articlePath = articleSlug
    ? `${SITE_URL}/articles/${articleSlug}`
    : `${SITE_URL}/author/submissions/${articleId}`;

  await getResend().emails.send({
    from: `${journalName()} <${FROM}>`,
    to: toEmail,
    subject: `Your article has been published: "${articleTitle}"`,
    html: emailShell({
      title: "Article published",
      body: `
      <p>Dear ${safeName},</p>
      <p>
        We are pleased to inform you that your manuscript has been published in
        <strong>${journalName()}</strong>.
      </p>
      <p><strong>Title:</strong> ${safeTitle}</p>
      <p>
        Your article is now freely available online. You can view it, share
        the link, and download the PDF from its article page.
      </p>
      <p>
        <a href="${articlePath}">
          View published article
        </a>
      </p>
      <p>
        Regards,<br/>
        Editorial Office<br/>
        ${journalName()}
      </p>
    `,
    }),
  });
}

export async function sendPaymentReceiptEmail({
  toEmail,
  toName,
  articleTitle,
  articleId,
  amount,
  reference,
}: {
  toEmail: string;
  toName: string;
  articleTitle: string;
  articleId: string;
  amount: number;
  reference: string;
}) {
  const safeName = escapeHtml(toName);
  const safeTitle = escapeHtml(articleTitle);
  const safeReference = escapeHtml(reference);

  await getResend().emails.send({
    from: `${journalName()} <${FROM}>`,
    to: toEmail,
    subject: `Payment confirmed: "${articleTitle}"`,
    html: emailShell({
      title: "Payment confirmed",
      body: `
      <p>Dear ${safeName},</p>
      <p>
        Your Article Processing Charge (APC) payment has been received for the
        following manuscript submitted to <strong>${journalName()}</strong>.
      </p>
      <p><strong>Title:</strong> ${safeTitle}</p>
      <p><strong>Amount paid:</strong> NGN ${amount.toLocaleString("en-NG")}</p>
      <p><strong>Payment reference:</strong> ${safeReference}</p>
      <p>
        Your manuscript has been moved to the production stage. Our editorial
        team will be in touch with further updates.
      </p>
      <p>
        <a href="${SITE_URL}/author/submissions/${articleId}">
          View your submission
        </a>
      </p>
      <p>
        Regards,<br/>
        Editorial Office<br/>
        ${journalName()}
      </p>
    `,
    }),
  });
}
