#!/usr/bin/env bash
# policy-blog — Oracle Cloud 인스턴스 초기 설정 스크립트 (아이드포턴트)
# quant-family/deploy/setup.sh와 동일한 구조. pj-blog는 모노레포이므로
# 저장소 전체를 클론하고, npm install/build는 policy-blog/ 하위에서만 실행한다.
#
# 사용법:
#   git clone 후 policy-blog 안에서, 또는 scp -r policy-blog/deploy 로 옮긴 뒤:
#   REPO_URL=<git-저장소-URL> APP_DIR=/opt/pj-blog sudo -E bash policy-blog/deploy/setup.sh
#
# 전제:
#   - Ubuntu 22.04 (ARM Ampere A1 또는 AMD 인스턴스 공통)
#   - REPO_URL / APP_DIR 값을 환경변수로 오버라이드 가능
#
# 이 스크립트가 하지 않는 것 (수동 필수):
#   - .env.local 파일 배치 (scp로 직접 전송, 이 스크립트는 절대 건드리지 않음)
#   - Oracle 콘솔 Security List에서 80/443 인그레스 규칙 추가
#   - 도메인 DNS A 레코드 설정
#   - certbot 인증서 발급 (README-DEPLOY.md 참고, 도메인 연결 후에만 가능)

set -euo pipefail

REPO_URL="${REPO_URL:-}"
APP_DIR="${APP_DIR:-/opt/pj-blog}"
APP_USER="${APP_USER:-ubuntu}"
PROJECT_DIR="${APP_DIR}/policy-blog"
NODE_MAJOR="${NODE_MAJOR:-22}"

echo "==> [1/7] apt 업데이트 및 필수 패키지 설치 (nginx, certbot, Node.js ${NODE_MAJOR}.x)"
apt-get update -y
apt-get install -y nginx certbot python3-certbot-nginx git curl
if ! command -v node >/dev/null 2>&1; then
    curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
    apt-get install -y nodejs
fi

echo "==> [2/7] 저장소 준비: ${APP_DIR}"
if [ -d "${APP_DIR}/.git" ]; then
    echo "    기존 저장소 발견 → git pull"
    git -C "${APP_DIR}" pull
elif [ -n "${REPO_URL}" ]; then
    echo "    저장소 클론: ${REPO_URL}"
    git clone "${REPO_URL}" "${APP_DIR}"
else
    echo "    REPO_URL이 지정되지 않았고 ${APP_DIR}에 기존 git 저장소도 없다."
    echo "    수동으로 코드를 ${APP_DIR}에 배치한 뒤 다시 실행하거나,"
    echo "    REPO_URL=<git-url> 환경변수와 함께 재실행하라."
    exit 1
fi

echo "==> [3/7] policy-blog 의존성 설치 + 빌드"
if [ ! -d "${PROJECT_DIR}" ]; then
    echo "    ⚠ ${PROJECT_DIR}가 없다. 모노레포 구조(policy-blog/)가 맞는지 확인하라."
    exit 1
fi
(cd "${PROJECT_DIR}" && npm install && npm run build)

echo "==> [4/7] 소유권 설정"
chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}"

echo "==> [5/7] .env.local 확인 (없으면 경고만 — 이 스크립트는 절대 생성/수정하지 않음)"
if [ ! -f "${PROJECT_DIR}/.env.local" ]; then
    echo "    ⚠ ${PROJECT_DIR}/.env.local 이 없다."
    echo "    로컬에서 scp로 전송하라: scp policy-blog/.env.local ${APP_USER}@<서버IP>:${PROJECT_DIR}/.env.local"
    echo "    .env.local 없이는 policy-blog 서비스가 기동 실패하거나 DB 연결에 실패한다 (MONGODB_URI 등 필수값 누락)."
fi

echo "==> [6/7] systemd 유닛 설치"
cp "${PROJECT_DIR}/deploy/policy-blog.service" /etc/systemd/system/policy-blog.service
systemctl daemon-reload
systemctl enable policy-blog
echo "    policy-blog: enable 완료 (기동은 .env.local 배치 후 'systemctl start policy-blog')"

echo "==> [7/7] nginx 설정"
cp "${PROJECT_DIR}/deploy/nginx.conf" /etc/nginx/sites-available/policy-blog
ln -sf /etc/nginx/sites-available/policy-blog /etc/nginx/sites-enabled/policy-blog
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

cat <<'EOF'

==================== 남은 수동 작업 ====================
1. policy-blog/deploy/nginx.conf의 YOUR_DOMAIN을 실제 도메인으로 교체 후
   /etc/nginx/sites-available/policy-blog에도 반영 (또는 스크립트 재실행 전 파일 수정).
   예: sudo sed -i 's/YOUR_DOMAIN/policy.example.com/g' /etc/nginx/sites-available/policy-blog
2. .env.local 파일을 scp로 전송:
   scp policy-blog/.env.local <user>@<서버IP>:/opt/pj-blog/policy-blog/.env.local
3. Oracle 콘솔 → VCN → Security List에서 Ingress 규칙 80/443 TCP 추가.
   (OS 방화벽만 열어서는 부족함 — 클라우드 레벨 Security List도 반드시 열어야 함,
    인스턴스 내부 ufw 사용 시 sudo ufw allow 80/tcp && sudo ufw allow 443/tcp 도 실행)
4. 도메인 A 레코드를 이 인스턴스의 퍼블릭 IP로 연결.
5. DNS 전파 확인(dig +short YOUR_DOMAIN) 후 인증서 발급:
   sudo certbot --nginx -d YOUR_DOMAIN
6. MongoDB Atlas Network Access에 이 인스턴스의 퍼블릭 IP 등록
   (등록 전에는 policy-blog가 DB 연결에 실패한다).
7. 서비스 기동:
   sudo systemctl start policy-blog
8. 로그 확인: journalctl -u policy-blog -f
==========================================================
EOF
