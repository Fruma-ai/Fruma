import { Droplets, Factory, Layers3, Leaf, Scissors, Waves } from 'lucide-react'

export const networkStages = [
  { label: 'Trace back', title: 'Start with a product. Look behind it.', detail: 'Follow the declared connections upstream, from the factory towards the materials and processes behind a garment.' },
  { label: 'Find the source', title: 'Every thread has a starting point.', detail: 'Fibre, processing inputs and trims each have a place in the story. A connection is a starting point for evidence—not verification in itself.' },
  { label: 'Connect the records', title: 'Bring the product story together.', detail: 'The network lights up to illustrate records coming together around a product, with missing and unverified information still needing review.' },
  { label: 'Product + passport', title: 'One finished product. Its supporting story.', detail: 'A finished garment sits alongside a passport concept: product facts, supporting records and the gaps that must not be hidden.' },
]

export const networkNodes = [
  { id: 'fibre', x: 9, y: 17, label: 'Fibre source', icon: Leaf, detail: 'Example source connection: declared fibre origin and composition, supported by material records where available. Not a verified supplier.' },
  { id: 'inputs', x: 9, y: 50, label: 'Dyes & inputs', icon: Droplets, detail: 'Example processing connection: dye and finishing inputs may have supporting technical documents or test reports. A link does not establish chemical compliance.' },
  { id: 'trims', x: 9, y: 83, label: 'Trims supplier', icon: Scissors, detail: 'Example component connection: labels, thread and other trims are part of a garment’s story too. This is an illustrative supplier, not a live record.' },
  { id: 'mill', x: 40, y: 28, label: 'Fabric mill', icon: Layers3, detail: 'Example material connection: fabric construction, composition, weight and handfeel can help describe what a mill makes. Supporting evidence still needs review.' },
  { id: 'finish', x: 40, y: 73, label: 'Dyeing & finishing', icon: Waves, detail: 'Example process connection: finishing details and technical records add context to the material. Missing reports stay missing.' },
  { id: 'factory', x: 73, y: 50, label: 'Garment factory', icon: Factory, detail: 'Example manufacturing connection: assembly capability and product specifications meet at the factory. This illustration does not establish a real chain of custody.' },
]

export type NetworkNode = (typeof networkNodes)[number]

export const networkEdges = [
  { id: 'fibre-mill', kind: 'source', points: [{ x: 9, y: 17 }, { x: 20, y: 17 }, { x: 29, y: 27 }, { x: 40, y: 28 }] },
  { id: 'inputs-finish', kind: 'source', points: [{ x: 9, y: 50 }, { x: 20, y: 50 }, { x: 29, y: 72 }, { x: 40, y: 73 }] },
  { id: 'trims-factory', kind: 'source', points: [{ x: 9, y: 83 }, { x: 31, y: 88 }, { x: 57, y: 81 }, { x: 73, y: 50 }] },
  { id: 'mill-factory', kind: 'assembly', points: [{ x: 40, y: 28 }, { x: 51, y: 28 }, { x: 62, y: 49 }, { x: 73, y: 50 }] },
  { id: 'finish-factory', kind: 'assembly', points: [{ x: 40, y: 73 }, { x: 51, y: 73 }, { x: 62, y: 51 }, { x: 73, y: 50 }] },
  { id: 'factory-product', kind: 'output', points: [{ x: 73, y: 50 }, { x: 82, y: 50 }, { x: 90, y: 50 }, { x: 100, y: 50 }] },
]
