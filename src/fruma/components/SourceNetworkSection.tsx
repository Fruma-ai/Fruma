import { useState } from 'react'
import { ArrowDownRight, ArrowUpRight, Info } from 'lucide-react'
import useNetworkPlayback from '../hooks/useNetworkPlayback'
import { Button } from '../lib/shadcn/button'
import { Eyebrow } from './Brand'
import NetworkGraph from './network/NetworkGraph'
import NetworkOutcome from './network/NetworkOutcome'
import { networkNodes, networkStages } from './network/networkData'

export default function SourceNetworkSection() {
  const playback = useNetworkPlayback()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const currentStage = networkStages[playback.stage] ?? networkStages[0]!
  const selectedNode = networkNodes.find(node => node.id === selectedId)

  return (
    <section
      id="source-network"
      ref={playback.containerRef}
      className="source-network brand-surface brand-divider scroll-mt-24 border-t py-16 sm:py-20"
      data-stage={playback.stage}
      data-running={playback.running}
      aria-labelledby="source-network-heading"
    >
      <div className="site-container">
        <div className="mb-9 grid gap-5 md:grid-cols-[1.1fr_0.9fr] md:items-end md:gap-14">
          <div><Eyebrow className="brand-highlight mb-4">The people behind the finished product</Eyebrow><h2 id="source-network-heading" className="section-heading">Good products start<br /><span className="brand-highlight">with the right partners.</span></h2></div>
          <p className="brand-muted max-w-sm text-sm leading-7 md:ml-auto">Finding a factory is the starting point. Materials, processes and people make up the wider picture. This illustration explores those connections, with product passports shown as a later-phase concept.</p>
        </div>
        <div className="network-canvas">
          <div className="brand-divider flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b px-3 py-4 sm:px-6">
            <div className="flex flex-wrap gap-1" role="group" aria-label="Stages of the illustrative journey">
              {networkStages.map((stage, index) => (
                <span
                  key={stage.label}
                  className="network-stage-button"
                  aria-current={playback.stage === index ? 'step' : undefined}
                  data-active={playback.stage === index ? 'true' : 'false'}
                >
                  <span className="opacity-50">0{index + 1}</span>
                  {stage.label}
                </span>
              ))}
            </div>
            {playback.reducedMotion ? <span className="brand-muted px-3 text-[10px]">Reduced-motion view</span> : null}
          </div>
          <div className="grid items-center gap-0 px-2 py-6 sm:px-6 sm:py-8 lg:grid-cols-[1.8fr_1fr]">
            <NetworkGraph stage={playback.stage} selectedId={selectedId} onSelect={setSelectedId} />
            <div className="brand-highlight -mt-4 flex justify-center pb-4 lg:hidden" aria-hidden="true"><ArrowDownRight className="h-6 w-6" /></div>
            <NetworkOutcome revealed={playback.stage === 3} onInspect={() => undefined} />
          </div>
          <div id="network-connection-detail" className="brand-divider grid min-h-[122px] items-center gap-4 border-t bg-primary/5 px-6 py-5 md:grid-cols-[1fr_auto] sm:px-8">
            <div><p className="mb-2 text-sm font-medium">{selectedNode ? selectedNode.label : currentStage.title}</p><p className="brand-muted max-w-2xl text-xs leading-6">{selectedNode ? selectedNode.detail : currentStage.detail}</p></div>
            <Button asChild variant="link" className="brand-highlight h-auto justify-start gap-2 p-0 text-[11px]"><a href="#platform">Explore factory discovery<ArrowUpRight className="h-3.5 w-3.5" /></a></Button>
          </div>
        </div>
        <p className="brand-muted mt-5 flex items-start gap-2 text-[10px] leading-5"><Info className="mt-1 h-3 w-3 shrink-0" /><span>Illustrative journey, not live traceability. Suppliers, routes and records are examples; lighting up a connection does not verify it. Garment visual adapted from supplied Fruma brand artwork. No live passport is issued.</span></p>
      </div>
    </section>
  )
}
