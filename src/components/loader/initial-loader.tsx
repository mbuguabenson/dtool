import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import './initial-loader.scss';

const LOADING_MESSAGES = [
    'Wait Initializing The Engine...',
    'Connecting to Server...',
    'Fetching Market Data...',
    'Calibrating Algorithms...',
    'Decrypting Secure Session...',
    'Synchronizing Portfolio...',
    'Optimizing Trade Execution...',
    'Finalizing Setup...'
];

export default function InitialLoader() {
    const [messageIndex, setMessageIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setMessageIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
        }, 1500); // Faster updates
        return () => clearInterval(interval);
    }, []);

    const whatsappNumber = '+254796428848';
    const whatsappLink = `https://wa.me/${whatsappNumber.replace('+', '')}`;

    return (
        <div className='initial-loader-overlay'>
            {/* Trading Background Animation */}
            <div className='trading-background-animation'>
                {[...Array(20)].map((_, i) => (
                    <motion.div
                        key={i}
                        className={`candlestick ${Math.random() > 0.5 ? 'candlestick--down' : ''}`}
                        style={{
                            left: `${i * 5}%`,
                            height: `${Math.random() * 40 + 10}%`,
                            animationDuration: `${Math.random() * 2 + 2}s`,
                            animationDelay: `${Math.random() * 1}s`
                        }}
                    />
                ))}
            </div>

            <motion.div
                className='loader-content-wrap'
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
            >
                <div className='logo-section'>
                    <div className='logo-container'>
                        <img src='/logo-ph.png' alt='Ph' className='main-logo-img' />
                    </div>
                    <h1 className='main-brand-title'>PROFITHUB</h1>
                </div>

                <div className='system-status-container'>
                    <div className='status-header'>
                        <span className='status-label'>SYSTEM STATUS</span>
                        <span className='status-value'>OPERATIONAL</span>
                    </div>

                    <div className='progress-meter'>
                        <motion.div
                            className='progress-fill'
                            initial={{ width: '0%' }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 8, ease: 'linear' }}
                        />
                    </div>

                    <div className='message-carousel'>
                        <AnimatePresence>
                            <motion.p
                                key={messageIndex}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                transition={{ duration: 0.3 }}
                                className='loading-status-msg'
                            >
                                {`> ${LOADING_MESSAGES[messageIndex]}`}
                            </motion.p>
                        </AnimatePresence>
                    </div>
                </div>

                <motion.div
                    className='customer-care-cta'
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                >
                    <a href={whatsappLink} target='_blank' rel='noopener noreferrer' className='whatsapp-support-btn'>
                        <span className='wa-icon'>💬</span>
                        <div className='wa-text'>
                            <span className='wa-label'>VIP SUPPORT</span>
                            <span className='wa-number'>{whatsappNumber}</span>
                        </div>
                    </a>
                </motion.div>
            </motion.div>

            <div className='loader-footer-simple'>
                <span className='powered-tag'>POWERED BY DERIV</span>
                <span className='version-tag'>v2.4.0-stable</span>
            </div>
        </div>
    );
}
