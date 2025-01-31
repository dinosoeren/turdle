import './App.css'
import 'react-toastify/dist/ReactToastify.css'

import { ClockIcon } from '@heroicons/react/outline'
import { useCookieConsentContext } from '@use-cookie-consent/react'
import { format } from 'date-fns'
import { default as GraphemeSplitter } from 'grapheme-splitter'
import { useEffect, useReducer, useState } from 'react'
import Div100vh from 'react-div-100vh'
import { FaDiscord } from 'react-icons/fa'
import { HiOutlineDownload } from 'react-icons/hi'
import { ToastContainer } from 'react-toastify'

import { AlertContainer } from './components/alerts/AlertContainer'
import { openCookieToast } from './components/common/CookieToast'
import { Grid } from './components/grid/Grid'
import { Keyboard } from './components/keyboard/Keyboard'
import { AboutModal } from './components/modals/AboutModal'
import { CookieModal } from './components/modals/CookieModal'
import { DatePickerModal } from './components/modals/DatePickerModal'
import { InfoModal } from './components/modals/InfoModal'
import { MigrateStatsModal } from './components/modals/MigrateStatsModal'
import { SettingsModal } from './components/modals/SettingsModal'
import { StatsModal } from './components/modals/StatsModal'
import { Navbar } from './components/navbar/Navbar'
import {
  DATE_LOCALE,
  DISCOURAGE_INAPP_BROWSERS,
  LONG_ALERT_TIME_MS,
  MAX_CHALLENGES,
  REVEAL_TIME_MS,
  WELCOME_INFO_MODAL_MS,
} from './constants/settings'
import {
  ABOUT_GAME_MESSAGE,
  CORRECT_WORD_MESSAGE,
  DISCOURAGE_INAPP_BROWSER_TEXT,
  GAME_COPIED_MESSAGE,
  HARD_MODE_ALERT_MESSAGE,
  NOT_ENOUGH_LETTERS_MESSAGE,
  SHARE_FAILURE_TEXT,
  WIN_MESSAGES,
  WORD_NOT_FOUND_MESSAGE,
} from './constants/strings'
import { wordleToTurdle } from './constants/validGuesses'
import { useAlert } from './context/AlertContext'
import { useGaContext } from './context/GaContext'
import { isInAppBrowser } from './lib/browser'
import { usePrevious, usePwaInstall } from './lib/hooks'
import {
  loadGameStateFromLocalStorage,
  loadSettingsFromLocalStorage,
  saveGameStateToLocalStorage,
  saveSettingsToLocalStorage,
} from './lib/localStorage'
import { addStatsForCompletedGame, loadStats } from './lib/stats'
import {
  findFirstUnusedReveal,
  getGameDate,
  getIsLatestGame,
  isWinningWord,
  isWordInWordList,
  setGameDate,
  solution,
  solutionGameDate,
  unicodeLength,
} from './lib/words'

function App() {
  const isLatestGame = getIsLatestGame()
  const gameDate = getGameDate()
  const prefersDarkMode = window.matchMedia(
    '(prefers-color-scheme: dark)'
  ).matches
  const { isInstalled, install } = usePwaInstall()
  const { showError: showErrorAlert, showSuccess: showSuccessAlert } =
    useAlert()
  const { consent, acceptCookies } = useCookieConsentContext()
  const { gaEvent } = useGaContext()
  const [currentGuess, setCurrentGuess] = useState('')
  const [isGameWon, setIsGameWon] = useState(false)
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false)
  const wasInfoModalOpen = usePrevious(isInfoModalOpen)
  const [isInfoModalOpening, setIsInfoModalOpening] = useState(true)
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false)
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false)
  const [isStatsModalOpening, setIsStatsModalOpening] = useState(true)
  const [isDatePickerModalOpen, setIsDatePickerModalOpen] = useState(false)
  const [isMigrateStatsModalOpen, setIsMigrateStatsModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [isCookieModalOpen, setIsCookieModalOpen] = useState(false)
  const [hasCookieModalOpened, setHasCookieModalOpened] = useState(false)
  const [cookieToastCount, incCookieToastCount] = useReducer(
    ({ count }) => ({ count: count + 1 }),
    { count: 0 }
  )
  const [currentRowClass, setCurrentRowClass] = useState('')
  const [isGameLost, setIsGameLost] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(
    localStorage.getItem('theme')
      ? localStorage.getItem('theme') === 'dark'
      : prefersDarkMode
  )
  const [isFirstTimePlaying, setIsFirstTimePlaying] = useState<boolean>(() => {
    return loadSettingsFromLocalStorage()?.isFirstTimePlaying ?? true
  })
  const [isExtraVisionModeEnabled, setExtraVisionModeEnabled] =
    useState<boolean>(() => {
      return loadSettingsFromLocalStorage()?.isExtraVisionModeEnabled ?? false
    })
  const [isHighContrastMode, setIsHighContrastMode] = useState<boolean>(() => {
    return loadSettingsFromLocalStorage()?.highContrastModeEnabled ?? false
  })
  const [isMemeModeEnabled, setIsMemeMode] = useState<boolean>(() => {
    return loadSettingsFromLocalStorage()?.isMemeModeEnabled ?? false
  })
  const [isRevealing, setIsRevealing] = useState(false)
  const [guesses, setGuesses] = useState<string[]>(() => {
    const loaded = loadGameStateFromLocalStorage(isLatestGame)
    if (loaded?.solution !== solution) {
      return []
    }
    const gameWasWon = loaded.guesses.includes(solution)
    if (gameWasWon) {
      setIsGameWon(true)
      setIsFirstTimePlaying(false)
    }
    if (loaded.guesses.length === MAX_CHALLENGES && !gameWasWon) {
      setIsGameLost(true)
      showErrorAlert(CORRECT_WORD_MESSAGE(wordleToTurdle(solution)), {
        persist: true,
      })
      setIsFirstTimePlaying(false)
    }
    return loaded.guesses
  })
  const [stats, setStats] = useState(() => loadStats())
  const [isHardMode, setIsHardMode] = useState(
    localStorage.getItem('gameMode')
      ? localStorage.getItem('gameMode') === 'hard'
      : false
  )
  const [canOpenToast, setCanOpenToast] = useState(false)

  useEffect(() => {
    if (isFirstTimePlaying) {
      setIsInfoModalOpening(true)
      setTimeout(() => {
        setIsInfoModalOpen(true)
        setIsInfoModalOpening(false)
      }, WELCOME_INFO_MODAL_MS)
    } else {
      setIsInfoModalOpening(false)
    }
  }, [isFirstTimePlaying])

  useEffect(() => {
    DISCOURAGE_INAPP_BROWSERS &&
      isInAppBrowser() &&
      showErrorAlert(DISCOURAGE_INAPP_BROWSER_TEXT, {
        persist: false,
        durationMs: 7000,
      })
  }, [showErrorAlert])

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    if (isHighContrastMode) {
      document.documentElement.classList.add('high-contrast')
    } else {
      document.documentElement.classList.remove('high-contrast')
    }
  }, [isDarkMode, isHighContrastMode])

  const handleDarkMode = (isDark: boolean) => {
    setIsDarkMode(isDark)
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }

  const handleHardMode = (isHard: boolean) => {
    if (guesses.length === 0 || localStorage.getItem('gameMode') === 'hard') {
      setIsHardMode(isHard)
      localStorage.setItem('gameMode', isHard ? 'hard' : 'normal')
    } else {
      showErrorAlert(HARD_MODE_ALERT_MESSAGE)
    }
  }

  const clearCurrentRowClass = () => {
    setCurrentRowClass('')
  }

  useEffect(() => {
    saveSettingsToLocalStorage({
      isFirstTimePlaying,
      isExtraVisionModeEnabled,
      highContrastModeEnabled: isHighContrastMode,
      isMemeModeEnabled,
    })
  }, [
    isFirstTimePlaying,
    isExtraVisionModeEnabled,
    isHighContrastMode,
    isMemeModeEnabled,
  ])

  // Don't open the cookie toast until all the possible automatically-
  // opening modals have finished opening and are closed.
  useEffect(() => {
    if (
      cookieToastCount.count < 1 &&
      (currentGuess.length === 0 || isGameWon || isGameLost) &&
      !(
        isCookieModalOpen ||
        hasCookieModalOpened ||
        isInfoModalOpen ||
        isInfoModalOpening ||
        isStatsModalOpen ||
        isStatsModalOpening ||
        isMigrateStatsModalOpen
      ) &&
      // Don't normally trigger a toast after closing Info modal.
      (isFirstTimePlaying || !wasInfoModalOpen)
    ) {
      setCanOpenToast(true)
    } else {
      setCanOpenToast(false)
    }
  }, [
    isFirstTimePlaying,
    isCookieModalOpen,
    hasCookieModalOpened,
    isInfoModalOpen,
    isInfoModalOpening,
    wasInfoModalOpen,
    isStatsModalOpen,
    isStatsModalOpening,
    isMigrateStatsModalOpen,
    cookieToastCount,
    currentGuess,
    isGameWon,
    isGameLost,
  ])

  useEffect(() => {
    const opened = openCookieToast({
      canOpen: canOpenToast,
      acceptCookies,
      setIsCookieModalOpen,
      consent,
      stats,
    })
    if (opened) {
      incCookieToastCount()
    }
  }, [canOpenToast, acceptCookies, consent, stats])

  useEffect(() => {
    saveGameStateToLocalStorage(getIsLatestGame(), { guesses, solution })
  }, [guesses])

  useEffect(() => {
    if (isGameWon) {
      const winMessage =
        WIN_MESSAGES[Math.floor(Math.random() * WIN_MESSAGES.length)]
      const delayMs = REVEAL_TIME_MS * solution.length

      setIsStatsModalOpening(true)
      showSuccessAlert(winMessage, {
        delayMs,
        onClose: () => {
          setIsStatsModalOpen(true)
          setIsStatsModalOpening(false)
        },
      })
    } else if (isGameLost) {
      setIsStatsModalOpening(true)
      setTimeout(() => {
        setIsStatsModalOpen(true)
        setIsStatsModalOpening(false)
      }, (solution.length + 1) * REVEAL_TIME_MS)
    } else {
      setIsStatsModalOpening(false)
    }
  }, [isGameWon, isGameLost, showSuccessAlert])

  const onChar = (value: string, replace: boolean) => {
    if (
      currentGuess.length < solution.length &&
      guesses.length < MAX_CHALLENGES &&
      !isGameWon
    ) {
      if (replace) {
        setCurrentGuess(
          `${currentGuess.substring(0, currentGuess.length - 1)}${value}`
        )
      } else {
        setCurrentGuess(`${currentGuess}${value}`)
      }
    }
  }

  const onDelete = () => {
    setCurrentGuess(
      new GraphemeSplitter().splitGraphemes(currentGuess).slice(0, -1).join('')
    )
  }

  const onEnter = () => {
    if (isGameWon || isGameLost) {
      return
    }

    if (!(unicodeLength(currentGuess) === solution.length)) {
      setCurrentRowClass('jiggle')
      return showErrorAlert(NOT_ENOUGH_LETTERS_MESSAGE, {
        onClose: clearCurrentRowClass,
      })
    }

    if (!isWordInWordList(currentGuess)) {
      setCurrentRowClass('jiggle')
      return showErrorAlert(WORD_NOT_FOUND_MESSAGE, {
        onClose: clearCurrentRowClass,
      })
    }

    // enforce hard mode - all guesses must contain all previously revealed letters
    if (isHardMode) {
      const firstMissingReveal = findFirstUnusedReveal(currentGuess, guesses)
      if (firstMissingReveal) {
        setCurrentRowClass('jiggle')
        return showErrorAlert(firstMissingReveal, {
          onClose: clearCurrentRowClass,
        })
      }
    }

    setIsRevealing(true)
    // turn this back off after all
    // chars have been revealed
    setTimeout(() => {
      setIsRevealing(false)
    }, REVEAL_TIME_MS * solution.length)

    const winningWord = isWinningWord(currentGuess)

    if (
      unicodeLength(currentGuess) === solution.length &&
      guesses.length < MAX_CHALLENGES &&
      !isGameWon
    ) {
      setGuesses([...guesses, currentGuess])
      setCurrentGuess('')

      if (winningWord) {
        if (isLatestGame) {
          setStats(addStatsForCompletedGame(stats, guesses.length))
          gaEvent({
            category: 'Game Stats',
            action: 'Won',
            value: guesses.length,
            label: JSON.stringify(
              {
                guesses: guesses.map((g) => wordleToTurdle(g)),
                stats,
                isFirstTimePlaying,
              },
              null,
              2
            ),
          })
        } else {
          gaEvent({
            category: 'Archive',
            action: 'Won',
            value: guesses.length,
            label: JSON.stringify(
              { guesses: guesses.map((g) => wordleToTurdle(g)), stats },
              null,
              2
            ),
          })
        }
        if (isFirstTimePlaying) {
          setIsFirstTimePlaying(false)
        }
        return setIsGameWon(true)
      }

      if (guesses.length === MAX_CHALLENGES - 1) {
        if (isLatestGame) {
          setStats(addStatsForCompletedGame(stats, guesses.length + 1))
          gaEvent({
            category: 'Game Stats',
            action: 'Lost',
            value: guesses.length,
            label: JSON.stringify(
              {
                guesses: guesses.map((g) => wordleToTurdle(g)),
                stats,
                isFirstTimePlaying,
              },
              null,
              2
            ),
          })
        } else {
          gaEvent({
            category: 'Archive',
            action: 'Lost',
            value: guesses.length,
            label: JSON.stringify(
              { guesses: guesses.map((g) => wordleToTurdle(g)), stats },
              null,
              2
            ),
          })
        }
        setIsGameLost(true)
        showErrorAlert(CORRECT_WORD_MESSAGE(wordleToTurdle(solution)), {
          persist: true,
          delayMs: REVEAL_TIME_MS * solution.length + 1,
        })
        if (isFirstTimePlaying) {
          setIsFirstTimePlaying(false)
        }
      }
    }
  }

  return (
    <Div100vh>
      <div className="flex h-full flex-col">
        <Navbar
          setIsInfoModalOpen={setIsInfoModalOpen}
          setIsStatsModalOpen={setIsStatsModalOpen}
          setIsDatePickerModalOpen={setIsDatePickerModalOpen}
          setIsSettingsModalOpen={setIsSettingsModalOpen}
          isFirstTimePlaying={isFirstTimePlaying}
          isMemeMode={isMemeModeEnabled}
        />

        {!isLatestGame && (
          <div className="flex items-center justify-center">
            <ClockIcon className="h-6 w-6 stroke-gray-600 dark:stroke-gray-300" />
            <p className="text-base text-gray-600 dark:text-gray-300">
              {format(gameDate, 'd MMMM yyyy', { locale: DATE_LOCALE })}
            </p>
          </div>
        )}

        <div className="mx-auto flex w-full grow flex-col px-1 pt-2 pb-8 sm:px-6 md:max-w-7xl lg:px-8 short:pb-2 short:pt-2">
          <div className="flex grow flex-col justify-center pb-6 short:pb-2">
            <Grid
              solution={solution}
              guesses={guesses}
              currentGuess={currentGuess}
              isRevealing={isRevealing}
              currentRowClassName={currentRowClass}
              extraVision={
                isExtraVisionModeEnabled || isGameLost || isInfoModalOpen
              }
              isMemeMode={isMemeModeEnabled}
              isHighContrast={isHighContrastMode}
            />
          </div>
          <Keyboard
            onChar={onChar}
            onDelete={onDelete}
            onEnter={onEnter}
            solution={solution}
            guesses={guesses}
            currentGuess={currentGuess}
            isRevealing={isRevealing}
            extraVision={
              isExtraVisionModeEnabled || isGameLost || isInfoModalOpen
            }
            isMemeMode={isMemeModeEnabled}
            isHighContrast={isHighContrastMode}
          />
          <div className="mt-8 flex justify-center gap-1">
            <button
              type="button"
              className="flex shrink grow-0 select-none items-center rounded border border-transparent bg-indigo-100 px-2.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              onClick={() => {
                setIsAboutModalOpen(true)
                gaEvent({ category: 'UI Event', action: 'About' })
              }}
            >
              {ABOUT_GAME_MESSAGE}
            </button>
            <a
              type="button"
              className="text-s flex shrink-0 grow-0 select-none items-center rounded border border-transparent bg-indigo-100 px-2.5 py-1.5 font-medium text-indigo-700 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              href="https://discord.gg/ryjr3TbZGm"
              onClick={() =>
                gaEvent({ category: 'UI Event', action: 'Discord' })
              }
            >
              <FaDiscord className="mx-auto" />
            </a>
            {!isInstalled && (
              <button
                type="button"
                className="flex shrink grow-0 select-none items-center rounded border border-transparent bg-indigo-100 px-2.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                onClick={() => {
                  install()
                  gaEvent({ category: 'UI Event', action: 'Install' })
                }}
              >
                <HiOutlineDownload /> Install
              </button>
            )}
          </div>
          <InfoModal
            isOpen={isInfoModalOpen}
            handleClose={() => setIsInfoModalOpen(false)}
            extraVision={isExtraVisionModeEnabled}
            isMemeMode={isMemeModeEnabled}
            isHighContrast={isHighContrastMode}
          />
          <StatsModal
            isOpen={isStatsModalOpen}
            handleClose={() => setIsStatsModalOpen(false)}
            solution={solution}
            guesses={guesses}
            gameStats={stats}
            isLatestGame={isLatestGame}
            isGameLost={isGameLost}
            isGameWon={isGameWon}
            handleShareToClipboard={() => showSuccessAlert(GAME_COPIED_MESSAGE)}
            handleShareFailure={() =>
              showErrorAlert(SHARE_FAILURE_TEXT, {
                durationMs: LONG_ALERT_TIME_MS,
              })
            }
            handleMigrateStatsButton={() => {
              setIsStatsModalOpen(false)
              setIsMigrateStatsModalOpen(true)
            }}
            isHardMode={isHardMode}
            isDarkMode={isDarkMode}
            isHighContrastMode={isHighContrastMode}
            numberOfGuessesMade={guesses.length}
          />
          <DatePickerModal
            isOpen={isDatePickerModalOpen}
            initialDate={solutionGameDate}
            handleSelectDate={(d) => {
              setIsDatePickerModalOpen(false)
              setGameDate(d)
            }}
            handleClose={() => setIsDatePickerModalOpen(false)}
          />
          <MigrateStatsModal
            isOpen={isMigrateStatsModalOpen}
            handleClose={() => setIsMigrateStatsModalOpen(false)}
          />
          <SettingsModal
            isOpen={isSettingsModalOpen}
            handleClose={() => setIsSettingsModalOpen(false)}
            isFirstTimePlaying={isFirstTimePlaying}
            isHardMode={isHardMode}
            handleHardMode={handleHardMode}
            isDarkMode={isDarkMode}
            handleDarkMode={handleDarkMode}
            isHighContrastMode={isHighContrastMode}
            handleHighContrastMode={setIsHighContrastMode}
            isExtraVisionMode={isExtraVisionModeEnabled}
            handleExtraVisionMode={setExtraVisionModeEnabled}
            isMemeMode={isMemeModeEnabled}
            handleMemeMode={setIsMemeMode}
            setIsCookieModalOpen={setIsCookieModalOpen}
          />
          <AboutModal
            isOpen={isAboutModalOpen}
            handleClose={() => setIsAboutModalOpen(false)}
          />
          <CookieModal
            isOpen={isCookieModalOpen}
            handleClose={() => {
              setIsCookieModalOpen(false)
              setHasCookieModalOpened(true)
            }}
            acceptCookies={acceptCookies}
          />
          <AlertContainer />
        </div>
      </div>
      <ToastContainer theme={isDarkMode ? 'dark' : 'light'} />
    </Div100vh>
  )
}

export default App
