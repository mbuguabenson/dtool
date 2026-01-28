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
    SMART_TRADING: 6, // Kept for index stability but removed from UI
    ANALYSIS_TOOL: 7,
    COPY_TRADING: 8,
    STRATEGIES: 9,
    AUTO_TRADER: 10,
    TUTORIALS: 11,
    SMART_AUTO24: 12,
    SETTINGS: 13,
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
    'id-auto-trader',
    'id-tutorials',
    'id-smart-auto24',
    'id-settings',
];

export const DEBOUNCE_INTERVAL_TIME = 500;
