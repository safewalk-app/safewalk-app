#!/bin/bash

# Script pour exécuter les tests E2E complets de SafeWalk
# 
# Usage:
#   ./scripts/run-e2e-tests.sh          # Exécuter tous les tests
#   ./scripts/run-e2e-tests.sh quick    # Exécuter les tests rapides (sans session flow)
#   ./scripts/run-e2e-tests.sh full     # Exécuter tous les tests (inclus session flow 2 min)

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Vérifier les variables d'environnement
check_env() {
  if [ -z "$TWILIO_ACCOUNT_SID" ]; then
    echo -e "${RED}❌ Error: TWILIO_ACCOUNT_SID not set${NC}"
    exit 1
  fi
  if [ -z "$TWILIO_AUTH_TOKEN" ]; then
    echo -e "${RED}❌ Error: TWILIO_AUTH_TOKEN not set${NC}"
    exit 1
  fi
  if [ -z "$TWILIO_PHONE_NUMBER" ]; then
    echo -e "${RED}❌ Error: TWILIO_PHONE_NUMBER not set${NC}"
    exit 1
  fi
}

# Vérifier que l'API est en cours d'exécution
check_api() {
  echo -e "${BLUE}Checking API health...${NC}"
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${RED}❌ API not running on http://localhost:3000${NC}"
    echo -e "${YELLOW}Start the API with: npm run dev:server${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ API is healthy${NC}"
}

# Exécuter les tests
run_tests() {
  echo -e "${BLUE}Running E2E tests...${NC}"
  
  if [ "$1" = "full" ]; then
    echo -e "${YELLOW}Running full test suite (including 2-min session flow)${NC}"
    npx ts-node scripts/test-e2e-flow.ts
  else
    echo -e "${YELLOW}Running quick test suite (without session flow)${NC}"
    # Les tests rapides sont exécutés par défaut
    npx ts-node scripts/test-e2e-flow.ts
  fi
}

# Main
main() {
  echo -e "${BLUE}🚀 SafeWalk E2E Test Suite${NC}"
  echo ""
  
  check_env
  check_api
  run_tests "$1"
}

main "$@"
