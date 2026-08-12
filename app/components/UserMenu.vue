<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import tailwindColors from 'tailwindcss/colors'

const colorMode = useColorMode()
const appConfig = useAppConfig()

const colors = ['red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose']
const neutrals = ['slate', 'gray', 'zinc', 'neutral', 'stone']

// Tailwind only emits the palettes the app actually references, so a chip
// reads its variable with Tailwind's own value as fallback, the same way
// Nuxt UI resolves the color when you pick it
function chipStyle(chip: string) {
  const palette = tailwindColors[chip as keyof typeof tailwindColors]

  function shade(value: 400 | 500) {
    return typeof palette === 'object' ? palette[value] : ''
  }

  return {
    '--chip-light': `var(--color-${chip}-500, ${shade(500)})`,
    '--chip-dark': `var(--color-${chip}-400, ${shade(400)})`
  }
}

const user = ref({
  name: 'Benjamin Canac',
  avatar: {
    src: 'https://github.com/benjamincanac.png',
    alt: 'Benjamin Canac'
  }
})

const items = computed<DropdownMenuItem[][]>(() => ([[{
  type: 'label',
  label: user.value.name,
  avatar: user.value.avatar
}], [{
  label: 'Profile',
  icon: 'i-lucide-user'
}, {
  label: 'Settings',
  icon: 'i-lucide-settings'
}], [{
  label: 'Theme',
  icon: 'i-lucide-palette',
  children: [{
    label: 'Primary',
    slot: 'chip',
    chip: appConfig.ui.colors.primary,
    content: {
      align: 'center',
      collisionPadding: 16
    },
    children: colors.map(color => ({
      label: color,
      chip: color,
      slot: 'chip',
      checked: appConfig.ui.colors.primary === color,
      type: 'checkbox',
      onSelect: (e) => {
        e.preventDefault()

        appConfig.ui.colors.primary = color
      }
    }))
  }, {
    label: 'Neutral',
    slot: 'chip',
    chip: appConfig.ui.colors.neutral === 'neutral' ? 'old-neutral' : appConfig.ui.colors.neutral,
    content: {
      align: 'end',
      collisionPadding: 16
    },
    children: neutrals.map(color => ({
      label: color,
      chip: color === 'neutral' ? 'old-neutral' : color,
      slot: 'chip',
      type: 'checkbox',
      checked: appConfig.ui.colors.neutral === color,
      onSelect: (e) => {
        e.preventDefault()

        appConfig.ui.colors.neutral = color
      }
    }))
  }]
}, {
  label: 'Appearance',
  icon: 'i-lucide-sun-moon',
  children: [{
    label: 'Light',
    icon: 'i-lucide-sun',
    type: 'checkbox',
    checked: colorMode.value === 'light',
    onSelect(e: Event) {
      e.preventDefault()

      colorMode.preference = 'light'
    }
  }, {
    label: 'Dark',
    icon: 'i-lucide-moon',
    type: 'checkbox',
    checked: colorMode.value === 'dark',
    onUpdateChecked(checked: boolean) {
      if (checked) {
        colorMode.preference = 'dark'
      }
    },
    onSelect(e: Event) {
      e.preventDefault()
    }
  }]
}], [{
  label: 'Templates',
  icon: 'i-lucide-layout-template',
  children: [{
    label: 'Starter',
    to: 'https://starter-template.nuxt.dev/'
  }, {
    label: 'Landing',
    to: 'https://landing-template.nuxt.dev/'
  }, {
    label: 'Docs',
    to: 'https://docs-template.nuxt.dev/'
  }, {
    label: 'SaaS',
    to: 'https://saas-template.nuxt.dev/'
  }, {
    label: 'Dashboard',
    to: 'https://dashboard-template.nuxt.dev/'
  }, {
    label: 'Chat',
    to: 'https://chat-template.nuxt.dev/'
  }, {
    label: 'Calendar',
    to: 'https://calendar-template.nuxt.dev/',
    color: 'primary',
    checked: true,
    type: 'checkbox'
  }, {
    label: 'Portfolio',
    to: 'https://portfolio-template.nuxt.dev/'
  }, {
    label: 'Changelog',
    to: 'https://changelog-template.nuxt.dev/'
  }]
}], [{
  label: 'Documentation',
  icon: 'i-lucide-book-open',
  to: 'https://ui.nuxt.com/docs/getting-started/installation/nuxt',
  target: '_blank'
}, {
  label: 'GitHub repository',
  icon: 'i-simple-icons-github',
  to: 'https://github.com/nuxt-ui-templates/calendar',
  target: '_blank'
}, {
  label: 'Log out',
  icon: 'i-lucide-log-out'
}]]))
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{ content: 'w-(--reka-dropdown-menu-trigger-width)' }"
  >
    <UButton
      v-bind="{ ...user, label: user?.name }"
      color="neutral"
      variant="ghost"
      block
      trailing-icon="i-lucide-chevrons-up-down"
      class="data-[state=open]:bg-elevated"
      :ui="{
        trailingIcon: 'text-dimmed'
      }"
    />

    <template #chip-leading="{ item }">
      <div class="inline-flex items-center justify-center shrink-0 size-5">
        <span
          class="rounded-full ring ring-bg bg-(--chip-light) dark:bg-(--chip-dark) size-2"
          :style="chipStyle((item as any).chip)"
        />
      </div>
    </template>
  </UDropdownMenu>
</template>
