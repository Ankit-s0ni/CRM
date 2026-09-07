"use client";

import {
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  Filter,
  Flame,
  Kanban,
  MessageSquare,
  Paperclip,
  Plus,
  Search,
  Sparkles,
  Table,
  Zap,
} from "lucide-react";

export function TmsKanbanHeroMockup() {
  return (
    <div
      className="tms-mockup-window"
      style={{
        background: "#0d1412",
        borderRadius: "1rem",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        boxShadow: "0 2.5rem 5rem rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(1, 128, 116, 0.2)",
        color: "#f1f5f9",
        overflow: "hidden",
        width: "100%",
        maxWidth: "54rem",
        margin: "0 auto",
        fontFamily: "var(--font-sans), sans-serif",
      }}
      aria-label="Liqaa TMS Kanban board preview"
    >
      {/* Top Window Bar */}
      <div
        style={{
          background: "#141d1a",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ display: "flex", gap: "6px" }} aria-hidden="true">
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#eab308", display: "inline-block" }} />
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#94a3b8" }}>
            <span style={{ color: "#64748b" }}>Liqaa TMS</span>
            <span style={{ color: "#475569" }}>/</span>
            <span
              style={{
                background: "rgba(1, 128, 116, 0.25)",
                color: "#5ed6ca",
                padding: "2px 6px",
                borderRadius: "4px",
                fontWeight: 700,
                fontSize: "10px",
                letterSpacing: "0.05em",
              }}
            >
              OPS
            </span>
            <strong style={{ color: "#e2e8f0", fontWeight: 600 }}>General Operations</strong>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(34, 197, 94, 0.12)",
              border: "1px solid rgba(34, 197, 94, 0.25)",
              color: "#4ade80",
              fontSize: "11px",
              fontWeight: 600,
              padding: "3px 8px",
              borderRadius: "999px",
            }}
          >
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e", display: "inline-block", boxShadow: "0 0 8px #22c55e" }} />
            <span>Realtime</span>
          </div>

          <div
            style={{
              background: "#018074",
              color: "white",
              fontSize: "11px",
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              cursor: "pointer",
            }}
          >
            <Plus size={13} />
            <span>New Ticket</span>
          </div>
        </div>
      </div>

      {/* View Switcher & Toolbar Subheader */}
      <div
        style={{
          background: "#111a17",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(1, 128, 116, 0.2)",
              border: "1px solid rgba(1, 128, 116, 0.4)",
              color: "#5ed6ca",
              fontSize: "12px",
              fontWeight: 600,
              padding: "4px 10px",
              borderRadius: "6px",
            }}
          >
            <Kanban size={13} />
            <span>Kanban Board</span>
            <span style={{ background: "rgba(255, 255, 255, 0.12)", padding: "1px 5px", borderRadius: "4px", fontSize: "10px" }}>10</span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: "#94a3b8",
              fontSize: "12px",
              padding: "4px 10px",
              borderRadius: "6px",
            }}
          >
            <Table size={13} />
            <span>Table View</span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: "#94a3b8",
              fontSize: "12px",
              padding: "4px 10px",
              borderRadius: "6px",
            }}
          >
            <FileSpreadsheet size={13} style={{ color: "#10b981" }} />
            <span>Spreadsheets</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "#1a2521",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "6px",
              padding: "4px 8px",
              fontSize: "11px",
              color: "#64748b",
            }}
          >
            <Search size={12} />
            <span>Search tickets...</span>
            <kbd style={{ background: "rgba(255, 255, 255, 0.08)", padding: "1px 4px", borderRadius: "3px", fontSize: "9px" }}>/</kbd>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              background: "#1a2521",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "6px",
              padding: "4px 8px",
              fontSize: "11px",
              color: "#94a3b8",
            }}
          >
            <Filter size={11} />
            <span>Sprint 4</span>
          </div>
        </div>
      </div>

      {/* Kanban Board Columns Area */}
      <div
        style={{
          padding: "16px",
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: "14px",
          background: "#0c1210",
        }}
      >
        {/* Column 1: TO DO */}
        <div
          style={{
            background: "#141c19",
            borderRadius: "10px",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            padding: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#0284c7", display: "inline-block" }} />
              <strong style={{ fontSize: "12px", color: "#e2e8f0", textTransform: "uppercase", letterSpacing: "0.05em" }}>To Do</strong>
            </div>
            <span style={{ fontSize: "11px", background: "rgba(255, 255, 255, 0.08)", padding: "1px 6px", borderRadius: "999px", color: "#94a3b8", fontWeight: 600 }}>2</span>
          </div>

          {/* Ticket 1 */}
          <div
            style={{
              background: "#1a2521",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "8px",
              padding: "10px 12px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "10px", color: "#64748b", fontFamily: "monospace", fontWeight: 700 }}>OPS-104</span>
              <span style={{ fontSize: "10px", background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", padding: "1px 6px", borderRadius: "4px", fontWeight: 600, display: "flex", alignItems: "center", gap: "3px" }}>
                <Flame size={10} /> High
              </span>
            </div>
            <p style={{ margin: "0 0 8px", fontSize: "12.5px", fontWeight: 600, color: "#f8fafc", lineHeight: "1.4" }}>
              Onboard regional sales coordinators
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px", color: "#64748b" }}>
              <span style={{ background: "rgba(255, 255, 255, 0.05)", padding: "2px 6px", borderRadius: "4px", fontSize: "10px" }}>Operations</span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "10px" }}><MessageSquare size={11} /> 4</span>
                <span style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#018074", color: "white", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: 700 }}>AS</span>
              </div>
            </div>
          </div>

          {/* Ticket 2 */}
          <div
            style={{
              background: "#1a2521",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "8px",
              padding: "10px 12px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "10px", color: "#64748b", fontFamily: "monospace", fontWeight: 700 }}>OPS-107</span>
              <span style={{ fontSize: "10px", background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", padding: "1px 6px", borderRadius: "4px", fontWeight: 600 }}>Medium</span>
            </div>
            <p style={{ margin: "0 0 8px", fontSize: "12.5px", fontWeight: 600, color: "#f8fafc", lineHeight: "1.4" }}>
              Sync HRMS directory to field schedule
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px", color: "#64748b" }}>
              <span style={{ background: "rgba(1, 128, 116, 0.2)", color: "#5ed6ca", padding: "2px 6px", borderRadius: "4px", fontSize: "10px" }}>HRMS Sync</span>
              <span style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#6366f1", color: "white", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: 700 }}>MA</span>
            </div>
          </div>
        </div>

        {/* Column 2: IN PROGRESS (Active Highlight) */}
        <div
          style={{
            background: "#141c19",
            borderRadius: "10px",
            border: "1px solid rgba(1, 128, 116, 0.35)",
            boxShadow: "0 0 16px rgba(1, 128, 116, 0.08)",
            padding: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#d97706", display: "inline-block" }} />
              <strong style={{ fontSize: "12px", color: "#fbbf24", textTransform: "uppercase", letterSpacing: "0.05em" }}>In Progress</strong>
            </div>
            <span style={{ fontSize: "11px", background: "rgba(245, 158, 11, 0.2)", color: "#fbbf24", padding: "1px 6px", borderRadius: "999px", fontWeight: 700 }}>2</span>
          </div>

          {/* Ticket 3: Hero Featured Spreadsheet Import */}
          <div
            style={{
              background: "#1c2a25",
              border: "1px solid rgba(1, 128, 116, 0.45)",
              borderRadius: "8px",
              padding: "12px",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
              position: "relative",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "10px", color: "#5ed6ca", fontFamily: "monospace", fontWeight: 700 }}>OPS-102</span>
              <span style={{ fontSize: "10px", background: "rgba(244, 63, 94, 0.15)", color: "#fb7185", padding: "1px 6px", borderRadius: "4px", fontWeight: 700 }}>Critical</span>
            </div>
            <p style={{ margin: "0 0 8px", fontSize: "13px", fontWeight: 700, color: "#ffffff", lineHeight: "1.35" }}>
              Spreadsheet Migration: Roadmap.xlsx
            </p>

            {/* Smart Import Progress Widget */}
            <div
              style={{
                background: "rgba(0, 0, 0, 0.3)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "6px",
                padding: "6px 8px",
                margin: "8px 0 10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "10px", marginBottom: "4px" }}>
                <span style={{ color: "#34d399", display: "flex", alignItems: "center", gap: "4px", fontWeight: 600 }}>
                  <FileSpreadsheet size={11} /> 124 Rows Mapped
                </span>
                <span style={{ color: "#a7f3d0", fontWeight: 700 }}>88% Validated</span>
              </div>
              <div style={{ width: "100%", height: "4px", background: "rgba(255, 255, 255, 0.1)", borderRadius: "2px", overflow: "hidden" }}>
                <div style={{ width: "88%", height: "100%", background: "linear-gradient(90deg, #059669, #10b981)" }} />
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px", color: "#64748b" }}>
              <span style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399", padding: "2px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: 600 }}>Excel Import</span>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "10px", color: "#94a3b8" }}><Paperclip size={11} /> 1</span>
                <span style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#059669", color: "white", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: 700 }}>AS</span>
              </div>
            </div>
          </div>

          {/* Ticket 4 */}
          <div
            style={{
              background: "#1a2521",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "8px",
              padding: "10px 12px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "10px", color: "#64748b", fontFamily: "monospace", fontWeight: 700 }}>OPS-105</span>
              <span style={{ fontSize: "10px", background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", padding: "1px 6px", borderRadius: "4px", fontWeight: 600 }}>High</span>
            </div>
            <p style={{ margin: "0 0 8px", fontSize: "12.5px", fontWeight: 600, color: "#f8fafc", lineHeight: "1.4" }}>
              Status transitions & SLA triggers
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px", color: "#64748b" }}>
              <span style={{ background: "rgba(255, 255, 255, 0.05)", padding: "2px 6px", borderRadius: "4px", fontSize: "10px" }}>Workflows</span>
              <span style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#d97706", color: "white", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: 700 }}>RK</span>
            </div>
          </div>
        </div>

        {/* Column 3: COMPLETED */}
        <div
          style={{
            background: "#141c19",
            borderRadius: "10px",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            padding: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#16a34a", display: "inline-block" }} />
              <strong style={{ fontSize: "12px", color: "#86efac", textTransform: "uppercase", letterSpacing: "0.05em" }}>Done</strong>
            </div>
            <span style={{ fontSize: "11px", background: "rgba(34, 197, 94, 0.15)", color: "#86efac", padding: "1px 6px", borderRadius: "999px", fontWeight: 600 }}>5</span>
          </div>

          {/* Ticket 5 */}
          <div
            style={{
              background: "rgba(26, 37, 33, 0.5)",
              border: "1px solid rgba(255, 255, 255, 0.05)",
              borderRadius: "8px",
              padding: "10px 12px",
              opacity: 0.85,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "10px", color: "#64748b", fontFamily: "monospace", fontWeight: 700 }}>OPS-98</span>
              <span style={{ fontSize: "10px", background: "rgba(34, 197, 94, 0.15)", color: "#4ade80", padding: "1px 6px", borderRadius: "4px", fontWeight: 600, display: "flex", alignItems: "center", gap: "3px" }}>
                <CheckCircle2 size={10} /> Done
              </span>
            </div>
            <p style={{ margin: "0 0 8px", fontSize: "12.5px", fontWeight: 500, color: "#94a3b8", textDecoration: "line-through", lineHeight: "1.4" }}>
              Tenant workspace provisioning
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px", color: "#64748b" }}>
              <span style={{ background: "rgba(255, 255, 255, 0.05)", padding: "2px 6px", borderRadius: "4px", fontSize: "10px" }}>Platform</span>
              <span style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#0f766e", color: "white", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: 700 }}>JD</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Status Footer Bar */}
      <div
        style={{
          background: "#0f1714",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "11px",
          color: "#94a3b8",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "5px", color: "#5ed6ca" }}>
            <Sparkles size={12} />
            <span>Unified with Liqaa HRMS Directory</span>
          </span>
          <span style={{ color: "#334155" }}>•</span>
          <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "#a7f3d0" }}>
            <Zap size={11} style={{ color: "#eab308" }} />
            <span>1-Click Fast-Track Ready</span>
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b" }}>
          <Clock size={11} />
          <span>Sprint 4 Delivery: 92% on schedule</span>
        </div>
      </div>
    </div>
  );
}
