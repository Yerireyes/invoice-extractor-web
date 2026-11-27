import { CheckIcon, MonitorIcon, MoonIcon, SunIcon } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { isThemePreference, THEME_PREFERENCES, useThemeStore, watchSystemTheme } from './theme'

const ICON = { light: SunIcon, dark: MoonIcon, system: MonitorIcon } as const

/** Header button: the current theme's icon, opening Light / Dark / System. */
export function ThemeSwitcher() {
  const { t } = useTranslation()
  const preference = useThemeStore((state) => state.preference)
  const resolved = useThemeStore((state) => state.resolved)
  const setPreference = useThemeStore((state) => state.setPreference)

  useEffect(() => watchSystemTheme(), [])

  const Current = ICON[resolved]

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={t('theme.label', { theme: t(`theme.${preference}`) })}
          className="size-9 bg-transparent pointer-fine:size-8"
        >
          <Current aria-hidden="true" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-40 rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 motion-reduce:animate-none"
        >
          <DropdownMenu.RadioGroup
            value={preference}
            onValueChange={(value) => {
              if (isThemePreference(value)) setPreference(value)
            }}
          >
            {THEME_PREFERENCES.map((option) => {
              const Icon = ICON[option]
              return (
                <DropdownMenu.RadioItem
                  key={option}
                  value={option}
                  className="relative flex min-h-9 cursor-default items-center gap-2 rounded-md py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                >
                  <Icon aria-hidden="true" className="size-4 text-muted-foreground" />
                  {t(`theme.${option}`)}
                  <DropdownMenu.ItemIndicator className="absolute right-2 flex items-center">
                    <CheckIcon aria-hidden="true" className="size-4" />
                  </DropdownMenu.ItemIndicator>
                </DropdownMenu.RadioItem>
              )
            })}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
