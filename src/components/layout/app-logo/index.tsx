import './app-logo.scss';

export const AppLogo = () => {
    return (
        <div className='app-header__logo-container'>
            <div className='profithub-logo'>
                <div className='profithub-logo__wordmark'>
                    <span className='profithub-logo__text-profit'>PROFIT</span>
                    <span className='profithub-logo__text-hub'>HUB</span>
                </div>
                <div className='profithub-logo__tagline'>Advanced Trading Site</div>
            </div>
        </div>
    );
};

