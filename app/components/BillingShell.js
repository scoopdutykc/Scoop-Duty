'use client';

export default function BillingShell({ title = "Billing", subtitle, sidebar, children }) {
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "1.25rem" }}>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "1rem", marginBottom: "1rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.75rem", lineHeight: 1.2 }}>{title}</h1>
          {subtitle && <p style={{ margin: "0.35rem 0 0", opacity: 0.75 }}>{subtitle}</p>}
        </div>
      </div>

      {/* Content grid */}
      <div style={{ display: "grid", gap: "1rem" }}>
        <div style={{ display: "grid", gap: "1rem" }}>
          {/* On wide screens, make two columns */}
          <style>{`
            @media (min-width: 960px) {
              .billing-grid {
                display: grid;
                grid-template-columns: 2fr 1fr;
                gap: 1rem;
              }
            }
          `}</style>

          <div className="billing-grid">
            {/* MAIN */}
            <div style={card()}>
              {children}
            </div>

            {/* SIDEBAR (optional) */}
            {sidebar && (
              <aside style={card()}>
                {sidebar}
              </aside>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* --- Pretty helpers you can reuse --- */

export function Section({ title, children, actions }) {
  return (
    <section style={{ display: "grid", gap: "0.75rem", marginBottom: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {title && <h2 style={{ margin: 0, fontSize: "1.25rem" }}>{title}</h2>}
        {actions}
      </div>
      {children}
    </section>
  );
}

export function TableList({ children, header }) {
  return (
    <div>
      {header && <div style={{ ...row(), fontWeight: 600, opacity: 0.85 }}>{header}</div>}
      <div style={{ borderTop: "1px solid #f0f0f0" }}>
        {children}
      </div>
    </div>
  );
}

export function Row({ left, middle, right }) {
  return (
    <div style={row()}>
      <div>{left}</div>
      <div style={{ textAlign: "right" }}>{middle}</div>
      <div style={{ textAlign: "right" }}>{right}</div>
    </div>
  );
}

export function Button({ children, onClick, variant = "primary", ...props }) {
  const styles = {
    base: {
      padding: "0.55rem 0.9rem",
      borderRadius: 10,
      cursor: "pointer",
      border: "1px solid transparent",
    },
    primary: { background: "#333", color: "#fff", borderColor: "#333" },
    outline: { background: "#fff", color: "#333", borderColor: "#ddd" },
    subtle: { background: "#fafafa", color: "#333", borderColor: "#eee" },
  };
  const style = { ...styles.base, ...(styles[variant] || styles.primary) };
  return (
    <button onClick={onClick} style={style} {...props}>
      {children}
    </button>
  );
}

export const muted = { opacity: 0.7, fontSize: 13 };

/* --- styling primitives --- */
function card() {
  return {
    border: "1px solid #eee",
    borderRadius: 14,
    padding: "1rem",
    background: "#fff",
    boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
  };
}
function row() {
  return {
    display: "grid",
    gridTemplateColumns: "1fr auto auto",
    gap: "0.75rem",
    alignItems: "center",
    padding: "0.7rem 0.25rem",
    borderBottom: "1px solid #f5f5f5",
  };
}
