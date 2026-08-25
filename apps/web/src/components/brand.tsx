export function Mark({ compact = false }: { compact?: boolean }) {
  return <span className="brand" aria-label="TrustFix"><svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 8.5 12 4l7 4.5v7L12 20l-7-4.5v-7Z" stroke="currentColor" strokeWidth="1.5"/><path d="m8.2 12.1 2.5 2.5 5.3-5.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>{!compact && <strong>TrustFix</strong>}</span>;
}

