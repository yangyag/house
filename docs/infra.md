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
- nginx site 파일: `/etc/nginx/sites-enabled/yangyag2-house`
- 인증서 경로:
  - `/etc/letsencrypt/live/yangyag2.duckdns.org/fullchain.pem`
  - `/etc/letsencrypt/live/yangyag2.duckdns.org/privkey.pem`

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
- `house-inventory-postgres`
  - image: `postgres:17`
  - volume: `house-inventory-postgres-data`

백엔드 CORS 허용 origin:

```text
http://localhost:8085,http://43.202.113.123:8085,http://yangyag2.duckdns.org,https://yangyag2.duckdns.org
```

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

## 주의

- SSH private key 파일 자체는 저장소에 추가하지 않는다.
- Docker Hub 비밀번호, 토큰, 개인 인증 정보는 문서와 저장소에 기록하지 않는다.
- 운영에 가까운 환경에서는 Compose에 직접 적힌 DB 계정/비밀번호를 별도 secret 관리로 분리하는 것이 좋다.
