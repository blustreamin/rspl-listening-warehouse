import React from 'react';
import { PUBLISHED_REPORTS } from '../constants/reports';

// A static library of published report bundles. Each card is a plain anchor
// that opens the pre-built static cover in a new tab (native new-tab semantics
// — keyboard, middle-click, "open in new window" all work). No fetch, no DB,
// no iframe: the bundles are served straight from public/reports/.
const fmtPublished = (ym: string): string => {
  const [y, m] = ym.split('-');
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];
  const mi = Number(m) - 1;
  return months[mi] ? `${months[mi]} ${y}` : ym;
};

export const ReportsLibrary: React.FC = () => {
  return (
    <div className="min-h-full bg-slate-50 p-8 lg:p-12">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Report Library</h1>
          <p className="text-sm text-slate-500 mt-1">
            Published, client-ready category reports. Each opens in a new tab.
          </p>
        </header>

        <ul className="grid gap-4 sm:grid-cols-2">
          {PUBLISHED_REPORTS.map((r) => (
            <li key={r.id}>
              <a
                href={r.path}
                target="_blank"
                rel="noopener noreferrer"
                className="group block h-full bg-white border border-slate-200 rounded-xl p-5 hover:border-indigo-400 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">
                    {r.category}
                  </span>
                  <svg
                    className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors flex-shrink-0"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>

                <h2 className="mt-2 text-base font-bold text-slate-900 leading-snug">
                  {r.title}
                </h2>
                {r.subtitle && (
                  <p className="mt-2 text-xs text-slate-500 leading-relaxed">{r.subtitle}</p>
                )}

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-3 text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-600">{r.sections} sections</span>
                  <span aria-hidden="true">·</span>
                  <span>Published {fmtPublished(r.published)}</span>
                  <span className="ml-auto text-indigo-500 font-semibold group-hover:underline">
                    Open report →
                  </span>
                </div>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
