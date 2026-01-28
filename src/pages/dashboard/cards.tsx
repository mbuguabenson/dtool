import React from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import { localize } from '@deriv-com/translations';
import Text from '@/components/shared_ui/text';
import {
    LabelPairedPuzzlePieceTwoCaptionBoldIcon,
    LabelPairedLightbulbCaptionRegularIcon,
    LabelPairedCopyCaptionRegularIcon,
    LabelPairedSlidersCaptionRegularIcon,
    LabelPairedFolderOpenCaptionRegularIcon,
    LabelPairedChartLineCaptionRegularIcon,
    LabelPairedCircleDotCaptionRegularIcon,
} from '@deriv/quill-icons/LabelPaired';
import { DBOT_TABS } from '@/constants/bot-contents';

type TCardProps = {
    has_dashboard_strategies: boolean;
    is_mobile: boolean;
    search_query: string;
    handleTabChange: (index: number) => void;
};

interface QuickAccessItem {
    id: string;
    title: string;
    icon: React.ElementType;
    description: string;
    tabIndex: number;
    tag?: string;
    tagType?: 'hot' | 'trending' | 'primary' | 'popular' | 'pro';
}

const Cards = observer(({ search_query, handleTabChange }: TCardProps) => {
    const { load_modal } = useStore();

    const quickAccessItems: QuickAccessItem[] = [
        {
            id: 'load-bot',
            title: localize('Load Bot'),
            icon: LabelPairedFolderOpenCaptionRegularIcon,
            description: localize('Upload an existing bot from your local drive or cloud'),
            tabIndex: -1,
            tag: localize('Primary'),
            tagType: 'primary',
        },
        {
            id: 'bot-builder',
            title: localize('Bot Builder'),
            icon: LabelPairedPuzzlePieceTwoCaptionBoldIcon,
            description: localize('Create and customize trading bots using blocks'),
            tabIndex: DBOT_TABS.BOT_BUILDER,
            tag: localize('Trending'),
            tagType: 'trending',
        },
        {
            id: 'auto-trader',
            title: localize('Auto Trader'),
            icon: LabelPairedSlidersCaptionRegularIcon,
            description: localize('Automate your trades with advanced strategies'),
            tabIndex: DBOT_TABS.AUTO_TRADER,
            tag: localize('Hot'),
            tagType: 'hot',
        },
        {
            id: 'copy-trading',
            title: localize('Copy Trading'),
            icon: LabelPairedCopyCaptionRegularIcon,
            description: localize('Follow and copy the strategy of top traders'),
            tabIndex: DBOT_TABS.COPY_TRADER,
            tag: localize('Popular'),
            tagType: 'popular',
        },
        {
            id: 'smart-auto',
            title: localize('Smart Auto AI'),
            icon: LabelPairedLightbulbCaptionRegularIcon,
            description: localize('Professional 24H Bots and Super Rise/Fall automation'),
            tabIndex: DBOT_TABS.SMART_AUTO24,
            tag: localize('Pro'),
            tagType: 'pro',
        },
        {
            id: 'analysis-tool',
            title: localize('Analysis Tool'),
            icon: LabelPairedChartLineCaptionRegularIcon,
            description: localize('Advanced digit stats for Over/Under and Even/Odd'),
            tabIndex: DBOT_TABS.ANALYSIS_TOOL,
            tag: localize('Premium'),
            tagType: 'hot',
        },
        {
            id: 'easy-tool',
            title: localize('Easy Tool'),
            icon: LabelPairedCircleDotCaptionRegularIcon,
            description: localize('Simple analysis tools for quick trading decisions'),
            tabIndex: DBOT_TABS.EASY_TOOL,
            tag: localize('New'),
            tagType: 'hot',
        },
    ];

    const filteredItems = quickAccessItems.filter(
        item =>
            item.title.toLowerCase().includes(search_query.toLowerCase()) ||
            item.description.toLowerCase().includes(search_query.toLowerCase())
    );

    if (filteredItems.length === 0) {
        return (
            <div className='no-results'>
                <Text color='less-prominent'>{localize('No specialized tools found matching your search.')}</Text>
            </div>
        );
    }

    return (
        <div className='quick-access-grid'>
            {filteredItems.map(item => (
                <div
                    key={item.id}
                    className={classNames('quick-access-card', `card--${item.id}`)}
                    onClick={() => {
                        if (item.id === 'load-bot') {
                            load_modal.toggleLoadModal();
                        } else {
                            handleTabChange(item.tabIndex);
                        }
                    }}
                >
                    <div className='card-glow' />
                    {item.tag && <div className={classNames('card-tag', `tag--${item.tagType}`)}>{item.tag}</div>}
                    <div className='card-icon-wrapper'>
                        <item.icon className='card-icon' />
                    </div>
                    <div className='card-content'>
                        <Text as='h3' color='prominent' weight='bold'>
                            {item.title}
                        </Text>
                        <Text as='p' color='less-prominent' size='xs'>
                            {item.description}
                        </Text>
                    </div>
                    <div className='card-arrow'>
                        <span>→</span>
                    </div>
                </div>
            ))}
        </div>
    );
});

export default Cards;
