#!/bin/bash

# Kolory dla outputu
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}⚠️  UWAGA: Ta operacja usunie wszystkie dane testowe!${NC}"
read -p "Czy na pewno chcesz kontynuować? (tak/nie): " confirm

if [ "$confirm" != "tak" ]; then
    echo -e "${BLUE}Anulowano.${NC}"
    exit 0
fi

echo -e "${RED}🗑️  Usuwanie kontenerów i danych...${NC}"

# Zatrzymaj i usuń kontenery
docker-compose down -v

# Usuń foldery z danymi
rm -rf pocketbase_data
rm -rf pocketbase_public

echo -e "${RED}✅ Wszystkie dane testowe zostały usunięte${NC}"
echo ""
echo -e "${BLUE}💡 Użyj 'npm run test:start' aby rozpocząć od nowa${NC}"
