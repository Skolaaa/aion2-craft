import type { Listed, World } from '../market/worlds.ts'
import { settingKey, type OpenSetting, type Setting } from '../state/openSetting.ts'
import type { Planning } from '../state/planning.ts'
import type { Setup, SetupPatch } from '../state/setup.ts'
import type { PriceOverrides } from '../state/useOverrides.ts'
import type { WorldsState } from '../state/useWorlds.ts'
import { Button } from './Button.tsx'
import { Glyph } from './Glyph.tsx'
import { MasteryForm } from './MasteryForm.tsx'
import { Notice } from './Notice.tsx'
import { PlanSettings } from './PlanSettings.tsx'
import { Surface, type Placement } from './Surface.tsx'
import { TaxForm } from './TaxForm.tsx'
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
}

const FRAME: Record<Setting['kind'], { title: string; placement: Placement; width?: number }> = {
  world: { title: 'World', placement: 'popover', width: 440 },
  mastery: { title: 'Mastery', placement: 'popover', width: 360 },
  tax: { title: 'Market tax', placement: 'popover', width: 320 },
  plan: { title: 'Settings', placement: 'drawer' },
}

export function SettingHost({ surface, worlds, retryWorlds, current, setup, patch, chooseWorld, planning, overrides }: Props) {
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
          <Notice
            title="The world list did not load"
            detail={worlds.message}
            action={<Button onClick={retryWorlds}><Glyph name="refresh" />Try again</Button>}
          >
            You can keep working on {current.world.name}, the world you used last.
          </Notice>
        ) : (
          <p className="meta" role="status">Loading the world list from aion2.exchange.</p>
        )
      case 'mastery':
        return <MasteryForm mastery={setup.mastery} patch={patch} />
      case 'tax':
        return <TaxForm taxRate={setup.taxRate} patch={patch} />
      case 'plan':
        return <PlanSettings setup={setup} patch={patch} planning={planning} overrides={overrides} />
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
      flush={setting.kind === 'world' && worlds.status === 'ready'}
      footer={setting.kind === 'plan' ? <Button variant="primary" onClick={() => close()}>Done</Button> : undefined}
      onClose={close}
    >
      {body()}
    </Surface>
  )
}
