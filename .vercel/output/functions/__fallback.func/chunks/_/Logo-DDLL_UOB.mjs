import { jsx, jsxs } from 'react/jsx-runtime';
import { Link } from '@tanstack/react-router';

const logoHorizontalUrl = "/assets/%D0%93%D0%BE%D1%80%D0%B8%D0%B7%D0%BE%D0%BD%D1%82%D0%B0%D0%BB%D1%8C%D0%BD%D1%8B%D0%B9%20%D0%BB%D0%BE%D0%B3%D0%BE%D1%82%D0%B8%D0%BF%20%D0%B1%D0%B5%D0%BB%D1%8B%D0%B9-DEyAiXvP.png";
const logoMarkUrl = "/assets/%D0%A3%D0%BF%D1%80%D0%BE%D1%89%D0%B5%D0%BD%D0%BD%D1%8B%D0%B9%20%D0%BB%D0%BE%D0%B3%D0%BE%D1%82%D0%B8%D0%BF%20%D0%B1%D0%B5%D0%BB%D1%8B%D0%B9-UKham_k-.png";
function Logo({ className = "", variant = "auto" }) {
  const showHorizontal = variant === "horizontal";
  const showMark = variant === "mark";
  return /* @__PURE__ */ jsx(
    Link,
    {
      to: "/",
      "aria-label": "Athletic Flow \u2014 \u043D\u0430 \u0433\u043B\u0430\u0432\u043D\u0443\u044E",
      className: `inline-flex items-center ${className}`,
      children: /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center justify-center rounded-xl bg-gradient-brand px-2.5 py-1.5 shadow-sm", children: [
        !showMark && /* @__PURE__ */ jsx(
          "img",
          {
            src: logoHorizontalUrl,
            alt: "Athletic Flow",
            width: 520,
            height: 120,
            className: showHorizontal ? "h-5 w-auto sm:h-6" : "hidden h-6 w-auto md:block",
            decoding: "async"
          }
        ),
        !showHorizontal && /* @__PURE__ */ jsx(
          "img",
          {
            src: logoMarkUrl,
            alt: "Athletic Flow",
            width: 120,
            height: 120,
            className: showMark ? "h-6 w-auto" : "h-6 w-auto md:hidden",
            decoding: "async"
          }
        )
      ] })
    }
  );
}

export { Logo as L };
//# sourceMappingURL=Logo-DDLL_UOB.mjs.map
