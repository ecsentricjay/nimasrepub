export type PolicySection = {
  heading: string;
  body: string[];
};

export type PolicyPage = {
  slug: string;
  title: string;
  description: string;
  updated: string;
  sections: PolicySection[];
};

export const policyPages: PolicyPage[] = [
  {
    slug: "aims-and-scope",
    title: "Aims and Scope",
    description:
      "The scholarly focus of Nigerian Medical and Allied Sciences Research Publication.",
    updated: "July 2026",
    sections: [
      {
        heading: "Journal focus",
        body: [
          "NIMASREPUB publishes peer-reviewed research across medicine, public health, nursing, pharmacy, laboratory science, allied health, health systems, and related biomedical disciplines.",
          "The journal prioritizes work with clear relevance to Nigeria, Africa, and comparable health contexts, while welcoming methodologically sound studies from the global research community.",
        ],
      },
      {
        heading: "Article types",
        body: [
          "The journal accepts original research articles, reviews, case reports, short communications, editorials, commentaries, and other scholarly outputs approved by the editorial office.",
          "Submissions should contribute evidence, analysis, or practice insight that can support health knowledge, policy, education, or clinical decision-making.",
        ],
      },
      {
        heading: "Editorial fit",
        body: [
          "Manuscripts may be declined before review when they fall outside the journal scope, do not meet basic reporting standards, duplicate previously published work, or present ethical concerns.",
        ],
      },
    ],
  },
  {
    slug: "author-guidelines",
    title: "Author Guidelines",
    description:
      "Submission requirements for authors preparing manuscripts for review.",
    updated: "July 2026",
    sections: [
      {
        heading: "Before submission",
        body: [
          "Authors should submit original work that is not under consideration elsewhere and has been approved by all listed contributors.",
          "The manuscript file should be prepared without author-identifying details where possible because the journal operates a double-blind review process.",
        ],
      },
      {
        heading: "Manuscript preparation",
        body: [
          "Submissions should include a clear title, abstract, keywords, main text, references, tables, figures, acknowledgements, funding statement, conflict of interest statement, and ethical approval details where applicable.",
          "References should be complete and consistent. Authors are responsible for the accuracy of all citations, data, images, and permissions.",
        ],
      },
      {
        heading: "After acceptance",
        body: [
          "Accepted manuscripts may proceed to payment, production, issue assignment, DOI preparation, and publication according to the journal workflow.",
          "The final published PDF is branded with journal information, publication metadata, website links, DOI information where available, and page numbers.",
        ],
      },
    ],
  },
  {
    slug: "review-policy",
    title: "Peer Review Policy",
    description:
      "How manuscripts are assessed under the journal's double-blind review model.",
    updated: "July 2026",
    sections: [
      {
        heading: "Review model",
        body: [
          "NIMASREPUB uses double-blind peer review. Reviewer identities are not disclosed to authors, and author identities should be removed from files sent for review where practical.",
          "Editorial staff may access identifying information for workflow, ethics, conflict checks, and publication administration.",
        ],
      },
      {
        heading: "Reviewer expectations",
        body: [
          "Reviewers should provide independent, constructive, and confidential assessments of scholarly quality, relevance, ethics, methodology, interpretation, and presentation.",
          "Reviewers must decline invitations when they have a conflict of interest or cannot complete the review within the requested period.",
        ],
      },
      {
        heading: "Editorial decisions",
        body: [
          "Final decisions rest with the editorial team and may include accept, request revisions, reject, or other workflow decisions supported by the platform.",
          "The journal may request additional review, statistical input, ethics clarification, or production changes before publication.",
        ],
      },
    ],
  },
  {
    slug: "publication-ethics",
    title: "Publication Ethics",
    description:
      "Ethical expectations for authors, reviewers, editors, and published work.",
    updated: "July 2026",
    sections: [
      {
        heading: "Research integrity",
        body: [
          "Authors must submit accurate, original, and ethically conducted work. Fabrication, falsification, plagiarism, duplicate publication, citation manipulation, and undisclosed conflicts are not acceptable.",
          "Research involving human participants, patient information, animals, or sensitive data should include appropriate approval, consent, and safeguards.",
        ],
      },
      {
        heading: "Authorship and conflicts",
        body: [
          "All listed authors should have made a meaningful contribution and approved the submitted version. Contributors who do not meet authorship criteria should be acknowledged with permission.",
          "Authors, reviewers, and editors should disclose financial, institutional, personal, or professional relationships that could influence the work.",
        ],
      },
      {
        heading: "Corrections and concerns",
        body: [
          "The journal may issue corrections, expressions of concern, retractions, or editorial notices when credible concerns arise after publication.",
          "Ethics concerns can be sent to the editorial office for assessment and follow-up.",
        ],
      },
    ],
  },
  {
    slug: "apc-policy",
    title: "Article Processing Charge Policy",
    description:
      "How publication charges are handled after editorial acceptance.",
    updated: "July 2026",
    sections: [
      {
        heading: "When APC applies",
        body: [
          "Article processing charges are requested only after a manuscript has reached the appropriate accepted or production stage in the editorial workflow.",
          "Payment status does not influence peer review decisions. Editorial assessment and payment administration are treated as separate workflow steps.",
        ],
      },
      {
        heading: "Current rate",
        body: [
          "The active APC amount is managed by the journal administration team inside the platform and may be updated from time to time.",
          "Authors should rely on the invoice or payment request generated for their accepted manuscript for the current amount and payment instructions.",
        ],
      },
      {
        heading: "Receipts and records",
        body: [
          "Confirmed payments are recorded against the manuscript and can be reviewed by the editorial or administrative team before publication proceeds.",
        ],
      },
    ],
  },
  {
    slug: "copyright-and-licensing",
    title: "Copyright and Licensing",
    description:
      "Rights, reuse, and publication permissions for journal content.",
    updated: "July 2026",
    sections: [
      {
        heading: "Author rights",
        body: [
          "Authors retain responsibility for the originality, permissions, and lawful use of all material included in their manuscript.",
          "By submitting, authors confirm that they have the right to publish the work and grant the journal permission to process, publish, archive, and disseminate the article.",
        ],
      },
      {
        heading: "Reuse",
        body: [
          "Published content may be made available for scholarly reading, citation, indexing, archiving, and responsible reuse according to the license statement applied to the article.",
          "Where third-party material is included, authors must ensure permission or an appropriate reuse basis before submission.",
        ],
      },
      {
        heading: "Article metadata",
        body: [
          "Published records may include article links, DOI links where available, issue metadata, journal branding, and citation information.",
        ],
      },
    ],
  },
  {
    slug: "privacy-policy",
    title: "Privacy Policy",
    description:
      "How account, submission, review, payment, and publication data are handled.",
    updated: "July 2026",
    sections: [
      {
        heading: "Data collected",
        body: [
          "The platform collects account details, role assignments, manuscript information, review activity, payment records, publication metadata, and communication details required to operate the journal.",
          "Some published metadata, such as article title, author names, abstract, issue assignment, DOI, and article links, is intended to be public after publication.",
        ],
      },
      {
        heading: "How data is used",
        body: [
          "Data is used to manage submission, peer review, editorial decisions, publication, payments, email notifications, indexing preparation, and journal administration.",
          "Reviewer and editorial workflow information is handled with confidentiality according to the double-blind review model and journal governance.",
        ],
      },
      {
        heading: "Contact",
        body: [
          "Questions about privacy, account data, or publication records can be sent to editorial@nimasrepub.com.ng.",
        ],
      },
    ],
  },
];

export function getPolicyPage(slug: string) {
  return policyPages.find((page) => page.slug === slug) ?? null;
}
