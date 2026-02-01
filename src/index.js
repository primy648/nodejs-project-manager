#!/usr/bin/env node

/**
 * Node.js Project Manager
 * Outil de gestion de projets Node.js pour Ubuntu 22.04
 * 
 * Fonctionnalités:
 * - Création de projets avec utilisateurs SFTP chroot
 * - Gestion des services via PM2
 * - Génération automatique de scripts start/stop
 * - Interface CLI interactive
 * 
 * @requires Node.js 20+
 * @requires Ubuntu 22.04
 * @requires PM2
 */

import chalk from 'chalk';
import menu from './ui/menu.js';
import projects from './modules/projects.js';
import shell from './utils/shell.js';
import logger from './utils/logger.js';

/**
 * Vérifie les prérequis système
 * @returns {Promise<boolean>}
 */
async function checkPrerequisites() {
    const errors = [];

    // Vérifier si on est root
    if (!shell.isRoot()) {
        errors.push('Cet outil doit être exécuté en tant que root (sudo)');
    }

    // Vérifier si PM2 est installé
    if (!shell.commandExists('pm2')) {
        errors.push('PM2 n\'est pas installé. Installez-le avec: npm install -g pm2');
    }

    // Vérifier si on est sur Linux
    if (process.platform !== 'linux') {
        console.log(chalk.yellow('⚠ Attention: Cet outil est conçu pour Ubuntu 22.04'));
        console.log(chalk.yellow('  Certaines fonctionnalités peuvent ne pas fonctionner sur d\'autres systèmes.\n'));
    }

    if (errors.length > 0) {
        console.log(chalk.red('\n╔══════════════════════════════════════════════╗'));
        console.log(chalk.red('║          PRÉREQUIS NON SATISFAITS            ║'));
        console.log(chalk.red('╚══════════════════════════════════════════════╝\n'));

        for (const error of errors) {
            console.log(chalk.red('  ✖ ' + error));
        }

        console.log('');
        return false;
    }

    return true;
}

/**
 * Initialise l'outil
 */
async function initialize() {
    try {
        // Initialiser le dossier de logs
        logger.initLogDir();

        // Initialiser le dossier de configuration
        projects.initConfigDir();

        logger.debug('Outil initialisé');
    } catch (error) {
        logger.error(`Erreur d'initialisation: ${error.message}`);
    }
}

/**
 * Boucle principale de l'application
 */
async function mainLoop() {
    while (true) {
        try {
            const action = await menu.mainMenu();

            switch (action) {
                case 'list':
                    await menu.showProjectsList();
                    break;

                case 'create':
                    await menu.createProjectForm();
                    break;

                case 'manage':
                    const projectName = await menu.selectProject();
                    if (projectName) {
                        await menu.projectManagementMenu(projectName);
                    }
                    break;

                case 'delete':
                    await menu.deleteProjectForm();
                    break;

                case 'pm2status':
                    await menu.showPm2Status();
                    break;

                case 'regenerate':
                    await menu.regenerateAllScriptsAction();
                    break;

                case 'exit':
                    console.log(chalk.cyan('\n👋 Au revoir !\n'));
                    process.exit(0);

                default:
                    break;
            }
        } catch (error) {
            if (error.name === 'ExitPromptError') {
                // Ctrl+C pendant un prompt
                console.log(chalk.yellow('\n\nOpération annulée.'));
                continue;
            }

            logger.error(`Erreur: ${error.message}`);
            logger.debug(error.stack);

            // Attendre un peu avant de continuer
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
}

/**
 * Gestion des signaux
 */
function setupSignalHandlers() {
    process.on('SIGINT', () => {
        console.log(chalk.yellow('\n\n👋 Interruption détectée. Au revoir !'));
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        console.log(chalk.yellow('\n\n👋 Terminaison demandée. Au revoir !'));
        process.exit(0);
    });

    process.on('uncaughtException', (error) => {
        logger.error(`Exception non gérée: ${error.message}`);
        logger.debug(error.stack);
        process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
        logger.error(`Promesse rejetée non gérée: ${reason}`);
        // Ne pas quitter, essayer de continuer
    });
}

/**
 * Point d'entrée principal
 */
async function main() {
    try {
        // Configuration des gestionnaires de signaux
        setupSignalHandlers();

        // Vérification des prérequis
        const prerequisitesOk = await checkPrerequisites();
        
        if (!prerequisitesOk) {
            console.log(chalk.gray('\nUtilisation: sudo node src/index.js\n'));
            process.exit(1);
        }

        // Initialisation
        await initialize();

        // Démarrer la boucle principale
        await mainLoop();

    } catch (error) {
        console.error(chalk.red(`\nErreur fatale: ${error.message}`));
        logger.error(error.stack);
        process.exit(1);
    }
}

// Démarrer l'application
main();
