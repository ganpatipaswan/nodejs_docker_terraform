# End-to-End Deployment Guide

## Project: Node.js Application Deployment using Docker, AWS EC2, and Terraform

---

## 1. Overview

This document describes a complete, real-world DevOps workflow to:

* Build a Node.js application
* Containerize it using Docker
* Push a multi-architecture image to Docker Hub
* Provision AWS EC2 infrastructure using Terraform
* Deploy and update the application on EC2

This setup works on **Apple Silicon (arm64)** and **AWS EC2 (amd64)** and follows industry best practices.

---

## 2. Architecture

**Flow:**

Local Machine (Mac M1/M2)
→ Docker (Multi-Arch Image)
→ Docker Hub
→ Terraform
→ AWS EC2 (Amazon Linux 2)
→ Node.js App running on Port 3000

---

## 3. Prerequisites

### Local Machine

* Docker Desktop (with buildx enabled)
* AWS CLI configured (`aws configure`)
* Terraform installed
* SSH key generation capability

### AWS

* AWS account
* IAM user with EC2 permissions
* EC2 key pair (created in the same region)

---

## 4. Project Structure

```
nodejs_docker_terraform/
├── app/
│   ├── index.js
│   ├── package.json
│   └── Dockerfile
└── terraform/
    ├── main.tf
    ├── variables.tf
    └── outputs.tf
```

---

## 5. Node.js Application

### index.js

* Uses Express
* Listens on port 3000
* Binds to 0.0.0.0 (required for Docker)

### package.json

* Defines `npm start`
* Contains Express dependency

---

## 6. Docker Configuration

### Dockerfile

Key points:

* Uses Node 20 Alpine image
* Copies package files first
* Installs dependencies
* Exposes port 3000
* Runs `npm start`

---

## 7. Multi-Architecture Docker Image

### Problem Solved

* Mac M1/M2 = `linux/arm64`
* AWS EC2 = `linux/amd64`
* Single-arch images fail on EC2

### Solution

Use Docker Buildx to build and push a **multi-architecture image**.

### Build & Push

```
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t ganpatipaswan/node-demo:latest \
  --push .
```

### Verification

```
docker buildx imagetools inspect ganpatipaswan/node-demo:latest
```

---

## 8. Terraform Infrastructure

### Provider

* Region: us-east-1

### Resources Created

* Security Group (ports 22 and 3000 open)
* EC2 Instance (Amazon Linux 2)

### Best Practice: Dynamic AMI

Use `data.aws_ami` instead of hardcoding AMI IDs.

---

## 9. EC2 Key Pair Handling

### Important Rules

* Key pairs are **region-specific**
* Terraform references key pair by **name**, not `.pem` file
* If private key is lost or mismatched → EC2 must be recreated

### Creating Key Pair (CLI)

```
aws ec2 create-key-pair \
  --key-name ganpati_aws_fix \
  --region us-east-1 \
  --query 'KeyMaterial' \
  --output text > ganpati_aws_fix.pem

chmod 400 ganpati_aws_fix.pem
```

---

## 10. Terraform Apply Flow

```
terraform init
terraform validate
terraform plan
terraform apply
```

Outputs:

* EC2 public IP address

---

## 11. SSH Access to EC2

```
ssh -i ganpati_aws_fix.pem ec2-user@<EC2_PUBLIC_IP>
```

Rules:

* No `sudo`
* No password
* Use correct user: `ec2-user`

---

## 12. Running the Application on EC2

### Pull and Run Docker Container

```
docker run -d \
  --name node-demo \
  -p 3000:3000 \
  --restart unless-stopped \
  ganpatipaswan/node-demo:latest
```

### Verification

```
docker ps
sudo ss -tulpn | grep 3000
```

---

## 13. Accessing the Application

Open in browser:

```
http://<EC2_PUBLIC_IP>:3000
```

---

## 14. Updating Application Code (Deployment Flow)

### Step 1: Update Source Code Locally

Modify Node.js files (e.g., index.js).

### Step 2: Rebuild & Push Image

```
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t ganpatipaswan/node-demo:latest \
  --push .
```

### Step 3: Redeploy on EC2

```
docker stop node-demo
docker rm node-demo
docker pull ganpatipaswan/node-demo:latest
docker run -d \
  --name node-demo \
  -p 3000:3000 \
  --restart unless-stopped \
  ganpatipaswan/node-demo:latest
```

---

## 15. Common Errors & Fixes

### Permission denied (publickey)

* Wrong key pair
* Mismatched `.pem`
* Fix: recreate EC2 with correct key

### ERR_CONNECTION_REFUSED

* App not running
* Port not exposed
* Fix: run container and check port 3000

### no matching manifest for linux/amd64

* Image built only for arm64
* Fix: build multi-arch image using buildx

---

## 16. Best Practices

* Use versioned Docker tags (v1, v2, v3)
* Avoid `latest` in production
* Use restart policies
* Use IAM roles instead of SSH keys (SSM)
* Move images to AWS ECR for production

---

## 17. Next Enhancements

* Terraform `user_data` for auto-deploy
* CI/CD with GitHub Actions
* AWS ECR integration
* ALB + HTTPS
* Blue-Green deployments
* ECS / Fargate

---

## 18. Summary

This document demonstrates a complete DevOps lifecycle:

* Application development
* Containerization
* Infrastructure provisioning
* Deployment
* Debugging
* Updates

This is a **production-grade, interview-ready workflow**.

---

**End of Document**
