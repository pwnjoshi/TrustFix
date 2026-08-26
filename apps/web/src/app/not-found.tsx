import Link from "next/link";
import { ArrowLeft, MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import { MarketingHeader, MarketingFooter } from "@/components/marketing-shell";

export default function NotFound() {
  return (
    <main className="marketing-page">
      <MarketingHeader />
      <div className="not-found-page">
        <h1>404</h1>
        <h2>Page not found</h2>
        <p>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          If you&apos;re looking for the security review app, try the links below.
        </p>
        <div className="not-found-actions">
          <Link href="https://thetrustfix.xyz" className="button secondary">
            <ArrowLeft size={14} /> Back to home
          </Link>
          <Link href="https://thetrustfix.xyz/demo" className="button primary">
            <MagnifyingGlass size={14} /> Try the demo
          </Link>
        </div>
      </div>
      <MarketingFooter />
    </main>
  );
}
