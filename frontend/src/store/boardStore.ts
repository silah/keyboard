import { create } from 'zustand'
import { Board, PostIt, CanvasState } from '../types'
import { calculateSectionLayout, getSectionForPosition, constrainPostItToSection, repositionPostItForNewSection, findNonOverlappingPosition } from '../utils/sectionLayout'

const COLORS = ['#FFE066', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57']

// Global flag to prevent concurrent section creation
let isCreatingSection = false

interface BoardStore {
  currentBoard: Board | null
  allBoards: Array<{ id: string; name: string; createdAt: number; updatedAt: number; postItCount: number }>
  canvasState: CanvasState
  canvasSize: { width: number, height: number }
  focusedSectionId: number | null
  isZoomedToSection: boolean
  
  // Actions
  createPostIt: (x: number, y: number) => void
  updatePostIt: (id: string, updates: Partial<PostIt>) => void
  deletePostIt: (id: string) => void
  selectPostIt: (id: string | null) => void
  autoFocusSectionForPostIt: (postItId: string | null) => void
  
  // Section actions
  createSection: () => void
  updateSectionName: (id: number, name: string) => void
  selectSection: (id: number | null) => void
  focusSection: (id: number | null) => void
  zoomToSection: (sectionId: number) => void
  zoomOutToAllSections: () => void
  reassignPostItToSection: (postItId: string, sectionId: number) => void
  deleteSection: (sectionId: number) => void
  updateCanvasSize: (width: number, height: number) => void
  
  // Board management actions
  loadAllBoards: (token?: string) => Promise<void>
  createNewBoard: (name: string, token?: string) => Promise<void>
  switchToBoard: (boardId: string, token?: string) => Promise<void>
  deleteBoard: (boardId: string, token?: string) => Promise<void>
  
  // Canvas actions
  setZoom: (zoom: number) => void
  setPan: (panX: number, panY: number) => void
  
  // Board actions
  saveBoard: (token?: string) => Promise<void>
  loadBoard: (id: string, token?: string) => Promise<void>
  newBoard: () => void
}

export const useBoardStore = create<BoardStore>((set, get) => ({
  currentBoard: {
    id: 'default',
    name: 'My Board',
    postIts: [],
    sections: [{
      id: 1,
      name: 'Section 1',
      x: 0,
      y: 0,
      width: window.innerWidth,
      height: window.innerHeight
    }],
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  allBoards: [],
  canvasState: {
    zoom: 1,
    panX: 0,
    panY: 0,
    selectedPostItId: null,
    selectedSectionId: null
  },
  canvasSize: {
    width: window.innerWidth,
    height: window.innerHeight
  },
  focusedSectionId: null,
  isZoomedToSection: false,

    createPostIt: (x: number, y: number) => {
    const { currentBoard, focusedSectionId } = get()
    if (!currentBoard) return

    // Determine which section this post-it should belong to
    // If a section is focused, use that section, otherwise determine by position
    let targetSection: any
    if (focusedSectionId) {
      targetSection = currentBoard.sections.find(s => s.id === focusedSectionId)
    }
    
    if (!targetSection) {
      targetSection = getSectionForPosition(currentBoard.sections, x, y) || currentBoard.sections[0]
    }
    
    const newPostIt: PostIt = {
      id: Math.random().toString(36).substring(7),
      x,
      y,
      width: 200,
      height: 150,
      text: 'Double-click to edit',
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      fontSize: 14,
      sectionId: targetSection.id,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    // Get all existing post-its in the target section
    const existingPostItsInSection = currentBoard.postIts.filter(
      (p: any) => p.sectionId === targetSection.id
    )

    // Find a non-overlapping position for the new post-it
    const nonOverlappingPos = findNonOverlappingPosition(
      newPostIt,
      targetSection,
      existingPostItsInSection
    )
    
    newPostIt.x = nonOverlappingPos.x
    newPostIt.y = nonOverlappingPos.y
    
    console.log('Creating new post-it in', focusedSectionId ? `focused section ${focusedSectionId}` : 'position-based section', 'at position:', nonOverlappingPos)

    set((state) => ({
      currentBoard: state.currentBoard ? {
        ...state.currentBoard,
        postIts: [...state.currentBoard.postIts, newPostIt],
        updatedAt: Date.now()
      } : null,
      canvasState: {
        ...state.canvasState,
        selectedPostItId: newPostIt.id // Automatically select the newly created post-it
      }
    }))

    // Auto-focus the section for the newly created post-it
    get().autoFocusSectionForPostIt(newPostIt.id)

    // Don't auto-save immediately for new post-its - let the user interact first
    // Auto-save will happen when they edit, move, or resize the post-it
    console.log('Post-it created, auto-save will happen on first interaction')
  },

  updatePostIt: (id: string, updates: Partial<PostIt>) => {
    set((state) => ({
      currentBoard: state.currentBoard ? {
        ...state.currentBoard,
        postIts: state.currentBoard.postIts.map(postIt => 
          postIt.id === id ? { ...postIt, ...updates, updatedAt: Date.now() } : postIt
        ),
        updatedAt: Date.now()
      } : null
    }))

    // Auto-save after updating post-it (text, position, size, etc.)
    setTimeout(() => get().saveBoard(), 100)
  },

  deletePostIt: (id: string) => {
    set((state) => ({
      currentBoard: state.currentBoard ? {
        ...state.currentBoard,
        postIts: state.currentBoard.postIts.filter(postIt => postIt.id !== id),
        updatedAt: Date.now()
      } : null
    }))

    // Auto-save after deleting post-it
    setTimeout(() => get().saveBoard(), 100)
  },

  selectPostIt: (id: string | null) => {
    set((state: any) => ({
      canvasState: { ...state.canvasState, selectedPostItId: id }
    }))
  },

  // Helper function to auto-focus section when selecting post-it from different section
  autoFocusSectionForPostIt: (postItId: string | null) => {
    const { currentBoard, focusedSectionId } = get()
    
    if (!postItId || !currentBoard) {
      return // Don't change section focus when deselecting
    }

    const selectedPostIt = currentBoard.postIts.find((p: any) => p.id === postItId)
    if (!selectedPostIt) {
      return // Post-it not found
    }

    const postItSectionId = selectedPostIt.sectionId
    
    // Only change section focus if:
    // 1. No section is currently focused, OR
    // 2. The post-it is in a different section than the currently focused one
    if (focusedSectionId === null || focusedSectionId !== postItSectionId) {
      console.log('Auto-focusing section', postItSectionId, 'for selected post-it')
      set((state: any) => ({
        focusedSectionId: postItSectionId
      }))
    }
  },

  // Section management
  createSection: () => {
    const { currentBoard, canvasSize } = get()
    if (!currentBoard || currentBoard.sections.length >= 4) return

    // Check and set the global flag to prevent concurrent calls
    if (isCreatingSection) {
      console.log('Section creation already in progress, skipping')
      return
    }
    isCreatingSection = true

    const oldSections = currentBoard.sections
    const newSectionCount = currentBoard.sections.length + 1
    
    console.log('Creating section:', { 
      currentSectionCount: currentBoard.sections.length, 
      newSectionCount,
      currentSectionIds: currentBoard.sections.map(s => s.id) 
    })
    
    const newSections = calculateSectionLayout(newSectionCount, canvasSize.width, canvasSize.height)
    
    // Preserve section names
    const sectionsWithNames = newSections.map(section => {
      const existing = oldSections.find((s: any) => s.id === section.id)
      return existing ? { ...section, name: existing.name } : section
    })

    // Reposition existing post-its proportionally to their new section sizes
    const updatedPostIts = currentBoard.postIts.map((postIt: any) => {
      const oldSection = oldSections.find((s: any) => s.id === postIt.sectionId)
      const newSection = sectionsWithNames.find(s => s.id === postIt.sectionId)
      
      if (oldSection && newSection) {
        const newPosition = repositionPostItForNewSection(postIt, oldSection, newSection)
        return { ...postIt, x: newPosition.x, y: newPosition.y, updatedAt: Date.now() }
      }
      return postIt
    })
    
    set((state: any) => ({
      currentBoard: state.currentBoard ? {
        ...state.currentBoard,
        sections: sectionsWithNames,
        postIts: updatedPostIts,
        updatedAt: Date.now()
      } : null
    }))
    
    // Reset the global flag after completion
    setTimeout(() => {
      isCreatingSection = false
    }, 100)

    // Auto-save after creating section
    setTimeout(() => get().saveBoard(), 200)
  },

  updateSectionName: (id: number, name: string) => {
    set((state: any) => ({
      currentBoard: state.currentBoard ? {
        ...state.currentBoard,
        sections: state.currentBoard.sections.map((section: any) => 
          section.id === id ? { ...section, name } : section
        ),
        updatedAt: Date.now()
      } : null
    }))

    // Auto-save after updating section name
    setTimeout(() => get().saveBoard(), 100)
  },

  selectSection: (id: number | null) => {
    set((state: any) => ({
      canvasState: { ...state.canvasState, selectedSectionId: id }
    }))
  },

  focusSection: (id: number | null) => {
    set({ focusedSectionId: id })
  },

  zoomToSection: (sectionId: number) => {
    const { currentBoard } = get()
    if (!currentBoard) return

    const section = currentBoard.sections.find(s => s.id === sectionId)
    if (!section) return

    set({ 
      focusedSectionId: sectionId,
      isZoomedToSection: true 
    })
  },

  zoomOutToAllSections: () => {
    set({ 
      focusedSectionId: null,
      isZoomedToSection: false 
    })
  },

  reassignPostItToSection: (postItId: string, sectionId: number) => {
    const { currentBoard } = get()
    if (!currentBoard) return

    const targetSection = currentBoard.sections.find(s => s.id === sectionId)
    if (!targetSection) return

    // Get all existing post-its in the target section (excluding the one being moved)
    const existingPostItsInSection = currentBoard.postIts.filter(
      (p: any) => p.sectionId === sectionId && p.id !== postItId
    )

    set((state: any) => ({
      currentBoard: state.currentBoard ? {
        ...state.currentBoard,
        postIts: state.currentBoard.postIts.map((postIt: any) => {
          if (postIt.id === postItId) {
            // Find a non-overlapping position for the post-it in the target section
            const nonOverlappingPos = findNonOverlappingPosition(
              postIt,
              targetSection,
              existingPostItsInSection
            )
            
            console.log('Moving post-it to section', sectionId, 'at position:', nonOverlappingPos)
            
            return {
              ...postIt,
              sectionId,
              x: nonOverlappingPos.x,
              y: nonOverlappingPos.y,
              updatedAt: Date.now()
            }
          }
          return postIt
        }),
        updatedAt: Date.now()
      } : null
    }))

    // Auto-save after reassigning post-it to section
    setTimeout(() => get().saveBoard(), 100)
  },

  deleteSection: (sectionId: number) => {
    const { currentBoard, canvasSize } = get()
    if (!currentBoard || currentBoard.sections.length <= 1) return // Can't delete the last section

    console.log('Deleting section:', { 
      sectionId, 
      currentSections: currentBoard.sections.map(s => s.id),
      sectionCount: currentBoard.sections.length 
    })

    // Remove the section and all post-its that belong to it
    const remainingSections = currentBoard.sections.filter((s: any) => s.id !== sectionId)
    const remainingPostIts = currentBoard.postIts.filter((p: any) => p.sectionId !== sectionId)
    
    // Renumber sections to be consecutive (1, 2, 3, 4)
    const renumberedSections = remainingSections.map((section: any, index: number) => ({
      ...section,
      id: index + 1
    }))
    
    // Update post-it section IDs to match renumbered sections
    const updatedPostIts = remainingPostIts.map((postIt: any) => {
      const oldSectionIndex = remainingSections.findIndex((s: any) => s.id === postIt.sectionId)
      return { ...postIt, sectionId: oldSectionIndex + 1, updatedAt: Date.now() }
    })

    // Recalculate layout for remaining sections
    const newLayout = calculateSectionLayout(renumberedSections.length, canvasSize.width, canvasSize.height)
    const sectionsWithNames = newLayout.map((section, index) => ({
      ...section,
      name: renumberedSections[index]?.name || `Section ${section.id}`
    }))

    // Reposition remaining post-its to fit new layout
    const repositionedPostIts = updatedPostIts.map((postIt: any) => {
      const oldSection = remainingSections.find((s: any) => s.id === postIt.sectionId)
      const newSection = sectionsWithNames.find(s => s.id === postIt.sectionId)
      
      if (oldSection && newSection) {
        const newPosition = repositionPostItForNewSection(postIt, oldSection, newSection)
        return { ...postIt, x: newPosition.x, y: newPosition.y, updatedAt: Date.now() }
      }
      return postIt
    })

    set((state: any) => ({
      currentBoard: state.currentBoard ? {
        ...state.currentBoard,
        sections: sectionsWithNames,
        postIts: repositionedPostIts,
        updatedAt: Date.now()
      } : null,
      canvasState: { ...state.canvasState, selectedSectionId: null }
    }))

    // Auto-save after deleting section
    setTimeout(() => get().saveBoard(), 100)
  },

  updateCanvasSize: (width: number, height: number) => {
    const { currentBoard } = get()
    if (!currentBoard) return

    const oldSections = currentBoard.sections
    const updatedSections = calculateSectionLayout(currentBoard.sections.length, width, height)
    
    // Preserve section names
    const sectionsWithNames = updatedSections.map(section => {
      const existing = oldSections.find((s: any) => s.id === section.id)
      return existing ? { ...section, name: existing.name } : section
    })

    // Reposition existing post-its proportionally to their new section sizes
    const repositionedPostIts = currentBoard.postIts.map((postIt: any) => {
      const oldSection = oldSections.find((s: any) => s.id === postIt.sectionId)
      const newSection = sectionsWithNames.find(s => s.id === postIt.sectionId)
      
      if (oldSection && newSection) {
        const newPosition = repositionPostItForNewSection(postIt, oldSection, newSection)
        return { ...postIt, x: newPosition.x, y: newPosition.y, updatedAt: Date.now() }
      }
      return postIt
    })

    set((state: any) => ({
      canvasSize: { width, height },
      currentBoard: state.currentBoard ? {
        ...state.currentBoard,
        sections: sectionsWithNames,
        postIts: repositionedPostIts,
        updatedAt: Date.now()
      } : null
    }))
  },

  setZoom: (zoom: number) => {
    set((state: any) => ({
      canvasState: { ...state.canvasState, zoom: Math.max(0.1, Math.min(5, zoom)) }
    }))
  },

  setPan: (panX: number, panY: number) => {
    set((state: any) => ({
      canvasState: { ...state.canvasState, panX, panY }
    }))
  },

  saveBoard: async (token?: string) => {
    const { currentBoard, canvasState } = get()
    if (!currentBoard) return

    try {
      const headers: any = {
        'Content-Type': 'application/json',
      }
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch('http://localhost:3001/api/boards', {
        method: 'POST',
        headers,
        body: JSON.stringify(currentBoard),
      })

      if (response.ok) {
        console.log('Board saved successfully')
        // Preserve the current selection after saving
        const savedBoard = await response.json()
        set((state: any) => ({
          currentBoard: savedBoard,
          // Preserve canvas state to maintain selection
          canvasState: state.canvasState
        }))
      } else {
        console.error('Failed to save board')
      }
    } catch (error) {
      console.error('Error saving board:', error)
    }
  },

  loadBoard: async (id: string, token?: string) => {
    try {
      const headers: any = {}
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(`http://localhost:3001/api/boards/${id}`, {
        headers
      })
      
      if (response.ok) {
        const board = await response.json()
        set({ currentBoard: board })
      } else {
        console.error('Failed to load board')
        throw new Error('Failed to load board')
      }
    } catch (error) {
      console.error('Error loading board:', error)
      throw error
    }
  },

  newBoard: () => {
    const { canvasSize } = get()
    const newBoard: Board = {
      id: Math.random().toString(36).substring(7),
      name: 'New Board',
      postIts: [],
      sections: calculateSectionLayout(1, canvasSize.width, canvasSize.height),
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    set({ currentBoard: newBoard })
  },

  // Board management functions
  loadAllBoards: async (token?: string) => {
    try {
      const headers: any = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch('http://localhost:3001/api/boards', { headers })
      if (response.ok) {
        const boards = await response.json()
        set({ allBoards: boards })
        console.log('Loaded boards list:', boards)
      } else {
        console.error('Failed to load boards list')
      }
    } catch (error) {
      console.error('Error loading boards list:', error)
    }
  },

  createNewBoard: async (name: string, token?: string) => {
    try {
      const headers: any = {
        'Content-Type': 'application/json',
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch('http://localhost:3001/api/boards/new', {
        method: 'POST',
        headers,
        body: JSON.stringify({ name }),
      })

      if (response.ok) {
        const newBoard = await response.json()
        console.log('Created new board:', newBoard)
        
        // Update the boards list
        const { loadAllBoards } = get()
        await loadAllBoards(token)
        
        // Switch to the new board (board is already saved by the backend)
        set({ currentBoard: newBoard })
        
        return newBoard
      } else {
        console.error('Failed to create new board')
        throw new Error('Failed to create new board')
      }
    } catch (error) {
      console.error('Error creating new board:', error)
      throw error
    }
  },

  switchToBoard: async (boardId: string, token?: string) => {
    try {
      const { currentBoard: oldBoard, saveBoard } = get()
      console.log('Switching from board', oldBoard?.id, 'to board', boardId)
      
      // Auto-save the current board before switching (prevent data loss)
      if (oldBoard && oldBoard.id !== boardId) {
        console.log('Auto-saving current board before switching')
        await saveBoard(token)
      }
      
      const headers: any = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(`http://localhost:3001/api/boards/${boardId}`, { headers })
      if (response.ok) {
        const board = await response.json()
        console.log('Loaded board data:', {
          id: board.id,
          name: board.name,
          postItCount: board.postIts.length,
          postItIds: board.postIts.map((p: any) => p.id)
        })
        
        set({ 
          currentBoard: board,
          // Reset canvas state when switching boards
          canvasState: {
            zoom: 1,
            panX: 0,
            panY: 0,
            selectedPostItId: null,
            selectedSectionId: null
          },
          focusedSectionId: null,
          isZoomedToSection: false
        })
        console.log('Switched to board:', board.name)
      } else {
        console.error('Failed to switch to board:', boardId)
      }
    } catch (error) {
      console.error('Error switching to board:', error)
    }
  },

  deleteBoard: async (boardId: string, token?: string) => {
    try {
      const headers: any = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(`http://localhost:3001/api/boards/${boardId}`, {
        method: 'DELETE',
        headers
      })

      if (response.ok) {
        console.log('Deleted board:', boardId)
        
        // Update the boards list
        const { loadAllBoards, currentBoard, allBoards } = get()
        await loadAllBoards(token)
        
        // If we deleted the current board, switch to another board or create a default one
        if (currentBoard?.id === boardId) {
          const remainingBoards = allBoards.filter(b => b.id !== boardId)
          if (remainingBoards.length > 0) {
            // Switch to the first remaining board
            await get().switchToBoard(remainingBoards[0].id, token)
          } else {
            // Create a default board if no boards remain
            await get().createNewBoard('My Board', token)
          }
        }
      } else {
        console.error('Failed to delete board:', boardId)
      }
    } catch (error) {
      console.error('Error deleting board:', error)
    }
  }
}))