import classnames from 'classnames'
import { useState } from 'react'

import { turtleFilter, turtleTransform } from '../../constants/filter'
import { REVEAL_TIME_MS } from '../../constants/settings'
import {
  letterToFrameIdx,
  letterToTurdleId,
} from '../../constants/validGuesses'
import { CharStatus } from '../../lib/statuses'
import { Hint } from '../common/Hint'

type Props = {
  value?: string
  status?: CharStatus
  extraVision?: boolean
  isRevealing?: boolean
  isMemeMode?: boolean
  isHighContrast?: boolean
  isCompleted?: boolean
  position?: number
}

export const Cell = ({
  value,
  status,
  extraVision,
  isRevealing,
  isMemeMode,
  isHighContrast,
  isCompleted,
  position = 0,
}: Props) => {
  const isFilled = value && !isCompleted
  const shouldReveal = isRevealing && isCompleted
  const animationDelay = `${position * REVEAL_TIME_MS}ms`

  const divClasses = classnames(
    'xxshort:w-11 xxshort:h-11 short:text-2xl short:w-12 short:h-12 w-14 h-14 border-solid border-2 flex relative items-center justify-center mx-0.5 text-4xl font-bold rounded dark:text-white',
    {
      'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600':
        !status,
      'border-black dark:border-slate-100': value && !status,
      'absent shadowed bg-slate-400 dark:bg-slate-700 text-white border-slate-400 dark:border-slate-700':
        status === 'absent',
      'correct shadowed bg-orange-500 text-white border-orange-500':
        status === 'correct' && isHighContrast,
      'present shadowed bg-cyan-500 text-white border-cyan-500':
        status === 'present' && isHighContrast,
      'correct shadowed bg-green-500 text-white border-green-500':
        status === 'correct' && !isHighContrast,
      'present shadowed bg-yellow-500 text-white border-yellow-500':
        status === 'present' && !isHighContrast,
      'cell-fill-animation': isFilled,
      'cell-reveal': shouldReveal,
    }
  )

  const imgClasses = classnames('letter-container', 'select-none', {
    hidden: !value,
  })

  const imgStyles = {
    filter: turtleFilter({ value, isMemeMode, isHighContrast }),
    transform: turtleTransform(value),
    animationDelay,
  } as React.CSSProperties

  const [isHovered, setIsHovered] = useState(false)
  const handleMouseEnter = () => {
    setIsHovered(true)
  }
  const handleMouseLeave = () => {
    setIsHovered(false)
  }
  const filePrefix = isMemeMode ? 'turd' : 'turtle'

  return (
    <div
      className={divClasses}
      style={{ animationDelay }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <img
        src={'res/img/' + filePrefix + '_' + letterToFrameIdx(value) + '.png'}
        className={imgClasses}
        style={imgStyles}
        alt={letterToTurdleId(value)}
      />
      <Hint value={value} visible={extraVision} hovered={isHovered} />
    </div>
  )
}
