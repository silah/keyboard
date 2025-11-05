import { useHotkeys } from 'react-hotkeys-hook'

interface KeyboardShortcutsProps {
  onNewNote: () => void
  onSaveBoard: () => void
  onNewBoard: () => void
  onToggleMenu: () => void
  onNewSection: () => void
}

export const useKeyboardShortcuts = ({
  onNewNote,
  onSaveBoard,
  onNewBoard,
  onToggleMenu,
  onNewSection
}: KeyboardShortcutsProps) => {
  // Create new note
  useHotkeys('n', (e) => {
    e.preventDefault()
    onNewNote()
  })

  // Save board
  useHotkeys('s', (e) => {
    e.preventDefault()
    onSaveBoard()
  })

  // New board
  useHotkeys('ctrl+n', (e) => {
    e.preventDefault()
    onNewBoard()
  })

  // Toggle menu
  useHotkeys('m', (e) => {
    e.preventDefault()
    onToggleMenu()
  })

  // Delete selected note
  useHotkeys('delete, backspace', (e) => {
    e.preventDefault()
    // Will be handled by Canvas component
  })

  // New section
  useHotkeys('ctrl+space', (e: any) => {
    e.preventDefault()
    onNewSection()
  })

  // Escape to deselect
  useHotkeys('escape', (e: any) => {
    e.preventDefault()
    // Will be handled by Canvas component
  })
}