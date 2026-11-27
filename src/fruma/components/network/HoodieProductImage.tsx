const apparelConcept = '/fruma/assets/fruma-apparel-concept.jpeg'
const frumaMark = '/fruma/assets/fruma-purple-mark.jpeg'
import { cn } from '../../lib/shadcn/utils'

export default function HoodieProductImage({ className = '' }: { className?: string }) {
  return (
    <div className={cn('hoodie-product-image bg-white dark:bg-white', className)} role="img" aria-label="Product mockup of a black Fruma hoodie, front view, with a purple F on the wearer’s right chest">
      <img src={apparelConcept} alt="" className="hoodie-base-image" loading="lazy" draggable={false} />
      <span aria-hidden="true" className="hoodie-original-lockup-cover"><img src={apparelConcept} alt="" draggable={false} /></span>
      <span aria-hidden="true" className="hoodie-right-chest-mark"><img src={frumaMark} alt="" draggable={false} /></span>
    </div>
  )
}
