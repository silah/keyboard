import { Section } from '../types'

export const calculateSectionLayout = (sectionCount: number, canvasWidth: number, canvasHeight: number): Section[] => {
  const sections: Section[] = []
  
  switch (sectionCount) {
    case 1:
      sections.push({
        id: 1,
        name: 'Section 1',
        x: 0,
        y: 0,
        width: canvasWidth,
        height: canvasHeight
      })
      break
      
    case 2:
      sections.push(
        {
          id: 1,
          name: 'Section 1',
          x: 0,
          y: 0,
          width: canvasWidth / 2,
          height: canvasHeight
        },
        {
          id: 2,
          name: 'Section 2',
          x: canvasWidth / 2,
          y: 0,
          width: canvasWidth / 2,
          height: canvasHeight
        }
      )
      break
      
    case 3:
      sections.push(
        {
          id: 1,
          name: 'Section 1',
          x: 0,
          y: 0,
          width: canvasWidth / 3,
          height: canvasHeight
        },
        {
          id: 2,
          name: 'Section 2',
          x: canvasWidth / 3,
          y: 0,
          width: canvasWidth / 3,
          height: canvasHeight
        },
        {
          id: 3,
          name: 'Section 3',
          x: (canvasWidth / 3) * 2,
          y: 0,
          width: canvasWidth / 3,
          height: canvasHeight
        }
      )
      break
      
    case 4:
      sections.push(
        {
          id: 1,
          name: 'Section 1',
          x: 0,
          y: 0,
          width: canvasWidth / 2,
          height: canvasHeight / 2
        },
        {
          id: 2,
          name: 'Section 2',
          x: canvasWidth / 2,
          y: 0,
          width: canvasWidth / 2,
          height: canvasHeight / 2
        },
        {
          id: 3,
          name: 'Section 3',
          x: 0,
          y: canvasHeight / 2,
          width: canvasWidth / 2,
          height: canvasHeight / 2
        },
        {
          id: 4,
          name: 'Section 4',
          x: canvasWidth / 2,
          y: canvasHeight / 2,
          width: canvasWidth / 2,
          height: canvasHeight / 2
        }
      )
      break
      
    default:
      // Default to single section for more than 4
      sections.push({
        id: 1,
        name: 'Section 1',
        x: 0,
        y: 0,
        width: canvasWidth,
        height: canvasHeight
      })
  }
  
  return sections
}

export const getSectionForPosition = (sections: Section[], x: number, y: number): Section | null => {
  return sections.find(section => 
    x >= section.x && 
    x < section.x + section.width && 
    y >= section.y && 
    y < section.y + section.height
  ) || null
}

export const constrainPostItToSection = (postIt: { x: number, y: number, width: number, height: number }, section: Section) => {
  return {
    x: Math.max(section.x + 10, Math.min(postIt.x, section.x + section.width - postIt.width - 10)),
    y: Math.max(section.y + 40, Math.min(postIt.y, section.y + section.height - postIt.height - 10))
  }
}

export const repositionPostItForNewSection = (
  postIt: { x: number, y: number, width: number, height: number, sectionId: number },
  oldSection: Section,
  newSection: Section
) => {
  // Calculate relative position within the old section (0-1 range)
  const relativeX = (postIt.x - oldSection.x - 10) / (oldSection.width - 20) // Account for 10px padding
  const relativeY = (postIt.y - oldSection.y - 40) / (oldSection.height - 50) // Account for 40px top, 10px bottom padding
  
  // Apply relative position to new section dimensions
  const newX = newSection.x + 10 + (relativeX * (newSection.width - 20))
  const newY = newSection.y + 40 + (relativeY * (newSection.height - 50))
  
  // Constrain to new section bounds
  return constrainPostItToSection({ 
    ...postIt, 
    x: newX, 
    y: newY 
  }, newSection)
}

// Check if two rectangles overlap
export const doPostItsOverlap = (
  postIt1: { x: number, y: number, width: number, height: number },
  postIt2: { x: number, y: number, width: number, height: number }
): boolean => {
  return !(
    postIt1.x + postIt1.width <= postIt2.x ||   // postIt1 is to the left of postIt2
    postIt2.x + postIt2.width <= postIt1.x ||   // postIt2 is to the left of postIt1
    postIt1.y + postIt1.height <= postIt2.y ||  // postIt1 is above postIt2
    postIt2.y + postIt2.height <= postIt1.y     // postIt2 is above postIt1
  )
}

// Find a non-overlapping position for a post-it within a section
export const findNonOverlappingPosition = (
  postIt: { x: number, y: number, width: number, height: number },
  section: Section,
  existingPostIts: { x: number, y: number, width: number, height: number }[]
): { x: number, y: number } => {
  const padding = 10
  const sectionPadding = { top: 40, left: 10, right: 10, bottom: 10 }
  
  // Define the area within the section where post-its can be placed
  const placementArea = {
    x: section.x + sectionPadding.left,
    y: section.y + sectionPadding.top,
    width: section.width - sectionPadding.left - sectionPadding.right,
    height: section.height - sectionPadding.top - sectionPadding.bottom
  }
  
  // Try to place the post-it in a grid pattern
  const step = 20 // Grid step size
  
  for (let y = placementArea.y; y <= placementArea.y + placementArea.height - postIt.height; y += step) {
    for (let x = placementArea.x; x <= placementArea.x + placementArea.width - postIt.width; x += step) {
      const testPosition = { x, y, width: postIt.width, height: postIt.height }
      
      // Check if this position overlaps with any existing post-it
      const hasOverlap = existingPostIts.some(existing => 
        doPostItsOverlap(testPosition, existing)
      )
      
      if (!hasOverlap) {
        return { x, y }
      }
    }
  }
  
  // If no non-overlapping position found, use constrained position (overlapping is allowed)
  const constrainedPos = constrainPostItToSection(postIt, section)
  return { x: constrainedPos.x, y: constrainedPos.y }
}