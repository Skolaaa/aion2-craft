import type { Listed, World } from '../market/worlds.ts'
import { settingKey, type OpenSetting } from '../state/openSetting.ts'
import type { Planning } from '../state/planning.ts'
import type { Setup, SetupPatch } from '../state/setup.ts'
import type { PriceOverrides } from '../state/useOverrides.ts'
import type { WorldsState } from '../state/useWorlds.ts'
import { Button } from './Button.tsx'
import { Glyph } from './Glyph.tsx'
import { MasteryForm } from './MasteryForm.tsx'
import { Notice } from './Notice.tsx'
import { PlanSettings } from './PlanSettings.tsx'
import { Surface } from './Surface.tsx'
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

export function SettingHost({ surface, worlds, retryWorlds, current, setup, patch, chooseWorld, planning, overrides }: Props) {
  const { opened, close } = surface
  if (opened === null) return null
  const { setting, anchor } = opened
  const key = settingKey(setting)

  switch (setting.kind) {
    case 'world':
      return (
        <Surface key={key} anchor={anchor} placement="popover" width={440} title="World" flush={worlds.status === 'ready'} onClose={close}>
          {worlds.status === 'ready' ? (
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
          ) : worlds.status === 'failed' ? (
            <Notice
              title="The world list did not load"
              detail={worlds.message}
              action={<Button onClick={retryWorlds}><Glyph name="refresh" />Try again</Button>}
            >
              You can keep working on {current.world.name}, the world you used last.
            </Notice>
          ) : (
            <p className="meta" role="status">Loading the world list from aion2.exchange.</p>
          )}
        </Surface>
      )
    case 'mastery':
      return (
        <Surface key={key} anchor={anchor} placement="popover" width={360} title="Mastery" onClose={close}>
          <MasteryForm mastery={setup.mastery} patch={patch} />
        </Surface>
      )
    case 'tax':
      return (
        <Surface key={key} anchor={anchor} placement="popover" width={320} title="Market tax" onClose={close}>
          <TaxForm taxRate={setup.taxRate} patch={patch} />
        </Surface>
      )
    case 'plan':
      return (
        <Surface
          key={key}
          anchor={anchor}
          placement="drawer"
          title="Settings"
          onClose={close}
          footer={<Button variant="primary" onClick={() => close()}>Done</Button>}
        >
          <PlanSettings setup={setup} patch={patch} planning={planning} overrides={overrides} />
        </Surface>
      )
    default: {
      const unknown: never = setting
      return unknown
    }
  }
}
