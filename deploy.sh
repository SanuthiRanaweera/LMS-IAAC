#!/bin/bash
# ============================================
# IAAC Website - Ubuntu Server Deployment Script
# Domain: iaaccampus.com
# ============================================

set -e

echo "================================================"
echo "IAAC Website - Production Deployment"
echo "Domain: iaaccampus.com"
echo "================================================"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root. Use: sudo ./deploy.sh${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Updating system packages...${NC}"
apt update && apt upgrade -y

echo -e "${YELLOW}Step 2: Installing Docker if not installed...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl enable docker
    systemctl start docker
    echo -e "${GREEN}Docker installed successfully${NC}"
else
    echo -e "${GREEN}Docker already installed${NC}"
fi

echo -e "${YELLOW}Step 3: Installing Docker Compose if not installed...${NC}"
if ! docker compose version &> /dev/null; then
    apt install -y docker-compose-plugin
    echo -e "${GREEN}Docker Compose installed successfully${NC}"
else
    echo -e "${GREEN}Docker Compose already installed${NC}"
fi

echo -e "${YELLOW}Step 4: Installing Certbot for SSL...${NC}"
if ! command -v certbot &> /dev/null; then
    apt install -y certbot
    echo -e "${GREEN}Certbot installed successfully${NC}"
else
    echo -e "${GREEN}Certbot already installed${NC}"
fi

echo -e "${YELLOW}Step 5: Creating Certbot directory...${NC}"
mkdir -p /var/www/certbot

echo -e "${YELLOW}Step 6: Stopping existing containers...${NC}"
docker compose down 2>/dev/null || true

echo -e "${YELLOW}Step 7: Building and starting containers HTTP first...${NC}"
docker compose -f docker-compose.yml up -d --build

echo -e "${YELLOW}Waiting for services to start...${NC}"
sleep 10

echo -e "${YELLOW}Step 8: Checking container status...${NC}"
docker compose ps

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}Initial deployment complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "${YELLOW}Next steps for SSL:${NC}"
echo ""
echo "1. Make sure iaaccampus.com and www.iaaccampus.com point to this VPS IP."
echo ""
echo "2. Stop containers:"
echo "   docker compose down"
echo ""
echo "3. Get SSL certificate:"
echo "   certbot certonly --standalone -d iaaccampus.com -d www.iaaccampus.com"
echo ""
echo "4. Start production with SSL:"
echo "   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build"
echo ""
echo "5. Auto-renew SSL:"
echo "   crontab -e"
echo ""
echo "Add this line:"
echo "   0 0 1 * * certbot renew --quiet && docker compose -f docker-compose.yml -f docker-compose.prod.yml restart"
echo ""
echo -e "${GREEN}HTTP:  http://iaaccampus.com${NC}"
echo -e "${GREEN}HTTPS: https://iaaccampus.com${NC}"