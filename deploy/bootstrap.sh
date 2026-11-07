#!/usr/bin/env bash
# One-time server bootstrap for deploy/SETUP.md steps 2, 3, 5 and 6.
# Run as root on a fresh Ubuntu 24.04 Hetzner server, after copying this deploy/ folder to it:
#
#   scp -r deploy root@<server-ip>:/root/
#   ssh root@<server-ip>
#   DEPLOY_PUBKEY="$(cat hevy-deploy.pub)" HEVY_API_KEY='...' bash /root/deploy/bootstrap.sh
#
# The script is safe to re-run. Your own SSH key must already be on the server
# (Hetzner adds it when you create the server) because password SSH login is disabled here.
set -euo pipefail

: "${DEPLOY_PUBKEY:?set DEPLOY_PUBKEY to the contents of hevy-deploy.pub}"
: "${HEVY_API_KEY:?set HEVY_API_KEY to your Hevy API key}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this as root." >&2
  exit 1
fi

HERE="$(cd "$(dirname "$0")" && pwd)"

echo "==> Step 2: base packages, SSH hardening, firewall"
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get -y upgrade
DEBIAN_FRONTEND=noninteractive apt-get -y install rsync curl ufw fail2ban gpg debian-keyring debian-archive-keyring apt-transport-https

sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart ssh

ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow in on tailscale0
ufw --force enable

echo "==> Step 3: deploy user and sudo rule"
if ! id deploy &>/dev/null; then
  adduser --disabled-password --gecos "" deploy
fi
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
printf '%s\n' "$DEPLOY_PUBKEY" > /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys

printf 'deploy ALL=(root) NOPASSWD: /usr/bin/systemctl restart hevy-chat\n' > /etc/sudoers.d/deploy-hevy-chat
chmod 440 /etc/sudoers.d/deploy-hevy-chat
visudo -cf /etc/sudoers.d/deploy-hevy-chat

echo "==> Step 5: Node 22, Caddy, Tailscale"
if ! command -v node &>/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  DEBIAN_FRONTEND=noninteractive apt-get -y install nodejs
fi

if ! command -v caddy &>/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list > /dev/null
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get -y install caddy
fi

if ! command -v tailscale &>/dev/null; then
  curl -fsSL https://tailscale.com/install.sh | sh
fi

echo "==> Step 6: app directories, secrets file, service and Caddy config"
install -d -o deploy -g deploy /opt/hevy-chat /opt/hevy-chat/app /opt/hevy-chat/app/backend /opt/hevy-chat/app/backend/data
chown -R deploy:deploy /opt/hevy-chat

umask 077
printf 'HEVY_API_KEY=%s\n' "$HEVY_API_KEY" > /opt/hevy-chat/app/backend/.env
chown deploy:deploy /opt/hevy-chat/app/backend/.env
chmod 600 /opt/hevy-chat/app/backend/.env
umask 022

cp "$HERE/hevy-chat.service" /etc/systemd/system/hevy-chat.service
cp "$HERE/Caddyfile" /etc/caddy/Caddyfile
systemctl daemon-reload
systemctl enable hevy-chat caddy
systemctl restart caddy
# hevy-chat is enabled but not started yet: the first deploy puts the code in place.

echo
echo "==> Bootstrap done. Last step is Tailscale sign-in (interactive)."
echo "    Open the URL printed below in your browser and sign in with GitHub."
echo "    Then, on your PC, get the server IP into the GitHub secrets (SETUP.md step 7)."
echo
tailscale up
tailscale status
