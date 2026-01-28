import { localize } from '@deriv-com/translations';
import { modifyContextMenu } from '../../../utils';

// Advanced Digit Frequency Analysis Block
window.Blockly.Blocks.digitFrequencyAnalysis = {
    init() {
        this.jsonInit(this.definition());
    },
    definition() {
        return {
            message0: localize('Digit %1 frequency in last %2 ticks'),
            args0: [
                {
                    type: 'input_value',
                    name: 'DIGIT',
                    check: 'Number',
                },
                {
                    type: 'input_value',
                    name: 'TICK_COUNT',
                    check: 'Number',
                },
            ],
            output: 'Number',
            outputShape: window.Blockly.OUTPUT_SHAPE_ROUND,
            colour: window.Blockly.Colours.Base.colour,
            colourSecondary: window.Blockly.Colours.Base.colourSecondary,
            colourTertiary: window.Blockly.Colours.Base.colourTertiary,
            tooltip: localize('Returns the percentage frequency of a specific digit in the last N ticks'),
            category: window.Blockly.Categories.Tick_Analysis,
        };
    },
    meta() {
        return {
            display_name: localize('Digit Frequency Analysis'),
            description: localize('This block calculates how often a specific digit appears in the last N tick digits, returning a percentage (0-100).'),
        };
    },
    customContextMenu(menu) {
        modifyContextMenu(menu);
    },
};

window.Blockly.JavaScript.javascriptGenerator.forBlock.digitFrequencyAnalysis = block => {
    const digit = 
        window.Blockly.JavaScript.javascriptGenerator.valueToCode(
            block,
            'DIGIT',
            window.Blockly.JavaScript.javascriptGenerator.ORDER_ATOMIC
        ) || '0';
    const tickCount = 
        window.Blockly.JavaScript.javascriptGenerator.valueToCode(
            block,
            'TICK_COUNT',
            window.Blockly.JavaScript.javascriptGenerator.ORDER_ATOMIC
        ) || '50';
    
    const code = `Bot.digitFrequency(${digit}, ${tickCount})`;
    return [code, window.Blockly.JavaScript.javascriptGenerator.ORDER_FUNCTION_CALL];
};

// Streak Detection Block
window.Blockly.Blocks.streakDetection = {
    init() {
        this.jsonInit(this.definition());
    },
    definition() {
        return {
            message0: localize('Detect %1 streak of %2 in last %3 ticks'),
            args0: [
                {
                    type: 'field_dropdown',
                    name: 'PATTERN_TYPE',
                    options: [
                        [localize('consecutive'), 'consecutive'],
                        [localize('alternating'), 'alternating'],
                    ],
                },
                {
                    type: 'field_dropdown',
                    name: 'VALUE_TYPE',
                    options: [
                        [localize('even'), 'even'],
                        [localize('odd'), 'odd'],
                        [localize('over 5'), 'over5'],
                        [localize('under 5'), 'under5'],
                    ],
                },
                {
                    type: 'input_value',
                    name: 'TICK_COUNT',
                    check: 'Number',
                },
            ],
            output: 'Number',
            outputShape: window.Blockly.OUTPUT_SHAPE_ROUND,
            colour: window.Blockly.Colours.Base.colour,
            colourSecondary: window.Blockly.Colours.Base.colourSecondary,
            colourTertiary: window.Blockly.Colours.Base.colourTertiary,
            tooltip: localize('Returns the length of the current streak (consecutive or alternating pattern)'),
            category: window.Blockly.Categories.Tick_Analysis,
        };
    },
    meta() {
        return {
            display_name: localize('Streak Detection'),
            description: localize('Detects consecutive or alternating patterns in tick data and returns the current streak length.'),
        };
    },
    customContextMenu(menu) {
        modifyContextMenu(menu);
    },
};

window.Blockly.JavaScript.javascriptGenerator.forBlock.streakDetection = block => {
    const patternType = block.getFieldValue('PATTERN_TYPE');
    const valueType = block.getFieldValue('VALUE_TYPE');
    const tickCount =
        window.Blockly.JavaScript.javascriptGenerator.valueToCode(
            block,
            'TICK_COUNT',
            window.Blockly.JavaScript.javascriptGenerator.ORDER_ATOMIC
        ) || '10';
    
    const code = `Bot.detectStreak('${patternType}', '${valueType}', ${tickCount})`;
    return [code, window.Blockly.JavaScript.javascriptGenerator.ORDER_FUNCTION_CALL];
};

// Digit Range Counter Block
window.Blockly.Blocks.digitRangeCounter = {
    init() {
        this.jsonInit(this.definition());
    },
    definition() {
        return {
            message0: localize('Count digits from %1 to %2 in last %3 ticks'),
            args0: [
                {
                    type: 'input_value',
                    name: 'MIN_DIGIT',
                    check: 'Number',
                },
                {
                    type: 'input_value',
                    name: 'MAX_DIGIT',
                    check: 'Number',
                },
                {
                    type: 'input_value',
                    name: 'TICK_COUNT',
                    check: 'Number',
                },
            ],
            output: 'Number',
            outputShape: window.Blockly.OUTPUT_SHAPE_ROUND,
            colour: window.Blockly.Colours.Base.colour,
            colourSecondary: window.Blockly.Colours.Base.colourSecondary,
            colourTertiary: window.Blockly.Colours.Base.colourTertiary,
            tooltip: localize('Returns the count of digits within a specified range in the last N ticks'),
            category: window.Blockly.Categories.Tick_Analysis,
        };
    },
    meta() {
        return {
            display_name: localize('Digit Range Counter'),
            description: localize('Counts how many digits within a specified range (e.g., 0-2 or 7-9) appear in the last N ticks.'),
        };
    },
    customContextMenu(menu) {
        modifyContextMenu(menu);
    },
};

window.Blockly.JavaScript.javascriptGenerator.forBlock.digitRangeCounter = block => {
    const minDigit =
        window.Blockly.JavaScript.javascriptGenerator.valueToCode(
            block,
            'MIN_DIGIT',
            window.Blockly.JavaScript.javascriptGenerator.ORDER_ATOMIC
        ) || '0';
    const maxDigit =
        window.Blockly.JavaScript.javascriptGenerator.valueToCode(
            block,
            'MAX_DIGIT',
            window.Blockly.JavaScript.javascriptGenerator.ORDER_ATOMIC
        ) || '2';
    const tickCount =
        window.Blockly.JavaScript.javascriptGenerator.valueToCode(
            block,
            'TICK_COUNT',
            window.Blockly.JavaScript.javascriptGenerator.ORDER_ATOMIC
        ) || '50';
    
    const code = `Bot.countDigitsInRange(${minDigit}, ${maxDigit}, ${tickCount})`;
    return [code, window.Blockly.JavaScript.javascriptGenerator.ORDER_FUNCTION_CALL];
};

// Volatility Score Block
window.Blockly.Blocks.volatilityScore = {
    init() {
        this.jsonInit(this.definition());
    },
    definition() {
        return {
            message0: localize('Volatility score of last %1 ticks'),
            args0: [
                {
                    type: 'input_value',
                    name: 'TICK_COUNT',
                    check: 'Number',
                },
            ],
            output: 'Number',
            outputShape: window.Blockly.OUTPUT_SHAPE_ROUND,
            colour: window.Blockly.Colours.Base.colour,
            colourSecondary: window.Blockly.Colours.Base.colourSecondary,
            colourTertiary: window.Blockly.Colours.Base.colourTertiary,
            tooltip: localize('Returns a volatility score (0-100) based on digit distribution patterns'),
            category: window.Blockly.Categories.Tick_Analysis,
        };
    },
    meta() {
        return {
            display_name: localize('Volatility Score'),
            description: localize('Calculates a volatility score based on the variance and distribution of last digits.'),
        };
    },
    customContextMenu(menu) {
        modifyContextMenu(menu);
    },
};

window.Blockly.JavaScript.javascriptGenerator.forBlock.volatilityScore = block => {
    const tickCount =
        window.Blockly.JavaScript.javascriptGenerator.valueToCode(
            block,
            'TICK_COUNT',
            window.Blockly.JavaScript.javascriptGenerator.ORDER_ATOMIC
        ) || '50';
    
    const code = `Bot.calculateVolatility(${tickCount})`;
    return [code, window.Blockly.JavaScript.javascriptGenerator.ORDER_FUNCTION_CALL];
};

// Trend Direction Block
window.Blockly.Blocks.trendDirection = {
    init() {
        this.jsonInit(this.definition());
    },
    definition() {
        return {
            message0: localize('%1 trend in last %2 ticks'),
            args0: [
                {
                    type: 'field_dropdown',
                    name: 'TREND_TYPE',
                    options: [
                        [localize('digit sum'), 'sum'],
                        [localize('even/odd balance'), 'evenodd'],
                        [localize('high/low balance'), 'highlow'],
                    ],
                },
                {
                    type: 'input_value',
                    name: 'TICK_COUNT',
                    check: 'Number',
                },
            ],
            output: 'String',
            outputShape: window.Blockly.OUTPUT_SHAPE_ROUND,
            colour: window.Blockly.Colours.Base.colour,
            colourSecondary: window.Blockly.Colours.Base.colourSecondary,
            colourTertiary: window.Blockly.Colours.Base.colourTertiary,
            tooltip: localize('Returns trend direction: "rising", "falling", or "neutral"'),
            category: window.Blockly.Categories.Tick_Analysis,
        };
    },
    meta() {
        return {
            display_name: localize('Trend Direction'),
            description: localize('Analyzes various aspects of digit trends and returns the direction.'),
        };
    },
    customContextMenu(menu) {
        modifyContextMenu(menu);
    },
};

window.Blockly.JavaScript.javascriptGenerator.forBlock.trendDirection = block => {
    const trendType = block.getFieldValue('TREND_TYPE');
    const tickCount =
        window.Blockly.JavaScript.javascriptGenerator.valueToCode(
            block,
            'TICK_COUNT',
            window.Blockly.JavaScript.javascriptGenerator.ORDER_ATOMIC
        ) || '20';
    
    const code = `Bot.analyzeTrend('${trendType}', ${tickCount})`;
    return [code, window.Blockly.JavaScript.javascriptGenerator.ORDER_FUNCTION_CALL];
};
