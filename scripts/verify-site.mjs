#!/usr/bin/env node
/**
 * End-to-end live verification for creditharvest.risconlabs.com & hallucgate.risconlabs.com
 * Verifies:
 * 1. HTTP 200 on both custom domains + Field skin & WebGL scripts loaded
 * 2. /data/treasury.json has 16 verified programs + pre-filled form URLs
 * 3. POST /api/audit (HALLUC-GATE mechanical auditor)
 * 4. POST /api/inbound-email (Post-Submission SLA & Auto-Reply generator)
 * 5. POST /api/reapply-delta (Cycle rollover live git delta compiler)
 * 6. /.git/HEAD is blocked (HTTP 404)
 */
const DOMAINS = [
  "https://creditharvest.risconlabs.com",
  "https://hallucgate.risconlabs.com",
];

async function check() {
  for (const base of DOMAINS) {
    const res = await fetch(base);
    if (res.status !== 200) throw new Error(`${base} returned HTTP ${res.status}`);
    const html = await res.text();
    for (const marker of ["fx-field", "riscon-field.js", "riscon-cosmos.js", "PROG-ANTH-SCI", "HALLUC-GATE"]) {
      if (!html.includes(marker)) throw new Error(`${base} missing marker: ${marker}`);
    }
    console.log(`[PASS] ${base} -> HTTP 200 (${html.length} chars, Field Skin + WebGL active)`);
  }

  const dataRes = await fetch("https://creditharvest.risconlabs.com/data/treasury.json");
  if (dataRes.status !== 200) throw new Error(`/data/treasury.json returned ${dataRes.status}`);
  const data = await dataRes.json();
  if (!Array.isArray(data.programs) || data.programs.length !== 16) {
    throw new Error(`Expected 16 programs in treasury.json, found ${data.programs?.length}`);
  }
  console.log(`[PASS] /data/treasury.json -> 16 programs, ${data.metrics.prefill_ready_count} 1-click prefill forms`);

  // Test POST /api/audit
  const auditRes = await fetch("https://hallucgate.risconlabs.com/api/audit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [
        { id: "t1", original: "Same text", fix: "Same text", source_quote: "Quote A" },
        { id: "t2", original: "Old text", fix: "Corrected text", source_quote: "Quote B" },
      ],
    }),
  });
  const auditJson = await auditRes.json();
  if (auditJson.soft_null_count !== 1 || auditJson.verdict !== "REJECT_RETURN_TO_SPARK") {
    throw new Error(`Unexpected /api/audit response: ${JSON.stringify(auditJson)}`);
  }
  console.log(`[PASS] POST /api/audit -> ${auditJson.receipt_id} (${auditJson.verdict})`);

  // Test POST /api/inbound-email
  const inboundRes = await fetch("https://creditharvest.risconlabs.com/api/inbound-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      program_id: "PROG-ANTH-SCI",
      subject: "Congratulations! Anthropic AI for Science Application Update",
      body: "Please reply within 5 business days and submit the Compliance Affidavit within 14 days.",
      org_id: "org-riscon-verified",
      email: "riscon.ai@gmail.com",
    }),
  });
  const inboundJson = await inboundRes.json();
  if (inboundJson.classification !== "APPROVAL_AFFIDAVIT_SLA" || inboundJson.recommended_stage !== "AFFIDAVIT_SLA_5D") {
    throw new Error(`Unexpected /api/inbound-email response: ${JSON.stringify(inboundJson)}`);
  }
  console.log(`[PASS] POST /api/inbound-email -> ${inboundJson.triage_id} (${inboundJson.classification}, SLA: ${inboundJson.sla_reply_by})`);

  // Test POST /api/reapply-delta
  const deltaRes = await fetch("https://creditharvest.risconlabs.com/api/reapply-delta", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ program_id: "PROG-ANTH-SCI" }),
  });
  const deltaJson = await deltaRes.json();
  if (!deltaJson.delta_id || !deltaJson.delta_brief.includes("dc04c34")) {
    throw new Error(`Unexpected /api/reapply-delta response: ${JSON.stringify(deltaJson)}`);
  }
  console.log(`[PASS] POST /api/reapply-delta -> ${deltaJson.delta_id}`);

  // Verify /.git/HEAD is blocked
  const gitRes = await fetch("https://creditharvest.risconlabs.com/.git/HEAD");
  if (gitRes.status === 200) throw new Error(`/.git/HEAD is exposed!`);
  console.log(`[PASS] /.git/HEAD blocked -> HTTP ${gitRes.status}`);
}

check().catch((err) => {
  console.error("[FAIL]", err.message);
  process.exit(1);
});
