import Image from "next/image";

export function Mark({ compact = false, size = 26 }: { compact?: boolean; size?: number }) {
  return (
    <span className="brand" aria-label="TrustFix" style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}>
      <Image
        src="/logo.png"
        alt="TrustFix"
        width={size}
        height={size}
        priority
        style={{ objectFit: "contain", display: "inline-block", width: size, height: size }}
      />
      {!compact && (
        <span style={{ fontSize: "16px", fontWeight: 750, letterSpacing: "-0.03em", color: "currentColor" }}>
          Trust<span style={{ color: "#10b981" }}>Fix</span>
        </span>
      )}
    </span>
  );
}

