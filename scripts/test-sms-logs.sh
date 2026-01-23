#!/bin/bash

# Script de logs pour les tests SMS SafeWalk
# Usage: ./scripts/test-sms-logs.sh

echo "=========================================="
echo "📋 LOGS SMS SAFEWALK - MODE TEST"
echo "=========================================="
echo ""
echo "Ce script affiche les logs en temps réel pour déboguer les SMS."
echo "Appuyez sur Ctrl+C pour arrêter."
echo ""
echo "=========================================="
echo ""

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Lancer le serveur en mode développement et filtrer les logs SMS
cd /home/ubuntu/safewalk-app

pnpm dev 2>&1 | while IFS= read -r line; do
  # Logs d'alerte
  if echo "$line" | grep -q "triggerAlert"; then
    echo -e "${RED}🚨 ALERTE:${NC} $line"
  
  # Logs de SMS
  elif echo "$line" | grep -q "SMS"; then
    echo -e "${GREEN}📤 SMS:${NC} $line"
  
  # Logs de SOS
  elif echo "$line" | grep -q "SOS"; then
    echo -e "${YELLOW}🆘 SOS:${NC} $line"
  
  # Logs anti-spam
  elif echo "$line" | grep -q "Anti-spam"; then
    echo -e "${BLUE}🚫 ANTI-SPAM:${NC} $line"
  
  # Logs de position GPS
  elif echo "$line" | grep -q "Position\|GPS\|latitude\|longitude"; then
    echo -e "${BLUE}📍 GPS:${NC} $line"
  
  # Logs d'erreur
  elif echo "$line" | grep -qE "Error|Erreur|❌"; then
    echo -e "${RED}❌ ERREUR:${NC} $line"
  
  # Autres logs (affichage normal)
  else
    echo "$line"
  fi
done
