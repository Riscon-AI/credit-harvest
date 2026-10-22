#!/usr/bin/env python3
"""
Generates /Volumes/Dionyas/RE/live_repos/credit-harvest/index.html and 404.html
using the exact risconlabs.com Field skin structure + WebGL cosmos + 100% riscon-guidelines compliance.
"""
import html
import json
from pathlib import Path

ROOT = Path("/Volumes/Dionyas/RE/live_repos/credit-harvest")
DATA_PATH = ROOT / "data" / "treasury.json"


def esc(val: str) -> str:
    return html.escape(str(val or ""), quote=True)


def main():
    payload = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    programs = payload["programs"]
    live_sites = payload["live_sites"]
    presets = payload["inbound_presets"]
    metrics = payload["metrics"]

    # Build fx-data JSON for riscon-field.js
    fx_data = {
        "field": {
            "layout": "field",
            "interactive": True,
            "anchors": [{"en": p["topic"]["en"], "ko": p["topic"]["ko"]} for p in programs],
        },
        "sites": [
            {
                "num": p["num"],
                "slug": p["slug"],
                "name": p["program_name"],
                "host": f"{p['provider']} · {p['credit_value']}",
                "url": "#dossiers",
                "topic": p["topic"],
                "world": p["world"],
                "question": p["question"],
                "domain": p["category"],
            }
            for p in programs
        ],
    }
    fx_data_json = json.dumps(fx_data, ensure_ascii=False)
    treasury_inline_json = json.dumps(payload, ensure_ascii=False)

    # Chips HTML
    chips_html = "".join(
        f'<button class="fx-chip" type="button" data-site-chip aria-pressed="{"true" if i == 0 else "false"}">'
        f'<span class="en-only">{esc(p["topic"]["en"])}</span><span class="ko-only">{esc(p["topic"]["ko"])}</span>'
        f"</button>"
        for i, p in enumerate(programs)
    )

    # Index modal cards HTML
    card_tones = ["is-ink", "is-paper", "is-accent", "is-glass"]
    icards_html = []
    for i, p in enumerate(programs):
        tone = card_tones[i % 4]
        icards_html.append(
            f'<a class="fx-icard {tone}" href="#dossiers" data-index-prog="{i}" style="--i:{i}">'
            f'<span class="fx-icard-top"><span>{esc(p["num"])}</span>'
            f'<span class="en-only">{esc(p["category"]["en"])}</span><span class="ko-only">{esc(p["category"]["ko"])}</span></span>'
            f'<div><h3 class="fx-icard-name">{esc(p["provider"])}</h3></div>'
            f'<p class="fx-icard-q en-only">“{esc(p["question"]["en"])}”</p>'
            f'<p class="fx-icard-q ko-only">“{esc(p["question"]["ko"])}”</p>'
            f'<span class="fx-icard-foot"><span>{esc(p["credit_value"])}</span>'
            f'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg></span>'
            f"</a>"
        )
    icards_str = "\n      ".join(icards_html)

    # Family bar sites
    family_links_html = "\n        ".join(
        f'<li><a href="{esc(s["url"])}" target="_blank" rel="noopener noreferrer">{esc(s["name"])}</a></li>'
        for s in live_sites
    )

    html_out = f"""<!DOCTYPE html>
<html lang="ko" data-skin="field" data-lang="ko" data-title-en="CREDIT-HARVEST &amp; HALLUC-GATE — RISCON Labs Autonomous Compute Treasury" data-title-ko="CREDIT-HARVEST &amp; HALLUC-GATE — 리스콘 랩스 자율 연구기금·크레딧 발굴 및 사후관리">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>CREDIT-HARVEST &amp; HALLUC-GATE — 리스콘 랩스 자율 연구기금·크레딧 발굴 및 사후관리</title>
  <meta name="description" content="RISCON Labs Autonomous Compute &amp; Grant Discovery Engine (16 Global Programs), 1-Click Pre-filled Form Submitter, Post-Submission SLA &amp; Lifecycle Manager, and S95 Mechanical Hallucination Gate. Verified 2026. 10. 22." />
  <link rel="canonical" href="https://creditharvest.risconlabs.com/" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="RISCON Labs — CREDIT-HARVEST" />
  <meta property="og:title" content="CREDIT-HARVEST &amp; HALLUC-GATE — RISCON Labs Autonomous Compute Treasury" />
  <meta property="og:description" content="16 Global Non-Dilutive Compute &amp; Grant Clusters, 1-Click Pre-filled Form Submission, Post-Submission Lifecycle Management, and Zero-Cost Mechanical Hallucination Auditing." />
  <meta property="og:url" content="https://creditharvest.risconlabs.com/" />
  <meta name="theme-color" content="#e8e8e6" />
  <link rel="icon" type="image/svg+xml" href="/assets/riscon-field-favicon.svg" />
  <script>(function(){{var d=document.documentElement,t=null,l=null,q=/[?&]lang=(ko|en)(&|$)/.exec(location.search);try{{t=localStorage.getItem('riscon_theme');l=localStorage.getItem('riscon_lang');if(q)localStorage.setItem('riscon_lang',q[1])}}catch(e){{}}if(q){{l=q[1];try{{history.replaceState(null,'',location.pathname+location.hash)}}catch(e){{}}}}var p=(t==='light'||t==='dark')?t:'system';var k=p==='dark'||(p==='system'&&window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches);d.setAttribute('data-theme-pref',p);d.setAttribute('data-theme',k?'dark':'light');var langVal=(l==='en')?'en':'ko';d.setAttribute('data-lang',langVal);d.lang=langVal;var n=d.getAttribute('data-title-'+langVal);if(n)document.title=n;}})();</script>
  <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
  <link rel="stylesheet" href="/styles/field-skin.css?v=20261022b" />
  <script src="/scripts/riscon-field.js?v=20261022b" defer></script>
  <script src="/scripts/riscon-cosmos.js?v=20261022b" defer></script>
</head>
<body class="fx-page fx-page--home kt">
  <a class="fx-skip" href="#main"><span class="en-only">Skip to content</span><span class="ko-only">본문으로 건너뛰기</span></a>
  <div class="fx-core" aria-hidden="true"></div>
  <canvas class="fx-field" aria-hidden="true"></canvas>
  <div class="fx-rim" aria-hidden="true"></div>

  <header class="fx-top">
    <a class="fx-brand" href="https://risconlabs.com" aria-label="RISCON Labs CREDIT-HARVEST">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="4.5" cy="7" r="1.6" fill="currentColor"/><circle cx="10" cy="3.8" r="1.1" fill="currentColor"/><circle cx="19.5" cy="6.5" r="1.3" fill="currentColor"/><circle cx="6.5" cy="18.5" r="1.2" fill="currentColor"/><circle cx="18" cy="19" r="1.7" fill="currentColor"/><circle cx="12.4" cy="12.2" r="4.1" fill="none" stroke="var(--fx-accent)" stroke-width="1.8"/><circle cx="12.4" cy="12.2" r="1.5" fill="var(--fx-accent)"/></svg>
      <span>RISCON Labs · CREDIT-HARVEST</span>
    </a>
    <div class="fx-lang" role="group" aria-label="Language">
      <button type="button" data-set-lang="en" aria-pressed="false">EN</button>
      <span aria-hidden="true">/</span>
      <button type="button" data-set-lang="ko" aria-pressed="true">KR</button>
    </div>
  </header>

  <nav class="fx-pill fx-navpill" data-pill aria-label="Sections">
    <div class="fx-pill-row">
      <div class="fx-navlinks">
        <a href="#main" aria-current="page"><span class="en-only">Overview</span><span class="ko-only">개요</span></a>
        <a href="#radar"><span class="en-only">Radar (16)</span><span class="ko-only">발굴 레이더 (16)</span></a>
        <a href="#dossiers"><span class="en-only">1-Click Submit</span><span class="ko-only">원클릭 신청</span></a>
        <a href="#lifecycle"><span class="en-only">Lifecycle &amp; SLA</span><span class="ko-only">사후관리·SLA</span></a>
        <a href="#halluc-gate"><span class="en-only">Halluc-Gate</span><span class="ko-only">무결성 게이트</span></a>
      </div>
      <span class="fx-navcurrent"><span class="en-only">CREDIT-HARVEST</span><span class="ko-only">크레딧 하베스트</span></span>
      <button class="fx-more" type="button" data-pill-toggle aria-expanded="false" aria-controls="fx-nav-panel" aria-label="Menu and settings">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
      </button>
    </div>
    <div class="fx-pill-panel" id="fx-nav-panel" inert aria-hidden="true">
      <div class="fx-pill-panel-inner">
        <div class="fx-menu-links">
          <a href="#main" aria-current="page"><small>00</small><span class="en-only">Overview</span><span class="ko-only">개요</span></a>
          <a href="#radar"><small>01</small><span class="en-only">Discovery Radar (16)</span><span class="ko-only">발굴 레이더 (16)</span></a>
          <a href="#dossiers"><small>02</small><span class="en-only">1-Click Pre-fill &amp; Dossiers</span><span class="ko-only">원클릭 자동입력·도시에</span></a>
          <a href="#lifecycle"><small>03</small><span class="en-only">Post-Submission Lifecycle</span><span class="ko-only">신청 후 사후관리·SLA</span></a>
          <a href="#halluc-gate"><small>04</small><span class="en-only">S95 Halluc-Gate Auditor</span><span class="ko-only">S95 무결성 게이트</span></a>
        </div>
        <div class="fx-menu-labs">
          <a class="en-only" href="https://risconlabs.com" target="_blank" rel="noopener noreferrer">
            <span class="fx-menu-lab-name">RISCON LABS MAIN PORTAL<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg></span>
            <span class="fx-menu-lab-note">16 live public question-first research desks powered by this compute treasury.</span>
          </a>
          <a class="ko-only" href="https://risconlabs.com/?lang=ko" target="_blank" rel="noopener noreferrer">
            <span class="fx-menu-lab-name">리스콘 랩스 메인 포털<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg></span>
            <span class="fx-menu-lab-note">이 크레딧 트레저리가 연산 자원을 공급하는 16개 공개 질문 연구 데스크.</span>
          </a>
        </div>
        <div class="fx-settings">
          <div class="fx-setting"><span class="fx-setting-name"><span class="en-only">Theme</span><span class="ko-only">테마</span></span><div class="fx-seg" role="group" aria-label="Theme"><button type="button" data-set-theme="system" aria-pressed="true"><span class="en-only">System</span><span class="ko-only">시스템</span></button><button type="button" data-set-theme="light" aria-pressed="false"><span class="en-only">Light</span><span class="ko-only">라이트</span></button><button type="button" data-set-theme="dark" aria-pressed="false"><span class="en-only">Dark</span><span class="ko-only">다크</span></button></div></div>
          <div class="fx-setting"><span class="fx-setting-name"><span class="en-only">Language</span><span class="ko-only">언어</span></span><div class="fx-seg" role="group" aria-label="Language"><button type="button" data-set-lang="en" aria-pressed="false">EN</button><button type="button" data-set-lang="ko" aria-pressed="true">KR</button></div></div>
        </div>
      </div>
    </div>
  </nav>

  <script type="application/json" id="fx-data">{fx_data_json}</script>
  <script type="application/json" id="treasury-data">{treasury_inline_json}</script>

  <main class="fx-main" id="main">

    <section class="fx-hero" aria-labelledby="fx-statement">
      <div class="fx-hero-top">
        <p class="fx-eyebrow">
          <span class="en-only">S99 CREDIT-HARVEST · S95 HALLUC-GATE · Verified 2026. 10. 22.</span>
          <span class="ko-only">S99 크레딧 하베스트 · S95 무결성 게이트 · 실측 기준일 2026. 10. 22.</span>
        </p>
        <h1 class="fx-statement" id="fx-statement">
          <span class="en-only">Frontier reverses.<br><span class="fx-quiet">Grants fund the batch.</span></span>
          <span class="ko-only">프론티어가 역설계하고,<br><span class="fx-quiet">글로벌 크레딧이 연구소를 돌린다.</span></span>
        </h1>
        <p class="fx-hero-note en-only">An autonomous discovery, 1-click pre-filled submission, and post-submission SLA engine across 16 global non-dilutive compute &amp; grant programs—covering RISCON Labs’ 500K–700K KRW/month operating budget by 13.7x–250x.</p>
        <p class="fx-hero-note ko-only">16대 글로벌 무지분 AI 크레딧·클라우드·연구기금 발굴부터 원클릭 자동입력 신청, 승인 후 5영업일 회신·14일 서약서(Affidavit) 사후관리, 그리고 비용 0원 기계적 환각 감사(HALLUC-GATE)까지 하나로 묶은 자율 재무·무결성 엔진입니다.</p>
      </div>

      <div class="fx-hero-center">
        <div class="fx-pill fx-prompt" data-pill>
          <div class="fx-pill-row">
            <span class="fx-prompt-lead en-only">I want to harvest</span>
            <button class="fx-topic" id="fx-topic" type="button" aria-controls="fx-card" aria-label="Show the center question and dossier for this funding program">
              <span class="en-only">{esc(programs[0]["topic"]["en"])}</span>
              <span class="ko-only">{esc(programs[0]["topic"]["ko"])}</span>
            </button>
            <span class="fx-prompt-lead ko-only">를 발굴·신청·사후관리하고 싶다</span>
            <button class="fx-more" type="button" data-pill-toggle aria-expanded="false" aria-controls="fx-prompt-panel" aria-label="Menu and settings">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
            </button>
          </div>
          <div class="fx-pill-panel" id="fx-prompt-panel" inert aria-hidden="true">
            <div class="fx-pill-panel-inner">
              <div class="fx-menu-links">
                <a href="#main" aria-current="page"><small>00</small><span class="en-only">Overview</span><span class="ko-only">개요</span></a>
                <a href="#radar"><small>01</small><span class="en-only">Discovery Radar (16)</span><span class="ko-only">발굴 레이더 (16)</span></a>
                <a href="#dossiers"><small>02</small><span class="en-only">1-Click Pre-fill &amp; Dossiers</span><span class="ko-only">원클릭 자동입력·도시에</span></a>
                <a href="#lifecycle"><small>03</small><span class="en-only">Post-Submission Lifecycle</span><span class="ko-only">신청 후 사후관리·SLA</span></a>
                <a href="#halluc-gate"><small>04</small><span class="en-only">S95 Halluc-Gate Auditor</span><span class="ko-only">S95 무결성 게이트</span></a>
              </div>
              <div class="fx-settings">
                <div class="fx-setting"><span class="fx-setting-name"><span class="en-only">Theme</span><span class="ko-only">테마</span></span><div class="fx-seg" role="group" aria-label="Theme"><button type="button" data-set-theme="system" aria-pressed="true"><span class="en-only">System</span><span class="ko-only">시스템</span></button><button type="button" data-set-theme="light" aria-pressed="false"><span class="en-only">Light</span><span class="ko-only">라이트</span></button><button type="button" data-set-theme="dark" aria-pressed="false"><span class="en-only">Dark</span><span class="ko-only">다크</span></button></div></div>
                <div class="fx-setting"><span class="fx-setting-name"><span class="en-only">Language</span><span class="ko-only">언어</span></span><div class="fx-seg" role="group" aria-label="Language"><button type="button" data-set-lang="en" aria-pressed="false">EN</button><button type="button" data-set-lang="ko" aria-pressed="true">KR</button></div></div>
              </div>
            </div>
          </div>
        </div>
        <div class="fx-chips is-strip" role="group" aria-label="16 Non-Dilutive Compute and Grant Programs">
          {chips_html}
        </div>
      </div>

      <div class="fx-hero-bottom">
        <div class="fx-card" id="fx-card" aria-live="polite">
          <div class="fx-card-body">
            <p class="fx-card-meta">
              <span class="en-only" data-f="meta-en">01 · Anthropic AI for Science · Up to $20,000 Claude API</span>
              <span class="ko-only" data-f="meta-ko">01 · Anthropic AI for Science · 최대 $20,000 Claude API</span>
            </p>
            <p class="fx-card-text">
              <span class="en-only" data-f="text-en">Each cluster in the 3D field is one verified non-dilutive compute or grant program. Tap any ring or chip to inspect its question and launch 1-click pre-filled submission.</span>
              <span class="ko-only" data-f="text-ko">3D 들판의 각 별 무리는 HTTP 200이 실측된 16개 글로벌 크레딧·연구기금입니다. 고리나 칩을 누르면 해당 프로그램의 원클릭 신청과 사후관리로 바로 연결됩니다.</span>
            </p>
          </div>
          <a class="fx-card-link" href="#dossiers" data-select-prog="0">
            <span class="en-only" data-f="link-en">1-Click Dossier ↓</span>
            <span class="ko-only" data-f="link-ko">원클릭 신청·사후관리 ↓</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>
          </a>
        </div>
        <div class="fx-modes">
          <button class="fx-mode" type="button" data-mode="index" aria-haspopup="dialog" aria-controls="fx-index"><span class="en-only">Index (16)</span><span class="ko-only">색인 (16)</span></button>
          <button class="fx-mode" type="button" data-mode="linear" aria-pressed="false"><span class="en-only">Linear</span><span class="ko-only">한 줄</span></button>
        </div>
      </div>

      <a class="fx-cue" href="#read"><span class="en-only">Explore Discovery &amp; Lifecycle ↓</span><span class="ko-only">발굴 레이더·사후관리 열기 ↓</span></a>
    </section>

    <div class="fx-read fx-wrap" id="read">

      <!-- Section 00: Architecture & 4 Doors -->
      <section class="fx-section" aria-labelledby="h-pursue">
        <div class="fx-section-head">
          <span class="fx-label"><span class="en-only">00 · Autonomous Compute Treasury</span><span class="ko-only">00 · 자율 연구소 운영비 조달 체계</span></span>
          <h2 class="fx-h2" id="h-pursue">
            <span class="en-only">Discover, pre-fill, track SLAs, and gate every batch output.</span>
            <span class="ko-only">발굴하고, 원클릭으로 신청하고, 승인 SLA까지 추적한다.</span>
          </h2>
        </div>
        <div class="fx-section-body">
          <p class="fx-bigtext">
            <span class="en-only">To sustain 16 live public research desks and 26,000 agents on a 500,000–700,000 KRW monthly budget, RISCON Labs separates deep reverse-engineering (Frontier APIs funded by non-dilutive research grants) from high-volume synthesis (Flash/Batch models audited by mechanical gates).</span>
            <span class="ko-only">월 50만~70만 원의 운영비로 16개 라이브 연구 데스크와 26,000개 에이전트를 상시 가동하기 위해, 리스콘 랩스는 고난도 역설계(무지분 연구기금으로 확보한 프론티어 API)와 대량 배치 생산(기계적 무결성 게이트가 검수하는 Flash 배치)을 결합합니다. 신청에서 끝나는 방치를 막기 위해 심사 일정·승인 후 5영업일 회신·14일 서약서(Affidavit)·자동 재접수 델타까지 전 과정을 자동 추적합니다.</span>
          </p>

          <div class="ch-kpis">
            <div class="ch-kpi">
              <span class="ch-kpi-label"><span class="en-only">Verified Programs</span><span class="ko-only">실측 발굴 프로그램</span></span>
              <strong class="ch-kpi-val">16 Programs</strong>
              <span class="ch-kpi-sub"><span class="en-only">100% HTTP 200 · 2026. 10. 22.</span><span class="ko-only">전수 HTTP 200 검증 · 2026. 10. 22.</span></span>
            </div>
            <div class="ch-kpi">
              <span class="ch-kpi-label"><span class="en-only">1-Click Pre-fill Forms</span><span class="ko-only">원클릭 자동입력 폼</span></span>
              <strong class="ch-kpi-val">54 Fields</strong>
              <span class="ch-kpi-sub"><span class="en-only">Google Forms &amp; FormAssembly IDs</span><span class="ko-only">문항 ID 실측 매핑 완료</span></span>
            </div>
            <div class="ch-kpi">
              <span class="ch-kpi-label"><span class="en-only">Non-Dilutive Pool</span><span class="ko-only">무지분 확보 가능 풀</span></span>
              <strong class="ch-kpi-val">₩9,918만 – ₩19.2억</strong>
              <span class="ch-kpi-sub"><span class="en-only">13.7x–266x Annual Lab OPEX</span><span class="ko-only">연간 목표 운영비의 13.7배~266배</span></span>
            </div>
            <div class="ch-kpi">
              <span class="ch-kpi-label"><span class="en-only">Post-Gate Defect Rate</span><span class="ko-only">게이트 통과 후 결함률</span></span>
              <strong class="ch-kpi-val" id="kpi-defect-rate">0.0%</strong>
              <span class="ch-kpi-sub"><span class="en-only">170 / 500 Soft-Nulls Caught ($0 Cost)</span><span class="ko-only">500건 중 소프트-널 170건 차단 ($0)</span></span>
            </div>
          </div>

          <ul class="fx-pillars">
            <li class="fx-pillar">
              <span class="fx-num">01</span>
              <strong class="en-only">16-Cluster Discovery Radar</strong><strong class="ko-only">16대 글로벌 발굴 레이더</strong>
              <p class="en-only">Continuously maps Frontier APIs (Anthropic, OpenAI, Gemini, Cohere), Cloud/Edge (Cloudflare, AWS, Azure, GCP), Serverless GPUs (NVIDIA, Modal, HF), and Zero-Equity Grants (Emergent Ventures, LTFF, SFF, NIPA).</p>
              <p class="ko-only">프론티어 API 5종, 클라우드·엣지 4종, 서버리스 GPU 3종, 무지분 현금 그랜트 및 정부 바우처 4종을 리스콘 16개 도메인과 실시간 매칭합니다.</p>
            </li>
            <li class="fx-pillar">
              <span class="fx-num">02</span>
              <strong class="en-only">1-Click Pre-filled Forms</strong><strong class="ko-only">원클릭 자동입력 신청</strong>
              <p class="en-only">Extracts exact Google Forms entry.XXXXXXXX and FormAssembly tfa_XXXX parameters so clicking opens the live application with all fields pre-populated.</p>
              <p class="ko-only">실제 신청 폼의 내부 파라미터를 역설계해 버튼 한 번으로 과제명·초록·아키텍처·증빙 URL이 자동 채워진 신청 창을 엽니다.</p>
            </li>
            <li class="fx-pillar">
              <span class="fx-num">03</span>
              <strong class="en-only">SLA &amp; Email Triage Engine</strong><strong class="ko-only">신청 후 사후관리 &amp; 이메일 분류</strong>
              <p class="en-only">Tracks monthly/quarterly review dates, enforces Anthropic’s 5-day acceptance &amp; 14-day Compliance Affidavit SLA, and auto-drafts replies to reviewer emails.</p>
              <p class="ko-only">매월 첫째 주 월요일·분기별 심사일을 추적하고, 수신된 메일을 붙여넣으면 승인 수락(5영업일)·서약서(14일)·추가 증빙 회신문을 자동 생성합니다.</p>
            </li>
            <li class="fx-pillar">
              <span class="fx-num">04</span>
              <strong class="en-only">HALLUC-GATE (S95)</strong><strong class="ko-only">기계적 환각 차단 게이트</strong>
              <p class="en-only">Blocks Soft-Null evasion (fix == original), missing source quotes, and schema leaks before any batch output reaches production.</p>
              <p class="ko-only">배치 모델이 원문을 그대로 복사하는 소프트-널(fix == original)과 인용 누락을 LLM 비용 0원으로 전수 차단하고 SHA-256 영수증을 발행합니다.</p>
            </li>
          </ul>
        </div>
      </section>

      <section class="fx-section" aria-labelledby="h-doors">
        <div class="fx-section-head">
          <span class="fx-label"><span class="en-only">Four Operational Modules</span><span class="ko-only">네 가지 실행 워크벤치</span></span>
          <h2 class="fx-h2" id="h-doors"><span class="en-only">From discovery to post-submission SLA</span><span class="ko-only">발굴부터 사후관리·무결성 검수까지</span></h2>
        </div>
        <div class="fx-section-body">
          <div class="fx-doors">
            <a class="fx-door is-ink" href="#radar">
              <span class="fx-door-top">01 // DISCOVERY RADAR</span>
              <div>
                <h3 class="en-only">16 Global Programs</h3>
                <h3 class="ko-only">16대 기금 발굴 레이더</h3>
                <p class="en-only">Filter 16 HTTP-200-verified compute and grant programs by category or target RISCON family site.</p>
                <p class="ko-only">프론티어 API·클라우드·GPU·무지분 기금 16개를 분야별·패밀리 사이트별로 필터링하고 호환성을 진단합니다.</p>
              </div>
              <span class="fx-door-link"><span class="en-only">Open Radar</span><span class="ko-only">레이더 열기</span> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg></span>
            </a>
            <a class="fx-door is-accent" href="#dossiers">
              <span class="fx-door-top">02 // 1-CLICK SUBMIT</span>
              <div>
                <h3 class="en-only">Pre-filled Forms</h3>
                <h3 class="ko-only">원클릭 자동입력 도시에</h3>
                <p class="en-only">Inject your Organization ID once and launch pre-populated Google Forms &amp; FormAssembly applications in one click.</p>
                <p class="ko-only">Organization ID와 이메일을 한 번 입력하면 54개 실측 폼 필드에 즉시 주입되어 원클릭 신청 링크를 생성합니다.</p>
              </div>
              <span class="fx-door-link"><span class="en-only">Launch Submitter</span><span class="ko-only">신청기 열기</span> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg></span>
            </a>
            <a class="fx-door is-paper" href="#lifecycle">
              <span class="fx-door-top">03 // LIFECYCLE &amp; SLA</span>
              <div>
                <h3 class="en-only">Post-Submission AI</h3>
                <h3 class="ko-only">신청 후 사후관리 엔진</h3>
                <p class="en-only">Track review windows, 5-day acceptance SLAs, 14-day Compliance Affidavits, inbound email replies, and live git deltas.</p>
                <p class="ko-only">신청 상태 추적, 심사역 수신 이메일 자동 분석·회신문 작성, 차기 코호트 자동 재접수 델타 패키지를 생성합니다.</p>
              </div>
              <span class="fx-door-link"><span class="en-only">Manage Lifecycle</span><span class="ko-only">사후관리 열기</span> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg></span>
            </a>
            <a class="fx-door is-glass" href="#halluc-gate">
              <span class="fx-door-top">04 // HALLUC-GATE</span>
              <div>
                <h3 class="en-only">Mechanical Gate</h3>
                <h3 class="ko-only">기계적 무결성 게이트</h3>
                <p class="en-only">Zero-LLM-cost JSONL batch verifier catching Soft-Null evasion and missing source quotes with SHA-256 receipts.</p>
                <p class="ko-only">배치 산출물의 소프트-널(원문 복사) 회피와 인용 누락을 비용 0원으로 검출하고 암호화 영수증을 발급합니다.</p>
              </div>
              <span class="fx-door-link"><span class="en-only">Run Gate Audit</span><span class="ko-only">검수기 열기</span> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg></span>
            </a>
          </div>
        </div>
      </section>

      <div class="fx-passage" data-passage="nebula" data-seed="1.7" aria-hidden="true"></div>

      <!-- Section 01: Expanded 16-Program Discovery Radar -->
      <section class="fx-section fx-section--stack" id="radar" aria-labelledby="h-radar">
        <div class="fx-section-head">
          <span class="fx-label">01 · <span class="en-only">Global Non-Dilutive Compute &amp; Grant Discovery Radar</span><span class="ko-only">16대 글로벌 무지분 크레딧·연구기금 발굴 레이더</span></span>
          <h2 class="fx-h2" id="h-radar">
            <span class="en-only">16 verified funding streams matched to RISCON’s 16 live desks.</span>
            <span class="ko-only">리스콘 16개 라이브 데스크와 매칭된 16개 실측 크레딧·그랜트</span>
          </h2>
        </div>
        <div class="fx-section-body">
          <div class="ch-bar">
            <div class="ch-filters" role="group" aria-label="Filter programs by category">
              <button type="button" class="ch-filter-btn" data-radar-cat="ALL" aria-pressed="true"><span class="en-only">All (16)</span><span class="ko-only">전체 (16)</span></button>
              <button type="button" class="ch-filter-btn" data-radar-cat="FRONTIER API" aria-pressed="false"><span class="en-only">Frontier API (5)</span><span class="ko-only">프론티어 API (5)</span></button>
              <button type="button" class="ch-filter-btn" data-radar-cat="CLOUD & EDGE" aria-pressed="false"><span class="en-only">Cloud &amp; Edge (4)</span><span class="ko-only">클라우드·엣지 (4)</span></button>
              <button type="button" class="ch-filter-btn" data-radar-cat="GPU COMPUTE" aria-pressed="false"><span class="en-only">Serverless GPU (3)</span><span class="ko-only">GPU 연산 (3)</span></button>
              <button type="button" class="ch-filter-btn" data-radar-cat="FELLOWSHIP & SOVEREIGN" aria-pressed="false"><span class="en-only">Cash Grants &amp; Vouchers (4)</span><span class="ko-only">무지분 기금·바우처 (4)</span></button>
            </div>
            <div style="display:flex;align-items:center;gap:8px;min-width:240px;">
              <label for="radar-site-select" class="fx-sr">Filter by RISCON family site</label>
              <select id="radar-site-select" class="ch-select">
                <option value="ALL">모든 패밀리 사이트 호환 보기 (16개 데스크)</option>
                <option value="iatheon.risconlabs.com">IATHEON (위암·유방암 표적치료 드라이랩)</option>
                <option value="hebe.risconlabs.com">HEBE (비만·탈모 임상·구조 드라이랩)</option>
                <option value="asi-2030.risconlabs.com">ASI 2030 (시나리오 &amp; L0–L6 감사자 훈련)</option>
                <option value="pro-se.risconlabs.com">PRO SE (나홀로 소송 질문판)</option>
                <option value="aegis.risconlabs.com">AEGIS (국방·안보·민간 대비)</option>
                <option value="nadir.risconlabs.com">NADIR (5,863건 조직 쇠락 아카이브)</option>
                <option value="meridian.risconlabs.com">Meridian (결정 전 과정 추적)</option>
                <option value="archon.risconlabs.com">ARCHON (조직 결정·책임 구조 감사)</option>
                <option value="hallucgate.risconlabs.com">HALLUC-GATE (기계적 무결성 게이트)</option>
              </select>
            </div>
          </div>

          <div class="ch-radar-grid" id="radar-grid"></div>
        </div>
      </section>

      <!-- Section 02: 1-Click Pre-filled Submitter & Dossier Workbench -->
      <section class="fx-section fx-section--stack" id="dossiers" aria-labelledby="h-dossiers">
        <div class="fx-section-head">
          <span class="fx-label">02 · <span class="en-only">1-Click Pre-filled Form Launcher &amp; Submission Dossiers</span><span class="ko-only">원클릭 자동입력 폼 런처 &amp; 프로그램별 신청 도시에</span></span>
          <h2 class="fx-h2" id="h-dossiers">
            <span class="en-only">Inject your Organization ID once. Open live forms pre-filled.</span>
            <span class="ko-only">Organization ID 한 번 입력으로 실제 신청 폼에 모든 문항을 자동 채운다.</span>
          </h2>
        </div>
        <div class="fx-section-body">
          <div class="fx-panel" style="margin-bottom:16px;">
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;align-items:end;">
              <div>
                <label for="inj-org-id" class="ch-kpi-label" style="display:block;margin-bottom:6px;">
                  <span class="en-only">Anthropic / OpenAI Organization ID</span>
                  <span class="ko-only">Anthropic / OpenAI Organization ID (자동 주입)</span>
                </label>
                <input id="inj-org-id" type="text" class="ch-input" value="ORG-ID-FROM-CONSOLE-ANTHROPIC-COM" placeholder="e.g. org-xxxxxxxxxxxxxxxx" />
              </div>
              <div>
                <label for="inj-email" class="ch-kpi-label" style="display:block;margin-bottom:6px;">
                  <span class="en-only">Principal Investigator Email</span>
                  <span class="ko-only">책임연구자(PI) 이메일 (폼 &amp; 회신문 연동)</span>
                </label>
                <input id="inj-email" type="email" class="ch-input" value="riscon.ai@gmail.com" />
              </div>
              <div>
                <label for="inj-gcp" class="ch-kpi-label" style="display:block;margin-bottom:6px;">
                  <span class="en-only">Cloudflare Account ID / GCP Billing Project</span>
                  <span class="ko-only">Cloudflare Account ID / 클라우드 프로젝트</span>
                </label>
                <input id="inj-gcp" type="text" class="ch-input" value="10f6645e0670c6c05258cf5e0345121b" />
              </div>
              <div>
                <button type="button" id="btn-apply-injector" class="ch-btn is-primary" style="width:100%;">
                  <span class="en-only">Update All 16 Pre-filled Links</span>
                  <span class="ko-only">16개 전체 신청 폼 링크에 즉시 반영</span>
                </button>
              </div>
            </div>
          </div>

          <div class="ch-workbench">
            <div class="ch-list" id="dossier-nav" role="tablist" aria-label="16 Grant Dossiers"></div>
            <div class="fx-panel" id="dossier-detail" role="tabpanel" aria-live="polite"></div>
          </div>
        </div>
      </section>

      <div class="fx-passage" data-passage="cluster" data-seed="3.4" aria-hidden="true"></div>

      <!-- Section 03: Post-Submission Lifecycle, SLA Tracker & Inbound Email Triage -->
      <section class="fx-section fx-section--stack" id="lifecycle" aria-labelledby="h-lifecycle">
        <div class="fx-section-head">
          <span class="fx-label">03 · <span class="en-only">Post-Submission Lifecycle, SLA Countdown &amp; Inbound Email Triage</span><span class="ko-only">신청 후 사후관리 · 승인 SLA 추적 · 수신 이메일 자동 응대 엔진</span></span>
          <h2 class="fx-h2" id="h-lifecycle">
            <span class="en-only">Never drop a grant after applying: track review windows, 5-day SLAs, and auto-draft replies.</span>
            <span class="ko-only">신청 후 방치 제로: 심사일·5영업일 수락·14일 서약서·이월 재접수까지 자동 관리한다.</span>
          </h2>
        </div>
        <div class="fx-section-body">
          <div class="ch-kpis" id="lifecycle-kpis">
            <div class="ch-kpi">
              <span class="ch-kpi-label">READY TO SUBMIT (신청 대기)</span>
              <strong class="ch-kpi-val" id="lc-count-ready">16</strong>
              <span class="ch-kpi-sub">원클릭 폼 및 도시에 준비 완료</span>
            </div>
            <div class="ch-kpi">
              <span class="ch-kpi-label">SUBMITTED / UNDER REVIEW (심사 중)</span>
              <strong class="ch-kpi-val" id="lc-count-review">0</strong>
              <span class="ch-kpi-sub">차기 정기 심사일: 2026. 11. 2.</span>
            </div>
            <div class="ch-kpi">
              <span class="ch-kpi-label">5-DAY / 14-DAY SLA PENDING (서약 대기)</span>
              <strong class="ch-kpi-val" id="lc-count-sla">0</strong>
              <span class="ch-kpi-sub">Anthropic 5영업일 회신·14일 서약서</span>
            </div>
            <div class="ch-kpi">
              <span class="ch-kpi-label">APPROVED / DELTA RE-APPLY (승인·재접수)</span>
              <strong class="ch-kpi-val" id="lc-count-approved">0</strong>
              <span class="ch-kpi-sub">라이브 커밋 델타 자동 갱신 연동</span>
            </div>
          </div>

          <div class="ch-table-wrap" style="margin-bottom:20px;">
            <table class="ch-table" aria-label="16 Program Post-Submission Lifecycle Tracker">
              <thead>
                <tr>
                  <th>번호·프로그램</th>
                  <th>지원 규모</th>
                  <th>현재 사후관리 상태 (클릭하여 전환)</th>
                  <th>차기 심사일 / 마감일</th>
                  <th>필수 사후관리 SLA 규칙</th>
                  <th>빠른 실행</th>
                </tr>
              </thead>
              <tbody id="lifecycle-tbody"></tbody>
            </table>
          </div>

          <!-- Inbound Email Triage & Auto-Responder + Live Git Delta Compiler -->
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:16px;">
            <div class="fx-panel">
              <span class="fx-label">POST /api/inbound-email · INBOUND GRANT EMAIL TRIAGE</span>
              <h3 class="ch-prog-title" style="margin-top:0;">수신 이메일 자동 분석 &amp; 즉시 회신문 생성기</h3>
              <p class="ch-prog-q" style="margin-bottom:12px;">
                Anthropic·OpenAI·Cloudflare·AWS 등으로부터 받은 이메일(승인 통지, 서약서 요청, 추가 증빙 요청, 코호트 이월 통지)을 붙여넣거나 아래 시나리오 프리셋을 누르면, 필요한 SLA 마감일과 영문/국문 회신문을 즉시 작성합니다.
              </p>
              <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;" id="preset-buttons"></div>
              <div style="display:grid;gap:8px;margin-bottom:12px;">
                <label for="email-subject" class="fx-sr">Email Subject</label>
                <input id="email-subject" type="text" class="ch-input" value="{esc(presets[0]['subject'])}" placeholder="이메일 제목 (Subject)" />
                <label for="email-body" class="fx-sr">Email Body</label>
                <textarea id="email-body" class="ch-textarea">{esc(presets[0]['body'])}</textarea>
              </div>
              <div style="display:flex;flex-wrap:wrap;gap:8px;">
                <button type="button" id="btn-run-triage" class="ch-btn is-primary">이메일 분석 &amp; 회신문 자동 생성 (POST /api/inbound-email)</button>
                <button type="button" id="btn-run-delta" class="ch-btn">차기 심사 재접수용 Git 커밋 델타 생성 (POST /api/reapply-delta)</button>
              </div>
            </div>

            <div class="fx-panel" id="triage-output" aria-live="polite">
              <span class="fx-label">TRIAGE &amp; AUTO-RESPONSE OUTPUT</span>
              <h3 class="ch-prog-title" style="margin-top:0;" id="triage-title">대기 중 — 좌측에서 이메일 분석 또는 프리셋을 실행하세요</h3>
              <p class="ch-prog-q" id="triage-summary">실행 시 SLA 기한(5영업일 회신 · 14일 Compliance Affidavit), 체크리스트, 그리고 복사 가능한 영문 회신문이 이곳에 표시됩니다.</p>
              <ul id="triage-checklist" style="margin:12px 0;padding-left:20px;font-size:14px;line-height:22px;"></ul>
              <div class="ch-field-box" style="margin-top:12px;">
                <div class="ch-field-head">
                  <span class="ch-field-label">생성된 회신문 / 재접수 델타 브리프</span>
                  <button type="button" id="btn-copy-reply" class="ch-btn">전문 복사</button>
                </div>
                <pre class="ch-field-val" id="triage-reply-box" style="margin:0;font-family:var(--fx-sans);">좌측 '이메일 분석 &amp; 회신문 자동 생성' 버튼을 누르면 즉시 생성됩니다.</pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Section 04: S95 HALLUC-GATE Mechanical Soft-Null & Citation Integrity Auditor -->
      <section class="fx-section fx-section--stack" id="halluc-gate" aria-labelledby="h-gate">
        <div class="fx-section-head">
          <span class="fx-label">04 · <span class="en-only">S95 HALLUC-GATE · Zero-LLM-Cost Mechanical Soft-Null &amp; Citation Auditor</span><span class="ko-only">S95 HALLUC-GATE · 비용 0원 기계적 소프트-널 &amp; 인용 무결성 게이트</span></span>
          <h2 class="fx-h2" id="h-gate">
            <span class="en-only">Audit batch JSONL outputs for Soft-Null evasion before publishing.</span>
            <span class="ko-only">배치 산출물의 원문 복사(Soft-Null)와 인용 누락을 비용 0원으로 전수 차단한다.</span>
          </h2>
        </div>
        <div class="fx-section-body">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:16px;">
            <div class="fx-panel">
              <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px;">
                <span class="ch-field-label">JSON / JSONL 배치 검수 입력 (`POST /api/audit`)</span>
                <div style="display:flex;gap:6px;">
                  <button type="button" class="ch-btn" id="btn-gate-defect">결함 표본 로드 (Soft-Null 포함)</button>
                  <button type="button" class="ch-btn" id="btn-gate-clean">무결점 표본 로드 (PASS)</button>
                </div>
              </div>
              <label for="gate-input" class="fx-sr">JSONL Payload to Audit</label>
              <textarea id="gate-input" class="ch-textarea mono-code" style="min-height:190px;"></textarea>
              <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;margin-top:12px;">
                <label style="font-size:14px;font-weight:600;">최대 허용 글자수 (`max_len`): <input id="gate-maxlen" type="number" class="ch-input" value="95" style="width:90px;display:inline-block;margin-left:6px;" /></label>
                <button type="button" id="btn-gate-run" class="ch-btn is-primary">실시간 기계적 무결성 검수 실행</button>
              </div>
            </div>

            <div class="fx-panel" id="gate-result-panel" aria-live="polite">
              <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px;margin-bottom:12px;">
                <span class="ch-badge is-navy" id="gate-verdict-badge">PASS_CERTIFIED</span>
                <span class="mono-code" id="gate-receipt-id">HG-20261022-READY</span>
              </div>
              <div class="ch-kpis" style="grid-template-columns:repeat(2,minmax(0,1fr));margin-bottom:12px;">
                <div class="ch-kpi">
                  <span class="ch-kpi-label">통과 / 전체 레코드</span>
                  <strong class="ch-kpi-val" id="gate-stat-pass">3 / 3</strong>
                </div>
                <div class="ch-kpi">
                  <span class="ch-kpi-label">소프트-널 / 인용누락 / 길이초과</span>
                  <strong class="ch-kpi-val" id="gate-stat-defects">0 / 0 / 0</strong>
                </div>
              </div>
              <p style="margin:0 0 8px;font-size:12px;line-height:17px;font-weight:600;color:var(--fx-mute);">
                SHA-256: <span class="mono-code" id="gate-sha256">-</span>
              </p>
              <div id="gate-defect-list" style="display:grid;gap:6px;font-size:14px;line-height:22px;"></div>
            </div>
          </div>
        </div>
      </section>

    </div>

    <nav class="fx-next fx-wrap" aria-label="Next destination">
      <a class="fx-next-link" href="https://risconlabs.com">
        <span class="fx-label"><span class="en-only">RISCON Labs Ecosystem</span><span class="ko-only">리스콘 랩스 생태계</span> · 16 Live Desks</span>
        <span class="fx-next-title"><span class="en-only">RISCON Labs</span><span class="ko-only">리스콘 랩스 홈</span><span class="fx-next-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg></span></span>
        <span class="fx-next-text en-only">Return to the central field of sixteen public question-first research sites.</span>
        <span class="fx-next-text ko-only">이 크레딧 트레저리와 무결성 게이트가 뒷받침하는 16개 공개 질문 연구 사이트의 중심 들판으로 이동합니다.</span>
      </a>
    </nav>

  </main>

  <!-- Index Dialog (16 Funding Clusters) -->
  <div class="fx-index" id="fx-index" role="dialog" aria-modal="true" aria-labelledby="fx-index-title" aria-hidden="true" tabindex="-1" inert>
    <div class="fx-index-head">
      <p class="fx-index-title" id="fx-index-title">
        <span class="en-only">Index — 16 Non-Dilutive Compute &amp; Grant Programs</span>
        <span class="ko-only">색인 — 16대 글로벌 무지분 크레딧·연구기금</span>
      </p>
      <div class="fx-index-nav">
        <span class="fx-label fx-index-count" data-index-count>01 / 16</span>
        <button class="fx-inav" type="button" data-index-step="-1" disabled><span class="fx-sr"><span class="en-only">Previous</span><span class="ko-only">이전</span></span><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3.5 5.5 8l4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <button class="fx-inav" type="button" data-index-step="1"><span class="fx-sr"><span class="en-only">Next</span><span class="ko-only">다음</span></span><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      </div>
    </div>
    <div class="fx-index-row">
      {icards_str}
    </div>
    <button class="fx-close" type="button" data-index-close><span class="en-only">Close</span><span class="ko-only">닫기</span></button>
  </div>

  <footer class="fx-foot">
    <div class="fx-wrap">
      <div class="fx-panel fx-foot-panel">
        <div class="fx-foot-brand">
          <strong>RISCON Labs · CREDIT-HARVEST &amp; HALLUC-GATE</strong>
          <p class="en-only">Autonomous Compute Treasury (S99) &amp; Mechanical Integrity Gate (S95). Verified 2026. 10. 22. Follows Riscon-AI/riscon-guidelines@85a4bfc.</p>
          <p class="ko-only">자율 연구기금·크레딧 발굴·사후관리 엔진(S99) 및 기계적 환각 검수 게이트(S95). 2026. 10. 22. 실측 기준. Riscon-AI/riscon-guidelines@85a4bfc 준수.</p>
        </div>
        <div class="fx-foot-col">
          <span class="fx-label">01 · <span class="en-only">Discovery</span><span class="ko-only">발굴 레이더</span></span>
          <a href="#radar"><span class="en-only">16 Global Programs</span><span class="ko-only">16대 글로벌 프로그램</span></a>
          <a href="#radar" data-filter-jump="FRONTIER API"><span class="en-only">Frontier API Credits</span><span class="ko-only">프론티어 API 크레딧</span></a>
          <a href="#radar" data-filter-jump="CLOUD & EDGE"><span class="en-only">Cloud &amp; Edge Credits</span><span class="ko-only">클라우드·엣지 크레딧</span></a>
        </div>
        <div class="fx-foot-col">
          <span class="fx-label">02 · <span class="en-only">1-Click Submit</span><span class="ko-only">원클릭 신청</span></span>
          <a href="#dossiers"><span class="en-only">Pre-filled Google Forms</span><span class="ko-only">Google 폼 자동입력</span></a>
          <a href="#dossiers"><span class="en-only">Emergent Ventures Form</span><span class="ko-only">Emergent Ventures 자동입력</span></a>
          <a href="#dossiers"><span class="en-only">Org ID Injector</span><span class="ko-only">Org ID 일괄 주입기</span></a>
        </div>
        <div class="fx-foot-col">
          <span class="fx-label">03 · <span class="en-only">Lifecycle &amp; Gate</span><span class="ko-only">사후관리·게이트</span></span>
          <a href="#lifecycle"><span class="en-only">5-Day &amp; 14-Day SLA Tracker</span><span class="ko-only">5영업일·14일 서약 SLA</span></a>
          <a href="#lifecycle"><span class="en-only">Inbound Email Auto-Reply</span><span class="ko-only">수신 메일 자동 회신기</span></a>
          <a href="#halluc-gate"><span class="en-only">HALLUC-GATE API (/api/audit)</span><span class="ko-only">무결성 검수 API (/api/audit)</span></a>
        </div>
        <div class="fx-foot-col">
          <span class="fx-label">04 · <span class="en-only">Live Domains</span><span class="ko-only">라이브 도메인</span></span>
          <a href="https://creditharvest.risconlabs.com">creditharvest.risconlabs.com</a>
          <a href="https://hallucgate.risconlabs.com">hallucgate.risconlabs.com</a>
          <a href="https://github.com/Riscon-AI/credit-harvest" target="_blank" rel="noopener noreferrer">github.com/Riscon-AI/credit-harvest</a>
        </div>
      </div>
    </div>

    <nav class="riscon-family-bar" aria-label="RISCON Labs family">
      <a class="riscon-family-lab" href="https://risconlabs.com">RISCON Labs <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg></a>
      <span class="riscon-family-rule" aria-hidden="true"></span>
      <ul class="riscon-family-sites">
        {family_links_html}
      </ul>
    </nav>
  </footer>

  <script src="/scripts/credit-harvest-app.js?v=20261022b" defer></script>
</body>
</html>
"""

    (ROOT / "index.html").write_text(html_out, encoding="utf-8")

    # Also write a clean 404.html matching the exact Field skin
    html_404 = f"""<!DOCTYPE html>
<html lang="ko" data-skin="field" data-lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>404 — CREDIT-HARVEST &amp; HALLUC-GATE (RISCON Labs)</title>
  <link rel="icon" type="image/svg+xml" href="/assets/riscon-field-favicon.svg" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
  <link rel="stylesheet" href="/styles/field-skin.css?v=20261022b" />
</head>
<body class="fx-page kt">
  <div class="fx-core" aria-hidden="true"></div>
  <div class="fx-rim" aria-hidden="true"></div>
  <main class="fx-main fx-wrap" style="padding-top:120px;">
    <div class="fx-panel">
      <span class="fx-label">404 · PAGE NOT FOUND</span>
      <h1 class="fx-h2" style="margin-bottom:12px;">요청하신 경로를 찾을 수 없습니다.</h1>
      <p style="margin:0 0 20px;">CREDIT-HARVEST &amp; HALLUC-GATE 메인 대시보드에서 16대 글로벌 크레딧 발굴 레이더와 원클릭 신청·사후관리 워크벤치를 이용하실 수 있습니다.</p>
      <a class="ch-btn is-primary" href="/">메인 대시보드로 이동 →</a>
    </div>
  </main>
</body>
</html>
"""
    (ROOT / "404.html").write_text(html_404, encoding="utf-8")
    print(f"Wrote index.html ({(ROOT / 'index.html').stat().st_size} bytes) and 404.html.")


if __name__ == "__main__":
    main()
