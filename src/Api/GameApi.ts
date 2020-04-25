import Axios, { AxiosInstance } from 'axios';
import { User, Server, Account } from '../types';
import * as puppeteer from 'puppeteer';
import { ResourceList, ResourceFactoryList, Mine, Building, Upgrade, ResourceType } from './gameTypes';
import { loadBuilding } from './parsing/building';
import { stringToResourceType } from './typeHelper';
import { loadMinesAndStorage, loadResources } from './parsing/resources';

export class GameApi {
    account: Account
    axios: AxiosInstance
    browser: puppeteer.Browser
    page: puppeteer.Page
    cookie: string
    loginUrl: string
    constructor(cookie: string, account: Account, loginUrl: string) {
        this.cookie = cookie;
        this.loginUrl = loginUrl;
        this.account = account;
        this.axios = Axios.create({
          withCredentials: true,
          baseURL: this.getServerUrl(),
        });
        this.axios.interceptors.request.use(config => {
            if (!config.headers['cookie']) {
                config.headers['cookie'] = '';
            }
            config.headers['cookie'] += cookie;
            return config;
        });
    }

    getServerUrl() {
        return `https://s${this.account.server.number}-${this.account.server.language}.ogame.gameforge.com`;
    }

    async goToHomePage() {
        await this.page.goto(`${this.getServerUrl()}/game`);
    }

    async goToResourcePage() {
        await this.page.goto(`${this.getServerUrl()}/game/index.php?page=ingame&component=supplies`);
    }

    async init() {
        this.browser = await puppeteer.launch();
        this.page = await this.browser.newPage();
        const [name, other] = this.cookie.split('=');
        const [value] = other.split(';');
        await this.page.setCookie({
            name,
            value,
            url: this.getServerUrl()
        });
        await this.page.setViewport({
            width: 1280,
            height: 960
        });
        await this.page.goto(this.loginUrl);
        await this.page.screenshot({ path: './out.png' });
    }

    async stop() {
        await this.browser.close();
    }

    async listRessources(): Promise<ResourceList> {
        await this.goToHomePage();
        return loadResources(this.page);
    }

    async ressourceFactoryList(): Promise<ResourceFactoryList> {
        await this.goToResourcePage();
        const res = await loadMinesAndStorage(this.page);
        return res;
    }

    async makeUpgrade(upgrade: Upgrade) {
        if (!upgrade.url) {
            throw new Error("Upgrade doesn't have an url");
        }
        await this.page.goto(upgrade.url);
    }

    canUpgrade(upgrade: Upgrade, resources: ResourceList): Boolean {
        return upgrade.url && !Object.keys(upgrade.costs).some((resource: ResourceType) => {
            if (resource === 'energy') return false;
            if (resources[resource] < upgrade.costs[resource]) {
                return true;
            } else {
                return false;
            }
        })
    }
}