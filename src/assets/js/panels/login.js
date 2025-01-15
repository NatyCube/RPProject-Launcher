/**
 * @author Luuxis
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 */
const { AZauth, Mojang } = require('minecraft-java-core');
const { ipcRenderer } = require('electron');

import { popup, database, changePanel, accountSelect, addAccount, config, setStatus } from '../utils.js';

class Login {
    static id = "login";
    async init(config) {
        this.config = config;
        this.db = new database();

        document.querySelector('.cancel-home').addEventListener('click', () => {
            document.querySelector('.cancel-home').style.display = 'none'
            changePanel('settings')
        })
        document.querySelector('.login-home').style.display = 'block';
        document.querySelector('.login-offline').style.display = 'block';

        // Initialiser les événements
        this.initMicrosoftLogin();
        this.initCrackLogin();
    }

    initMicrosoftLogin() {
        console.log('Initializing Microsoft login...');
        let popupLogin = new popup();
        let microsoftBtn = document.querySelector('.connect-home');

        microsoftBtn.addEventListener("click", () => {
            popupLogin.openPopup({
                title: 'Connexion',
                content: 'Veuillez patienter...',
                color: 'var(--color)'
            });

            ipcRenderer.invoke('Microsoft-window', this.config.client_id).then(async account_connect => {
                if (account_connect == 'cancel' || !account_connect) {
                    popupLogin.closePopup();
                    return;
                } else {
                    await this.saveData(account_connect);
                    popupLogin.closePopup();
                }

            }).catch(err => {
                popupLogin.openPopup({
                    title: 'Erreur',
                    content: err,
                    options: true
                });
            });
        });
    }

    initCrackLogin() {
        console.log('Initializing offline login...');
        let popupLogin = new popup();
        let emailOffline = document.querySelector('.email-offline');
        let connectOffline = document.querySelector('.connect-offline');

        connectOffline.addEventListener('click', async () => {
            if (emailOffline.value.length < 3) {
                popupLogin.openPopup({
                    title: 'Erreur',
                    content: 'Votre pseudo doit faire au moins 3 caractères.',
                    options: true
                });
                return;
            }

            if (emailOffline.value.match(/ /g)) {
                popupLogin.openPopup({
                    title: 'Erreur',
                    content: 'Votre pseudo ne doit pas contenir d\'espaces.',
                    options: true
                });
                return;
            }

            let MojangConnect = await Mojang.login(emailOffline.value);

            if (MojangConnect.error) {
                popupLogin.openPopup({
                    title: 'Erreur',
                    content: MojangConnect.message,
                    options: true
                });
                return;
            }

            await this.saveData(MojangConnect);
            popupLogin.closePopup();
        });
    }

    async saveData(connectionData) {
        let configClient = await this.db.readData('configClient');
        let account = await this.db.createData('accounts', connectionData);
        let instanceSelect = configClient.instance_selct;
        let instancesList = await config.getInstanceList();
        configClient.account_selected = account.ID;

        for (let instance of instancesList) {
            if (instance.whitelistActive) {
                let whitelist = instance.whitelist.find(whitelist => whitelist == account.name);
                if (whitelist !== account.name) {
                    if (instance.name == instanceSelect) {
                        let newInstanceSelect = instancesList.find(i => i.whitelistActive == false);
                        configClient.instance_selct = newInstanceSelect.name;
                        await setStatus(newInstanceSelect.status);
                    }
                }
            }
        }

        await this.db.updateData('configClient', configClient);
        await addAccount(account);
        await accountSelect(account);
        changePanel('home');
    }
}

export default Login;