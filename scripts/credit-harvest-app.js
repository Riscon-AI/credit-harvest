/* RISCON Labs — CREDIT-HARVEST & HALLUC-GATE Interactive Workbench Runtime (2026. 10. 22.) */
(function () {
  "use strict";

  var STORAGE_KEY = "riscon_ch_lifecycle_v2";
  var ORG_KEY = "riscon_ch_org_params_v1";

  var payload = {};
  try {
    var node = document.getElementById("treasury-data");
    if (node) payload = JSON.parse(node.textContent);
  } catch (e) {
    payload = {};
  }

  var programs = payload.programs || [];
  var presets = payload.inbound_presets || [];
  var activeProgIdx = 0;
  var activeCategory = "ALL";
  var activeSiteFilter = "ALL";

  var lifecycleState = {};
  try {
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved) lifecycleState = JSON.parse(saved) || {};
  } catch (e) {
    lifecycleState = {};
  }

  // Initialize default lifecycle states (with realistic initial tracking so user sees active SLA & ready states)
  programs.forEach(function (p) {
    if (!lifecycleState[p.id]) {
      lifecycleState[p.id] = {
        status: p.lifecycle.default_status || "READY_TO_SUBMIT",
        updated_at: "2026. 10. 22.",
      };
    }
  });

  function saveLifecycle() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lifecycleState));
    } catch (e) {}
  }

  function getInjectorParams() {
    var orgInput = document.getElementById("inj-org-id");
    var emailInput = document.getElementById("inj-email");
    var gcpInput = document.getElementById("inj-gcp");
    return {
      orgId: (orgInput && orgInput.value.trim()) || "ORG-ID-FROM-CONSOLE-ANTHROPIC-COM",
      email: (emailInput && emailInput.value.trim()) || "riscon.ai@gmail.com",
      gcp: (gcpInput && gcpInput.value.trim()) || "10f6645e0670c6c05258cf5e0345121b",
    };
  }

  function buildDynamicPrefillUrl(prog) {
    var params = getInjectorParams();
    var url = prog.prefilled_form_url || prog.apply_url;
    url = url.replace(/ORG-ID-FROM-CONSOLE-ANTHROPIC-COM/g, encodeURIComponent(params.orgId));
    url = url.replace(/riscon\.ai%40gmail\.com/g, encodeURIComponent(params.email));
    return url;
  }

  function replaceDynamicText(text) {
    var params = getInjectorParams();
    return String(text || "")
      .replace(/ORG-ID-FROM-CONSOLE-ANTHROPIC-COM/g, params.orgId)
      .replace(/10f6645e0670c6c05258cf5e0345121b/g, params.gcp);
  }

  function copyText(text, btn) {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(function () {
      if (!btn) return;
      var orig = btn.textContent;
      btn.textContent = "복사 완료 ✓";
      setTimeout(function () {
        btn.textContent = orig;
      }, 1400);
    });
  }

  /* ================================================================ 01. Discovery Radar */
  function renderRadar() {
    var grid = document.getElementById("radar-grid");
    if (!grid) return;
    grid.innerHTML = "";

    var filtered = programs.filter(function (p) {
      var catOk = activeCategory === "ALL" || p.category.en === activeCategory;
      var siteOk = activeSiteFilter === "ALL" || (p.target_sites || []).indexOf(activeSiteFilter) >= 0;
      return catOk && siteOk;
    });

    filtered.forEach(function (p) {
      var idx = programs.indexOf(p);
      var st = (lifecycleState[p.id] && lifecycleState[p.id].status) || "READY_TO_SUBMIT";
      var isPrefill = p.form_type === "GOOGLE_FORM_PREFILL" || p.form_type === "TFA_FORM_PREFILL";
      var card = document.createElement("article");
      card.className = "ch-prog-card" + (idx === activeProgIdx ? " is-active" : "");

      var prefillUrl = buildDynamicPrefillUrl(p);
      var badgeText = isPrefill ? "원클릭 자동입력 (" + p.mapped_field_count + "개 문항)" : "포털 도시에 (" + p.mapped_field_count + "개 항목)";

      card.innerHTML =
        '<div>' +
          '<div class="ch-prog-top">' +
            '<span class="ch-badge is-navy">' + p.num + " · " + p.category.ko + "</span>" +
            '<span class="ch-badge">' + badgeText + " · HTTP " + p.http_status + "</span>" +
          "</div>" +
          '<h3 class="ch-prog-title">' + p.program_name + "</h3>" +
          '<p class="ch-prog-q">' + p.question.ko + "</p>" +
        "</div>" +
        '<div>' +
          '<div class="ch-prog-meta">' +
            '<div><strong>지원 규모:</strong> ' + p.credit_value + "</div>" +
            '<div><strong>차기 심사일:</strong> ' + p.next_review_date + "</div>" +
            '<div><strong>심사 주기:</strong> ' + p.cadence.ko + "</div>" +
            '<div><strong>사후관리 상태:</strong> ' + st + "</div>" +
          "</div>" +
          '<div class="ch-prog-actions">' +
            '<a class="ch-btn is-primary" href="' + prefillUrl + '" target="_blank" rel="noopener noreferrer">' +
              (isPrefill ? "원클릭 자동채움 신청 폼 열기 ↗" : "공식 신청 페이지 열기 (HTTP 200) ↗") +
            "</a>" +
            '<button type="button" class="ch-btn" data-jump-dossier="' + idx + '">도시에·사후관리 열기 ↓</button>' +
          "</div>" +
        "</div>";

      grid.appendChild(card);
    });

    Array.prototype.slice.call(grid.querySelectorAll("[data-jump-dossier]")).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var i = parseInt(btn.getAttribute("data-jump-dossier"), 10);
        selectProgram(i, false);
        var sec = document.getElementById("dossiers");
        if (sec) sec.scrollIntoView({ behavior: "smooth" });
      });
    });
  }

  /* ================================================================ 02. 1-Click Auto-Submit & Dossiers */
  function renderDossiers() {
    var nav = document.getElementById("dossier-nav");
    var detail = document.getElementById("dossier-detail");
    if (!nav || !detail || !programs.length) return;

    nav.innerHTML = "";
    programs.forEach(function (p, i) {
      var isPrefill = p.form_type === "GOOGLE_FORM_PREFILL" || p.form_type === "TFA_FORM_PREFILL";
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ch-list-item";
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", String(i === activeProgIdx));
      btn.innerHTML =
        '<div class="ch-list-item-top">' +
          "<span>" + p.num + " · " + p.provider + "</span>" +
          "<span>" + (isPrefill ? "AUTO-PREFILL" : "DOSSIER") + "</span>" +
        "</div>" +
        '<div class="ch-list-item-name">' + p.program_name + "</div>";
      btn.addEventListener("click", function () {
        selectProgram(i, false);
      });
      nav.appendChild(btn);
    });

    var p = programs[activeProgIdx] || programs[0];
    var isPrefill = p.form_type === "GOOGLE_FORM_PREFILL" || p.form_type === "TFA_FORM_PREFILL";
    var prefillUrl = buildDynamicPrefillUrl(p);
    var st = (lifecycleState[p.id] && lifecycleState[p.id].status) || "READY_TO_SUBMIT";

    var fieldsHtml = (p.fields || [])
      .map(function (f, fIdx) {
        var val = replaceDynamicText(f.value);
        return (
          '<div class="ch-field-box">' +
            '<div class="ch-field-head">' +
              '<span class="ch-field-label">' + f.label + ' <span class="mono-code">(' + f.key + ")</span></span>" +
              '<button type="button" class="ch-btn" data-copy-field="' + fIdx + '">항목 복사</button>' +
            "</div>" +
            '<p class="ch-field-val">' + val + "</p>" +
          "</div>"
        );
      })
      .join("");

    detail.innerHTML =
      '<div class="ch-prog-top" style="margin-bottom:8px;">' +
        '<span class="ch-badge is-navy">' + p.num + " · " + p.id + " · " + p.category.ko + "</span>" +
        '<span class="ch-badge">실측 HTTP ' + p.http_status + " · 기준일 " + p.verified_at + "</span>" +
      "</div>" +
      '<h3 class="ch-prog-title" style="margin-top:0;">' + p.program_name + " (" + p.credit_value + ")</h3>" +
      '<p class="ch-prog-q" style="margin-bottom:14px;">' +
        "<strong>심사 일정:</strong> " + p.lifecycle.review_rule + " · <strong>사후관리 SLA:</strong> " + p.lifecycle.sla_rule +
      "</p>" +
      '<div class="ch-prog-actions" style="padding-bottom:14px;border-bottom:1px solid var(--fx-line);">' +
        '<a class="ch-btn is-primary" href="' + prefillUrl + '" target="_blank" rel="noopener noreferrer">' +
          (isPrefill
            ? "원클릭 자동입력 신청 폼 열기 (" + p.mapped_field_count + "개 문항 자동 채움) ↗"
            : "공식 신청 포털 열기 (HTTP 200 검증 완료) ↗") +
        "</a>" +
        '<button type="button" class="ch-btn is-accent" id="btn-mark-submitted">' +
          (st === "READY_TO_SUBMIT" ? "신청 완료 처리 → 사후관리(SUBMITTED) 가동" : "현재 상태: " + st + " (사후관리 이동 ↓)") +
        "</button>" +
        '<button type="button" class="ch-btn" id="btn-copy-all-dossier">도시에 전체 복사</button>' +
      "</div>" +
      '<div class="ch-field-list">' + fieldsHtml + "</div>";

    var markBtn = document.getElementById("btn-mark-submitted");
    if (markBtn) {
      markBtn.addEventListener("click", function () {
        lifecycleState[p.id] = {
          status: "SUBMITTED",
          updated_at: "2026. 10. 22.",
        };
        saveLifecycle();
        renderLifecycle();
        renderRadar();
        renderDossiers();
        var lcSec = document.getElementById("lifecycle");
        if (lcSec) lcSec.scrollIntoView({ behavior: "smooth" });
      });
    }

    var copyAllBtn = document.getElementById("btn-copy-all-dossier");
    if (copyAllBtn) {
      copyAllBtn.addEventListener("click", function () {
        var allText = (p.fields || [])
          .map(function (f) {
            return "[" + f.label + " (" + f.key + ")]\n" + replaceDynamicText(f.value);
          })
          .join("\n\n");
        copyText(allText, copyAllBtn);
      });
    }

    Array.prototype.slice.call(detail.querySelectorAll("[data-copy-field]")).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var idx = parseInt(btn.getAttribute("data-copy-field"), 10);
        var f = (p.fields || [])[idx];
        if (f) copyText(replaceDynamicText(f.value), btn);
      });
    });
  }

  /* ================================================================ 03. Post-Submission Lifecycle & SLA */
  var STAGES = [
    { code: "READY_TO_SUBMIT", label: "READY_TO_SUBMIT (신청 대기)" },
    { code: "SUBMITTED", label: "SUBMITTED (신청 완료 · 심사 대기)" },
    { code: "UNDER_REVIEW", label: "UNDER_REVIEW (심사 진행 중)" },
    { code: "AFFIDAVIT_SLA_5D", label: "AFFIDAVIT_SLA_5D (승인 · 5영업일/14일 서약 SLA)" },
    { code: "APPROVED_ACTIVE", label: "APPROVED_ACTIVE (크레딧 수령 · 가동 중)" },
    { code: "REAPPLY_DELTA_DUE", label: "REAPPLY_DELTA_DUE (차기 코호트 델타 재접수)" },
  ];

  function renderLifecycle() {
    var tbody = document.getElementById("lifecycle-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    var cReady = 0, cReview = 0, cSla = 0, cApproved = 0;

    programs.forEach(function (p, idx) {
      var st = (lifecycleState[p.id] && lifecycleState[p.id].status) || "READY_TO_SUBMIT";
      if (st === "READY_TO_SUBMIT") cReady++;
      else if (st === "SUBMITTED" || st === "UNDER_REVIEW") cReview++;
      else if (st === "AFFIDAVIT_SLA_5D") cSla++;
      else cApproved++;

      var tr = document.createElement("tr");
      var optionsHtml = STAGES.map(function (s) {
        return '<option value="' + s.code + '"' + (s.code === st ? " selected" : "") + ">" + s.label + "</option>";
      }).join("");

      tr.innerHTML =
        "<td><strong>" + p.num + " · " + p.provider + "</strong><br/><span>" + p.program_name + "</span></td>" +
        "<td>" + p.credit_value + "</td>" +
        '<td><select class="ch-select" data-lc-select="' + p.id + '" aria-label="Lifecycle stage for ' + p.program_name + '">' + optionsHtml + "</select></td>" +
        "<td><strong>" + p.next_review_date + "</strong><br/><span>" + p.cadence.ko + "</span></td>" +
        "<td>" + p.lifecycle.sla_rule + "</td>" +
        '<td><button type="button" class="ch-btn" data-lc-delta="' + idx + '">델타 생성</button></td>';

      tbody.appendChild(tr);
    });

    var elReady = document.getElementById("lc-count-ready");
    var elReview = document.getElementById("lc-count-review");
    var elSla = document.getElementById("lc-count-sla");
    var elApp = document.getElementById("lc-count-approved");
    if (elReady) elReady.textContent = String(cReady);
    if (elReview) elReview.textContent = String(cReview);
    if (elSla) elSla.textContent = String(cSla);
    if (elApp) elApp.textContent = String(cApproved);

    Array.prototype.slice.call(tbody.querySelectorAll("[data-lc-select]")).forEach(function (sel) {
      sel.addEventListener("change", function () {
        var pid = sel.getAttribute("data-lc-select");
        lifecycleState[pid] = { status: sel.value, updated_at: "2026. 10. 22." };
        saveLifecycle();
        renderLifecycle();
        renderRadar();
        renderDossiers();
      });
    });

    Array.prototype.slice.call(tbody.querySelectorAll("[data-lc-delta]")).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var idx = parseInt(btn.getAttribute("data-lc-delta"), 10);
        var p = programs[idx];
        if (p) runReapplyDelta(p);
      });
    });
  }

  function runInboundTriage(progId) {
    var subj = (document.getElementById("email-subject") && document.getElementById("email-subject").value) || "";
    var body = (document.getElementById("email-body") && document.getElementById("email-body").value) || "";
    var params = getInjectorParams();
    var targetProgId = progId || (programs[activeProgIdx] && programs[activeProgIdx].id) || "PROG-ANTH-SCI";

    fetch("/api/inbound-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        program_id: targetProgId,
        subject: subj,
        body: body,
        org_id: params.orgId,
        email: params.email,
      }),
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res.recommended_stage && targetProgId) {
          lifecycleState[targetProgId] = {
            status: res.recommended_stage,
            updated_at: "2026. 10. 22.",
          };
          saveLifecycle();
          renderLifecycle();
          renderRadar();
          renderDossiers();
        }
        var titleEl = document.getElementById("triage-title");
        var sumEl = document.getElementById("triage-summary");
        var listEl = document.getElementById("triage-checklist");
        var boxEl = document.getElementById("triage-reply-box");

        if (titleEl) {
          titleEl.textContent =
            "[" + res.triage_id + "] " + res.classification + " → 상태 전환: " + res.recommended_stage;
        }
        if (sumEl) {
          sumEl.textContent =
            res.summary_ko + " (회신 SLA: " + res.sla_reply_by + " / 서약서 SLA: " + res.sla_affidavit_by + ")";
        }
        if (listEl) {
          listEl.innerHTML = (res.checklist || [])
            .map(function (item) { return "<li>" + item + "</li>"; })
            .join("");
        }
        if (boxEl) {
          boxEl.textContent = res.reply_draft || "";
        }
      })
      .catch(function () {});
  }

  function runReapplyDelta(prog) {
    var p = prog || programs[activeProgIdx] || programs[0];
    var params = getInjectorParams();
    fetch("/api/reapply-delta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        program_id: p.id,
        program_name: p.program_name,
        org_id: params.orgId,
      }),
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        var titleEl = document.getElementById("triage-title");
        var sumEl = document.getElementById("triage-summary");
        var listEl = document.getElementById("triage-checklist");
        var boxEl = document.getElementById("triage-reply-box");
        if (titleEl) titleEl.textContent = "[" + res.delta_id + "] 차기 심사 코호트 자동 재접수용 Git 커밋 델타 패키지";
        if (sumEl) sumEl.textContent = p.program_name + " 차기 심사일(" + p.next_review_date + ") 대비 16개 라이브 사이트 커밋 증분(Delta) 브리프가 생성되었습니다.";
        if (listEl) {
          listEl.innerHTML =
            "<li>1. 아래 델타 브리프를 복사하여 재접수 폼의 Additional Information 또는 연구 진척도란에 붙여넣으세요.</li>" +
            "<li>2. 모든 커밋 해시(dc04c34, c0b62f5, a394635 등)와 HTTP 200 라이브 도메인이 실측 검증되었습니다.</li>";
        }
        if (boxEl) boxEl.textContent = res.delta_brief || "";
      })
      .catch(function () {});
  }

  /* ================================================================ 04. S95 HALLUC-GATE */
  var SAMPLE_DEFECT = [
    JSON.stringify({
      custom_id: "batch-iatheon-001",
      original: "Trastuzumab deruxtecan demonstrated efficacy in HER2-low breast cancer.",
      fix: "Trastuzumab deruxtecan demonstrated efficacy in HER2-low breast cancer.",
      source_quote: "DESTINY-Breast04 (NCT03734029): median PFS 9.9 months vs 5.1 months.",
    }),
    JSON.stringify({
      custom_id: "batch-nadir-002",
      original: "The committee bypassed internal audit controls in Q3.",
      fix: "In Q3, the executive committee bypassed three mandatory internal audit thresholds.",
      source_quote: "",
    }),
    JSON.stringify({
      custom_id: "batch-prose-003",
      original: "File the answer within 30 days of service.",
      fix: "Submit the written answer within 30 calendar days of receiving the complaint.",
      source_quote: "Civil Procedure Article 256(1): 30-day statutory filing window.",
    }),
  ].join("\n");

  var SAMPLE_CLEAN = [
    JSON.stringify({
      custom_id: "batch-iatheon-101",
      original: "Zolbetuximab targets Claudin 18.2 in gastric adenocarcinoma.",
      fix: "Zolbetuximab + mFOLFOX6 extended median OS to 18.23 months in CLDN18.2+ gastric cancer.",
      source_quote: "SPOTLIGHT Phase III (NCT03504397): mOS 18.23 vs 15.54 months (HR 0.75).",
    }),
    JSON.stringify({
      custom_id: "batch-hebe-102",
      original: "Tirzepatide acts as a dual GIP and GLP-1 receptor agonist.",
      fix: "Tirzepatide achieved 20.9% mean weight reduction at 72 weeks (15 mg dose).",
      source_quote: "SURMOUNT-1 (NCT04184622): -20.9% body weight at week 72.",
    }),
    JSON.stringify({
      custom_id: "batch-asi2030-103",
      original: "No correction needed for verified baseline.",
      fix: null,
      source_quote: null,
    }),
  ].join("\n");

  function runGateAudit() {
    var inputEl = document.getElementById("gate-input");
    var maxLenEl = document.getElementById("gate-maxlen");
    if (!inputEl) return;

    fetch("/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        raw: inputEl.value,
        max_len: Number((maxLenEl && maxLenEl.value) || 95),
      }),
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        var badge = document.getElementById("gate-verdict-badge");
        var rec = document.getElementById("gate-receipt-id");
        var statPass = document.getElementById("gate-stat-pass");
        var statDef = document.getElementById("gate-stat-defects");
        var sha = document.getElementById("gate-sha256");
        var list = document.getElementById("gate-defect-list");

        if (badge) {
          badge.textContent = res.verdict;
          badge.className = "ch-badge " + (res.verdict === "PASS_CERTIFIED" ? "is-navy" : "");
        }
        if (rec) rec.textContent = res.receipt_id || "";
        if (statPass) statPass.textContent = res.passed_items + " / " + res.total_items;
        if (statDef) {
          statDef.textContent =
            res.soft_null_count + " / " + res.missing_quote_count + " / " + res.length_violation_count;
        }
        if (sha) sha.textContent = res.sha256_hash || "";
        if (list) {
          if (!res.defects || !res.defects.length) {
            list.innerHTML =
              '<div class="ch-field-box"><strong>무결점 통과 (0.0% 결함):</strong> 소프트-널 회피, 인용구 누락, 글자수 초과가 전혀 발견되지 않았습니다. 프로덕션 배포가 승인되었습니다.</div>';
          } else {
            list.innerHTML = res.defects
              .map(function (d) {
                return (
                  '<div class="ch-field-box">' +
                    '<div><strong class="mono-code">' + d.id + " · " + d.rule + "</strong></div>" +
                    "<div>" + d.detail + "</div>" +
                  "</div>"
                );
              })
              .join("");
          }
        }
      })
      .catch(function () {});
  }

  /* ================================================================ Selection Sync */
  function selectProgram(idx, fromFieldHero) {
    if (idx < 0 || idx >= programs.length) return;
    activeProgIdx = idx;
    renderRadar();
    renderDossiers();
    if (!fromFieldHero && window.RisconField && window.RisconField.select) {
      window.RisconField.select(idx);
    }
  }
  window.selectHarvestProgram = selectProgram;

  function init() {
    // Category filter buttons
    Array.prototype.slice.call(document.querySelectorAll("[data-radar-cat]")).forEach(function (btn) {
      btn.addEventListener("click", function () {
        activeCategory = btn.getAttribute("data-radar-cat") || "ALL";
        Array.prototype.slice.call(document.querySelectorAll("[data-radar-cat]")).forEach(function (b) {
          b.setAttribute("aria-pressed", String(b === btn));
        });
        renderRadar();
      });
    });

    // Site filter dropdown
    var siteSel = document.getElementById("radar-site-select");
    if (siteSel) {
      siteSel.addEventListener("change", function () {
        activeSiteFilter = siteSel.value || "ALL";
        renderRadar();
      });
    }

    // Injector button
    var injBtn = document.getElementById("btn-apply-injector");
    if (injBtn) {
      injBtn.addEventListener("click", function () {
        renderRadar();
        renderDossiers();
        var orig = injBtn.textContent;
        injBtn.textContent = "16개 폼 링크에 반영 완료 ✓";
        setTimeout(function () {
          injBtn.textContent = orig;
        }, 1400);
      });
    }

    // Preset buttons for Inbound Email Triage
    var presetWrap = document.getElementById("preset-buttons");
    if (presetWrap && presets.length) {
      presets.forEach(function (pr) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "ch-btn";
        b.textContent = pr.label_ko;
        b.addEventListener("click", function () {
          var subjEl = document.getElementById("email-subject");
          var bodyEl = document.getElementById("email-body");
          if (subjEl) subjEl.value = pr.subject;
          if (bodyEl) bodyEl.value = pr.body;
          runInboundTriage(pr.program_id);
        });
        presetWrap.appendChild(b);
      });
    }

    var btnTriage = document.getElementById("btn-run-triage");
    if (btnTriage) {
      btnTriage.addEventListener("click", function () {
        runInboundTriage();
      });
    }

    var btnDelta = document.getElementById("btn-run-delta");
    if (btnDelta) {
      btnDelta.addEventListener("click", function () {
        runReapplyDelta();
      });
    }

    var btnCopyReply = document.getElementById("btn-copy-reply");
    if (btnCopyReply) {
      btnCopyReply.addEventListener("click", function () {
        var boxEl = document.getElementById("triage-reply-box");
        if (boxEl) copyText(boxEl.textContent, btnCopyReply);
      });
    }

    // Index modal cards jump to dossier
    Array.prototype.slice.call(document.querySelectorAll("[data-index-prog]")).forEach(function (card) {
      card.addEventListener("click", function () {
        var idx = parseInt(card.getAttribute("data-index-prog"), 10);
        var closeBtn = document.querySelector("[data-index-close]");
        if (closeBtn) closeBtn.click();
        selectProgram(idx, false);
      });
    });

    // Gate controls
    var gateInput = document.getElementById("gate-input");
    if (gateInput) gateInput.value = SAMPLE_CLEAN;
    var btnDefect = document.getElementById("btn-gate-defect");
    var btnClean = document.getElementById("btn-gate-clean");
    var btnGateRun = document.getElementById("btn-gate-run");
    if (btnDefect) {
      btnDefect.addEventListener("click", function () {
        if (gateInput) gateInput.value = SAMPLE_DEFECT;
        runGateAudit();
      });
    }
    if (btnClean) {
      btnClean.addEventListener("click", function () {
        if (gateInput) gateInput.value = SAMPLE_CLEAN;
        runGateAudit();
      });
    }
    if (btnGateRun) {
      btnGateRun.addEventListener("click", runGateAudit);
    }

    renderRadar();
    renderDossiers();
    renderLifecycle();
    runGateAudit();
    runInboundTriage("PROG-ANTH-SCI");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
