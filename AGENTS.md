# AGENTS.md

## RISCON 가독성 가이드라인이 기본이다 (대표 결정 2026-10-03)

화면의 서체, 글자 크기·행간·자간·굵기, 색과 대비, 줄바꿈·문장 부호·표기는 [Riscon-AI/riscon-guidelines](https://github.com/Riscon-AI/riscon-guidelines)의 RISCON 가독성 가이드라인(`readability/`, 커밋 `85a4bfc`)을 기본으로 따른다.

### 스킨 프로필 (CREDIT-HARVEST / HALLUC-GATE — Field Skin)

- **적용 가이드라인 커밋**: `Riscon-AI/riscon-guidelines@85a4bfc` (`styles/tokens.css`, `styles/bundle.css`, `styles/field-skin.css`)
- **레이아웃·인터랙션 기반**: `risconlabs.com` Field 스킨 (`fx-core` + 3D 클러스터 캔버스 `fx-field` + WebGL 셰이더 `fx-cosmos` + 회전 네이비 테두리 `fx-rim` + 플로팅 글래스 알약 내비게이션 `fx-pill`)
- **서체**: `Pretendard Variable` (`--font-sans`) 단일 축 (한글·라틴 제목·본문·캡션 공통). 고정폭(`--font-mono`, `Geist Mono` / `JetBrains Mono`)은 폼 필드 ID(`entry.XXXXXXXX`, `tfa_XXXX`), 커밋 해시, SHA-256 영수증, JSONL 코드에만 제한적으로 사용하며 12px 이상을 유지한다.
- **크기 체계 (화면당 8종 이하, 12px 미만 0%)**:
  - `.headline`: `48px / 57px` (모바일 `32px / 39px`), 굵기 `600`
  - `.title`: `28px / 35px`, 굵기 `600`
  - `.title-sm`: `24px / 31px`, 굵기 `600`
  - `.lead`: `21px / 32px`, 굵기 `400`
  - `.body`: `17px / 27px`, 굵기 `400`
  - `.body-sm`: `14px / 22px`, 굵기 `400` / `600`
  - `.caption`: `12px / 17px`, 굵기 `600`
- **색과 대비 (WCAG AA 미달 0%)**:
  - 라이트: 바탕 `#e8e8e6`, 카드 `#f8f8f5` / `#ffffff`, 네이비 `#0b1527`, 본문 `#121315`, 보조 `#454952`, 포인트 `#1f3196` (`#3552d6`)
  - 다크: 바탕 `#0b1527` / `#0e0f11`, 카드 `#141b2d`, 본문 `#ededed`, 보조 `#a3a8b3`, 포인트 `#93a6ff`
  - 글래스 알약(`fx-pill`, `fx-card`): 바탕 `rgba(18, 22, 33, 0.90)`, 본문 `#fafbfd`, 보조 `#c8cdd6` (실효 대비 4.5:1 이상 보장, 텍스트 `opacity < 1` 금지)
- **조판 규칙**: `word-break: keep-all`, 한글 기울임 금지, 굵기 `400`·`600`만 사용, 날짜 표기 `2026. 10. 22.` 통일.

## External Benchmark & Reality Grounding Rule

1. **사전 학습 기억(Parametric Memory) 의존 금지**:
   AI 모델, 벤치마크, 최신 지원사업·크레딧 스펙을 언급할 때는 사전 학습 가중치에 의존하지 않는다.
2. **실측 URL 및 상태 검증**:
   모든 외부 프로그램 URL은 실제 `HTTP 200` 응답 및 폼 파라미터(`entry.XXXXXXXX`, `tfa_XXXX`)를 실측 검증한 데이터만 수록한다.
