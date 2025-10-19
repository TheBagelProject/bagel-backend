# Bagel - Self Service Terraform Platform

## Quick Start with Docker Compose

After cloning this repository and ensuring Docker and Docker Compose are installed, you can start the entire Bagel platform (MongoDB, backend, frontend, and server) with a single command:

```sh
docker-compose up -d
```

This will start the following services:
- **mongo-bagel**: MongoDB database
- **bagel-backend**: Backend API (Node.js, Express)
- **bagel-ui**: Frontend (Next.js)
- **bagel-server**: Terraform runner (custom image)

### Accessing the Platform
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **MongoDB**: localhost:27017 (for development/inspection)

### Stopping the Platform
To stop all services:
```sh
docker-compose down
```

### Customization
- Edit environment variables in `docker-compose.yml` as needed (e.g., secrets, DB name, ports).
- If you update images, rebuild and push them to Docker Hub before running compose.

---

For more details, see the documentation in the frontend and backend folders.
