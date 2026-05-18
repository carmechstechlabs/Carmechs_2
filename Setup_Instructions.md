# Server Environment Setup: CarMechs Production Portal

This document outlines the tactical configuration for the CarMechs production environment, moving beyond the serverless Firebase architecture towards a dedicated full-stack deployment with Nginx and PostgreSQL.

## 1. Web Server Configuration (Nginx)

The following configuration should be placed in `/etc/nginx/sites-available/carmechs`.

```nginx
server {
    listen 80;
    server_name carmechs.in;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name carmechs.in;

    ssl_certificate /etc/letsencrypt/live/carmechs.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/carmechs.in/privkey.pem;

    # Frontend Assets (Vite Dist)
    location / {
        root /var/www/carmechs/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # Cache control for assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 30d;
            add_header Cache-Control "public, no-transform";
        }
    }

    # Backend API Proxy
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Content-Type-Options "nosniff";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}
```

## 2. Database Layer (PostgreSQL)

To transition from Firestore to PostgreSQL, follow these deployment steps:

### Schema Initialization
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'customer',
    loyalty_points INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    service_type VARCHAR(255),
    car_model VARCHAR(255),
    appointment_date DATE,
    appointment_time VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending',
    price DECIMAL(10, 2),
    payment_status VARCHAR(50) DEFAULT 'pending',
    transaction_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Backend Integration
Ensure `pg` is installed and configure the pool in your `server.ts` using the `DATABASE_URL` environment variable.

## 3. Deployment Pipeline

1. **Environment Variables:** Configure `.env` with production keys (Razorpay, SMTP, etc.).
2. **Build Phase:** `npm run build`
3. **Process Management:** Use PM2 to run the compiled server: `pm2 start dist/server.cjs --name carmechs-api`.
4. **SSL Induction:** Use Certbot for automated SSL certificate rotation.
