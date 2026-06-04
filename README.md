# TaskFlow Todo

A CRUD todo application with a dependency-free frontend and a SQL Server-ready backend.

## 📸 Project Overview

### Application UI
<img width="1919" height="970" alt="image" src="https://github.com/user-attachments/assets/c0e06ad2-3d81-4d38-913b-b8f3e9bd93a0" />

### System Architecture
This diagram illustrates the data flow from the internet through the AWS Load Balancer to the pods within the cluster:
<img width="1408" height="768" alt="Gemini_Generated_Image_vavsuwvavsuwvavs" src="https://github.com/user-attachments/assets/70f74069-4505-4c82-bbb7-82b8b6a0390c" />

## ✨ Key Features
* **Full Task Management:** Create, Read, Update, and Delete (CRUD) operations.
* **Flexible Storage:** Supports SQL Server for production data, with a `localStorage` fallback for quick local usage.

## 🏗 Professional Infrastructure
* **VPC:** Custom network design with full subnet isolation, ensuring resources are protected within a private environment.
* **High Availability:** Multi-node K3s cluster architecture, featuring a distributed Control Plane and Worker Nodes.
* **Security-First Design:** All Kubernetes nodes (Control Plane and Workers) are deployed exclusively in **private subnets**, minimizing the attack surface and ensuring they are unreachable from the public internet.
* **Traffic Management:** Configured AWS ALB with Traefik Ingress Controller to securely route traffic from the public-facing ALB to the private application pods.

---

## 🛠 Technical Requirements
* **Frontend:** Vanilla JavaScript (dependency-free).
* **Backend:** Node.js, ready for SQL Server integration.
* **Orchestration:** K3s Kubernetes Cluster.
* **Cloud:** AWS (VPC, EC2, ALB).
## Environment Variables

Configure these in `.env` locally, Docker environment variables, or Kubernetes ConfigMaps/Secrets:

- `NODE_ENV`: set to `production` in Docker/Kubernetes.
- `PORT`: container HTTP port, default `3000`.
- `HOST`: bind address, default `0.0.0.0` for containers.
- `CORS_ORIGIN`: optional allowed browser origin.
- `SQL_SERVER`, `SQL_PORT`, `SQL_DATABASE`: SQL Server connection target.
- `SQL_USER`, `SQL_PASSWORD`: database credentials. Store these in Kubernetes Secrets.
- `SQL_ENCRYPT`, `SQL_TRUST_SERVER_CERTIFICATE`: SQL Server TLS settings.
- `SQL_CONNECTION_TIMEOUT_MS`, `SQL_REQUEST_TIMEOUT_MS`: SQL driver timeout controls.

## 🚀 Quick Start (Local Development)

1. **Static Version:** Open `index.html` directly in your browser.
2. **Database-Connected Version:**
   - Ensure SQL Server is running.
   - Prepare your `.env` file based on `.env.example`.
   - Install dependencies: `npm install`.
   - Start the application: `npm start`.

---

## ☁️ Deployment on Kubernetes
This project is built to be "Cloud Native." You can deploy it using the manifests in the `k8s/` directory:

1. Edit `k8s/configmap.example.yaml` and `k8s/secret.example.yaml` with your database credentials.
2. Update the Docker image in `k8s/deployment.yaml` to point to your AWS ECR image.
3. Apply the configuration: `kubectl apply -f k8s/`.

---

## 💡 Why This Matters
Through this project, one learns how to build **Infrastructure as Code** from scratch and how to bridge AWS services (like ALB) with a **Kubernetes Ingress Controller**, ensuring the application is production-ready.

