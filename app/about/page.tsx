import Link from "next/link";

export default function About() {
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "48px 20px" }}>
      <h1>About Foundly</h1>
      <p><strong>What we're building:</strong> Milo builds your website, puts it online, and runs the business with you.</p>
      <p><strong>Who it's for:</strong> Small businesses, creators and side projects. Milo keeps working while you sleep.</p>
      <p><strong>What drives us:</strong> Ideas that become real businesses, and owners who get their first customers.</p>
      <p><strong>Why we started:</strong> Good ideas stall in the work that comes after them. A website is only the start — then come customers, a price, and a way to get paid. Foundly hands that work to Milo.</p>

      <h2>What Milo does today</h2>
      <ul>
        <li>Builds your website and puts it online</li>
        <li>Makes your logo and business email</li>
        <li>Writes to stores and customers</li>
        <li>Drafts your social posts</li>
        <li>Sets up a way to get paid through Stripe</li>
      </ul>

      <h2>How we build</h2>
      <ul>
        <li><strong>Milo does the work.</strong> You describe the business. He builds it, writes for it and reaches out for it.</li>
        <li><strong>You see him work.</strong> What Milo is doing and thinking is on screen while he works.</li>
        <li><strong>Proof before polish.</strong> A first real customer beats a perfect page.</li>
      </ul>

      <p style={{ marginTop: 32 }}>
        <Link href="/sign-up?returnTo=%2Fline" style={{ background: "#111", color: "#fff", padding: "12px 20px", borderRadius: 10, textDecoration: "none", fontWeight: 700 }}>
          Start with your idea
        </Link>
      </p>
    </div>
  );
}
