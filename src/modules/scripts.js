/**
 * Module de génération des scripts start.sh et stop.sh
 */

import fs from 'fs';
import path from 'path';
import { BASE_PATH, PROJECT_STRUCTURE, SCRIPTS } from '../config/constants.js';
import projects from './projects.js';
import logger from '../utils/logger.js';

/**
 * Génère le contenu du script start.sh
 * @param {string} projectName - Nom du projet
 * @param {Array} services - Liste des services
 * @returns {string}
 */
function generateStartScript(projectName, services) {
    let script = `#!/bin/bash
# ============================================
# Script de démarrage des services
# Projet: ${projectName}
# Généré automatiquement - Ne pas modifier
# ============================================

set -e

echo "=========================================="
echo "  Démarrage des services: ${projectName}"
echo "=========================================="
echo ""

# Vérifier si PM2 est installé
if ! command -v pm2 &> /dev/null; then
    echo "ERREUR: PM2 n'est pas installé"
    echo "Installez-le avec: npm install -g pm2"
    exit 1
fi

`;

    if (services.length === 0) {
        script += `echo "Aucun service configuré pour ce projet"\n`;
        script += `exit 0\n`;
    } else {
        for (const service of services) {
            const pm2Name = `${projectName}-${service.name}`;
            script += `# Service: ${service.name}\n`;
            script += `echo "Démarrage de ${service.name}..."\n`;
            script += `cd "${service.directory}"\n`;
            script += `pm2 start "${service.command}" --name "${pm2Name}" --cwd "${service.directory}" 2>/dev/null || pm2 restart "${pm2Name}"\n`;
            script += `echo "  ✔ ${service.name} démarré"\n`;
            script += `echo ""\n\n`;
        }

        script += `# Sauvegarder la configuration PM2\n`;
        script += `pm2 save\n\n`;
        script += `echo "=========================================="
echo "  Tous les services ont été démarrés"
echo "=========================================="
echo ""
echo "Utilisez 'pm2 status' pour voir l'état des services"
echo "Utilisez 'pm2 logs' pour voir les logs"
`;
    }

    return script;
}

/**
 * Génère le contenu du script stop.sh
 * @param {string} projectName - Nom du projet
 * @param {Array} services - Liste des services
 * @returns {string}
 */
function generateStopScript(projectName, services) {
    let script = `#!/bin/bash
# ============================================
# Script d'arrêt des services
# Projet: ${projectName}
# Généré automatiquement - Ne pas modifier
# ============================================

set -e

echo "=========================================="
echo "  Arrêt des services: ${projectName}"
echo "=========================================="
echo ""

# Vérifier si PM2 est installé
if ! command -v pm2 &> /dev/null; then
    echo "ERREUR: PM2 n'est pas installé"
    exit 1
fi

`;

    if (services.length === 0) {
        script += `echo "Aucun service configuré pour ce projet"\n`;
        script += `exit 0\n`;
    } else {
        for (const service of services) {
            const pm2Name = `${projectName}-${service.name}`;
            script += `# Service: ${service.name}\n`;
            script += `echo "Arrêt de ${service.name}..."\n`;
            script += `pm2 stop "${pm2Name}" 2>/dev/null || echo "  (non actif)"\n`;
            script += `echo "  ✔ ${service.name} arrêté"\n`;
            script += `echo ""\n\n`;
        }

        script += `# Sauvegarder la configuration PM2\n`;
        script += `pm2 save\n\n`;
        script += `echo "=========================================="
echo "  Tous les services ont été arrêtés"
echo "=========================================="
`;
    }

    return script;
}

/**
 * Génère un script de redémarrage
 * @param {string} projectName - Nom du projet
 * @param {Array} services - Liste des services
 * @returns {string}
 */
function generateRestartScript(projectName, services) {
    let script = `#!/bin/bash
# ============================================
# Script de redémarrage des services
# Projet: ${projectName}
# Généré automatiquement - Ne pas modifier
# ============================================

set -e

echo "=========================================="
echo "  Redémarrage des services: ${projectName}"
echo "=========================================="
echo ""

# Vérifier si PM2 est installé
if ! command -v pm2 &> /dev/null; then
    echo "ERREUR: PM2 n'est pas installé"
    exit 1
fi

`;

    if (services.length === 0) {
        script += `echo "Aucun service configuré pour ce projet"\n`;
        script += `exit 0\n`;
    } else {
        for (const service of services) {
            const pm2Name = `${projectName}-${service.name}`;
            script += `# Service: ${service.name}\n`;
            script += `echo "Redémarrage de ${service.name}..."\n`;
            script += `pm2 restart "${pm2Name}" 2>/dev/null || echo "  (démarrage initial...)"\n`;
            script += `echo "  ✔ ${service.name} redémarré"\n`;
            script += `echo ""\n\n`;
        }

        script += `# Sauvegarder la configuration PM2\n`;
        script += `pm2 save\n\n`;
        script += `echo "=========================================="
echo "  Tous les services ont été redémarrés"
echo "=========================================="
`;
    }

    return script;
}

/**
 * Génère un script de statut
 * @param {string} projectName - Nom du projet
 * @param {Array} services - Liste des services
 * @returns {string}
 */
function generateStatusScript(projectName, services) {
    let script = `#!/bin/bash
# ============================================
# Script de statut des services
# Projet: ${projectName}
# Généré automatiquement - Ne pas modifier
# ============================================

echo "=========================================="
echo "  Statut des services: ${projectName}"
echo "=========================================="
echo ""

# Vérifier si PM2 est installé
if ! command -v pm2 &> /dev/null; then
    echo "ERREUR: PM2 n'est pas installé"
    exit 1
fi

`;

    if (services.length === 0) {
        script += `echo "Aucun service configuré pour ce projet"\n`;
    } else {
        script += `# Afficher le statut de tous les services du projet\n`;
        script += `pm2 list | grep -E "(${services.map(s => `${projectName}-${s.name}`).join('|')}|Name|─)" || echo "Aucun service actif"\n`;
    }

    return script;
}

/**
 * Génère tous les scripts pour un projet
 * @param {string} projectName - Nom du projet
 * @returns {void}
 */
export function generateScripts(projectName) {
    const projectConfig = projects.loadProjectConfig(projectName);
    const services = projectConfig.services || [];
    const scriptsPath = path.join(BASE_PATH, projectName, PROJECT_STRUCTURE.scripts);

    // S'assurer que le dossier scripts existe
    if (!fs.existsSync(scriptsPath)) {
        fs.mkdirSync(scriptsPath, { recursive: true });
    }

    // Générer start.sh
    const startScriptPath = path.join(scriptsPath, SCRIPTS.start);
    const startContent = generateStartScript(projectName, services);
    fs.writeFileSync(startScriptPath, startContent);
    fs.chmodSync(startScriptPath, '755');
    logger.debug(`Script créé: ${startScriptPath}`);

    // Générer stop.sh
    const stopScriptPath = path.join(scriptsPath, SCRIPTS.stop);
    const stopContent = generateStopScript(projectName, services);
    fs.writeFileSync(stopScriptPath, stopContent);
    fs.chmodSync(stopScriptPath, '755');
    logger.debug(`Script créé: ${stopScriptPath}`);

    // Générer restart.sh
    const restartScriptPath = path.join(scriptsPath, 'restart.sh');
    const restartContent = generateRestartScript(projectName, services);
    fs.writeFileSync(restartScriptPath, restartContent);
    fs.chmodSync(restartScriptPath, '755');
    logger.debug(`Script créé: ${restartScriptPath}`);

    // Générer status.sh
    const statusScriptPath = path.join(scriptsPath, 'status.sh');
    const statusContent = generateStatusScript(projectName, services);
    fs.writeFileSync(statusScriptPath, statusContent);
    fs.chmodSync(statusScriptPath, '755');
    logger.debug(`Script créé: ${statusScriptPath}`);

    logger.success(`Scripts générés pour ${projectName}`);
}

/**
 * Régénère les scripts pour tous les projets
 * @returns {void}
 */
export function regenerateAllScripts() {
    const allProjects = projects.loadProjects();

    for (const project of allProjects) {
        try {
            generateScripts(project.name);
        } catch (error) {
            logger.error(`Erreur pour ${project.name}: ${error.message}`);
        }
    }

    logger.success('Scripts régénérés pour tous les projets');
}

/**
 * Affiche le chemin des scripts d'un projet
 * @param {string} projectName - Nom du projet
 * @returns {object}
 */
export function getScriptsPaths(projectName) {
    const scriptsPath = path.join(BASE_PATH, projectName, PROJECT_STRUCTURE.scripts);

    return {
        directory: scriptsPath,
        start: path.join(scriptsPath, SCRIPTS.start),
        stop: path.join(scriptsPath, SCRIPTS.stop),
        restart: path.join(scriptsPath, 'restart.sh'),
        status: path.join(scriptsPath, 'status.sh')
    };
}

export default {
    generateScripts,
    regenerateAllScripts,
    getScriptsPaths
};
