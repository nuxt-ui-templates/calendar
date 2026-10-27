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
// A translucent overlay that fills the viewport. It hazes rather than frosts,
// so it carries a blur of its own instead of the material's, and reads it from
// a variable so turning transparency down clears it along with everything else
const overlay = 'backdrop-blur-(--overlay-blur) bg-(--glass-bg)'
// A control floating on the chrome as its own drop of glass, the way the iOS
// toolbar draws them. `glass-control` carries the light and the shadow apart
// from the fill, so a hover can still change the fill through a color utility
const glass = 'rounded-full bg-(--glass-control-bg) glass-control'

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
      }, {
        color: 'neutral',
        variant: 'soft',
        class: `${glass} hover:bg-(--glass-control-bg-hover) active:bg-(--glass-control-bg-hover) disabled:bg-(--glass-control-bg) aria-disabled:bg-(--glass-control-bg)`
      }, {
        // A control painted on the chrome rather than floating over it, the
        // flat pill the macOS toolbar draws its date stepper with
        color: 'neutral',
        variant: 'subtle',
        class: 'rounded-full ring-0 bg-(--control-bg) hover:bg-(--control-bg-hover) active:bg-(--control-bg-hover) disabled:bg-(--control-bg) aria-disabled:bg-(--control-bg)'
      }, {
        color: 'neutral',
        variant: 'ghost',
        class: 'hover:bg-(--control-bg) active:bg-(--control-bg)'
      }, {
        // Glass tinted with the accent, lit and shadowed like the neutral drops
        // beside it
        color: 'primary',
        variant: 'solid',
        class: 'rounded-full glass-control'
      }, {
        // Up to 36px on a touch screen, a size a finger can land on
        size: ['sm', 'md'],
        square: true,
        class: {
          base: 'pointer-coarse:p-2',
          leadingIcon: 'pointer-coarse:size-5'
        }
      }, {
        size: 'sm',
        square: false,
        class: 'pointer-coarse:py-2 pointer-coarse:text-sm'
      }, {
        size: 'md',
        square: false,
        class: 'pointer-coarse:py-2'
      }]
    },
    checkbox: {
      slots: {
        base: 'rounded-xs'
      },
      // The hairline only when not highlighted, so a checkbox in a form error
      // keeps its colored ring
      compoundVariants: [{
        highlight: false,
        class: {
          base: ring
        }
      }]
    },
    chip: {
      slots: {
        base: 'ring-0'
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
    kbd: {
      compoundVariants: [{
        color: 'neutral',
        variant: 'soft',
        class: 'bg-(--control-bg)'
      }]
    },
    inputDate: {
      slots: {
        base: 'gap-0!',
        segment: 'w-auto! px-0.5'
      },
      compoundVariants: [{
        color: 'primary',
        variant: 'none',
        class: {
          segment: 'focus:bg-primary focus:text-white'
        }
      }]
    },
    inputTime: {
      slots: {
        base: 'gap-0!',
        segment: 'w-auto! px-0.5'
      },
      compoundVariants: [{
        color: 'primary',
        variant: 'none',
        class: {
          segment: 'focus:bg-primary focus:text-white'
        }
      }]
    },
    modal: {
      slots: {
        content: [content, divide]
      },
      variants: {
        // On a phone the modal is a sheet: the gutter the sidebar and the
        // slideover keep on every side, and all the height that leaves. Above
        // `sm` it goes back to the box the theme centers on the viewport. The
        // ring and the shadow are restated here because the theme paints them
        // from this variant, which lands after the slot they came from
        fullscreen: {
          false: {
            content: [ring, 'shadow-2xl w-[calc(100vw-1rem)] h-[calc(100dvh-1rem)] sm:w-[calc(100vw-2rem)] sm:h-auto']
          }
        },
        overlay: {
          true: {
            overlay
          }
        }
      },
      // The height cap and the overlay padding are set from a compound of the
      // theme's own, which lands after anything on a slot or a variant. The
      // cap is off below `sm`, where the height above is the whole rule
      compoundVariants: [{
        fullscreen: false,
        scrollable: false,
        class: {
          content: 'max-h-none'
        }
      }, {
        fullscreen: false,
        scrollable: true,
        class: {
          overlay: 'p-2 sm:p-4 sm:py-8'
        }
      }]
    },
    navigationMenu: {
      slots: {
        link: 'hover:before:bg-(--control-bg-hover)'
      },
      compoundVariants: [{
        disabled: false,
        active: false,
        variant: 'pill',
        class: {
          link: 'hover:before:bg-(--control-bg)'
        }
      }]
    },
    popover: {
      slots: {
        content
      }
    },
    select: {
      slots: {
        content,
        item: 'data-highlighted:not-data-disabled:before:bg-(--control-bg)'
      },
      variants: {
        variant: {
          soft: 'bg-(--control-bg) hover:bg-(--control-bg-hover) focus:bg-(--control-bg-hover) disabled:bg-(--control-bg)'
        }
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
        // `rounded-md` would come later in the merge and win. The track is a
        // drop of glass like the buttons beside it
        variant: {
          pill: {
            list: `gap-0.5 ${glass}`,
            indicator: 'rounded-full'
          }
        }
      },
      // After the theme's color compound, which paints the indicator
      // `bg-inverted` and flips the active text. This one is a lighter surface
      // than the track with a shadow under it, so the active trigger keeps its
      // text color
      compoundVariants: [{
        color: 'neutral',
        variant: 'pill',
        class: {
          indicator: 'bg-white dark:bg-(--control-bg) shadow-sm',
          trigger: [
            'data-[state=active]:text-highlighted',
            'hover:data-[state=inactive]:not-disabled:bg-(--glass-bg)',
            // The theme paints the active pill on `before` whenever the list
            // renders without an indicator, so it stands in for the one the
            // indicator draws, at the same radius
            'in-[[data-slot=list]:not(:has([data-slot=indicator]))]:data-[state=active]:before:bg-(--control-bg)',
            'in-[[data-slot=list]:not(:has([data-slot=indicator]))]:data-[state=active]:before:rounded-full'
          ]
        }
      }, {
        // As tall as the buttons beside it on a touch screen
        size: 'sm',
        class: {
          trigger: 'pointer-coarse:py-1 pointer-coarse:text-sm'
        }
      }]
    }
  }
})
