import type { Catalog } from '../domain/types.ts'
import type { Listed, World } from '../market/worlds.ts'
import { itemName } from '../state/craftables.ts'
import { settingKey, type OpenSetting, type Setting } from '../state/openSetting.ts'
import type { Planning } from '../state/planning.ts'
import type { Setup, SetupPatch } from '../state/setup.ts'
import type { PriceOverrides } from '../state/useOverrides.ts'
import type { OwnedStock } from '../state/useOwned.ts'
import type { Sources } from '../state/useSources.ts'
import type { WorldsState } from '../state/useWorlds.ts'
import { Button } from './Button.tsx'
import { MasteryStats, TaxStat } from './MasteryStats.tsx'
import { WorldsFailed } from './Notice.tsx'
import { PlanSettings } from './PlanSettings.tsx'
import { PriceChart } from './PriceChart.tsx'
import { Surface, type Placement } from './Surface.tsx'
import { WorldPicker } from './WorldPicker.tsx'

interface Props {
  surface: OpenSetting
  worlds: WorldsState
  retryWorlds(): void
  current: Listed
  setup: Setup
  patch(change: SetupPatch): void
  chooseWorld(world: World): void
  planning: Planning
  overrides: PriceOverrides
  owned: OwnedStock
  sources: Sources
}

const FRAME: Record<Setting['kind'], { placement: Placement; width: number }> = {
  world: { placement: 'popover', width: 440 },
  settings: { placement: 'drawer', width: 440 },
  history: { placement: 'popover', width: 560 },
}

const TITLE: Record<Exclude<Setting['kind'], 'history'>, string> = { world: 'World', settings: 'Settings' }
const FIRST_VISIT_TITLE = 'Which world do you play on?'

const titleOf = (setting: Setting, catalog: Catalog) =>
  setting.kind === 'history' ? itemName(catalog, setting.itemId)
  : setting.kind === 'world' && setting.from === 'first' ? FIRST_VISIT_TITLE
  : TITLE[setting.kind]

export function SettingHost({ surface, worlds, retryWorlds, current, setup, patch, chooseWorld, planning, overrides, owned, sources }: Props) {
  const { opened, close } = surface
  if (opened === null) return null
  const { setting, anchor } = opened

  const body = () => {
    switch (setting.kind) {
      case 'world':
        if (worlds.status === 'ready') {
          return (
            <WorldPicker
              directory={worlds.directory}
              current={current}
              recent={setup.recent}
              from={setting.from}
              onChoose={(world) => {
                chooseWorld(world)
                close()
              }}
            />
          )
        }
        return worlds.status === 'failed' ? (
          <WorldsFailed message={worlds.message} onRetry={retryWorlds}>
            You can keep working on {current.world.name}, the world you used last.
          </WorldsFailed>
        ) : (
          <p className="meta" role="status">Loading the world list from aion2.exchange.</p>
        )
      case 'settings':
        return (
          <>
            <MasteryStats mastery={setup.mastery} patch={patch} />
            <TaxStat taxRate={setup.taxRate} patch={patch} />
            <PlanSettings setup={setup} patch={patch} planning={planning} overrides={overrides} owned={owned} sources={sources} />
          </>
        )
      case 'history':
        return <PriceChart itemId={setting.itemId} worldId={planning.world.id} />
      default: {
        const unknown: never = setting
        return unknown
      }
    }
  }

  return (
    <Surface
      key={settingKey(setting)}
      anchor={anchor}
      {...FRAME[setting.kind]}
      title={titleOf(setting, planning.catalog)}
      flush={setting.kind === 'world' && worlds.status === 'ready'}
      footer={setting.kind === 'settings' ? <Button variant="primary" onClick={() => close()}>Done</Button> : undefined}
      onClose={close}
    >
      {body()}
    </Surface>
  )
}
