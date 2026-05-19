import { jsx, jsxs } from 'react/jsx-runtime';
import { createFileRoute, lazyRouteComponent, createRootRoute, HeadContent, Scripts, Outlet, RouterProvider, Link, useRouterState, createRouter as createRouter$1, useRouter } from '@tanstack/react-router';
import * as React from 'react';
import { useContext, createContext, useState, useEffect, useRef, useCallback } from 'react';
import { Toaster as Toaster$1, toast } from 'sonner';
import { createClient } from '@supabase/supabase-js';
import { X, PhoneOff, Phone, MicOff, Mic, VideoOff, Video } from 'lucide-react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { createMemoryHistory } from '@tanstack/history';
import { json, mergeHeaders } from '@tanstack/router-core/ssr/client';
import { joinPaths, trimPath, processRouteTree, isRedirect, isResolvedRedirect, isNotFound, rootRouteId, getMatchedRoutes, isPlainObject } from '@tanstack/router-core';
import { attachRouterServerSsrUtils } from '@tanstack/router-core/ssr/server';
import { AsyncLocalStorage } from 'node:async_hooks';
import invariant from 'tiny-invariant';
import { defineHandlerCallback, renderRouterToStream } from '@tanstack/react-router/ssr/server';

function hasProp(obj, prop) {
  try {
    return prop in obj;
  } catch {
    return false;
  }
}

var __defProp$2 = Object.defineProperty;
var __defNormalProp$2 = (obj, key, value) => key in obj ? __defProp$2(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField$2 = (obj, key, value) => {
  __defNormalProp$2(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
class H3Error extends Error {
  constructor(message, opts = {}) {
    super(message, opts);
    __publicField$2(this, "statusCode", 500);
    __publicField$2(this, "fatal", false);
    __publicField$2(this, "unhandled", false);
    __publicField$2(this, "statusMessage");
    __publicField$2(this, "data");
    __publicField$2(this, "cause");
    if (opts.cause && !this.cause) {
      this.cause = opts.cause;
    }
  }
  toJSON() {
    const obj = {
      message: this.message,
      statusCode: sanitizeStatusCode(this.statusCode, 500)
    };
    if (this.statusMessage) {
      obj.statusMessage = sanitizeStatusMessage(this.statusMessage);
    }
    if (this.data !== void 0) {
      obj.data = this.data;
    }
    return obj;
  }
}
__publicField$2(H3Error, "__h3_error__", true);
function createError(input) {
  if (typeof input === "string") {
    return new H3Error(input);
  }
  if (isError(input)) {
    return input;
  }
  const err = new H3Error(input.message ?? input.statusMessage ?? "", {
    cause: input.cause || input
  });
  if (hasProp(input, "stack")) {
    try {
      Object.defineProperty(err, "stack", {
        get() {
          return input.stack;
        }
      });
    } catch {
      try {
        err.stack = input.stack;
      } catch {
      }
    }
  }
  if (input.data) {
    err.data = input.data;
  }
  if (input.statusCode) {
    err.statusCode = sanitizeStatusCode(input.statusCode, err.statusCode);
  } else if (input.status) {
    err.statusCode = sanitizeStatusCode(input.status, err.statusCode);
  }
  if (input.statusMessage) {
    err.statusMessage = input.statusMessage;
  } else if (input.statusText) {
    err.statusMessage = input.statusText;
  }
  if (err.statusMessage) {
    const originalMessage = err.statusMessage;
    const sanitizedMessage = sanitizeStatusMessage(err.statusMessage);
    if (sanitizedMessage !== originalMessage) {
      console.warn(
        "[h3] Please prefer using `message` for longer error messages instead of `statusMessage`. In the future, `statusMessage` will be sanitized by default."
      );
    }
  }
  if (input.fatal !== void 0) {
    err.fatal = input.fatal;
  }
  if (input.unhandled !== void 0) {
    err.unhandled = input.unhandled;
  }
  return err;
}
function isError(input) {
  return input?.constructor?.__h3_error__ === true;
}
function isMethod(event, expected, allowHead) {
  if (typeof expected === "string") {
    if (event.method === expected) {
      return true;
    }
  } else if (expected.includes(event.method)) {
    return true;
  }
  return false;
}
function assertMethod(event, expected, allowHead) {
  if (!isMethod(event, expected)) {
    throw createError({
      statusCode: 405,
      statusMessage: "HTTP method is not allowed."
    });
  }
}
function getRequestHost(event, opts = {}) {
  if (opts.xForwardedHost) {
    const xForwardedHost = event.node.req.headers["x-forwarded-host"];
    if (xForwardedHost) {
      return xForwardedHost;
    }
  }
  return event.node.req.headers.host || "localhost";
}
function getRequestProtocol(event, opts = {}) {
  if (opts.xForwardedProto !== false && event.node.req.headers["x-forwarded-proto"] === "https") {
    return "https";
  }
  return event.node.req.connection?.encrypted ? "https" : "http";
}
function getRequestURL(event, opts = {}) {
  const host = getRequestHost(event, opts);
  const protocol = getRequestProtocol(event, opts);
  const path = (event.node.req.originalUrl || event.path).replace(
    /^[/\\]+/g,
    "/"
  );
  return new URL(path, `${protocol}://${host}`);
}
function toWebRequest(event) {
  return event.web?.request || new Request(getRequestURL(event), {
    // @ts-ignore Undici option
    duplex: "half",
    method: event.method,
    headers: event.headers,
    body: getRequestWebStream(event)
  });
}

const RawBodySymbol = Symbol.for("h3RawBody");
const PayloadMethods$1 = ["PATCH", "POST", "PUT", "DELETE"];
function readRawBody(event, encoding = "utf8") {
  assertMethod(event, PayloadMethods$1);
  const _rawBody = event._requestBody || event.web?.request?.body || event.node.req[RawBodySymbol] || event.node.req.rawBody || event.node.req.body;
  if (_rawBody) {
    const promise2 = Promise.resolve(_rawBody).then((_resolved) => {
      if (Buffer.isBuffer(_resolved)) {
        return _resolved;
      }
      if (typeof _resolved.pipeTo === "function") {
        return new Promise((resolve, reject) => {
          const chunks = [];
          _resolved.pipeTo(
            new WritableStream({
              write(chunk) {
                chunks.push(chunk);
              },
              close() {
                resolve(Buffer.concat(chunks));
              },
              abort(reason) {
                reject(reason);
              }
            })
          ).catch(reject);
        });
      } else if (typeof _resolved.pipe === "function") {
        return new Promise((resolve, reject) => {
          const chunks = [];
          _resolved.on("data", (chunk) => {
            chunks.push(chunk);
          }).on("end", () => {
            resolve(Buffer.concat(chunks));
          }).on("error", reject);
        });
      }
      if (_resolved.constructor === Object) {
        return Buffer.from(JSON.stringify(_resolved));
      }
      if (_resolved instanceof URLSearchParams) {
        return Buffer.from(_resolved.toString());
      }
      return Buffer.from(_resolved);
    });
    return encoding ? promise2.then((buff) => buff.toString(encoding)) : promise2;
  }
  if (!Number.parseInt(event.node.req.headers["content-length"] || "") && !String(event.node.req.headers["transfer-encoding"] ?? "").split(",").map((e) => e.trim()).filter(Boolean).includes("chunked")) {
    return Promise.resolve(void 0);
  }
  const promise = event.node.req[RawBodySymbol] = new Promise(
    (resolve, reject) => {
      const bodyData = [];
      event.node.req.on("error", (err) => {
        reject(err);
      }).on("data", (chunk) => {
        bodyData.push(chunk);
      }).on("end", () => {
        resolve(Buffer.concat(bodyData));
      });
    }
  );
  const result = encoding ? promise.then((buff) => buff.toString(encoding)) : promise;
  return result;
}
function getRequestWebStream(event) {
  if (!PayloadMethods$1.includes(event.method)) {
    return;
  }
  const bodyStream = event.web?.request?.body || event._requestBody;
  if (bodyStream) {
    return bodyStream;
  }
  const _hasRawBody = RawBodySymbol in event.node.req || "rawBody" in event.node.req || "body" in event.node.req || "__unenv__" in event.node.req;
  if (_hasRawBody) {
    return new ReadableStream({
      async start(controller) {
        const _rawBody = await readRawBody(event, false);
        if (_rawBody) {
          controller.enqueue(_rawBody);
        }
        controller.close();
      }
    });
  }
  return new ReadableStream({
    start: (controller) => {
      event.node.req.on("data", (chunk) => {
        controller.enqueue(chunk);
      });
      event.node.req.on("end", () => {
        controller.close();
      });
      event.node.req.on("error", (err) => {
        controller.error(err);
      });
    }
  });
}

const DISALLOWED_STATUS_CHARS = /[^\u0009\u0020-\u007E]/g;
function sanitizeStatusMessage(statusMessage = "") {
  return statusMessage.replace(DISALLOWED_STATUS_CHARS, "");
}
function sanitizeStatusCode(statusCode, defaultStatusCode = 200) {
  if (!statusCode) {
    return defaultStatusCode;
  }
  if (typeof statusCode === "string") {
    statusCode = Number.parseInt(statusCode, 10);
  }
  if (statusCode < 100 || statusCode > 999) {
    return defaultStatusCode;
  }
  return statusCode;
}
function splitCookiesString(cookiesString) {
  if (Array.isArray(cookiesString)) {
    return cookiesString.flatMap((c) => splitCookiesString(c));
  }
  if (typeof cookiesString !== "string") {
    return [];
  }
  const cookiesStrings = [];
  let pos = 0;
  let start;
  let ch;
  let lastComma;
  let nextStart;
  let cookiesSeparatorFound;
  const skipWhitespace = () => {
    while (pos < cookiesString.length && /\s/.test(cookiesString.charAt(pos))) {
      pos += 1;
    }
    return pos < cookiesString.length;
  };
  const notSpecialChar = () => {
    ch = cookiesString.charAt(pos);
    return ch !== "=" && ch !== ";" && ch !== ",";
  };
  while (pos < cookiesString.length) {
    start = pos;
    cookiesSeparatorFound = false;
    while (skipWhitespace()) {
      ch = cookiesString.charAt(pos);
      if (ch === ",") {
        lastComma = pos;
        pos += 1;
        skipWhitespace();
        nextStart = pos;
        while (pos < cookiesString.length && notSpecialChar()) {
          pos += 1;
        }
        if (pos < cookiesString.length && cookiesString.charAt(pos) === "=") {
          cookiesSeparatorFound = true;
          pos = nextStart;
          cookiesStrings.push(cookiesString.slice(start, lastComma));
          start = pos;
        } else {
          pos = lastComma + 1;
        }
      } else {
        pos += 1;
      }
    }
    if (!cookiesSeparatorFound || pos >= cookiesString.length) {
      cookiesStrings.push(cookiesString.slice(start));
    }
  }
  return cookiesStrings;
}

typeof setImmediate === "undefined" ? (fn) => fn() : setImmediate;
function getResponseStatus$1(event) {
  return event.node.res.statusCode;
}
function getResponseHeaders$1(event) {
  return event.node.res.getHeaders();
}
function sendStream(event, stream) {
  if (!stream || typeof stream !== "object") {
    throw new Error("[h3] Invalid stream provided.");
  }
  event.node.res._data = stream;
  if (!event.node.res.socket) {
    event._handled = true;
    return Promise.resolve();
  }
  if (hasProp(stream, "pipeTo") && typeof stream.pipeTo === "function") {
    return stream.pipeTo(
      new WritableStream({
        write(chunk) {
          event.node.res.write(chunk);
        }
      })
    ).then(() => {
      event.node.res.end();
    });
  }
  if (hasProp(stream, "pipe") && typeof stream.pipe === "function") {
    return new Promise((resolve, reject) => {
      stream.pipe(event.node.res);
      if (stream.on) {
        stream.on("end", () => {
          event.node.res.end();
          resolve();
        });
        stream.on("error", (error) => {
          reject(error);
        });
      }
      event.node.res.on("close", () => {
        if (stream.abort) {
          stream.abort();
        }
      });
    });
  }
  throw new Error("[h3] Invalid or incompatible stream provided.");
}
function sendWebResponse(event, response) {
  for (const [key, value] of response.headers) {
    if (key === "set-cookie") {
      event.node.res.appendHeader(key, splitCookiesString(value));
    } else {
      event.node.res.setHeader(key, value);
    }
  }
  if (response.status) {
    event.node.res.statusCode = sanitizeStatusCode(
      response.status,
      event.node.res.statusCode
    );
  }
  if (response.statusText) {
    event.node.res.statusMessage = sanitizeStatusMessage(response.statusText);
  }
  if (response.redirected) {
    event.node.res.setHeader("location", response.url);
  }
  if (!response.body) {
    event.node.res.end();
    return;
  }
  return sendStream(event, response.body);
}

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
class H3Event {
  constructor(req, res) {
    __publicField(this, "__is_event__", true);
    // Context
    __publicField(this, "node");
    // Node
    __publicField(this, "web");
    // Web
    __publicField(this, "context", {});
    // Shared
    // Request
    __publicField(this, "_method");
    __publicField(this, "_path");
    __publicField(this, "_headers");
    __publicField(this, "_requestBody");
    // Response
    __publicField(this, "_handled", false);
    // Hooks
    __publicField(this, "_onBeforeResponseCalled");
    __publicField(this, "_onAfterResponseCalled");
    this.node = { req, res };
  }
  // --- Request ---
  get method() {
    if (!this._method) {
      this._method = (this.node.req.method || "GET").toUpperCase();
    }
    return this._method;
  }
  get path() {
    return this._path || this.node.req.url || "/";
  }
  get headers() {
    if (!this._headers) {
      this._headers = _normalizeNodeHeaders(this.node.req.headers);
    }
    return this._headers;
  }
  // --- Respoonse ---
  get handled() {
    return this._handled || this.node.res.writableEnded || this.node.res.headersSent;
  }
  respondWith(response) {
    return Promise.resolve(response).then(
      (_response) => sendWebResponse(this, _response)
    );
  }
  // --- Utils ---
  toString() {
    return `[${this.method}] ${this.path}`;
  }
  toJSON() {
    return this.toString();
  }
  // --- Deprecated ---
  /** @deprecated Please use `event.node.req` instead. */
  get req() {
    return this.node.req;
  }
  /** @deprecated Please use `event.node.res` instead. */
  get res() {
    return this.node.res;
  }
}
function _normalizeNodeHeaders(nodeHeaders) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(nodeHeaders)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(name, item);
      }
    } else if (value) {
      headers.set(name, value);
    }
  }
  return headers;
}

function defineEventHandler$1(handler) {
  if (typeof handler === "function") {
    handler.__is_handler__ = true;
    return handler;
  }
  const _hooks = {
    onRequest: _normalizeArray(handler.onRequest),
    onBeforeResponse: _normalizeArray(handler.onBeforeResponse)
  };
  const _handler = (event) => {
    return _callHandler(event, handler.handler, _hooks);
  };
  _handler.__is_handler__ = true;
  _handler.__resolve__ = handler.handler.__resolve__;
  _handler.__websocket__ = handler.websocket;
  return _handler;
}
function _normalizeArray(input) {
  return input ? Array.isArray(input) ? input : [input] : void 0;
}
async function _callHandler(event, handler, hooks) {
  if (hooks.onRequest) {
    for (const hook of hooks.onRequest) {
      await hook(event);
      if (event.handled) {
        return;
      }
    }
  }
  const body = await handler(event);
  const response = { body };
  if (hooks.onBeforeResponse) {
    for (const hook of hooks.onBeforeResponse) {
      await hook(event, response);
    }
  }
  return response.body;
}

function StartServer(props) {
  return /* @__PURE__ */ jsx(RouterProvider, { router: props.router });
}
const defaultStreamHandler = defineHandlerCallback(
  ({ request, router, responseHeaders }) => renderRouterToStream({
    request,
    router,
    responseHeaders,
    children: /* @__PURE__ */ jsx(StartServer, { router })
  })
);
const startSerializer = {
  stringify: (value) => JSON.stringify(value, function replacer(key, val) {
    const ogVal = this[key];
    const serializer = serializers.find((t) => t.stringifyCondition(ogVal));
    if (serializer) {
      return serializer.stringify(ogVal);
    }
    return val;
  }),
  parse: (value) => JSON.parse(value, function parser(key, val) {
    const ogVal = this[key];
    if (isPlainObject(ogVal)) {
      const serializer = serializers.find((t) => t.parseCondition(ogVal));
      if (serializer) {
        return serializer.parse(ogVal);
      }
    }
    return val;
  }),
  encode: (value) => {
    if (Array.isArray(value)) {
      return value.map((v) => startSerializer.encode(v));
    }
    if (isPlainObject(value)) {
      return Object.fromEntries(
        Object.entries(value).map(([key, v]) => [
          key,
          startSerializer.encode(v)
        ])
      );
    }
    const serializer = serializers.find((t) => t.stringifyCondition(value));
    if (serializer) {
      return serializer.stringify(value);
    }
    return value;
  },
  decode: (value) => {
    if (isPlainObject(value)) {
      const serializer = serializers.find((t) => t.parseCondition(value));
      if (serializer) {
        return serializer.parse(value);
      }
    }
    if (Array.isArray(value)) {
      return value.map((v) => startSerializer.decode(v));
    }
    if (isPlainObject(value)) {
      return Object.fromEntries(
        Object.entries(value).map(([key, v]) => [
          key,
          startSerializer.decode(v)
        ])
      );
    }
    return value;
  }
};
const createSerializer = (key, check, toValue, fromValue) => ({
  key,
  stringifyCondition: check,
  stringify: (value) => ({ [`$${key}`]: toValue(value) }),
  parseCondition: (value) => Object.hasOwn(value, `$${key}`),
  parse: (value) => fromValue(value[`$${key}`])
});
const serializers = [
  createSerializer(
    // Key
    "undefined",
    // Check
    (v) => v === void 0,
    // To
    () => 0,
    // From
    () => void 0
  ),
  createSerializer(
    // Key
    "date",
    // Check
    (v) => v instanceof Date,
    // To
    (v) => v.toISOString(),
    // From
    (v) => new Date(v)
  ),
  createSerializer(
    // Key
    "error",
    // Check
    (v) => v instanceof Error,
    // To
    (v) => ({
      ...v,
      message: v.message,
      stack: void 0,
      cause: v.cause
    }),
    // From
    (v) => Object.assign(new Error(v.message), v)
  ),
  createSerializer(
    // Key
    "formData",
    // Check
    (v) => v instanceof FormData,
    // To
    (v) => {
      const entries = {};
      v.forEach((value, key) => {
        const entry = entries[key];
        if (entry !== void 0) {
          if (Array.isArray(entry)) {
            entry.push(value);
          } else {
            entries[key] = [entry, value];
          }
        } else {
          entries[key] = value;
        }
      });
      return entries;
    },
    // From
    (v) => {
      const formData = new FormData();
      Object.entries(v).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach((val) => formData.append(key, val));
        } else {
          formData.append(key, value);
        }
      });
      return formData;
    }
  ),
  createSerializer(
    // Key
    "bigint",
    // Check
    (v) => typeof v === "bigint",
    // To
    (v) => v.toString(),
    // From
    (v) => BigInt(v)
  ),
  createSerializer(
    // Key
    "server-function",
    // Check
    (v) => typeof v === "function" && "functionId" in v && typeof v.functionId === "string",
    // To
    ({ functionId }) => ({ functionId, __serverFn: true }),
    // From, dummy impl. the actual server function lookup is done on the server in packages/start-server-core/src/server-functions-handler.ts
    (v) => v
  )
];
const startStorage = new AsyncLocalStorage();
async function runWithStartContext(context, fn) {
  return startStorage.run(context, fn);
}
function flattenMiddlewares(middlewares) {
  const seen = /* @__PURE__ */ new Set();
  const flattened = [];
  const recurse = (middleware) => {
    middleware.forEach((m) => {
      if (m.options.middleware) {
        recurse(m.options.middleware);
      }
      if (!seen.has(m)) {
        seen.add(m);
        flattened.push(m);
      }
    });
  };
  recurse(middlewares);
  return flattened;
}
const eventStorage = new AsyncLocalStorage();
function defineEventHandler(handler) {
  return defineEventHandler$1((event) => {
    return runWithEvent(event, () => handler(event));
  });
}
async function runWithEvent(event, fn) {
  return eventStorage.run(event, fn);
}
function getEvent() {
  const event = eventStorage.getStore();
  if (!event) {
    throw new Error(
      `No HTTPEvent found in AsyncLocalStorage. Make sure you are using the function within the server runtime.`
    );
  }
  return event;
}
const HTTPEventSymbol = /* @__PURE__ */ Symbol("$HTTPEvent");
function isEvent(obj) {
  return typeof obj === "object" && (obj instanceof H3Event || (obj == null ? void 0 : obj[HTTPEventSymbol]) instanceof H3Event || (obj == null ? void 0 : obj.__is_event__) === true);
}
function createWrapperFunction(h3Function) {
  return function(...args) {
    const event = args[0];
    if (!isEvent(event)) {
      args.unshift(getEvent());
    } else {
      args[0] = event instanceof H3Event || event.__is_event__ ? event : event[HTTPEventSymbol];
    }
    return h3Function(...args);
  };
}
const getResponseStatus = createWrapperFunction(getResponseStatus$1);
const getResponseHeaders = createWrapperFunction(getResponseHeaders$1);
function requestHandler(handler) {
  return handler;
}
const VIRTUAL_MODULES = {
  routeTree: "tanstack-start-route-tree:v",
  startManifest: "tanstack-start-manifest:v",
  serverFnManifest: "tanstack-start-server-fn-manifest:v"
};
async function loadVirtualModule(id) {
  switch (id) {
    case VIRTUAL_MODULES.routeTree:
      return await Promise.resolve().then(() => routeTree_gen);
    case VIRTUAL_MODULES.startManifest:
      return await import('./_tanstack-start-manifest_v-CuXKOmNP.mjs');
    case VIRTUAL_MODULES.serverFnManifest:
      return await import('./_tanstack-start-server-fn-manifest_v-DtgTK7xl.mjs');
    default:
      throw new Error(`Unknown virtual module: ${id}`);
  }
}
async function getStartManifest(opts) {
  const { tsrStartManifest } = await loadVirtualModule(
    VIRTUAL_MODULES.startManifest
  );
  const startManifest = tsrStartManifest();
  const rootRoute = startManifest.routes[rootRouteId] = startManifest.routes[rootRouteId] || {};
  rootRoute.assets = rootRoute.assets || [];
  let script = `import('${startManifest.clientEntry}')`;
  rootRoute.assets.push({
    tag: "script",
    attrs: {
      type: "module",
      suppressHydrationWarning: true,
      async: true
    },
    children: script
  });
  const manifest = {
    ...startManifest,
    routes: Object.fromEntries(
      Object.entries(startManifest.routes).map(([k, v]) => {
        const { preloads, assets } = v;
        return [
          k,
          {
            preloads,
            assets
          }
        ];
      })
    )
  };
  return manifest;
}
function sanitizeBase(base) {
  return base.replace(/^\/|\/$/g, "");
}
async function revive(root, reviver) {
  async function reviveNode(holder2, key) {
    const value = holder2[key];
    if (value && typeof value === "object") {
      await Promise.all(Object.keys(value).map((k) => reviveNode(value, k)));
    }
    if (reviver) {
      holder2[key] = await reviver(key, holder2[key]);
    }
  }
  const holder = {
    "": root
  };
  await reviveNode(holder, "");
  return holder[""];
}
async function reviveServerFns(key, value) {
  if (value && value.__serverFn === true && value.functionId) {
    const serverFn = await getServerFnById(value.functionId);
    return async (opts, signal) => {
      const result = await serverFn(opts ?? {}, signal);
      return result.result;
    };
  }
  return value;
}
async function getServerFnById(serverFnId) {
  const {
    default: serverFnManifest
  } = await loadVirtualModule(VIRTUAL_MODULES.serverFnManifest);
  const serverFnInfo = serverFnManifest[serverFnId];
  if (!serverFnInfo) {
    console.info("serverFnManifest", serverFnManifest);
    throw new Error("Server function info not found for " + serverFnId);
  }
  const fnModule = await serverFnInfo.importer();
  if (!fnModule) {
    console.info("serverFnInfo", serverFnInfo);
    throw new Error("Server function module not resolved for " + serverFnId);
  }
  const action = fnModule[serverFnInfo.functionName];
  if (!action) {
    console.info("serverFnInfo", serverFnInfo);
    console.info("fnModule", fnModule);
    throw new Error(`Server function module export not resolved for serverFn ID: ${serverFnId}`);
  }
  return action;
}
async function parsePayload(payload) {
  const parsedPayload = startSerializer.parse(payload);
  await revive(parsedPayload, reviveServerFns);
  return parsedPayload;
}
const handleServerAction = async ({
  request
}) => {
  const controller = new AbortController();
  const signal = controller.signal;
  const abort = () => controller.abort();
  request.signal.addEventListener("abort", abort);
  const method = request.method;
  const url = new URL(request.url, "http://localhost:3000");
  const regex = new RegExp(`${sanitizeBase("/_serverFn")}/([^/?#]+)`);
  const match = url.pathname.match(regex);
  const serverFnId = match ? match[1] : null;
  const search = Object.fromEntries(url.searchParams.entries());
  const isCreateServerFn = "createServerFn" in search;
  const isRaw = "raw" in search;
  if (typeof serverFnId !== "string") {
    throw new Error("Invalid server action param for serverFnId: " + serverFnId);
  }
  const action = await getServerFnById(serverFnId);
  const formDataContentTypes = ["multipart/form-data", "application/x-www-form-urlencoded"];
  const response = await (async () => {
    try {
      let result = await (async () => {
        if (request.headers.get("Content-Type") && formDataContentTypes.some((type) => {
          var _a;
          return (_a = request.headers.get("Content-Type")) == null ? void 0 : _a.includes(type);
        })) {
          invariant(method.toLowerCase() !== "get", "GET requests with FormData payloads are not supported");
          return await action(await request.formData(), signal);
        }
        if (method.toLowerCase() === "get") {
          let payload2 = search;
          if (isCreateServerFn) {
            payload2 = search.payload;
          }
          payload2 = payload2 ? await parsePayload(payload2) : payload2;
          return await action(payload2, signal);
        }
        const jsonPayloadAsString = await request.text();
        const payload = await parsePayload(jsonPayloadAsString);
        if (isCreateServerFn) {
          return await action(payload, signal);
        }
        return await action(...payload, signal);
      })();
      if (result.result instanceof Response) {
        return result.result;
      }
      if (!isCreateServerFn) {
        result = result.result;
        if (result instanceof Response) {
          return result;
        }
      }
      if (isNotFound(result)) {
        return isNotFoundResponse(result);
      }
      return new Response(result !== void 0 ? startSerializer.stringify(result) : void 0, {
        status: getResponseStatus(getEvent()),
        headers: {
          "Content-Type": "application/json"
        }
      });
    } catch (error) {
      if (error instanceof Response) {
        return error;
      }
      if (isNotFound(error)) {
        return isNotFoundResponse(error);
      }
      console.info();
      console.info("Server Fn Error!");
      console.info();
      console.error(error);
      console.info();
      return new Response(startSerializer.stringify(error), {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
  })();
  request.signal.removeEventListener("abort", abort);
  if (isRaw) {
    return response;
  }
  return response;
};
function isNotFoundResponse(error) {
  const {
    headers,
    ...rest
  } = error;
  return new Response(JSON.stringify(rest), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ...headers || {}
    }
  });
}
const HEADERS = {
  TSS_SHELL: "X-TSS_SHELL"
};
function getStartResponseHeaders(opts) {
  const headers = mergeHeaders(
    getResponseHeaders(),
    {
      "Content-Type": "text/html; charset=UTF-8"
    },
    ...opts.router.state.matches.map((match) => {
      return match.headers;
    })
  );
  return headers;
}
function createStartHandler({
  createRouter: createRouter2
}) {
  let routeTreeModule = null;
  let startRoutesManifest = null;
  let processedServerRouteTree = void 0;
  return (cb) => {
    const originalFetch = globalThis.fetch;
    const startRequestResolver = async ({ request }) => {
      globalThis.fetch = async function(input, init) {
        function resolve(url2, requestOptions) {
          const fetchRequest = new Request(url2, requestOptions);
          return startRequestResolver({ request: fetchRequest });
        }
        function getOrigin() {
          return request.headers.get("Origin") || request.headers.get("Referer") || "http://localhost";
        }
        if (typeof input === "string" && input.startsWith("/")) {
          const url2 = new URL(input, getOrigin());
          return resolve(url2, init);
        } else if (typeof input === "object" && "url" in input && typeof input.url === "string" && input.url.startsWith("/")) {
          const url2 = new URL(input.url, getOrigin());
          return resolve(url2, init);
        }
        return originalFetch(input, init);
      };
      const url = new URL(request.url);
      const href = url.href.replace(url.origin, "");
      const APP_BASE = "/";
      const router = await createRouter2();
      const history = createMemoryHistory({
        initialEntries: [href]
      });
      const isPrerendering = process.env.TSS_PRERENDERING === "true";
      let isShell = process.env.TSS_SHELL === "true";
      if (isPrerendering && !isShell) {
        isShell = request.headers.get(HEADERS.TSS_SHELL) === "true";
      }
      router.update({
        history,
        isShell,
        isPrerendering
      });
      const response = await (async () => {
        try {
          if (false) ;
          const serverFnBase = joinPaths([
            APP_BASE,
            trimPath("/_serverFn"),
            "/"
          ]);
          if (href.startsWith(serverFnBase)) {
            return await handleServerAction({ request });
          }
          if (routeTreeModule === null) {
            try {
              routeTreeModule = await loadVirtualModule(
                VIRTUAL_MODULES.routeTree
              );
              if (routeTreeModule.serverRouteTree) {
                processedServerRouteTree = processRouteTree({
                  routeTree: routeTreeModule.serverRouteTree,
                  initRoute: (route, i) => {
                    route.init({
                      originalIndex: i
                    });
                  }
                });
              }
            } catch (e) {
              console.log(e);
            }
          }
          const executeRouter = () => runWithStartContext({ router }, async () => {
            const requestAcceptHeader = request.headers.get("Accept") || "*/*";
            const splitRequestAcceptHeader = requestAcceptHeader.split(",");
            const supportedMimeTypes = ["*/*", "text/html"];
            const isRouterAcceptSupported = supportedMimeTypes.some(
              (mimeType) => splitRequestAcceptHeader.some(
                (acceptedMimeType) => acceptedMimeType.trim().startsWith(mimeType)
              )
            );
            if (!isRouterAcceptSupported) {
              return json(
                {
                  error: "Only HTML requests are supported here"
                },
                {
                  status: 500
                }
              );
            }
            if (startRoutesManifest === null) {
              startRoutesManifest = await getStartManifest({
                basePath: APP_BASE
              });
            }
            attachRouterServerSsrUtils(router, startRoutesManifest);
            await router.load();
            if (router.state.redirect) {
              return router.state.redirect;
            }
            await router.serverSsr.dehydrate();
            const responseHeaders = getStartResponseHeaders({ router });
            const response2 = await cb({
              request,
              router,
              responseHeaders
            });
            return response2;
          });
          if (processedServerRouteTree) {
            const [_matchedRoutes, response2] = await handleServerRoutes({
              processedServerRouteTree,
              router,
              request,
              basePath: APP_BASE,
              executeRouter
            });
            if (response2) return response2;
          }
          const routerResponse = await executeRouter();
          return routerResponse;
        } catch (err) {
          if (err instanceof Response) {
            return err;
          }
          throw err;
        }
      })();
      if (isRedirect(response)) {
        if (isResolvedRedirect(response)) {
          if (request.headers.get("x-tsr-redirect") === "manual") {
            return json(
              {
                ...response.options,
                isSerializedRedirect: true
              },
              {
                headers: response.headers
              }
            );
          }
          return response;
        }
        if (response.options.to && typeof response.options.to === "string" && !response.options.to.startsWith("/")) {
          throw new Error(
            `Server side redirects must use absolute paths via the 'href' or 'to' options. The redirect() method's "to" property accepts an internal path only. Use the "href" property to provide an external URL. Received: ${JSON.stringify(response.options)}`
          );
        }
        if (["params", "search", "hash"].some(
          (d) => typeof response.options[d] === "function"
        )) {
          throw new Error(
            `Server side redirects must use static search, params, and hash values and do not support functional values. Received functional values for: ${Object.keys(
              response.options
            ).filter((d) => typeof response.options[d] === "function").map((d) => `"${d}"`).join(", ")}`
          );
        }
        const redirect = router.resolveRedirect(response);
        if (request.headers.get("x-tsr-redirect") === "manual") {
          return json(
            {
              ...response.options,
              isSerializedRedirect: true
            },
            {
              headers: response.headers
            }
          );
        }
        return redirect;
      }
      return response;
    };
    return requestHandler(startRequestResolver);
  };
}
async function handleServerRoutes(opts) {
  var _a, _b;
  const url = new URL(opts.request.url);
  const pathname = url.pathname;
  const serverTreeResult = getMatchedRoutes({
    pathname,
    basepath: opts.basePath,
    caseSensitive: true,
    routesByPath: opts.processedServerRouteTree.routesByPath,
    routesById: opts.processedServerRouteTree.routesById,
    flatRoutes: opts.processedServerRouteTree.flatRoutes
  });
  const routeTreeResult = opts.router.getMatchedRoutes(pathname, void 0);
  let response;
  let matchedRoutes = [];
  matchedRoutes = serverTreeResult.matchedRoutes;
  if (routeTreeResult.foundRoute) {
    if (serverTreeResult.matchedRoutes.length < routeTreeResult.matchedRoutes.length) {
      const closestCommon = [...routeTreeResult.matchedRoutes].reverse().find((r) => {
        return opts.processedServerRouteTree.routesById[r.id] !== void 0;
      });
      if (closestCommon) {
        let routeId = closestCommon.id;
        matchedRoutes = [];
        do {
          const route = opts.processedServerRouteTree.routesById[routeId];
          if (!route) {
            break;
          }
          matchedRoutes.push(route);
          routeId = (_a = route.parentRoute) == null ? void 0 : _a.id;
        } while (routeId);
        matchedRoutes.reverse();
      }
    }
  }
  if (matchedRoutes.length) {
    const middlewares = flattenMiddlewares(
      matchedRoutes.flatMap((r) => r.options.middleware).filter(Boolean)
    ).map((d) => d.options.server);
    if ((_b = serverTreeResult.foundRoute) == null ? void 0 : _b.options.methods) {
      const method = Object.keys(
        serverTreeResult.foundRoute.options.methods
      ).find(
        (method2) => method2.toLowerCase() === opts.request.method.toLowerCase()
      );
      if (method) {
        const handler = serverTreeResult.foundRoute.options.methods[method];
        if (handler) {
          if (typeof handler === "function") {
            middlewares.push(handlerToMiddleware(handler));
          } else {
            if (handler._options.middlewares && handler._options.middlewares.length) {
              middlewares.push(
                ...flattenMiddlewares(handler._options.middlewares).map(
                  (d) => d.options.server
                )
              );
            }
            if (handler._options.handler) {
              middlewares.push(handlerToMiddleware(handler._options.handler));
            }
          }
        }
      }
    }
    middlewares.push(handlerToMiddleware(opts.executeRouter));
    const ctx = await executeMiddleware(middlewares, {
      request: opts.request,
      context: {},
      params: serverTreeResult.routeParams,
      pathname
    });
    response = ctx.response;
  }
  return [matchedRoutes, response];
}
function handlerToMiddleware(handler) {
  return async ({ next: _next, ...rest }) => {
    const response = await handler(rest);
    if (response) {
      return { response };
    }
    return _next(rest);
  };
}
function executeMiddleware(middlewares, ctx) {
  let index = -1;
  const next = async (ctx2) => {
    index++;
    const middleware = middlewares[index];
    if (!middleware) return ctx2;
    const result = await middleware({
      ...ctx2,
      // Allow the middleware to call the next middleware in the chain
      next: async (nextCtx) => {
        const nextResult = await next({
          ...ctx2,
          ...nextCtx,
          context: {
            ...ctx2.context,
            ...(nextCtx == null ? void 0 : nextCtx.context) || {}
          }
        });
        return Object.assign(ctx2, handleCtxResult(nextResult));
      }
      // Allow the middleware result to extend the return context
    }).catch((err) => {
      if (isSpecialResponse(err)) {
        return {
          response: err
        };
      }
      throw err;
    });
    return Object.assign(ctx2, handleCtxResult(result));
  };
  return handleCtxResult(next(ctx));
}
function handleCtxResult(result) {
  if (isSpecialResponse(result)) {
    return {
      response: result
    };
  }
  return result;
}
function isSpecialResponse(err) {
  return isResponse(err) || isRedirect(err);
}
function isResponse(response) {
  return response instanceof Response;
}
const Toaster = ({ ...props }) => {
  return /* @__PURE__ */ jsx(
    Toaster$1,
    {
      className: "toaster group",
      toastOptions: {
        classNames: {
          toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground"
        }
      },
      ...props
    }
  );
};
function createSupabaseClient() {
  const SUPABASE_URL = "https://ygbgvspnbbdmijnlwsfh.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ZyoBbBpoLi-Z5l0NeNUOUQ_t9qdtPXi";
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: void 0,
      persistSession: true,
      autoRefreshToken: true
    }
  });
}
let _supabase;
const supabase = new Proxy({}, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  }
});
const Ctx$1 = createContext({ user: null, session: null, loading: true, signOut: async () => {
} });
function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  return /* @__PURE__ */ jsx(
    Ctx$1.Provider,
    {
      value: {
        user: session?.user ?? null,
        session,
        loading,
        signOut: async () => {
          await supabase.auth.signOut();
        }
      },
      children
    }
  );
}
const useAuth = () => useContext(Ctx$1);
function cn(...inputs) {
  return twMerge(clsx(inputs));
}
const Avatar = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  AvatarPrimitive.Root,
  {
    ref,
    className: cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className),
    ...props
  }
));
Avatar.displayName = AvatarPrimitive.Root.displayName;
const AvatarImage = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  AvatarPrimitive.Image,
  {
    ref,
    className: cn("aspect-square h-full w-full", className),
    ...props
  }
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;
const AvatarFallback = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  AvatarPrimitive.Fallback,
  {
    ref,
    className: cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className
    ),
    ...props
  }
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline"
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);
const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return /* @__PURE__ */ jsx(Comp, { className: cn(buttonVariants({ variant, size, className })), ref, ...props });
  }
);
Button.displayName = "Button";
const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  DialogPrimitive.Overlay,
  {
    ref,
    className: cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    ),
    ...props
  }
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;
const DialogContent = React.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ jsxs(DialogPortal, { children: [
  /* @__PURE__ */ jsx(DialogOverlay, {}),
  /* @__PURE__ */ jsxs(
    DialogPrimitive.Content,
    {
      ref,
      className: cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      ),
      ...props,
      children: [
        children,
        /* @__PURE__ */ jsxs(DialogPrimitive.Close, { className: "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground", children: [
          /* @__PURE__ */ jsx(X, { className: "h-4 w-4" }),
          /* @__PURE__ */ jsx("span", { className: "sr-only", children: "Close" })
        ] })
      ]
    }
  )
] }));
DialogContent.displayName = DialogPrimitive.Content.displayName;
const DialogHeader = ({ className, ...props }) => /* @__PURE__ */ jsx("div", { className: cn("flex flex-col space-y-1.5 text-center sm:text-left", className), ...props });
DialogHeader.displayName = "DialogHeader";
const DialogFooter = ({ className, ...props }) => /* @__PURE__ */ jsx(
  "div",
  {
    className: cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className),
    ...props
  }
);
DialogFooter.displayName = "DialogFooter";
const DialogTitle = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  DialogPrimitive.Title,
  {
    ref,
    className: cn("text-lg font-semibold leading-none tracking-tight", className),
    ...props
  }
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;
const DialogDescription = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  DialogPrimitive.Description,
  {
    ref,
    className: cn("text-sm text-muted-foreground", className),
    ...props
  }
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:global.stun.twilio.com:3478" }
];
async function getLocalStream(mode) {
  return navigator.mediaDevices.getUserMedia({
    audio: true,
    video: mode === "video" ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" } : false
  });
}
function createPeer(local, h) {
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  for (const t of local.getTracks()) pc.addTrack(t, local);
  const remote = new MediaStream();
  pc.ontrack = (e) => {
    for (const t of e.streams[0]?.getTracks() ?? [e.track]) {
      if (!remote.getTracks().includes(t)) remote.addTrack(t);
    }
    h.onRemoteStream(remote);
  };
  pc.onicecandidate = (e) => {
    if (e.candidate) h.onIce(e.candidate.toJSON());
  };
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === "connected") h.onConnected?.();
    if (["disconnected", "failed", "closed"].includes(pc.connectionState)) h.onDisconnected?.();
  };
  return pc;
}
function stopStream(s) {
  if (!s) return;
  for (const t of s.getTracks()) t.stop();
}
const Ctx = createContext({ startCall: async () => {
} });
const useCall = () => useContext(Ctx);
function initials(name) {
  return name.trim().split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}
async function sendTo(targetId, event, payload) {
  const ch = supabase.channel(`call:${targetId}`);
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("realtime timeout")), 5e3);
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(t);
        resolve();
      }
    });
  });
  await ch.send({ type: "broadcast", event, payload });
  setTimeout(() => {
    supabase.removeChannel(ch);
  }, 200);
}
function CallProvider({ children }) {
  const { user } = useAuth();
  const myId = user?.id ?? null;
  const [incoming, setIncoming] = useState(null);
  const [active, setActive] = useState(null);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const pendingIceRef = useRef([]);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const ringRef = useRef(null);
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [active?.status, active?.mode]);
  const attachRemote = useCallback((s) => {
    remoteStreamRef.current = s;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = s;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = s;
  }, []);
  const cleanup = useCallback(() => {
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch {
      }
      pcRef.current = null;
    }
    stopStream(localStreamRef.current);
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    pendingIceRef.current = [];
    setMuted(false);
    setCamOff(false);
  }, []);
  const endCall = useCallback(async (reason = "ended") => {
    const peerId = active?.peer.id ?? incoming?.peer.id;
    const callId = active?.callId ?? incoming?.callId;
    if (peerId && callId && myId) {
      sendTo(peerId, "end", { fromId: myId, callId, reason }).catch(() => {
      });
    }
    cleanup();
    setActive(null);
    setIncoming(null);
  }, [active, incoming, myId, cleanup]);
  useEffect(() => {
    if (!myId) return;
    const ch = supabase.channel(`call:${myId}`, { config: { broadcast: { self: false } } }).on("broadcast", { event: "offer" }, async ({ payload }) => {
      const p = payload;
      if (active || incoming) {
        sendTo(p.fromId, "end", { fromId: myId, callId: p.callId, reason: "busy" }).catch(() => {
        });
        return;
      }
      setIncoming({
        peer: { id: p.fromId, name: p.fromName, avatarUrl: p.fromAvatar },
        mode: p.mode,
        sdp: p.sdp,
        callId: p.callId
      });
    }).on("broadcast", { event: "answer" }, async ({ payload }) => {
      const p = payload;
      if (!pcRef.current || !active || p.callId !== active.callId) return;
      try {
        await pcRef.current.setRemoteDescription(p.sdp);
        for (const c of pendingIceRef.current) {
          await pcRef.current.addIceCandidate(c).catch(() => {
          });
        }
        pendingIceRef.current = [];
      } catch (e) {
        console.error("answer error", e);
      }
    }).on("broadcast", { event: "ice" }, async ({ payload }) => {
      const p = payload;
      if (!pcRef.current || !active || p.callId !== active.callId) return;
      if (!pcRef.current.remoteDescription) {
        pendingIceRef.current.push(p.candidate);
        return;
      }
      await pcRef.current.addIceCandidate(p.candidate).catch(() => {
      });
    }).on("broadcast", { event: "end" }, ({ payload }) => {
      const p = payload;
      const matchActive = active && p.callId === active.callId;
      const matchIncoming = incoming && p.callId === incoming.callId;
      if (!matchActive && !matchIncoming) return;
      if (p.reason === "busy") toast.info("Абонент занят");
      else if (p.reason === "declined") toast.info("Звонок отклонён");
      cleanup();
      setActive(null);
      setIncoming(null);
    }).subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [myId, active, incoming, cleanup]);
  useEffect(() => {
    if (!incoming) {
      ringRef.current?.pause();
      return;
    }
    const audio = new Audio(
      "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA="
    );
    audio.loop = true;
    audio.volume = 0.6;
    audio.play().catch(() => {
    });
    ringRef.current = audio;
    return () => {
      audio.pause();
    };
  }, [incoming]);
  const startCall = useCallback(async (peer, mode) => {
    if (!myId) return;
    if (active || incoming) {
      toast.info("Завершите текущий звонок");
      return;
    }
    const callId = crypto.randomUUID();
    let stream;
    try {
      stream = await getLocalStream(mode);
    } catch {
      toast.error("Нет доступа к микрофону/камере");
      return;
    }
    localStreamRef.current = stream;
    const pc = createPeer(stream, {
      onIce: (candidate) => {
        sendTo(peer.id, "ice", { fromId: myId, candidate, callId }).catch(() => {
        });
      },
      onRemoteStream: attachRemote,
      onConnected: () => setActive((s) => s ? { ...s, status: "connected" } : s),
      onDisconnected: () => {
        cleanup();
        setActive(null);
      }
    });
    pcRef.current = pc;
    setActive({ peer, mode, callId, role: "caller", status: "calling" });
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const meName = user?.user_metadata?.display_name ?? user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "Игрок";
      await sendTo(peer.id, "offer", {
        fromId: myId,
        fromName: meName,
        fromAvatar: user?.user_metadata?.avatar_url ?? null,
        sdp: offer,
        mode,
        callId
      });
    } catch (e) {
      console.error(e);
      toast.error("Не удалось дозвониться");
      cleanup();
      setActive(null);
    }
  }, [myId, user, active, incoming, attachRemote, cleanup]);
  const acceptIncoming = useCallback(async () => {
    if (!incoming || !myId) return;
    let stream;
    try {
      stream = await getLocalStream(incoming.mode);
    } catch {
      toast.error("Нет доступа к микрофону/камере");
      await endCall("declined");
      return;
    }
    localStreamRef.current = stream;
    const pc = createPeer(stream, {
      onIce: (candidate) => {
        sendTo(incoming.peer.id, "ice", { fromId: myId, candidate, callId: incoming.callId }).catch(() => {
        });
      },
      onRemoteStream: attachRemote,
      onConnected: () => setActive((s) => s ? { ...s, status: "connected" } : s),
      onDisconnected: () => {
        cleanup();
        setActive(null);
      }
    });
    pcRef.current = pc;
    setActive({
      peer: incoming.peer,
      mode: incoming.mode,
      callId: incoming.callId,
      role: "callee",
      status: "connected"
    });
    try {
      await pc.setRemoteDescription(incoming.sdp);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      for (const c of pendingIceRef.current) await pc.addIceCandidate(c).catch(() => {
      });
      pendingIceRef.current = [];
      await sendTo(incoming.peer.id, "answer", {
        fromId: myId,
        sdp: answer,
        callId: incoming.callId
      });
      setIncoming(null);
    } catch (e) {
      console.error(e);
      toast.error("Ошибка соединения");
      await endCall("ended");
    }
  }, [incoming, myId, attachRemote, cleanup, endCall]);
  const toggleMute = () => {
    const s = localStreamRef.current;
    if (!s) return;
    const newMuted = !muted;
    s.getAudioTracks().forEach((t) => t.enabled = !newMuted);
    setMuted(newMuted);
  };
  const toggleCam = () => {
    const s = localStreamRef.current;
    if (!s) return;
    const newOff = !camOff;
    s.getVideoTracks().forEach((t) => t.enabled = !newOff);
    setCamOff(newOff);
  };
  return /* @__PURE__ */ jsxs(Ctx.Provider, { value: { startCall }, children: [
    children,
    /* @__PURE__ */ jsx("audio", { ref: remoteAudioRef, autoPlay: true }),
    /* @__PURE__ */ jsx(Dialog, { open: !!incoming, onOpenChange: (o) => {
      if (!o) endCall("declined");
    }, children: /* @__PURE__ */ jsx(DialogContent, { className: "max-w-sm", children: incoming && /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center gap-4 py-4", children: [
      /* @__PURE__ */ jsxs(Avatar, { className: "h-20 w-20", children: [
        incoming.peer.avatarUrl ? /* @__PURE__ */ jsx(AvatarImage, { src: incoming.peer.avatarUrl }) : null,
        /* @__PURE__ */ jsx(AvatarFallback, { className: "text-xl", children: initials(incoming.peer.name) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "text-center", children: [
        /* @__PURE__ */ jsx("p", { className: "text-lg font-semibold", children: incoming.peer.name }),
        /* @__PURE__ */ jsxs("p", { className: "text-sm text-muted-foreground", children: [
          "Входящий ",
          incoming.mode === "video" ? "видеозвонок" : "звонок",
          "…"
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex w-full justify-around pt-2", children: [
        /* @__PURE__ */ jsx(
          Button,
          {
            size: "lg",
            variant: "destructive",
            className: "rounded-full h-14 w-14 p-0",
            onClick: () => endCall("declined"),
            "aria-label": "Отклонить",
            children: /* @__PURE__ */ jsx(PhoneOff, { className: "h-6 w-6" })
          }
        ),
        /* @__PURE__ */ jsx(
          Button,
          {
            size: "lg",
            className: "rounded-full h-14 w-14 p-0 bg-green-600 hover:bg-green-700 text-white",
            onClick: acceptIncoming,
            "aria-label": "Принять",
            children: /* @__PURE__ */ jsx(Phone, { className: "h-6 w-6" })
          }
        )
      ] })
    ] }) }) }),
    /* @__PURE__ */ jsx(Dialog, { open: !!active, onOpenChange: (o) => {
      if (!o) endCall("ended");
    }, children: /* @__PURE__ */ jsx(DialogContent, { className: "max-w-3xl p-0 overflow-hidden border-0 bg-black text-white", children: active && /* @__PURE__ */ jsxs("div", { className: "relative flex h-[80vh] flex-col", children: [
      active.mode === "video" ? /* @__PURE__ */ jsx(
        "video",
        {
          ref: remoteVideoRef,
          autoPlay: true,
          playsInline: true,
          className: "absolute inset-0 h-full w-full object-cover"
        }
      ) : /* @__PURE__ */ jsx("div", { className: "absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-800", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center gap-3", children: [
        /* @__PURE__ */ jsxs(Avatar, { className: "h-32 w-32", children: [
          active.peer.avatarUrl ? /* @__PURE__ */ jsx(AvatarImage, { src: active.peer.avatarUrl }) : null,
          /* @__PURE__ */ jsx(AvatarFallback, { className: "text-3xl", children: initials(active.peer.name) })
        ] }),
        /* @__PURE__ */ jsx("p", { className: "text-xl font-semibold", children: active.peer.name }),
        /* @__PURE__ */ jsx("p", { className: "text-sm text-white/70", children: active.status === "calling" ? "Вызов…" : "Аудиозвонок" })
      ] }) }),
      active.mode === "video" && /* @__PURE__ */ jsx(
        "video",
        {
          ref: localVideoRef,
          autoPlay: true,
          playsInline: true,
          muted: true,
          className: "absolute bottom-24 right-4 h-32 w-24 rounded-xl border-2 border-white/30 bg-black object-cover shadow-lg"
        }
      ),
      /* @__PURE__ */ jsxs("div", { className: "relative z-10 flex items-center gap-3 bg-gradient-to-b from-black/60 to-transparent p-4", children: [
        /* @__PURE__ */ jsxs(Avatar, { className: "h-10 w-10", children: [
          active.peer.avatarUrl ? /* @__PURE__ */ jsx(AvatarImage, { src: active.peer.avatarUrl }) : null,
          /* @__PURE__ */ jsx(AvatarFallback, { children: initials(active.peer.name) })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "font-semibold", children: active.peer.name }),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-white/70", children: active.status === "calling" ? "Вызов…" : active.status === "connected" ? "В разговоре" : "Соединение…" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "relative z-10 mt-auto flex items-center justify-center gap-4 bg-gradient-to-t from-black/70 to-transparent p-6", children: [
        /* @__PURE__ */ jsx(
          Button,
          {
            size: "lg",
            variant: muted ? "default" : "secondary",
            className: "rounded-full h-12 w-12 p-0",
            onClick: toggleMute,
            "aria-label": "Микрофон",
            children: muted ? /* @__PURE__ */ jsx(MicOff, { className: "h-5 w-5" }) : /* @__PURE__ */ jsx(Mic, { className: "h-5 w-5" })
          }
        ),
        active.mode === "video" && /* @__PURE__ */ jsx(
          Button,
          {
            size: "lg",
            variant: camOff ? "default" : "secondary",
            className: "rounded-full h-12 w-12 p-0",
            onClick: toggleCam,
            "aria-label": "Камера",
            children: camOff ? /* @__PURE__ */ jsx(VideoOff, { className: "h-5 w-5" }) : /* @__PURE__ */ jsx(Video, { className: "h-5 w-5" })
          }
        ),
        /* @__PURE__ */ jsx(
          Button,
          {
            size: "lg",
            variant: "destructive",
            className: "rounded-full h-14 w-14 p-0",
            onClick: () => endCall("ended"),
            "aria-label": "Завершить",
            children: /* @__PURE__ */ jsx(PhoneOff, { className: "h-6 w-6" })
          }
        )
      ] })
    ] }) }) })
  ] });
}
const appCss = "/assets/styles-DHoflvOu.css";
function NotFoundComponent() {
  return /* @__PURE__ */ jsx("div", { className: "flex min-h-screen items-center justify-center bg-background px-4", children: /* @__PURE__ */ jsxs("div", { className: "max-w-md text-center", children: [
    /* @__PURE__ */ jsx("h1", { className: "text-7xl font-bold text-foreground", children: "404" }),
    /* @__PURE__ */ jsx("h2", { className: "mt-4 text-xl font-semibold text-foreground", children: "Page not found" }),
    /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "The page you're looking for doesn't exist or has been moved." }),
    /* @__PURE__ */ jsx("div", { className: "mt-6", children: /* @__PURE__ */ jsx(Link, { to: "/", className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90", children: "Go home" }) })
  ] }) });
}
const Route$r = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8"
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1"
      },
      {
        title: "Athletic Flow — найди игру и собери команду"
      },
      {
        name: "description",
        content: "Athletic Flow — платформа для любительского футбола в Москве: стадионы, команды, бронирование и оплата за 3 клика."
      },
      {
        property: "og:title",
        content: "Athletic Flow — найди игру и собери команду"
      },
      {
        property: "og:description",
        content: "Поиск игроков, бронирование площадок и оплата за 3 клика."
      },
      {
        property: "og:type",
        content: "website"
      },
      {
        property: "og:site_name",
        content: "Athletic Flow"
      },
      {
        name: "twitter:card",
        content: "summary_large_image"
      },
      {
        name: "twitter:title",
        content: "Athletic Flow — найди игру и собери команду"
      },
      {
        name: "twitter:description",
        content: "Поиск игроков, бронирование площадок и оплата за 3 клика."
      },
      {
        property: "og:image",
        content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/379cce6c-926e-4852-bf74-95d95024545d/id-preview-6d5399b8--4d250271-ea5d-4807-874a-e57cab4db334.lovable.app-1777998887252.png"
      },
      {
        name: "twitter:image",
        content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/379cce6c-926e-4852-bf74-95d95024545d/id-preview-6d5399b8--4d250271-ea5d-4807-874a-e57cab4db334.lovable.app-1777998887252.png"
      },
      // Геолокация и язык — для Яндекса и СНГ
      {
        httpEquiv: "Content-Language",
        content: "ru-RU"
      },
      {
        name: "geo.region",
        content: "RU-MOW"
      },
      {
        name: "geo.placename",
        content: "Москва"
      },
      {
        name: "geo.position",
        content: "55.7558;37.6176"
      },
      {
        name: "ICBM",
        content: "55.7558, 37.6176"
      },
      // Подсказка для AI-краулеров (нестандартно, но безопасно)
      {
        name: "robots",
        content: "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
      }
    ],
    links: [
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com"
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous"
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@500;600;700;800&display=swap"
      },
      {
        rel: "stylesheet",
        href: appCss
      },
      // Favicon — PNG из public/favicon.png (заменил вручную).
      {
        rel: "icon",
        type: "image/png",
        href: "/favicon.png"
      },
      {
        rel: "apple-touch-icon",
        href: "/favicon.png"
      },
      {
        rel: "shortcut icon",
        href: "/favicon.png"
      }
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Athletic Flow",
          url: "https://af-sport.ru",
          description: "Платформа любительского спорта в Москве: найди игру, собери команду, забронируй стадион."
        })
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "ООО «АТЛЕТИК ФЛОУ»",
          legalName: "Общество с ограниченной ответственностью «АТЛЕТИК ФЛОУ»",
          url: "https://af-sport.ru",
          taxID: "5024259241",
          address: {
            "@type": "PostalAddress",
            addressLocality: "Красногорский район, д. Отрадное",
            streetAddress: "ул. Пятницкая, д. 14, кв. 443",
            postalCode: "143442",
            addressRegion: "Московская область",
            addressCountry: "RU"
          }
        })
      },
      // Яндекс.Метрика — счётчик 109248844, эталонный код из кабинета Метрики.
      // ssr:true — важно для TanStack Start (SSR-приложение).
      // referrer/url берутся из document/location на клиенте (script выполняется в браузере).
      {
        children: `(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=109248844', 'ym');ym(109248844, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});`
      }
    ]
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent
});
function RootShell({
  children
}) {
  return /* @__PURE__ */ jsxs("html", { lang: "ru", children: [
    /* @__PURE__ */ jsx("head", { children: /* @__PURE__ */ jsx(HeadContent, {}) }),
    /* @__PURE__ */ jsxs("body", { children: [
      children,
      /* @__PURE__ */ jsx(Toaster, {}),
      /* @__PURE__ */ jsx(Scripts, {}),
      /* @__PURE__ */ jsx("noscript", { children: /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx("img", { src: "https://mc.yandex.ru/watch/109248844", style: {
        position: "absolute",
        left: "-9999px"
      }, alt: "" }) }) })
    ] })
  ] });
}
function YmTracker() {
  const location = useRouterState({
    select: (s) => s.location
  });
  useEffect(() => {
    return;
  }, [location.pathname, location.searchStr]);
  return null;
}
function RootComponent() {
  return /* @__PURE__ */ jsx(AuthProvider, { children: /* @__PURE__ */ jsxs(CallProvider, { children: [
    /* @__PURE__ */ jsx(YmTracker, {}),
    /* @__PURE__ */ jsx(Outlet, {})
  ] }) });
}
const $$splitComponentImporter$m = () => import('./stadiums-BVPA_L-e.mjs');
const Route$q = createFileRoute("/stadiums")({
  head: () => ({
    meta: [{
      title: "Стадионы — Athletic Flow"
    }, {
      name: "description",
      content: "Футбольные площадки и стадионы Москвы для аренды: фильтры по виду спорта, карте и доступности."
    }, {
      property: "og:title",
      content: "Стадионы — Athletic Flow"
    }, {
      property: "og:description",
      content: "Площадки Москвы для аренды по 15+ видам спорта."
    }, {
      property: "og:url",
      content: "https://af-sport.ru/stadiums"
    }],
    links: [{
      rel: "canonical",
      href: "https://af-sport.ru/stadiums"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$m, "component")
});
const BASE_URL$1 = "https://af-sport.ru";
function xmlEscape(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
const Route$p = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const staticEntries = [{
          path: "/",
          changefreq: "daily",
          priority: "1.0"
        }, {
          path: "/games",
          changefreq: "hourly",
          priority: "0.9"
        }, {
          path: "/stadiums",
          changefreq: "daily",
          priority: "0.9"
        }, {
          path: "/create",
          changefreq: "monthly",
          priority: "0.6"
        }, {
          path: "/friends",
          changefreq: "weekly",
          priority: "0.5"
        }, {
          path: "/auth",
          changefreq: "yearly",
          priority: "0.3"
        }];
        const dynamicEntries = [];
        try {
          const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
          const key = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
          if (url && key) {
            const supa = createClient(url, key, {
              auth: {
                persistSession: false
              }
            });
            const {
              data
            } = await supa.from("stadiums").select("id, created_at").order("created_at", {
              ascending: false
            }).limit(500);
            (data ?? []).forEach((s) => {
              dynamicEntries.push({
                path: `/stadiums/${s.id}`,
                changefreq: "weekly",
                priority: "0.7",
                lastmod: s.created_at ?? void 0
              });
            });
          }
        } catch {
        }
        const entries = [...staticEntries, ...dynamicEntries];
        const urls = entries.map((e) => [`  <url>`, `    <loc>${xmlEscape(BASE_URL$1 + e.path)}</loc>`, e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null, e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null, e.priority ? `    <priority>${e.priority}</priority>` : null, `  </url>`].filter(Boolean).join("\n"));
        const xml = [`<?xml version="1.0" encoding="UTF-8"?>`, `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`, ...urls, `</urlset>`].join("\n");
        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600"
          }
        });
      }
    }
  }
});
const $$splitComponentImporter$l = () => import('./reset-phone-CPpediRY.mjs');
const Route$o = createFileRoute("/reset-phone")({
  head: () => ({
    meta: [{
      title: "Восстановление пароля по SMS — Athletic Flow"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$l, "component")
});
const $$splitComponentImporter$k = () => import('./profile-C1PuJbuc.mjs');
const Route$n = createFileRoute("/profile")({
  head: () => ({
    meta: [{
      title: "Профиль — Athletic Flow"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$k, "component")
});
const $$splitComponentImporter$j = () => import('./privacy-BXKwJb_0.mjs');
const Route$m = createFileRoute("/privacy")({
  head: () => ({
    meta: [{
      title: "Политика конфиденциальности — Athletic Flow"
    }, {
      name: "description",
      content: "Политика конфиденциальности сервиса Athletic Flow. Какие данные мы собираем, как храним и обрабатываем."
    }, {
      name: "robots",
      content: "noindex, follow"
    }],
    links: [{
      rel: "canonical",
      href: "https://af-sport.ru/privacy"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$j, "component")
});
const $$splitComponentImporter$i = () => import('./personal-data-B4t1eSYs.mjs');
const Route$l = createFileRoute("/personal-data")({
  head: () => ({
    meta: [{
      title: "Согласие на обработку персональных данных — Athletic Flow"
    }, {
      name: "description",
      content: "Согласие на обработку персональных данных пользователей Athletic Flow в соответствии с 152-ФЗ."
    }, {
      name: "robots",
      content: "noindex, follow"
    }],
    links: [{
      rel: "canonical",
      href: "https://af-sport.ru/personal-data"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$i, "component")
});
const $$splitComponentImporter$h = () => import('./my-BiDCr8XK.mjs');
const Route$k = createFileRoute("/my")({
  head: () => ({
    meta: [{
      title: "Мои игры — Athletic Flow"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$h, "component")
});
const $$splitComponentImporter$g = () => import('./games-DK-YKAre.mjs');
const Route$j = createFileRoute("/games")({
  validateSearch: (search) => {
    const when = search.when;
    const allowed = ["today", "tomorrow", "week", "2weeks"];
    const stadium = typeof search.stadium === "string" ? search.stadium : void 0;
    const sport = typeof search.sport === "string" ? search.sport : void 0;
    const q = typeof search.q === "string" ? search.q : void 0;
    return {
      when: allowed.includes(when) ? when : void 0,
      stadium,
      sport,
      q
    };
  },
  head: () => ({
    meta: [{
      title: "Игры — Athletic Flow"
    }, {
      name: "description",
      content: "Каталог любительских игр в Москве: футбол, баскетбол, волейбол и ещё 15+ видов. Выбирай дату, уровень и стадион рядом с тобой."
    }, {
      property: "og:title",
      content: "Игры — Athletic Flow"
    }, {
      property: "og:description",
      content: "Каталог любительских игр в Москве по 15+ видам спорта."
    }, {
      property: "og:url",
      content: "https://af-sport.ru/games"
    }],
    links: [{
      rel: "canonical",
      href: "https://af-sport.ru/games"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$g, "component")
});
const $$splitComponentImporter$f = () => import('./friends-CQWcuG80.mjs');
const Route$i = createFileRoute("/friends")({
  head: () => ({
    meta: [{
      title: "Друзья — Athletic Flow"
    }, {
      name: "description",
      content: "Список друзей в Athletic Flow: добавляй спортивных партнёров, приглашай в игры одним кликом и собирай постоянную команду."
    }, {
      property: "og:title",
      content: "Друзья — Athletic Flow"
    }, {
      property: "og:description",
      content: "Собирай постоянную команду: друзья, приглашения и быстрая запись на игры."
    }, {
      property: "og:url",
      content: "https://af-sport.ru/friends"
    }],
    links: [{
      rel: "canonical",
      href: "https://af-sport.ru/friends"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$f, "component")
});
function displayLabel(p) {
  const pref = p.chat_display === "nickname" ? "nickname" : "name";
  if (pref === "nickname") {
    return p.nickname?.trim() || p.display_name?.trim() || (p.username ? `@${p.username}` : "Игрок");
  }
  return p.display_name?.trim() || p.nickname?.trim() || (p.username ? `@${p.username}` : "Игрок");
}
const $$splitComponentImporter$e = () => import('./create-Ce_aWM4r.mjs');
const Route$h = createFileRoute("/create")({
  head: () => ({
    meta: [{
      title: "Создать игру — Athletic Flow"
    }, {
      name: "description",
      content: "Собери команду и забронируй стадион за 3 клика."
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$e, "component")
});
const $$splitComponentImporter$d = () => import('./chats-5UmLQkuj.mjs');
const Route$g = createFileRoute("/chats")({
  head: () => ({
    meta: [{
      title: "Общение — Athletic Flow"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$d, "component")
});
const $$splitComponentImporter$c = () => import('./auth-BmSYf-L5.mjs');
const Route$f = createFileRoute("/auth")({
  head: () => ({
    meta: [{
      title: "Вход — Athletic Flow"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$c, "component")
});
const $$splitComponentImporter$b = () => import('./admin-Dexi4_h9.mjs');
const Route$e = createFileRoute("/admin")({
  head: () => ({
    meta: [{
      title: "Админка — Athletic Flow"
    }, {
      name: "robots",
      content: "noindex, nofollow"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$b, "component")
});
const $$splitComponentImporter$a = () => import('./index-WpKLdo-X.mjs');
const Route$d = createFileRoute("/")({
  head: () => ({
    meta: [{
      title: "Athletic Flow — найди игру и собери команду рядом"
    }, {
      name: "description",
      content: "Платформа любительского спорта: футбол, баскетбол, волейбол и ещё 15+ видов. Найди игру рядом, собери команду и присоединись в 3 клика."
    }, {
      property: "og:title",
      content: "Athletic Flow — спорт без поиска соперников"
    }, {
      property: "og:description",
      content: "Поиск игроков, бронирование площадок и оплата за 3 клика."
    }, {
      property: "og:url",
      content: "https://af-sport.ru/"
    }],
    links: [{
      rel: "canonical",
      href: "https://af-sport.ru/"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$a, "component")
});
const $$splitComponentImporter$9 = () => import('./admin.index-CgzqzO9P.mjs');
const Route$c = createFileRoute("/admin/")({
  head: () => ({
    meta: [{
      title: "Админка · Дашборд — Athletic Flow"
    }, {
      name: "robots",
      content: "noindex, nofollow"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$9, "component")
});
const $$splitComponentImporter$8 = () => import('./u._username-BxZupqPZ.mjs');
const Route$b = createFileRoute("/u/$username")({
  head: ({
    params
  }) => ({
    meta: [{
      title: `@${params.username} — Athletic Flow`
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$8, "component")
});
const $$splitComponentImporter$7 = () => import('./stadiums_._stadiumId-DNVVLvq_.mjs');
const BASE_URL = "https://af-sport.ru";
const Route$a = createFileRoute("/stadiums_/$stadiumId")({
  head: ({
    params
  }) => {
    const url = `${BASE_URL}/stadiums/${params.stadiumId}`;
    const title = "Стадион в Москве — аренда и любительские игры — Athletic Flow";
    const description = "Подробное описание стадиона: виды спорта, цена аренды, расписание открытых игр. Записывайся в команду или арендуй площадку для своего матча. Москва.";
    return {
      meta: [{
        title
      }, {
        name: "description",
        content: description
      }, {
        name: "keywords",
        content: "аренда стадиона москва, любительский футбол москва, поле для футбола, мини-футбол, futsal, бронь площадки, любительские игры, найти команду"
      }, {
        property: "og:title",
        content: title
      }, {
        property: "og:description",
        content: description
      }, {
        property: "og:type",
        content: "place"
      }, {
        property: "og:url",
        content: url
      }, {
        property: "og:locale",
        content: "ru_RU"
      }, {
        name: "twitter:card",
        content: "summary_large_image"
      }, {
        name: "twitter:title",
        content: title
      }, {
        name: "twitter:description",
        content: description
      }, {
        name: "geo.region",
        content: "RU-MOW"
      }, {
        name: "geo.placename",
        content: "Москва"
      }],
      links: [{
        rel: "canonical",
        href: url
      }]
    };
  },
  component: lazyRouteComponent($$splitComponentImporter$7, "component")
});
const $$splitComponentImporter$6 = () => import('./games_._gameId-9R3Pe5ub.mjs');
const Route$9 = createFileRoute("/games_/$gameId")({
  head: ({
    params
  }) => {
    const url = `https://af-sport.ru/games/${params.gameId}`;
    const title = "Игра — присоединиться к команде — Athletic Flow";
    const description = "Детали любительской игры: вид спорта, стадион, время, уровень, свободные слоты и стоимость. Присоединяйся к команде в 3 клика.";
    return {
      meta: [{
        title
      }, {
        name: "description",
        content: description
      }, {
        property: "og:title",
        content: title
      }, {
        property: "og:description",
        content: description
      }, {
        property: "og:url",
        content: url
      }],
      links: [{
        rel: "canonical",
        href: url
      }]
    };
  },
  component: lazyRouteComponent($$splitComponentImporter$6, "component")
});
const $$splitComponentImporter$5 = () => import('./friends_._friendId-CRTcletD.mjs');
const Route$8 = createFileRoute("/friends_/$friendId")({
  head: () => ({
    meta: [{
      title: "Чат — Athletic Flow"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$5, "component")
});
const $$splitComponentImporter$4 = () => import('./chats_._conversationId-LWh6sEnT.mjs');
const Route$7 = createFileRoute("/chats_/$conversationId")({
  head: () => ({
    meta: [{
      title: "Беседа — Athletic Flow"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$4, "component")
});
const BUCKET_TTL_DAYS = 30;
const BUCKET_PRECISION = 20;
function bucketOf(lat, lng) {
  return {
    bucket_lat: Math.floor(lat * BUCKET_PRECISION),
    bucket_lng: Math.floor(lng * BUCKET_PRECISION)
  };
}
function getSupabaseAdmin$1() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: {
      persistSession: false
    }
  });
}
async function askOverpass(lat, lng, radiusMeters) {
  const query = `[out:json][timeout:25];
(
  node["leisure"~"pitch|sports_centre|stadium"](around:${radiusMeters},${lat},${lng});
  way["leisure"~"pitch|sports_centre|stadium"](around:${radiusMeters},${lat},${lng});
);
out center 200;`;
  const endpoints = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=UTF-8"
        },
        body: query,
        signal: AbortSignal.timeout(25e3)
      });
      if (!res.ok) continue;
      const json2 = await res.json();
      return json2.elements;
    } catch {
    }
  }
  return [];
}
function elementToPitch(el) {
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (lat == null || lng == null) return null;
  const t = el.tags ?? {};
  const sportTag = (t.sport ?? "").toLowerCase();
  if (t.leisure === "pitch" && sportTag && !/soccer|football|basketball|volleyball|tennis|multi/.test(sportTag)) {
    return null;
  }
  const name = t.name ?? (t.leisure === "pitch" ? `Площадка${sportTag ? ` (${sportTag})` : ""}` : t.leisure === "stadium" ? "Стадион" : "Спорткомплекс");
  const addrParts = [t["addr:street"], t["addr:housenumber"]].filter(Boolean);
  const address = addrParts.length ? addrParts.join(", ") : t["addr:full"] ?? "Открытая городская площадка";
  return {
    id: `osm-${el.type}-${el.id}`,
    name,
    address,
    lat,
    lng,
    leisure: t.leisure ?? "pitch",
    sport_tag: sportTag || null
  };
}
const Route$6 = createFileRoute("/api/pitches")({
  server: {
    handlers: {
      GET: async ({
        request
      }) => {
        const u = new URL(request.url);
        const lat = parseFloat(u.searchParams.get("lat") ?? "");
        const lng = parseFloat(u.searchParams.get("lng") ?? "");
        const radius = Math.min(4e4, Math.max(500, parseInt(u.searchParams.get("radius") ?? "15000", 10) || 15e3));
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          return new Response(JSON.stringify({
            error: "bad coords"
          }), {
            status: 400,
            headers: {
              "Content-Type": "application/json"
            }
          });
        }
        const supa = getSupabaseAdmin$1();
        if (!supa) {
          const els = await askOverpass(lat, lng, radius);
          const list = els.map(elementToPitch).filter(Boolean);
          return new Response(JSON.stringify({
            items: list,
            cached: false
          }), {
            status: 200,
            headers: {
              "Content-Type": "application/json"
            }
          });
        }
        const b = bucketOf(lat, lng);
        const {
          data: logRow
        } = await supa.from("pitches_fetch_log").select("fetched_at").eq("bucket_lat", b.bucket_lat).eq("bucket_lng", b.bucket_lng).maybeSingle();
        const stale = !logRow || Date.now() - new Date(logRow.fetched_at).getTime() > BUCKET_TTL_DAYS * 24 * 3600 * 1e3;
        if (stale) {
          const els = await askOverpass(lat, lng, radius);
          const list = els.map(elementToPitch).filter(Boolean);
          if (list.length > 0) {
            await supa.from("public_pitches").upsert(list.map((p) => ({
              ...p,
              fetched_at: (/* @__PURE__ */ new Date()).toISOString(),
              source: "osm"
            })), {
              onConflict: "id"
            });
          }
          await supa.from("pitches_fetch_log").upsert({
            bucket_lat: b.bucket_lat,
            bucket_lng: b.bucket_lng,
            fetched_at: (/* @__PURE__ */ new Date()).toISOString(),
            count: list.length
          }, {
            onConflict: "bucket_lat,bucket_lng"
          });
        }
        const dLat = radius / 111e3;
        const dLng = radius / (111e3 * Math.cos(lat * Math.PI / 180));
        const {
          data
        } = await supa.from("public_pitches").select("id, name, address, lat, lng").gte("lat", lat - dLat).lte("lat", lat + dLat).gte("lng", lng - dLng).lte("lng", lng + dLng).limit(500);
        return new Response(JSON.stringify({
          items: data ?? [],
          cached: !stale
        }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=600"
          }
        });
      }
    }
  }
});
function normalizeQuery(q) {
  return q.trim().toLowerCase().replace(/\s+/g, " ");
}
function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: {
      persistSession: false
    }
  });
}
async function askYandex(q) {
  const apiKey = process.env.YANDEX_GEOCODER_KEY;
  if (!apiKey) {
    console.error("[geocode] YANDEX_GEOCODER_KEY not set");
    return null;
  }
  const bbox = "37.30,55.50~37.95,56.00";
  const url = new URL("https://geocode-maps.yandex.ru/v1/");
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("geocode", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("lang", "ru_RU");
  url.searchParams.set("results", "1");
  url.searchParams.set("bbox", bbox);
  url.searchParams.set("rspn", "1");
  const r = await fetch(url.toString(), {
    headers: {
      Accept: "application/json"
    },
    // Я.Геокодер обычно быстрый, но накинем разумный таймаут.
    signal: AbortSignal.timeout(8e3)
  });
  if (!r.ok) {
    console.error("[geocode] yandex http", r.status);
    return null;
  }
  const json2 = await r.json();
  const member = json2.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject;
  const pos = member?.Point?.pos;
  if (!pos) return null;
  const [lonStr, latStr] = pos.split(" ");
  const lat = parseFloat(latStr);
  const lng = parseFloat(lonStr);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const label = member?.metaDataProperty?.GeocoderMetaData?.text ?? q;
  return {
    lat,
    lng,
    label
  };
}
const Route$5 = createFileRoute("/api/geocode")({
  server: {
    handlers: {
      GET: async ({
        request
      }) => {
        const u = new URL(request.url);
        const raw = u.searchParams.get("q") ?? "";
        const q = normalizeQuery(raw);
        if (q.length < 2 || q.length > 200) {
          return new Response(JSON.stringify({
            error: "bad query"
          }), {
            status: 400,
            headers: {
              "Content-Type": "application/json"
            }
          });
        }
        const supa = getSupabaseAdmin();
        if (supa) {
          const {
            data
          } = await supa.from("geocode_cache").select("lat, lng, label").eq("query_norm", q).maybeSingle();
          if (data) {
            return new Response(JSON.stringify({
              lat: data.lat,
              lng: data.lng,
              label: data.label ?? raw,
              cached: true
            }), {
              status: 200,
              headers: {
                "Content-Type": "application/json",
                "Cache-Control": "public, max-age=86400"
              }
            });
          }
        }
        const hit = await askYandex(q);
        if (!hit) {
          return new Response(JSON.stringify({
            error: "not found"
          }), {
            status: 404,
            headers: {
              "Content-Type": "application/json"
            }
          });
        }
        if (supa) {
          try {
            await supa.from("geocode_cache").upsert({
              query_norm: q,
              lat: hit.lat,
              lng: hit.lng,
              label: hit.label,
              provider: "yandex",
              updated_at: (/* @__PURE__ */ new Date()).toISOString()
            }, {
              onConflict: "query_norm"
            });
          } catch (err) {
            console.error("[geocode] cache write failed", err);
          }
        }
        return new Response(JSON.stringify({
          lat: hit.lat,
          lng: hit.lng,
          label: hit.label,
          cached: false
        }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=86400"
          }
        });
      }
    }
  }
});
const $$splitComponentImporter$3 = () => import('./admin.users-DShS2Wsv.mjs');
const Route$4 = createFileRoute("/admin/users")({
  head: () => ({
    meta: [{
      title: "Админка · Пользователи — Athletic Flow"
    }, {
      name: "robots",
      content: "noindex, nofollow"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$3, "component")
});
const $$splitComponentImporter$2 = () => import('./admin.log-CNZ-_woM.mjs');
const Route$3 = createFileRoute("/admin/log")({
  head: () => ({
    meta: [{
      title: "Админка · Аудит — Athletic Flow"
    }, {
      name: "robots",
      content: "noindex, nofollow"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
const $$splitComponentImporter$1 = () => import('./admin.goals-BKM65F6O.mjs');
const Route$2 = createFileRoute("/admin/goals")({
  head: () => ({
    meta: [{
      title: "Админка · Голы — Athletic Flow"
    }, {
      name: "robots",
      content: "noindex, nofollow"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
const $$splitComponentImporter = () => import('./admin.games-fQ4Mgx5Y.mjs');
const Route$1 = createFileRoute("/admin/games")({
  head: () => ({
    meta: [{
      title: "Админка · Игры — Athletic Flow"
    }, {
      name: "robots",
      content: "noindex, nofollow"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter, "component")
});
const ALLOWED_ROLES = ["admin", "organizer", "stadium_owner", "player"];
function isUuid(s) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(s);
}
function getAdminSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: {
      persistSession: false
    }
  });
}
const Route = createFileRoute("/api/admin/grant-role")({
  server: {
    handlers: {
      POST: async ({
        request
      }) => {
        const authH = request.headers.get("authorization") ?? "";
        const m = authH.match(/^Bearer\s+(.+)$/i);
        if (!m) {
          return new Response(JSON.stringify({
            error: "no auth"
          }), {
            status: 401,
            headers: {
              "Content-Type": "application/json"
            }
          });
        }
        const jwt = m[1];
        const supa = getAdminSupabase();
        if (!supa) {
          return new Response(JSON.stringify({
            error: "server misconfigured"
          }), {
            status: 500,
            headers: {
              "Content-Type": "application/json"
            }
          });
        }
        const {
          data: userResp,
          error: userErr
        } = await supa.auth.getUser(jwt);
        if (userErr || !userResp.user) {
          return new Response(JSON.stringify({
            error: "bad token"
          }), {
            status: 401,
            headers: {
              "Content-Type": "application/json"
            }
          });
        }
        const callerId = userResp.user.id;
        const envList = (process.env.ADMIN_USER_IDS ?? "").split(",").map((s) => s.trim()).filter(isUuid);
        const isSuperByEnv = envList.includes(callerId);
        let isAdminByRole = false;
        if (!isSuperByEnv) {
          const {
            data: roleRow
          } = await supa.from("user_roles").select("role").eq("user_id", callerId).eq("role", "admin").maybeSingle();
          isAdminByRole = !!roleRow;
        }
        if (!isSuperByEnv && !isAdminByRole) {
          return new Response(JSON.stringify({
            error: "forbidden"
          }), {
            status: 403,
            headers: {
              "Content-Type": "application/json"
            }
          });
        }
        let body;
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({
            error: "bad json"
          }), {
            status: 400,
            headers: {
              "Content-Type": "application/json"
            }
          });
        }
        const targetId = (body.target_id ?? "").trim();
        const role = (body.role ?? "").trim();
        if (!isUuid(targetId) || !ALLOWED_ROLES.includes(role)) {
          return new Response(JSON.stringify({
            error: "bad payload"
          }), {
            status: 400,
            headers: {
              "Content-Type": "application/json"
            }
          });
        }
        const {
          error: insErr
        } = await supa.from("user_roles").upsert({
          user_id: targetId,
          role
        }, {
          onConflict: "user_id,role"
        });
        if (insErr) {
          return new Response(JSON.stringify({
            error: insErr.message
          }), {
            status: 500,
            headers: {
              "Content-Type": "application/json"
            }
          });
        }
        await supa.from("admin_actions").insert({
          actor_id: callerId,
          target_kind: "role",
          target_id: targetId,
          action: isSuperByEnv ? "super_grant_role" : "grant_role",
          payload: {
            role,
            via: isSuperByEnv ? "env" : "user_roles"
          }
        });
        return new Response(JSON.stringify({
          ok: true
        }), {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        });
      }
    }
  }
});
const StadiumsRoute = Route$q.update({
  id: "/stadiums",
  path: "/stadiums",
  getParentRoute: () => Route$r
});
const SitemapDotxmlRoute = Route$p.update({
  id: "/sitemap.xml",
  path: "/sitemap.xml",
  getParentRoute: () => Route$r
});
const ResetPhoneRoute = Route$o.update({
  id: "/reset-phone",
  path: "/reset-phone",
  getParentRoute: () => Route$r
});
const ProfileRoute = Route$n.update({
  id: "/profile",
  path: "/profile",
  getParentRoute: () => Route$r
});
const PrivacyRoute = Route$m.update({
  id: "/privacy",
  path: "/privacy",
  getParentRoute: () => Route$r
});
const PersonalDataRoute = Route$l.update({
  id: "/personal-data",
  path: "/personal-data",
  getParentRoute: () => Route$r
});
const MyRoute = Route$k.update({
  id: "/my",
  path: "/my",
  getParentRoute: () => Route$r
});
const GamesRoute = Route$j.update({
  id: "/games",
  path: "/games",
  getParentRoute: () => Route$r
});
const FriendsRoute = Route$i.update({
  id: "/friends",
  path: "/friends",
  getParentRoute: () => Route$r
});
const CreateRoute = Route$h.update({
  id: "/create",
  path: "/create",
  getParentRoute: () => Route$r
});
const ChatsRoute = Route$g.update({
  id: "/chats",
  path: "/chats",
  getParentRoute: () => Route$r
});
const AuthRoute = Route$f.update({
  id: "/auth",
  path: "/auth",
  getParentRoute: () => Route$r
});
const AdminRoute = Route$e.update({
  id: "/admin",
  path: "/admin",
  getParentRoute: () => Route$r
});
const IndexRoute = Route$d.update({
  id: "/",
  path: "/",
  getParentRoute: () => Route$r
});
const AdminIndexRoute = Route$c.update({
  id: "/",
  path: "/",
  getParentRoute: () => AdminRoute
});
const UUsernameRoute = Route$b.update({
  id: "/u/$username",
  path: "/u/$username",
  getParentRoute: () => Route$r
});
const StadiumsStadiumIdRoute = Route$a.update({
  id: "/stadiums_/$stadiumId",
  path: "/stadiums/$stadiumId",
  getParentRoute: () => Route$r
});
const GamesGameIdRoute = Route$9.update({
  id: "/games_/$gameId",
  path: "/games/$gameId",
  getParentRoute: () => Route$r
});
const FriendsFriendIdRoute = Route$8.update({
  id: "/friends_/$friendId",
  path: "/friends/$friendId",
  getParentRoute: () => Route$r
});
const ChatsConversationIdRoute = Route$7.update({
  id: "/chats_/$conversationId",
  path: "/chats/$conversationId",
  getParentRoute: () => Route$r
});
const ApiPitchesRoute = Route$6.update({
  id: "/api/pitches",
  path: "/api/pitches",
  getParentRoute: () => Route$r
});
const ApiGeocodeRoute = Route$5.update({
  id: "/api/geocode",
  path: "/api/geocode",
  getParentRoute: () => Route$r
});
const AdminUsersRoute = Route$4.update({
  id: "/users",
  path: "/users",
  getParentRoute: () => AdminRoute
});
const AdminLogRoute = Route$3.update({
  id: "/log",
  path: "/log",
  getParentRoute: () => AdminRoute
});
const AdminGoalsRoute = Route$2.update({
  id: "/goals",
  path: "/goals",
  getParentRoute: () => AdminRoute
});
const AdminGamesRoute = Route$1.update({
  id: "/games",
  path: "/games",
  getParentRoute: () => AdminRoute
});
const ApiAdminGrantRoleRoute = Route.update({
  id: "/api/admin/grant-role",
  path: "/api/admin/grant-role",
  getParentRoute: () => Route$r
});
const AdminRouteChildren = {
  AdminGamesRoute,
  AdminGoalsRoute,
  AdminLogRoute,
  AdminUsersRoute,
  AdminIndexRoute
};
const AdminRouteWithChildren = AdminRoute._addFileChildren(AdminRouteChildren);
const rootRouteChildren = {
  IndexRoute,
  AdminRoute: AdminRouteWithChildren,
  AuthRoute,
  ChatsRoute,
  CreateRoute,
  FriendsRoute,
  GamesRoute,
  MyRoute,
  PersonalDataRoute,
  PrivacyRoute,
  ProfileRoute,
  ResetPhoneRoute,
  SitemapDotxmlRoute,
  StadiumsRoute,
  ApiGeocodeRoute,
  ApiPitchesRoute,
  ChatsConversationIdRoute,
  FriendsFriendIdRoute,
  GamesGameIdRoute,
  StadiumsStadiumIdRoute,
  UUsernameRoute,
  ApiAdminGrantRoleRoute
};
const routeTree = Route$r._addFileChildren(rootRouteChildren)._addFileTypes();
const routeTree_gen = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  routeTree
}, Symbol.toStringTag, { value: "Module" }));
function DefaultErrorComponent({ error, reset }) {
  const router = useRouter();
  return /* @__PURE__ */ jsx("div", { className: "flex min-h-screen items-center justify-center bg-background px-4", children: /* @__PURE__ */ jsxs("div", { className: "max-w-md text-center", children: [
    /* @__PURE__ */ jsx("div", { className: "mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10", children: /* @__PURE__ */ jsx(
      "svg",
      {
        xmlns: "http://www.w3.org/2000/svg",
        className: "h-8 w-8 text-destructive",
        fill: "none",
        viewBox: "0 0 24 24",
        stroke: "currentColor",
        strokeWidth: 2,
        children: /* @__PURE__ */ jsx(
          "path",
          {
            strokeLinecap: "round",
            strokeLinejoin: "round",
            d: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          }
        )
      }
    ) }),
    /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold tracking-tight text-foreground", children: "Something went wrong" }),
    /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "An unexpected error occurred. Please try again." }),
    false,
    /* @__PURE__ */ jsxs("div", { className: "mt-6 flex items-center justify-center gap-3", children: [
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: () => {
            router.invalidate();
            reset();
          },
          className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
          children: "Try again"
        }
      ),
      /* @__PURE__ */ jsx(
        "a",
        {
          href: "/",
          className: "inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent",
          children: "Go home"
        }
      )
    ] })
  ] }) });
}
const createRouter = () => {
  const router = createRouter$1({
    routeTree,
    context: {},
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: DefaultErrorComponent
  });
  return router;
};
const serverEntry$1 = createStartHandler({
  createRouter
})(defaultStreamHandler);
const serverEntry = defineEventHandler(function(event) {
  const request = toWebRequest(event);
  return serverEntry$1({ request });
});

export { Avatar as A, Button as B, Dialog as D, Route$j as R, AvatarFallback as a, AvatarImage as b, DialogContent as c, DialogDescription as d, serverEntry as default, DialogFooter as e, DialogHeader as f, DialogTitle as g, DialogTrigger as h, Route$b as i, Route$a as j, Route$9 as k, Route$8 as l, Route$7 as m, buttonVariants as n, cn as o, displayLabel as p, useCall as q, supabase as s, useAuth as u };
//# sourceMappingURL=ssr.mjs.map
