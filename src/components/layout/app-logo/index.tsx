import './app-logo.scss';

export const AppLogo = () => {
    return (
        <div className='app-header__logo-container'>
            <div className='header-branding'>
                <div className='brand-logo'>
                    <div className='logo-glow'></div>
                    <span className='logo-letter'>Ph</span>
                </div>
                <div className='brand-details'>
                    <span className='brand-title'>PROFIT HUB</span>
                </div>
            </div>
        </div>
    );
};
