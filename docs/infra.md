# 인프라 정보

이 문서는 하유니 집 물건 관리 앱의 현재 EC2 접속 방법, Docker Hub 이미지, 배포 위치를 기록한다.

## 접속 정보

- EC2 사용자: `ubuntu`
- EC2 public IP: `43.202.113.123`
- SSH key: `/home/yangyag/aws/test-keypair.pem`
- SSH 접속:

```bash
ssh -i /home/yangyag/aws/test-keypair.pem ubuntu@43.202.113.123
```

## 도메인과 포트

- 서비스 도메인: `https://yangyag2.duckdns.org`
- DuckDNS 매핑: `yangyag2.duckdns.org` -> `43.202.113.123`
- 앱 직접 포트: `http://43.202.113.123:8085`
- nginx 프록시:
  - `http://yangyag2.duckdns.org` -> HTTPS redirect
  - `https://yangyag2.duckdns.org` -> `http://127.0.0.1:8085`
- 기존 도메인 `yangyag.duckdns.org`는 기존 8083 서비스용으로 유지한다.

## EC2 배포 위치

- 배포 디렉터리: `/home/ubuntu/house-inventory`
- Docker Compose 파일: `/home/ubuntu/house-inventory/docker-compose.yml`
- 환경변수 파일: `/home/ubuntu/house-inventory/.env` (gitignore 대상이라 EC2에만 존재)
- nginx site 파일: `/etc/nginx/sites-enabled/yangyag2-house`
- 인증서 경로:
  - `/etc/letsencrypt/live/yangyag2.duckdns.org/fullchain.pem`
  - `/etc/letsencrypt/live/yangyag2.duckdns.org/privkey.pem`

EC2 `.env`의 주요 키 (운영용 실제 값은 EC2 호스트에만 보관):

```text
CONTAINER_PREFIX=house-inventory
NETWORK_NAME=house-inventory_default
FRONT_PORT=8085

DB_HOST=auto-postgres
DB_PORT=5432
DB_NAME=auto
DB_USER=house
DB_PASSWORD=<EC2의 .env 참조>
DB_SCHEMA=house

CORS_ALLOWED_ORIGINS=http://localhost:8085,http://43.202.113.123:8085,http://yangyag2.duckdns.org,https://yangyag2.duckdns.org
```

## Docker Hub

- Docker Hub 계정: `yangyag2`
- 프론트 이미지: `yangyag2/house-front:latest`
- 백엔드 이미지: `yangyag2/house-back:latest`
- 현재 EC2 배포 digest:
  - front: `sha256:4694c8d778517c70c9166e1860a7e9e8b045a903413907c2e17f4c511ba32ecf`
  - back: `sha256:bee1f6f08f26752d2ef1543c1d83b7b694e07f878c63b91956239d795588d0b4`

Docker Hub 비밀번호나 토큰은 이 저장소에 기록하지 않는다. 필요하면 로컬에서 `docker login`으로 인증한다.

```bash
docker login -u yangyag2
```

## 컨테이너 구성

EC2에서는 다음 컨테이너가 Docker Compose로 실행된다.

- `house-inventory-front`
  - image: `yangyag2/house-front:latest`
  - port: `8085:80`
- `house-inventory-back`
  - image: `yangyag2/house-back:latest`
  - internal port: `8080`
  - SPRING_DATASOURCE_URL은 `.env`의 `DB_HOST`/`DB_NAME`/`DB_SCHEMA`에서 조립됨

EC2 배포의 postgres 토폴로지:

`auto-postgres`는 별도의 외부 인프라(다른 Docker Compose)로 운영되는 공유 PostgreSQL이다. 이 프로젝트의 `docker-compose.yml`에는 postgres 서비스가 정의되지 않으며, `house-inventory-back`은 `house-inventory_default` 네트워크를 통해 `auto-postgres` 호스트명으로 접속한다. auto-postgres는 이 네트워크에 수동으로 attach되어 있다.

- database: `auto`
- schema: `house`
- user: `house`

## 배포 명령

프론트만 변경한 경우:

```bash
docker build -t yangyag2/house-front:latest ./front
docker push yangyag2/house-front:latest

ssh -i /home/yangyag/aws/test-keypair.pem ubuntu@43.202.113.123
cd /home/ubuntu/house-inventory
docker compose pull front
docker compose up -d front
```

백엔드만 변경한 경우:

```bash
docker build -t yangyag2/house-back:latest ./back
docker push yangyag2/house-back:latest

ssh -i /home/yangyag/aws/test-keypair.pem ubuntu@43.202.113.123
cd /home/ubuntu/house-inventory
docker compose pull back
docker compose up -d back
```

전체 재기동:

```bash
ssh -i /home/yangyag/aws/test-keypair.pem ubuntu@43.202.113.123
cd /home/ubuntu/house-inventory
docker compose pull
docker compose up -d
```

EC2에서는 `--build`를 쓰지 않는다. 이미지는 항상 Docker Hub에서 pull한다.

## 점검 명령

EC2 컨테이너 상태:

```bash
ssh -i /home/yangyag/aws/test-keypair.pem ubuntu@43.202.113.123 \
  'cd /home/ubuntu/house-inventory && docker compose ps'
```

로그 확인:

```bash
ssh -i /home/yangyag/aws/test-keypair.pem ubuntu@43.202.113.123 \
  'cd /home/ubuntu/house-inventory && docker compose logs --tail=120 front'

ssh -i /home/yangyag/aws/test-keypair.pem ubuntu@43.202.113.123 \
  'cd /home/ubuntu/house-inventory && docker compose logs --tail=120 back'
```

서비스 확인:

```bash
curl -I https://yangyag2.duckdns.org/
curl https://yangyag2.duckdns.org/api/items
```

nginx 설정 확인:

```bash
ssh -i /home/yangyag/aws/test-keypair.pem ubuntu@43.202.113.123 \
  'sudo nginx -t && sudo systemctl status nginx --no-pager'
```

## DB 스키마

- `house` 역할(user)은 auto-postgres의 auto DB의 house 스키마에 한정된 권한을 갖는다.
- auto-postgres는 host `127.0.0.1:5432` 바인딩으로 실행되어 외부 노출이 없다.
- 비밀번호 등 실제 값은 EC2의 `/home/ubuntu/house-inventory/.env`에 보관되며 git에 들어가지 않는다.

`auto` DB에 `house` 역할과 `house` 스키마를 만드는 SQL 예시:

```sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'house') THEN
    CREATE ROLE house LOGIN PASSWORD '<강한_비밀번호>';
  END IF;
END$$;

CREATE SCHEMA IF NOT EXISTS house AUTHORIZATION house;

GRANT CONNECT ON DATABASE auto TO house;
GRANT USAGE, CREATE ON SCHEMA house TO house;
ALTER DEFAULT PRIVILEGES FOR ROLE house IN SCHEMA house GRANT ALL ON TABLES TO house;
ALTER DEFAULT PRIVILEGES FOR ROLE house IN SCHEMA house GRANT ALL ON SEQUENCES TO house;
```

## 백업 / 복구 메모

기존 standalone postgres에서 외부 공유 postgres로 전환할 때 받아 둔 SQL 두 파일이 EC2 호스트에 보존되어 있다.

- `/home/ubuntu/house-items-ec2.sql` (전체 DB pg_dump)
- `/home/ubuntu/house-items-ec2-house.sql` (house 스키마 한정 dump)

기존 standalone postgres 볼륨은 검증 후 정리되어 더 이상 존재하지 않는다. 향후 복구 필요 시 호스트의 백업 SQL 파일을 auto-postgres의 auto DB house 스키마에 적재한다.

## 주의

- SSH private key 파일 자체는 저장소에 추가하지 않는다.
- Docker Hub 비밀번호, 토큰, 개인 인증 정보는 문서와 저장소에 기록하지 않는다.
- `.env`는 `.gitignore` 대상이라 git에 들어가지 않는다. EC2에 직접 보관한다.
