import { jsx, Fragment } from 'react/jsx-runtime';
import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { u as useAuth } from './ssr.mjs';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);
  if (loading || !user) {
    return /* @__PURE__ */ jsx("div", { className: "flex min-h-screen items-center justify-center", children: /* @__PURE__ */ jsx("div", { className: "h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" }) });
  }
  return /* @__PURE__ */ jsx(Fragment, { children });
}

export { RequireAuth as R };
//# sourceMappingURL=RequireAuth-D6K_CCtb.mjs.map
