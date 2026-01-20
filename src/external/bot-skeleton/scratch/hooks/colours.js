const lightMode = () => {
    const workspace = Blockly;
    workspace.Colours.RootBlock = {
        colour: '#7c3aed',  // Vibrant purple
        colourSecondary: '#6d28d9',  // Darker purple
        colourTertiary: '#ffffff',  // White text
    };

    workspace.Colours.Base = {
        colour: '#8b5cf6',  // Purple
        colourSecondary: '#7c3aed',  // Darker purple
        colourTertiary: '#ffffff',  // White text
    };

    workspace.Colours.Special1 = {
        colour: '#a78bfa',  // Light purple
        colourSecondary: '#8b5cf6',  // Medium purple
        colourTertiary: '#ffffff',  // White text
    };

    workspace.Colours.Special2 = {
        colour: '#9333ea',  // Vivid purple
        colourSecondary: '#7e22ce',  // Deep purple
        colourTertiary: '#ffffff',  // White text
    };

    workspace.Colours.Special3 = {
        colour: '#a855f7',  // Bright purple
        colourSecondary: '#9333ea',  // Vivid purple
        colourTertiary: '#ffffff',  // White text
    };

    workspace.Colours.Special4 = {
        colour: '#6d28d9',  // Dark purple
        colourSecondary: '#5b21b6',  // Deeper purple
        colourTertiary: '#ffffff',  // White text
    };
};

export const setColors = () => lightMode();
