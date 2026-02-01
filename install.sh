#!/bin/bash
# ============================================
# Script d'installation - Node.js Project Manager
# Pour Ubuntu 22.04
# ============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

INSTALL_DIR="/opt/nodejs-project-manager"

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════╗"
echo "║     Node.js Project Manager - Installation   ║"
echo "╚══════════════════════════════════════════════╝"
echo -e "${NC}"

# Vérifier si on est root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}✖ Ce script doit être exécuté en tant que root (sudo)${NC}"
    echo "  Usage: sudo ./install.sh"
    exit 1
fi

echo -e "${CYAN}[1/6]${NC} Vérification du système..."

# Vérifier Ubuntu
if [ -f /etc/os-release ]; then
    . /etc/os-release
    if [[ "$ID" != "ubuntu" ]]; then
        echo -e "${YELLOW}⚠ Ce script est conçu pour Ubuntu. Votre système: $ID${NC}"
        read -p "Continuer quand même ? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
else
    echo -e "${YELLOW}⚠ Impossible de détecter le système d'exploitation${NC}"
fi

echo -e "${GREEN}✔ Système vérifié${NC}"

# Vérifier/Installer Node.js
echo -e "${CYAN}[2/6]${NC} Vérification de Node.js..."

if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 20 ]; then
        echo -e "${GREEN}✔ Node.js v$(node --version) détecté${NC}"
    else
        echo -e "${YELLOW}⚠ Node.js version $NODE_VERSION détectée, version 20+ requise${NC}"
        echo "Installation de Node.js 20..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y nodejs
    fi
else
    echo "Installation de Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

echo -e "${GREEN}✔ Node.js $(node --version) installé${NC}"

# Vérifier/Installer PM2
echo -e "${CYAN}[3/6]${NC} Vérification de PM2..."

if command -v pm2 &> /dev/null; then
    echo -e "${GREEN}✔ PM2 $(pm2 --version) détecté${NC}"
else
    echo "Installation de PM2..."
    npm install -g pm2
    echo -e "${GREEN}✔ PM2 installé${NC}"
fi

# Copier les fichiers
echo -e "${CYAN}[4/6]${NC} Installation de l'outil..."

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

if [ "$SCRIPT_DIR" != "$INSTALL_DIR" ]; then
    # Créer le dossier d'installation
    mkdir -p "$INSTALL_DIR"
    
    # Copier les fichiers
    cp -r "$SCRIPT_DIR"/* "$INSTALL_DIR/"
    
    echo -e "${GREEN}✔ Fichiers copiés vers $INSTALL_DIR${NC}"
else
    echo -e "${GREEN}✔ Déjà dans le dossier d'installation${NC}"
fi

# Installer les dépendances
echo -e "${CYAN}[5/6]${NC} Installation des dépendances..."

cd "$INSTALL_DIR"
npm install --production

echo -e "${GREEN}✔ Dépendances installées${NC}"

# Créer le lien symbolique
echo -e "${CYAN}[6/6]${NC} Configuration finale..."

chmod +x "$INSTALL_DIR/src/index.js"

# Supprimer l'ancien lien s'il existe
rm -f /usr/local/bin/project-manager

# Créer le nouveau lien
ln -s "$INSTALL_DIR/src/index.js" /usr/local/bin/project-manager

echo -e "${GREEN}✔ Lien symbolique créé: /usr/local/bin/project-manager${NC}"

# Créer les dossiers nécessaires
mkdir -p /etc/nodejs-project-manager
mkdir -p /var/log/nodejs-project-manager
mkdir -p /var/www

echo -e "${GREEN}✔ Dossiers créés${NC}"

# Configurer PM2 au démarrage
echo ""
echo -e "${YELLOW}Configuration de PM2 au démarrage...${NC}"
pm2 startup systemd -u root --hp /root 2>/dev/null || true
pm2 save 2>/dev/null || true

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         Installation terminée !              ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Pour lancer l'outil:"
echo -e "  ${CYAN}sudo project-manager${NC}"
echo ""
echo -e "Ou directement:"
echo -e "  ${CYAN}sudo node $INSTALL_DIR/src/index.js${NC}"
echo ""
