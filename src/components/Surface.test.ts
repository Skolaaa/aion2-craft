/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest'
import css from '../styles.css?raw'
import { SHEET_BELOW } from './Surface.tsx'

describe('Surface', () => {
  it('turns a popover into a sheet at the width where styles.css lays out phones', () => {
    const near = [...css.matchAll(/\((min|max)-width:\s*([\d.]+)px\)/g)]
      .map(([, side, px]) => `${side} ${px}`)
      .filter((query) => Math.abs(Number(query.split(' ')[1]) - SHEET_BELOW) < 1)
    expect(new Set(near)).toEqual(new Set([`min ${SHEET_BELOW}`, `max ${SHEET_BELOW - 0.02}`]))
  })
})
