"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle, Cloud, Warning } from "@phosphor-icons/react";

const api = "/api/trustfix/api";
type Review = { name: string; status: string; questions: Array<{ status?: string; question: string; control_id?: string }> };
type Connection = { status: string; project?: string; evidence_count: number; last_verified?: string };

export default function Dashboard() {
  const [review, setReview] = useState<Review | null>(null);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([
      fetch(`${api}/reviews/demo/current`, { cache: "no-store" }).then(async response => response.status === 404 ? fetch(`${api}/reviews/demo`, { method: "POST" }) : response).then(response => response.json()),
      fetch(`${api}/integrations/google-cloud`, { cache: "no-store" }).then(response => response.json()),
    ]).then(([nextReview, nextConnection]) => { setReview(nextReview); setConnection(nextConnection); }).catch(e => setError(e.message));
  }, []);
  const counts = review?.questions.reduce((sum, question) => ({ ...sum, [question.status || "NEEDS_REVIEW"]: (sum[question.status || "NEEDS_REVIEW"] || 0) + 1 }), {} as Record<string,number>) || {};
  const failed = review?.questions.filter(question => question.status === "FAILED") || [];
  return <main className="page dashboard"><div className="page-heading"><div><span className="breadcrumb">TRUSTFIX / OVERVIEW</span><h1>Security assurance</h1><p>Live posture across the connected disposable Google Cloud project.</p></div></div>{error && <div className="preview-banner">{error}</div>}<section className="metrics"><article><span>Active reviews</span><strong>{review ? 1 : 0}</strong><small>{review?.status || "Loading"}</small></article><article><span>Verified controls</span><strong>{counts.VERIFIED || 0}</strong><small className="positive"><CheckCircle/> Evidence backed</small></article><article><span>Failed controls</span><strong>{counts.FAILED || 0}</strong><small className="negative"><Warning/> Action required</small></article><article><span>Needs review</span><strong>{(counts.NEEDS_REVIEW || 0) + (counts.UNSUPPORTED || 0)}</strong><small>Manual review</small></article></section><div className="dashboard-grid"><section className="panel current-review"><div className="panel-heading"><div><span className="overline">CURRENT SECURITY REVIEW</span><h2>{review?.name || "Loading review"}</h2></div><Link href="/app/reviews">Open review <ArrowRight size={15}/></Link></div><div className="review-progress"><div className="score"><strong>{counts.VERIFIED || 0}</strong><span>/ {review?.questions.length || 0} verified</span></div></div><div className="review-meta"><div><span>Status</span><strong>{review?.status || "Loading"}</strong></div><div><span>Target</span><strong>{connection?.project || "Not configured"}</strong></div><div><span>Evidence records</span><strong>{connection?.evidence_count || 0}</strong></div></div></section><section className="panel findings"><div className="panel-heading"><div><span className="overline">FINDINGS REQUIRING ACTION</span><h2>Open findings</h2></div><span className="count">{failed.length}</span></div>{failed.length ? failed.map(question => <Link href="/app/reviews" className="finding-row" key={question.question}><span className="finding-icon critical"><Warning size={18}/></span><div><strong>{question.question}</strong><small>{question.control_id}</small></div><ArrowRight/></Link>) : <div className="finding-row"><span className="finding-icon high"><CheckCircle/></span><div><strong>No failed controls</strong><small>Run a live review to refresh</small></div></div>}</section><section className="panel connection"><div className="panel-heading"><div><span className="overline">CLOUD CONNECTION</span><h2>Google Cloud</h2></div><span className={`status ${connection?.status === "CONNECTED" ? "verified" : "failed"}`}>{connection?.status === "CONNECTED" ? "Connected" : "Not configured"}</span></div><div className="cloud-mark"><Cloud size={26}/></div><dl><div><dt>Project</dt><dd>{connection?.project || "—"}</dd></div><div><dt>Evidence</dt><dd>{connection?.evidence_count || 0} records</dd></div><div><dt>Last verified</dt><dd>{connection?.last_verified ? new Date(connection.last_verified).toLocaleString() : "Run verification"}</dd></div></dl><Link href="/app/integrations" className="button secondary wide">Manage connection</Link></section></div></main>;
}
