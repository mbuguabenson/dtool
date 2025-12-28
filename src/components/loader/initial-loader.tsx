import { DerivLogo } from '@deriv-com/ui';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import './initial-loader.scss';

const LOADING_MESSAGES = [
    "Initializing application...",
    "Connecting to server...",
    "Loading assets...",
    "Authenticating secure session...",
    "Preparing trading workspace..."
];

export default function InitialLoader() {
    const [messageIndex, setMessageIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className='initial-loader-container'>
            <motion.div
                className='prominent-logo-container'
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
                <div className="profithub-logo-wrapper">
                    <DerivLogo variant='wallets' className="prominent-logo" />
                    <span className="brand-name">Profithub</span>
                </div>
            </motion.div>

            <motion.div
                className='loader-content'
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
            >
                <div className="loading-bar-container">
                    <motion.div
                        className="loading-bar"
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                </div>
                <motion.p
                    key={messageIndex}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="loading-text"
                >
                    {LOADING_MESSAGES[messageIndex]}
                </motion.p>
            </motion.div>

            <motion.div
                className='footer-branding'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.5 }}
            >
                <span className="powered-by-text">Powered by</span>
                <DerivLogo variant='wallets' className="deriv-logo-small" />
            </motion.div>
        </div>
    );
}

