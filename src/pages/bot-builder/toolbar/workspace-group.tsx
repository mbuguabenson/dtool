import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import {
    LabelPairedArrowRotateLeftMdRegularIcon,
    LabelPairedArrowRotateRightMdRegularIcon,
    LabelPairedArrowsRotateMdRegularIcon,
    LabelPairedChartLineMdRegularIcon,
    LabelPairedChartTradingviewMdRegularIcon,
    LabelPairedFloppyDiskMdRegularIcon,
    LabelPairedFolderOpenMdRegularIcon,
    LabelPairedMagnifyingGlassMinusMdRegularIcon,
    LabelPairedMagnifyingGlassPlusMdRegularIcon,
    LabelPairedObjectsAlignLeftMdRegularIcon,
} from '@deriv/quill-icons/LabelPaired';
import { localize } from '@deriv-com/translations';
import ToolbarIcon from './toolbar-icon';

const WorkspaceGroup = observer(() => {
    const { dashboard, toolbar, load_modal, save_modal } = useStore();
    const {
        setChartModalVisibility,
        setTradingViewModalVisibility,
    } = dashboard;
    const { has_redo_stack, has_undo_stack, onResetClick, onSortClick, onUndoClick, onZoomInOutClick } = toolbar;
    const { toggleSaveModal } = save_modal;
    const { toggleLoadModal } = load_modal;

    return (
        <div className='toolbar__wrapper'>
            <div className='toolbar__group toolbar__group-btn' data-testid='dt_toolbar_group_btn'>
                <ToolbarIcon
                    popover_message={localize('Reset')}
                    icon={
                        <span
                            id='db-toolbar__reset-button'
                            className='toolbar__icon'
                            onClick={onResetClick}
                            data-testid='dt_toolbar_reset_button'
                        >
                            <LabelPairedArrowsRotateMdRegularIcon />
                        </span>
                    }
                />
                <ToolbarIcon
                    popover_message={localize('Import')}
                    icon={
                        <span
                            id='db-toolbar__import-button'
                            className='toolbar__icon'
                            onClick={() => toggleLoadModal()}
                            data-testid='dt_toolbar_import_button'
                        >
                            <LabelPairedFolderOpenMdRegularIcon />
                        </span>
                    }
                />
                <ToolbarIcon
                    popover_message={localize('Save')}
                    icon={
                        <span
                            id='db-toolbar__save-button'
                            className='toolbar__icon'
                            onClick={() => toggleSaveModal()}
                            data-testid='dt_toolbar_save_button'
                        >
                            <LabelPairedFloppyDiskMdRegularIcon />
                        </span>
                    }
                />
                <div className='toolbar__separator' />
                <ToolbarIcon
                    popover_message={localize('Undo')}
                    icon={
                        <span
                            id='db-toolbar__undo-button'
                            className={classNames('toolbar__icon', {
                                'toolbar__icon--disabled': !has_undo_stack,
                            })}
                            onClick={() => onUndoClick(false)}
                            data-testid='dt_toolbar_undo_button'
                        >
                            <LabelPairedArrowRotateLeftMdRegularIcon />
                        </span>
                    }
                />
                <ToolbarIcon
                    popover_message={localize('Redo')}
                    icon={
                        <span
                            id='db-toolbar__redo-button'
                            className={classNames('toolbar__icon', {
                                'toolbar__icon--disabled': !has_redo_stack,
                            })}
                            onClick={() => onUndoClick(true)}
                            data-testid='dt_toolbar_redo_button'
                        >
                            <LabelPairedArrowRotateRightMdRegularIcon />
                        </span>
                    }
                />
                <div className='toolbar__separator' />
                <ToolbarIcon
                    popover_message={localize('Sort block')}
                    icon={
                        <span
                            id='db-toolbar__sort-button'
                            className='toolbar__icon'
                            onClick={onSortClick}
                            data-testid='dt_toolbar_sort_button'
                        >
                            <LabelPairedObjectsAlignLeftMdRegularIcon />
                        </span>
                    }
                />
                <ToolbarIcon
                    popover_message={localize('Zoom in')}
                    icon={
                        <span
                            id='db-toolbar__zoom-in-button'
                            className='toolbar__icon'
                            onClick={() => onZoomInOutClick(true)}
                            data-testid='dt_toolbar_zoom_in_button'
                        >
                            <LabelPairedMagnifyingGlassPlusMdRegularIcon />
                        </span>
                    }
                />
                <ToolbarIcon
                    popover_message={localize('Zoom out')}
                    icon={
                        <span
                            id='db-toolbar__zoom-out-button'
                            className='toolbar__icon'
                            onClick={() => onZoomInOutClick(false)}
                            data-testid='dt_toolbar_zoom_out_button'
                        >
                            <LabelPairedMagnifyingGlassMinusMdRegularIcon />
                        </span>
                    }
                />
                <div className='toolbar__separator' />
                <ToolbarIcon
                    popover_message={localize('Chart')}
                    icon={
                        <span
                            id='db-toolbar__chart-button'
                            className='toolbar__icon'
                            onClick={() => setChartModalVisibility(true)}
                            data-testid='dt_toolbar_chart_button'
                        >
                            <LabelPairedChartLineMdRegularIcon />
                        </span>
                    }
                />
                <ToolbarIcon
                    popover_message={localize('TradingView Chart')}
                    icon={
                        <span
                            className='toolbar__icon'
                            id='db-toolbar__tradingview-button'
                            onClick={() => setTradingViewModalVisibility(true)}
                        >
                            <LabelPairedChartTradingviewMdRegularIcon />
                        </span>
                    }
                />
            </div>
        </div>
    );
});

export default WorkspaceGroup;
