import React from 'react';
import { observer } from 'mobx-react-lite';
import { useFreeBots } from '@/hooks/use-free-bots';
import { useStore } from '@/hooks/useStore';
import './free-bots-tab.scss';

const BotCard = ({ bot, onLoad }: { bot: any; onLoad: (bot: any) => void }) => {
    return (
        <div className='bot-card' style={{ '--bot-color': bot.color } as React.CSSProperties}>
            <div className='bot-card__glow' />

            {bot.isPremium && (
                <div className='bot-card__badge'>
                    PREMIUM <span>★</span>
                </div>
            )}
            {bot.isNew && (
                <div className='bot-card__badge bot-card__badge--new'>
                    NEW <span>✨</span>
                </div>
            )}

            <div className='bot-card__header'>
                <h3>{bot.name}</h3>
            </div>

            <div className='bot-card__description'>{bot.description}</div>

            <div className='bot-card__footer'>
                <button className='bot-card__load-btn' onClick={() => onLoad(bot)}>
                    Load Bot
                </button>
            </div>
        </div>
    );
};

const FreeBotsTab = observer(() => {
    const { selectedCategory, setSelectedCategory, categories, filteredBots, loadBotToBuilder, isLoading } =
        useFreeBots();

    const { ui } = useStore();
    const { is_dark_mode_on } = ui;

    return (
        <div className={`free-bots-tab ${is_dark_mode_on ? 'free-bots-tab--dark' : 'free-bots-tab--light'}`}>
            <div className='free-bots-tab__header'>
                <h2>Premium Free Bots</h2>
                <p>Choose from our curated collection of high-performance trading bots.</p>
            </div>

            <div className='free-bots-tab__categories'>
                {categories.map(category => (
                    <button
                        key={category}
                        className={`category-btn category-btn--${category} ${selectedCategory === category ? 'category-btn--active' : ''}`}
                        onClick={() => setSelectedCategory(category)}
                    >
                        {category} Bots
                    </button>
                ))}
            </div>

            <div className='free-bots-tab__grid'>
                {filteredBots.map(bot => (
                    <BotCard key={bot.id} bot={bot} onLoad={loadBotToBuilder} />
                ))}
            </div>

            {isLoading && (
                <div className='loading-overlay'>
                    <div className='spinner' />
                    <p>Injecting strategy into Bot Builder...</p>
                </div>
            )}
        </div>
    );
});

export default FreeBotsTab;
