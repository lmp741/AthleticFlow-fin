import { jsxs, Fragment, jsx } from 'react/jsx-runtime';
import { useState } from 'react';
import { MoreVertical, Pencil, Trash2, Loader2 } from 'lucide-react';
import { D as DropdownMenu, c as DropdownMenuTrigger, a as DropdownMenuContent, b as DropdownMenuItem } from './dropdown-menu-DzAqYcNu.mjs';
import { D as Dialog, c as DialogContent, f as DialogHeader, g as DialogTitle, d as DialogDescription, e as DialogFooter, B as Button } from './ssr.mjs';
import { T as Textarea } from './textarea-CI2Of91b.mjs';

function MessageActions({
  canEdit,
  initialText,
  onEdit,
  onDelete,
  align = "end",
  variant = "light"
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [text, setText] = useState(initialText);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await onEdit(text.trim());
      setEditOpen(false);
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    setBusy(true);
    try {
      await onDelete();
      setDelOpen(false);
    } finally {
      setBusy(false);
    }
  };
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs(DropdownMenu, { children: [
      /* @__PURE__ */ jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          className: `opacity-0 transition group-hover:opacity-100 focus:opacity-100 ${variant === "dark" ? "text-primary-foreground/70 hover:text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`,
          "aria-label": "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F \u0441 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435\u043C",
          children: /* @__PURE__ */ jsx(MoreVertical, { className: "h-3.5 w-3.5" })
        }
      ) }),
      /* @__PURE__ */ jsxs(DropdownMenuContent, { align, className: "w-44", children: [
        canEdit && /* @__PURE__ */ jsxs(
          DropdownMenuItem,
          {
            onClick: () => {
              setText(initialText);
              setEditOpen(true);
            },
            children: [
              /* @__PURE__ */ jsx(Pencil, { className: "mr-2 h-3.5 w-3.5" }),
              " \u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C"
            ]
          }
        ),
        /* @__PURE__ */ jsxs(
          DropdownMenuItem,
          {
            className: "text-destructive focus:text-destructive",
            onClick: () => setDelOpen(true),
            children: [
              /* @__PURE__ */ jsx(Trash2, { className: "mr-2 h-3.5 w-3.5" }),
              " \u0423\u0434\u0430\u043B\u0438\u0442\u044C"
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsx(Dialog, { open: editOpen, onOpenChange: setEditOpen, children: /* @__PURE__ */ jsxs(DialogContent, { children: [
      /* @__PURE__ */ jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsx(DialogTitle, { children: "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435" }),
        /* @__PURE__ */ jsx(DialogDescription, { children: "\u0422\u0435\u043A\u0441\u0442 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F \u0431\u0443\u0434\u0435\u0442 \u043E\u0431\u043D\u043E\u0432\u043B\u0451\u043D \u0434\u043B\u044F \u0432\u0441\u0435\u0445." })
      ] }),
      /* @__PURE__ */ jsx(
        Textarea,
        {
          value: text,
          onChange: (e) => setText(e.target.value),
          rows: 4,
          maxLength: 2e3
        }
      ),
      /* @__PURE__ */ jsxs(DialogFooter, { children: [
        /* @__PURE__ */ jsx(Button, { variant: "ghost", onClick: () => setEditOpen(false), disabled: busy, children: "\u041E\u0442\u043C\u0435\u043D\u0430" }),
        /* @__PURE__ */ jsxs(Button, { onClick: save, disabled: busy || !text.trim(), children: [
          busy ? /* @__PURE__ */ jsx(Loader2, { className: "mr-1 h-4 w-4 animate-spin" }) : null,
          "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C"
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx(Dialog, { open: delOpen, onOpenChange: setDelOpen, children: /* @__PURE__ */ jsxs(DialogContent, { children: [
      /* @__PURE__ */ jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsx(DialogTitle, { children: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435?" }),
        /* @__PURE__ */ jsx(DialogDescription, { children: "\u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435 \u0431\u0443\u0434\u0435\u0442 \u0443\u0434\u0430\u043B\u0435\u043D\u043E \u0434\u043B\u044F \u0432\u0441\u0435\u0445 \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u043E\u0432 \u044D\u0442\u043E\u0433\u043E \u0447\u0430\u0442\u0430." })
      ] }),
      /* @__PURE__ */ jsxs(DialogFooter, { children: [
        /* @__PURE__ */ jsx(Button, { variant: "ghost", onClick: () => setDelOpen(false), disabled: busy, children: "\u041E\u0442\u043C\u0435\u043D\u0430" }),
        /* @__PURE__ */ jsxs(Button, { variant: "destructive", onClick: remove, disabled: busy, children: [
          busy ? /* @__PURE__ */ jsx(Loader2, { className: "mr-1 h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsx(Trash2, { className: "mr-1 h-4 w-4" }),
          "\u0423\u0434\u0430\u043B\u0438\u0442\u044C"
        ] })
      ] })
    ] }) })
  ] });
}

export { MessageActions as M };
//# sourceMappingURL=MessageActions-DynuQ5sb.mjs.map
