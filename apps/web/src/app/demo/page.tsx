"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle, CloudCheck, LockKey, Warning } from "@phosphor-icons/react";
import { MarketingFooter, MarketingHeader, PublicNotice } from "@/components/marketing-shell";

const steps = [
  ["Interpret", "Question mapped to GCP_STORAGE_PUBLIC_ACCESS"],
  ["Inspect", "Bucket IAM contains allUsers → objectViewer"],
  ["Evaluate", "Control failed against illustrative evidence"],
  ["Plan", "Remove the public binding and enforce prevention"],
  ["Approve", "A workspace owner approves the minimum change"],
  ["Verify", "Anonymous object request returns 403"],
] as const;

export default function PublicDemo() {
  const [stage, setStage] = useState(2);
  const remediated = stage >= 5;
  return <main className="marketing-page"><MarketingHeader/><PublicNotice/><section className="demo-hero"><span className="section-index">INTERACTIVE PRODUCT WALKTHROUGH</span><h1>See the TrustFix loop before connecting a cloud.</h1><p>This interface is illustrative. It demonstrates the exact decisions, approval boundary, and proof TrustFix produces in a real workspace.</p></section><section className="demo-console"><div className="demo-console-head"><div><span className="micro">ILLUSTRATIVE SECURITY REVIEW</span><h2>Is sensitive customer storage inaccessible from the public internet?</h2></div><span className={`status ${remediated ? "verified" : "failed"}`}>{remediated ? "Verified" : "Failed"}</span></div><div className="demo-console-grid"><ol className="demo-steps">{steps.map(([title,detail],index) => <li key={title} className={index <= stage ? "complete" : "pending"}><span>{index < stage || remediated ? <CheckCircle weight="fill"/> : index + 1}</span><button onClick={() => setStage(index)}><strong>{title}</strong><small>{detail}</small></button></li>)}</ol><div className="demo-proof"><span className={`proof-icon ${remediated ? "pass" : "fail"}`}>{remediated ? <LockKey/> : <Warning/>}</span><span className="micro">RESOURCE</span><code>gs://trustfix-public-storage-demo</code><dl><div><dt>Before</dt><dd>Anonymous read allowed</dd></div><div><dt>Planned delta</dt><dd>Remove only public IAM principals</dd></div><div><dt>Approval</dt><dd>Owner required</dd></div><div><dt>After</dt><dd>{remediated ? "403 Forbidden" : "Not executed"}</dd></div></dl><button className="button primary wide" onClick={() => setStage(remediated ? 2 : 5)}>{remediated ? "Reset walkthrough" : "Show approved remediation"}</button></div></div>{remediated && <div className="demo-answer"><CloudCheck size={24}/><div><span className="micro">EVIDENCE-BACKED ANSWER</span><strong>Yes. Public access is denied.</strong><p>Verified against bucket IAM and an anonymous access test. This public walkthrough uses illustrative data; a signed-in workspace performs the same steps against the configured disposable project.</p></div></div>}</section><section className="split-cta"><div><span className="section-index">READY FOR REAL VERIFICATION?</span><h2>Move from illustrative data to your protected workspace.</h2></div><a className="button primary" href="/app">Sign in and start onboarding <ArrowRight/></a></section><MarketingFooter/></main>;
}
