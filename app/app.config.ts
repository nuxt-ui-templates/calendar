// The hairline that frames a piece of glass. On its own it goes on a control,
// which sits on the chrome it belongs to rather than lifting off it
const ring = 'ring ring-black/8 dark:ring-white/10'
// A surface that floats over body. `glass-material` carries the backdrop filter
// and nothing else, so the fill, ring and shadow stay stock Tailwind and let
// tailwind-merge resolve them against whatever each component already ships
const content = `glass-material bg-(--glass-bg) ${ring} shadow-2xl`
// The same hairline in border form, for a section ruled off inside a surface
const border = 'border-black/8 dark:border-white/10'
// Rules inside glass. `divide-default` is an opaque border colour, which reads
// as painted on once there is a backdrop showing through behind it
const divide = 'divide-black/8 dark:divide-white/8'
// A translucent overlay that fills the viewport
const overlay = 'backdrop-blur-sm bg-elevated/50'

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
        class: ring
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
        content: [content, divide]
      },
      variants: {
        overlay: {
          true: {
            overlay
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
        body: 'p-2 gap-2',
        footer: ['p-2 border-t', border]
      },
      variants: {
        variant: {
          floating: {
            inner: [content, 'divide-none']
          }
        }
      }
    },
    // The sidebar menu below `lg`, cut from the same glass as the floating
    // sidebar it stands in for. The shadow is restated at `sm:` to land after
    // the theme's own. The ring comes from the surface, at every width
    slideover: {
      slots: {
        overlay,
        content: [content, 'divide-none sm:shadow-2xl']
      },
      // The theme insets by 4, the floating sidebar this stands in for by 2,
      // so the gutter is restated per side. It has to be a compound variant:
      // the theme sets the edges from one of its own, which lands after
      // anything on a slot or a variant
      compoundVariants: [{
        side: 'top',
        inset: true,
        class: {
          content: 'max-h-[calc(100%-1rem)] inset-x-2 top-2'
        }
      }, {
        side: 'right',
        inset: true,
        class: {
          content: 'w-[calc(100%-1rem)] inset-y-2 right-2'
        }
      }, {
        side: 'bottom',
        inset: true,
        class: {
          content: 'max-h-[calc(100%-1rem)] inset-x-2 bottom-2'
        }
      }, {
        side: 'left',
        inset: true,
        class: {
          content: 'w-[calc(100%-1rem)] inset-y-2 left-2'
        }
      }]
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
            list: ['rounded-full gap-0.5 bg-elevated dark:bg-default', ring],
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
          indicator: 'bg-default dark:bg-elevated',
          trigger: [
            'data-[state=active]:text-highlighted',
            'hover:data-[state=inactive]:not-disabled:bg-(--glass-bg)',
            // The theme paints the active pill on `before` whenever the list
            // renders without an indicator, so it gets the same surface and
            // the same radius as the one the indicator draws
            'in-[[data-slot=list]:not(:has([data-slot=indicator]))]:data-[state=active]:before:bg-elevated',
            'in-[[data-slot=list]:not(:has([data-slot=indicator]))]:data-[state=active]:before:rounded-full'
          ]
        }
      }]
    }
  }
})
