import React from 'react';
import { observer } from 'mobx-react-lite';
import { useFreeBots } from '@/hooks/use-free-bots';
import { useStore } from '@/hooks/useStore';
import TechBackground from '@/components/shared_ui/tech-background/tech-background';
import './free-bots-tab.scss';

const BotCard = ({ bot, onLoad }: { bot: any; onLoad: (bot: any) => void }) => {
    // Convert hex to rgb for CSS variable
    const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? 
            `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
            '124, 58, 237';
    };

    const rgbColor = hexToRgb(bot.color);

    return (
        <div 
            className='bot-card' 
            style={{ 
                '--bot-color': bot.color,
                '--bot-color-rgb': rgbColor
            } as React.CSSProperties}
        >
            <div className='bot-card__top'>
                <div className='bot-card__icon'>
                    {bot.category === 'Automatic' ? '🤖' : bot.category === 'Hybrid' ? '⚡' : '🛡️'}
                </div>
                {bot.isPremium && <span className='bot-card__badge'>Premium</span>}
            </div>

            <div className='bot-card__body'>
                <h3 className='bot-card__title'>{bot.name}</h3>
                <p className='bot-card__tagline'>{bot.category} Algotrade • High Accuracy</p>
                <p className='bot-card__description'>{bot.description}</p>
                
                <div className='bot-card__stats'>
                    <div className='stat'>
                        <span className='stat__label'>Win Rate</span>
                        <span className='stat__value'>~85%</span>
                    </div>
                    <div className='stat'>
                        <span className='stat__label'>Risk Level</span>
                        <span className='stat__value'>Moderate</span>
                    </div>
                </div>
            </div>

            <div className='bot-card__footer'>
                <button className='bot-card__btn' onClick={() => onLoad(bot)}>
                    Deploy Strategy
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
            <TechBackground />
            <div className='free-bots-tab__header'>
                <h2>Nexus Strategies</h2>
                <p>Advanced algorithmic trading solutions for the modern market.</p>
            </div>

            <div className='free-bots-tab__categories'>
                {categories.map(category => (
                    <button
                        key={category}
                        className={`category-btn category-btn--${category} ${selectedCategory === category ? 'category-btn--active' : ''}`}
                        onClick={() => setSelectedCategory(category)}
                    >
                        {category}
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
                    <div className='spinner-box'>
                        <div className='circle' />
                        <div className='circle-inner' />
                        <span className='logo-center'>🧠</span>
                    </div>
                    <p>Syncing Neural Link...</p>
                </div>
            )}
        </div>
    );
});

export default FreeBotsTab;
