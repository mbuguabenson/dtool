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
    BOT_BUILDER: 1,
    CHART: 2,
    EASY_TOOL: 3,
    FREE_BOTS: 4,
    SIGNALS: 5,
    ANALYSIS_TOOL: 6,
    COPY_TRADING: 7,
    STRATEGIES: 8,
    TUTORIALS: 9,
    SMART_AUTO24: 10,
    DIGIT_CRACKER: 11,
    SETTINGS: 12,
});

export const MAX_STRATEGIES = 10;

export const TAB_IDS = [
    'id-dbot-dashboard',
    'id-bot-builder',
    'id-charts',
    'id-easy-tool',
    'id-free-bots',
    'id-signals',
    'id-analysis-tool',
    'id-copy-trading',
    'id-strategies',
    'id-tutorials',
    'id-smart-auto',
    'id-digit-cracker',
    'id-settings',
];

export const DEBOUNCE_INTERVAL_TIME = 500;
