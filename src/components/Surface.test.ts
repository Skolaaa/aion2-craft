/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest'
import css from '../styles.css?raw'
import { NARROW_BELOW } from '../state/useNarrow.ts'

describe('Surface', () => {
  it('turns a popover into a sheet at the width where styles.css lays out phones', () => {
    const near = [...css.matchAll(/\((min|max)-width:\s*([\d.]+)px\)/g)]
      .map(([, side, px]) => `${side} ${px}`)
      .filter((query) => Math.abs(Number(query.split(' ')[1]) - NARROW_BELOW) < 1)
    expect(new Set(near)).toEqual(new Set([`min ${NARROW_BELOW}`, `max ${NARROW_BELOW - 0.02}`]))
  })
})
