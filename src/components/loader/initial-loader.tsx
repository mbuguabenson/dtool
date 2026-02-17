import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import './initial-loader.scss';

const LOG_MESSAGES = [
    'Initializing Trading Engine...',
    'Connecting to Deriv WebSocket...',
    'Authenticated Secure Session...',
    'Loading Market Algorithms...',
    'Synchronizing Portfolio Data...',
    'Optimizing Execution Paths...',
    'System Ready. Launching...',
];

export default function InitialLoader({ onFinished }: { onFinished?: () => void }) {
    const [progress, setProgress] = useState(0);
    const [logLines, setLogLines] = useState<string[]>([]);
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(timer);
                    setTimeout(() => onFinished?.(), 500); // Small delay to show 100%
                    return 100;
                }
                const increment = Math.random() * 10 + 5; // Faster but controlled
                return Math.min(prev + increment, 100);
            });
        }, 150); // Faster updates for smoother progress

        const logTimer = setInterval(() => {
            setLogLines(prev => {
                const newLine = `[SYSTEM] ${LOG_MESSAGES[Math.floor(Math.random() * LOG_MESSAGES.length)]}`;
                return [...prev.slice(-15), newLine]; // Keep last 15 lines
            });
        }, 300);

        const stepTimer = setInterval(() => {
            setCurrentStep(prev => (prev + 1) % LOG_MESSAGES.length);
        }, 1500);

        return () => {
            clearInterval(timer);
            clearInterval(logTimer);
            clearInterval(stepTimer);
        };
    }, [onFinished]);

    return (
        <div className='initial-loader-overlay'>
            {/* Glowing Logs Background */}
            <div className='logs-background'>
                {logLines.map((line, i) => (
                    <div key={i} className='log-line'>
                        <span className='log-prefix'>INF</span> {line}
                    </div>
                ))}
                <div className='log-line'>
                    <span className='log-prefix'>RUN</span> Loading ProfitHub System...
                    <span className='flashing-cursor'>_</span>
                </div>
            </div>

            {/* Center Content */}
            <div className='loader-center-content'>
                <div className='logo-container'>
                    <img src='/logo-ph.png' alt='Ph' className='main-logo-img' />
                </div>
                <h1 className='main-brand-title'>PROFITHUB</h1>
                
                <div className='progress-display'>
                    <span className='percentage'>{Math.round(progress)}%</span>
                    <div className='progress-bar-container'>
                        <motion.div 
                            className='progress-bar-fill'
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ ease: "linear" }}
                        />
                    </div>
                    <AnimatePresence mode='wait'>
                        <motion.span 
                            key={currentStep}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className='status-text'
                            style={{ color: '#00fa9a', fontSize: '0.8rem', marginTop: '1rem' }}
                        >
                            {LOG_MESSAGES[currentStep]}
                        </motion.span>
                    </AnimatePresence>
                </div>
            </div>

            {/* Footer */}
            <div className='loader-footer-deriv'>
                <span className='powered-by'>POWERED BY DERIV</span>
                <div className='deriv-branding'>
                    <span className='deriv-text'>DERIV</span>
                </div>
                <div className='secure-badge'>
                    <div className='secure-dot' />
                    SECURE CONNECTION ESTABLISHED
                </div>
            </div>
        </div>
    );
}
