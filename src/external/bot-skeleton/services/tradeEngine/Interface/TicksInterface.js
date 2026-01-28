const getTicksInterface = tradeEngine => {
    return {
        getDelayTickValue: (...args) => tradeEngine.getDelayTickValue(...args),
        getCurrentStat: (...args) => tradeEngine.getCurrentStat(...args),
        getStatList: (...args) => tradeEngine.getStatList(...args),
        getLastTick: (...args) => tradeEngine.getLastTick(...args),
        getLastDigit: (...args) => tradeEngine.getLastDigit(...args),
        getTicks: (...args) => tradeEngine.getTicks(...args),
        checkDirection: (...args) => tradeEngine.checkDirection(...args),
        getOhlcFromEnd: (...args) => tradeEngine.getOhlcFromEnd(...args),
        getOhlc: (...args) => tradeEngine.getOhlc(...args),
        getLastDigitList: (...args) => tradeEngine.getLastDigitList(...args),
        digitFrequency: (...args) => tradeEngine.digitFrequency(...args),
        detectStreak: (...args) => tradeEngine.detectStreak(...args),
        countDigitsInRange: (...args) => tradeEngine.countDigitsInRange(...args),
        calculateVolatility: (...args) => tradeEngine.calculateVolatility(...args),
        analyzeTrend: (...args) => tradeEngine.analyzeTrend(...args),
        getDigitByRank: (...args) => tradeEngine.getDigitByRank(...args),
        identifyCandlePattern: (...args) => tradeEngine.identifyCandlePattern(...args),
        analyzeMomentum: (...args) => tradeEngine.analyzeMomentum(...args),
        checkVolumeHealth: (...args) => tradeEngine.checkVolumeHealth(...args),
    };
};

export default getTicksInterface;
