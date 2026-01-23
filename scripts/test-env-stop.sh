#!/bin/bash

# Kolory dla outputu
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛑 Zatrzymywanie środowiska testowego...${NC}"

docker-compose down

echo -e "${RED}✅ Kontenery zatrzymane${NC}"
echo ""
echo -e "${BLUE}💡 Użyj 'npm run test:start' aby uruchomić ponownie${NC}"
echo -e "${BLUE}💡 Użyj 'npm run test:clean' aby usunąć wszystkie dane${NC}"
