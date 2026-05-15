import { Link } from "@tanstack/react-router";
import logoHorizontalUrl from "@/components/brand/Горизонтальный логотип белый.png?url";
import logoMarkUrl from "@/components/brand/Упрощенный логотип белый.png?url";

interface LogoProps {
  className?: string;
  /**
   * Variant of the logo to show.
   * - "auto" (default) — horizontal on md+, mark-only on mobile (recommended for header)
   * - "horizontal" — always show horizontal (for footer / wide spots)
   * - "mark" — always show mark only (for compact spots)
   */
  variant?: "auto" | "horizontal" | "mark";
}

/**
 * Brand logo with a brand-gradient backdrop so the white asset stays visible
 * on light and dark surfaces alike. Anchored to the home page.
 */
export function Logo({ className = "", variant = "auto" }: LogoProps) {
  const showHorizontal = variant === "horizontal";
  const showMark = variant === "mark";
  return (
    <Link
      to="/"
      aria-label="Athletic Flow — на главную"
      className={`inline-flex items-center ${className}`}
    >
      <span className="inline-flex items-center justify-center rounded-xl bg-gradient-brand px-2.5 py-1.5 shadow-sm">
        {!showMark && (
          <img
            src={logoHorizontalUrl}
            alt="Athletic Flow"
            width={520}
            height={120}
            className={
              showHorizontal
                ? "h-5 w-auto sm:h-6"
                : "hidden h-6 w-auto md:block"
            }
            decoding="async"
          />
        )}
        {!showHorizontal && (
          <img
            src={logoMarkUrl}
            alt="Athletic Flow"
            width={120}
            height={120}
            className={
              showMark
                ? "h-6 w-auto"
                : "h-6 w-auto md:hidden"
            }
            decoding="async"
          />
        )}
      </span>
    </Link>
  );
}
