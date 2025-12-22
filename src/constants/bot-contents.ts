type TTabsTitle = {
    [key: string]: string | number;
};

type TDashboardTabIndex = {
    [key: string]: number;
};

export const tabs_title: TTabsTitle = Object.freeze({
    WORKSPACE: 'Workspace',
    CHART: 'Chart',
});

export const DBOT_TABS: TDashboardTabIndex = Object.freeze({
    DASHBOARD: 0,
    BOTS: 1,
    BOT_BUILDER: 2,
    CHART: 3,
    AUTO_TRADER: 4,
    COPY_TRADING: 5,
    SIGNALS: 6,
    FREE_BOTS: 7,
    SMART_TRADING: 8,
    EVEN_ODD: 9,
    OVER_UNDER: 10,
    ADVANCED_OVER_UNDER: 11,
    SMART_AUTO24: 12,
    SMART_ANALYSIS: 13,
    AI_ANALYSIS: 14,
    TUTORIALS: 15,
    CIRCLES: 16,
});

export const MAX_STRATEGIES = 10;

export const TAB_IDS = [
    'id-dbot-dashboard',
    'id-bots',
    'id-bot-builder',
    'id-charts',
    'id-auto-trader',
    'id-copy-trading',
    'id-signals',
    'id-free-bots',
    'id-smart-trading',
    'id-even-odd',
    'id-over-under',
    'id-adv-over-under',
    'id-smart-auto24',
    'id-smart-analysis',
    'id-ai-analysis',
    'id-tutorials',
    'id-circles',
];

export const DEBOUNCE_INTERVAL_TIME = 500;
