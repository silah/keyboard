import { useEffect, useRef, useState } from 'react'
import { fabric } from 'fabric'
import { useBoardStore } from '../store/boardStore'
import { PostIt } from '../types'
import { getSectionForPosition, constrainPostItToSection, repositionPostItForNewSection } from '../utils/sectionLayout'

const Canvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null)
  const lastSectionCreateTime = useRef<number>(0)
  const { 
    currentBoard, 
    canvasState,
    focusedSectionId,
    isZoomedToSection,
    createPostIt, 
    updatePostIt, 
    deletePostIt, 
    selectPostIt,
    autoFocusSectionForPostIt,
    createSection,
    updateSectionName,
    selectSection,
    focusSection,
    zoomToSection,
    zoomOutToAllSections,
    reassignPostItToSection,
    deleteSection,
    updateCanvasSize
  } = useBoardStore()
  const [editingSectionId, setEditingSectionId] = useState<number | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    // Initialize Fabric.js canvas
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: '#f3f4f6'
    })

    fabricCanvasRef.current = canvas

    // Handle window resize
    const handleResize = () => {
      canvas.setWidth(window.innerWidth)
      canvas.setHeight(window.innerHeight)
      canvas.renderAll()
    }

    window.addEventListener('resize', handleResize)

    // Handle double-click to create new post-it
    canvas.on('mouse:dblclick', (e) => {
      if (!e.target) {
        const pointer = canvas.getPointer(e.e)
        createPostIt(pointer.x - 100, pointer.y - 75) // Center the post-it on click
      }
    })

    // Handle selection
    canvas.on('selection:created', (e) => {
      if (e.selected && e.selected[0]) {
        const obj = e.selected[0] as any
        if (obj.postItId) {
          selectPostIt(obj.postItId)
          autoFocusSectionForPostIt(obj.postItId)
        }
      }
    })

    canvas.on('selection:cleared', () => {
      selectPostIt(null)
    })

    return () => {
      window.removeEventListener('resize', handleResize)
      canvas.dispose()
    }
  }, [createPostIt, selectPostIt])

  // Sync sections and post-its from store to canvas
  useEffect(() => {
    if (!fabricCanvasRef.current || !currentBoard) return

    // If editing a section, don't re-render
    if (editingSectionId) {
      return
    }

    const canvas = fabricCanvasRef.current
    
    canvas.clear()

    // Determine which sections to show
    let sectionsToRender = currentBoard.sections
    if (isZoomedToSection && focusedSectionId) {
      // Only render the focused section when zoomed
      sectionsToRender = currentBoard.sections.filter((section: any) => section.id === focusedSectionId)
      
      // Adjust the focused section to fill the canvas
      if (sectionsToRender.length > 0) {
        const originalSection = sectionsToRender[0]
        sectionsToRender = [{
          ...originalSection,
          x: 0,
          y: 0,
          width: window.innerWidth,
          height: window.innerHeight
        }]
      }
    }

    // Render sections
    sectionsToRender.forEach((section: any) => {
      createFabricSection(canvas, section)
    })

    // Render post-its (filter to focused section when zoomed)
    let postItsToRender = currentBoard.postIts
    if (isZoomedToSection && focusedSectionId) {
      postItsToRender = currentBoard.postIts.filter((postIt: any) => postIt.sectionId === focusedSectionId)
      
      // Scale and reposition post-its for the zoomed view
      const originalSection = currentBoard.sections.find((s: any) => s.id === focusedSectionId)
      if (originalSection) {
        const scaleX = window.innerWidth / originalSection.width
        const scaleY = window.innerHeight / originalSection.height
        const scale = Math.min(scaleX, scaleY)
        
        postItsToRender = postItsToRender.map((postIt: any) => ({
          ...postIt,
          x: (postIt.x - originalSection.x) * scale,
          y: (postIt.y - originalSection.y) * scale,
          width: postIt.width * scale,
          height: postIt.height * scale
        }))
      }
    }

    postItsToRender.forEach((postIt: any) => {
      createFabricPostIt(canvas, postIt)
    })

    canvas.renderAll()
  }, [currentBoard?.postIts, currentBoard?.sections, isZoomedToSection, focusedSectionId, editingSectionId])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      updateCanvasSize(window.innerWidth, window.innerHeight)
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.setWidth(window.innerWidth)
        fabricCanvasRef.current.setHeight(window.innerHeight)
        fabricCanvasRef.current.renderAll()
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [updateCanvasSize])

  // Sync canvas selection with store selection
  useEffect(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas || !canvasState.selectedPostItId) return

    // Small delay to ensure fabric object is created
    const selectTimer = setTimeout(() => {
      // Find the fabric object with the matching postItId
      const targetObject = canvas.getObjects().find((obj: any) => 
        obj.postItId === canvasState.selectedPostItId
      )

      if (targetObject) {
        canvas.setActiveObject(targetObject)
        canvas.renderAll()
        console.log('Auto-selected newly created post-it:', canvasState.selectedPostItId)
      }
    }, 50)

    return () => clearTimeout(selectTimer)
  }, [canvasState.selectedPostItId])

  const createFabricSection = (canvas: fabric.Canvas, section: any) => {
    // Create section boundary with different style if focused
    const isFocused = focusedSectionId === section.id
    const sectionBorder = new fabric.Rect({
      left: section.x,
      top: section.y,
      width: section.width,
      height: section.height,
      fill: 'transparent',
      stroke: isFocused ? '#4ECDC4' : '#ddd',
      strokeWidth: isFocused ? 3 : 2,
      strokeDashArray: isFocused ? [] : [5, 5],
      selectable: false,
      evented: true
    })

    // Add custom properties to identify this as a section background
    ;(sectionBorder as any).sectionId = section.id
    ;(sectionBorder as any).isSectionBackground = true

    // Handle section background clicks to focus the section
    sectionBorder.on('mousedown', (e: any) => {
      if (e.e.detail === 1) { // Single click on section background
        console.log('Section background clicked:', section.id)
        focusSection(section.id)
      }
    })

    // Create section title
    const sectionTitle = new fabric.IText(section.name, {
      left: section.x + 10,
      top: section.y + 5,
      fontSize: 14,
      fontFamily: 'Arial',
      fill: isFocused ? '#4ECDC4' : '#666',
      backgroundColor: '#fff',
      selectable: false,
      evented: true
    })

    // Add custom properties
    ;(sectionTitle as any).sectionId = section.id
    ;(sectionTitle as any).isSection = true

    // Handle section title editing
    sectionTitle.on('mousedown', (e: any) => {
      if (e.e.detail === 2) { // Double click
        setEditingSectionId(section.id)
        enterSectionEditMode(canvas, section, sectionTitle)
      }
    })

    canvas.add(sectionBorder)
    canvas.add(sectionTitle)
  }

  const enterSectionEditMode = (canvas: fabric.Canvas, section: any, titleObj: fabric.IText) => {
    titleObj.enterEditing()
    titleObj.selectAll()
    
    const exitEditing = () => {
      updateSectionName(section.id, titleObj.text || section.name)
      setEditingSectionId(null)
      titleObj.exitEditing()
    }
    
    titleObj.on('editing:exited', exitEditing)
  }

  const createFabricPostIt = (canvas: fabric.Canvas, postIt: PostIt) => {
    // Create post-it as a single rect with custom resize handling
    const rect = new fabric.Rect({
      left: postIt.x,
      top: postIt.y,
      width: postIt.width,
      height: postIt.height,
      fill: postIt.color,
      stroke: '#333',
      strokeWidth: 1,
      rx: 5,
      ry: 5,
      shadow: new fabric.Shadow({
        color: 'rgba(0, 0, 0, 0.3)',
        blur: 10,
        offsetX: 2,
        offsetY: 2
      }),
      selectable: true,
      hasControls: false, // Disable built-in scaling controls
      hasBorders: true,
      lockRotation: true,
      lockScalingX: true, // Lock scaling to prevent transform errors
      lockScalingY: true,
      lockSkewingX: true,
      lockSkewingY: true,
      transparentCorners: false,
      borderColor: '#333'
    })

    // Add custom properties
    ;(rect as any).postItId = postIt.id
    ;(rect as any).isPostIt = true
    ;(rect as any).postItText = postIt.text

    // Handle double-click for text editing
    rect.on('mousedown', (e) => {
      if (e.e.detail === 2) { // Double click
        enterTextEditMode(canvas, postIt, rect as any)
      }
    })

    // Handle movement only - no scaling events
    rect.on('moving', () => {
      const { left, top } = rect
      updatePostIt(postIt.id, { x: left || 0, y: top || 0 })
    })

    // Handle movement completion to check for section changes
    rect.on('modified', () => {
      const { left, top } = rect
      
      // Check if the post-it has moved to a different section
      if (currentBoard && currentBoard.sections) {
        const newSection = getSectionForPosition(currentBoard.sections, left || 0, top || 0)
        
        if (newSection && newSection.id !== postIt.sectionId) {
          console.log('Post-it moved to different section via mouse drag:', newSection.id)
          // Update the post-it's section assignment
          updatePostIt(postIt.id, { sectionId: newSection.id })
          // Auto-focus the new section
          autoFocusSectionForPostIt(postIt.id)
          
          // Restore post-it focus after section change (canvas may re-render)
          setTimeout(() => {
            const canvas = fabricCanvasRef.current
            if (canvas) {
              const updatedObject = canvas.getObjects().find((obj: any) => obj.postItId === postIt.id)
              if (updatedObject) {
                canvas.setActiveObject(updatedObject)
                canvas.renderAll()
                selectPostIt(postIt.id)
                console.log('Post-it focus restored after mouse drag section change:', postIt.id)
              }
            }
          }, 100)
        } else {
          // Even if no section change, ensure the post-it stays selected
          // (sometimes fabric.js loses selection during dragging)
          setTimeout(() => {
            const canvas = fabricCanvasRef.current
            if (canvas && !canvas.getActiveObject()) {
              const currentObject = canvas.getObjects().find((obj: any) => obj.postItId === postIt.id)
              if (currentObject) {
                canvas.setActiveObject(currentObject)
                canvas.renderAll()
                selectPostIt(postIt.id)
                console.log('Post-it focus restored after mouse drag (same section):', postIt.id)
              }
            }
          }, 50)
        }
      }
    })

    // Add custom resize handles using separate rect objects
    const createResizeHandle = (position: string) => {
      const handle = new fabric.Rect({
        width: 12,
        height: 12,
        fill: '#fff',
        stroke: '#333',
        strokeWidth: 2,
        selectable: true,
        hasControls: false,
        hasBorders: false,
        visible: false, // Initially hidden
        hoverCursor: 'nw-resize',
        moveCursor: 'nw-resize'
      })
      
      ;(handle as any).isResizeHandle = true
      ;(handle as any).handlePosition = position
      ;(handle as any).parentPostItId = postIt.id
      
      return handle
    }

    // Create resize handles for corners
    const handles = {
      'bottom-right': createResizeHandle('bottom-right')
    }

    // Show/hide handles when post-it is selected/deselected
    rect.on('selected', () => {
      console.log('Post-it selected, showing resize handle')
      Object.values(handles).forEach(handle => {
        handle.set({ visible: true })
        // Position handle at bottom-right corner
        handle.set({
          left: rect.left! + rect.width! - 6,
          top: rect.top! + rect.height! - 6
        })
        handle.setCoords()
      })
      canvas.renderAll()
    })

    rect.on('deselected', () => {
      console.log('Post-it deselected, hiding resize handle')
      Object.values(handles).forEach(handle => {
        handle.set({ visible: false })
      })
      canvas.renderAll()
    })

    // Handle resize handle dragging
    Object.values(handles).forEach(handle => {
      handle.on('moving', () => {
        if ((handle as any).isResizeHandle && rect) {
          console.log('Resize handle being dragged')
          const newWidth = Math.max(100, handle.left! - rect.left! + 6)
          const newHeight = Math.max(80, handle.top! - rect.top! + 6)
          
          rect.set({
            width: newWidth,
            height: newHeight
          })
          
          // Update the handle position to stay at corner
          handle.set({
            left: rect.left! + rect.width! - 6,
            top: rect.top! + rect.height! - 6
          })
          
          rect.setCoords()
          handle.setCoords()
          
          // Update post-it data
          updatePostIt(postIt.id, {
            width: newWidth,
            height: newHeight
          })
          
          canvas.renderAll()
        }
      })
      
      // Also handle mousedown to ensure it's recognized as a resize operation
      handle.on('mousedown', (e) => {
        console.log('Resize handle clicked')
        e.e.stopPropagation()
      })
    })

    canvas.add(rect)
    Object.values(handles).forEach(handle => canvas.add(handle))
    
    // Store text rendering function to avoid multiple event listeners
    const renderPostItText = () => {
      const ctx = canvas.getContext()
      if (ctx && rect.visible && canvas.getObjects().includes(rect)) {
        try {
          ctx.save()
          ctx.font = `${postIt.fontSize}px Arial`
          ctx.fillStyle = '#333'
          ctx.textAlign = 'left'
          ctx.textBaseline = 'top'
          
          // Word wrap the text
          const words = postIt.text.split(' ')
          const maxWidth = rect.width! - 20
          const lineHeight = postIt.fontSize * 1.2
          let line = ''
          let y = rect.top! + 10
          
          for (const word of words) {
            const testLine = line + word + ' '
            const metrics = ctx.measureText(testLine)
            if (metrics.width > maxWidth && line !== '') {
              ctx.fillText(line, rect.left! + 10, y)
              line = word + ' '
              y += lineHeight
            } else {
              line = testLine
            }
          }
          ctx.fillText(line, rect.left! + 10, y)
          ctx.restore()
        } catch (textRenderError) {
          console.error('Error rendering post-it text:', textRenderError)
        }
      }
    }
    
    // Add the text rendering to after:render event
    canvas.on('after:render', renderPostItText)
    
    // Store reference to clean up later if needed
    ;(rect as any).textRenderer = renderPostItText
  }

  const enterTextEditMode = (canvas: fabric.Canvas, postIt: PostIt, rectObj: any) => {
    console.log('Entering text edit mode for post-it:', postIt.id)
    
    try {
      // Remove only the specific post-it being edited, preserve all others
      const objectsToRemove = canvas.getObjects().filter(obj => (obj as any).postItId === postIt.id)
      console.log('Removing objects for editing:', objectsToRemove.length)
      
      objectsToRemove.forEach(obj => {
        canvas.remove(obj)
      })
      
      // Force canvas to re-render remaining objects after removal
      canvas.renderAll()
      console.log('Remaining objects on canvas:', canvas.getObjects().length)
      
      console.log('Removed post-it from canvas, creating overlay')
      
      // Get canvas element and its position
      const canvasElement = canvas.getElement()
      const canvasRect = canvasElement.getBoundingClientRect()
      
      console.log('Canvas rect:', canvasRect)
      console.log('Post-it position:', { x: postIt.x, y: postIt.y, width: postIt.width, height: postIt.height })
      
      // Create a simple overlay input
      const overlay = document.createElement('textarea')
      overlay.style.position = 'fixed' // Use fixed instead of absolute
      overlay.style.left = `${canvasRect.left + postIt.x + 10}px`
      overlay.style.top = `${canvasRect.top + postIt.y + 10}px`
      overlay.style.width = `${postIt.width - 20}px`
      overlay.style.height = `${postIt.height - 20}px`
      overlay.style.fontSize = `${postIt.fontSize}px`
      overlay.style.fontFamily = 'Arial'
      overlay.style.border = '2px solid #333'
      overlay.style.borderRadius = '3px'
      overlay.style.padding = '5px'
      overlay.style.resize = 'none'
      overlay.style.outline = 'none'
      overlay.style.backgroundColor = postIt.color // Use post-it's background color
      overlay.style.color = '#333'
      overlay.style.zIndex = '9999'
      overlay.style.pointerEvents = 'auto'
      overlay.style.userSelect = 'text'
      overlay.style.cursor = 'text'
      overlay.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)' // Add shadow to match post-it
      overlay.value = postIt.text
      overlay.setAttribute('data-post-it-id', postIt.id)
      overlay.disabled = false
      overlay.readOnly = false
      
      console.log('Created overlay element with styles')
      
      // Add overlay to document body instead of canvas container
      document.body.appendChild(overlay)
      console.log('Added overlay to document body')
      
      // Flag to prevent immediate completion
      let editingStarted = false
      let completionTriggered = false
      
      // Force focus with multiple attempts
      const establishFocus = () => {
        overlay.focus()
        overlay.select()
        overlay.setSelectionRange(0, overlay.value.length)
        editingStarted = true
        console.log('Focus established, editing started')
        
        // Only set up event listeners after focus is established
        if (!overlay.dataset.listenersAdded) {
          overlay.dataset.listenersAdded = 'true'
          
          // Handle completion on blur or enter - with proper event signatures
          overlay.addEventListener('blur', () => {
            if (editingStarted && !completionTriggered) {
              handleTextEditComplete('blur')
            }
          })
          overlay.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleTextEditComplete('enter')
            }
            if (e.key === 'Escape') {
              e.preventDefault()
              handleTextEditComplete('escape')
            }
          })
          
          console.log('Event listeners set up after focus established')
        }
      }
      
      // Immediate focus attempt
      setTimeout(establishFocus, 0)
      
      // Backup focus attempts
      setTimeout(establishFocus, 50)
      setTimeout(establishFocus, 100)
      
      console.log('Focused and selected overlay text')
      
      const handleTextEditComplete = (reason: string) => {
        if (completionTriggered) {
          console.log('Completion already triggered, ignoring:', reason)
          return
        }
        
        if (!editingStarted) {
          console.log('Ignoring completion before editing started:', reason)
          return
        }
        
        completionTriggered = true
        console.log('Completing text edit, reason:', reason)
        
        try {
          const updatedText = overlay.value || postIt.text
          
          // Remove the overlay
          if (overlay.parentElement) {
            overlay.parentElement.removeChild(overlay)
            console.log('Removed overlay from DOM')
          }
          
          // Update the post-it data
          updatePostIt(postIt.id, { text: updatedText })
          console.log('Updated post-it text:', updatedText)
          
          // Re-create the post-it with updated text
          setTimeout(() => {
            try {
              console.log('Text edit completed, store updated - letting sync effect handle recreation')
              // Don't manually recreate the fabric object - let the store sync handle it
              // This prevents duplicate objects in zoomed mode
            } catch (error) {
              console.error('Error completing text edit:', error)
            }
          }, 50)
        } catch (error) {
          console.error('Error completing text edit:', error)
        }
      }
      
    } catch (error) {
      console.error('Error in enterTextEditMode:', error)
      // Try to recreate the post-it if something goes wrong
      setTimeout(() => {
        createFabricPostIt(canvas, postIt)
        canvas.renderAll()
      }, 50)
    }
  }

  // Handle keyboard shortcuts
  useEffect(() => {
    console.log('Setting up keyboard event listener')
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!fabricCanvasRef.current) return

      const canvas = fabricCanvasRef.current
      const activeObject = canvas.getActiveObject()
      
      // Get current editing state directly instead of relying on state variable
      const currentlyEditing = canvas.getActiveObject()?.type === 'i-text' && (canvas.getActiveObject() as any).isEditing

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (activeObject && (activeObject as any).postItId && !currentlyEditing) {
          e.preventDefault()
          const postItId = (activeObject as any).postItId
          deletePostIt(postItId)
        }
      }

      if (e.key === 'Escape') {
        if (!currentlyEditing) {
          canvas.discardActiveObject()
          canvas.renderAll()
          selectPostIt(null)
        }
      }

      // Create new post-it at center when 'n' is pressed
      if (e.key === 'n' && !currentlyEditing && !editingSectionId) {
        e.preventDefault()
        const centerX = window.innerWidth / 2
        const centerY = window.innerHeight / 2
        createPostIt(centerX - 100, centerY - 75)
      }

      // Create new section with Ctrl+Space (prevent double calls)
      if (e.key === ' ' && e.ctrlKey && !currentlyEditing && !editingSectionId) {
        e.preventDefault()
        e.stopPropagation()
        
        // Debounce to prevent multiple calls within 1000ms
        const now = Date.now()
        if (now - lastSectionCreateTime.current < 1000) {
          console.log('Debounced duplicate section creation call (too soon)')
          return
        }
        lastSectionCreateTime.current = now
        
        console.log('Ctrl+Space pressed, calling createSection()')
        createSection()
      }

      // Edit post-it text with 'E' key
      if ((e.key === 'e' || e.key === 'E') && !currentlyEditing && !editingSectionId && activeObject && (activeObject as any).postItId) {
        e.preventDefault()
        console.log('E key pressed, starting text edit for post-it:', (activeObject as any).postItId)
        const postItId = (activeObject as any).postItId
        
        // Debug the current board state
        console.log('Current board:', currentBoard)
        console.log('Current board post-its:', currentBoard?.postIts)
        console.log('Looking for post-it ID:', postItId)
        
        const postIt = currentBoard?.postIts.find((p: any) => p.id === postItId)
        if (postIt) {
          console.log('Found post-it, entering edit mode:', postIt)
          // Use the fabric object's current position and size (which are correctly scaled for zoomed mode)
          // but keep the store data for text and other properties
          const fabricPostIt = activeObject as any
          const postItWithCurrentPosition = {
            ...postIt,
            x: fabricPostIt.left || 0,
            y: fabricPostIt.top || 0,
            width: fabricPostIt.width || 200,
            height: fabricPostIt.height || 150
          }
          console.log('Using fabric object position:', { x: fabricPostIt.left, y: fabricPostIt.top, width: fabricPostIt.width, height: fabricPostIt.height })
          enterTextEditMode(canvas, postItWithCurrentPosition, activeObject as any)
        } else {
          console.log('Post-it not found in currentBoard')
          
          // Try to get post-it data directly from the fabric object
          const fabricPostIt = activeObject as any
          if (fabricPostIt.postItText !== undefined) {
            console.log('Using fabric object data as fallback')
            // Create a temporary post-it object from fabric data
            const tempPostIt = {
              id: postItId,
              text: fabricPostIt.postItText || 'Double-click to edit',
              x: fabricPostIt.left || 0,
              y: fabricPostIt.top || 0,
              width: fabricPostIt.width || 200,
              height: fabricPostIt.height || 150,
              color: fabricPostIt.fill || '#FFE066',
              fontSize: 14,
              sectionId: 1, // Default section
              createdAt: Date.now(),
              updatedAt: Date.now()
            }
            console.log('Created temp post-it:', tempPostIt)
            enterTextEditMode(canvas, tempPostIt, activeObject as any)
          } else {
            console.log('No fallback data available')
          }
        }
      }

      // Reassign post-it to sections with Ctrl+1-4 (keep focus)
      if (e.ctrlKey && !e.altKey && ['1', '2', '3', '4'].includes(e.key) && activeObject && (activeObject as any).postItId) {
        e.preventDefault()
        const sectionId = parseInt(e.key)
        const postItId = (activeObject as any).postItId
        
        // Store the active object reference before reassigning
        const currentActiveObject = activeObject
        
        reassignPostItToSection(postItId, sectionId)
        
        // Auto-focus the target section
        autoFocusSectionForPostIt(postItId)
        
        // Reselect the object after reassignment to maintain focus
        setTimeout(() => {
          // Find the updated object with the same postItId
          const updatedObject = canvas.getObjects().find((obj: any) => obj.postItId === postItId)
          if (updatedObject) {
            canvas.setActiveObject(updatedObject)
            canvas.renderAll()
            selectPostIt(postItId) // Ensure store state matches canvas selection
            console.log('Post-it focus restored after section reassignment:', postItId)
          } else {
            console.log('Could not find post-it to restore focus:', postItId)
          }
        }, 100) // Increase timeout to ensure canvas sync completes
      }

      // Directional focus navigation with Ctrl+Arrow keys
      if (e.ctrlKey && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && activeObject && (activeObject as any).postItId && !currentlyEditing && !editingSectionId) {
        e.preventDefault()
        
        // Get current post-it position
        const currentPos = {
          x: activeObject.left || 0,
          y: activeObject.top || 0,
          centerX: (activeObject.left || 0) + (activeObject.width || 0) / 2,
          centerY: (activeObject.top || 0) + (activeObject.height || 0) / 2
        }
        
        // Get all post-it objects except the current one
        const allPostIts = canvas.getObjects().filter((obj: any) => 
          obj.postItId && obj.postItId !== (activeObject as any).postItId
        )
        
        console.log('Directional navigation:', e.key, 'from position:', currentPos, 'checking', allPostIts.length, 'other post-its')
        
        let targetPostIt = null
        let minDistance = Infinity
        
        allPostIts.forEach((postIt: any) => {
          const targetPos = {
            x: postIt.left || 0,
            y: postIt.top || 0,
            centerX: (postIt.left || 0) + (postIt.width || 0) / 2,
            centerY: (postIt.top || 0) + (postIt.height || 0) / 2
          }
          
          let isValidDirection = false
          let distance = 0
          
          switch (e.key) {
            case 'ArrowUp':
              // Target must be above (lower Y value)
              isValidDirection = targetPos.centerY < currentPos.centerY - 20 // 20px threshold
              if (isValidDirection) {
                const verticalDistance = currentPos.centerY - targetPos.centerY
                const horizontalOffset = Math.abs(currentPos.centerX - targetPos.centerX)
                distance = verticalDistance + (horizontalOffset * 0.3)
                console.log('ArrowUp candidate:', (postIt as any).postItId, 'vertical:', verticalDistance, 'horizontal:', horizontalOffset, 'total:', distance)
              }
              break
              
            case 'ArrowDown':
              // Target must be below (higher Y value)
              isValidDirection = targetPos.centerY > currentPos.centerY + 20 // 20px threshold
              if (isValidDirection) {
                const verticalDistance = targetPos.centerY - currentPos.centerY
                const horizontalOffset = Math.abs(currentPos.centerX - targetPos.centerX)
                distance = verticalDistance + (horizontalOffset * 0.3)
                console.log('ArrowDown candidate:', (postIt as any).postItId, 'vertical:', verticalDistance, 'horizontal:', horizontalOffset, 'total:', distance)
              }
              break
              
            case 'ArrowLeft':
              // Target must be to the left (lower X value)
              isValidDirection = targetPos.centerX < currentPos.centerX - 20 // 20px threshold
              if (isValidDirection) {
                const horizontalDistance = currentPos.centerX - targetPos.centerX
                const verticalOffset = Math.abs(currentPos.centerY - targetPos.centerY)
                distance = horizontalDistance + (verticalOffset * 0.3)
                console.log('ArrowLeft candidate:', (postIt as any).postItId, 'horizontal:', horizontalDistance, 'vertical:', verticalOffset, 'total:', distance)
              }
              break
              
            case 'ArrowRight':
              // Target must be to the right (higher X value)
              isValidDirection = targetPos.centerX > currentPos.centerX + 20 // 20px threshold
              if (isValidDirection) {
                const horizontalDistance = targetPos.centerX - currentPos.centerX
                const verticalOffset = Math.abs(currentPos.centerY - targetPos.centerY)
                distance = horizontalDistance + (verticalOffset * 0.3)
                console.log('ArrowRight candidate:', (postIt as any).postItId, 'horizontal:', horizontalDistance, 'vertical:', verticalOffset, 'total:', distance, 'targetX:', targetPos.centerX, 'currentX:', currentPos.centerX)
              }
              break
          }
          
          if (isValidDirection && distance < minDistance) {
            console.log('New best candidate for', e.key, ':', (postIt as any).postItId, 'distance:', distance, 'previous best:', minDistance)
            minDistance = distance
            targetPostIt = postIt
          }
        })
        
        if (targetPostIt) {
          console.log('Found target post-it:', (targetPostIt as any).postItId, 'at distance:', minDistance)
          canvas.setActiveObject(targetPostIt)
          canvas.renderAll()
          selectPostIt((targetPostIt as any).postItId)
          autoFocusSectionForPostIt((targetPostIt as any).postItId)
        } else {
          console.log('No valid target found in direction:', e.key)
        }
      }

      // Section zoom with Shift+Up/Down
      if (e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && !currentlyEditing && !editingSectionId) {
        e.preventDefault()
        
        if (e.key === 'ArrowUp') {
          // Zoom into focused section, or section 1 if none focused
          const targetSectionId = focusedSectionId || 1
          console.log('Shift+Up: Zooming to section', targetSectionId)
          zoomToSection(targetSectionId)
        } else if (e.key === 'ArrowDown') {
          // Zoom out to show all sections
          console.log('Shift+Down: Zooming out to all sections')
          zoomOutToAllSections()
        }
      }

      // Delete sections with Ctrl+Alt+1-4
      if (e.ctrlKey && e.altKey && ['1', '2', '3', '4'].includes(e.key) && !currentlyEditing && !editingSectionId) {
        e.preventDefault()
        const sectionId = parseInt(e.key)
        deleteSection(sectionId)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      console.log('Removing keyboard event listener')
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [deletePostIt, selectPostIt, createPostIt, createSection, reassignPostItToSection, deleteSection, focusedSectionId, zoomToSection, zoomOutToAllSections, editingSectionId])

  return (
    <div className="w-full h-full">
      <canvas ref={canvasRef} className="block" />
      
      {/* Instructions overlay */}
      <div className="absolute bottom-4 left-4 bg-black/25 text-white px-3 py-2 rounded text-sm">
        <div>N: create post-it • Click section background to focus section</div>
        <div>Double-click post-it to edit text • E: edit selected post-it</div>
        <div>Double-click section title to rename</div>
        <div>Ctrl+Space: new section • Ctrl+1-4: move post-it to section</div>
        <div>Ctrl+Alt+1-4: delete section • Delete: remove selected post-it</div>
        <div>Ctrl+Arrow Keys: navigate to nearest post-it in direction</div>
        <div>Shift+Up: zoom to focused section • Shift+Down: show all sections</div>
      </div>
    </div>
  )
}

export default Canvas