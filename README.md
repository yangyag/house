# 하유니 집 물건 관리

집 안 물건의 수량, 위치, 구매일, 비고를 관리하는 개인용 재고 관리 앱입니다. React 정적 프론트엔드, Spring Boot REST API, PostgreSQL 데이터베이스를 Docker Compose로 함께 실행합니다.

## 주요 기능

- 물품 등록, 수정, 삭제
- 물품명, 위치, 비고 기준 검색
- 수량, 보관 위치, 구매일, 비고 관리
- 구매일 모름 처리
- 전체 물품 수, 총 수량, 보관 위치 수, 부족 후보 요약
- 모바일 전용 카드형 목록
- 모바일에서 등록/수정 폼과 등록된 물품 카드를 명확히 구분하는 화면 구성
- 수량이 0인 물품 강조 표시

## 기술 구성

| 영역 | 기술 |
| --- | --- |
| Frontend | React 19, Vite 8, lucide-react, nginx |
| Backend | Java 25, Spring Boot 4, Spring Web MVC, Spring Data JPA, Bean Validation |
| Database | PostgreSQL (로컬 외부 공유, EC2 auto DB `house` 스키마) |
| Local runtime | Docker Compose |
| Test | JUnit, MockMvc, H2, ESLint, Vite build |

## 프로젝트 구조

```text
.
├── back/                # Spring Boot REST API
├── front/               # React/Vite frontend and nginx proxy config
├── docs/infra.md        # EC2, Docker Hub, nginx, 배포 정보
├── docker-compose.yml   # 단일 Compose, 환경값은 .env에서 주입
├── .env.sample          # .env 템플릿
├── .env                 # 실제 환경값 (gitignore)
└── README.md
```

## 로컬 실행

### 사전 준비

이 프로젝트는 외부 postgres에 연결한다. 호스트에 postgres 컨테이너가 미리 떠 있어야 하고, 그 컨테이너는 같은 docker network에 있어야 한다.

postgres 컨테이너 예시:

```bash
docker run -d --name postgres -p 127.0.0.1:5432:5432 \
  -e POSTGRES_USER=yangyag \
  -e POSTGRES_PASSWORD=강한_비밀번호 \
  -e POSTGRES_DB=yangyag \
  postgres:18
```

(비밀번호는 임의의 강한 비밀번호로 대체.)

postgres 안에 `house` 역할과 `house` 스키마를 만든다 (역할은 `house` 스키마에만 한정 권한). 상세 SQL은 `docs/infra.md`의 'DB 스키마' 섹션 참고.

### .env 준비

```bash
cp .env.sample .env
# .env를 열어 DB_PASSWORD 등 환경값을 채운다.
```

`.env`는 `.gitignore` 대상이라 저장소에 들어가지 않는다. `.env.sample`이 템플릿이다.

### 기동

```bash
docker compose up -d --build
docker network connect $(grep '^NETWORK_NAME=' .env | cut -d= -f2) postgres
docker compose restart back
```

(첫 실행에서만 postgres를 compose 네트워크에 attach. 이후로는 `docker compose up -d`만 하면 된다. 파일명이 `.env`이면 docker compose가 자동으로 로드한다.)

브라우저에서 접속:

```text
http://localhost:8085
```

서비스 구성:

- `back`: Spring Boot REST API. `.env`의 환경 변수로 외부 postgres에 연결.
- `front`: React 정적 파일을 nginx로 서빙하고 `/api` 요청을 back으로 프록시.

## 개발 명령

프론트엔드:

```bash
cd front
npm run lint
npm run build
```

백엔드:

```bash
cd back
./gradlew test
```

전체 Docker 재빌드:

```bash
docker compose build
docker compose up -d
```

## 화면 스펙

- 앱 이름은 `하유니 집 물건 관리`로 표시합니다.
- 데스크톱에서는 물품 목록을 표 형태로 표시합니다.
- 모바일에서는 물품 목록을 카드 형태로 표시하고 데스크톱 표는 숨깁니다.
- 모바일에서 물품 등록/수정 폼은 어두운 초록색 전체 섹션으로 표시합니다.
- 모바일에서 등록된 물품 카드는 흰색 카드로 표시해 폼과 시각적으로 구분합니다.
- 모바일에서 카드의 `수정` 버튼을 누르면 수정 폼으로 이동하고 물품명 입력칸에 포커스가 들어갑니다.
- 저장/수정 상태 메시지는 모바일에서 폼 영역 안에 표시합니다.
- 수량이 0인 물품은 목록에서 강조 스타일로 표시합니다.
- 긴 물품명, 위치, 비고가 있어도 모바일 화면에서 가로 스크롤이 생기지 않아야 합니다.

## 데이터 스펙

물품 데이터 필드:

| 필드 | 타입 | 필수 | 제약 |
| --- | --- | --- | --- |
| `id` | number | 응답 전용 | DB 자동 생성 |
| `name` | string | 예 | 120자 이하, 공백만 입력 불가 |
| `quantity` | number | 예 | 0 이상 |
| `location` | string | 아니오 | 120자 이하 |
| `note` | string | 아니오 | 1000자 이하 |
| `purchasedAt` | string, null | 아니오 | `YYYY-MM-DD` 형식 |
| `createdAt` | string | 응답 전용 | ISO timestamp |
| `updatedAt` | string | 응답 전용 | ISO timestamp |

입력 시 `name`, `location`, `note`는 서버에서 앞뒤 공백을 정리합니다. 빈 `location`과 `note`는 `null`로 저장합니다.

## API 스펙

Base path:

```text
/api/items
```

### 목록 조회

```http
GET /api/items
GET /api/items?q=검색어
```

- `q`가 없으면 물품명, 위치 기준 오름차순으로 전체 목록을 반환합니다.
- `q`가 있으면 물품명, 위치, 비고에서 대소문자 구분 없이 검색합니다.

### 단건 조회

```http
GET /api/items/{id}
```

### 생성

```http
POST /api/items
Content-Type: application/json
```

```json
{
  "name": "휴지",
  "quantity": 12,
  "location": "창고",
  "note": "두루마리",
  "purchasedAt": "2026-04-20"
}
```

- 성공 시 `201 Created`
- `Location: /api/items/{id}` 헤더 반환

### 수정

```http
PUT /api/items/{id}
Content-Type: application/json
```

요청 본문은 생성과 동일합니다.

### 삭제

```http
DELETE /api/items/{id}
```

- 성공 시 `204 No Content`

### 에러 응답

검증 실패는 `400 Bad Request`로 반환합니다.

```json
{
  "timestamp": "2026-05-07T18:00:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "입력값을 확인해 주세요.",
  "fieldErrors": {
    "name": "이름은 필수입니다.",
    "quantity": "수량은 0개 이상이어야 합니다."
  }
}
```

존재하지 않는 물품은 `404 Not Found`로 반환합니다.

## 배포

운영 배포와 EC2 인프라 정보는 [docs/infra.md](docs/infra.md)에 기록합니다.

현재 운영 URL:

```text
https://yangyag2.duckdns.org
```

프론트만 배포할 때의 기본 흐름:

```bash
docker build -t yangyag2/house-front:latest ./front
docker push yangyag2/house-front:latest
```

이후 EC2에서 `docker compose pull front`와 `docker compose up -d front`를 실행합니다. 자세한 명령은 [docs/infra.md](docs/infra.md)를 참고합니다.

## 검증 기록

개발 중 다음 검증을 수행했습니다.

- `npm run lint`
- `npm run build`
- 로컬 Docker Compose 실행 확인
- EC2 배포 후 운영 URL 응답 확인
- Chromium 기반 모바일 viewport 확인
  - 로컬 `http://localhost:8085`
  - 운영 `https://yangyag2.duckdns.org`
  - 390px 모바일 크기에서 앱 제목, 모바일 카드 목록, 등록/수정 폼 구분, 가로 스크롤 여부 확인
- 2026-05-08: 로컬과 EC2 모두 외부 공유 postgres + house 스키마로 전환 완료. 기존 데이터 복원 및 API 동작 검증 완료.

Chromium 확인 시 생성한 참고 스크린샷:

```text
/tmp/house-title-mobile.png
/tmp/house-ec2-title-mobile.png
```

## 운영 주의사항

- Docker Hub 비밀번호, 토큰, SSH private key는 저장소에 기록하지 않습니다.
- 운영에 가까운 환경에서는 Compose에 직접 적힌 DB 계정과 비밀번호를 별도 secret 관리로 분리하는 것이 좋습니다.
- EC2 배포 digest는 배포 후 [docs/infra.md](docs/infra.md)에 갱신합니다.
