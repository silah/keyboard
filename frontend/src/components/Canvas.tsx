import { useEffect, useRef, useState } from 'react'
import { fabric } from 'fabric'
import { useBoardStore } from '../store/boardStore'
import { PostIt, Section } from '../types'
import { getSectionForPosition, constrainPostItToSection } from '../utils/sectionLayout'

const Canvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null)
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
  }, [currentBoard?.postIts, currentBoard?.sections])

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
    // Create post-it background
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
      })
    })

    // Create text
    const text = new fabric.IText(postIt.text, {
      left: postIt.x + 10,
      top: postIt.y + 10,
      width: postIt.width - 20,
      fontSize: postIt.fontSize,
      fontFamily: 'Arial',
      fill: '#333',
      selectable: false
    })

    // Group them together
    const group = new fabric.Group([rect, text], {
      left: postIt.x,
      top: postIt.y,
      selectable: true,
      hasControls: true,
      hasBorders: true
    })

    // Add custom properties
    ;(group as any).postItId = postIt.id
    ;(group as any).isPostIt = true

    // Handle text editing
    group.on('mousedown', (e) => {
      if (e.e.detail === 2) { // Double click
        setIsEditing(true)
        enterTextEditMode(canvas, postIt, text)
      }
    })

    // Handle movement
    group.on('moving', () => {
      const { left, top } = group
      updatePostIt(postIt.id, { x: left || 0, y: top || 0 })
    })

    // Handle scaling
    group.on('scaling', () => {
      const { scaleX, scaleY, width, height } = group
      if (scaleX && scaleY && width && height) {
        updatePostIt(postIt.id, {
          width: width * scaleX,
          height: height * scaleY
        })
      }
    })

    canvas.add(group)
  }

  const enterTextEditMode = (canvas: fabric.Canvas, postIt: PostIt, textObj: fabric.IText) => {
    // Remove the group temporarily and add editable text
    canvas.getObjects().forEach(obj => {
      if ((obj as any).postItId === postIt.id) {
        canvas.remove(obj)
      }
    })

    const editableText = new fabric.IText(postIt.text, {
      left: postIt.x + 10,
      top: postIt.y + 10,
      width: postIt.width - 20,
      fontSize: postIt.fontSize,
      fontFamily: 'Arial',
      fill: '#333',
      selectable: true
    })

    canvas.add(editableText)
    canvas.setActiveObject(editableText)
    editableText.enterEditing()

    editableText.on('editing:exited', () => {
      updatePostIt(postIt.id, { text: editableText.text || '' })
      canvas.remove(editableText)
      createFabricPostIt(canvas, { ...postIt, text: editableText.text || '' })
      setIsEditing(false)
      canvas.renderAll()
    })
  }

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!fabricCanvasRef.current) return

      const canvas = fabricCanvasRef.current
      const activeObject = canvas.getActiveObject()

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (activeObject && (activeObject as any).postItId && !isEditing) {
          e.preventDefault()
          const postItId = (activeObject as any).postItId
          deletePostIt(postItId)
        }
      }

      if (e.key === 'Escape') {
        canvas.discardActiveObject()
        canvas.renderAll()
        selectPostIt(null)
      }

      // Create new post-it at center when 'n' is pressed
      if (e.key === 'n' && !isEditing && !editingSectionId) {
        e.preventDefault()
        const centerX = window.innerWidth / 2
        const centerY = window.innerHeight / 2
        createPostIt(centerX - 100, centerY - 75)
      }

      // Create new section with Ctrl+Space
      if (e.key === ' ' && e.ctrlKey && !isEditing && !editingSectionId) {
        e.preventDefault()
        createSection()
      }

      // Reassign post-it to sections with Ctrl+1-4
      if (e.ctrlKey && !e.altKey && ['1', '2', '3', '4'].includes(e.key) && activeObject && (activeObject as any).postItId) {
        e.preventDefault()
        const sectionId = parseInt(e.key)
        const postItId = (activeObject as any).postItId
        reassignPostItToSection(postItId, sectionId)
      }

      // Delete sections with Ctrl+Alt+1-4
      if (e.ctrlKey && e.altKey && ['1', '2', '3', '4'].includes(e.key) && !isEditing && !editingSectionId) {
        e.preventDefault()
        const sectionId = parseInt(e.key)
        deleteSection(sectionId)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [deletePostIt, selectPostIt, createPostIt, createSection, reassignPostItToSection, deleteSection, isEditing, editingSectionId])

  return (
    <div className="w-full h-full">
      <canvas ref={canvasRef} className="block" />
      
      {/* Instructions overlay */}
      <div className="absolute bottom-4 left-4 bg-black/50 text-white px-3 py-2 rounded text-sm">
        <div>Double-click on canvas to create post-it</div>
        <div>Double-click post-it to edit text</div>
        <div>Double-click section title to rename</div>
        <div>Ctrl+Space: new section • Ctrl+1-4: move post-it to section</div>
        <div>Ctrl+Alt+1-4: delete section • Delete: remove selected post-it</div>
      </div>
    </div>
  )
}

export default Canvas