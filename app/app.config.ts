// Everything glass is cut from the same two pieces. `glass-material` carries
// the backdrop filter and nothing else, so the fill, ring and shadow can stay
// stock Tailwind and let tailwind-merge resolve them against whatever each
// component already ships
const material = 'glass-material bg-(--glass-bg)'
const frame = 'ring-black/8 dark:ring-white/10 shadow-2xl'

// A surface that floats over body
const content = `${material} ${frame}`
// A control that sits on chrome: the same material, framed by a hairline
// rather than lifted off the surface it belongs to
const control = `${material} ring ring-black/8 dark:ring-white/10`
// Rules inside glass. `divide-default` is an opaque border colour, which reads
// as painted on once there is a backdrop showing through behind it
const divide = 'divide-black/8 dark:divide-white/8'

export default defineAppConfig({
  ui: {
    colors: {
      primary: 'red',
      neutral: 'zinc'
    },
    button: {
      compoundVariants: [{
        color: 'neutral',
        variant: 'outline',
        class: control
      }]
    },
    checkbox: {
      slots: {
        base: 'rounded-xs'
      }
    },
    commandPalette: {
      slots: {
        root: divide
      },
      variants: {
        // The viewport rules its groups from this variant rather than from the
        // slot, so a slot override alone would lose the merge to it
        virtualize: {
          false: {
            viewport: divide
          }
        }
      }
    },
    contextMenu: {
      slots: {
        content
      }
    },
    dropdownMenu: {
      slots: {
        content
      }
    },
    modal: {
      slots: {
        content: `${content} ${divide}`
      },
      variants: {
        overlay: {
          true: {
            overlay: 'backdrop-blur-sm bg-elevated/50'
          }
        }
      }
    },
    popover: {
      slots: {
        content
      }
    },
    sidebar: {
      slots: {
        body: 'p-2 pt-0 gap-2',
        footer: 'p-2 border-t border-default'
      },
      variants: {
        variant: {
          floating: {
            inner: `${content} divide-none`
          }
        }
      }
    },
    tabs: {
      slots: {
        trigger: 'w-full rounded-full'
      },
      variants: {
        // Same path as the theme's own pill classes, or `rounded-lg` and
        // `rounded-md` would come later in the merge and win. The track runs
        // darker than the chrome it sits on so the indicator, which is a plain
        // `bg-default` surface, reads as raised out of it rather than sunk in
        variant: {
          pill: {
            list: `${control} rounded-full gap-0.5 bg-black/5 dark:bg-black/40`,
            indicator: 'rounded-full'
          }
        }
      },
      // After the theme's color compound, which paints the indicator
      // `bg-inverted` and flips the active text. The raised pill is a plain
      // surface instead, so the active trigger keeps its text color
      compoundVariants: [{
        color: 'neutral',
        variant: 'pill',
        class: {
          indicator: 'bg-white dark:bg-elevated',
          trigger: 'data-[state=active]:text-highlighted in-[[data-slot=list]:not(:has([data-slot=indicator]))]:data-[state=active]:before:bg-elevated in-[[data-slot=list]:not(:has([data-slot=indicator]))]:data-[state=active]:before:rounded-full hover:data-[state=inactive]:not-disabled:bg-(--glass-bg)'
        }
      }]
    }
  }
})
