import { useState, useCallback } from 'react';
import { useStore } from '@/hooks/useStore';
import { FREE_BOTS_DATA, TFreeBot } from '../pages/free-bots/free-bots-data';

export const useFreeBots = () => {
    const { load_modal, dashboard } = useStore();
    const [selectedCategory, setSelectedCategory] = useState<string>('Popular');
    const [isLoading, setIsLoading] = useState(false);

    const categories = ['Popular', 'Automatic', 'Hybrid', 'Normal'];

    const filteredBots = FREE_BOTS_DATA.filter(bot => bot.category === selectedCategory);

    const loadBotToBuilder = useCallback(
        async (bot: TFreeBot) => {
            setIsLoading(true);
            try {
                // Fetch the XML from the server or local path
                const response = await fetch(`/${bot.xmlPath}`);
                if (!response.ok) {
                    throw new Error(`Failed to fetch bot XML: ${response.status} ${response.statusText}`);
                }

                const xmlString = await response.text();

                // Validate that we actually got XML content
                if (!xmlString || !xmlString.trim().startsWith('<')) {
                    throw new Error('Invalid XML content received');
                }

                // Parse XML to ensure it's valid before loading
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
                const parseError = xmlDoc.querySelector('parsererror');

                if (parseError) {
                    throw new Error('XML parsing failed: Invalid XML structure');
                }

                const strategy = {
                    id: bot.id,
                    name: bot.name,
                    xml: xmlString,
                    save_type: 'unsaved' as const, // Using 'unsaved' to load directly to workspace
                };

                // Load into Blockly workspace via load_modal
                await load_modal.loadStrategyToBuilder(strategy);

                // Navigate to Bot Builder tab
                dashboard.setActiveTab(1);

                console.log(`Successfully loaded bot: ${bot.name}`);
            } catch (error: any) {
                console.error('Error loading bot:', error);
                // Show user-friendly error
                alert(`Failed to load bot "${bot.name}": ${error.message || 'Unknown error'}`);
            } finally {
                setIsLoading(false);
            }
        },
        [load_modal, dashboard]
    );

    return {
        selectedCategory,
        setSelectedCategory,
        categories,
        filteredBots,
        loadBotToBuilder,
        isLoading,
    };
};
