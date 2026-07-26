# 하유니 집 물건 관리 — 프론트엔드

집 안 물건의 수량, 위치, 구매일, 비고를 관리하는 개인용 재고 관리 웹앱의 프론트엔드입니다.
[루트 README](../README.md)의 백엔드(Spring Boot REST API)와 PostgreSQL 위에서 동작하며,
Docker Compose로 빌드·실행됩니다.

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| 프레임워크 | Nuxt 3 (Vue 3 + TypeScript), SPA 모드(`ssr: false`) |
| 번들러 | Vite 7 (Nuxt 내장) |
| 아이콘 | `@lucide/vue` |
| 정적 호스팅 | nginx (정적 생성 결과 서빙 + `/api` 프록시) |
| 린트 | ESLint + `@nuxt/eslint` |

## 디렉터리 구조

```text
front/
├── app.vue                 # 루트 컴포넌트. <NuxtPage/> 만 렌더
├── nuxt.config.ts          # Nuxt 설정 (ssr:false, 정적 생성, 전역 CSS/헤더)
├── pages/index.vue         # 메인 화면 오케스트레이터 (컴포넌트 조립)
├── components/             # 화면 컴포넌트
│   ├── SummaryBand.vue     #   상단 요약 통계 영역
│   ├── ItemForm.vue        #   물품 등록/수정 폼 (어두운 초록 패널)
│   └── ItemList.vue        #   데스크톱 표 + 모바일 카드 목록
├── composables/
│   └── useInventory.ts     #   상태/로직 싱글톤 (목록 fetch, 검색, 저장, 삭제, 스크롤)
├── types/inventory.ts      # InventoryItem / InventoryForm 등 타입 정의
├── assets/
│   ├── css/base.css        #   전역 기본 스타일 (폰트, 리셋, #__nuxt)
│   ├── css/app.css         #   화면 스타일 (기존 App.css 이식)
│   └── hero.png            #   요약 영역 히어로 이미지
├── public/                 # favicon.svg, icons.svg (빌드 시 그대로 복사)
├── nginx.conf              # /api → back:8080 프록시 + SPA fallback
├── Dockerfile              # nuxt generate → .output/public → nginx 정적 서빙
└── eslint.config.js        # @nuxt/eslint 기반 ESLint 설정
```

## 시작하기

의존성 설치는 최초 1회만 필요하며, `postinstall` 스크립트가 `nuxt prepare`를 실행해
`.nuxt` 타입 정의를 생성합니다.

```bash
cd front
npm install
```

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 실행 (`http://localhost:3000`) |
| `npm run generate` | 정적 빌드. `.output/public` 에 HTML/JS/CSS 생성 |
| `npm run typecheck` | `vue-tsc`로 TypeScript 타입 검사 (`nuxt typecheck`) |
| `npm run lint` | ESLint 실행 (`eslint .`) |
| `npm run build` | Nuxt 서버/클라이언트 빌드 (정적 호스팅은 `generate` 권장) |
| `npm run preview` | `generate` 결과를 로컬에서 미리보기 |

## 아키텍처

상태와 비즈니스 로직은 `composables/useInventory.ts` 하나에 모아 모듈 스코프 싱글톤으로
공유합니다. 화면 컴포넌트(SummaryBand/ItemForm/ItemList)는 각자 `useInventory()`를 호출해
같은 상태·액션에 접근하므로 별도의 props/emit 연결 없이 동작합니다.

- `items`, `query`, `outOfStockOnly`, `form`, `editingId` 등 반응형 상태는 모듈 스코프에 있습니다.
- 검색어(`query`) 변경 시 180ms 디바운스로 `/api/items` 를 조회합니다.
- `editorPanelRef` / `nameInputRef` / `listPanelRef` DOM ref도 composable 이 소유하며,
  컴포넌트가 자신의 엘리먼트를 이 ref 에 바인딩합니다. 그래서 목록의 `수정` 클릭 시
  폼 패널로 스크롤하고 물품명 입력칸에 포커스하는 동작이 컴포넌트 경계를 넘어 동작합니다.
- `summary`(통계)와 `displayItems`(품절 우선 정렬/필터)는 `computed` 로 파생됩니다.

## API 연동

프론트는 백엔드를 직접 호출하지 않고, nginx가 `/api` 로 들어오는 요청을
`back:8080/api/` 로 프록시합니다(`nginx.conf` 참고). 개발 서버(`npm run dev`)에서도
같은 프록시가 필요하면 `nuxt.config.ts` 의 `devServer` 또는 별도 프록시 설정을 추가하세요.
(현재 운영/로컬 모두 정적 빌드 + nginx 프록시 모델을 사용합니다.)

API 스펙(Base path `/api/items`)은 백엔드와 동일하며, 데이터 필드/에러 응답 형식은
[루트 README](../README.md)의 "데이터 스펙", "API 스펙" 항목을 따릅니다.

## 배포

정적 생성 결과(`.output/public`)를 nginx가 서빙하는 컨테이너 이미지로 빌드합니다.

```bash
docker build -t yangyag2/house-front:latest ./front
docker push yangyag2/house-front:latest
```

전체 스택은 루트의 `docker compose up -d --build` 로 함께 기동됩니다.
자세한 운영/배포 흐름은 [루트 README](../README.md)와 `docs/infra.html` 을 참고하세요.
