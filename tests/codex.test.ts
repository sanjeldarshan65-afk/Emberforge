/* ================================================================
   THE DEEP CODEX — coverage tests. Every rite in the catalog must
   yield 2-3 faults, a valid implement, and a valid rank; pattern
   collisions (a fly getting bench counsel) are pinned here.
   Run: npm test
   ================================================================ */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { riteDetails } from '../src/state/loreCodex.ts'
import { EXERCISES } from '../src/state/exercises.ts'

const EQUIPMENT = ['Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight']
const TIERS = ['Novice', 'Adept', 'Master']

test('every rite in the catalog gets faults, an implement, and a rank', () => {
  for (const e of EXERCISES) {
    const d = riteDetails(e)
    assert.ok(d.faults.length >= 2 && d.faults.length <= 3, `${e.name}: ${d.faults.length} faults`)
    assert.ok(EQUIPMENT.includes(d.equipment), `${e.name}: equipment ${d.equipment}`)
    assert.ok(TIERS.includes(d.tier), `${e.name}: tier ${d.tier}`)
    for (const f of d.faults) assert.ok(f.length > 30, `${e.name}: fault too thin`)
  }
})

test('the great barbell rites rank Master; machine and cable work ranks Novice', () => {
  assert.equal(riteDetails({ name: 'Squat' }).tier, 'Master')
  assert.equal(riteDetails({ name: 'Deadlift' }).tier, 'Master')
  assert.equal(riteDetails({ name: 'Overhead Press' }).tier, 'Master')
  assert.equal(riteDetails({ name: 'Lat Pulldown' }).tier, 'Novice')
  assert.equal(riteDetails({ name: 'Machine Chest Press' }).tier, 'Novice')
  assert.equal(riteDetails({ name: 'Pull-Up' }).tier, 'Adept')
})

test('implements are read from the name', () => {
  assert.equal(riteDetails({ name: 'Squat' }).equipment, 'Barbell')
  assert.equal(riteDetails({ name: 'Dumbbell Bench Press' }).equipment, 'Dumbbell')
  assert.equal(riteDetails({ name: 'Cable Fly' }).equipment, 'Cable')
  assert.equal(riteDetails({ name: 'Leg Press' }).equipment, 'Machine')
  assert.equal(riteDetails({ name: 'Push-Up' }).equipment, 'Bodyweight')
})

test('pattern collisions stay resolved', () => {
  /* a rear-delt fly is a pull, not a press */
  const rearDelt = riteDetails({ name: 'Rear Delt Fly' }).faults.join(' ')
  assert.match(rearDelt, /blades|shrug/i)
  assert.doesNotMatch(rearDelt, /chest/i)
  /* machine leg work gets machine counsel, not barbell counsel */
  const legCurl = riteDetails({ name: 'Leg Curl' }).faults.join(' ')
  assert.match(legCurl, /stack/i)
  /* a cable fly presses; a leg extension does not ask for parallel depth */
  assert.match(riteDetails({ name: 'Cable Fly' }).faults.join(' '), /elbows/i)
  assert.doesNotMatch(riteDetails({ name: 'Leg Extension' }).faults.join(' '), /parallel/i)
})
