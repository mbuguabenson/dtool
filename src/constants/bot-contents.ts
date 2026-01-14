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
    AUTO_TRADER: 3,
    COPY_TRADING: 4,
    SIGNALS: 5,
    FREE_BOTS: 6,
    SMART_TRADING: 7,
    EVEN_ODD: 8,
    OVER_UNDER: 9,
    ADVANCED_OVER_UNDER: 10,
    SMART_ANALYSIS: 12,
    AI_ANALYSIS: 13,
    EASY_TOOL: 14,
    TUTORIALS: 15,
    STRATEGIES: 16,
    TOOL_HUB: 17,
});

export const MAX_STRATEGIES = 10;

export const TAB_IDS = [
    'id-dbot-dashboard',
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
    'id-smart-analysis',
    'id-ai-analysis',
    'id-easy-tool',
    'id-tutorials',
    'id-strategies',
    'id-toolhub',
];

export const DEBOUNCE_INTERVAL_TIME = 500;
