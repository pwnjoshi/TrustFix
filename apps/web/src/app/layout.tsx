import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./product-upgrade.css";
import { ToastProvider } from "@/components/toast";

const geist = Geist({ variable: "--font-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TrustFix — Verified security reviews",
  description:
    "Verify security requirements against live cloud infrastructure, fix gaps safely, and prove the result.",
  metadataBase: new URL("https://trustfix.app"),
  openGraph: {
    title: "TrustFix — Verified security reviews",
    description: "Security reviews backed by live Google Cloud evidence.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: `(function(){try{var u=new URL(location.href),q=u.searchParams.get('theme'),t=(q==='light'||q==='dark')?q:localStorage.getItem('trustfix:theme');if(t!=='light'&&t!=='dark')t=matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';localStorage.setItem('trustfix:theme',t);document.documentElement.dataset.theme=t;if(q==='light'||q==='dark'){u.searchParams.delete('theme');history.replaceState(history.state,'',u.pathname+(u.search||'')+u.hash)}document.addEventListener('click',function(e){if(location.hostname.indexOf('trustfix-workspace-')===0)return;var a=e.target&&e.target.closest?e.target.closest('a[href]'):null;if(!a)return;var v=new URL(a.href,location.href);if(v.origin===location.origin&&v.pathname==='/app'){v.searchParams.set('theme',document.documentElement.dataset.theme||t);a.href=v.toString()}} ,true)}catch(e){document.documentElement.dataset.theme='dark'}})()` }}/></head>
      <body className={`${geist.variable} ${mono.variable}`} suppressHydrationWarning>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
