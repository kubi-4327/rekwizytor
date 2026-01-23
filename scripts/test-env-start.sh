#!/bin/bash

# Kolory dla outputu
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🐳 Uruchamianie środowiska testowego PocketBase...${NC}"

# Sprawdź czy Docker działa
if ! docker info > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Docker nie jest uruchomiony. Uruchom Docker Desktop i spróbuj ponownie.${NC}"
    exit 1
fi

# Uruchom kontenery
echo -e "${GREEN}📦 Startowanie kontenerów...${NC}"
docker-compose up -d

# Poczekaj na PocketBase
echo -e "${BLUE}⏳ Czekam na PocketBase...${NC}"
sleep 5

# Sprawdź status
if docker-compose ps | grep -q "Up"; then
    echo -e "${GREEN}✅ PocketBase uruchomiony!${NC}"
    echo ""
    echo -e "${BLUE}📍 Dostępne serwisy:${NC}"
    echo -e "   PocketBase Admin: ${GREEN}http://localhost:8090/_/${NC}"
    echo -e "   PocketBase API:   ${GREEN}http://localhost:8090/api/${NC}"
    echo ""
    echo -e "${YELLOW}📝 Domyślne dane logowania:${NC}"
    echo -e "   Email:    admin@test.local"
    echo -e "   Hasło:    admin123456"
    echo ""
    echo -e "${BLUE}💡 Użyj 'npm run test:stop' aby zatrzymać${NC}"
else
    echo -e "${YELLOW}⚠️  Wystąpił problem z uruchomieniem kontenerów${NC}"
    docker-compose logs
    exit 1
fi
