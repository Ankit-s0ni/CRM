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
} from "lucide-react";

export function TmsKanbanHeroMockup() {
  return (
    <div
      className="tms-mockup-window"
      style={{
        background: "#ffffff",
        borderRadius: "0.875rem",
        border: "1px solid rgba(25, 29, 26, 0.12)",
        boxShadow: "0 20px 45px -15px rgba(17, 23, 21, 0.12), 0 1px 3px rgba(17, 23, 21, 0.05)",
        color: "#111715",
        overflow: "hidden",
        width: "100%",
        maxWidth: "54rem",
        margin: "0 auto",
        fontFamily: "var(--font-sans), sans-serif",
      }}
      aria-label="Liqaa TMS Kanban board preview"
    >
      {/* Top Window Chrome Bar */}
      <div
        style={{
          background: "#faf9f5",
          borderBottom: "1px solid rgba(25, 29, 26, 0.08)",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ display: "flex", gap: "6px" }} aria-hidden="true">
            <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#ef4444", display: "inline-block", opacity: 0.85 }} />
            <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#f59e0b", display: "inline-block", opacity: 0.85 }} />
            <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#10b981", display: "inline-block", opacity: 0.85 }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#64748b" }}>
            <span style={{ fontWeight: 500 }}>Liqaa TMS</span>
            <span style={{ color: "#cbd5e1" }}>/</span>
            <span
              style={{
                background: "rgba(1, 128, 116, 0.1)",
                color: "#018074",
                padding: "1px 5px",
                borderRadius: "3px",
                fontWeight: 700,
                fontSize: "10px",
                letterSpacing: "0.03em",
              }}
            >
              OPS
            </span>
            <strong style={{ color: "#1e293b", fontWeight: 600 }}>General Operations</strong>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              color: "#15803d",
              fontSize: "11px",
              fontWeight: 600,
              padding: "2px 7px",
              borderRadius: "999px",
            }}
          >
            <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#16a34a", display: "inline-block" }} />
            <span>Synced</span>
          </div>

          <div
            style={{
              background: "#018074",
              color: "white",
              fontSize: "11px",
              fontWeight: 600,
              padding: "4px 10px",
              borderRadius: "5px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              cursor: "default",
            }}
          >
            <Plus size={12} />
            <span>New Ticket</span>
          </div>
        </div>
      </div>

      {/* Subheader Toolbar & Views */}
      <div
        style={{
          background: "#ffffff",
          borderBottom: "1px solid rgba(25, 29, 26, 0.08)",
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              background: "rgba(1, 128, 116, 0.08)",
              border: "1px solid rgba(1, 128, 116, 0.2)",
              color: "#018074",
              fontSize: "12px",
              fontWeight: 600,
              padding: "4px 9px",
              borderRadius: "5px",
            }}
          >
            <Kanban size={13} />
            <span>Kanban Board</span>
            <span style={{ background: "rgba(1, 128, 116, 0.15)", padding: "1px 5px", borderRadius: "4px", fontSize: "10px", fontWeight: 700 }}>9</span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              color: "#64748b",
              fontSize: "12px",
              padding: "4px 9px",
              borderRadius: "5px",
            }}
          >
            <Table size={13} />
            <span>Table View</span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              color: "#64748b",
              fontSize: "12px",
              padding: "4px 9px",
              borderRadius: "5px",
            }}
          >
            <FileSpreadsheet size={13} style={{ color: "#059669" }} />
            <span>Spreadsheets</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "5px",
              padding: "4px 8px",
              fontSize: "11px",
              color: "#94a3b8",
            }}
          >
            <Search size={11} />
            <span style={{ color: "#64748b" }}>Search tickets...</span>
            <kbd style={{ background: "#e2e8f0", color: "#64748b", padding: "1px 4px", borderRadius: "3px", fontSize: "9px" }}>/</kbd>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "5px",
              padding: "4px 8px",
              fontSize: "11px",
              color: "#475569",
              fontWeight: 500,
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
          background: "#f8f7f4",
        }}
      >
        {/* Column 1: TO DO */}
        <div
          style={{
            background: "#eeece6",
            borderRadius: "8px",
            border: "1px solid rgba(25, 29, 26, 0.08)",
            padding: "10px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#0284c7", display: "inline-block" }} />
              <strong style={{ fontSize: "11.5px", color: "#334155", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 700 }}>To Do</strong>
            </div>
            <span style={{ fontSize: "11px", background: "#ffffff", border: "1px solid rgba(25, 29, 26, 0.1)", padding: "0 5px", borderRadius: "999px", color: "#64748b", fontWeight: 600 }}>2</span>
          </div>

          {/* Ticket 1 */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid rgba(25, 29, 26, 0.1)",
              borderRadius: "6px",
              padding: "10px 12px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "5px" }}>
              <span style={{ fontSize: "10.5px", color: "#64748b", fontFamily: "monospace", fontWeight: 600 }}>OPS-104</span>
              <span style={{ fontSize: "10px", background: "#fef3c7", color: "#b45309", border: "1px solid #fde68a", padding: "1px 5px", borderRadius: "3px", fontWeight: 600, display: "flex", alignItems: "center", gap: "2px" }}>
                <Flame size={10} /> High
              </span>
            </div>
            <p style={{ margin: "0 0 8px", fontSize: "12.5px", fontWeight: 600, color: "#111715", lineHeight: "1.35" }}>
              Onboard regional sales coordinators
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px", color: "#64748b" }}>
              <span style={{ background: "#f1f5f9", padding: "1px 5px", borderRadius: "3px", fontSize: "10px", color: "#475569" }}>Operations</span>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "2px", fontSize: "10px" }}><MessageSquare size={10} /> 4</span>
                <span style={{ width: "19px", height: "19px", borderRadius: "50%", background: "#018074", color: "white", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: 700 }}>AS</span>
              </div>
            </div>
          </div>

          {/* Ticket 2 */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid rgba(25, 29, 26, 0.1)",
              borderRadius: "6px",
              padding: "10px 12px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "5px" }}>
              <span style={{ fontSize: "10.5px", color: "#64748b", fontFamily: "monospace", fontWeight: 600 }}>OPS-107</span>
              <span style={{ fontSize: "10px", background: "#e0f2fe", color: "#0369a1", border: "1px solid #bae6fd", padding: "1px 5px", borderRadius: "3px", fontWeight: 600 }}>Medium</span>
            </div>
            <p style={{ margin: "0 0 8px", fontSize: "12.5px", fontWeight: 600, color: "#111715", lineHeight: "1.35" }}>
              Sync HRMS directory to field schedule
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px", color: "#64748b" }}>
              <span style={{ background: "rgba(1, 128, 116, 0.1)", color: "#018074", padding: "1px 5px", borderRadius: "3px", fontSize: "10px", fontWeight: 600 }}>HRMS Sync</span>
              <span style={{ width: "19px", height: "19px", borderRadius: "50%", background: "#475569", color: "white", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: 700 }}>MA</span>
            </div>
          </div>
        </div>

        {/* Column 2: IN PROGRESS */}
        <div
          style={{
            background: "#eeece6",
            borderRadius: "8px",
            border: "1px solid rgba(25, 29, 26, 0.08)",
            padding: "10px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#d97706", display: "inline-block" }} />
              <strong style={{ fontSize: "11.5px", color: "#334155", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 700 }}>In Progress</strong>
            </div>
            <span style={{ fontSize: "11px", background: "#ffffff", border: "1px solid rgba(25, 29, 26, 0.1)", padding: "0 5px", borderRadius: "999px", color: "#64748b", fontWeight: 600 }}>2</span>
          </div>

          {/* Ticket 3: Spreadsheet Migration */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid rgba(1, 128, 116, 0.3)",
              borderRadius: "6px",
              padding: "10px 12px",
              boxShadow: "0 2px 5px rgba(17, 23, 21, 0.05)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "5px" }}>
              <span style={{ fontSize: "10.5px", color: "#018074", fontFamily: "monospace", fontWeight: 700 }}>OPS-102</span>
              <span style={{ fontSize: "10px", background: "#ffe4e6", color: "#be123c", border: "1px solid #fecdd3", padding: "1px 5px", borderRadius: "3px", fontWeight: 700 }}>Critical</span>
            </div>
            <p style={{ margin: "0 0 6px", fontSize: "12.5px", fontWeight: 600, color: "#111715", lineHeight: "1.35" }}>
              Spreadsheet Migration: Roadmap.xlsx
            </p>

            {/* Smart Import Progress Widget */}
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "5px",
                padding: "6px 8px",
                margin: "6px 0 8px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "10px", marginBottom: "3px" }}>
                <span style={{ color: "#059669", display: "flex", alignItems: "center", gap: "3px", fontWeight: 600 }}>
                  <FileSpreadsheet size={11} /> 124 Rows Mapped
                </span>
                <span style={{ color: "#047857", fontWeight: 700 }}>88% Validated</span>
              </div>
              <div style={{ width: "100%", height: "4px", background: "#e2e8f0", borderRadius: "2px", overflow: "hidden" }}>
                <div style={{ width: "88%", height: "100%", background: "#018074" }} />
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px", color: "#64748b" }}>
              <span style={{ background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0", padding: "1px 5px", borderRadius: "3px", fontSize: "10px", fontWeight: 600 }}>Excel Import</span>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "2px", fontSize: "10px", color: "#64748b" }}><Paperclip size={10} /> 1</span>
                <span style={{ width: "19px", height: "19px", borderRadius: "50%", background: "#018074", color: "white", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: 700 }}>AS</span>
              </div>
            </div>
          </div>

          {/* Ticket 4 */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid rgba(25, 29, 26, 0.1)",
              borderRadius: "6px",
              padding: "10px 12px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "5px" }}>
              <span style={{ fontSize: "10.5px", color: "#64748b", fontFamily: "monospace", fontWeight: 600 }}>OPS-105</span>
              <span style={{ fontSize: "10px", background: "#fef3c7", color: "#b45309", border: "1px solid #fde68a", padding: "1px 5px", borderRadius: "3px", fontWeight: 600 }}>High</span>
            </div>
            <p style={{ margin: "0 0 8px", fontSize: "12.5px", fontWeight: 600, color: "#111715", lineHeight: "1.35" }}>
              Status transitions & SLA triggers
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px", color: "#64748b" }}>
              <span style={{ background: "#f1f5f9", padding: "1px 5px", borderRadius: "3px", fontSize: "10px", color: "#475569" }}>Workflows</span>
              <span style={{ width: "19px", height: "19px", borderRadius: "50%", background: "#d97706", color: "white", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: 700 }}>RK</span>
            </div>
          </div>
        </div>

        {/* Column 3: COMPLETED */}
        <div
          style={{
            background: "#eeece6",
            borderRadius: "8px",
            border: "1px solid rgba(25, 29, 26, 0.08)",
            padding: "10px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#16a34a", display: "inline-block" }} />
              <strong style={{ fontSize: "11.5px", color: "#334155", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 700 }}>Done</strong>
            </div>
            <span style={{ fontSize: "11px", background: "#ffffff", border: "1px solid rgba(25, 29, 26, 0.1)", padding: "0 5px", borderRadius: "999px", color: "#64748b", fontWeight: 600 }}>5</span>
          </div>

          {/* Ticket 5 */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid rgba(25, 29, 26, 0.08)",
              borderRadius: "6px",
              padding: "10px 12px",
              opacity: 0.9,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "5px" }}>
              <span style={{ fontSize: "10.5px", color: "#94a3b8", fontFamily: "monospace", fontWeight: 600 }}>OPS-98</span>
              <span style={{ fontSize: "10px", background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0", padding: "1px 5px", borderRadius: "3px", fontWeight: 600, display: "flex", alignItems: "center", gap: "2px" }}>
                <CheckCircle2 size={10} /> Done
              </span>
            </div>
            <p style={{ margin: "0 0 8px", fontSize: "12.5px", fontWeight: 500, color: "#64748b", textDecoration: "line-through", lineHeight: "1.35" }}>
              Tenant workspace provisioning
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px", color: "#94a3b8" }}>
              <span style={{ background: "#f8fafc", padding: "1px 5px", borderRadius: "3px", fontSize: "10px" }}>Platform</span>
              <span style={{ width: "19px", height: "19px", borderRadius: "50%", background: "#64748b", color: "white", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: 700 }}>JD</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Status Footer Bar */}
      <div
        style={{
          background: "#faf9f5",
          borderTop: "1px solid rgba(25, 29, 26, 0.08)",
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "11px",
          color: "#64748b",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "#018074", fontWeight: 500 }}>
            <Sparkles size={11} />
            <span>Connected to Liqaa HRMS Directory</span>
          </span>
          <span style={{ color: "#cbd5e1" }}>•</span>
          <span style={{ color: "#64748b" }}>
            14 active team collaborators
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "#64748b" }}>
          <Clock size={11} />
          <span>Sprint 4 Delivery on schedule</span>
        </div>
      </div>
    </div>
  );
}
