import { Fragment } from 'react'
import { ComposedChart, Line, ResponsiveContainer, Scatter, XAxis, YAxis } from 'recharts'
import { Button } from '../../lib/shadcn/button'
import { cn } from '../../lib/shadcn/utils'
import { networkEdges, networkNodes, type NetworkNode } from './networkData'

type NetworkGraphProps = {
  stage: number
  selectedId: string | null
  onSelect: (id: string) => void
}

type ScatterGeometry = { cx?: number; cy?: number; payload?: NetworkNode }

function NetworkNodeGlyph({ node, cx, cy, illuminated, selected, onSelect }: {
  node: NetworkNode
  cx: number
  cy: number
  illuminated: boolean
  selected: boolean
  onSelect: (id: string) => void
}) {
  return (
    <foreignObject x={cx - 53} y={cy - 25} width={106} height={77} overflow="visible">
      <div className="network-node-container">
        <Button
          variant="ghost"
          className={cn('network-node', illuminated && 'network-node--lit', selected && 'network-node--selected')}
          onClick={() => onSelect(node.id)}
          aria-pressed={selected}
          aria-label={`${node.label}: inspect example connection`}
          aria-controls="network-connection-detail"
        >
          <span className="network-node-orbit"><node.icon aria-hidden="true" /></span>
          <span className="network-node-label">{node.label}</span>
        </Button>
      </div>
    </foreignObject>
  )
}

export default function NetworkGraph({ stage, selectedId, onSelect }: NetworkGraphProps) {
  return (
    <div className="network-graph" role="group" aria-label="Illustrative source network. Select a source or manufacturing node to inspect its role.">
      <div className="brand-muted flex justify-between px-3 text-[8px] uppercase tracking-[0.18em] sm:px-9"><span>Source & inputs</span><span>Materials & processes</span><span>Assembly</span></div>
      <div className="h-[340px] min-w-0 sm:h-[380px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <ComposedChart margin={{ top: 15, right: 0, bottom: 34, left: 12 }} accessibilityLayer={false}>
            <XAxis type="number" dataKey="x" domain={[0, 100]} hide allowDataOverflow />
            <YAxis type="number" dataKey="y" domain={[0, 100]} reversed hide allowDataOverflow />
            {networkEdges.map(edge => {
              const illuminated = stage >= 2 || (stage === 0 && edge.kind !== 'source') || (stage === 1 && edge.kind !== 'output')
              return (
                <Fragment key={edge.id}>
                  <Line data={edge.points} dataKey="y" type="monotone" stroke="hsl(var(--chart-2))" strokeWidth={1.6} dot={false} activeDot={false} isAnimationActive={false} legendType="none" />
                  <Line className={cn('network-flow', illuminated ? 'network-flow--lit' : 'network-flow--dim')} data={edge.points} dataKey="y" type="monotone" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} activeDot={false} isAnimationActive={false} legendType="none" />
                </Fragment>
              )
            })}
            <Scatter
              data={networkNodes}
              isAnimationActive={false}
              legendType="none"
              shape={(geometry: unknown) => {
                const { cx, cy, payload } = geometry as ScatterGeometry
                if (typeof cx !== 'number' || typeof cy !== 'number' || !payload) return <g />
                const illuminated = stage >= 2 || (stage === 0 && payload.id === 'factory') || (stage === 1 && payload.id !== 'factory')
                return <NetworkNodeGlyph node={payload} cx={cx} cy={cy} illuminated={illuminated} selected={selectedId === payload.id} onSelect={onSelect} />
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="sr-only">Illustrative connections run from a fibre source to a fabric mill, from dyes and inputs to finishing, and from trims to a garment factory. Material and process records converge at the factory, then connect to a finished garment and passport concept. These are not real suppliers or verified supply-chain links.</p>
    </div>
  )
}
