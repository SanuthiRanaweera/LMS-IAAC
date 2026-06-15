# GitHub Actions CI/CD Setup Guide

## How it works

Every push to `main`:
1. Runs backend tests
2. Builds + tests frontend
3. If both pass → SSHs into your VPS → pulls latest code → rebuilds Docker containers

---

## Step 1 — Generate an SSH key pair (on your local machine)

This key lets GitHub SSH into your VPS without a password.

```bash
# Generate a dedicated key for GitHub Actions (don't use your personal key)
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy

# This creates two files:
# ~/.ssh/github_actions_deploy       ← PRIVATE key (goes into GitHub Secrets)
# ~/.ssh/github_actions_deploy.pub   ← PUBLIC key (goes onto your VPS)
```

---

## Step 2 — Add the public key to your VPS

SSH into your VPS and run:

```bash
# On your VPS:
cat >> ~/.ssh/authorized_keys << 'EOF'
paste-the-contents-of-github_actions_deploy.pub-here
EOF

# Fix permissions
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh
```

To get the public key content on your local machine:
```bash
cat ~/.ssh/github_actions_deploy.pub
```

---

## Step 3 — Add GitHub Secrets

Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these 5 secrets:

| Secret name   | Value                                              |
|---------------|----------------------------------------------------|
| `VPS_HOST`    | Your VPS public IP (e.g. `123.456.789.10`)        |
| `VPS_USER`    | Your VPS SSH username (usually `root` or `ubuntu`) |
| `VPS_SSH_KEY` | The PRIVATE key (full content of `github_actions_deploy`) |
| `MONGO_URI`   | Your MongoDB Atlas connection string               |
| `JWT_SECRET`  | Your JWT secret string                             |

To get the private key content:
```bash
cat ~/.ssh/github_actions_deploy
# Copy everything including -----BEGIN...----- and -----END...-----
```

---

## Step 4 — Make sure your VPS has the repo cloned

If you haven't already cloned the repo on the VPS:

```bash
# On your VPS:
sudo mkdir -p /opt/mern-app
sudo chown $USER:$USER /opt/mern-app
git clone https://github.com/yourusername/your-repo.git /opt/mern-app
```

And make sure your `.env` file is there (GitHub Actions does NOT manage .env):
```bash
nano /opt/mern-app/.env
# Add MONGO_URI and JWT_SECRET here
```

---

## Step 5 — Push and watch it run

```bash
# Any push to main triggers the workflow
git add .
git commit -m "add github actions ci/cd"
git push origin main
```

Then go to your repo → **Actions** tab to watch it live.

---

## Workflow summary

```
Push to main
    │
    ├── test-backend ──┐
    │                  ├── both pass → deploy to VPS via SSH
    └── test-frontend ─┘
              │
              └── either fails → deployment is SKIPPED
```

---

## Troubleshooting

**"Permission denied (publickey)"**
→ The public key wasn't added correctly to `~/.ssh/authorized_keys` on the VPS.
→ Check with: `ssh -i ~/.ssh/github_actions_deploy user@your-vps-ip`

**"No such file or directory: /opt/mern-app"**
→ The repo isn't cloned on the VPS yet. Run Step 4.

**Containers not updating**
→ SSH into VPS and run manually:
```bash
cd /opt/mern-app
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

**See GitHub Actions logs**
→ Repo → Actions tab → click the failed run → expand each step
