import { useState } from 'react'
import Canvas from './components/Canvas'
import Menu from './components/Menu'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useBoardStore } from './store/boardStore'

function App() {
  const [showMenu, setShowMenu] = useState(false)
  const { saveBoard, newBoard, createSection } = useBoardStore()

  useKeyboardShortcuts({
    onNewNote: () => {
      // Will be handled by Canvas component
    },
    onSaveBoard: () => {
      saveBoard()
    },
    onNewBoard: () => {
      newBoard()
    },
    onToggleMenu: () => {
      setShowMenu(!showMenu)
    },
    onNewSection: () => {
      createSection()
    }
  })

  return (
    <div className="w-full h-screen bg-gray-100 relative overflow-hidden">
      <Canvas />
      <Menu isVisible={showMenu} onClose={() => setShowMenu(false)} />
      
      {/* Help indicator */}
      <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded text-sm">
        M: menu • N: new note • S: save • Ctrl+N: new board • Ctrl+Space: new section • Ctrl+Alt+1-4: delete section
      </div>
    </div>
  )
}

export default App