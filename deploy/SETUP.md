# Hetzner deploy setup (one-time)

Access model: the app is reachable only from your Tailscale devices. Tailscale signs in with GitHub. GitHub Actions deploys over SSH with a dedicated deploy key on port 22.

Assumes a Hetzner Cloud VM running Ubuntu 24.04.

## 1. Create the server

- Create a server in Hetzner Cloud (Ubuntu 24.04, CX22 or larger is plenty).
- Add your own SSH public key when creating it.
- Optional but recommended: attach a Cloud Firewall that allows only inbound TCP 22 and UDP 41641 (Tailscale). Nothing else.

SSH in as root and run the rest of the steps there.

## 2. Base hardening and firewall

```sh
apt update && apt -y upgrade
apt -y install rsync curl ufw fail2ban

# Key-only SSH
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart ssh

ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow in on tailscale0      # only Tailscale devices reach the web app
ufw enable
```

Port 3001 (the backend) is denied by the default policy. The backend has no login of its own, so it must stay closed.

## 3. Deploy user

```sh
adduser --disabled-password --gecos "" deploy
mkdir -p /home/deploy/.ssh
# Paste the PUBLIC key from step 4 into this file:
nano /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh && chmod 600 /home/deploy/.ssh/authorized_keys

# Allow deploy to restart only this one service, without a password
echo 'deploy ALL=(root) NOPASSWD: /usr/bin/systemctl restart hevy-chat' > /etc/sudoers.d/deploy-hevy-chat
chmod 440 /etc/sudoers.d/deploy-hevy-chat
```

## 4. Deploy key (on your PC)

```sh
ssh-keygen -t ed25519 -f hevy-deploy -N ""
```

- `hevy-deploy.pub` goes into `/home/deploy/.ssh/authorized_keys` (step 3).
- `hevy-deploy` (private) goes into the GitHub secret `DEPLOY_SSH_KEY` (step 7). Delete the local copy afterwards.

## 5. Node.js, Caddy, Tailscale

```sh
# Node 22 (provides /usr/bin/node)
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt -y install nodejs

# Caddy
apt -y install debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt -y install caddy

# Tailscale: open the printed URL and sign in with GitHub
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up
```

In the Tailscale admin console, confirm that only your own devices are in the tailnet and that the server is listed.

## 6. App directories, env file, service, Caddy

```sh
mkdir -p /opt/hevy-chat/app/backend/data
chown -R deploy:deploy /opt/hevy-chat

# Secrets live only on the server (never in git or in rsync)
printf 'HEVY_API_KEY=your-key-here\n' > /opt/hevy-chat/app/backend/.env
chown deploy:deploy /opt/hevy-chat/app/backend/.env
chmod 600 /opt/hevy-chat/app/backend/.env

# Service and Caddy config come from this repo (copy the files over, e.g. with scp)
cp deploy/hevy-chat.service /etc/systemd/system/hevy-chat.service
cp deploy/Caddyfile /etc/caddy/Caddyfile
systemctl daemon-reload
systemctl enable hevy-chat caddy
systemctl restart caddy
```

The service starts once the first deploy has put files in place (step 8).

## 7. GitHub secrets

Repo → Settings → Secrets and variables → Actions:

| Name | Value |
| --- | --- |
| `DEPLOY_HOST` | Server public IPv4 (from Hetzner) |
| `DEPLOY_SSH_KEY` | Contents of the private key `hevy-deploy` |
| `DEPLOY_KNOWN_HOSTS` | Output of `ssh-keyscan -H <server-ip>` (run on your PC) |

`DEPLOY_KNOWN_HOSTS` pins the server's host key, so the workflow refuses to talk to an impostor.

## 8. Deploy

Push to `main`, or run the **Deploy** workflow from the Actions tab. When it finishes:

- Open `http://<tailscale-machine-name>` (MagicDNS name, for example `http://hevy-chat`) from any device signed in to your tailnet.
- Check the service on the server: `systemctl status hevy-chat` and `journalctl -u hevy-chat -f`.

## Notes

- Tailscale's free tier covers personal use. Adding someone later means inviting them to the tailnet, so only do this when you want that.
- To drop public SSH entirely later, put SSH on the tailnet too (`tailscale up --ssh`) and change the workflow to connect via the Tailscale address. Not needed to get started.
