export interface Post { slug: string; title: string; description: string; date: string; tool: string; body: { h?: string; p?: string; ul?: string[] }[] }

export const posts: Post[] = [
  {
    slug: "how-to-compress-a-pdf-for-email", title: "How to compress a PDF for email (without ruining it)", date: "2026-10-05", tool: "compress-pdf",
    description: "Most email providers cap attachments around 20–25 MB. Here is how to shrink a PDF fast and keep it readable.",
    body: [
      { p: "Email providers typically reject attachments over 20–25 MB, and big PDFs are slow to open on phones. The good news: most PDFs are large because of images, and images compress very well." },
      { h: "Step by step" }, { ul: ["Open the Compress PDF tool and drop in your file.", "Pick Balanced for everyday documents, Smallest for scans you only need to read, or High quality when print matters.", "Download the result and compare file sizes. Anything under about 10 MB sends reliably."] },
      { h: "Why files get so big" }, { p: "Scans and photos are stored at high resolution, fonts may be embedded many times, and exports from presentation software often keep unused data. Compression re-encodes the images at a sensible resolution and removes the waste, usually cutting 50–90% for scanned documents." },
      { h: "If it is still too large" }, { ul: ["Split the PDF into two parts and send them separately.", "Remove pages you do not need with Delete PDF Pages.", "Convert colour pages to Grayscale PDF if colour is not important."] },
    ],
  },
  {
    slug: "merge-pdf-files-for-free", title: "How to merge PDF files for free, privately", date: "2026-10-05", tool: "merge-pdf",
    description: "Combine several PDFs into one document in your browser — your files never leave your device.",
    body: [
      { p: "Merging PDFs is one of the most common document chores: stitching together an application, contract pages, receipts or scanned chapters. You do not need to install anything or upload sensitive files to a stranger’s server." },
      { h: "Merge in your browser" }, { ul: ["Open Merge PDF and drop all the files in.", "Drag the arrows to put them in the right order.", "Click Merge and download a single PDF."] },
      { h: "Tips" }, { ul: ["Need only some pages? Use Extract PDF Pages first, then merge.", "Add page numbers afterwards with Add Page Numbers to PDF so the combined file reads like one document.", "Merged a scan? Run OCR PDF to make the text searchable."] },
      { p: "Because the merge runs locally in your browser, it is safe for confidential documents and works even on a slow connection." },
    ],
  },
  {
    slug: "protect-and-unlock-pdf-passwords", title: "Protect a PDF with a password — and unlock one you own", date: "2026-10-05", tool: "protect-pdf",
    description: "How PDF passwords work, how to add one, and how to remove a password you already know.",
    body: [
      { p: "A password-protected PDF is encrypted, so the contents are unreadable without the password. This is the simplest way to share a sensitive document by email." },
      { h: "Add a password" }, { ul: ["Open Protect PDF and choose your file.", "Enter a strong password — a long phrase beats a short complex one.", "Share the password through a different channel than the file (a call or a message)."] },
      { h: "Remove a password you know" }, { p: "If you opened a PDF with its password and want a copy that opens without one, use Unlock PDF and enter the current password. We only remove passwords you already know — we do not crack or guess passwords." },
      { h: "Good to know" }, { ul: ["Protect and Unlock run on our secure servers; files are deleted within an hour.", "For the strongest privacy, add the password before the file ever leaves your computer."] },
    ],
  },
  {
    slug: "how-to-sign-a-pdf-online", title: "How to sign a PDF online without printing", date: "2026-10-05", tool: "sign-pdf",
    description: "Draw or type your signature and place it on any page — all in your browser.",
    body: [
      { p: "Printing, signing and scanning a document wastes time. You can sign a PDF directly instead." },
      { h: "Sign in four steps" }, { ul: ["Open Sign PDF and choose your file.", "Draw your signature with a mouse or finger, or type your name in a script style.", "Click on the page where it should go and adjust the size.", "Click Sign PDF and download the result."] },
      { h: "Is it legally binding?" }, { p: "A placed signature image is accepted for many everyday documents, but legal requirements differ by country and by document type. Contracts, property and government forms may need a certified or qualified e-signature. Check what the receiving party requires." },
      { h: "Keep it tidy" }, { ul: ["Flatten PDF makes filled form fields permanent.", "Redact PDF permanently hides sensitive details before you share.", "Add a Watermark to mark a copy as DRAFT or CONFIDENTIAL."] },
    ],
  },
];
export const getPost = (slug: string) => posts.find((p) => p.slug === slug);
