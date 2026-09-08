# Oracle Cloud 배포 가이드 — policy-blog

Vercel 대신 Oracle Cloud Free Tier로 배포하기 위한 단계별 가이드다.
`deploy/` 안의 파일들(`policy-blog.service`, `nginx.conf`, `setup.sh`)과 함께 사용한다.
**quant-family(`quant-family/deploy/README-DEPLOY.md`)에서 검증된 구성(systemd + nginx + certbot)을 그대로 적용**했다 — pm2가 아니라 systemd를 쓰는 이유도 그 선례를 따른 것.

> 이 문서와 스크립트는 서버에 접속하지 않고 작성되었다. 실제 서버 환경(디렉토리 경로, 계정명, 도메인)에 맞춰 값을 바꿔야 한다.

pj-blog는 모노레포이므로, 이후 stock-blog도 같은 인스턴스에 같은 패턴(다른 포트 3000, 별도 systemd 유닛)으로 추가 배포하면 된다. 이 문서는 policy-blog 단독 배포만 다룬다.

---

## 0. 사전 준비 체크리스트

- [ ] Oracle Cloud 계정 + Always Free 인스턴스 생성 완료
- [ ] 로컬에 `policy-blog/.env.local` 파일 존재 확인 (git에는 없음 — 절대 커밋 금지)
- [ ] 도메인 소유 (없으면 서브도메인이라도 준비 권장. IP 직접 접속도 가능하지만 HTTPS/certbot을 쓰려면 도메인 필요)
- [ ] MongoDB Atlas 클러스터 생성 완료 (`docs/오라클-배포-계획.md` 5절 — 로컬 MongoDB를 쓰고 있었다면 먼저 Atlas로 이관)

---

## 1. 인스턴스 사양 선택

Oracle Cloud Always Free 티어 기준 (quant-family와 동일 기준):

| 옵션 | 사양 | 비고 |
|------|------|------|
| **권장** | Ampere A1 (ARM), 4 OCPU / 24GB RAM | Always Free 한도 내 최대 사양. Next.js 빌드(`npm run build`)가 메모리를 꽤 쓰므로 여유 있는 편이 좋음. stock-blog까지 같은 인스턴스에 올릴 계획이면 필수 |
| 최소 구성 | AMD Micro (VM.Standard.E2.1.Micro), 1 OCPU / 1GB RAM | RAM이 빠듯함 — **스왑 설정 필수**, `npm run build`가 OOM으로 죽을 수 있음 |

### 1GB RAM 인스턴스를 쓸 경우 스왑 설정 (필수)

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

ARM Ampere A1(24GB)을 쓴다면 스왑 없이도 충분하다.

---

## 2. Oracle 콘솔에서 네트워크 포트 열기 (Security List)

Oracle Cloud는 **OS 방화벽(iptables/ufw)**과 **클라우드 레벨 Security List** 둘 다 열어야 외부 접속이 가능하다. 하나만 열면 계속 막혀 있다.

1. Oracle Cloud 콘솔 로그인 → 좌측 메뉴 **Networking → Virtual Cloud Networks**
2. 인스턴스가 속한 VCN 선택 → **Subnets** 탭 → 해당 서브넷 클릭
3. **Security Lists** 섹션 → 기본 Security List 클릭
4. **Ingress Rules → Add Ingress Rules**
   - Source CIDR: `0.0.0.0/0`, IP Protocol: TCP, Destination Port: `80`
   - 같은 방식으로 Destination Port `443` 규칙도 추가
5. 저장 후, 인스턴스 내부에서도 OS 방화벽(ufw 사용 시)을 함께 열어야 한다:
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   ```
   (Ubuntu 22.04 기본 이미지는 ufw가 비활성인 경우가 많음 — `sudo ufw status`로 먼저 확인)

---

## 3. 초기 설정 스크립트 실행

```bash
# 서버에서 실행 (root 권한 필요) — pj-blog 모노레포 전체를 클론한다
REPO_URL=<pj-blog-git-저장소-URL> APP_DIR=/opt/pj-blog sudo -E bash policy-blog/deploy/setup.sh
```

`setup.sh`가 자동으로 하는 일:
- apt 업데이트, `nginx`/`certbot`/Node.js 22.x 설치
- 모노레포 저장소 clone 또는 pull (`APP_DIR`, 기본 `/opt/pj-blog`)
- `policy-blog/`에서 `npm install && npm run build`
- systemd 유닛(`policy-blog`) 설치 + enable
- nginx 설정 적용

**스크립트가 하지 않는 것 (아래에서 수동 진행):**
- `.env.local` 배치
- Security List 인그레스 규칙 (2단계, 콘솔 작업이라 스크립트로 불가)
- 도메인 DNS 연결
- certbot 인증서 발급
- MongoDB Atlas Network Access에 이 인스턴스 IP 등록

---

## 4. `.env.local` 안전 전송

`.env.local`은 절대 git에 포함되지 않는다. `scp`로 직접 전송한다:

```bash
scp policy-blog/.env.local ubuntu@<서버-퍼블릭-IP>:/opt/pj-blog/policy-blog/.env.local
```

전송 후 서버에서 권한 제한:
```bash
sudo chmod 600 /opt/pj-blog/policy-blog/.env.local
sudo chown ubuntu:ubuntu /opt/pj-blog/policy-blog/.env.local
```

> **경고**: `.env.local`을 `git add`, 커밋, 저장소에 두는 방식으로 옮기지 말 것. 반드시 scp/rsync 등 직접 전송만 사용한다.

필요한 환경변수 (`policy-blog/CLAUDE.md` 참고):
```
MONGODB_URI=mongodb+srv://...        # Atlas 연결 문자열 — 6단계에서 Network Access 등록 필요
NEXT_PUBLIC_ADSENSE_ID=
NEXT_PUBLIC_SITE_URL=                 # 실제 프로덕션 도메인 (https://policy.example.com)
NEXT_PUBLIC_FASTAPI_URL=http://localhost:8000  # 프로덕션에서는 어차피 /admin이 차단되므로 의미 없음, 값만 채워둘 것
ADMIN_SECRET=
NEXT_PUBLIC_LEVEL2_ENABLED=
```

빌드 시점에 인라인되는 `NEXT_PUBLIC_*` 값은 **`.env.local` 배치 후 반드시 재빌드**해야 반영된다 (`npm run build`를 다시 실행 — Next.js는 `NEXT_PUBLIC_*`를 빌드 타임에 번들에 굽는다). `setup.sh`를 처음 실행할 때 `.env.local`이 아직 없었다면, 배치 후 아래를 수동으로 한 번 더 실행:
```bash
cd /opt/pj-blog/policy-blog && npm run build && sudo systemctl restart policy-blog
```

---

## 5. 도메인 연결 + HTTPS (certbot)

1. 도메인 DNS 관리 페이지에서 **A 레코드**를 인스턴스 퍼블릭 IP로 연결
   - 예: `policy.example.com` → `123.45.67.89`
2. DNS 전파 확인 (몇 분~몇 시간 소요):
   ```bash
   dig +short policy.example.com
   ```
3. `deploy/nginx.conf`(80-only, `YOUR_DOMAIN` 포함)를 실제 도메인으로 교체하고 서버에 반영:
   ```bash
   sudo sed -i 's/YOUR_DOMAIN/policy.example.com/g' /etc/nginx/sites-available/policy-blog
   sudo nginx -t && sudo systemctl reload nginx
   ```
   **주의**: 이 시점의 `nginx.conf`에는 443 블록을 넣지 않는다. 인증서 파일이 없는 상태로
   443 블록을 넣으면 `nginx -t`가 "no ssl_certificate is defined"로 실패한다
   (policynote.io.kr 배포 시 실제로 겪음). 443 블록은 아래 4번 certbot이 자동으로 추가한다.
4. 인증서 발급 (443 블록 + 80→443 redirect까지 certbot이 파일에 직접 추가/수정):
   ```bash
   sudo certbot --nginx -d policy.example.com -d www.policy.example.com \
     -m <이메일> --agree-tos --no-eff-email --redirect --non-interactive
   ```
5. 자동 갱신 확인 (certbot 설치 시 타이머가 자동 등록됨):
   ```bash
   sudo systemctl status certbot.timer
   sudo certbot renew --dry-run
   ```

**애드센스 신청 전제**: vercel.app류 서브도메인이 불가했던 것과 같은 이유로, 오라클 배포에서도 정식 도메인(A 레코드 연결) 없이 IP 직접 접속만으로는 애드센스 신청이 불가하다.

---

## 6. MongoDB Atlas Network Access 등록

Atlas 콘솔 → **Network Access** → 이 인스턴스의 퍼블릭 IP 추가. (로컬 개발용 content-api의 IP도 별도로 이미 등록되어 있어야 함 — `docs/오라클-배포-계획.md` 5절 참고.) 등록 전에는 `MONGODB_URI` 연결이 타임아웃으로 실패한다.

---

## 7. 예약 발행 자동화 (Level 2)

Admin에서 사람이 "48시간 후 예약 발행"으로 등록한 글(`scheduled_publish_at`)을 실제 시각이 되면 `published`로 전환하는 트리거. **검수·승인 자체는 여전히 사람이 Admin에서 직접 한다** — 이건 그 이후 "시간 되면 발행" 부분만 대신한다.

```bash
sudo cp policy-blog/deploy/publish-scheduled.service /etc/systemd/system/
sudo cp policy-blog/deploy/publish-scheduled.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now publish-scheduled.timer
```

15분마다 `scripts/publish-scheduled.js`를 실행해서 `scheduled_publish_at <= 지금`인 글을 발행 처리한다. 검증:
```bash
node scripts/publish-scheduled.js --dry-run   # 실제로 바꾸지 않고 대상만 확인
sudo systemctl status publish-scheduled.timer
sudo journalctl -u publish-scheduled.service -n 20
```

---

## 7. 서비스 기동 및 로그 확인

```bash
sudo systemctl start policy-blog
sudo systemctl status policy-blog

# 실시간 로그
journalctl -u policy-blog -f
```

quant-family와 달리 policy-blog에는 헤드리스 스케줄러가 없다 (콘텐츠 생성은 로컬 content-api가 담당, 블로그는 읽기 전용) — 스케줄러 중복 실행 고려 불필요.

---

## 8. 코드 갱신 배포 절차

```bash
cd /opt/pj-blog && git pull
cd policy-blog && npm install && npm run build
sudo systemctl restart policy-blog
```

---

## 9. 트러블슈팅 체크리스트

**502 Bad Gateway 시 확인 순서**
1. `sudo systemctl status policy-blog` — 프로세스가 살아있는지 확인
2. `journalctl -u policy-blog -n 100 --no-pager` — 최근 에러 확인 (대부분 `.env.local` 누락으로 인한 MongoDB 연결 실패, 또는 `.next` 빌드 산출물 없음)
3. `curl http://127.0.0.1:3001` — nginx를 거치지 않고 앱에 직접 접속해서 앱 자체가 죽었는지, nginx 설정 문제인지 구분
4. `sudo nginx -t` — nginx 설정 문법 오류 확인
5. WorkingDirectory 확인 — `policy-blog.service`의 `WorkingDirectory`(`/opt/pj-blog/policy-blog`)가 실제 코드가 있는 경로와 일치하는지. `.env.local`, `.next/`가 전부 이 경로 기준 상대경로로 로드됨

**`NEXT_PUBLIC_*` 값이 반영 안 됨**
- Next.js는 `NEXT_PUBLIC_*`를 빌드 타임에 번들에 굽는다. `.env.local` 수정 후 재시작만으로는 반영되지 않는다 — 반드시 `npm run build` 재실행 후 `systemctl restart policy-blog`.

**빌드 실패 (OOM)**
- 1GB RAM 인스턴스에서 `npm run build` 도중 프로세스가 죽으면 스왑 설정(1절) 확인.

**인증서 발급 실패**
- DNS 전파가 끝나기 전에 certbot을 실행하면 실패한다. `dig +short YOUR_DOMAIN`으로 IP가 정확히 뜨는지 먼저 확인
- 80 포트가 Security List에서 열려 있어야 certbot의 HTTP-01 검증이 통과함

**`/admin`이 오라클에서도 열리는지 확인**
- `src/middleware.ts`가 `NODE_ENV=production`일 때만 차단한다. `next start`는 Next.js가 내부적으로 항상 `NODE_ENV=production`으로 강제 실행하므로(유닛 파일의 `Environment="NODE_ENV=production"`은 안전장치일 뿐 필수는 아님) 정상적으로는 항상 차단된다. 배포 후 `curl -i https://policy.example.com/admin`으로 404가 뜨는지 한 번은 직접 확인할 것.
