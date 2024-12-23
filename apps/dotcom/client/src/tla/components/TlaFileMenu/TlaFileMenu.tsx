/* ---------------------- Menu ---------------------- */

import { TlaFile } from '@tldraw/dotcom-shared'
import { ReactNode, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	TldrawUiMenuSubmenu,
	getIncrementedName,
	uniqueId,
	useDialogs,
	useToasts,
} from 'tldraw'
import { TldrawApp } from '../../app/TldrawApp'
import { useApp } from '../../hooks/useAppState'
import { useIsFileOwner } from '../../hooks/useIsFileOwner'
import { TLAppUiEventSource, useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { copyTextToClipboard } from '../../utils/copy'
import { defineMessages, useMsg } from '../../utils/i18n'
import { getFilePath, getShareableFileUrl } from '../../utils/urls'
import { TlaDeleteFileDialog } from '../dialogs/TlaDeleteFileDialog'

const messages = defineMessages({
	copied: { defaultMessage: 'Copied link' },
	copyLink: { defaultMessage: 'Copy link' },
	delete: { defaultMessage: 'Delete' },
	duplicate: { defaultMessage: 'Duplicate' },
	file: { defaultMessage: 'File' },
	forget: { defaultMessage: 'Forget' },
	rename: { defaultMessage: 'Rename' },
	copy: { defaultMessage: 'Copy' },
})

function getDuplicateName(file: TlaFile, app: TldrawApp) {
	if (file.name.trim().length === 0) {
		return ''
	}
	const currentFileName = app.getFileName(file.id)
	const allFileNames = app.getUserOwnFiles().map((file) => file.name)
	return getIncrementedName(currentFileName, allFileNames)
}

export function TlaFileMenu({
	children,
	source,
	fileId,
	onRenameAction,
	trigger,
}: {
	children?: ReactNode
	source: TLAppUiEventSource
	fileId: string
	onRenameAction(): void
	trigger: ReactNode
}) {
	const app = useApp()
	const { addDialog } = useDialogs()
	const navigate = useNavigate()
	const { addToast } = useToasts()
	const trackEvent = useTldrawAppUiEvents()
	const copiedMsg = useMsg(messages.copied)

	const handleCopyLinkClick = useCallback(() => {
		const url = getShareableFileUrl(fileId)
		copyTextToClipboard(url)
		addToast({
			id: 'copied-link',
			title: copiedMsg,
		})
		trackEvent('copy-file-link', { source })
	}, [fileId, addToast, copiedMsg, trackEvent, source])

	const handleDuplicateClick = useCallback(async () => {
		const newFileId = uniqueId()
		const file = app.getFile(fileId)
		if (!file) return
		app.createFile({ id: newFileId, name: getDuplicateName(file, app) })
		navigate(getFilePath(newFileId), { state: { mode: 'duplicate', duplicateId: fileId } })
	}, [app, fileId, navigate])

	const handleDeleteClick = useCallback(() => {
		addDialog({
			component: ({ onClose }) => <TlaDeleteFileDialog fileId={fileId} onClose={onClose} />,
		})
	}, [fileId, addDialog])

	const isOwner = useIsFileOwner(fileId)

	const copyLinkMsg = useMsg(messages.copyLink)
	const renameMsg = useMsg(messages.rename)
	const duplicateMsg = useMsg(messages.duplicate)
	const deleteOrForgetMsg = useMsg(isOwner ? messages.delete : messages.forget)
	const fileSubmenuMsg = useMsg(messages.file)

	const fileItems = (
		<>
			<TldrawUiMenuGroup id="file-actions">
				{/* todo: in published rooms, support copying link */}
				<TldrawUiMenuItem
					label={copyLinkMsg}
					id="copy-link"
					readonlyOk
					onSelect={handleCopyLinkClick}
				/>
				{isOwner && (
					<TldrawUiMenuItem label={renameMsg} id="copy-link" readonlyOk onSelect={onRenameAction} />
				)}
				{/* todo: in published rooms, support duplication / forking */}
				<TldrawUiMenuItem
					label={duplicateMsg}
					id="copy-link"
					readonlyOk
					onSelect={handleDuplicateClick}
				/>
				{/* <TldrawUiMenuItem label={intl.formatMessage(messages.star)} id="copy-link" readonlyOk onSelect={handleStarLinkClick} /> */}
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="file-delete">
				<TldrawUiMenuItem
					label={deleteOrForgetMsg}
					id="delete"
					readonlyOk
					onSelect={handleDeleteClick}
				/>
			</TldrawUiMenuGroup>
		</>
	)

	const fileItemsWrapper = children ? (
		<TldrawUiMenuSubmenu id="file" label={fileSubmenuMsg}>
			{fileItems}
		</TldrawUiMenuSubmenu>
	) : (
		fileItems
	)

	return (
		<TldrawUiDropdownMenuRoot id={`file-menu-${fileId}-${source}`}>
			<TldrawUiMenuContextProvider type="menu" sourceId="dialog">
				<TldrawUiDropdownMenuTrigger>{trigger}</TldrawUiDropdownMenuTrigger>
				<TldrawUiDropdownMenuContent side="bottom" align="start" alignOffset={0} sideOffset={0}>
					{fileItemsWrapper}
					{children}
				</TldrawUiDropdownMenuContent>
			</TldrawUiMenuContextProvider>
		</TldrawUiDropdownMenuRoot>
	)
}
