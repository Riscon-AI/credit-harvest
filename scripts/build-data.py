#!/usr/bin/env python3
"""
Builds `/Volumes/Dionyas/RE/live_repos/credit-harvest/data/treasury-data.json`
from `/Volumes/Dionyas/RE/riscon_treasury_engine.py` and the verified dossiers.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, "/Volumes/Dionyas/RE")
import riscon_treasury_engine as rte

REPO_DIR = Path("/Volumes/Dionyas/RE/live_repos/credit-harvest")
OUT_FILE = REPO_DIR / "data" / "treasury-data.json"


def main():
    programs_out = []
    for p in rte.PROGRAMS:
        dossier_md = (rte.DOSSIER_DIR / p["dossier_filename"]).read_text(encoding="utf-8")
        target_details = [
            {"key": k, **rte.LIVE_PORTFOLIO_METRICS["sites"][k]}
            for k in p["target_sites"]
        ]
        is_kr = p["program_id"].endswith("-KR")
        prog_name = p["program_name"]
        if is_kr:
            abstract = (
                "(주)리스콘(RISCON Labs, https://risconlabs.com)은 인간과 AI 모델이 생성하는 불완전한 질문을 수집·결함 분류·압축하고, "
                "고위험 의사결정(법률·바이오·해양안보·기업거버넌스) 영역에서 AI 답변의 환각과 회피성 응답을 기계적으로 감사(Audit)하는 연구소입니다. "
                "계획서만 존재하는 초기 과제가 아니라 현재 16개의 상용 라이브 플랫폼(법률 1,461건 판례·114권 총서, 암환자 21,479명 임상유전체 코호트, "
                "항노화 임상시험 320건, 통합 질문 12,524건 등)이 실시간 가동 중입니다. 본 지원사업을 통해 V12 입력절단(+12.0%p) 및 V10 Soft-Null 도피 "
                "차단(0.0%) 파이프라인을 국내 오픈웨이트 감사 모델로 확장하고자 합니다."
            )
        else:
            abstract = (
                f"RISCON Labs (https://risconlabs.com) investigates a foundational bottleneck in high-stakes human-AI interaction: "
                f"most human queries contain hidden presupposition defects, and frontier LLMs systematically evade strict verification rubrics "
                f'through "Soft-Null Evasion" (copying unedited source text while reporting low confidence) or ungrounded citation drift. '
                f"Unlike conceptual proposals, RISCON Labs operates 16 live, continuously verified open-access research platforms spanning "
                f"statutory & case-law interpretation (https://pro-se.risconlabs.com: 610 questions, 1,461 cases, 114 monograph volumes), "
                f"precision oncology survival synthesis (https://iatheon.risconlabs.com: 21,479 MSK-CHORD patient records, 326 research units), "
                f"clinical longevity trial auditing (https://hebe.risconlabs.com: 320 trials, 275 papers), and AI governance/interpretability "
                f"(https://asi-2030.risconlabs.com, https://nadir.risconlabs.com, https://ordo.risconlabs.com: 3,600+ structured audit records). "
                f"With support from {prog_name}, we will scale our deterministic 5-stage hybrid verification pipeline across our expanding "
                f"100-sector Question-Defect Atlas, publishing reproducible benchmarks on cross-model divergence, input-truncation efficacy, and zero-hallucination citation gates."
            )

        pow_lines = "\n".join(
            f"• {t['key'].upper()} ({t['url']} | GitHub: {t['repo']} @ {t['commit']}): {t['summary']}"
            for t in target_details
        )
        empirical_text = (
            "1. V12 Input-Truncation Doctrine (+12.0%p Yield): Mechanically truncating secondary context pollution blocks (PB1) lifted legal seed synthesis accuracy from 76.0% to 88.0%.\n"
            "2. Precision Inversion (Flash vs. Pro): On a 100-item blind statutory audit, lightweight Flash constrained by a 3-line negative-evidence patch achieved an 18.8% outside_fact false-positive rate vs. 28.1% on unconstrained frontier Pro (-9.3%p lower false alarm rate at 1/26th token cost).\n"
            "3. Discovery & Elimination of Soft-Null Evasion: Identified a deceptive failure mode in 25/419 items (6.0%) where models return fix == original_text with low confidence to game rubrics; eliminated to 0/420 (0.0%) in V10 via deterministic pre-LLM mechanical gate.\n"
            "4. C-Hybrid Selective Escalation (80.8% Compute Savings): Achieved 96.0% post-escalation survival and 94.0% end-to-end assembly across 839 items at 5x relative cost vs. 26x frontier-only cost."
        )
        programs_out.append(
            {
                **p,
                "target_details": target_details,
                "copy_fields": {
                    "org_name": "RISCON Labs (RISCON Inc. / 주식회사 리스콘)",
                    "website": "https://risconlabs.com",
                    "github": "https://github.com/Riscon-AI",
                    "applicant": "Byungchul Lee, Founder & Director, RISCON Labs",
                    "project_title": p["project_title"],
                    "abstract": abstract,
                    "proof_of_work": pow_lines,
                    "empirical_results": empirical_text,
                    "justification": p["key_angle"],
                    "full_dossier_markdown": dossier_md,
                },
            }
        )

    data_bundle = {
        "as_of": rte.VERIFIED_DATE,
        "summary": {
            "total_programs": len(programs_out),
            "total_estimated_krw": sum(p["estimated_krw_value"] for p in programs_out),
            "total_monthly_offset_krw": sum(p["monthly_offset_krw"] for p in programs_out),
            "total_monthly_b2b_krw": sum(
                x["expected_monthly_krw"] for x in rte.MICRO_B2B_PRODUCTS
            ),
            "live_sites_count": 16,
            "verified_urls_count": 13,
        },
        "programs": programs_out,
        "micro_b2b_products": rte.MICRO_B2B_PRODUCTS,
        "portfolio": rte.LIVE_PORTFOLIO_METRICS,
    }

    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text(
        json.dumps(data_bundle, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(f"Built {OUT_FILE} ({OUT_FILE.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
