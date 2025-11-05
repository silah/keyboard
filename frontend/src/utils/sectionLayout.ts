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