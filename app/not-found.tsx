import Link from "next/link";
import { getT } from "@/lib/i18n";

export default function NotFound() {
  const { t } = getT();
  return (
    <div className="card mx-auto max-w-md text-center">
      <p className="text-5xl font-bold text-xenon">404</p>
      <p className="mt-2">{t("notfound")}</p>
      <Link href="/" className="btn-primary mt-4">{t("nav.home")}</Link>
    </div>
  );
}
