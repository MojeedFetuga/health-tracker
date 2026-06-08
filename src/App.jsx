import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { IS_CONFIGURED } from "./firebaseConfig.js";
import {
  listenAuthState, signInWithGoogle, signOut,
  backupToCloud, restoreFromCloud, subscribeToCloud,
  setProStatus, subscribeProStatus, deleteAllUserData,
} from "./cloudBackup.js";
import { PAYSTACK_PUBLIC_KEY, PLANS, IS_PAYSTACK_CONFIGURED } from "./paystackConfig.js";
import { MEDICAL_DISCLAIMER, PRIVACY_POLICY, TERMS_OF_SERVICE, CONTACT_EMAIL } from "./policies.js";

const STORAGE_KEY = "healthtracker_v1";

const DEFAULT_CHECK_TYPES = [
  { id: "bp", name: "Blood Pressure", unit: "mmHg" },
  { id: "temp", name: "Temperature", unit: "°C" },
  { id: "weight", name: "Weight", unit: "kg" },
  { id: "sugar", name: "Blood Sugar", unit: "mg/dL" },
];

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&family=Syne:wght@400;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --cream: #f5f0e8;
    --ink: #1a1a2e;
    --teal: #0d9488;
    --teal-light: #ccfbf1;
    --teal-dark: #0f766e;
    --amber: #d97706;
    --amber-light: #fef3c7;
    --rose: #e11d48;
    --rose-light: #ffe4e6;
    --slate: #64748b;
    --slate-light: #f1f5f9;
    --white: #ffffff;
    --border: #e2e8f0;
    --shadow: 0 4px 24px rgba(26,26,46,0.08);
    --shadow-lg: 0 8px 40px rgba(26,26,46,0.14);
  }

  body { font-family: 'Syne', sans-serif; background: var(--cream); color: var(--ink); min-height: 100vh; }

  .app { max-width: 1100px; margin: 0 auto; padding: 0 16px 60px; }

  /* HEADER */
  .header {
    padding: 32px 0 24px;
    border-bottom: 2px solid var(--ink);
    margin-bottom: 32px;
    display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap;
  }
  .header-title { font-family: 'DM Serif Display', serif; font-size: clamp(28px, 5vw, 44px); line-height: 1; color: var(--ink); }
  .header-title span { color: var(--teal); font-style: italic; }
  .header-sub { font-size: 13px; color: var(--slate); margin-top: 6px; letter-spacing: 0.05em; text-transform: uppercase; font-family: 'DM Mono', monospace; }

  /* TABS */
  .tabs { display: flex; gap: 4px; background: var(--ink); border-radius: 12px; padding: 4px; margin-bottom: 28px; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
  .tabs::-webkit-scrollbar { display: none; }
  .tab { flex: 1; min-width: max-content; padding: 10px 12px; border: none; background: transparent; color: rgba(255,255,255,0.55); font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 600; border-radius: 8px; cursor: pointer; transition: all 0.2s; letter-spacing: 0.03em; white-space: nowrap; }
  .tab.active { background: var(--teal); color: #fff; }
  .tab:hover:not(.active) { color: #fff; }

  /* CARDS */
  .card { background: var(--white); border-radius: 16px; padding: 24px; box-shadow: var(--shadow); margin-bottom: 20px; border: 1px solid var(--border); }
  .card-title { font-family: 'DM Serif Display', serif; font-size: 20px; margin-bottom: 18px; color: var(--ink); display: flex; align-items: center; gap: 8px; }
  .card-title .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--teal); display: inline-block; }

  /* FORM ELEMENTS */
  .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; }
  .form-group { display: flex; flex-direction: column; gap: 6px; }
  label { font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--slate); font-family: 'DM Mono', monospace; }
  input, select, textarea {
    padding: 10px 14px; border: 1.5px solid var(--border); border-radius: 10px;
    font-family: 'Syne', sans-serif; font-size: 14px; color: var(--ink);
    background: var(--slate-light); outline: none; transition: border-color 0.2s, box-shadow 0.2s;
    width: 100%;
  }
  input:focus, select:focus, textarea:focus { border-color: var(--teal); box-shadow: 0 0 0 3px var(--teal-light); background: #fff; }

  /* BUTTONS */
  .btn { padding: 10px 20px; border: none; border-radius: 10px; font-family: 'Syne', sans-serif; font-weight: 700; font-size: 14px; cursor: pointer; transition: all 0.18s; display: inline-flex; align-items: center; gap: 7px; letter-spacing: 0.02em; }
  .btn-primary { background: var(--teal); color: #fff; }
  .btn-primary:hover { background: var(--teal-dark); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(13,148,136,0.35); }
  .btn-secondary { background: var(--ink); color: #fff; }
  .btn-secondary:hover { background: #2d2d4e; transform: translateY(-1px); }
  .btn-danger { background: var(--rose-light); color: var(--rose); border: 1px solid #fecdd3; }
  .btn-danger:hover { background: var(--rose); color: #fff; }
  .btn-amber { background: var(--amber-light); color: var(--amber); border: 1px solid #fde68a; }
  .btn-amber:hover { background: var(--amber); color: #fff; }
  .btn-sm { padding: 6px 12px; font-size: 12px; }
  .btn-full { width: 100%; justify-content: center; margin-top: 8px; }

  /* PERSON CARDS */
  .person-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
  .person-card {
    background: var(--white); border: 2px solid var(--border); border-radius: 14px; padding: 18px;
    cursor: pointer; transition: all 0.2s; position: relative; overflow: hidden;
  }
  .person-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: var(--teal); transform: scaleX(0); transform-origin: left; transition: transform 0.2s; }
  .person-card:hover::before, .person-card.selected::before { transform: scaleX(1); }
  .person-card:hover { border-color: var(--teal); box-shadow: var(--shadow); }
  .person-card.selected { border-color: var(--teal); background: #f0fdfa; }
  .person-name { font-family: 'DM Serif Display', serif; font-size: 18px; margin-bottom: 4px; }
  .person-meta { font-size: 12px; color: var(--slate); font-family: 'DM Mono', monospace; }
  .person-actions { display: flex; gap: 6px; margin-top: 12px; }

  /* RECORDS TABLE */
  .table-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid var(--border); }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  thead { background: var(--ink); color: #fff; }
  th { padding: 12px 16px; text-align: left; font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.07em; font-weight: 500; }
  td { padding: 11px 16px; border-bottom: 1px solid var(--border); }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: var(--slate-light); }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; font-family: 'DM Mono', monospace; }
  .badge-morning { background: var(--amber-light); color: var(--amber); }
  .badge-evening { background: #ede9fe; color: #7c3aed; }

  /* EMPTY STATE */
  .empty { text-align: center; padding: 48px 24px; color: var(--slate); }
  .empty-icon { font-size: 40px; margin-bottom: 12px; }
  .empty p { font-size: 14px; line-height: 1.6; }

  /* CHECK TYPE LIST */
  .check-list { display: flex; flex-direction: column; gap: 10px; }
  .check-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: var(--slate-light); border-radius: 10px; border: 1px solid var(--border); }
  .check-item-name { font-weight: 700; font-size: 14px; }
  .check-item-unit { font-family: 'DM Mono', monospace; font-size: 12px; color: var(--slate); }

  /* SUMMARY STATS */
  .stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; margin-bottom: 20px; }
  .stat-box { background: var(--white); border: 1px solid var(--border); border-radius: 12px; padding: 16px; text-align: center; }
  .stat-value { font-family: 'DM Serif Display', serif; font-size: 28px; color: var(--teal); }
  .stat-label { font-size: 11px; color: var(--slate); text-transform: uppercase; letter-spacing: 0.06em; font-family: 'DM Mono', monospace; margin-top: 4px; }

  /* TOAST */
  .toast { position: fixed; bottom: 24px; right: 24px; background: var(--ink); color: #fff; padding: 12px 20px; border-radius: 10px; font-size: 14px; z-index: 999; box-shadow: var(--shadow-lg); animation: slideIn 0.3s ease; }
  @keyframes slideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

  /* MODAL */
  .modal-overlay { position: fixed; inset: 0; background: rgba(26,26,46,0.5); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 16px; animation: fadeIn 0.15s ease; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .modal { background: var(--white); border-radius: 16px; padding: 24px; width: 100%; max-width: 540px; box-shadow: var(--shadow-lg); animation: slideUp 0.2s ease; }
  @keyframes slideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  .modal-title { font-family: 'DM Serif Display', serif; font-size: 20px; margin-bottom: 18px; color: var(--ink); display: flex; align-items: center; gap: 8px; }
  .modal-actions { display: flex; gap: 10px; margin-top: 20px; justify-content: flex-end; flex-wrap: wrap; }
  @media (max-width: 520px) { .modal { padding: 16px; border-radius: 12px; } .modal-actions { justify-content: stretch; } .modal-actions .btn { flex: 1; justify-content: center; } }

  /* OFFLINE BANNER */
  .offline-banner { background: #451a03; color: #fef3c7; padding: 8px 16px; text-align: center; font-size: 13px; font-family: 'DM Mono', monospace; letter-spacing: 0.04em; border-radius: 10px; margin-bottom: 16px; display: flex; align-items: center; justify-content: center; gap: 8px; }
  .online-badge { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-family: 'DM Mono', monospace; padding: 4px 10px; border-radius: 20px; border: 1.5px solid; }
  .online-badge.online { color: var(--teal-dark); border-color: var(--teal); background: var(--teal-light); }
  .online-badge.offline { color: #92400e; border-color: #d97706; background: #fef3c7; }
  .status-dot { width: 7px; height: 7px; border-radius: 50%; }
  .online-badge.online .status-dot { background: var(--teal); }
  .online-badge.offline .status-dot { background: #d97706; }

  .divider { height: 1px; background: var(--border); margin: 20px 0; }
  .flex-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
  .ml-auto { margin-left: auto; }
  .text-sm { font-size: 13px; }
  .text-slate { color: var(--slate); }
  .mt-4 { margin-top: 16px; }
  .fw-bold { font-weight: 700; }

  /* BACKUP TAB */
  .backup-center { text-align: center; padding: 40px 24px; }
  .backup-center-icon { font-size: 52px; margin-bottom: 16px; }
  .backup-center h3 { font-family: 'DM Serif Display', serif; font-size: 22px; margin-bottom: 8px; }
  .backup-center p { font-size: 14px; color: var(--slate); max-width: 380px; margin: 0 auto 24px; line-height: 1.6; }

  .btn-google { background: #fff; color: #3c4043; border: 1.5px solid var(--border); display: inline-flex; align-items: center; gap: 10px; padding: 10px 24px; border-radius: 10px; font-family: 'Syne', sans-serif; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.18s; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
  .btn-google:hover { box-shadow: 0 3px 10px rgba(0,0,0,0.15); transform: translateY(-1px); }
  .btn-google:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

  .user-row { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: var(--slate-light); border-radius: 12px; border: 1px solid var(--border); margin-bottom: 20px; }
  .user-avatar { width: 38px; height: 38px; border-radius: 50%; object-fit: cover; }
  .user-avatar-placeholder { width: 38px; height: 38px; border-radius: 50%; background: var(--teal); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 15px; flex-shrink: 0; }
  .user-name { font-weight: 700; font-size: 14px; line-height: 1.3; }
  .user-email { font-size: 12px; color: var(--slate); font-family: 'DM Mono', monospace; }

  .backup-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-bottom: 20px; }
  .backup-action-card { border: 1.5px solid var(--border); border-radius: 14px; padding: 22px 20px; }
  .backup-action-card h4 { font-family: 'DM Serif Display', serif; font-size: 17px; margin-bottom: 6px; }
  .backup-action-card p { font-size: 12px; color: var(--slate); margin-bottom: 16px; line-height: 1.55; }

  .last-backup-row { display: flex; align-items: center; gap: 8px; font-size: 12px; font-family: 'DM Mono', monospace; color: var(--slate); margin-bottom: 20px; }
  .last-backup-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--teal); flex-shrink: 0; }
  .last-backup-dot.never { background: var(--border); }

  .auto-backup-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px; background: var(--slate-light); border-radius: 12px; border: 1px solid var(--border); }
  .auto-backup-text .label { font-weight: 700; font-size: 14px; margin-bottom: 3px; }
  .auto-backup-text .sub { font-size: 12px; color: var(--slate); line-height: 1.4; }
  .toggle { position: relative; width: 46px; height: 26px; flex-shrink: 0; }
  .toggle input { opacity: 0; width: 0; height: 0; }
  .toggle-slider { position: absolute; cursor: pointer; inset: 0; background: var(--border); border-radius: 26px; transition: background 0.2s; }
  .toggle-slider::before { content: ''; position: absolute; width: 20px; height: 20px; left: 3px; top: 3px; background: #fff; border-radius: 50%; transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
  .toggle input:checked + .toggle-slider { background: var(--teal); }
  .toggle input:checked + .toggle-slider::before { transform: translateX(20px); }

  .msg-bar { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 10px; font-size: 13px; font-family: 'DM Mono', monospace; margin-top: 12px; }
  .msg-bar.success { background: var(--teal-light); color: var(--teal-dark); }
  .msg-bar.error { background: var(--rose-light); color: var(--rose); }
  .msg-bar.info { background: var(--amber-light); color: var(--amber); }

  .setup-guide { background: var(--amber-light); border: 1.5px solid #fde68a; border-radius: 14px; padding: 22px 20px; }
  .setup-guide h4 { font-family: 'DM Serif Display', serif; font-size: 17px; margin-bottom: 12px; color: #92400e; }
  .setup-guide ol { padding-left: 20px; font-size: 13px; line-height: 2.1; color: var(--ink); }
  .setup-guide code { font-family: 'DM Mono', monospace; background: rgba(0,0,0,0.08); padding: 1px 6px; border-radius: 4px; font-size: 12px; }
  .setup-guide a { color: var(--teal-dark); }

  /* REMINDERS TAB */
  .reminder-permission { display: flex; align-items: center; gap: 14px; background: var(--amber-light); border: 1.5px solid #fde68a; border-radius: 14px; padding: 16px 18px; margin-bottom: 20px; }
  .reminder-permission-icon { font-size: 28px; flex-shrink: 0; }
  .reminder-permission h4 { font-size: 14px; font-weight: 700; margin-bottom: 3px; color: #92400e; }
  .reminder-permission p { font-size: 12px; color: #92400e; opacity: 0.85; margin: 0; line-height: 1.5; }
  .reminder-list { display: flex; flex-direction: column; gap: 14px; }
  .reminder-row { display: flex; align-items: center; gap: 16px; padding: 18px 20px; background: var(--white); border: 1.5px solid var(--border); border-radius: 14px; box-shadow: var(--shadow); flex-wrap: wrap; }
  .reminder-icon { font-size: 28px; flex-shrink: 0; }
  .reminder-info { flex: 1; min-width: 120px; }
  .reminder-label { font-weight: 700; font-size: 15px; margin-bottom: 2px; }
  .reminder-sub { font-size: 12px; color: var(--slate); font-family: 'DM Mono', monospace; }
  .reminder-time { font-family: 'DM Mono', monospace; font-size: 14px; border: 1.5px solid var(--border); border-radius: 8px; padding: 6px 10px; background: var(--cream); color: var(--ink); outline: none; }
  .reminder-time:focus { border-color: var(--teal); }
  .perm-badge { display: inline-flex; align-items: center; gap: 5px; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; font-family: 'DM Mono', monospace; letter-spacing: 0.04em; }
  .perm-granted { background: var(--teal-light); color: var(--teal-dark); }
  .perm-denied  { background: var(--rose-light);  color: var(--rose); }
  .perm-default { background: var(--amber-light); color: #92400e; }

  /* RANGE ALERTS */
  .range-badge { display: inline-flex; align-items: center; gap: 3px; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 700; font-family: 'DM Mono', monospace; letter-spacing: 0.04em; white-space: nowrap; }
  .alert-box { border-radius: 10px; padding: 11px 14px; font-size: 13px; display: flex; align-items: flex-start; gap: 10px; margin-top: 14px; line-height: 1.5; }
  .alert-box strong { display: block; font-size: 13px; margin-bottom: 2px; }
  .alert-box p { margin: 0; font-size: 12px; opacity: 0.85; }

  /* CHARTS TAB */
  .charts-filters { display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-end; margin-bottom: 24px; }
  .charts-filters .form-group { min-width: 160px; flex: 1; }
  .chart-card { background: var(--white); border: 1px solid var(--border); border-radius: 16px; padding: 20px 20px 12px; margin-bottom: 20px; box-shadow: var(--shadow); }
  .chart-card-title { font-family: 'DM Serif Display', serif; font-size: 18px; margin-bottom: 4px; color: var(--ink); }
  .chart-card-meta { font-size: 12px; color: var(--slate); font-family: 'DM Mono', monospace; margin-bottom: 16px; }
  .chart-legend { display: flex; gap: 16px; margin-top: 8px; justify-content: center; flex-wrap: wrap; }
  .chart-legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; font-family: 'DM Mono', monospace; color: var(--slate); }
  .chart-legend-dot { width: 10px; height: 10px; border-radius: 50%; }
  .chart-empty { text-align: center; padding: 48px 24px; color: var(--slate); }
  .chart-empty-icon { font-size: 40px; margin-bottom: 12px; }
  .range-pill { display: flex; gap: 4px; background: var(--slate-light); border-radius: 10px; padding: 4px; }
  .range-btn { padding: 6px 14px; border: none; background: transparent; border-radius: 7px; font-family: 'DM Mono', monospace; font-size: 12px; color: var(--slate); cursor: pointer; transition: all 0.15s; font-weight: 600; }
  .range-btn.active { background: var(--ink); color: #fff; }

  /* ── MOBILE ───────────────────────────────────────────────────────────────── */
  @media (max-width: 520px) {
    .app { padding: 0 12px 48px; }

    /* Header: stack badge below title on small screens */
    .header { padding: 20px 0 16px; margin-bottom: 20px; flex-direction: column; align-items: flex-start; gap: 10px; }
    .header-title { font-size: clamp(24px, 8vw, 36px); }
    .online-badge { font-size: 11px; padding: 3px 9px; }

    /* Offline banner */
    .offline-banner { font-size: 12px; padding: 8px 12px; border-radius: 8px; }

    /* Tabs: already scrollable, just tighten padding */
    .tabs { margin-bottom: 20px; border-radius: 10px; }
    .tab { font-size: 12px; padding: 9px 10px; }

    /* Cards */
    .card { padding: 16px; border-radius: 12px; }
    .card-title { font-size: 17px; margin-bottom: 14px; }

    /* Form grids: single column on mobile */
    .form-grid { grid-template-columns: 1fr; gap: 12px; }

    /* Person cards: single column */
    .person-grid { grid-template-columns: 1fr; }
    .person-card { padding: 14px; }

    /* Stats row: 2-column grid */
    .stats-row { grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 16px; }
    .stat-value { font-size: 24px; }

    /* Records table: contain inside card, no horizontal bleed */
    .table-wrap { border-radius: 8px; }
    table { font-size: 12px; }
    th { padding: 10px 10px; font-size: 10px; }
    td { padding: 9px 10px; }

    /* Check list */
    .check-item { padding: 10px 12px; }

    /* Buttons */
    .btn { font-size: 13px; padding: 9px 16px; }
    .btn-sm { font-size: 11px; padding: 5px 10px; }

    /* Backup tab */
    .backup-grid { grid-template-columns: 1fr; }
    .backup-action-card { padding: 16px; }
    .backup-center { padding: 28px 16px; }
    .user-row { flex-wrap: wrap; gap: 10px; }
    .auto-backup-row { flex-direction: column; align-items: flex-start; gap: 12px; }
    .setup-guide ol { line-height: 1.9; }
    .last-backup-row { flex-wrap: wrap; }

    /* Prevent any direct children of cards from bleeding */
    .card > * { max-width: 100%; }
    pre { overflow-x: auto; white-space: pre-wrap; word-break: break-all; }
  }

  /* ── PIN LOCK ───────────────────────────────────────────────────────────── */
  .lock-screen { position: fixed; inset: 0; background: var(--ink); color: var(--cream); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0; z-index: 9999; font-family: 'Syne', sans-serif; }
  .lock-brand { font-family: 'DM Serif Display', serif; font-size: 36px; margin-bottom: 4px; }
  .lock-brand span { color: var(--teal); font-style: italic; }
  .lock-sub { font-size: 12px; letter-spacing: .1em; text-transform: uppercase; font-family: 'DM Mono', monospace; opacity: .5; margin-bottom: 40px; }
  .lock-label { font-size: 14px; font-weight: 600; letter-spacing: .04em; margin-bottom: 20px; min-height: 20px; }
  .lock-label.error { color: var(--rose); }
  .pin-dots { display: flex; gap: 18px; margin-bottom: 36px; }
  .pin-dot { width: 16px; height: 16px; border-radius: 50%; border: 2px solid rgba(255,255,255,.35); transition: background .15s, border-color .15s; }
  .pin-dot.filled { background: var(--teal); border-color: var(--teal); }
  .pin-dot.error-dot { background: var(--rose); border-color: var(--rose); }
  .pin-pad { display: grid; grid-template-columns: repeat(3, 72px); gap: 12px; }
  .pin-btn { width: 72px; height: 72px; border-radius: 50%; border: 1.5px solid rgba(255,255,255,.15); background: rgba(255,255,255,.07); color: inherit; font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 600; cursor: pointer; transition: background .15s; display: flex; align-items: center; justify-content: center; }
  .pin-btn:hover { background: rgba(255,255,255,.16); }
  .pin-btn:active { background: rgba(255,255,255,.25); }
  .pin-btn-ghost { background: transparent; border-color: transparent; font-size: 20px; opacity: .6; }
  .pin-btn-ghost:hover { background: rgba(255,255,255,.08); opacity: 1; }
  @keyframes pin-shake {
    0%,100%{ transform:translateX(0) }
    20%    { transform:translateX(-10px) }
    40%    { transform:translateX(10px) }
    60%    { transform:translateX(-7px) }
    80%    { transform:translateX(7px) }
  }
  .pin-shake { animation: pin-shake .45s ease; }

  /* In-app PIN setup pad (light/dark aware) */
  .pin-setup-wrap { display: flex; flex-direction: column; align-items: center; gap: 0; padding: 12px 0 4px; }
  .pin-setup-label { font-size: 13px; font-weight: 700; margin-bottom: 16px; color: var(--ink); text-align: center; }
  .pin-setup-dots { display: flex; gap: 14px; margin-bottom: 24px; }
  .pin-setup-dot { width: 14px; height: 14px; border-radius: 50%; border: 2px solid var(--border); transition: background .15s, border-color .15s; }
  .pin-setup-dot.filled { background: var(--teal); border-color: var(--teal); }
  .pin-setup-pad { display: grid; grid-template-columns: repeat(3, 60px); gap: 10px; }
  .pin-setup-btn { width: 60px; height: 60px; border-radius: 50%; border: 1.5px solid var(--border); background: var(--slate-light); color: var(--ink); font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 600; cursor: pointer; transition: background .15s; }
  .pin-setup-btn:hover { background: var(--border); }
  .pin-setup-btn-ghost { background: transparent; border-color: transparent; opacity: .5; font-size: 18px; }
  .pin-setup-btn-ghost:hover { background: var(--slate-light); opacity: 1; }

  /* ── DARK MODE ───────────────────────────────────────────────────────────── */
  [data-theme="dark"] {
    --cream:       #0d1117;
    --ink:         #e2e8f0;
    --teal:        #2dd4bf;
    --teal-light:  #0d3330;
    --teal-dark:   #5eead4;
    --amber:       #fbbf24;
    --amber-light: #2d1a00;
    --rose:        #fb7185;
    --rose-light:  #3b0a1a;
    --slate:       #94a3b8;
    --slate-light: #161b22;
    --white:       #161b22;
    --border:      #30363d;
    --shadow:      0 4px 24px rgba(0,0,0,0.45);
    --shadow-lg:   0 8px 40px rgba(0,0,0,0.65);
  }
  /* Elements that use --ink as a dark background — override explicitly */
  [data-theme="dark"] .tabs       { background: #1e293b; }
  [data-theme="dark"] .tab        { color: rgba(255,255,255,0.45); }
  [data-theme="dark"] .tab.active { background: #334155; color: var(--ink); }
  [data-theme="dark"] table thead th { background: #1e293b; color: #e2e8f0; }
  [data-theme="dark"] tr:nth-child(even) td { background: rgba(255,255,255,0.025); }
  [data-theme="dark"] .header     { border-bottom-color: var(--border); }
  [data-theme="dark"] .offline-banner { background: #2d1a00; border-color: #92400e; color: #fbbf24; }
  [data-theme="dark"] .setup-guide { background: var(--amber-light); border-color: #92400e; }
  [data-theme="dark"] .setup-guide h4,
  [data-theme="dark"] .setup-guide ol,
  [data-theme="dark"] .setup-guide p { color: #fbbf24; }
  [data-theme="dark"] .btn-google { background: #1e293b; color: var(--ink); border: 1.5px solid var(--border); }
  [data-theme="dark"] .backup-center-icon { color: var(--teal); }
  [data-theme="dark"] input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.8); }
  [data-theme="dark"] .modal { background: #1e293b; }
  [data-theme="dark"] .dark-toggle { border-color: var(--border); color: var(--ink); background: var(--white); }
  [data-theme="dark"] .dark-toggle:hover { background: #334155; }

  /* Dark toggle button (shared) */
  .dark-toggle { border: 1.5px solid var(--border); border-radius: 20px; padding: 5px 13px; cursor: pointer; font-size: 15px; background: transparent; color: var(--ink); transition: background 0.2s; line-height: 1; }
  .dark-toggle:hover { background: var(--slate-light); }

  /* ── PRO / UPGRADE ───────────────────────────────────────────────────────── */
  .pro-badge { display: inline-flex; align-items: center; gap: 5px; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; font-family: 'DM Mono', monospace; letter-spacing: 0.05em; background: linear-gradient(135deg,#f59e0b,#d97706); color: #fff; box-shadow: 0 2px 8px rgba(217,119,6,0.35); }
  .btn-gold { background: linear-gradient(135deg,#f59e0b,#d97706); color: #fff; border: none; box-shadow: 0 3px 12px rgba(217,119,6,0.35); }
  .btn-gold:hover { background: linear-gradient(135deg,#d97706,#b45309); transform: translateY(-1px); box-shadow: 0 4px 18px rgba(217,119,6,0.5); }

  /* Pro gate — shown when a feature is locked */
  .pro-gate { border: 2px dashed #f59e0b; border-radius: 14px; padding: 28px 24px; text-align: center; background: linear-gradient(135deg, rgba(245,158,11,0.06), rgba(217,119,6,0.04)); margin-bottom: 20px; }
  .pro-gate-icon { font-size: 36px; margin-bottom: 10px; }
  .pro-gate h3 { font-family: 'DM Serif Display', serif; font-size: 20px; margin-bottom: 8px; color: var(--ink); }
  .pro-gate p { font-size: 13px; color: var(--slate); margin-bottom: 18px; line-height: 1.6; max-width: 360px; margin-left: auto; margin-right: auto; }

  /* Upgrade modal */
  .pro-features-list { list-style: none; padding: 0; margin: 16px 0; display: flex; flex-direction: column; gap: 8px; }
  .pro-features-list li { display: flex; align-items: center; gap: 10px; font-size: 13.5px; }
  .pro-features-list li span.check { color: var(--teal); font-weight: 700; font-size: 16px; flex-shrink: 0; }

  /* ── POLICIES MODAL ─────────────────────────────────────────────────────── */
  .policy-modal { max-width: 640px; max-height: 82vh; display: flex; flex-direction: column; }
  .policy-modal-body { overflow-y: auto; flex: 1; padding-right: 4px; }
  .policy-modal-body::-webkit-scrollbar { width: 6px; }
  .policy-modal-body::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
  .policy-section { margin-bottom: 22px; }
  .policy-section h3 { font-family: 'DM Serif Display', serif; font-size: 15px; margin-bottom: 7px; color: var(--ink); border-bottom: 1px solid var(--border); padding-bottom: 5px; }
  .policy-section p { font-size: 13px; line-height: 1.75; color: var(--ink); white-space: pre-line; }
  .policy-tabs { display: flex; gap: 6px; margin-bottom: 18px; flex-wrap: wrap; }
  .policy-tab-btn { padding: 6px 14px; border: 1.5px solid var(--border); border-radius: 20px; font-family: 'Syne',sans-serif; font-size: 12px; font-weight: 700; cursor: pointer; background: transparent; color: var(--slate); transition: all 0.15s; }
  .policy-tab-btn.active { background: var(--ink); color: #fff; border-color: var(--ink); }
  [data-theme="dark"] .policy-tab-btn.active { background: var(--teal); border-color: var(--teal); color: #fff; }

  /* ── CONSENT BANNER ──────────────────────────────────────────────────────── */
  .consent-banner { position: fixed; bottom: 0; left: 0; right: 0; background: var(--ink); color: var(--cream); padding: 16px 20px; z-index: 500; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; box-shadow: 0 -4px 24px rgba(0,0,0,0.2); }
  .consent-banner p { font-size: 13px; line-height: 1.5; flex: 1; min-width: 220px; opacity: 0.9; }
  .consent-banner a { color: var(--teal); cursor: pointer; text-decoration: underline; }
  .consent-banner .btn-consent { background: var(--teal); color: #fff; border: none; padding: 9px 20px; border-radius: 8px; font-family: 'Syne',sans-serif; font-weight: 700; font-size: 13px; cursor: pointer; white-space: nowrap; flex-shrink: 0; }
  [data-theme="dark"] .consent-banner { background: #1e293b; }

  /* ── APP FOOTER ──────────────────────────────────────────────────────────── */
  .app-footer { border-top: 1px solid var(--border); margin-top: 40px; padding: 20px 0 32px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
  .app-footer-brand { font-family: 'DM Serif Display', serif; font-size: 15px; color: var(--ink); }
  .app-footer-brand span { color: var(--teal); font-style: italic; }
  .app-footer-links { display: flex; gap: 16px; flex-wrap: wrap; }
  .app-footer-links a { font-size: 12px; color: var(--slate); cursor: pointer; text-decoration: none; font-family: 'DM Mono', monospace; transition: color 0.15s; }
  .app-footer-links a:hover { color: var(--teal); }
  .app-footer-copy { width: 100%; font-size: 11px; color: var(--slate); font-family: 'DM Mono', monospace; opacity: 0.6; }
`;

function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return online;
}

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

// ── RANGE INFO ────────────────────────────────────────────────────────────────
// Returns { status, label, color, bg, advice } or null if type is unrecognised.
function getRangeInfo(name = "", unit = "", valueStr = "") {
  const n = name.toLowerCase();
  const u = unit.toLowerCase().replace(/\s/g, "");

  const isBP    = n.includes("blood pressure") || n === "bp" || n.includes(" bp") || u === "mmhg";
  const isTemp  = n.includes("temp") || u === "°c" || u === "c" || u === "°f" || u === "f";
  const isSugar = n.includes("blood sugar") || n.includes("glucose") || n.includes("sugar") || u === "mg/dl" || u === "mmol/l";
  const isPulse = n.includes("pulse") || n.includes("heart rate") || u === "bpm";
  const isOxy   = n.includes("oxygen") || n.includes("spo2") || n.includes("o2") || u === "%" ;

  if (isBP) {
    const parts = String(valueStr).split("/").map(s => parseInt(s, 10));
    const sys = parts[0], dia = parts[1];
    if (isNaN(sys)) return null;
    if (sys > 180 || (dia && dia > 120))  return { status: "crisis",   label: "Crisis",       color: "#b91c1c", bg: "#fee2e2", advice: "Seek immediate medical attention." };
    if (sys >= 140 || (dia && dia >= 90)) return { status: "high",     label: "High",         color: "#e11d48", bg: "#ffe4e6", advice: "Blood pressure is high. Consult a doctor." };
    if (sys >= 130 || (dia && dia >= 80)) return { status: "elevated", label: "Elevated",     color: "#d97706", bg: "#fef3c7", advice: "Slightly above normal. Monitor regularly." };
    if (sys < 90  || (dia && dia < 60))  return { status: "low",      label: "Low",           color: "#7c3aed", bg: "#ede9fe", advice: "Blood pressure is low. Rest and stay hydrated." };
    return { status: "normal", label: "Normal", color: "#0f766e", bg: "#ccfbf1", advice: null };
  }

  if (isTemp) {
    const raw = parseFloat(valueStr);
    if (isNaN(raw)) return null;
    const v = (u === "°f" || u === "f") ? (raw - 32) * 5 / 9 : raw;
    if (v > 39.0)  return { status: "high",     label: "High Fever", color: "#e11d48", bg: "#ffe4e6", advice: "High fever. Seek medical advice promptly." };
    if (v > 38.0)  return { status: "elevated", label: "Fever",      color: "#d97706", bg: "#fef3c7", advice: "Fever detected. Rest and stay hydrated." };
    if (v > 37.2)  return { status: "elevated", label: "Low Fever",  color: "#d97706", bg: "#fef3c7", advice: "Slight fever. Monitor closely." };
    if (v < 35.0)  return { status: "low",      label: "Hypothermia",color: "#7c3aed", bg: "#ede9fe", advice: "Temperature is dangerously low. Seek medical attention." };
    return { status: "normal", label: "Normal", color: "#0f766e", bg: "#ccfbf1", advice: null };
  }

  if (isSugar) {
    const v = parseFloat(valueStr);
    if (isNaN(v)) return null;
    if (v >= 200)  return { status: "high",     label: "Very High",    color: "#e11d48", bg: "#ffe4e6", advice: "Very high blood sugar. Consult a doctor." };
    if (v >= 126)  return { status: "high",     label: "High",         color: "#e11d48", bg: "#ffe4e6", advice: "Blood sugar is high. Monitor diet and consult a doctor." };
    if (v >= 100)  return { status: "elevated", label: "Pre-Diabetic", color: "#d97706", bg: "#fef3c7", advice: "Borderline high. Consider dietary changes." };
    if (v < 54)    return { status: "low",      label: "Very Low",     color: "#b91c1c", bg: "#fee2e2", advice: "Dangerously low blood sugar. Take sugar immediately." };
    if (v < 70)    return { status: "low",      label: "Low",          color: "#7c3aed", bg: "#ede9fe", advice: "Low blood sugar. Eat or drink something sweet." };
    return { status: "normal", label: "Normal", color: "#0f766e", bg: "#ccfbf1", advice: null };
  }

  if (isPulse) {
    const v = parseFloat(valueStr);
    if (isNaN(v)) return null;
    if (v > 150)   return { status: "high",     label: "Very High", color: "#e11d48", bg: "#ffe4e6", advice: "Very high heart rate. Seek medical attention." };
    if (v > 100)   return { status: "elevated", label: "Elevated",  color: "#d97706", bg: "#fef3c7", advice: "Heart rate above normal range. Rest and monitor." };
    if (v < 40)    return { status: "low",      label: "Very Low",  color: "#b91c1c", bg: "#fee2e2", advice: "Very low heart rate. Seek medical attention." };
    if (v < 60)    return { status: "low",      label: "Low",       color: "#7c3aed", bg: "#ede9fe", advice: "Heart rate slightly low (bradycardia). Monitor." };
    return { status: "normal", label: "Normal", color: "#0f766e", bg: "#ccfbf1", advice: null };
  }

  if (isOxy) {
    const v = parseFloat(valueStr);
    if (isNaN(v)) return null;
    if (v < 90)   return { status: "high",     label: "Critically Low", color: "#b91c1c", bg: "#fee2e2", advice: "O₂ saturation critically low. Seek immediate help." };
    if (v < 94)   return { status: "elevated", label: "Low",            color: "#d97706", bg: "#fef3c7", advice: "O₂ saturation below normal. Monitor closely." };
    return { status: "normal", label: "Normal", color: "#0f766e", bg: "#ccfbf1", advice: null };
  }

  return null;
}

function RangeBadge({ info }) {
  if (!info) return null;
  return (
    <span className="range-badge" style={{ color: info.color, background: info.bg }}>
      {info.status !== "normal" && "⚠ "}{info.label}
    </span>
  );
}

function useStorage() {
  const [data, setData] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { persons: [], checkTypes: DEFAULT_CHECK_TYPES, records: [] };
  });

  const save = (next) => {
    setData(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };
  return [data, save];
}

// ── PIN UTILITIES ─────────────────────────────────────────────────────────────
const PIN_KEY = "mh_pin_hash";

async function hashPin(pin) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("mh-salt:" + pin));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}
const hasPinSet  = ()          => !!localStorage.getItem(PIN_KEY);
const savePin    = async (pin) => localStorage.setItem(PIN_KEY, await hashPin(pin));
const clearPin   = ()          => localStorage.removeItem(PIN_KEY);
const checkPin   = async (pin) => (await hashPin(pin)) === localStorage.getItem(PIN_KEY);

// Reusable numeric pad (used in both LockScreen and PinSetup)
function PinPad({ digits, onDigit, onDelete, onCancel, btnClass = "pin-btn", dotClass = "pin-dot", wrapClass = "pin-pad", dotsClass = "pin-dots", errorDot = false, shake = false }) {
  return (
    <>
      <div className={dotsClass + (shake ? " pin-shake" : "")}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`${dotClass}${digits.length > i ? " filled" : ""}${errorDot ? " error-dot" : ""}`} />
        ))}
      </div>
      <div className={wrapClass}>
        {[1,2,3,4,5,6,7,8,9].map(d => (
          <button key={d} className={btnClass} onClick={() => onDigit(String(d))}>{d}</button>
        ))}
        <button className={`${btnClass} ${btnClass}-ghost`} onClick={onDelete}>⌫</button>
        <button className={btnClass} onClick={() => onDigit("0")}>0</button>
        {onCancel
          ? <button className={`${btnClass} ${btnClass}-ghost`} onClick={onCancel}>✕</button>
          : <div />}
      </div>
    </>
  );
}

// ── LOCK SCREEN ───────────────────────────────────────────────────────────────
function LockScreen({ onUnlock }) {
  const [digits, setDigits] = useState([]);
  const [shake, setShake]   = useState(false);
  const [errDot, setErrDot] = useState(false);

  const enter = async (d) => {
    if (digits.length >= 4) return;
    const next = [...digits, d];
    setDigits(next);
    if (next.length === 4) {
      const ok = await checkPin(next.join(""));
      if (ok) { onUnlock(); }
      else {
        setShake(true); setErrDot(true);
        setTimeout(() => { setDigits([]); setShake(false); setErrDot(false); }, 600);
      }
    }
  };

  return (
    <div className="lock-screen">
      <div className="lock-brand">Metric<span>Health</span></div>
      <div className="lock-sub">Enter PIN to continue</div>
      <div className={`lock-label${errDot ? " error" : ""}`}>
        {errDot ? "Incorrect PIN — try again" : ""}
      </div>
      <PinPad
        digits={digits} onDigit={enter} onDelete={() => setDigits(d => d.slice(0, -1))}
        shake={shake} errorDot={errDot}
      />
    </div>
  );
}

// ── PIN SETUP CARD ────────────────────────────────────────────────────────────
function PinCard({ toast }) {
  const [step, setStep]       = useState("idle"); // idle | set1 | set2 | removing
  const [first, setFirst]     = useState("");      // PIN from step 1
  const [digits, setDigits]   = useState([]);
  const [mismatch, setMismatch] = useState(false);
  const pinActive = hasPinSet();

  const reset = () => { setStep("idle"); setDigits([]); setFirst(""); setMismatch(false); };

  const enter = async (d) => {
    if (digits.length >= 4) return;
    const next = [...digits, d];
    setDigits(next);
    if (next.length < 4) return;

    const pin = next.join("");
    if (step === "set1") {
      setFirst(pin); setDigits([]); setStep("set2");
    } else if (step === "set2") {
      if (pin !== first) {
        setMismatch(true);
        setTimeout(() => { setDigits([]); setMismatch(false); }, 600);
      } else {
        await savePin(pin);
        toast("PIN set successfully");
        reset();
      }
    }
  };

  const handleRemove = () => { clearPin(); toast("PIN removed"); reset(); };

  if (step !== "idle") {
    const label = step === "set1"
      ? (pinActive ? "Enter new PIN" : "Choose a 4-digit PIN")
      : (mismatch ? "PINs didn't match — try again" : "Confirm your PIN");
    return (
      <div className="card">
        <div className="card-title"><span className="dot" />
          {step === "set1" ? "Set PIN" : "Confirm PIN"}
        </div>
        <div className="pin-setup-wrap">
          <div className={`pin-setup-label${mismatch ? " error" : ""}`} style={mismatch ? { color: "var(--rose)" } : {}}>
            {label}
          </div>
          <PinPad
            digits={digits} onDigit={enter}
            onDelete={() => setDigits(d => d.slice(0, -1))}
            onCancel={reset}
            btnClass="pin-setup-btn" dotClass="pin-setup-dot"
            wrapClass="pin-setup-pad" dotsClass="pin-setup-dots"
            shake={mismatch} errorDot={mismatch}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-title"><span className="dot" />App PIN Lock</div>
      <p style={{ fontSize: 13, color: "var(--slate)", marginBottom: 18, lineHeight: 1.6 }}>
        {pinActive
          ? "A PIN is set. The app will ask for it every time you open it. Your PIN is stored as a secure hash — never in plain text."
          : "Protect your health data with a 4-digit PIN. You'll enter it each time you open the app."
        }
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="btn btn-primary" onClick={() => { setDigits([]); setStep("set1"); }}>
          {pinActive ? "🔄 Change PIN" : "🔒 Set PIN"}
        </button>
        {pinActive && (
          <button className="btn btn-danger btn-sm" onClick={handleRemove}>
            Remove PIN
          </button>
        )}
      </div>
      {pinActive && (
        <div className="msg-bar success" style={{ marginTop: 14 }}>
          ✓ PIN is active — app is protected
        </div>
      )}
    </div>
  );
}

// ── POLICIES MODAL ────────────────────────────────────────────────────────────
const ALL_POLICIES = [
  { key: "medical",  label: "⚕ Medical Disclaimer", doc: MEDICAL_DISCLAIMER },
  { key: "privacy",  label: "🔒 Privacy Policy",     doc: PRIVACY_POLICY },
  { key: "terms",    label: "📋 Terms of Service",   doc: TERMS_OF_SERVICE },
];

function PoliciesModal({ initialTab = "medical", onClose }) {
  const [active, setActive] = useState(initialTab);
  const doc = ALL_POLICIES.find(p => p.key === active)?.doc;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal policy-modal">
        <div className="modal-title" style={{ marginBottom: 4 }}>
          <span className="dot" />Legal &amp; Policies
        </div>

        {/* Tab switcher */}
        <div className="policy-tabs">
          {ALL_POLICIES.map(p => (
            <button
              key={p.key}
              className={`policy-tab-btn${active === p.key ? " active" : ""}`}
              onClick={() => setActive(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div className="policy-modal-body">
          {doc && doc.sections.map((s, i) => (
            <div key={i} className="policy-section">
              <h3>{s.heading}</h3>
              <p>{s.body}</p>
            </div>
          ))}
          <div style={{ fontSize: 11, color: "var(--slate)", fontFamily: "'DM Mono',monospace", marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
            Last updated: June 2026 · Questions? {CONTACT_EMAIL}
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function Toast({ msg, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, []);
  return <div className="toast">✓ {msg}</div>;
}

// ── PERSONS TAB ───────────────────────────────────────────────────────────────
function PersonsTab({ data, save, toast, isPro, onUpgrade }) {
  const [name, setName]   = useState("");
  const [age, setAge]     = useState("");
  const [notes, setNotes] = useState("");

  // Edit modal state
  const [editing, setEditing] = useState(null);
  const [ef, setEf]           = useState({});

  const add = () => {
    if (!name.trim()) return;
    save({ ...data, persons: [...data.persons, { id: generateId(), name: name.trim(), age, notes }] });
    setName(""); setAge(""); setNotes("");
    toast("Person added");
  };

  const remove = (id) => {
    if (!confirm("Delete this person and ALL their records?")) return;
    save({ ...data, persons: data.persons.filter(p => p.id !== id), records: data.records.filter(r => r.personId !== id) });
    toast("Person removed");
  };

  const openEdit = (p) => {
    setEditing(p);
    setEf({ name: p.name, age: p.age || "", notes: p.notes || "" });
  };

  const saveEdit = () => {
    if (!ef.name.trim()) return;
    save({ ...data, persons: data.persons.map(p => p.id === editing.id ? { ...p, ...ef, name: ef.name.trim() } : p) });
    setEditing(null);
    toast("Person updated");
  };

  return (
    <div>
      {/* Edit modal */}
      {editing && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditing(null)}>
          <div className="modal">
            <div className="modal-title"><span className="dot" />Edit Person</div>
            <div className="form-grid">
              <div className="form-group">
                <label>Full Name *</label>
                <input value={ef.name} onChange={e => setEf(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Amaka Johnson" />
              </div>
              <div className="form-group">
                <label>Age</label>
                <input type="number" value={ef.age} onChange={e => setEf(f => ({ ...f, age: e.target.value }))} placeholder="e.g. 34" />
              </div>
              <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <label>Notes</label>
                <input value={ef.notes} onChange={e => setEf(f => ({ ...f, notes: e.target.value }))} placeholder="Optional note" />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveEdit}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Pro gate: only 1 person on free plan */}
      {data.persons.length >= 1 && !isPro ? (
        <ProGate
          emoji="👨‍👩‍👧‍👦"
          title="You're tracking family too — that's what Pro is for"
          description="The free plan covers you. Pro covers your whole family — mum, dad, spouse, children. One payment of ₦5,000. Your family's health records, forever."
          onUpgrade={onUpgrade}
        />
      ) : (
        <div className="card">
          <div className="card-title"><span className="dot" />Add New Person</div>
          <div className="form-grid">
            <div className="form-group">
              <label>Full Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Amaka Johnson" />
            </div>
            <div className="form-group">
              <label>Age</label>
              <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="e.g. 34" />
            </div>
            <div className="form-group">
              <label>Notes</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional note" />
            </div>
          </div>
          <button className="btn btn-primary btn-full mt-4" onClick={add}>+ Add Person</button>
        </div>
      )}

      <div className="card">
        <div className="card-title"><span className="dot" />All Persons ({data.persons.length})</div>
        {data.persons.length === 0 ? (
          <div className="empty"><div className="empty-icon">👤</div><p>No persons added yet.<br />Add someone above to get started.</p></div>
        ) : (
          <div className="person-grid">
            {data.persons.map(p => (
              <div key={p.id} className="person-card">
                <div className="person-name">{p.name}</div>
                <div className="person-meta">{p.age ? `Age: ${p.age}` : "Age not set"}{p.notes ? ` · ${p.notes}` : ""}</div>
                <div className="person-meta" style={{ marginTop: 4 }}>
                  {data.records.filter(r => r.personId === p.id).length} records
                </div>
                <div className="person-actions">
                  <button className="btn btn-amber btn-sm" onClick={() => openEdit(p)}>✎ Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => remove(p.id)}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── CHECK TYPES TAB ───────────────────────────────────────────────────────────
function CheckTypesTab({ data, save, toast }) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");

  const add = () => {
    if (!name.trim()) return;
    save({ ...data, checkTypes: [...data.checkTypes, { id: generateId(), name: name.trim(), unit: unit.trim() }] });
    setName(""); setUnit("");
    toast("Check type added");
  };

  const remove = (id) => {
    save({ ...data, checkTypes: data.checkTypes.filter(c => c.id !== id) });
    toast("Check type removed");
  };

  return (
    <div>
      <div className="card">
        <div className="card-title"><span className="dot" />Add Check Type</div>
        <div className="form-grid">
          <div className="form-group">
            <label>Check Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Pulse Rate" />
          </div>
          <div className="form-group">
            <label>Unit</label>
            <input value={unit} onChange={e => setUnit(e.target.value)} placeholder="e.g. bpm" />
          </div>
        </div>
        <button className="btn btn-primary btn-full mt-4" onClick={add}>+ Add Check Type</button>
      </div>

      <div className="card">
        <div className="card-title"><span className="dot" />All Check Types ({data.checkTypes.length})</div>
        <div className="check-list">
          {data.checkTypes.map(c => (
            <div key={c.id} className="check-item">
              <div>
                <div className="check-item-name">{c.name}</div>
                {c.unit && <div className="check-item-unit">Unit: {c.unit}</div>}
              </div>
              <button className="btn btn-danger btn-sm" onClick={() => remove(c.id)}>Remove</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── LOG CHECK TAB ─────────────────────────────────────────────────────────────
function LogCheckTab({ data, save, toast }) {
  const [personId, setPersonId] = useState("");
  const [checkTypeId, setCheckTypeId] = useState("");
  const [value, setValue] = useState("");
  const [session, setSession] = useState("Morning");
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");

  const selectedCheck = data.checkTypes.find(c => c.id === checkTypeId);
  const liveRange = selectedCheck && value.trim() ? getRangeInfo(selectedCheck.name, selectedCheck.unit, value) : null;

  // Duplicate detection — runs as the user fills the form (no button click needed)
  const duplicate = personId && checkTypeId && date && session
    ? data.records.find(r =>
        r.personId === personId &&
        r.checkTypeId === checkTypeId &&
        r.date === date &&
        r.session === session
      )
    : null;

  const log = () => {
    if (!personId || !checkTypeId || !value.trim() || !date) return alert("Please fill all required fields.");
    const record = { id: generateId(), personId, checkTypeId, value: value.trim(), session, date, notes: notes.trim(), createdAt: new Date().toISOString() };
    save({ ...data, records: [...data.records, record] });
    setValue(""); setNotes("");
    toast("Check recorded successfully");
  };

  return (
    <div className="card">
      <div className="card-title"><span className="dot" />Log a Health Check</div>
      <div className="form-grid">
        <div className="form-group">
          <label>Person *</label>
          <select value={personId} onChange={e => setPersonId(e.target.value)}>
            <option value="">— Select person —</option>
            {data.persons.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Check Type *</label>
          <select value={checkTypeId} onChange={e => setCheckTypeId(e.target.value)}>
            <option value="">— Select check —</option>
            {data.checkTypes.map(c => <option key={c.id} value={c.id}>{c.name}{c.unit ? ` (${c.unit})` : ""}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Value * {selectedCheck?.unit ? `(${selectedCheck.unit})` : ""}</label>
          <input value={value} onChange={e => setValue(e.target.value)} placeholder="Enter reading" />
        </div>
        <div className="form-group">
          <label>Session *</label>
          <select value={session} onChange={e => setSession(e.target.value)}>
            <option>Morning</option>
            <option>Evening</option>
          </select>
        </div>
        <div className="form-group">
          <label>Date *</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Notes</label>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" />
        </div>
      </div>
      {/* Duplicate warning */}
      {duplicate && (
        <div className="alert-box" style={{ background: "#fef3c7", border: "1px solid #fde68a", marginTop: 14 }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div>
            <strong style={{ color: "#92400e" }}>Already logged — {selectedCheck?.name} ({session})</strong>
            <p style={{ color: "#92400e" }}>
              A {session.toLowerCase()} reading of <strong>{duplicate.value}{selectedCheck?.unit ? ` ${selectedCheck.unit}` : ""}</strong> was already recorded on {duplicate.date}.
              You can still save a new entry if the reading changed.
            </p>
          </div>
        </div>
      )}

      {/* Live range alert */}
      {liveRange && liveRange.status !== "normal" && (
        <div className="alert-box" style={{ background: liveRange.bg, border: `1px solid ${liveRange.color}22` }}>
          <span style={{ fontSize: 20 }}>
            {liveRange.status === "high" || liveRange.status === "crisis" ? "🔴" : liveRange.status === "low" ? "🟣" : "🟡"}
          </span>
          <div>
            <strong style={{ color: liveRange.color }}>{liveRange.label} — {selectedCheck?.name}</strong>
            <p style={{ color: liveRange.color }}>{liveRange.advice}</p>
          </div>
        </div>
      )}

      <button className="btn btn-primary btn-full mt-4" onClick={log}>✓ Record Check</button>
    </div>
  );
}

// ── RECORDS TAB ───────────────────────────────────────────────────────────────
function RecordsTab({ data, save, toast, isPro, onUpgrade }) {
  const [filterPerson, setFilterPerson] = useState("");
  const [filterCheck, setFilterCheck] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  // Edit modal state
  const [editing, setEditing] = useState(null); // record being edited
  const [ef, setEf] = useState({});             // edit form fields

  // Import state
  const [importPreview, setImportPreview] = useState(null); // { personName, records, fileName }
  const fileInputRef = useRef(null);

  // Share state
  const [shareState, setShareState] = useState(null); // { personId, text } | null

  const buildShareText = (personId) => {
    const person = data.persons.find(p => p.id === personId);
    if (!person) return "";
    const recs = data.records
      .filter(r => r.personId === personId)
      .sort((a, b) => b.date.localeCompare(a.date));
    const generated = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

    let t = `📊 *MetricHealth Report — ${person.name}*\n`;
    if (person.age) t += `Age: ${person.age}\n`;
    t += `Generated: ${generated}\n`;
    t += `Total records: ${recs.length}\n\n`;

    for (const ct of data.checkTypes) {
      const ctRecs = recs.filter(r => r.checkTypeId === ct.id);
      if (ctRecs.length === 0) continue;
      t += `🩺 *${ct.name}${ct.unit ? ` (${ct.unit})` : ""}*\n`;
      ctRecs.slice(0, 6).forEach(r => {
        const info = getRangeInfo(ct.name, ct.unit, r.value);
        const flag = info && info.status !== "normal" ? ` ⚠ ${info.label}` : " ✓ Normal";
        t += `• ${r.date} ${r.session}: ${r.value}${ct.unit ? " " + ct.unit : ""}${flag}\n`;
      });
      if (ctRecs.length > 6) t += `  … and ${ctRecs.length - 6} more\n`;
      t += "\n";
    }
    t += `📱 Track your health at metrichealth.vercel.app`;
    return t;
  };

  const openShare = (personId) => setShareState({ personId, text: buildShareText(personId) });

  const getName  = (id) => data.persons.find(p => p.id === id)?.name || "Unknown";
  const getCheck = (id) => data.checkTypes.find(c => c.id === id);

  const filtered = data.records.filter(r => {
    if (filterPerson && r.personId !== filterPerson) return false;
    if (filterCheck && r.checkTypeId !== filterCheck) return false;
    if (filterFrom && r.date < filterFrom) return false;
    if (filterTo && r.date > filterTo) return false;
    return true;
  }).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

  function openEdit(r) {
    setEditing(r);
    setEf({ personId: r.personId, checkTypeId: r.checkTypeId, value: r.value, session: r.session, date: r.date, notes: r.notes || "" });
  }

  function saveEdit() {
    if (!ef.value.trim() || !ef.date) return;
    save({ ...data, records: data.records.map(r => r.id === editing.id ? { ...r, ...ef, updatedAt: new Date().toISOString() } : r) });
    setEditing(null);
    toast("Record updated");
  }

  const deleteRecord = (id) => {
    save({ ...data, records: data.records.filter(r => r.id !== id) });
    toast("Record deleted");
  };

  // ── Import from Excel ──────────────────────────────────────────────────────
  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: "array" });
        // Support both MetricHealth exports and plain spreadsheets
        const sheetName = wb.SheetNames.includes("All Records") ? "All Records" : wb.SheetNames[0];
        const sheet = wb.Sheets[sheetName];
        if (!sheet) throw new Error("No sheet found in the file.");

        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

        // Detect MetricHealth export: Row 0 = "MetricHealth Report"
        const isMetricExport = String(rows[0]?.[0] || "").startsWith("MetricHealth");
        let personName = null;
        if (isMetricExport) {
          const pRow = String(rows[1]?.[0] || "");
          if (pRow.startsWith("Person: ")) personName = pRow.slice(8).trim();
        }

        // Find the header row (contains "Date" in the first cell)
        const headerIdx = rows.findIndex(r => String(r[0]).trim().toLowerCase() === "date");
        if (headerIdx === -1) throw new Error('No header row found. The first column must be labelled "Date".');

        const headers = rows[headerIdx].map(h => String(h).trim().toLowerCase());
        const col = (name) => headers.indexOf(name);

        const iDate   = col("date");
        const iCheck  = col("check type");
        const iValue  = col("value");
        const iUnit   = col("unit");
        const iSess   = col("session");
        const iNotes  = col("notes");
        const iPerson = col("person"); // optional column for multi-person sheets

        if (iDate === -1 || iCheck === -1 || iValue === -1)
          throw new Error('Required columns missing. Expected: Date, Check Type, Value.');

        const records = [];
        for (let i = headerIdx + 1; i < rows.length; i++) {
          const row = rows[i];
          const date      = String(row[iDate]  || "").trim();
          const checkName = String(row[iCheck] || "").trim();
          const value     = String(row[iValue] || "").trim();
          if (!date || !checkName || !value) continue;
          records.push({
            date,
            checkTypeName: checkName,
            unit:    iUnit  !== -1 ? String(row[iUnit]  || "").trim() : "",
            value,
            session: iSess  !== -1 ? String(row[iSess]  || "Morning").trim() : "Morning",
            notes:   iNotes !== -1 ? String(row[iNotes] || "").trim() : "",
            person:  iPerson !== -1 ? String(row[iPerson] || "").trim() : null,
          });
        }

        if (records.length === 0) throw new Error("No data rows found in the file.");
        setImportPreview({ personName, records, fileName: file.name });
      } catch (err) {
        alert("Import failed: " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const confirmImport = () => {
    if (!importPreview) return;
    const { personName, records } = importPreview;

    let nd = { ...data, persons: [...data.persons], checkTypes: [...data.checkTypes], records: [...data.records] };

    const findOrCreatePerson = (name) => {
      if (!name) return null;
      let p = nd.persons.find(x => x.name.toLowerCase() === name.toLowerCase());
      if (!p) { p = { id: generateId(), name, age: "", notes: "" }; nd.persons = [...nd.persons, p]; }
      return p;
    };

    const findOrCreateCheckType = (name, unit) => {
      let ct = nd.checkTypes.find(x => x.name.toLowerCase() === name.toLowerCase());
      if (!ct) { ct = { id: generateId(), name, unit }; nd.checkTypes = [...nd.checkTypes, ct]; }
      return ct;
    };

    let imported = 0, skipped = 0;
    const newRecs = [...nd.records];

    for (const r of records) {
      const resolvedName = r.person || personName;
      const person = findOrCreatePerson(resolvedName);
      if (!person) { skipped++; continue; }
      const ct = findOrCreateCheckType(r.checkTypeName, r.unit);

      const isDupe = newRecs.some(x =>
        x.personId === person.id &&
        x.checkTypeId === ct.id &&
        x.date === r.date &&
        x.session === r.session &&
        x.value === r.value
      );
      if (isDupe) { skipped++; continue; }

      newRecs.push({ id: generateId(), personId: person.id, checkTypeId: ct.id, value: r.value, session: r.session, date: r.date, notes: r.notes, createdAt: new Date().toISOString() });
      imported++;
    }

    save({ ...nd, records: newRecs });
    toast(`Imported ${imported} record${imported !== 1 ? "s" : ""}${skipped ? ` · ${skipped} duplicate${skipped !== 1 ? "s" : ""} skipped` : ""}`);
    setImportPreview(null);
  };

  const downloadReport = (personId) => {
    const person = data.persons.find(p => p.id === personId);
    if (!person) return;
    const personRecords = data.records.filter(r => r.personId === personId).sort((a, b) => a.date.localeCompare(b.date));
    const wb = XLSX.utils.book_new();
    const summaryRows = [["MetricHealth Report"], [`Person: ${person.name}`], [`Age: ${person.age || "N/A"}`], [`Notes: ${person.notes || "N/A"}`], [`Generated: ${new Date().toLocaleString()}`], [], ["Date", "Check Type", "Value", "Unit", "Session", "Notes"]];
    personRecords.forEach(r => {
      const ct = getCheck(r.checkTypeId);
      summaryRows.push([r.date, ct?.name || "Unknown", r.value, ct?.unit || "", r.session, r.notes]);
    });
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
    summarySheet["!cols"] = [{ wch: 14 }, { wch: 22 }, { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 24 }];
    XLSX.utils.book_append_sheet(wb, summarySheet, "All Records");
    data.checkTypes.forEach(ct => {
      const ctRecords = personRecords.filter(r => r.checkTypeId === ct.id);
      if (ctRecords.length === 0) return;
      const rows = [["Date", "Session", `Value (${ct.unit || "—"})`, "Notes"]];
      ctRecords.forEach(r => rows.push([r.date, r.session, r.value, r.notes]));
      const sheet = XLSX.utils.aoa_to_sheet(rows);
      sheet["!cols"] = [{ wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 24 }];
      XLSX.utils.book_append_sheet(wb, sheet, ct.name.slice(0, 31));
    });
    XLSX.writeFile(wb, `${person.name.replace(/\s+/g, "_")}_MetricHealth.xlsx`);
    toast(`Report downloaded for ${person.name}`);
  };

  const printReport = (personId) => {
    const person = data.persons.find(p => p.id === personId);
    if (!person) return;

    const allRecs = data.records
      .filter(r => r.personId === personId)
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

    if (allRecs.length === 0) { toast("No records to print for this person"); return; }

    const generated = new Date().toLocaleString("en-GB", {
      day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
    });
    const oldest = allRecs[allRecs.length - 1].date;
    const newest = allRecs[0].date;

    // Group records by check type, pre-compute range info (getRangeInfo is in main scope)
    const sections = data.checkTypes
      .map(ct => ({ ct, recs: allRecs.filter(r => r.checkTypeId === ct.id) }))
      .filter(({ recs }) => recs.length > 0);

    const badgeStyle = (status) => {
      const map = {
        normal:   "background:#ccfbf1;color:#0f766e",
        elevated: "background:#fef3c7;color:#92400e",
        high:     "background:#ffe4e6;color:#e11d48",
        crisis:   "background:#fee2e2;color:#b91c1c",
        low:      "background:#ede9fe;color:#7c3aed",
      };
      return map[status] || "";
    };

    const tableRows = sections.map(({ ct, recs }) => `
      <div class="section">
        <h3>${ct.name}${ct.unit ? ` <span class="unit">${ct.unit}</span>` : ""}</h3>
        <table>
          <thead><tr><th>Date</th><th>Session</th><th>Value</th><th>Status</th><th>Notes</th></tr></thead>
          <tbody>
            ${recs.map(r => {
              const info = getRangeInfo(ct.name, ct.unit, r.value);
              return `<tr>
                <td class="mono">${r.date}</td>
                <td><span class="pill ${r.session === "Morning" ? "pill-am" : "pill-pm"}">${r.session}</span></td>
                <td class="mono bold">${r.value}${ct.unit ? " " + ct.unit : ""}</td>
                <td>${info ? `<span class="pill" style="${badgeStyle(info.status)}">${info.label}</span>` : "<span style='color:#94a3b8'>—</span>"}</td>
                <td class="note">${r.notes || "—"}</td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>`).join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>MetricHealth — ${person.name}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&family=Syne:wght@400;600;700&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Syne',Arial,sans-serif;color:#1a1a2e;background:#fff;padding:36px 48px;font-size:13px;line-height:1.5}
    /* Header */
    .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2.5px solid #1a1a2e;padding-bottom:14px;margin-bottom:22px}
    .brand{font-family:'DM Serif Display',serif;font-size:30px;line-height:1}
    .brand span{color:#0d9488;font-style:italic}
    .brand-sub{font-size:10px;color:#64748b;font-family:'DM Mono',monospace;letter-spacing:.07em;text-transform:uppercase;margin-top:4px}
    .meta{text-align:right;font-family:'DM Mono',monospace;font-size:10.5px;color:#64748b;line-height:1.7}
    /* Patient box */
    .patient{background:#f5f0e8;border-radius:10px;padding:16px 20px;margin-bottom:24px;display:grid;grid-template-columns:1fr 1fr;gap:8px 32px}
    .prow{display:flex;gap:8px;align-items:baseline}
    .plabel{font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;font-family:'DM Mono',monospace;flex-shrink:0;min-width:56px}
    .pval{font-weight:700;font-size:14px}
    .full{grid-column:1/-1}
    /* Sections */
    .section{margin-bottom:24px;page-break-inside:avoid}
    .section h3{font-family:'DM Serif Display',serif;font-size:15px;border-bottom:1.5px solid #e2e8f0;padding-bottom:6px;margin-bottom:8px}
    .unit{font-family:'DM Mono',monospace;font-size:11px;color:#64748b;font-weight:400;font-style:normal}
    /* Table */
    table{width:100%;border-collapse:collapse;font-size:12px}
    th{text-align:left;padding:6px 10px;background:#1a1a2e;color:#fff;font-size:10px;text-transform:uppercase;letter-spacing:.05em;font-family:'DM Mono',monospace}
    td{padding:7px 10px;border-bottom:1px solid #f1f5f9;vertical-align:middle}
    tr:last-child td{border-bottom:none}
    tr:nth-child(even) td{background:#f8fafc}
    .mono{font-family:'DM Mono',monospace}
    .bold{font-weight:700}
    .note{color:#64748b;font-size:11px}
    /* Pills */
    .pill{display:inline-block;padding:2px 9px;border-radius:20px;font-size:10px;font-weight:700;font-family:'DM Mono',monospace;letter-spacing:.03em}
    .pill-am{background:#fef3c7;color:#92400e}
    .pill-pm{background:#e0e7ff;color:#3730a3}
    /* Footer */
    .footer{margin-top:32px;border-top:1px solid #e2e8f0;padding-top:12px;display:flex;justify-content:space-between;font-family:'DM Mono',monospace;font-size:9.5px;color:#94a3b8}
    @media print{
      body{padding:0}
      @page{margin:1.8cm;size:A4}
      .section{page-break-inside:avoid}
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Metric<span>Health</span></div>
      <div class="brand-sub">Patient Health Report</div>
    </div>
    <div class="meta">
      <div>Generated: ${generated}</div>
      <div>Period: ${oldest} → ${newest}</div>
      <div>${allRecs.length} total record${allRecs.length !== 1 ? "s" : ""}</div>
    </div>
  </div>

  <div class="patient">
    <div class="prow"><span class="plabel">Patient</span><span class="pval">${person.name}</span></div>
    <div class="prow"><span class="plabel">Age</span><span class="pval">${person.age || "—"}</span></div>
    ${person.notes ? `<div class="prow full"><span class="plabel">Notes</span><span class="pval" style="font-weight:400">${person.notes}</span></div>` : ""}
  </div>

  ${tableRows}

  <div class="footer">
    <span>MetricHealth · metrichealth.vercel.app</span>
    <span>For informational purposes only. Consult a qualified medical professional for diagnosis and treatment.</span>
  </div>

  <script>setTimeout(()=>window.print(),400);<\/script>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (!win) { toast("Allow pop-ups for this site to print reports"); return; }
    win.document.write(html);
    win.document.close();
  };

  const selectedEditCheck = data.checkTypes.find(c => c.id === ef.checkTypeId);

  return (
    <div>
      {/* Share modal */}
      {shareState && (() => {
        const person = data.persons.find(p => p.id === shareState.personId);
        const encodedText = encodeURIComponent(shareState.text);
        const canNativeShare = typeof navigator.share === "function";
        return (
          <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShareState(null)}>
            <div className="modal" style={{ maxWidth: 480 }}>
              <div className="modal-title"><span className="dot" />Share Report — {person?.name}</div>

              {/* Text preview */}
              <pre style={{
                fontFamily: "'DM Mono', monospace", fontSize: 11.5, lineHeight: 1.7,
                background: "var(--slate-light)", border: "1px solid var(--border)",
                borderRadius: 10, padding: "12px 14px", overflowY: "auto",
                maxHeight: 240, whiteSpace: "pre-wrap", wordBreak: "break-word",
                color: "var(--ink)", marginBottom: 16,
              }}>{shareState.text}</pre>

              {/* Share buttons */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                <a
                  href={`https://api.whatsapp.com/send?text=${encodedText}`}
                  target="_blank" rel="noreferrer"
                  className="btn btn-primary"
                  style={{ textAlign: "center", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}
                >
                  <svg width="18" height="18" viewBox="0 0 32 32" fill="currentColor"><path d="M16 0C7.163 0 0 7.163 0 16c0 2.84.742 5.5 2.04 7.808L0 32l8.394-2.01A15.938 15.938 0 0016 32c8.837 0 16-7.163 16-16S24.837 0 16 0zm8.26 22.357c-.347.974-2.02 1.86-2.777 1.98-.712.116-1.61.165-2.597-.163-.599-.2-1.368-.467-2.352-.912-4.14-1.88-6.845-6.09-7.051-6.373-.207-.283-1.687-2.245-1.687-4.28s1.068-3.04 1.447-3.453c.38-.413.827-.516 1.104-.516.276 0 .553.003.795.015.256.012.598-.097.937.714.347.83 1.178 2.865 1.28 3.073.103.208.172.45.035.726-.138.277-.207.45-.413.692-.207.241-.435.539-.62.724-.208.207-.424.43-.182.844.241.415 1.074 1.77 2.306 2.866 1.585 1.41 2.921 1.847 3.334 2.054.414.207.655.172.896-.103.241-.276 1.033-1.205 1.309-1.619.276-.414.552-.345.931-.207.38.138 2.408 1.136 2.822 1.343.414.207.69.31.793.483.103.172.103 1.001-.243 1.974z"/></svg>
                  WhatsApp
                </a>
                <a
                  href={`mailto:?subject=MetricHealth Report — ${encodeURIComponent(person?.name || "")}&body=${encodedText}`}
                  className="btn btn-secondary"
                  style={{ textAlign: "center", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}
                >
                  ✉ Email
                </a>
                {canNativeShare && (
                  <button
                    className="btn btn-secondary"
                    style={{ gridColumn: "1 / -1" }}
                    onClick={() => navigator.share({ title: `MetricHealth — ${person?.name}`, text: shareState.text }).catch(() => {})}
                  >
                    🌐 Share via…
                  </button>
                )}
                <button
                  className="btn btn-secondary"
                  style={{ gridColumn: canNativeShare ? undefined : "1 / -1" }}
                  onClick={() => {
                    navigator.clipboard.writeText(shareState.text)
                      .then(() => toast("Report copied to clipboard"))
                      .catch(() => toast("Copy failed — select the text above manually"));
                  }}
                >
                  📋 Copy text
                </button>
              </div>

              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setShareState(null)}>Close</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Edit modal */}
      {editing && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditing(null)}>
          <div className="modal">
            <div className="modal-title"><span className="dot" />Edit Record</div>
            <div className="form-grid">
              <div className="form-group">
                <label>Person *</label>
                <select value={ef.personId} onChange={e => setEf(f => ({ ...f, personId: e.target.value }))}>
                  {data.persons.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Check Type *</label>
                <select value={ef.checkTypeId} onChange={e => setEf(f => ({ ...f, checkTypeId: e.target.value }))}>
                  {data.checkTypes.map(c => <option key={c.id} value={c.id}>{c.name}{c.unit ? ` (${c.unit})` : ""}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Value * {selectedEditCheck?.unit ? `(${selectedEditCheck.unit})` : ""}</label>
                <input value={ef.value} onChange={e => setEf(f => ({ ...f, value: e.target.value }))} placeholder="Enter reading" />
              </div>
              <div className="form-group">
                <label>Session *</label>
                <select value={ef.session} onChange={e => setEf(f => ({ ...f, session: e.target.value }))}>
                  <option>Morning</option>
                  <option>Evening</option>
                </select>
              </div>
              <div className="form-group">
                <label>Date *</label>
                <input type="date" value={ef.date} onChange={e => setEf(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <input value={ef.notes} onChange={e => setEf(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveEdit}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      <div className="stats-row">
        <div className="stat-box"><div className="stat-value">{data.persons.length}</div><div className="stat-label">Persons</div></div>
        <div className="stat-box"><div className="stat-value">{data.records.length}</div><div className="stat-label">Total Records</div></div>
        <div className="stat-box"><div className="stat-value">{data.records.filter(r => r.date === today()).length}</div><div className="stat-label">Today's Checks</div></div>
        <div className="stat-box"><div className="stat-value">{data.checkTypes.length}</div><div className="stat-label">Check Types</div></div>
      </div>

      {/* Free data export — available to all users */}
      <div className="card">
        <div className="card-title"><span className="dot" />Export Your Data</div>
        <p style={{ fontSize: 13, color: "var(--slate)", marginBottom: 16, lineHeight: 1.6 }}>
          Download all your health records as a JSON file. You own your data — keep a personal backup at any time, for free.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn btn-secondary" onClick={() => {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = "metrichealth_data.json"; a.click();
            URL.revokeObjectURL(url);
          }}>
            ⬇ Download JSON backup
          </button>
          <button className="btn btn-secondary" onClick={() => {
            const rows = [["Date","Person","Check Type","Value","Unit","Session","Notes"]];
            data.records.forEach(r => {
              const p  = data.persons.find(x => x.id === r.personId);
              const ct = data.checkTypes.find(x => x.id === r.checkTypeId);
              rows.push([r.date, p?.name||"", ct?.name||"", r.value, ct?.unit||"", r.session, r.notes||""]);
            });
            const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = "metrichealth_records.csv"; a.click();
            URL.revokeObjectURL(url);
          }}>
            ⬇ Download CSV
          </button>
        </div>
      </div>

      {/* Import from Excel */}
      <div className="card">
        <div className="card-title"><span className="dot" />Import from Excel</div>

        {!isPro ? (
          <ProGate
            emoji="📥"
            title="Import from Excel — Pro Feature"
            description="Bulk-import months of records from a spreadsheet in seconds. Upgrade to Pro to unlock Excel import."
            onUpgrade={onUpgrade}
          />
        ) : !importPreview ? (
          <>
            <p style={{ fontSize: 13, color: "var(--slate)", marginBottom: 16, lineHeight: 1.6 }}>
              Upload a MetricHealth Excel export (or any <code style={{ fontFamily:"'DM Mono',monospace", fontSize:11, background:"var(--slate-light)", padding:"1px 5px", borderRadius:4 }}>.xlsx</code> file with columns: <strong>Date, Check Type, Value, Unit, Session, Notes</strong>). Duplicates are skipped automatically.
            </p>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={handleImportFile} />
            <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
              ⬆ Choose Excel file
            </button>
          </>
        ) : (
          <div>
            <div style={{ background: "var(--teal-light)", border: "1.5px solid #99f6e4", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 6, color: "var(--teal-dark)" }}>📄 {importPreview.fileName}</div>
              <div style={{ fontSize: 13, color: "var(--teal-dark)", lineHeight: 1.8 }}>
                <div>👤 Person: <strong>{importPreview.personName || "taken from file rows"}</strong></div>
                <div>📋 Records found: <strong>{importPreview.records.length}</strong></div>
                <div>📅 Date range: <strong>
                  {importPreview.records.reduce((a, r) => r.date < a ? r.date : a, "9999")}
                  {" → "}
                  {importPreview.records.reduce((a, r) => r.date > a ? r.date : a, "")}
                </strong></div>
                <div>🩺 Check types: <strong>{[...new Set(importPreview.records.map(r => r.checkTypeName))].join(", ")}</strong></div>
              </div>
            </div>
            <p style={{ fontSize: 12, color: "var(--slate)", marginBottom: 14 }}>
              New persons and check types will be created automatically. Existing duplicates will be skipped.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-secondary" onClick={() => setImportPreview(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={confirmImport}>✓ Confirm Import</button>
            </div>
          </div>
        )}
      </div>

      {/* Download by person */}
      <div className="card">
        <div className="card-title"><span className="dot" />Download Individual Reports</div>
        {!isPro ? (
          <ProGate
            emoji="🩺"
            title="Doctor Reports & Sharing — Pro Feature"
            description="Print a clean one-page report for your next clinic visit, or send readings directly to a doctor via WhatsApp or email. Upgrade to Pro."
            onUpgrade={onUpgrade}
          />
        ) : data.persons.length === 0 ? (
          <p className="text-sm text-slate">No persons yet.</p>
        ) : (
          <div className="person-grid">
            {data.persons.map(p => (
              <div key={p.id} className="person-card">
                <div className="person-name">{p.name}</div>
                <div className="person-meta">{data.records.filter(r => r.personId === p.id).length} records</div>
                <div className="person-actions">
                  <button className="btn btn-amber btn-sm" onClick={() => downloadReport(p.id)}>⬇ Excel</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => printReport(p.id)}>🖨 Print</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => openShare(p.id)}>📤 Share</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filter + table */}
      <div className="card">
        <div className="card-title"><span className="dot" />Records</div>
        <div className="form-grid" style={{ marginBottom: 16 }}>
          <div className="form-group">
            <label>Person</label>
            <select value={filterPerson} onChange={e => setFilterPerson(e.target.value)}>
              <option value="">All persons</option>
              {data.persons.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Check Type</label>
            <select value={filterCheck} onChange={e => setFilterCheck(e.target.value)}>
              <option value="">All checks</option>
              {data.checkTypes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>From</label>
            <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
          </div>
          <div className="form-group">
            <label>To</label>
            <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty"><div className="empty-icon">📋</div><p>No records found.<br />Log some checks to see them here.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Person</th><th>Check</th><th>Value</th><th>Session</th><th>Notes</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const ct = getCheck(r.checkTypeId);
                  const info = ct ? getRangeInfo(ct.name, ct.unit, r.value) : null;
                  return (
                    <tr key={r.id}>
                      <td style={{ fontFamily: "'DM Mono', monospace", fontSize: 13 }}>{r.date}</td>
                      <td className="fw-bold">{getName(r.personId)}</td>
                      <td>{ct?.name || "—"}</td>
                      <td style={{ fontFamily: "'DM Mono', monospace" }}>
                        {r.value} {ct?.unit}
                        {info && <><br /><RangeBadge info={info} /></>}
                      </td>
                      <td><span className={`badge badge-${r.session.toLowerCase()}`}>{r.session}</span></td>
                      <td className="text-slate text-sm">{r.notes || "—"}</td>
                      <td style={{ display: "flex", gap: 4 }}>
                        <button className="btn btn-amber btn-sm" onClick={() => openEdit(r)} title="Edit">✎</button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteRecord(r.id)} title="Delete">✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── CHARTS TAB ────────────────────────────────────────────────────────────────
const RANGES = [
  { label: "7d",  days: 7  },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "All", days: 0  },
];

function formatXDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en", { month: "short", day: "numeric" });
}

function CustomTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#1a1a2e", color: "#fff", padding: "10px 14px", borderRadius: 10, fontSize: 13, fontFamily: "'DM Mono', monospace", boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
      <div style={{ marginBottom: 6, opacity: 0.7 }}>{formatXDate(label)}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, display: "flex", gap: 8, alignItems: "center" }}>
          <span>{p.name}:</span>
          <strong>{p.value}{unit ? ` ${unit}` : ""}</strong>
        </div>
      ))}
    </div>
  );
}

function ChartsTab({ data }) {
  const [personId, setPersonId] = useState(data.persons[0]?.id || "");
  const [rangeDays, setRangeDays] = useState(30);

  const getCheck = (id) => data.checkTypes.find(c => c.id === id);

  // Cutoff date string
  const cutoff = rangeDays === 0
    ? null
    : new Date(Date.now() - rangeDays * 86_400_000).toISOString().slice(0, 10);

  // Records for selected person within range, sorted by date
  const personRecords = data.records
    .filter(r => r.personId === personId && (!cutoff || r.date >= cutoff))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Group records by checkTypeId → build chart data points
  const charts = data.checkTypes
    .map(ct => {
      const ctRecords = personRecords.filter(r => r.checkTypeId === ct.id);
      if (!ctRecords.length) return null;

      // Merge morning + evening per date into one point
      const byDate = {};
      ctRecords.forEach(r => {
        const v = parseFloat(r.value);
        if (isNaN(v)) return;
        if (!byDate[r.date]) byDate[r.date] = { date: r.date };
        byDate[r.date][r.session === "Morning" ? "morning" : "evening"] = v;
      });

      const points = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
      const hasMorning = points.some(p => p.morning != null);
      const hasEvening = points.some(p => p.evening != null);

      return { ct, points, hasMorning, hasEvening };
    })
    .filter(Boolean);

  const person = data.persons.find(p => p.id === personId);

  return (
    <div>
      {/* Controls */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="charts-filters">
          <div className="form-group">
            <label>Person</label>
            <select value={personId} onChange={e => setPersonId(e.target.value)}>
              {data.persons.length === 0
                ? <option value="">No persons added</option>
                : data.persons.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
              }
            </select>
          </div>
          <div className="form-group">
            <label>Time Range</label>
            <div className="range-pill">
              {RANGES.map(r => (
                <button
                  key={r.days}
                  className={`range-btn ${rangeDays === r.days ? "active" : ""}`}
                  onClick={() => setRangeDays(r.days)}
                >{r.label}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* No data state */}
      {data.persons.length === 0 ? (
        <div className="chart-empty"><div className="chart-empty-icon">👤</div><p>Add a person first to see charts.</p></div>
      ) : charts.length === 0 ? (
        <div className="chart-empty">
          <div className="chart-empty-icon">📈</div>
          <p>No records for <strong>{person?.name}</strong> in this time range.<br />Log some checks to see trends.</p>
        </div>
      ) : (
        charts.map(({ ct, points, hasMorning, hasEvening }) => (
          <div key={ct.id} className="chart-card">
            <div className="chart-card-title">{ct.name}</div>
            <div className="chart-card-meta">
              {points.length} reading{points.length !== 1 ? "s" : ""}
              {ct.unit ? ` · ${ct.unit}` : ""}
              {points.length >= 2 && (() => {
                const all = points.flatMap(p => [p.morning, p.evening].filter(v => v != null));
                const min = Math.min(...all).toFixed(1);
                const max = Math.max(...all).toFixed(1);
                const avg = (all.reduce((s, v) => s + v, 0) / all.length).toFixed(1);
                return ` · min ${min} · max ${max} · avg ${avg}`;
              })()}
            </div>

            {points.length < 2 ? (
              <p style={{ fontSize: 13, color: "var(--slate)", padding: "8px 0" }}>
                Need at least 2 readings to show a trend line.
              </p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={points} margin={{ top: 4, right: 8, bottom: 4, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatXDate}
                      tick={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fill: "#64748b" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fill: "#64748b" }}
                      tickLine={false}
                      axisLine={false}
                      width={45}
                    />
                    <Tooltip content={<CustomTooltip unit={ct.unit} />} />
                    {hasMorning && (
                      <Line
                        type="monotone"
                        dataKey="morning"
                        name="Morning"
                        stroke="#d97706"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: "#d97706", strokeWidth: 0 }}
                        activeDot={{ r: 6 }}
                        connectNulls
                      />
                    )}
                    {hasEvening && (
                      <Line
                        type="monotone"
                        dataKey="evening"
                        name="Evening"
                        stroke="#7c3aed"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: "#7c3aed", strokeWidth: 0 }}
                        activeDot={{ r: 6 }}
                        connectNulls
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
                <div className="chart-legend">
                  {hasMorning && <div className="chart-legend-item"><div className="chart-legend-dot" style={{ background: "#d97706" }} />Morning</div>}
                  {hasEvening && <div className="chart-legend-item"><div className="chart-legend-dot" style={{ background: "#7c3aed" }} />Evening</div>}
                </div>
              </>
            )}
          </div>
        ))
      )}
    </div>
  );
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function timeAgo(isoString) {
  if (!isoString) return null;
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

// ── BACKUP TAB ────────────────────────────────────────────────────────────────
const GOOGLE_SVG = (
  <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

// ── REMINDERS HOOK ────────────────────────────────────────────────────────────
const REMINDER_KEY = "mh_reminders_v1";
const DEFAULT_REMINDERS = {
  morning: { enabled: false, time: "08:00" },
  evening: { enabled: false, time: "20:00" },
};

function useReminders() {
  const [config, _setConfig] = useState(() => {
    try {
      const raw = localStorage.getItem(REMINDER_KEY);
      if (raw) return { ...DEFAULT_REMINDERS, ...JSON.parse(raw) };
    } catch {}
    return DEFAULT_REMINDERS;
  });

  const setConfig = (next) => {
    _setConfig(next);
    localStorage.setItem(REMINDER_KEY, JSON.stringify(next));
  };

  const [permission, setPermission] = useState(
    () => (typeof Notification !== "undefined" ? Notification.permission : "unsupported")
  );

  const shownTodayRef = useRef({});

  // Check every 60 s whether it is time to fire a notification
  useEffect(() => {
    const check = () => {
      if (permission !== "granted") return;
      const now   = new Date();
      const hhmm  = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const today = now.toISOString().slice(0, 10);
      const cfg   = JSON.parse(localStorage.getItem(REMINDER_KEY) || "{}");

      const slots = [
        { key: "morning", icon: "🌅", label: "Morning" },
        { key: "evening", icon: "🌙", label: "Evening" },
      ];

      for (const { key, icon, label } of slots) {
        const slot = cfg[key] || DEFAULT_REMINDERS[key];
        if (!slot.enabled) continue;
        if (slot.time !== hhmm) continue;
        if (shownTodayRef.current[key] === today) continue;
        shownTodayRef.current[key] = today;
        try {
          new Notification(`${icon} MetricHealth — ${label} check`, {
            body: `Time to log your ${label.toLowerCase()} health readings!`,
            icon: "/favicon.svg",
            tag:  `metrichealth-${key}`,
          });
        } catch {}
      }
    };

    check(); // run immediately on mount (catches app opened exactly at reminder time)
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [permission]);

  const requestPermission = async () => {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  };

  return { config, setConfig, permission, requestPermission };
}

// ── PRO STATUS HOOK ───────────────────────────────────────────────────────────
function usePro(user) {
  const [isPro, setIsPro] = useState(() => {
    // Optimistic restore from localStorage cache
    try {
      const raw = localStorage.getItem("mh_pro_v1");
      if (!raw) return false;
      const d = JSON.parse(raw);
      return !!(d.pro && (!d.expiresAt || new Date(d.expiresAt) >= new Date()));
    } catch { return false; }
  });

  useEffect(() => {
    if (!user || !IS_CONFIGURED) return;
    const unsub = subscribeProStatus(user.uid, setIsPro);
    return unsub;
  }, [user]);

  return isPro;
}

// ── PAYSTACK LOADER ───────────────────────────────────────────────────────────
function loadPaystack() {
  return new Promise((resolve, reject) => {
    if (window.PaystackPop) { resolve(); return; }
    const s = document.createElement("script");
    s.src = "https://js.paystack.co/v1/inline.js";
    s.onload = resolve;
    s.onerror = () => reject(new Error("Paystack failed to load"));
    document.head.appendChild(s);
  });
}

// ── UPGRADE MODAL ─────────────────────────────────────────────────────────────
function UpgradeModal({ user, onClose, toast, onProActivated }) {
  const [paying, setPaying] = useState(false);
  const plan = PLANS.lifetime;

  const pay = async () => {
    if (!IS_PAYSTACK_CONFIGURED) {
      toast("Paystack key not configured yet — contact the app owner");
      return;
    }
    if (!user) {
      toast("Please sign in with Google first (Backup tab) to unlock Pro");
      return;
    }
    setPaying(true);
    try {
      await loadPaystack();
      const handler = window.PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: user.email,
        amount: plan.amount,
        currency: "NGN",
        ref: "MH-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7).toUpperCase(),
        metadata: { uid: user.uid, plan: "lifetime" },
        onSuccess: async (res) => {
          try {
            await setProStatus({ plan: "lifetime", ref: res.reference });
            toast("🎉 Pro activated! Welcome to MetricHealth Pro");
            onProActivated?.();
            onClose();
          } catch (e) {
            toast("Payment received but activation failed — contact support with ref: " + res.reference);
          }
        },
        onCancel: () => { setPaying(false); },
      });
      handler.openIframe();
    } catch {
      toast("Could not load payment page — check your connection and try again");
      setPaying(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 500 }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>👨‍👩‍👧‍👦</div>
          <div className="modal-title" style={{ justifyContent: "center", marginBottom: 4 }}>
            MetricHealth <span style={{ color: "#d97706" }}>Pro</span>
          </div>
          <p style={{ fontSize: 13, color: "var(--slate)", lineHeight: 1.5 }}>
            For the cost of one clinic visit — protect your whole family's health records <strong>forever.</strong>
          </p>
        </div>

        {/* What Pro unlocks */}
        <ul className="pro-features-list">
          <li><span className="check">✓</span> <strong>Unlimited family members</strong> — mum, dad, spouse, children</li>
          <li><span className="check">✓</span> <strong>Cloud backup & real-time sync</strong> — data safe even if phone is lost</li>
          <li><span className="check">✓</span> <strong>Print doctor reports</strong> — clean one-page summary for clinic visits</li>
          <li><span className="check">✓</span> <strong>Share via WhatsApp & email</strong> — send readings to any doctor</li>
          <li><span className="check">✓</span> <strong>Excel import & export</strong> — full data in spreadsheet format</li>
          <li><span className="check">✓</span> <strong>Daily push reminders</strong> — morning & evening alert for the family</li>
        </ul>

        {/* Price card */}
        <div style={{
          border: "2px solid #f59e0b", borderRadius: 14, padding: "18px 20px",
          textAlign: "center", margin: "16px 0",
          background: "linear-gradient(135deg,rgba(245,158,11,0.07),rgba(217,119,6,0.04))",
          position: "relative",
        }}>
          <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "#d97706", color: "#fff", fontSize: 10, fontWeight: 700, fontFamily: "'DM Mono',monospace", padding: "2px 14px", borderRadius: 20, letterSpacing: "0.06em" }}>
            LIFETIME ACCESS
          </div>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 38, color: "var(--teal)", lineHeight: 1.1 }}>₦5,000</div>
          <div style={{ fontSize: 12, color: "var(--slate)", fontFamily: "'DM Mono',monospace", marginTop: 4 }}>
            pay once · use forever · no subscriptions
          </div>
        </div>

        {!user && (
          <div className="msg-bar info" style={{ marginBottom: 12 }}>
            ℹ Sign in with Google (Backup tab) first — your Pro status will be saved to your account
          </div>
        )}
        {!IS_PAYSTACK_CONFIGURED && (
          <div className="msg-bar info" style={{ marginBottom: 12 }}>
            ℹ Demo mode — add your Paystack public key in paystackConfig.js to enable payments
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Maybe later</button>
          <button className="btn btn-gold" onClick={pay} disabled={paying} style={{ flex: 2, justifyContent: "center" }}>
            {paying ? "Opening payment…" : "⭐ Unlock Pro — ₦5,000"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PRO GATE ──────────────────────────────────────────────────────────────────
function ProGate({ title, description, onUpgrade, emoji }) {
  return (
    <div className="pro-gate">
      <div className="pro-gate-icon">{emoji || "⭐"}</div>
      <h3>{title || "Pro Feature"}</h3>
      <p>{description || "Upgrade to MetricHealth Pro to unlock this feature."}</p>
      <button className="btn btn-gold" onClick={onUpgrade}>
        ⭐ Unlock Pro — ₦5,000 one-time
      </button>
    </div>
  );
}

// ── REMINDERS TAB ─────────────────────────────────────────────────────────────
function RemindersTab({ data, isPro, onUpgrade }) {
  const { config, setConfig, permission, requestPermission } = useReminders();
  const [testSent, setTestSent] = useState(false);

  if (!isPro) {
    return (
      <ProGate
        emoji="🔔"
        title="Daily Push Reminders — Pro Feature"
        description="Set morning and evening alerts so you never forget to log a reading. Works for you and every family member you track. Upgrade to Pro to enable reminders."
        onUpgrade={onUpgrade}
      />
    );
  }

  const updateSlot = (key, patch) =>
    setConfig({ ...config, [key]: { ...config[key], ...patch } });

  const sendTest = () => {
    if (permission !== "granted") return;
    new Notification("🔔 MetricHealth — Test reminder", {
      body: "Reminders are working! You'll see alerts like this at your chosen times.",
      icon: "/favicon.svg",
      tag:  "metrichealth-test",
    });
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  const permClass = permission === "granted" ? "perm-granted"
    : permission === "denied"  ? "perm-denied"
    : "perm-default";

  const permLabel = permission === "granted" ? "✓ Notifications allowed"
    : permission === "denied"  ? "✕ Notifications blocked"
    : "⚠ Permission not granted";

  const SLOTS = [
    { key: "morning", icon: "🌅", label: "Morning reminder", sub: "Remind me to log my morning check" },
    { key: "evening", icon: "🌙", label: "Evening reminder",  sub: "Remind me to log my evening check" },
  ];

  return (
    <div>
      <div className="card">
        <div className="card-title"><span className="dot" />Push Reminders</div>
        <p style={{ fontSize: 13, color: "var(--slate)", marginBottom: 20, lineHeight: 1.6 }}>
          Set daily alerts so you never forget to log a reading. Notifications appear even when MetricHealth is in the background, as long as your browser tab is open.
        </p>

        {/* Permission status */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
          <span className={`perm-badge ${permClass}`}>{permLabel}</span>
          {permission !== "granted" && permission !== "denied" && (
            <button className="btn btn-primary btn-sm" onClick={requestPermission}>
              Enable notifications
            </button>
          )}
          {permission === "denied" && (
            <span style={{ fontSize: 12, color: "var(--slate)" }}>
              Re-enable in your browser's site settings
            </span>
          )}
          {permission === "granted" && (
            <button className="btn btn-secondary btn-sm" onClick={sendTest} disabled={testSent}>
              {testSent ? "✓ Sent!" : "Send test"}
            </button>
          )}
        </div>

        {permission === "denied" && (
          <div className="reminder-permission" style={{ marginBottom: 20 }}>
            <div className="reminder-permission-icon">🔕</div>
            <div>
              <h4>Notifications are blocked</h4>
              <p>Click the lock icon in your browser's address bar → Notifications → Allow, then reload the page.</p>
            </div>
          </div>
        )}

        {/* Reminder slots */}
        <div className="reminder-list">
          {SLOTS.map(({ key, icon, label, sub }) => (
            <div key={key} className="reminder-row">
              <div className="reminder-icon">{icon}</div>
              <div className="reminder-info">
                <div className="reminder-label">{label}</div>
                <div className="reminder-sub">{sub}</div>
              </div>
              <input
                type="time"
                className="reminder-time"
                value={config[key].time}
                onChange={e => updateSlot(key, { time: e.target.value })}
                disabled={!config[key].enabled}
              />
              <label className="toggle" title={config[key].enabled ? "Disable" : "Enable"}>
                <input
                  type="checkbox"
                  checked={config[key].enabled}
                  onChange={e => updateSlot(key, { enabled: e.target.checked })}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Info card */}
      <div className="card" style={{ background: "var(--teal-light)", border: "1.5px solid #99f6e4" }}>
        <div className="card-title" style={{ color: "var(--teal-dark)" }}><span className="dot" style={{ background: "var(--teal)" }} />How reminders work</div>
        <ul style={{ fontSize: 13, color: "var(--teal-dark)", lineHeight: 2, paddingLeft: 18, margin: 0 }}>
          <li>Reminders fire once per day at the time you set</li>
          <li>The browser tab must be open (background tabs still work)</li>
          <li>Your times are saved locally and never sent to a server</li>
          <li>Use <strong>Send test</strong> to confirm notifications are working</li>
        </ul>
      </div>
    </div>
  );
}

function BackupTab({ data, save, toast, isOnline, user, syncStatus, isPro, onUpgrade }) {
  const [authLoading, setAuthLoading] = useState(false);
  const [lastBackup, setLastBackup]   = useState(() => localStorage.getItem("htLastSync") || null);
  const [status, setStatus]           = useState(null);
  const [opLoading, setOpLoading]     = useState(null);

  // Keep lastBackup display in sync with storage key written by App-level sync
  useEffect(() => {
    const stored = localStorage.getItem("htLastSync");
    if (stored) setLastBackup(stored);
  }, [syncStatus]);

  async function handleSignIn() {
    setAuthLoading(true);
    setStatus(null);
    try {
      await signInWithGoogle();
      toast("Signed in with Google");
    } catch (e) {
      const code = e?.code || "";
      let msg = "Sign-in failed. Please try again.";
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        msg = "Sign-in popup was closed. Please try again.";
      } else if (code === "auth/popup-blocked") {
        msg = "Popup was blocked by your browser. Please allow popups for this site and try again.";
      } else if (code === "auth/unauthorized-domain") {
        msg = "This domain is not authorised in Firebase. Add it under Authentication → Settings → Authorized domains.";
      } else if (code) {
        msg = `Sign-in failed (${code}). Please try again.`;
      }
      setStatus({ type: "error", msg });
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    setStatus(null);
    toast("Signed out");
  }

  async function runBackup(silent = false) {
    if (opLoading) return;
    setOpLoading("backup");
    if (!silent) setStatus(null);
    try {
      const ts = await backupToCloud(data);
      setLastBackup(ts);
      localStorage.setItem("htLastSync", ts);
      if (!silent) { setStatus({ type: "success", msg: "Backup saved successfully." }); toast("Backup complete"); }
    } catch (e) {
      if (!silent) setStatus({ type: "error", msg: "Backup failed: " + e.message });
    } finally {
      setOpLoading(null);
    }
  }

  async function handleRestore() {
    if (opLoading) return;
    if (!confirm("This will replace ALL local data with your cloud backup. Continue?")) return;
    setOpLoading("restore");
    setStatus(null);
    try {
      const result = await restoreFromCloud();
      if (!result) { setStatus({ type: "info", msg: "No backup found for your account yet." }); return; }
      save(result.data);
      const ts = result.modifiedTime;
      setLastBackup(ts);
      localStorage.setItem("htLastSync", ts);
      setStatus({ type: "success", msg: "Data restored from your backup." });
      toast("Data restored successfully");
    } catch (e) {
      setStatus({ type: "error", msg: "Restore failed: " + e.message });
    } finally {
      setOpLoading(null);
    }
  }

  const dataSize = (new Blob([JSON.stringify(data)]).size / 1024).toFixed(1);

  // Developer setup guide — only visible until firebaseConfig.js is filled in
  if (!IS_CONFIGURED) {
    return (
      <div className="card">
        <div className="card-title"><span className="dot" />Cloud Backup</div>
        <div className="setup-guide">
          <h4>⚙ One-time setup (app owner only)</h4>
          <p style={{ fontSize: 13, marginBottom: 12, color: "var(--ink)", lineHeight: 1.6 }}>
            Complete these steps once. After that, your users just click "Sign in with Google" — they never touch any console.
          </p>
          <ol>
            <li>Go to <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer">console.firebase.google.com</a> → <strong>Create a project</strong> (free)</li>
            <li><strong>Add app</strong> → Web → copy the config object shown</li>
            <li>Sidebar → <strong>Build → Authentication → Get started → Google → Enable → Save</strong></li>
            <li>Sidebar → <strong>Build → Firestore Database → Create database</strong> → Production mode → Done</li>
            <li>Firestore → <strong>Rules</strong> tab → paste the rules below → <strong>Publish</strong></li>
          </ol>
          <pre style={{ margin: "10px 0", background: "rgba(0,0,0,0.07)", padding: "10px 12px", borderRadius: 8, fontSize: 11, fontFamily: "'DM Mono', monospace", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /backups/{userId} {
      allow read, write: if request.auth != null
                         && request.auth.uid == userId;
    }
    match /users/{userId} {
      allow read, write: if request.auth != null
                         && request.auth.uid == userId;
    }
  }
}`}</pre>
          <ol start={6}>
            <li>Open <code>src/firebaseConfig.js</code> and fill in the values from step 2</li>
            <li>Restart the dev server — users now see "Sign in with Google" ✓</li>
          </ol>
        </div>
      </div>
    );
  }

  // Sign-in screen for users who haven't signed in yet
  if (!user) {
    return (
      <div>
        {!isPro ? (
          <ProGate
            emoji="☁"
            title="Cloud Backup — Pro Feature"
            description="If your phone is lost, stolen, or broken — your family's health records are gone forever. Pro keeps everything safe in the cloud and syncs across all your devices automatically."
            onUpgrade={onUpgrade}
          />
        ) : (
          <div className="card">
            <div className="card-title"><span className="dot" />Cloud Backup</div>
            <div className="backup-center">
              <div className="backup-center-icon">☁</div>
              <h3>Back up your health data</h3>
              <p>
                Sign in with your Google account to save your records securely to the cloud.
                If you ever lose or change your device, you can restore everything instantly.
              </p>
              <button className="btn-google" onClick={handleSignIn} disabled={authLoading}>
                {GOOGLE_SVG}
                {authLoading ? "Connecting…" : "Sign in with Google"}
              </button>
              {status && <div className={`msg-bar ${status.type}`} style={{ marginTop: 16, justifyContent: "center" }}>{status.msg}</div>}
            </div>
          </div>
        )}
        <PinCard toast={toast} />
      </div>
    );
  }

  // Main backup UI
  return (
    <div>
      {!isPro && (
        <ProGate
          emoji="☁"
          title="Cloud Backup — Pro Feature"
          description="You're signed in. Upgrade to Pro to enable cloud backup and real-time sync across all your devices."
          onUpgrade={onUpgrade}
        />
      )}
      <div className="card">
        <div className="card-title"><span className="dot" />Your Account</div>
        <div className="user-row">
          {user.photoURL
            ? <img className="user-avatar" src={user.photoURL} alt="" referrerPolicy="no-referrer" />
            : <div className="user-avatar-placeholder">{(user.displayName || user.email || "?")[0].toUpperCase()}</div>
          }
          <div style={{ flex: 1 }}>
            <div className="user-name">{user.displayName || "Google User"}</div>
            <div className="user-email">{user.email}</div>
          </div>
          <button className="btn btn-danger btn-sm" onClick={handleSignOut}>Sign Out</button>
        </div>

        <div className="last-backup-row">
          <span className={`last-backup-dot ${syncStatus === "syncing" ? "syncing" : lastBackup ? "" : "never"}`} />
          {syncStatus === "syncing"
            ? <span style={{ color: "var(--teal)" }}>Syncing…</span>
            : syncStatus === "error"
            ? <span style={{ color: "var(--rose)" }}>Sync error — tap Backup Now to retry</span>
            : lastBackup
            ? <>Last synced: <strong>{timeAgo(lastBackup)}</strong> &nbsp;·&nbsp; {dataSize} KB · {data.persons.length} persons · {data.records.length} records</>
            : "No sync yet — your data will sync automatically when you make a change"}
        </div>

        <div className="auto-backup-row">
          <div className="auto-backup-text">
            <div className="label">🔄 Real-time sync active</div>
            <div className="sub">Changes sync to the cloud within 3 seconds. Works across all your devices.</div>
          </div>
          <span style={{ fontSize: 20 }}>✓</span>
        </div>
      </div>

      <div className="backup-grid">
        <div className="backup-action-card">
          <h4>☁ Backup Now</h4>
          <p>Save your current records to the cloud. Overwrites any previous backup.</p>
          <button className="btn btn-primary btn-full" onClick={() => runBackup(false)} disabled={!!opLoading || !isOnline}>
            {opLoading === "backup" ? "Saving…" : isOnline ? "Backup Now" : "No connection"}
          </button>
        </div>
        <div className="backup-action-card">
          <h4>↓ Restore</h4>
          <p>Replace local data with your last cloud backup. Your current data will be overwritten.</p>
          <button className="btn btn-secondary btn-full" onClick={handleRestore} disabled={!!opLoading || !isOnline}>
            {opLoading === "restore" ? "Restoring…" : isOnline ? "Restore from Backup" : "No connection"}
          </button>
        </div>
      </div>

      {status && (
        <div className={`msg-bar ${status.type}`}>
          {status.type === "success" ? "✓" : status.type === "error" ? "✕" : "ℹ"} {status.msg}
        </div>
      )}

      <PinCard toast={toast} />

      {/* Data deletion — NDPR Right to Erasure */}
      <div className="card" style={{ borderColor: "var(--rose-light)" }}>
        <div className="card-title"><span className="dot" style={{ background: "var(--rose)" }} />Your Data Rights</div>
        <p style={{ fontSize: 13, color: "var(--slate)", marginBottom: 14, lineHeight: 1.6 }}>
          Under the Nigeria Data Protection Regulation (NDPR), you have the right to permanently delete all your cloud data at any time. Your data is encrypted — even we cannot read it.
        </p>
        <p style={{ fontSize: 12, color: "var(--slate)", marginBottom: 16, lineHeight: 1.6 }}>
          ⚠ This will permanently delete your cloud backup and Pro status from our servers. Your local data on this device will not be affected.
        </p>
        <button
          className="btn btn-danger"
          disabled={!!opLoading || !isOnline}
          onClick={async () => {
            if (!confirm("Permanently delete all your cloud data (backup + Pro status) from MetricHealth servers?\n\nThis cannot be undone. Your data on this device will not be affected.")) return;
            setOpLoading("delete");
            try {
              await deleteAllUserData();
              await signOut();
              toast("All cloud data deleted. You have been signed out.");
            } catch (e) {
              setStatus({ type: "error", msg: "Delete failed: " + e.message });
            } finally {
              setOpLoading(null);
            }
          }}
        >
          {opLoading === "delete" ? "Deleting…" : "🗑 Delete All My Cloud Data"}
        </button>
      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [data, save]         = useStorage();
  const [tab, setTab]        = useState("log");
  const [toastMsg, setToastMsg] = useState("");
  const isOnline             = useOnlineStatus();
  const toast                = (msg) => setToastMsg(msg);

  // ── PIN lock ──────────────────────────────────────────────────────────────
  const [locked, setLocked] = useState(() => hasPinSet());

  // ── Dark mode ─────────────────────────────────────────────────────────────
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("mh_theme") === "dark");
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    localStorage.setItem("mh_theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  // ── Auth state (shared with BackupTab) ────────────────────────────────────
  const [user, setUser]           = useState(null);
  const [syncStatus, setSyncStatus] = useState(null); // null|"syncing"|"synced"|"error"

  // ── Pro status ────────────────────────────────────────────────────────────
  const isPro = usePro(user);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const onUpgrade = () => setUpgradeOpen(true);

  // ── Policies modal ────────────────────────────────────────────────────────
  const [policyOpen, setPolicyOpen] = useState(null); // null | "medical" | "privacy" | "terms"

  // ── First-use consent banner ──────────────────────────────────────────────
  const [consentDone, setConsentDone] = useState(() => !!localStorage.getItem("mh_consent_v1"));
  const acceptConsent = () => {
    localStorage.setItem("mh_consent_v1", "1");
    setConsentDone(true);
  };

  // Refs for loop prevention
  const lastWriteRef         = useRef(localStorage.getItem("htLastSync") || "");
  const isSyncingFromRemote  = useRef(false);
  const debounceRef          = useRef(null);

  // Listen to Firebase auth state once on mount
  useEffect(() => {
    const unsub = listenAuthState(setUser);
    return unsub;
  }, []);

  // Subscribe to real-time Firestore snapshot when user signs in
  useEffect(() => {
    if (!user || !IS_CONFIGURED) return;
    const unsub = subscribeToCloud(user.uid, ({ data: remoteData, updatedAt }) => {
      // Ignore the echo of our own write
      if (updatedAt <= lastWriteRef.current) return;
      // Remote is newer — apply it locally without triggering another write
      isSyncingFromRemote.current = true;
      save(remoteData);
      lastWriteRef.current = updatedAt;
      localStorage.setItem("htLastSync", updatedAt);
      setSyncStatus("synced");
    });
    return unsub;
  }, [user]); // eslint-disable-line

  // Debounce-write local changes to Firestore (3 s after last change)
  useEffect(() => {
    if (!user || !IS_CONFIGURED || !isOnline) return;
    if (isSyncingFromRemote.current) {
      // This data change came from the snapshot — don't echo back
      isSyncingFromRemote.current = false;
      return;
    }
    setSyncStatus("syncing");
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const ts = await backupToCloud(data);
        lastWriteRef.current = ts;
        localStorage.setItem("htLastSync", ts);
        setSyncStatus("synced");
      } catch {
        setSyncStatus("error");
      }
    }, 3000);
    return () => clearTimeout(debounceRef.current);
  }, [data, user, isOnline]); // eslint-disable-line

  // Show lock screen before anything else if PIN is set
  if (locked) {
    return (
      <>
        <style>{STYLES}</style>
        <LockScreen onUnlock={() => setLocked(false)} />
      </>
    );
  }

  const TABS = [
    { id: "log",       label: "📝 Log Check" },
    { id: "records",   label: "📊 Records" },
    { id: "charts",    label: "📈 Charts" },
    { id: "persons",   label: "👤 Persons" },
    { id: "checks",    label: "🩺 Check Types" },
    { id: "reminders", label: "🔔 Reminders" },
    { id: "backup",    label: "☁ Backup" },
  ];

  // Sync status pill shown in header when signed in
  const syncLabel = syncStatus === "syncing" ? "⟳ Syncing"
    : syncStatus === "synced"  ? "✓ Synced"
    : syncStatus === "error"   ? "⚠ Sync error"
    : null;

  return (
    <>
      <style>{STYLES}</style>
      <div className="app">
        <div className="header">
          <div>
            <div className="header-title">Metric<span>Health</span></div>
            <div className="header-sub">Daily health metrics · {data.persons.length} persons · {data.records.length} records</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button className="dark-toggle" onClick={() => setDarkMode(d => !d)} title={darkMode ? "Switch to light mode" : "Switch to dark mode"}>
              {darkMode ? "☀️" : "🌙"}
            </button>
            {isPro
              ? <span className="pro-badge">⭐ Pro</span>
              : <button className="btn btn-gold btn-sm" onClick={onUpgrade} style={{ fontSize: 12, padding: "5px 14px" }}>⭐ Pro — ₦5,000</button>
            }
            {user && syncLabel && (
              <span style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 11,
                fontWeight: 600,
                padding: "4px 10px",
                borderRadius: 20,
                background: syncStatus === "syncing" ? "var(--teal-light)" : syncStatus === "error" ? "var(--rose-light)" : "var(--teal-light)",
                color: syncStatus === "error" ? "var(--rose)" : "var(--teal-dark)",
                letterSpacing: "0.04em",
              }}>
                {syncLabel}
              </span>
            )}
            <span className={`online-badge ${isOnline ? 'online' : 'offline'}`}>
              <span className="status-dot" />
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
        {!isOnline && (
          <div className="offline-banner">
            ⚡ You're offline — all records are saved locally and will stay available.
          </div>
        )}

        <div className="tabs">
          {TABS.map(t => (
            <button key={t.id} className={`tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "log"       && <LogCheckTab data={data} save={save} toast={toast} />}
        {tab === "records"   && <RecordsTab data={data} save={save} toast={toast} isPro={isPro} onUpgrade={onUpgrade} />}
        {tab === "charts"    && <ChartsTab data={data} />}
        {tab === "persons"   && <PersonsTab data={data} save={save} toast={toast} isPro={isPro} onUpgrade={onUpgrade} />}
        {tab === "checks"    && <CheckTypesTab data={data} save={save} toast={toast} />}
        {tab === "reminders" && <RemindersTab data={data} isPro={isPro} onUpgrade={onUpgrade} />}
        {tab === "backup"    && <BackupTab data={data} save={save} toast={toast} isOnline={isOnline} user={user} syncStatus={syncStatus} isPro={isPro} onUpgrade={onUpgrade} />}

        {/* Footer */}
        <footer className="app-footer">
          <div className="app-footer-brand">Metric<span>Health</span></div>
          <div className="app-footer-links">
            <a onClick={() => setPolicyOpen("medical")}>⚕ Medical Disclaimer</a>
            <a onClick={() => setPolicyOpen("privacy")}>🔒 Privacy Policy</a>
            <a onClick={() => setPolicyOpen("terms")}>📋 Terms of Service</a>
            <a href={`mailto:${CONTACT_EMAIL}`}>✉ Contact</a>
          </div>
          <div className="app-footer-copy">
            © {new Date().getFullYear()} MetricHealth · Not a medical device · For personal tracking only · Data encrypted end-to-end
          </div>
        </footer>
      </div>

      {toastMsg && <Toast msg={toastMsg} onDone={() => setToastMsg("")} />}

      {upgradeOpen && (
        <UpgradeModal
          user={user}
          toast={toast}
          onClose={() => setUpgradeOpen(false)}
          onProActivated={() => { /* isPro updates automatically via usePro hook */ }}
        />
      )}

      {policyOpen && (
        <PoliciesModal initialTab={policyOpen} onClose={() => setPolicyOpen(null)} />
      )}

      {/* First-use consent banner */}
      {!consentDone && (
        <div className="consent-banner">
          <p>
            MetricHealth is <strong>not a medical device</strong> and does not provide medical advice.
            By using this app you agree to our{" "}
            <a onClick={() => setPolicyOpen("medical")}>Medical Disclaimer</a>,{" "}
            <a onClick={() => setPolicyOpen("privacy")}>Privacy Policy</a>, and{" "}
            <a onClick={() => setPolicyOpen("terms")}>Terms of Service</a>.
          </p>
          <button className="btn-consent" onClick={acceptConsent}>I Understand</button>
        </div>
      )}
    </>
  );
}
