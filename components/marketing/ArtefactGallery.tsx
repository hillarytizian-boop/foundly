// The "made for your business" gallery. Static, image-free mockups of the
// artefacts the agent team actually produces (see lib/capabilities.ts).

const ARTEFACTS = [
  {
    eyebrow: "Visual identity",
    title: "Your brand, from day one",
    sub: "A logo, colours and fonts, used everywhere Milo works.",
    body: (
      <>
        <div className="mk-brandbox">AFTERHOURS</div>
        <div className="mk-swatch-row">
          <div style={{ background: "#020617", color: "#fff" }}>Noir</div>
          <div style={{ background: "#fffbeb", color: "#0f172a", border: "1px solid #e2e8f0" }}>Bone</div>
          <div style={{ background: "#064e3b", color: "#fff" }}>Sage</div>
          <div style={{ background: "#0369a1", color: "#fff" }}>Cobalt</div>
        </div>
      </>
    ),
  },
  {
    eyebrow: "Social marketing",
    title: "Posts with pictures",
    sub: "Written and sized for each network.",
    body: (
      <>
        <div className="mk-post">
          <div className="mk-post-head"><i />afterhours_supply</div>
          <div className="mk-post-img">[Product hero mockup]</div>
          <p>&ldquo;Night Shift drops Friday, 9 PM. Six colourways, one run.&rdquo;</p>
        </div>
        <div className="mk-art-foot">
          <span className="wait">Waiting for your OK</span>
          <span className="link">Approve post →</span>
        </div>
      </>
    ),
  },
  {
    eyebrow: "Presentations",
    title: "A deck when you need one",
    sub: "For a pitch, a stockist or a retail partner.",
    body: (
      <div className="mk-deck">
        <div className="meta"><span>DECK_WHOLESALE_v2.PDF</span><span>14 SLIDES</span></div>
        <b>Wholesale line sheet — Spring 2026</b>
        <p>Exported with SKU numbers, wholesale margin tables and sample pack terms.</p>
      </div>
    ),
  },
  {
    eyebrow: "Competitive intel",
    title: "Research you can act on",
    sub: "What the market does, with sources cited.",
    body: (
      <div className="mk-intel">
        <div style={{ fontWeight: 750, color: "#0f172a", marginBottom: 4 }}>Competitor price snapshot (Nairobi)</div>
        <div className="row"><span>Avg retail price</span><b>$128.00</b></div>
        <div className="row"><span>Suggested margin</span><b className="good">62% gross</b></div>
        <div className="src">7 verified boutique stockists cited</div>
      </div>
    ),
  },
];

const ROWS = [
  ["Heavy hoodie", "Noir", "120", "102", "$11,730.00"],
  ["Boxy tee", "Raw bone", "80", "58", "$3,190.00"],
  ["Thermal pant", "Sage", "60", "56", "$5,320.00"],
];

export default function ArtefactGallery() {
  return (
    <section className="mk-wrap" id="solutions" style={{ padding: "62px 20px" }}>
      <div style={{ textAlign: "center", maxWidth: 620, margin: "0 auto 30px" }}>
        <span className="mk-eyebrow">Autonomous deliverables</span>
        <h2 className="mk-h2" style={{ margin: "8px auto 10px" }}>Made for your business.</h2>
        <p className="mk-lead" style={{ margin: "0 auto" }}>
          Not templates. Everything Milo makes starts from your brief, your prices and your audience.
        </p>
      </div>

      <div className="mk-artefacts">
        {ARTEFACTS.map((a) => (
          <div key={a.title} className="mk-card">
            <div className="mk-art-head">{a.eyebrow}</div>
            <div className="mk-art-title">{a.title}</div>
            <p className="mk-art-sub">{a.sub}</p>
            <div className="mk-art-body">{a.body}</div>
          </div>
        ))}

        <div className="mk-card wide">
          <div className="mk-art-head">Ops &amp; ledger</div>
          <div className="mk-art-title">Sheets that add up</div>
          <p className="mk-art-sub">Stock, orders and costs, laid out clearly in real time.</p>
          <div className="mk-art-body" style={{ overflowX: "auto" }}>
            <table className="mk-table">
              <thead>
                <tr>
                  <th>SKU item</th><th>Colourway</th><th>Produced</th><th>Sold</th><th style={{ textAlign: "right" }}>Net revenue</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r) => (
                  <tr key={r[0]}>
                    <td>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td>
                    <td className="num">{r[4]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
