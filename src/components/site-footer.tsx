import Link from "next/link";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-brand-navy text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <p className="text-2xl font-extrabold tracking-tight">NIMASREPUB</p>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-white/78">
            A premier peer-reviewed scholarly repository dedicated to the
            Nigerian medical and allied sciences community, fostering
            institutional authority and research excellence.
          </p>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-green-light">
            Journal
          </p>
          <ul className="mt-4 space-y-3 text-sm text-white/80">
            <li><Link href="/issues" className="hover:text-white">Current Issue</Link></li>
            <li><Link href="/issues" className="hover:text-white">Archive</Link></li>
            <li><Link href="/signup" className="hover:text-white">Submit Manuscript</Link></li>
            <li><Link href="/policies/author-guidelines" className="hover:text-white">Author Guidelines</Link></li>
            <li><Link href="/policies/review-policy" className="hover:text-white">Peer Review Policy</Link></li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-green-light">
            Contact
          </p>
          <div className="mt-4 space-y-3 text-sm text-white/80">
            <p>Port Harcourt, Nigeria</p>
            <p>editorial@nimasrepub.com.ng</p>
            <p>ISSN: pending</p>
            <Link href="/policies/publication-ethics" className="block hover:text-white">Publication Ethics</Link>
            <Link href="/policies/apc-policy" className="block hover:text-white">APC Policy</Link>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            &copy; {year} Nigerian Medical and Allied Sciences Research Publication.
          </p>
          <div className="flex gap-5">
            <Link href="/policies/privacy-policy" className="hover:text-white">Privacy</Link>
            <Link href="/policies/copyright-and-licensing" className="hover:text-white">Copyright</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
