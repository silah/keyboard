export interface PostIt {
  id: string
  x: number
  y: number
  width: number
  height: number
  text: string
  color: string
  fontSize: number
  sectionId: number
  createdAt: number
  updatedAt: number
}

export interface Section {
  id: number
  name: string
  x: number
  y: number
  width: number
  height: number
}

export interface Board {
  id: string
  name: string
  postIts: PostIt[]
  sections: Section[]
  createdAt: number
  updatedAt: number
}

export interface CanvasState {
  zoom: number
  panX: number
  panY: number
  selectedPostItId: string | null
  selectedSectionId: number | null
}