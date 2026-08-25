import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Mark } from "./brand";

export function MarketingHeader() {
  return <nav className="marketing-nav"><Link href="/"><Mark/></Link><div className="nav-links"><Link href="/product">Product</Link><Link href="/#controls">Controls</Link><Link href="/security">Security</Link><Link href="/demo">Public demo</Link><a className="button secondary" href="/app">Sign in</a><a className="button primary" href="/app">Open workspace <ArrowRight size={14}/></a></div></nav>;
}

export function MarketingFooter() {
  return <footer><Mark/><div className="footer-links"><Link href="/product">Product</Link><Link href="/demo">Demo</Link><Link href="/security">Security</Link><a href="/app">Sign in</a></div><span>© 2026 TrustFix</span></footer>;
}

export function PublicNotice() {
  return <div className="public-notice"><strong>Public illustrative experience</strong><span>No cloud account or login required. Demo data is clearly labeled and never presented as live evidence.</span></div>;
}
