import { CheckCircle, WarningCircle, XCircle } from "@phosphor-icons/react/dist/ssr";

export function Status({ value }: { value: "Verified" | "Failed" | "Needs review" }) {
  const Icon = value === "Verified" ? CheckCircle : value === "Failed" ? XCircle : WarningCircle;
  return <span className={`status ${value.toLowerCase().replace(" ", "-")}`}><Icon weight="fill" size={14}/>{value}</span>;
}

