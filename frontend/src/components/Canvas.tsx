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
    createPostIt, 
    updatePostIt, 
    deletePostIt, 
    selectPostIt,
    createSection,
    updateSectionName,
    selectSection,
    reassignPostItToSection,
    deleteSection,
    updateCanvasSize
  } = useBoardStore()
  const [isEditing, setIsEditing] = useState(false)
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
      if (!e.target && !isEditing) {
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
  }, [createPostIt, selectPostIt, isEditing])

  // Sync sections and post-its from store to canvas
  useEffect(() => {
    if (!fabricCanvasRef.current || !currentBoard) return

    // Don't clear canvas during text editing
    if (isEditing) {
      console.log('Skipping canvas sync during text editing')
      return
    }

    const canvas = fabricCanvasRef.current
    canvas.clear()

    // Render sections first
    currentBoard.sections.forEach((section: any) => {
      createFabricSection(canvas, section)
    })

    // Then render post-its
    currentBoard.postIts.forEach((postIt: any) => {
      createFabricPostIt(canvas, postIt)
    })

    canvas.renderAll()
  }, [currentBoard?.postIts, currentBoard?.sections, isEditing])

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

  const createFabricSection = (canvas: fabric.Canvas, section: any) => {
    // Create section boundary
    const sectionBorder = new fabric.Rect({
      left: section.x,
      top: section.y,
      width: section.width,
      height: section.height,
      fill: 'transparent',
      stroke: '#ddd',
      strokeWidth: 2,
      strokeDashArray: [5, 5],
      selectable: false,
      evented: false
    })

    // Create section title
    const sectionTitle = new fabric.IText(section.name, {
      left: section.x + 10,
      top: section.y + 5,
      fontSize: 14,
      fontFamily: 'Arial',
      fill: '#666',
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
    setIsEditing(true)
    
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
              // Get fresh canvas reference
              const currentCanvas = fabricCanvasRef.current
              console.log('Current canvas reference:', currentCanvas)
              console.log('Canvas element:', currentCanvas?.getElement())
              console.log('Canvas context:', currentCanvas?.getContext())
              
              if (!currentCanvas || !currentCanvas.getElement() || !currentCanvas.getContext()) {
                console.error('Canvas is invalid, attempting to reinitialize')
                
                // Try to reinitialize canvas
                if (canvasRef.current && fabricCanvasRef.current) {
                  const newCanvas = new fabric.Canvas(canvasRef.current, {
                    width: window.innerWidth,
                    height: window.innerHeight,
                    backgroundColor: '#f5f5f5',
                    selection: true
                  })
                  fabricCanvasRef.current = newCanvas
                  console.log('Canvas reinitialized')
                }
                
                setIsEditing(false)
                return
              }
              
              createFabricPostIt(currentCanvas, { ...postIt, text: updatedText })
              setIsEditing(false)
              
              // Use requestAnimationFrame to ensure proper timing
              requestAnimationFrame(() => {
                try {
                  currentCanvas.renderAll()
                  console.log('Text edit completed successfully')
                } catch (renderError) {
                  console.error('Error during canvas render:', renderError)
                }
              })
            } catch (error) {
              console.error('Error recreating post-it after text edit:', error)
              setIsEditing(false)
            }
          }, 50)
        } catch (error) {
          console.error('Error completing text edit:', error)
          setIsEditing(false)
        }
      }
      
    } catch (error) {
      console.error('Error in enterTextEditMode:', error)
      setIsEditing(false)
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
          enterTextEditMode(canvas, postIt, activeObject as any)
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
        
        // Reselect the object after reassignment to maintain focus
        setTimeout(() => {
          // Find the updated object with the same postItId
          const updatedObject = canvas.getObjects().find((obj: any) => obj.postItId === postItId)
          if (updatedObject) {
            canvas.setActiveObject(updatedObject)
            canvas.renderAll()
          }
        }, 50)
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
  }, [deletePostIt, selectPostIt, createPostIt, createSection, reassignPostItToSection, deleteSection, editingSectionId])

  return (
    <div className="w-full h-full">
      <canvas ref={canvasRef} className="block" />
      
      {/* Instructions overlay */}
      <div className="absolute bottom-4 left-4 bg-black/50 text-white px-3 py-2 rounded text-sm">
        <div>Double-click on canvas to create post-it</div>
        <div>Double-click post-it to edit text • E: edit selected post-it</div>
        <div>Double-click section title to rename</div>
        <div>Ctrl+Space: new section • Ctrl+1-4: move post-it to section</div>
        <div>Ctrl+Alt+1-4: delete section • Delete: remove selected post-it</div>
      </div>
    </div>
  )
}

export default Canvas