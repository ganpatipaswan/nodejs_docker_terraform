# Ansible + Docker + Node.js on AWS EC2 (Complete End‑to‑End Guide)

This document covers **everything we implemented and debugged**, step by step, with **all commands**, explanations, and **real production fixes**.

---

## 1. Architecture Overview

**Goal**: Deploy a Node.js application on AWS EC2 using Docker and Ansible.

**Flow**:

Local Machine (Mac M3)
→ Build Docker image (multi‑arch)
→ Push image to Docker Hub
→ Ansible connects via SSH
→ EC2 pulls image
→ Docker container runs Node.js app

---

## 2. Prerequisites

### Local Machine

* macOS (Apple Silicon M1/M2/M3)
* Docker Desktop
* Homebrew
* Ansible **2.15.x**

### AWS

* EC2 instance (Amazon Linux 2, amd64)
* Port 22 open (SSH)
* Port 3000 open (App)
* SSH key (.pem)

### Accounts

* Docker Hub account
* AWS account

---

## 3. Node.js Demo Application

### app.js

```js
const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.json({
    message: "Updated version deployed successfully ✅",
    version: "v2"
  });
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
```

### package.json

```json
{
  "name": "node-demo",
  "version": "1.0.0",
  "main": "app.js",
  "scripts": { "start": "node app.js" },
  "dependencies": { "express": "^4.18.2" }
}
```

---

## 4. Dockerfile

```Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install --only=production
COPY . .

EXPOSE 3000
CMD ["npm", "start"]
```

---

## 5. Build & Push Docker Image (Apple Silicon Safe)

### Enable buildx

```bash
docker buildx create --use
docker buildx inspect --bootstrap
```

### Build multi‑architecture image

```bash
docker buildx build \
  --no-cache \
  --platform linux/amd64,linux/arm64 \
  -t ganpatipaswan/node-demo:v2 \
  --push .
```

---

## 6. Ansible Project Structure

```text
ansible/
├── ansible.cfg
├── inventory
├── site.yml
└── roles/
    ├── common/
    │   └── tasks/main.yml
    ├── docker/
    │   └── tasks/main.yml
    └── app/
        └── tasks/main.yml
```

---

## 7. Ansible Configuration

### ansible.cfg

```ini
[defaults]
inventory = inventory
remote_user = ec2-user
private_key_file = ~/ganpati_aws_fix.pem
host_key_checking = False
```

### inventory

```ini
[app]
node-server ansible_host=54.xxx.xxx.xxx
```

---

## 8. Role: common (Amazon Linux 2 – Stable)

`roles/common/tasks/main.yml`

```yaml
---
- name: Update system packages (Amazon Linux 2)
  shell: yum update -y
  when: ansible_distribution == "Amazon"

- name: Install basic utilities
  shell: yum install -y curl wget unzip
  when: ansible_distribution == "Amazon"
```

**Why shell?**

* Avoids yum/dnf backend detection bugs
* Stable on Amazon Linux 2

---

## 9. Role: docker

`roles/docker/tasks/main.yml`

```yaml
---
- name: Install Docker
  shell: yum install -y docker
  when: ansible_distribution == "Amazon"

- name: Start and enable Docker
  shell: |
    systemctl start docker
    systemctl enable docker
  when: ansible_distribution == "Amazon"

- name: Add ec2-user to docker group
  shell: usermod -aG docker ec2-user
  when: ansible_distribution == "Amazon"
```

---

## 10. Role: app (Force Update – No Cache)

`roles/app/tasks/main.yml`

```yaml
---
- name: Pull Docker image (v2)
  shell: docker pull ganpatipaswan/node-demo:v2
  when: ansible_distribution == "Amazon"

- name: Stop old container
  shell: docker rm -f node-demo || true
  when: ansible_distribution == "Amazon"

- name: Remove old image
  shell: docker rmi ganpatipaswan/node-demo:v2 || true
  when: ansible_distribution == "Amazon"

- name: Pull image again
  shell: docker pull ganpatipaswan/node-demo:v2
  when: ansible_distribution == "Amazon"

- name: Run Node.js container
  shell: |
    docker run -d \
      --name node-demo \
      -p 3000:3000 \
      --restart always \
      ganpatipaswan/node-demo:v2
  when: ansible_distribution == "Amazon"
```

---

## 11. Orchestration Playbook

### site.yml

```yaml
- name: Deploy Node.js App using Docker
  hosts: app
  become: yes

  roles:
    - common
    - docker
    - app
```

---

## 12. Run Deployment

```bash
ansible-playbook site.yml
```

Expected recap:

```text
ok=10  changed=9  failed=0
```

---

## 13. Verify Deployment

### Application check

```bash
curl http://<EC2_PUBLIC_IP>:3000
```

Expected:

```json
{
  "message": "Updated version deployed successfully ✅",
  "version": "v2"
}
```

### Docker verification on EC2

```bash
docker ps
docker images | grep node-demo
docker inspect node-demo | grep Image
```

---

## 14. Updating Source Code (Correct Way)

1. Change code locally
2. Build new version

```bash
docker buildx build --no-cache \
  --platform linux/amd64,linux/arm64 \
  -t ganpatipaswan/node-demo:v3 \
  --push .
```

3. Update Ansible image tag
4. Run playbook again

---

## 15. Common Errors & Fixes

| Error                | Cause               | Fix                         |
| -------------------- | ------------------- | --------------------------- |
| Permission denied    | Wrong SSH user      | Use `ec2-user`              |
| no Dockerfile        | Build on EC2        | Build locally               |
| no matching manifest | ARM vs AMD          | buildx multi‑arch           |
| changes not updating | Docker cache        | `--no-cache` + remove image |
| yum/dnf error        | Ansible backend bug | Use `shell`                 |

---

## 16. Interview‑Ready Summary

> Deployed a Dockerized Node.js application on AWS EC2 using Ansible. Handled Amazon Linux package manager issues, Apple Silicon multi‑arch Docker builds, versioned deployments, and forced container refresh for reliable updates.

---

## 17. Production Improvements (Next Steps)

* Nginx reverse proxy
* HTTPS (Let’s Encrypt)
* Jenkins CI/CD
* Blue‑green deployment
* Rollback strategy

---

✅ **This document represents a complete real‑world DevOps workflow.**


The document is now open in the canvas on the right and includes:

✅ Full Node.js app

✅ Dockerfile

✅ Apple Silicon (M3) → AWS EC2 (amd64) handling

✅ Docker buildx multi-arch commands

✅ Ansible configuration (ansible.cfg, inventory)

✅ All roles (common, docker, app) with final stable code

✅ All Ansible + Docker commands

✅ Update & redeploy workflow

✅ Verification steps

✅ Common errors + real fixes

✅ Interview-ready summary

This is not a tutorial — it’s a real DevOps runbook you can:

reuse

share

revise

and confidently explain in interviews.