// creditharvest.risconlabs.com & hallucgate.risconlabs.com — Worker `riscon-credit-harvest` (2026-10-22)
//
// Serves static assets via ASSETS binding and provides `/api/audit` for S95 HALLUC-GATE
// Zero-LLM-Cost Mechanical Soft-Null & Citation Integrity Verification.

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function handleAuditRequest(request) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }
  if (request.method !== "POST") {
    return Response.json({ error: "Method Not Allowed. Use POST /api/audit" }, { status: 405 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const rawInput = typeof body.raw === "string" ? body.raw.trim() : JSON.stringify(body.items || []);
  const maxLenDefault = Number(body.max_len || 95);
  let items = [];

  if (Array.isArray(body.items)) {
    items = body.items;
  } else if (rawInput) {
    try {
      const parsed = JSON.parse(rawInput);
      items = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      // Parse as JSONL
      const lines = rawInput.split(/\r?\n/).filter((l) => l.trim());
      for (const line of lines) {
        try {
          items.push(JSON.parse(line));
        } catch {
          items.push({ id: `line-${items.length + 1}`, original: "", fix: line, source_quote: "INLINE_TEXT" });
        }
      }
    }
  }

  let softNulls = 0;
  let missingQuotes = 0;
  let lengthViolations = 0;
  let findingsLeaks = 0;
  let passed = 0;
  const defects = [];

  items.forEach((item, idx) => {
    const id = String(item.custom_id || item.id || `item-${idx + 1}`);
    const orig = String(item.original || item.source || "").trim();
    const fix = item.fix;
    const quote = item.source_quote;
    const maxLen = Number(item.max_len || maxLenDefault);

    if ("findings" in item) {
      findingsLeaks += 1;
      defects.push({ id, rule: "V8_FINDINGS_CONTAMINATION", detail: "Output object contains unstripped `findings` array." });
      return;
    }

    if (fix === null || fix === undefined) {
      passed += 1;
      return;
    }

    const fixStr = String(fix).trim();

    if ("source_quote" in item && (quote === null || quote === undefined || ["", "None", "null"].includes(String(quote).trim()))) {
      missingQuotes += 1;
      defects.push({ id, rule: "V10_MISSING_SOURCE_QUOTE", detail: "Non-null fix lacks a verifiable `source_quote` anchor." });
      return;
    }

    if (orig && fixStr === orig) {
      softNulls += 1;
      defects.push({ id, rule: "V10_SOFT_NULL_EVASION", detail: "Model copied original text (`fix == original`) to evade correction rubric." });
      return;
    }

    if ("original" in item && fixStr.length > maxLen) {
      lengthViolations += 1;
      defects.push({ id, rule: "V8_LENGTH_EXCEEDED", detail: `Fix length (${fixStr.length} chars) exceeds limit (${maxLen} chars).` });
      return;
    }

    passed += 1;
  });

  const totalDefects = softNulls + missingQuotes + lengthViolations + findingsLeaks;
  const verdict = totalDefects === 0 ? "PASS_CERTIFIED" : "REJECT_RETURN_TO_SPARK";
  const sha256 = await sha256Hex(rawInput || JSON.stringify(items));
  const nowIso = new Date().toISOString();
  const stamp = nowIso.replace(/[-:T.Z]/g, "").slice(0, 14);
  const receiptId = `HG-${stamp}-${sha256.slice(0, 8).toUpperCase()}`;

  return Response.json(
    {
      receipt_id: receiptId,
      audited_at: nowIso,
      total_items: items.length,
      passed_items: passed,
      soft_null_count: softNulls,
      missing_quote_count: missingQuotes,
      length_violation_count: lengthViolations,
      findings_leak_count: findingsLeaks,
      verdict,
      sha256_hash: sha256,
      defects,
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
    }
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/audit") {
      return handleAuditRequest(request);
    }
    return env.ASSETS.fetch(request);
  },
};
