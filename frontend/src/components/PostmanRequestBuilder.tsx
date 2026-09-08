'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Check,
  ChevronDown,
  Key,
  Hash,
  AlignLeft,
  Code2,
  Zap,
  Lock,
  Globe,
  AlertCircle,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

export interface HeaderRow {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface RequestBuilderValue {
  method: string;
  url: string;
  headers: HeaderRow[];
  authType: 'none' | 'bearer' | 'basic' | 'api_key' | 'custom_header';
  authToken: string;
  authUsername: string;
  authPassword: string;
  authApiKey: string;
  authApiKeyName: string;
  authApiKeyIn: 'header' | 'query';
  bodyType: 'none' | 'json' | 'form-urlencoded' | 'raw';
  bodyJson: string;
  bodyFormRows: { id: string; key: string; value: string; enabled: boolean }[];
  bodyRaw: string;
  bodyRawType: 'text' | 'html' | 'xml' | 'javascript';
  expectedHttpCode: number;
  expectedKeyword: string;
  unexpectedKeyword: string;
  followRedirects: boolean;
  timeout: number;
}

export const defaultRequestBuilderValue = (): RequestBuilderValue => ({
  method: 'GET',
  url: '',
  headers: [{ id: genId(), key: '', value: '', enabled: true }],
  authType: 'none',
  authToken: '',
  authUsername: '',
  authPassword: '',
  authApiKey: '',
  authApiKeyName: 'X-API-Key',
  authApiKeyIn: 'header',
  bodyType: 'none',
  bodyJson: '{\n  \n}',
  bodyFormRows: [{ id: genId(), key: '', value: '', enabled: true }],
  bodyRaw: '',
  bodyRawType: 'text',
  expectedHttpCode: 200,
  expectedKeyword: '',
  unexpectedKeyword: '',
  followRedirects: true,
  timeout: 10000,
});

function genId() {
  return Math.random().toString(36).slice(2, 9);
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers: convert builder value → formData fields for the service API
// ─────────────────────────────────────────────────────────────────────────

export function builderToServicePayload(builder: RequestBuilderValue) {
  // Merge auth into headers
  const headerMap: Record<string, string> = {};

  // Active headers from the table
  builder.headers.filter((h) => h.enabled && h.key.trim()).forEach((h) => {
    headerMap[h.key.trim()] = h.value;
  });

  switch (builder.authType) {
    case 'bearer':
      if (builder.authToken) headerMap['Authorization'] = `Bearer ${builder.authToken}`;
      break;
    case 'basic': {
      const encoded = btoa(`${builder.authUsername}:${builder.authPassword}`);
      headerMap['Authorization'] = `Basic ${encoded}`;
      break;
    }
    case 'api_key':
      if (builder.authApiKeyIn === 'header' && builder.authApiKeyName && builder.authApiKey) {
        headerMap[builder.authApiKeyName] = builder.authApiKey;
      }
      break;
    case 'none':
    default:
      break;
  }

  // Body serialization
  let bodyStr: string | undefined;
  let contentType = 'application/json';

  if (builder.bodyType === 'json' && builder.bodyJson.trim()) {
    bodyStr = builder.bodyJson.trim();
    contentType = 'application/json';
  } else if (builder.bodyType === 'form-urlencoded') {
    const params = new URLSearchParams();
    builder.bodyFormRows.filter((r) => r.enabled && r.key.trim()).forEach((r) => {
      params.append(r.key.trim(), r.value);
    });
    bodyStr = params.toString();
    contentType = 'application/x-www-form-urlencoded';
    headerMap['Content-Type'] = contentType;
  } else if (builder.bodyType === 'raw') {
    bodyStr = builder.bodyRaw;
    const rawTypeMap: Record<string, string> = {
      text: 'text/plain',
      html: 'text/html',
      xml: 'application/xml',
      javascript: 'application/javascript',
    };
    contentType = rawTypeMap[builder.bodyRawType] || 'text/plain';
    headerMap['Content-Type'] = contentType;
  }

  // Auto-set Content-Type for JSON if body is JSON
  if (builder.bodyType === 'json' && !headerMap['Content-Type']) {
    headerMap['Content-Type'] = 'application/json';
  }

  // Query params for API Key in query
  let urlWithParams = builder.url;
  if (
    builder.authType === 'api_key' &&
    builder.authApiKeyIn === 'query' &&
    builder.authApiKeyName &&
    builder.authApiKey
  ) {
    const separator = builder.url.includes('?') ? '&' : '?';
    urlWithParams = `${builder.url}${separator}${encodeURIComponent(builder.authApiKeyName)}=${encodeURIComponent(builder.authApiKey)}`;
  }

  return {
    url: urlWithParams,
    host: urlWithParams,
    method: builder.method,
    headers: Object.keys(headerMap).length > 0 ? headerMap : undefined,
    body: bodyStr,
    expectedHttpCode: builder.expectedHttpCode,
    expectedKeyword: builder.expectedKeyword || undefined,
    unexpectedKeyword: builder.unexpectedKeyword || undefined,
    followRedirects: builder.followRedirects,
    timeout: builder.timeout,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  POST: 'text-amber-700 bg-amber-50 border-amber-200',
  PUT: 'text-blue-700 bg-blue-50 border-blue-200',
  PATCH: 'text-purple-700 bg-purple-50 border-purple-200',
  DELETE: 'text-red-700 bg-red-50 border-red-200',
  HEAD: 'text-slate-700 bg-slate-50 border-slate-200',
  OPTIONS: 'text-teal-700 bg-teal-50 border-teal-200',
};

const inputCls =
  'w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 font-mono placeholder:text-slate-400 focus:outline-none focus:border-[#245b87] focus:ring-1 focus:ring-[#245b87] transition-all';

// ─────────────────────────────────────────────────────────────────────────
// KeyValueTable — reusable for headers & form body
// ─────────────────────────────────────────────────────────────────────────

interface KeyValueTableProps {
  rows: { id: string; key: string; value: string; enabled: boolean }[];
  onChange: (rows: { id: string; key: string; value: string; enabled: boolean }[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  maskValues?: boolean;
}

function KeyValueTable({ rows, onChange, keyPlaceholder = 'Key', valuePlaceholder = 'Value', maskValues = false }: KeyValueTableProps) {
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const update = (id: string, field: string, val: any) => {
    onChange(rows.map((r) => (r.id === id ? { ...r, [field]: val } : r)));
  };

  const addRow = () => {
    onChange([...rows, { id: genId(), key: '', value: '', enabled: true }]);
  };

  const removeRow = (id: string) => {
    const next = rows.filter((r) => r.id !== id);
    if (next.length === 0) next.push({ id: genId(), key: '', value: '', enabled: true });
    onChange(next);
  };

  const copyValue = (id: string, val: string) => {
    navigator.clipboard.writeText(val).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  return (
    <div className="space-y-1">
      {rows.map((row, idx) => (
        <div
          key={row.id}
          className={`flex items-center space-x-1.5 p-1.5 rounded-lg group transition-colors ${
            row.enabled ? 'bg-white hover:bg-slate-50' : 'bg-slate-50 opacity-60 hover:bg-slate-100'
          } border border-slate-100`}
        >
          {/* Toggle Checkbox */}
          <input
            type="checkbox"
            checked={row.enabled}
            onChange={(e) => update(row.id, 'enabled', e.target.checked)}
            className="rounded border-slate-300 text-[#245b87] focus:ring-[#245b87] flex-shrink-0"
          />

          {/* Key */}
          <input
            type="text"
            placeholder={keyPlaceholder}
            value={row.key}
            onChange={(e) => update(row.id, 'key', e.target.value)}
            className="flex-1 min-w-0 px-2 py-1 text-[11px] font-mono bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#245b87] outline-none text-slate-900 placeholder:text-slate-400"
          />

          <span className="text-slate-300 text-xs flex-shrink-0">:</span>

          {/* Value */}
          <div className="flex-1 min-w-0 relative flex items-center">
            <input
              type={maskValues && !visibleIds.has(row.id) ? 'password' : 'text'}
              placeholder={valuePlaceholder}
              value={row.value}
              onChange={(e) => update(row.id, 'value', e.target.value)}
              className="w-full px-2 py-1 text-[11px] font-mono bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#245b87] outline-none text-slate-900 placeholder:text-slate-400 pr-10"
            />
            <div className="absolute right-0 flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {maskValues && (
                <button
                  type="button"
                  onClick={() =>
                    setVisibleIds((prev) => {
                      const next = new Set(prev);
                      prev.has(row.id) ? next.delete(row.id) : next.add(row.id);
                      return next;
                    })
                  }
                  className="p-0.5 rounded text-slate-400 hover:text-slate-700"
                >
                  {visibleIds.has(row.id) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
              )}
              <button
                type="button"
                onClick={() => copyValue(row.id, row.value)}
                className="p-0.5 rounded text-slate-400 hover:text-slate-700"
              >
                {copiedId === row.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {/* Remove */}
          <button
            type="button"
            onClick={() => removeRow(row.id)}
            className="p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addRow}
        className="flex items-center space-x-1 text-[11px] text-[#245b87] hover:text-[#1b496d] font-semibold px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors"
      >
        <Plus className="w-3 h-3" />
        <span>Añadir fila</span>
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Main Component: PostmanRequestBuilder
// ─────────────────────────────────────────────────────────────────────────

type Tab = 'params' | 'auth' | 'headers' | 'body' | 'validation';

interface PostmanRequestBuilderProps {
  value: RequestBuilderValue;
  onChange: (val: RequestBuilderValue) => void;
  showUrlMethodBar?: boolean;
}

export default function PostmanRequestBuilder({
  value,
  onChange,
  showUrlMethodBar = false,
}: PostmanRequestBuilderProps) {
  const [activeTab, setActiveTab] = useState<Tab>('body');
  const [showAuthPass, setShowAuthPass] = useState(false);

  const set = (patch: Partial<RequestBuilderValue>) => onChange({ ...value, ...patch });

  const methodColor = METHOD_COLORS[value.method] || 'text-slate-700 bg-slate-50 border-slate-200';

  const badgeCount = (tab: Tab): number | null => {
    switch (tab) {
      case 'headers':
        return value.headers.filter((h) => h.enabled && h.key.trim()).length || null;
      case 'auth':
        return value.authType !== 'none' ? 1 : null;
      case 'body':
        return value.bodyType !== 'none' ? 1 : null;
      case 'validation':
        return (value.expectedKeyword || value.unexpectedKeyword) ? 1 : null;
      default:
        return null;
    }
  };

  const tabLabel: Record<Tab, string> = {
    params: 'Query Params',
    auth: 'Autorización',
    headers: 'Cabeceras (Headers)',
    body: 'Cuerpo (Body)',
    validation: 'Validación',
  };

  const tabs: Tab[] = ['auth', 'headers', 'body', 'validation'];

  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm text-xs">
      {/* ── Optional URL + Method bar ── */}
      {showUrlMethodBar && (
        <div className="flex items-stretch border-b border-slate-200 bg-slate-50">
          {/* Method Selector */}
          <div className="relative flex-shrink-0">
            <select
              value={value.method}
              onChange={(e) => set({ method: e.target.value })}
              className={`h-full pl-3 pr-6 py-2.5 appearance-none font-bold text-xs border-r border-slate-200 bg-transparent focus:outline-none focus:ring-0 ${methodColor}`}
            >
              {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" />
          </div>
          {/* URL */}
          <input
            type="text"
            placeholder="https://api.ejemplo.gob.bo/v1/endpoint"
            value={value.url}
            onChange={(e) => set({ url: e.target.value })}
            className="flex-1 px-3 py-2.5 bg-transparent font-mono text-xs text-slate-900 focus:outline-none placeholder:text-slate-400"
          />
        </div>
      )}

      {/* ── Tab Bar ── */}
      <div className="flex border-b border-slate-200 bg-slate-50/60 overflow-x-auto">
        {tabs.map((tab) => {
          const count = badgeCount(tab);
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex items-center space-x-1.5 px-4 py-2.5 text-[11px] font-semibold whitespace-nowrap border-b-2 transition-all ${
                active
                  ? 'border-[#245b87] text-[#245b87] bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-white/70'
              }`}
            >
              <span>{tabLabel[tab]}</span>
              {count !== null && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    active ? 'bg-[#245b87] text-white' : 'bg-slate-300 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ── */}
      <div className="p-4 space-y-3">

        {/* ────── AUTH ────── */}
        {activeTab === 'auth' && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <label className="text-[11px] font-bold text-slate-700 w-28 flex-shrink-0">Tipo de Auth</label>
              <select
                value={value.authType}
                onChange={(e) => set({ authType: e.target.value as any })}
                className={`${inputCls} flex-1`}
              >
                <option value="none">Sin autenticación</option>
                <option value="bearer">Bearer Token (JWT / OAuth2)</option>
                <option value="basic">Basic Auth (Usuario + Contraseña)</option>
                <option value="api_key">API Key</option>
              </select>
            </div>

            {value.authType === 'bearer' && (
              <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 space-y-2">
                <div className="flex items-center space-x-1.5 text-[11px] text-amber-800 font-bold">
                  <Key className="w-3.5 h-3.5" />
                  <span>Bearer Token</span>
                </div>
                <div className="relative">
                  <input
                    type={showAuthPass ? 'text' : 'password'}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={value.authToken}
                    onChange={(e) => set({ authToken: e.target.value })}
                    className={inputCls}
                  />
                  <button
                    type="button"
                    onClick={() => setShowAuthPass(!showAuthPass)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showAuthPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-amber-700">
                  Se añadirá automáticamente como <code className="bg-amber-100 px-1 rounded">Authorization: Bearer &#123;token&#125;</code>
                </p>
              </div>
            )}

            {value.authType === 'basic' && (
              <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200 space-y-2">
                <div className="flex items-center space-x-1.5 text-[11px] text-blue-800 font-bold">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Basic Authentication</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-600 font-semibold block mb-1">Usuario</label>
                    <input
                      type="text"
                      placeholder="usuario@segip.gob.bo"
                      value={value.authUsername}
                      onChange={(e) => set({ authUsername: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-600 font-semibold block mb-1">Contraseña</label>
                    <div className="relative">
                      <input
                        type={showAuthPass ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={value.authPassword}
                        onChange={(e) => set({ authPassword: e.target.value })}
                        className={`${inputCls} pr-8`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowAuthPass(!showAuthPass)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      >
                        {showAuthPass ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-blue-700">
                  Se codifica automáticamente en Base64 como <code className="bg-blue-100 px-1 rounded">Authorization: Basic &#123;base64&#125;</code>
                </p>
              </div>
            )}

            {value.authType === 'api_key' && (
              <div className="p-3 rounded-xl bg-teal-50/60 border border-teal-200 space-y-2">
                <div className="flex items-center space-x-1.5 text-[11px] text-teal-800 font-bold">
                  <Hash className="w-3.5 h-3.5" />
                  <span>API Key</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-600 font-semibold block mb-1">Nombre del Header / Param</label>
                    <input
                      type="text"
                      placeholder="X-API-Key"
                      value={value.authApiKeyName}
                      onChange={(e) => set({ authApiKeyName: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-600 font-semibold block mb-1">Añadir en</label>
                    <select
                      value={value.authApiKeyIn}
                      onChange={(e) => set({ authApiKeyIn: e.target.value as any })}
                      className={inputCls}
                    >
                      <option value="header">Header HTTP</option>
                      <option value="query">Query Parameter (?key=)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-600 font-semibold block mb-1">Valor del API Key</label>
                  <div className="relative">
                    <input
                      type={showAuthPass ? 'text' : 'password'}
                      placeholder="sk_live_abcdef123456..."
                      value={value.authApiKey}
                      onChange={(e) => set({ authApiKey: e.target.value })}
                      className={`${inputCls} pr-8`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowAuthPass(!showAuthPass)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    >
                      {showAuthPass ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {value.authType === 'none' && (
              <div className="flex items-center space-x-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500">
                <Globe className="w-4 h-4 text-slate-400" />
                <span>Sin autenticación. La petición se enviará sin cabecera Authorization.</span>
              </div>
            )}
          </div>
        )}

        {/* ────── HEADERS ────── */}
        {activeTab === 'headers' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-slate-500">
                Cabeceras HTTP personalizadas. Activa solo las que necesites.
              </p>
            </div>
            <KeyValueTable
              rows={value.headers}
              onChange={(headers) => set({ headers })}
              keyPlaceholder="Header Name (ej: Content-Type)"
              valuePlaceholder="Header Value (ej: application/json)"
            />

            {/* Auto-header suggestions */}
            <div className="pt-2 border-t border-slate-100">
              <p className="text-[10px] text-slate-400 font-semibold mb-2">Sugerencias rápidas:</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { key: 'Content-Type', value: 'application/json' },
                  { key: 'Accept', value: 'application/json' },
                  { key: 'Cache-Control', value: 'no-cache' },
                  { key: 'X-Requested-With', value: 'XMLHttpRequest' },
                ].map((sug) => (
                  <button
                    key={sug.key}
                    type="button"
                    onClick={() => {
                      const exists = value.headers.some((h) => h.key === sug.key);
                      if (!exists) {
                        const newHeaders = [...value.headers, { id: genId(), key: sug.key, value: sug.value, enabled: true }];
                        set({ headers: newHeaders });
                      }
                    }}
                    className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 transition-colors"
                  >
                    + {sug.key}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ────── BODY ────── */}
        {activeTab === 'body' && (
          <div className="space-y-3">
            {/* Body type radio */}
            <div className="flex flex-wrap gap-2">
              {(['none', 'json', 'form-urlencoded', 'raw'] as const).map((bt) => (
                <label
                  key={bt}
                  className={`flex items-center space-x-1.5 cursor-pointer px-3 py-1.5 rounded-xl border text-[11px] font-semibold transition-all ${
                    value.bodyType === bt
                      ? 'bg-[#245b87] text-white border-[#245b87] shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    checked={value.bodyType === bt}
                    onChange={() => set({ bodyType: bt })}
                  />
                  <span>
                    {{
                      none: 'Ninguno',
                      json: 'JSON',
                      'form-urlencoded': 'Form URL Encoded',
                      raw: 'Raw Text',
                    }[bt]}
                  </span>
                </label>
              ))}
            </div>

            {value.bodyType === 'none' && (
              <div className="py-6 text-center text-slate-400 text-[11px]">Esta petición no tiene cuerpo (Body).</div>
            )}

            {/* JSON Editor */}
            {value.bodyType === 'json' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center space-x-1.5 text-[11px] text-emerald-700 font-bold">
                    <Code2 className="w-3.5 h-3.5" />
                    <span>Cuerpo JSON</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        set({ bodyJson: JSON.stringify(JSON.parse(value.bodyJson), null, 2) });
                      } catch {
                        /* ignore */
                      }
                    }}
                    className="text-[10px] px-2 py-0.5 rounded text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 font-semibold"
                  >
                    Formatear JSON
                  </button>
                </div>
                <textarea
                  rows={8}
                  value={value.bodyJson}
                  onChange={(e) => set({ bodyJson: e.target.value })}
                  placeholder={'{\n  "key": "value"\n}'}
                  spellCheck={false}
                  className="w-full px-3 py-2 bg-slate-950 text-emerald-300 border border-slate-700 rounded-xl font-mono text-xs resize-none focus:outline-none focus:border-[#245b87] leading-relaxed"
                />
                {/* JSON validation */}
                {(() => {
                  try {
                    JSON.parse(value.bodyJson);
                    return (
                      <span className="text-[10px] text-emerald-600 flex items-center space-x-1">
                        <Check className="w-3 h-3" />
                        <span>JSON válido</span>
                      </span>
                    );
                  } catch {
                    return value.bodyJson.trim() ? (
                      <span className="text-[10px] text-red-600 flex items-center space-x-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>JSON inválido — se enviará tal como está</span>
                      </span>
                    ) : null;
                  }
                })()}
              </div>
            )}

            {/* Form URL Encoded */}
            {value.bodyType === 'form-urlencoded' && (
              <div className="space-y-2">
                <span className="flex items-center space-x-1.5 text-[11px] text-blue-700 font-bold">
                  <AlignLeft className="w-3.5 h-3.5" />
                  <span>Parámetros de Formulario (application/x-www-form-urlencoded)</span>
                </span>
                <KeyValueTable
                  rows={value.bodyFormRows}
                  onChange={(bodyFormRows) => set({ bodyFormRows })}
                  keyPlaceholder="Nombre del campo (ej: username)"
                  valuePlaceholder="Valor"
                />
                {/* Preview */}
                {value.bodyFormRows.some((r) => r.enabled && r.key.trim()) && (
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 font-mono text-[10px] text-slate-600 break-all">
                    {value.bodyFormRows
                      .filter((r) => r.enabled && r.key.trim())
                      .map((r) => `${encodeURIComponent(r.key)}=${encodeURIComponent(r.value)}`)
                      .join('&')}
                  </div>
                )}
              </div>
            )}

            {/* Raw body */}
            {value.bodyType === 'raw' && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="flex items-center space-x-1.5 text-[11px] text-slate-700 font-bold">
                    <Zap className="w-3.5 h-3.5" />
                    <span>Texto sin formato</span>
                  </span>
                  <select
                    value={value.bodyRawType}
                    onChange={(e) => set({ bodyRawType: e.target.value as any })}
                    className="ml-auto px-2 py-1 text-[11px] bg-slate-100 border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
                  >
                    <option value="text">Text</option>
                    <option value="html">HTML</option>
                    <option value="xml">XML</option>
                    <option value="javascript">JavaScript</option>
                  </select>
                </div>
                <textarea
                  rows={7}
                  value={value.bodyRaw}
                  onChange={(e) => set({ bodyRaw: e.target.value })}
                  placeholder="Contenido del cuerpo de la petición..."
                  spellCheck={false}
                  className="w-full px-3 py-2 bg-slate-900 text-slate-200 border border-slate-700 rounded-xl font-mono text-xs resize-none focus:outline-none focus:border-[#245b87] leading-relaxed"
                />
              </div>
            )}
          </div>
        )}

        {/* ────── VALIDATION ────── */}
        {activeTab === 'validation' && (
          <div className="space-y-4">
            <p className="text-[11px] text-slate-500">
              Define las condiciones de éxito para la respuesta. El monitor marcará el servicio como <b>RALENTIZADO</b> o <b>DOWN</b> si no se cumplen.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Expected HTTP Code */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Código HTTP Esperado
                </label>
                <div className="flex items-center space-x-2">
                  <select
                    value={value.expectedHttpCode}
                    onChange={(e) => set({ expectedHttpCode: Number(e.target.value) })}
                    className={inputCls}
                  >
                    {[200, 201, 204, 301, 302, 400, 401, 403, 404, 500, 502, 503].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Si la respuesta difiere → RALENTIZADO</p>
              </div>

              {/* Timeout */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Timeout (ms)
                </label>
                <input
                  type="number"
                  min={500}
                  max={60000}
                  step={500}
                  value={value.timeout}
                  onChange={(e) => set({ timeout: Number(e.target.value) })}
                  className={inputCls}
                />
                <p className="text-[10px] text-slate-500 mt-1">Si supera este tiempo → TIMEOUT</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Expected keyword */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Palabra Clave de Éxito (contiene...)
                </label>
                <input
                  type="text"
                  placeholder='ej: "status":"ok" o "success":true'
                  value={value.expectedKeyword}
                  onChange={(e) => set({ expectedKeyword: e.target.value })}
                  className={inputCls}
                />
                <p className="text-[10px] text-slate-500 mt-1">Si no contiene este texto → RALENTIZADO</p>
              </div>

              {/* Unexpected keyword */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Palabra Clave de Fallo (NO debe contener...)
                </label>
                <input
                  type="text"
                  placeholder='ej: "error" o "Internal Server Error"'
                  value={value.unexpectedKeyword}
                  onChange={(e) => set({ unexpectedKeyword: e.target.value })}
                  className={inputCls}
                />
                <p className="text-[10px] text-slate-500 mt-1">Si el body contiene esto → RALENTIZADO</p>
              </div>
            </div>

            {/* Follow Redirects */}
            <div className="flex items-center space-x-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <input
                type="checkbox"
                id="followRedirects"
                checked={value.followRedirects}
                onChange={(e) => set({ followRedirects: e.target.checked })}
                className="rounded border-slate-300 text-[#245b87] focus:ring-[#245b87]"
              />
              <label htmlFor="followRedirects" className="text-[11px] text-slate-700 font-medium cursor-pointer">
                Seguir redirecciones HTTP automáticamente (301, 302)
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
