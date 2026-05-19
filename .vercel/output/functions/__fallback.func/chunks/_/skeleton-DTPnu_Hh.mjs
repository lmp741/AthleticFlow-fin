import { jsx } from 'react/jsx-runtime';
import { o as cn } from './ssr.mjs';

function Skeleton({ className, ...props }) {
  return /* @__PURE__ */ jsx("div", { className: cn("animate-pulse rounded-md bg-primary/10", className), ...props });
}

export { Skeleton as S };
//# sourceMappingURL=skeleton-DTPnu_Hh.mjs.map
